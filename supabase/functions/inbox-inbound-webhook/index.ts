// Provider-agnostic inbound email webhook.
//
// Works with CloudMailin (default JSON format), Postmark Inbound, and SendGrid Inbound Parse.
// To prevent abuse, require a shared secret either as:
//   - Query string ?secret=...
//   - Header X-Webhook-Secret
//
// Set the INBOX_INBOUND_SECRET secret in Lovable Cloud, then configure your
// inbound provider to POST to:
//   https://<project>.supabase.co/functions/v1/inbox-inbound-webhook?secret=<value>

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  const SECRET = Deno.env.get('INBOX_INBOUND_SECRET')
  const url = new URL(req.url)
  const provided =
    url.searchParams.get('secret') ||
    req.headers.get('x-webhook-secret') ||
    ''
  if (!SECRET || provided !== SECRET) {
    return json({ error: 'Unauthorized' }, 401)
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(SUPABASE_URL, SERVICE_KEY)

  // Parse payload — accept JSON or multipart/form-data
  const contentType = req.headers.get('content-type') || ''
  let raw: any = {}
  try {
    if (contentType.includes('application/json')) {
      raw = await req.json()
    } else if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const form = await req.formData()
      raw = Object.fromEntries(form.entries())
    } else {
      raw = await req.json().catch(() => ({}))
    }
  } catch {
    return json({ error: 'Could not parse payload' }, 400)
  }

  // Normalize across providers
  const parsed = normalize(raw)
  if (!parsed.fromEmail || !parsed.bodyText) {
    return json({ error: 'Missing from/body in payload' }, 400)
  }

  // Try to find an existing thread by In-Reply-To / References, else by sender
  let threadId: string | null = null

  const refIds = [
    parsed.inReplyTo,
    ...(parsed.references || '').split(/\s+/).filter(Boolean),
  ].filter(Boolean) as string[]

  if (refIds.length) {
    const { data } = await admin
      .from('inbox_messages')
      .select('thread_id')
      .in('email_message_id', refIds)
      .limit(1)
      .maybeSingle()
    if (data?.thread_id) threadId = data.thread_id as string
  }

  if (!threadId) {
    // Reuse most recent open thread from same sender, otherwise create new
    const { data: existing } = await admin
      .from('inbox_threads')
      .select('id')
      .eq('from_email', parsed.fromEmail.toLowerCase())
      .in('status', ['new', 'open', 'pending'])
      .order('last_message_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (existing?.id) {
      threadId = existing.id as string
    } else {
      const { data: created, error: createErr } = await admin
        .from('inbox_threads')
        .insert({
          source: 'inbound_email',
          source_id: null,
          subject: parsed.subject || '(no subject)',
          from_email: parsed.fromEmail.toLowerCase(),
          from_name: parsed.fromName,
          status: 'new',
          last_message_at: new Date().toISOString(),
        })
        .select('id')
        .single()
      if (createErr) return json({ error: createErr.message }, 500)
      threadId = created.id as string
    }
  }

  // Insert message
  const { error: msgErr } = await admin.from('inbox_messages').insert({
    thread_id: threadId,
    direction: 'inbound',
    body_text: parsed.bodyText,
    body_html: parsed.bodyHtml,
    from_email: parsed.fromEmail.toLowerCase(),
    from_name: parsed.fromName,
    to_email: parsed.toEmail,
    email_message_id: parsed.messageId,
    in_reply_to: parsed.inReplyTo,
    email_references: parsed.references,
    attachments: parsed.attachments || [],
  })
  if (msgErr) return json({ error: msgErr.message }, 500)

  // Bump thread
  await admin
    .from('inbox_threads')
    .update({
      status: 'open',
      last_message_at: new Date().toISOString(),
    })
    .eq('id', threadId)

  // Bump unread_count via raw increment
  await admin.rpc('inbox_bump_unread' as any, { _thread_id: threadId }).catch(() => {})

  return json({ success: true, thread_id: threadId }, 200)
})

interface Parsed {
  fromEmail: string
  fromName?: string
  toEmail?: string
  subject?: string
  bodyText: string
  bodyHtml?: string
  messageId?: string
  inReplyTo?: string
  references?: string
  attachments?: any[]
}

function normalize(raw: any): Parsed {
  // CloudMailin (default JSON)
  if (raw.headers && raw.envelope) {
    const headers = raw.headers || {}
    const from = parseAddress(headers.from || headers.From || raw.envelope.from)
    return {
      fromEmail: from.email,
      fromName: from.name,
      toEmail: raw.envelope.to || headers.to,
      subject: headers.subject || headers.Subject,
      bodyText: raw.plain || raw.html?.replace(/<[^>]+>/g, '') || '',
      bodyHtml: raw.html,
      messageId: headers['message-id'] || headers['Message-ID'],
      inReplyTo: headers['in-reply-to'] || headers['In-Reply-To'],
      references: headers.references || headers.References,
      attachments: raw.attachments || [],
    }
  }
  // Postmark Inbound
  if (raw.FromFull) {
    return {
      fromEmail: raw.FromFull.Email,
      fromName: raw.FromFull.Name,
      toEmail: raw.OriginalRecipient || raw.To,
      subject: raw.Subject,
      bodyText: raw.TextBody || raw.StrippedTextReply || '',
      bodyHtml: raw.HtmlBody,
      messageId: raw.MessageID,
      inReplyTo: headerVal(raw.Headers, 'In-Reply-To'),
      references: headerVal(raw.Headers, 'References'),
      attachments: raw.Attachments || [],
    }
  }
  // SendGrid Inbound Parse (form-data)
  if (raw.from || raw.email) {
    const from = parseAddress(raw.from || raw.email)
    return {
      fromEmail: from.email,
      fromName: from.name,
      toEmail: raw.to,
      subject: raw.subject,
      bodyText: raw.text || '',
      bodyHtml: raw.html,
      messageId: undefined,
      inReplyTo: undefined,
      references: undefined,
    }
  }
  // Fallback — best-effort
  const from = parseAddress(raw.from_email || raw.from || '')
  return {
    fromEmail: from.email,
    fromName: from.name,
    toEmail: raw.to_email || raw.to,
    subject: raw.subject,
    bodyText: raw.body_text || raw.text || '',
    bodyHtml: raw.body_html || raw.html,
  }
}

function parseAddress(input: string | undefined): { email: string; name?: string } {
  if (!input) return { email: '' }
  const m = input.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/)
  if (m) return { name: m[1].trim() || undefined, email: m[2].trim().toLowerCase() }
  return { email: input.trim().toLowerCase() }
}

function headerVal(headers: any[] | undefined, name: string): string | undefined {
  if (!Array.isArray(headers)) return undefined
  return headers.find((h) => h?.Name?.toLowerCase() === name.toLowerCase())?.Value
}

function json(obj: any, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
