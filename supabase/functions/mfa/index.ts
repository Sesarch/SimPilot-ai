// MFA controller — email OTP, recovery codes, status. TOTP uses Supabase native
// `auth.mfa.*` from the client; this function only handles email + recovery flows.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function randomDigits(n: number): string {
  const arr = new Uint32Array(n)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(v => (v % 10).toString()).join('')
}

function randomRecoveryCode(): string {
  // 10 chars: XXXXX-XXXXX (alphanumeric, no ambiguous chars)
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const arr = new Uint32Array(10)
  crypto.getRandomValues(arr)
  const chars = Array.from(arr).map(v => alphabet[v % alphabet.length])
  return `${chars.slice(0, 5).join('')}-${chars.slice(5).join('')}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization') ?? ''
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const admin = createClient(SUPABASE_URL, SERVICE_KEY)

  const { data: userData, error: userErr } = await userClient.auth.getUser()
  if (userErr || !userData?.user) return json({ error: 'unauthorized' }, 401)
  const user = userData.user
  const email = user.email
  if (!email) return json({ error: 'no_email' }, 400)

  let body: any
  try { body = await req.json() } catch { return json({ error: 'invalid_json' }, 400) }
  const action = String(body?.action ?? '')

  // --- STATUS -------------------------------------------------------------
  if (action === 'status') {
    const { data: settings } = await admin
      .from('user_mfa_settings').select('*').eq('user_id', user.id).maybeSingle()
    const { data: roleRow } = await admin
      .from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle()
    const isAdmin = !!roleRow
    const enrolled = !!(settings && (settings.totp_enrolled || settings.email_otp_enabled))
    return json({
      enrolled,
      required: isAdmin,
      isAdmin,
      totp_enrolled: !!settings?.totp_enrolled,
      email_otp_enabled: !!settings?.email_otp_enabled,
      preferred_method: settings?.preferred_method ?? 'email',
      recovery_codes_count: (settings?.recovery_codes_hashed ?? []).length,
    })
  }

  // --- SEND EMAIL CODE ----------------------------------------------------
  if (action === 'send-email-code') {
    const purpose = body?.purpose === 'enroll' ? 'enroll' : 'login'
    // Rate limit: max 3 active codes per user in last 5 min
    const since = new Date(Date.now() - 5 * 60_000).toISOString()
    const { count } = await admin
      .from('email_otp_challenges')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', since)
    if ((count ?? 0) >= 3) return json({ error: 'rate_limited' }, 429)

    const code = randomDigits(6)
    const code_hash = await sha256(code)
    const expires_at = new Date(Date.now() + 10 * 60_000).toISOString()

    const { error: insErr } = await admin.from('email_otp_challenges').insert({
      user_id: user.id, code_hash, purpose, expires_at,
    })
    if (insErr) return json({ error: 'db_error', detail: insErr.message }, 500)

    // Send via the project's transactional email infrastructure
    const sendRes = await admin.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'mfa-code',
        recipientEmail: email,
        templateData: { code, expiresInMinutes: 10 },
      },
    })
    if (sendRes.error) {
      console.error('MFA email send failed:', sendRes.error)
      return json({ error: 'email_send_failed' }, 500)
    }
    return json({ ok: true })
  }

  // --- VERIFY EMAIL CODE --------------------------------------------------
  if (action === 'verify-email-code') {
    const code = String(body?.code ?? '').trim()
    const purpose = body?.purpose === 'enroll' ? 'enroll' : 'login'
    if (!/^\d{6}$/.test(code)) return json({ error: 'invalid_code_format' }, 400)
    const code_hash = await sha256(code)

    const { data: challenge } = await admin
      .from('email_otp_challenges')
      .select('*')
      .eq('user_id', user.id)
      .eq('purpose', purpose)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!challenge) return json({ error: 'no_active_code' }, 400)
    if (challenge.attempts >= 5) {
      await admin.from('email_otp_challenges').update({ used: true }).eq('id', challenge.id)
      return json({ error: 'too_many_attempts' }, 429)
    }
    if (challenge.code_hash !== code_hash) {
      await admin.from('email_otp_challenges')
        .update({ attempts: challenge.attempts + 1 }).eq('id', challenge.id)
      return json({ error: 'incorrect_code' }, 400)
    }
    await admin.from('email_otp_challenges').update({ used: true }).eq('id', challenge.id)

    if (purpose === 'enroll') {
      // Upsert MFA settings
      await admin.from('user_mfa_settings').upsert({
        user_id: user.id, email_otp_enabled: true, preferred_method: 'email',
      }, { onConflict: 'user_id' })
    }
    return json({ ok: true, verified: true })
  }

  // --- DISABLE EMAIL OTP --------------------------------------------------
  if (action === 'disable-email') {
    await admin.from('user_mfa_settings').upsert({
      user_id: user.id, email_otp_enabled: false,
    }, { onConflict: 'user_id' })
    return json({ ok: true })
  }

  // --- MARK TOTP ENROLLED (called after Supabase factor is verified) -----
  if (action === 'mark-totp-enrolled') {
    const enrolled = !!body?.enrolled
    await admin.from('user_mfa_settings').upsert({
      user_id: user.id,
      totp_enrolled: enrolled,
      preferred_method: enrolled ? 'totp' : 'email',
    }, { onConflict: 'user_id' })
    return json({ ok: true })
  }

  // --- SET PREFERRED ------------------------------------------------------
  if (action === 'set-preferred') {
    const m = body?.method === 'totp' ? 'totp' : 'email'
    await admin.from('user_mfa_settings').upsert({
      user_id: user.id, preferred_method: m,
    }, { onConflict: 'user_id' })
    return json({ ok: true })
  }

  // --- GENERATE RECOVERY CODES -------------------------------------------
  if (action === 'generate-recovery-codes') {
    const codes = Array.from({ length: 10 }, () => randomRecoveryCode())
    const hashed = await Promise.all(codes.map(c => sha256(c)))
    await admin.from('user_mfa_settings').upsert({
      user_id: user.id,
      recovery_codes_hashed: hashed,
      recovery_codes_generated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    return json({ ok: true, codes })
  }

  // --- VERIFY RECOVERY CODE (consumes it) --------------------------------
  if (action === 'verify-recovery-code') {
    const code = String(body?.code ?? '').trim().toUpperCase()
    if (!/^[A-Z0-9]{5}-[A-Z0-9]{5}$/.test(code)) {
      return json({ error: 'invalid_format' }, 400)
    }
    const hash = await sha256(code)
    const { data: settings } = await admin
      .from('user_mfa_settings').select('recovery_codes_hashed').eq('user_id', user.id).maybeSingle()
    const list: string[] = settings?.recovery_codes_hashed ?? []
    if (!list.includes(hash)) return json({ error: 'invalid_code' }, 400)
    const remaining = list.filter(h => h !== hash)
    await admin.from('user_mfa_settings')
      .update({ recovery_codes_hashed: remaining }).eq('user_id', user.id)
    return json({ ok: true, verified: true, remaining: remaining.length })
  }

  return json({ error: 'unknown_action' }, 400)
})
