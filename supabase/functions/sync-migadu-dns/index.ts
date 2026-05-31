import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const CF_TOKEN = Deno.env.get('CLOUDFLARE_API_TOKEN')!;
const ZONE_ID = Deno.env.get('CLOUDFLARE_ZONE_ID')!;
const API = `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records`;

type Record = {
  type: string;
  name: string;
  content?: string;
  priority?: number;
  data?: Record<string, unknown>;
  ttl?: number;
  proxied?: boolean;
  comment?: string;
};

const records: Record[] = [
  { type: 'TXT', name: 'simpilot.ai', content: 'hosted-email-verify=waxrkbfv', comment: 'migadu-verify' },
  { type: 'MX', name: 'simpilot.ai', content: 'aspmx1.migadu.com', priority: 10, comment: 'migadu' },
  { type: 'MX', name: 'simpilot.ai', content: 'aspmx2.migadu.com', priority: 20, comment: 'migadu' },
  { type: 'TXT', name: 'simpilot.ai', content: 'v=spf1 include:spf.migadu.com -all', comment: 'migadu-spf' },
  { type: 'CNAME', name: 'key1._domainkey.simpilot.ai', content: 'key1.simpilot.ai._domainkey.migadu.com', proxied: false, comment: 'migadu-dkim' },
  { type: 'CNAME', name: 'key2._domainkey.simpilot.ai', content: 'key2.simpilot.ai._domainkey.migadu.com', proxied: false, comment: 'migadu-dkim' },
  { type: 'CNAME', name: 'key3._domainkey.simpilot.ai', content: 'key3.simpilot.ai._domainkey.migadu.com', proxied: false, comment: 'migadu-dkim' },
  { type: 'TXT', name: '_dmarc.simpilot.ai', content: 'v=DMARC1; p=quarantine;', comment: 'migadu-dmarc' },
  { type: 'CNAME', name: 'autoconfig.simpilot.ai', content: 'autoconfig.migadu.com', proxied: false, comment: 'migadu' },
  { type: 'SRV', name: '_autodiscover._tcp.simpilot.ai', data: { priority: 0, weight: 1, port: 443, target: 'autodiscover.migadu.com' }, comment: 'migadu' },
  { type: 'SRV', name: '_submissions._tcp.simpilot.ai', data: { priority: 0, weight: 1, port: 465, target: 'smtp.migadu.com' }, comment: 'migadu' },
  { type: 'SRV', name: '_imaps._tcp.simpilot.ai', data: { priority: 0, weight: 1, port: 993, target: 'imap.migadu.com' }, comment: 'migadu' },
  { type: 'SRV', name: '_pop3s._tcp.simpilot.ai', data: { priority: 0, weight: 1, port: 995, target: 'pop.migadu.com' }, comment: 'migadu' },
];

async function cf(path: string, init?: RequestInit) {
  const r = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${CF_TOKEN}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  return r.json();
}

function sameRecord(existing: any, desired: Record): boolean {
  if (existing.type !== desired.type) return false;
  const eName = existing.name.replace(/\.$/, '').toLowerCase();
  const dName = desired.name.replace(/\.$/, '').toLowerCase();
  if (eName !== dName) return false;
  if (desired.type === 'SRV') {
    return existing.data?.port === desired.data?.port;
  }
  return true;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (!CF_TOKEN || !ZONE_ID) {
    return new Response(JSON.stringify({ error: 'Missing CLOUDFLARE_API_TOKEN or CLOUDFLARE_ZONE_ID' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const results: any[] = [];

  // Fetch existing records (paginated up to 500)
  const listed = await cf(`/zones/${ZONE_ID}/dns_records?per_page=500`);
  const existing = listed.result || [];

  for (const rec of records) {
    const body: any = {
      type: rec.type,
      name: rec.name,
      ttl: rec.ttl ?? 1,
      comment: rec.comment,
    };
    if (rec.type === 'SRV') {
      body.data = rec.data;
    } else if (rec.type === 'MX') {
      body.content = rec.content;
      body.priority = rec.priority;
    } else {
      body.content = rec.content;
      if (rec.type === 'CNAME') body.proxied = false;
    }

    // For TXT/CNAME/MX try to find an exact content match to update; otherwise create
    const match = existing.find((e: any) => {
      if (!sameRecord(e, rec)) return false;
      if (rec.type === 'TXT') {
        const ec = (e.content || '').replace(/^"|"$/g, '');
        // match by prefix of distinct token
        if (rec.content!.startsWith('hosted-email-verify=')) return ec.startsWith('hosted-email-verify=');
        if (rec.content!.startsWith('v=spf1')) return ec.startsWith('v=spf1');
        if (rec.content!.startsWith('v=DMARC1')) return ec.startsWith('v=DMARC1');
        return ec === rec.content;
      }
      if (rec.type === 'MX') return e.priority === rec.priority;
      if (rec.type === 'CNAME') return true;
      if (rec.type === 'SRV') return true;
      return false;
    });

    let res;
    if (match) {
      res = await cf(`/zones/${ZONE_ID}/dns_records/${match.id}`, {
        method: 'PUT', body: JSON.stringify(body),
      });
      results.push({ action: 'update', name: rec.name, type: rec.type, success: res.success, errors: res.errors });
    } else {
      res = await cf(`/zones/${ZONE_ID}/dns_records`, {
        method: 'POST', body: JSON.stringify(body),
      });
      results.push({ action: 'create', name: rec.name, type: rec.type, success: res.success, errors: res.errors });
    }
  }

  const ok = results.every((r) => r.success);
  return new Response(JSON.stringify({ ok, results }, null, 2), {
    status: ok ? 200 : 207,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
