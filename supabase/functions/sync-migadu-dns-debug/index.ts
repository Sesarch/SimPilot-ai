import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
const CF_TOKEN = Deno.env.get('CLOUDFLARE_API_TOKEN')!;
const ZONE_ID = Deno.env.get('CLOUDFLARE_ZONE_ID')!;
Deno.serve(async () => {
  const headers = { Authorization: `Bearer ${CF_TOKEN}`, 'Content-Type': 'application/json' };
  const verify = await (await fetch('https://api.cloudflare.com/client/v4/user/tokens/verify', { headers })).json();
  const zone = await (await fetch(`https://api.cloudflare.com/client/v4/zones/${ZONE_ID}`, { headers })).json();
  return new Response(JSON.stringify({
    token_present: !!CF_TOKEN,
    token_length: CF_TOKEN?.length,
    zone_id: ZONE_ID,
    verify,
    zone: { success: zone.success, errors: zone.errors, name: zone.result?.name, account: zone.result?.account?.name },
  }, null, 2), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
