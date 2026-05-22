// Admin-only: forward an inbox thread (or its latest inbound message)
// to an arbitrary email address — typically a team mailbox.
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const authHeader = req.headers.get('Authorization') || ''
  const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return json({ error: 'Unauthorized' }, 401)

  const admin = createClient(SUPABASE_URL, SERVICE_KEY)
  const { data: isAdmin } = await admin.rpc('has_role', { _user_id: user.id, _role: 'admin' })
  if (!isAdmin) return json({ error: 'Forbidden' }, 403)

  let body: any
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }
  const { thread_id, to_email, note } = body || {}
  if (!thread_id) return json({ error: 'thread_id required' }, 400)

  const { data: thread } = await admin
    .from('inbox_threads')
    .select('id, subject, from_email, from_name, mailbox_id, source')
    .eq('id', thread_id)
    .maybeSingle()
  if (!thread) return json({ error: 'Thread not found' }, 404)

  let recipient = to_email as string | undefined
  let mailboxName = ''
  if (!recipient && thread.mailbox_id) {
    const { data: mb } = await admin
      .from('inbox_mailboxes')
      .select('name, forward_to_email')
      .eq('id', thread.mailbox_id)
      .maybeSingle()
    recipient = mb?.forward_to_email ?? undefined
    mailboxName = mb?.name ?? ''
  }
  if (!recipient) {
    return json({ error: 'No recipient — set mailbox forward_to_email or pass to_email' }, 400)
  }

  const { data: msgs } = await admin
    .from('inbox_messages')
    .select('direction, body_text, from_name, from_email, created_at')
    .eq('thread_id', thread_id)
    .order('created_at', { ascending: true })
    .limit(50)

  const transcript = (msgs || [])
    .map((m: any) => {
      const who = m.direction === 'inbound'
        ? `${m.from_name || m.from_email || 'Customer'}`
        : 'Team'
      return `[${who} — ${new Date(m.created_at).toISOString()}]\n${m.body_text || ''}`
    })
    .join('\n\n---\n\n')

  const composed =
    (note ? `Internal note:\n${note}\n\n---\n\n` : '') +
    `Conversation transcript:\n\n${transcript}`

  const { error } = await admin.functions.invoke('send-transactional-email', {
    body: {
      templateName: 'contact-team-notification',
      recipientEmail: recipient,
      templateData: {
        name: thread.from_name || thread.from_email || 'Customer',
        email: thread.from_email || 'unknown@simpilot.ai',
        subject: `[${mailboxName || 'Inbox'}] FWD: ${thread.subject || '(no subject)'}`,
        message: composed,
      },
    },
  })
  if (error) return json({ error: error.message }, 500)

  return json({ success: true, forwarded_to: recipient })
})

function json(obj: any, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
