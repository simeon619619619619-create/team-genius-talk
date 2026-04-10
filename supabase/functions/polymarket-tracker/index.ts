// ============================================================================
// POLYMARKET PAPER TRADER — polls top wallets, simulates copy trades
// Called by pg_cron every 15 min via pg_net
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TELEGRAM_TOKEN = '8621434922:AAHz_VnYQ8HqDTEyMtNpoWOyWnq-BWqUC2k';
const TELEGRAM_CHAT = '1755421488';

const DATA_API = 'https://data-api.polymarket.com';
const GAMMA_API = 'https://gamma-api.polymarket.com';

// Paper trading config — $3000 total, 3 portfolios
const TOTAL_BALANCE = 3000;
const AI_BALANCE = 1000;       // AI strategy (value + Kelly)
const COPY1_BALANCE = 1000;    // copy ImJustKen (high volume, 63% WR)
const COPY2_BALANCE = 1000;    // copy geniusMC (selective, 74.7% WR)
const VIRTUAL_BALANCE = TOTAL_BALANCE;
const AI_BET_SIZE = 50;        // $50 per AI bet (5% of $1000)
const COPY_BET_SIZE = 50;      // $50 per copy trade
const POSITION_SIZE_PCT = 5;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Helpers ──

async function sendTelegram(msg: string) {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT, text: msg, parse_mode: 'HTML' }),
    });
  } catch { /* silent */ }
}

async function fetchJSON(url: string) {
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

// ── Resolve missing wallet addresses (RN1 etc) ──

async function resolveWalletAddress(name: string): Promise<string | null> {
  try {
    const slug = name.toLowerCase();
    const profile = await fetchJSON(`${GAMMA_API}/public-profile?slug=${slug}`);
    if (profile?.proxyWallet) return profile.proxyWallet;
    // Try search
    const search = await fetchJSON(`${GAMMA_API}/search?q=${encodeURIComponent(name)}`);
    if (search?.traders?.[0]?.proxyWallet) return search.traders[0].proxyWallet;
    return null;
  } catch {
    return null;
  }
}

// ── Fetch new trades for a wallet ──

async function fetchNewTrades(wallet: { name: string; address: string; last_trade_id: string | null }) {
  const url = `${DATA_API}/trades?user=${wallet.address}&limit=20`;
  const trades = await fetchJSON(url);

  if (!Array.isArray(trades) || trades.length === 0) return [];

  // If RESET or first run — just set the bookmark, don't process old trades
  if (!wallet.last_trade_id || wallet.last_trade_id === 'RESET') {
    // Return empty — we only want to set the bookmark for next poll
    return []; // caller will still update last_trade_id from latest
  }

  // Filter to only new trades (after last_trade_id)
  const newTrades = [];
  for (const t of trades) {
    const tid = t.id || `${t.transactionHash}-${t.tradeIndex}`;
    if (tid === wallet.last_trade_id) break;
    newTrades.push(t);
  }

  // Cap at 10 trades per poll to avoid budget explosion
  return newTrades.slice(0, 10);
}

/** Get the latest trade ID for bookmarking (even if we don't process it) */
async function getLatestTradeId(walletAddress: string): Promise<string | null> {
  try {
    const trades = await fetchJSON(`${DATA_API}/trades?user=${walletAddress}&limit=1`);
    if (Array.isArray(trades) && trades.length > 0) {
      return trades[0].id || `${trades[0].transactionHash}-${trades[0].tradeIndex}`;
    }
  } catch { /* skip */ }
  return null;
}

// ── Get market info for a condition ID ──

async function getMarketInfo(conditionId: string): Promise<{ question: string; slug: string } | null> {
  try {
    const markets = await fetchJSON(`${GAMMA_API}/markets?condition_id=${conditionId}&limit=1`);
    if (markets?.[0]) return { question: markets[0].question, slug: markets[0].slug };
    return null;
  } catch {
    return null;
  }
}

// ── Process new trades → paper positions ──

async function processTrades(walletName: string, walletAddress: string, trades: any[]) {
  const alerts: string[] = [];

  for (const t of trades.reverse()) { // oldest first
    const tradeId = t.id || `${t.transactionHash}-${t.tradeIndex}`;

    // Check if already recorded
    const { data: existing } = await supabase
      .from('wallet_trades')
      .select('id')
      .eq('trade_id', tradeId)
      .limit(1);

    if (existing && existing.length > 0) continue;

    // Get market info
    const conditionId = t.conditionId || t.market || '';
    const market = conditionId ? await getMarketInfo(conditionId) : null;
    const question = market?.question || t.title || t.market || 'Unknown market';
    const slug = market?.slug || '';

    const side = t.side || (t.type === 'BUY' ? 'BUY' : 'SELL');
    const outcome = t.outcome || t.asset || 'YES';
    const price = parseFloat(t.price || '0');
    const size = parseFloat(t.size || t.amount || '0');

    if (price === 0 || size === 0) continue;

    // Insert raw trade
    await supabase.from('wallet_trades').insert({
      wallet_address: walletAddress,
      trade_id: tradeId,
      market_slug: slug,
      market_question: question,
      outcome,
      side,
      price,
      size,
      timestamp: t.timestamp || t.createdAt || new Date().toISOString(),
      condition_id: conditionId,
      raw_json: t,
    });

    // Simulate paper trade — $50 per copy trade
    const positionSize = COPY_BET_SIZE;
    const shares = positionSize / price;

    // Budget check: per-wallet copy budget
    const walletBudget = walletName === 'geniusMC' ? COPY2_BALANCE : COPY1_BALANCE;
    const { data: copyCheck } = await supabase
      .from('paper_positions')
      .select('size_usd')
      .eq('status', 'open')
      .eq('wallet_source', walletName);
    const copyExposure = (copyCheck || []).reduce((s: number, p: any) => s + (p.size_usd || 0), 0);

    if (side === 'BUY' && copyExposure + positionSize > walletBudget) {
      alerts.push(`⏸️ <b>${walletName}</b> купи ${outcome} @ ${(price * 100).toFixed(1)}¢ — <i>SKIP (бюджет: $${copyExposure.toFixed(0)}/$${walletBudget})</i>`);
      continue;
    }

    if (side === 'BUY') {
      await supabase.from('paper_positions').insert({
        wallet_source: walletName,
        market_slug: slug,
        market_question: question,
        outcome,
        side: 'BUY',
        entry_price: price,
        current_price: price,
        size_usd: positionSize,
        shares,
        status: 'open',
        condition_id: conditionId,
      });

      alerts.push(
        `📈 <b>${walletName}</b> купи ${outcome} @ ${(price * 100).toFixed(1)}¢\n` +
        `   📋 ${question.slice(0, 80)}\n` +
        `   💰 Ние: виртуално ${positionSize.toFixed(2)}€`
      );
    } else {
      // Close matching open position if exists
      const { data: openPos } = await supabase
        .from('paper_positions')
        .select('*')
        .eq('wallet_source', walletName)
        .eq('condition_id', conditionId)
        .eq('outcome', outcome)
        .eq('status', 'open')
        .limit(1);

      if (openPos && openPos.length > 0) {
        const pos = openPos[0];
        const pnl = (price - pos.entry_price) * pos.shares;
        const pnlPct = ((price - pos.entry_price) / pos.entry_price) * 100;

        await supabase.from('paper_positions').update({
          current_price: price,
          pnl_usd: pnl,
          pnl_pct: pnlPct,
          status: 'closed',
          closed_at: new Date().toISOString(),
        }).eq('id', pos.id);

        const emoji = pnl >= 0 ? '✅' : '❌';
        alerts.push(
          `${emoji} <b>${walletName}</b> продаде ${outcome} @ ${(price * 100).toFixed(1)}¢\n` +
          `   📋 ${question.slice(0, 80)}\n` +
          `   💰 P&L: ${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}€ (${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(1)}%)`
        );
      }
    }
  }

  // Update last_trade_id
  if (trades.length > 0) {
    const latestId = trades[0].id || `${trades[0].transactionHash}-${trades[0].tradeIndex}`;
    await supabase
      .from('tracked_wallets')
      .update({ last_trade_id: latestId, last_checked_at: new Date().toISOString() })
      .eq('address', walletAddress);
  }

  return alerts;
}

// ── Update current prices for open positions ──

async function updateOpenPositions() {
  const { data: positions } = await supabase
    .from('paper_positions')
    .select('*')
    .eq('status', 'open');

  if (!positions || positions.length === 0) return;

  for (const pos of positions) {
    if (!pos.condition_id) continue;
    try {
      const markets = await fetchJSON(`${GAMMA_API}/markets?condition_id=${pos.condition_id}&limit=1`);
      if (!markets?.[0]?.outcomePrices) continue;

      const prices = JSON.parse(markets[0].outcomePrices);
      const idx = pos.outcome === 'YES' ? 0 : 1;
      const currentPrice = parseFloat(prices[idx] || '0');

      if (currentPrice > 0) {
        const pnl = (currentPrice - pos.entry_price) * pos.shares;
        const pnlPct = ((currentPrice - pos.entry_price) / pos.entry_price) * 100;

        await supabase.from('paper_positions').update({
          current_price: currentPrice,
          pnl_usd: pnl,
          pnl_pct: pnlPct,
        }).eq('id', pos.id);
      }
    } catch { /* skip */ }
  }
}

// ── Active betting: VALUE + KELLY strategy ──
// Rules based on research of 95M+ Polymarket transactions:
// 1. Max 3 uncorrelated positions at a time
// 2. Quarter Kelly sizing (25% of full Kelly), hard cap 5% of bankroll
// 3. Only VALUE zone: 15-33¢ (underdog value) or 67-90¢ (strong favorite value)
// 4. DEATH ZONE 51-67¢ — skip (worst risk/reward)
// 5. Skip resolved (>95¢), longshots (<10¢), joke markets
// 6. Only politics, sports, finance, crypto, geopolitics

async function placeLiveBets(): Promise<{ alerts: string[]; positions: number }> {
  const alerts: string[] = [];

  // Check AI budget + open position count
  const { data: openCheck } = await supabase.from('paper_positions').select('size_usd, condition_id').eq('status', 'open').eq('wallet_source', 'AI_STRATEGY');
  const aiExposure = (openCheck || []).reduce((s: number, p: any) => s + (p.size_usd || 0), 0);
  const openCount = (openCheck || []).length;
  const available = AI_BALANCE - aiExposure;

  // RULE: max 3 uncorrelated positions
  if (openCount >= 3) return { alerts, positions: 0 };
  if (available < 20) return { alerts, positions: 0 };

  const markets = await fetchJSON(`${GAMMA_API}/markets?closed=false&active=true&order=volume24hr&ascending=false&limit=30`);
  if (!Array.isArray(markets) || markets.length === 0) return { alerts, positions: 0 };

  let placed = 0;
  const maxNew = 3 - openCount;

  for (const m of markets) {
    if (placed >= maxNew) break;

    let prices: number[];
    try { prices = JSON.parse(m.outcomePrices || '[]').map(Number); } catch { continue; }
    if (prices.length < 2) continue;

    const yesPrice = prices[0];
    const noPrice = prices[1];

    // Skip resolved or near-resolved
    if (yesPrice >= 0.95 || yesPrice <= 0.05) continue;
    // DEATH ZONE: 51-67¢ on either side
    if (yesPrice > 0.51 && yesPrice < 0.67) continue;
    if (noPrice > 0.51 && noPrice < 0.67) continue;
    // Skip longshots under 10¢
    if (yesPrice < 0.10 && noPrice < 0.10) continue;

    // Skip joke markets
    const q = (m.question || m.title || '').toLowerCase();
    const skipWords = ['jesus', 'god ', 'alien', 'ufo', 'rapture', 'zombie', 'flat earth', 'simulation', 'bigfoot', 'loch ness', 'santa', 'unicorn', 'will i ', 'my wife', 'girlfriend'];
    if (skipWords.some(w => q.includes(w))) continue;

    // Only serious categories
    const allowedWords = ['president', 'election', 'trump', 'biden', 'congress', 'senate', 'fed', 'rate', 'gdp', 'inflation', 'bitcoin', 'btc', 'eth', 'crypto', 'price', 'nba', 'nfl', 'mlb', 'premier league', 'champions', 'masters', 'war', 'ceasefire', 'nato', 'china', 'russia', 'ukraine', 'iran', 'tariff', 'minister', 'governor', 'recession', 'oscar', 'grammy'];
    if (!allowedWords.some(w => q.includes(w))) continue;

    // Skip if already positioned
    const conditionId = m.conditionId || m.condition_id || '';
    if ((openCheck || []).some((p: any) => p.condition_id === conditionId)) continue;

    // ── VALUE ZONE + KELLY ──
    let outcome: string;
    let price: number;
    let modelProb: number;

    if (yesPrice >= 0.67 && yesPrice <= 0.90) {
      outcome = 'YES'; price = yesPrice;
      modelProb = Math.min(0.93, yesPrice + 0.05);
    } else if (yesPrice >= 0.10 && yesPrice <= 0.33) {
      outcome = 'NO'; price = noPrice;
      modelProb = Math.min(0.93, noPrice + 0.05);
    } else { continue; }

    // Quarter Kelly
    const b = (1 / price) - 1;
    const kellyFull = (b * modelProb - (1 - modelProb)) / b;
    const kellyQ = kellyFull * 0.25;
    if (kellyQ <= 0) continue;

    const positionSize = Math.min(Math.max(10, Math.round(AI_BALANCE * kellyQ)), AI_BET_SIZE, available);
    const shares = positionSize / price;
    const ev = (modelProb * (1 / price - 1) * positionSize) - ((1 - modelProb) * positionSize);
    const question = m.question || m.title || 'Unknown';

    await supabase.from('paper_positions').insert({
      wallet_source: 'AI_STRATEGY', market_slug: m.slug || '', market_question: question,
      outcome, side: 'BUY', entry_price: price, current_price: price,
      size_usd: positionSize, shares, status: 'open', condition_id: conditionId,
    });

    await supabase.from('wallet_trades').insert({
      wallet_address: 'AI_STRATEGY', trade_id: `ai-${Date.now()}-${placed}`,
      market_slug: m.slug || '', market_question: question, outcome, side: 'BUY',
      price, size: positionSize, timestamp: new Date().toISOString(),
      condition_id: conditionId,
      raw_json: { strategy: 'value_kelly', kelly_pct: kellyQ, model_prob: modelProb, ev, volume_24h: m.volume24hr },
    });

    placed++;
    alerts.push(
      `🎯 <b>AI залог</b>: ${outcome} @ ${(price * 100).toFixed(1)}¢\n` +
      `   📋 ${question.slice(0, 80)}\n` +
      `   💰 $${positionSize} (${shares.toFixed(1)} sh) | Kelly: ${(kellyQ * 100).toFixed(1)}% | EV: ${ev >= 0 ? '+' : ''}$${ev.toFixed(2)}`
    );
  }

  return { alerts, positions: placed };
}

// ── Main handler ──

Deno.serve(async (req: Request) => {
  const startTime = Date.now();

  try {
    // Check for action mode
    let body: any = {};
    try { body = await req.json(); } catch { /* empty body ok */ }

    // MODE: place_bets — scan markets and place live paper bets
    if (body?.action === 'place_bets') {
      const { alerts, positions } = await placeLiveBets();

      // Update prices on all open positions
      await updateOpenPositions();

      // Telegram
      if (alerts.length > 0) {
        const msg = `🤖 <b>Polymarket AI Trader</b>\n\n${alerts.join('\n\n')}`;
        await sendTelegram(msg);
      }

      return new Response(JSON.stringify({ ok: true, bets_placed: positions, alerts }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // DEFAULT MODE: copy-trade polling
    // 1. Get active wallets
    const { data: wallets } = await supabase
      .from('tracked_wallets')
      .select('*')
      .eq('is_active', true);

    if (!wallets || wallets.length === 0) {
      return new Response(JSON.stringify({ ok: true, msg: 'No active wallets' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const allAlerts: string[] = [];

    for (const w of wallets) {
      // Resolve address if missing
      if (!w.address) {
        const resolved = await resolveWalletAddress(w.name);
        if (resolved) {
          await supabase.from('tracked_wallets').update({ address: resolved }).eq('id', w.id);
          w.address = resolved;
          allAlerts.push(`🔍 Resolved ${w.name} → ${resolved.slice(0, 10)}...`);
        } else {
          continue; // skip unresolvable
        }
      }

      // 2. Fetch new trades
      try {
        const trades = await fetchNewTrades(w);
        if (trades.length > 0) {
          const alerts = await processTrades(w.name, w.address, trades);
          allAlerts.push(...alerts);
        }
        // Always update bookmark (even on first/RESET run where trades==[])
        const latestId = await getLatestTradeId(w.address);
        if (latestId && latestId !== w.last_trade_id) {
          await supabase.from('tracked_wallets')
            .update({ last_trade_id: latestId, last_checked_at: new Date().toISOString() })
            .eq('id', w.id);
        }
      } catch (e) {
        allAlerts.push(`⚠️ ${w.name}: ${(e as Error).message}`);
      }
    }

    // 3. AI strategy — auto place bets too (runs every poll)
    try {
      const { alerts: aiAlerts } = await placeLiveBets();
      allAlerts.push(...aiAlerts);
    } catch (e) {
      allAlerts.push(`⚠️ AI Strategy: ${(e as Error).message}`);
    }

    // 4. Update prices on open positions
    await updateOpenPositions();

    // 5. Get full P&L summary (split by source, open + closed)
    const { data: allOpen } = await supabase
      .from('paper_positions')
      .select('pnl_usd, size_usd, wallet_source')
      .eq('status', 'open');

    const { data: allClosed } = await supabase
      .from('paper_positions')
      .select('pnl_usd, wallet_source')
      .neq('status', 'open');

    // Split by 3 portfolios
    const bySource = (src: string) => ({
      open: (allOpen || []).filter((p: any) => p.wallet_source === src),
      closed: (allClosed || []).filter((p: any) => p.wallet_source === src),
    });

    const ai = bySource('AI_STRATEGY');
    const copy1 = bySource('ImJustKen');
    const copy2 = bySource('geniusMC');

    const stats = (s: { open: any[]; closed: any[] }) => {
      const unrealized = s.open.reduce((a: number, p: any) => a + (p.pnl_usd || 0), 0);
      const realized = s.closed.reduce((a: number, p: any) => a + (p.pnl_usd || 0), 0);
      const wins = s.closed.filter((p: any) => (p.pnl_usd || 0) > 0).length;
      const losses = s.closed.filter((p: any) => (p.pnl_usd || 0) < 0).length;
      return { unrealized, realized, wins, losses, openCount: s.open.length };
    };

    const aiS = stats(ai), c1S = stats(copy1), c2S = stats(copy2);
    const totalPnl = aiS.unrealized + aiS.realized + c1S.unrealized + c1S.realized + c2S.unrealized + c2S.realized;
    const totalExposure = (allOpen || []).reduce((s: number, p: any) => s + (p.size_usd || 0), 0);
    const openCount = (allOpen || []).length;

    const pnlSign = (v: number) => v >= 0 ? '+' : '';
    const portfolioLine = (name: string, budget: number, s: ReturnType<typeof stats>) =>
      `📊 <b>${name} ($${budget})</b>\n` +
      `   Отворени: ${s.openCount} | P&L: ${pnlSign(s.unrealized)}$${s.unrealized.toFixed(2)}\n` +
      `   ✅ ${s.wins} | ❌ ${s.losses} | Realized: ${pnlSign(s.realized)}$${s.realized.toFixed(2)}`;

    const header = `🤖 <b>Polymarket Paper Trader ($${TOTAL_BALANCE})</b>\n\n`;

    let statusLines = '';
    if (allAlerts.length > 0) {
      statusLines = allAlerts.join('\n\n') + '\n\n';
    }

    const footer =
      portfolioLine('AI Value+Kelly', AI_BALANCE, aiS) + '\n\n' +
      portfolioLine('Copy ImJustKen', COPY1_BALANCE, c1S) + '\n\n' +
      portfolioLine('Copy geniusMC', COPY2_BALANCE, c2S) + '\n\n' +
      `💰 <b>Общо P&L: ${pnlSign(totalPnl)}$${totalPnl.toFixed(2)}</b> | Експозиция: $${totalExposure.toFixed(0)} | Отворени: ${openCount}`;

    // Send only if there are alerts OR every 4 hours for status update
    const hour = new Date().getUTCHours();
    const isStatusHour = (hour % 4 === 0) && new Date().getUTCMinutes() < 20;
    if (allAlerts.length > 0 || isStatusHour) {
      await sendTelegram(header + statusLines + footer);
    }

    const duration = Date.now() - startTime;
    return new Response(JSON.stringify({
      ok: true,
      wallets_checked: wallets.length,
      new_alerts: allAlerts.length,
      open_positions: openCount,
      ai: { open: aiS.openCount, wins: aiS.wins, losses: aiS.losses, unrealized: aiS.unrealized, realized: aiS.realized },
      copy1: { open: c1S.openCount, wins: c1S.wins, losses: c1S.losses, unrealized: c1S.unrealized, realized: c1S.realized },
      copy2: { open: c2S.openCount, wins: c2S.wins, losses: c2S.losses, unrealized: c2S.unrealized, realized: c2S.realized },
      total_pnl: totalPnl,
      total_exposure: totalExposure,
      duration_ms: duration,
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (e) {
    const msg = (e as Error).message;
    await sendTelegram(`❌ <b>Polymarket tracker error</b>\n\n${msg}`);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
