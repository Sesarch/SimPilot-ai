// Sends an admin reply to an inbox thread:
//  1. Verifies the caller is an admin
//  2. Invokes send-transactional-email with the 'admin-reply' template
//  3. Records the outbound message in inbox_messages and updates the thread

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')

  if (!token) {
    return json({ error: 'Missing authorization' }, 401)
  }

  // Authenticated client just to identify the caller
  const userClient = createClient(SUPABASE_URL, SERVICE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: userData, error: userErr } = await userClient.auth.getUser(token)
  if (userErr || !userData.user) return json({ error: 'Invalid session' }, 401)

  const userId = userData.user.id

  // Verify admin via security-definer RPC
  const admin = createClient(SUPABASE_URL, SERVICE_KEY)
  const { data: isAdmin, error: roleErr } = await admin.rpc('has_role', {
    _user_id: userId,
    _role: 'admin',
  })
  if (roleErr || !isAdmin) return json({ error: 'Admin only' }, 403)

  let body: any
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const { thread_id, to_email, subject, message, agent_name } = body || {}
  if (!thread_id || !to_email || !message || typeof message !== 'string') {
    return json({ error: 'thread_id, to_email and message are required' }, 400)
  }
  if (message.length > 20000) return json({ error: 'Message too long' }, 400)

  // Load thread (for from_name and previous message id chain)
  const { data: thread, error: threadErr } = await admin
    .from('inbox_threads')
    .select('id, subject, from_name, from_email')
    .eq('id', thread_id)
    .maybeSingle()
  if (threadErr || !thread) return json({ error: 'Thread not found' }, 404)

  // Look up the most recent inbound message id for In-Reply-To header
  const { data: lastInbound } = await admin
    .from('inbox_messages')
    .select('email_message_id')
    .eq('thread_id', thread_id)
    .eq('direction', 'inbound')
    .not('email_message_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Insert outbound message first as 'pending'
  const { data: inserted, error: insertErr } = await admin
    .from('inbox_messages')
    .insert({
      thread_id,
      direction: 'outbound',
      body_text: message,
      from_email: 'support@simpilot.ai',
      from_name: agent_name || 'SimPilot Support',
      to_email,
      in_reply_to: lastInbound?.email_message_id ?? null,
      delivery_status: 'pending',
      sent_by: userId,
    })
    .select('id')
    .single()
  if (insertErr) return json({ error: insertErr.message }, 500)

  // Invoke send-transactional-email
  const sendResp = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      templateName: 'admin-reply',
      recipientEmail: to_email,
      templateData: {
        name: thread.from_name || undefined,
        subject: subject || thread.subject,
        body: message,
        agent_name: agent_name || 'SimPilot Support',
      },
    }),
  })

  const sendData = await sendResp.json().catch(() => ({}))
  const ok = sendResp.ok && sendData?.success !== false

  await admin
    .from('inbox_messages')
    .update({
      delivery_status: ok ? 'sent' : 'failed',
      delivery_error: ok ? null : (sendData?.error || `HTTP ${sendResp.status}`),
    })
    .eq('id', inserted.id)

  if (ok) {
    await admin
      .from('inbox_threads')
      .update({ status: 'pending', last_message_at: new Date().toISOString() })
      .eq('id', thread_id)
  }

  return json({ success: ok, message_id: inserted.id, send: sendData }, ok ? 200 : 502)
})

function json(obj: any, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
