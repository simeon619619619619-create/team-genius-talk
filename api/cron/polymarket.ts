// Vercel cron job — calls Supabase edge function polymarket-tracker every 15 min
// Vercel runs this in serverless; the edge function does the heavy lifting

export const config = { runtime: 'edge' };

const EDGE_FN_URL = 'https://uzdrfjunyfuzntyfsduv.supabase.co/functions/v1/polymarket-tracker';
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const CRON_SECRET = process.env.CRON_SECRET || '';

export default async function handler(req: Request) {
  // Verify cron secret (Vercel sets this header)
  const authHeader = req.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const res = await fetch(EDGE_FN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE}`,
      },
      body: '{}',
    });

    const data = await res.json();
    return new Response(JSON.stringify({ ok: true, ...data }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
