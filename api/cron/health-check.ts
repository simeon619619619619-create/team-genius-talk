// Vercel cron — проверява EFI + Founders Club + BOSY двукратно дневно (08:00 + 17:00 BG)
// Schedule: "0 5,14 * * *" UTC
// Telegram alert винаги, Resend email само при fail.

export const config = { runtime: 'edge' };

const TELEGRAM_BOT_TOKEN = '8798558814:AAFtDexepj173FLyTm984alnczQYKvGbZBs';
const TELEGRAM_CHAT_ID = '1755421488';
const RESEND_API_KEY = 're_XKdquLN7_7boXHeohCnQCppcvpbFH62FT';
const ALERT_FROM = 'alerts@eufashioninstitute.com';
const ALERT_TO = 'info@eufashioninstitute.com';
const CRON_SECRET = process.env.CRON_SECRET || '';

type Check = { name: string; ok: boolean; detail: string };

async function checkUrl(label: string, url: string, mustInclude?: string, mustNotInclude?: string): Promise<Check> {
  try {
    const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15000) });
    const body = mustInclude || mustNotInclude ? await res.text() : '';
    if (!res.ok) return { name: label, ok: false, detail: `HTTP ${res.status}` };
    if (mustInclude && !body.includes(mustInclude)) return { name: label, ok: false, detail: `missing "${mustInclude}"` };
    if (mustNotInclude && body.includes(mustNotInclude)) return { name: label, ok: false, detail: `contains "${mustNotInclude}"` };
    return { name: label, ok: true, detail: `${res.status}` };
  } catch (e) {
    return { name: label, ok: false, detail: (e as Error).message };
  }
}

async function checkEfiApplyPost(): Promise<Check> {
  // Healthy endpoint = validation 400 за празно body (не пуска DB запис).
  // Timeout / 5xx = down.
  const label = 'EFI apply POST';
  try {
    const res = await fetch('https://eufashioninstitute.com/api/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      signal: AbortSignal.timeout(20000),
    });
    if (res.status === 400) return { name: label, ok: true, detail: '400 (validation alive)' };
    return { name: label, ok: false, detail: `expected 400, got ${res.status}` };
  } catch (e) {
    return { name: label, ok: false, detail: (e as Error).message };
  }
}

async function checkFcSignup(): Promise<Check> {
  // Tests custom-signup edge function is alive. Uses a known-registered email
  // so it should return 200 with "already been registered" error — proving the
  // function is deployed, reachable, and talking to the DB.
  const label = 'FC signup POST';
  const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zcGJiZXFpdWRqemNwcWl2bWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MzI3ODcsImV4cCI6MjA4OTMwODc4N30.5_ZdvKI1koZ9PjBw7AdtsxMJE0FF3mnrJttNVaID_vY';
  try {
    const res = await fetch('https://ospbbeqiudjzcpqivmfg.supabase.co/functions/v1/custom-signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY,
      },
      body: JSON.stringify({
        email: 'healthcheck-probe@founderclub.bg',
        password: 'HealthCheck123!',
        fullName: 'Health Check',
      }),
      signal: AbortSignal.timeout(20000),
    });
    const data = await res.json().catch(() => ({}));
    // 200 with success or "already registered" both mean the function is alive
    if (res.status === 200) return { name: label, ok: true, detail: data.message || data.error || '200' };
    return { name: label, ok: false, detail: `HTTP ${res.status}: ${data.error || ''}` };
  } catch (e) {
    return { name: label, ok: false, detail: (e as Error).message };
  }
}

async function sendTelegram(text: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML' }),
  }).catch(() => {});
}

async function sendResendEmail(subject: string, html: string): Promise<void> {
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: ALERT_FROM, to: ALERT_TO, subject, html }),
  }).catch(() => {});
}

export default async function handler(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const checks = await Promise.all([
    // EFI
    checkUrl('EFI /', 'https://eufashioninstitute.com'),
    checkUrl('EFI /apply', 'https://eufashioninstitute.com/apply'),
    checkUrl('EFI /beauty-contest', 'https://eufashioninstitute.com/beauty-contest'),
    checkEfiApplyPost(),
    // Founders Club
    checkUrl('FC /', 'https://founderclub.bg'),
    checkUrl('FC /auth', 'https://founderclub.bg/auth'),
    checkUrl('FC /bosy-club', 'https://founderclub.bg/bosy-club'),
    checkFcSignup(),
    // BOSY
    checkUrl('BOSY /', 'https://bosy.bg'),
    checkUrl('BOSY /shop', 'https://bosy.bg/shop', undefined, 'Няма снимка'),
    checkUrl('BOSY /product/detox-me-baby', 'https://bosy.bg/product/detox-me-baby'),
    checkUrl('BOSY /product/herbal-boost', 'https://bosy.bg/product/herbal-boost'),
  ]);

  const failed = checks.filter((c) => !c.ok);
  const ts = new Date().toLocaleString('bg-BG', { timeZone: 'Europe/Sofia' });

  if (failed.length === 0) {
    await sendTelegram(`✅ Health check ${ts}\n${checks.length}/${checks.length} OK`);
  } else {
    const lines = failed.map((f) => `❌ <b>${f.name}</b>: ${f.detail}`).join('\n');
    await sendTelegram(`🚨 Health check ${ts}\n${failed.length}/${checks.length} FAIL\n\n${lines}`);
    const html = `<h2>Health check failures — ${ts}</h2><ul>${failed.map((f) => `<li><b>${f.name}</b>: ${f.detail}</li>`).join('')}</ul>`;
    await sendResendEmail(`[Health Check] ${failed.length} failures`, html);
  }

  return new Response(JSON.stringify({ ok: failed.length === 0, total: checks.length, failed: failed.length, checks }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
