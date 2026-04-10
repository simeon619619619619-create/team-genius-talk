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

// Paper trading config — $2000 total, split 50/50
const TOTAL_BALANCE = 2000;
const AI_BALANCE = 1000;    // AI strategy picks
const COPY_BALANCE = 1000;  // copy ImJustKen
const VIRTUAL_BALANCE = TOTAL_BALANCE; // for backward compat in stats
const AI_BET_SIZE = 50;     // $50 per AI bet (5% of $1000)
const COPY_BET_SIZE = 50;   // $50 per copy trade (5% of $1000)
const POSITION_SIZE_PCT = 5; // backward compat

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

    // Budget check: sum current COPY exposure only
    const { data: copyCheck } = await supabase
      .from('paper_positions')
      .select('size_usd')
      .eq('status', 'open')
      .neq('wallet_source', 'AI_STRATEGY');
    const copyExposure = (copyCheck || []).reduce((s: number, p: any) => s + (p.size_usd || 0), 0);

    if (side === 'BUY' && copyExposure + positionSize > COPY_BALANCE) {
      alerts.push(`⏸️ <b>${walletName}</b> купи ${outcome} @ ${(price * 100).toFixed(1)}¢ — <i>SKIP (copy бюджет: $${copyExposure.toFixed(0)}/$${COPY_BALANCE})</i>`);
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

// ── Active betting: scan markets, pick best odds, place paper bets ──

async function placeLiveBets(): Promise<{ alerts: string[]; positions: number }> {
  const alerts: string[] = [];

  // Check AI budget (only count AI_STRATEGY positions)
  const { data: openCheck } = await supabase.from('paper_positions').select('size_usd').eq('status', 'open').eq('wallet_source', 'AI_STRATEGY');
  const aiExposure = (openCheck || []).reduce((s: number, p: any) => s + (p.size_usd || 0), 0);
  const available = AI_BALANCE - aiExposure;
  const positionSize = AI_BET_SIZE;

  if (available < positionSize) {
    alerts.push(`⏸️ AI бюджет изчерпан: $${aiExposure.toFixed(0)}/$${AI_BALANCE} в позиции`);
    return { alerts, positions: 0 };
  }

  // Fetch active markets sorted by volume
  const markets = await fetchJSON(`${GAMMA_API}/markets?closed=false&active=true&order=volume24hr&ascending=false&limit=20`);
  if (!Array.isArray(markets) || markets.length === 0) {
    alerts.push('⚠️ Няма активни пазари');
    return { alerts, positions: 0 };
  }

  // Strategy: find markets with strong edge (price < 0.35 or > 0.65 — clear favorite)
  // Bet on the likely outcome (YES if > 0.65, NO if < 0.35)
  // Skip 50/50 markets (no edge)
  let placed = 0;
  const maxBets = Math.min(3, Math.floor(available / positionSize));

  for (const m of markets) {
    if (placed >= maxBets) break;

    let prices: number[];
    try {
      prices = JSON.parse(m.outcomePrices || '[]').map(Number);
    } catch { continue; }

    if (prices.length < 2) continue;
    const yesPrice = prices[0];
    const noPrice = prices[1];

    // Skip resolved markets (price at 0 or 1 = already decided)
    if (yesPrice >= 0.97 || yesPrice <= 0.03) continue;
    // Skip if no clear edge (between 0.35 and 0.65 = coin flip)
    if (yesPrice > 0.35 && yesPrice < 0.65) continue;

    // Skip if already have position in this market
    const conditionId = m.conditionId || m.condition_id || '';
    const { data: existingPos } = await supabase
      .from('paper_positions')
      .select('id')
      .eq('condition_id', conditionId)
      .eq('status', 'open')
      .limit(1);
    if (existingPos && existingPos.length > 0) continue;

    // Decide: bet on the favorite
    const outcome = yesPrice > 0.5 ? 'YES' : 'NO';
    const price = outcome === 'YES' ? yesPrice : noPrice;
    const shares = positionSize / price;

    const question = m.question || m.title || 'Unknown';
    const slug = m.slug || '';

    // Place paper bet at LIVE price
    await supabase.from('paper_positions').insert({
      wallet_source: 'AI_STRATEGY',
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

    // Also log as trade
    await supabase.from('wallet_trades').insert({
      wallet_address: 'AI_STRATEGY',
      trade_id: `ai-${Date.now()}-${placed}`,
      market_slug: slug,
      market_question: question,
      outcome,
      side: 'BUY',
      price,
      size: positionSize,
      timestamp: new Date().toISOString(),
      condition_id: conditionId,
      raw_json: { strategy: 'favorite_edge', market_volume_24h: m.volume24hr },
    });

    placed++;
    alerts.push(
      `🎯 <b>AI залог</b>: ${outcome} @ ${(price * 100).toFixed(1)}¢\n` +
      `   📋 ${question.slice(0, 80)}\n` +
      `   💰 ${positionSize.toFixed(2)}€ (${shares.toFixed(1)} shares)`
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

    const aiOpen = (allOpen || []).filter((p: any) => p.wallet_source === 'AI_STRATEGY');
    const copyOpen = (allOpen || []).filter((p: any) => p.wallet_source !== 'AI_STRATEGY');
    const aiClosed = (allClosed || []).filter((p: any) => p.wallet_source === 'AI_STRATEGY');
    const copyClosed = (allClosed || []).filter((p: any) => p.wallet_source !== 'AI_STRATEGY');

    const aiUnrealized = aiOpen.reduce((s: number, p: any) => s + (p.pnl_usd || 0), 0);
    const copyUnrealized = copyOpen.reduce((s: number, p: any) => s + (p.pnl_usd || 0), 0);
    const aiRealized = aiClosed.reduce((s: number, p: any) => s + (p.pnl_usd || 0), 0);
    const copyRealized = copyClosed.reduce((s: number, p: any) => s + (p.pnl_usd || 0), 0);

    const aiWins = aiClosed.filter((p: any) => (p.pnl_usd || 0) > 0).length;
    const aiLosses = aiClosed.filter((p: any) => (p.pnl_usd || 0) < 0).length;
    const copyWins = copyClosed.filter((p: any) => (p.pnl_usd || 0) > 0).length;
    const copyLosses = copyClosed.filter((p: any) => (p.pnl_usd || 0) < 0).length;

    const totalPnl = aiUnrealized + aiRealized + copyUnrealized + copyRealized;
    const totalExposure = (allOpen || []).reduce((s: number, p: any) => s + (p.size_usd || 0), 0);
    const openCount = (allOpen || []).length;

    // 6. Always send Telegram status (even without new alerts, so user sees wins/losses)
    const pnlSign = (v: number) => v >= 0 ? '+' : '';
    const header = `🤖 <b>Polymarket Paper Trader ($${TOTAL_BALANCE})</b>\n\n`;

    let statusLines = '';
    if (allAlerts.length > 0) {
      statusLines = allAlerts.join('\n\n') + '\n\n';
    }

    const footer =
      `📊 <b>AI стратегия ($${AI_BALANCE})</b>\n` +
      `   Отворени: ${aiOpen.length} | P&L: ${pnlSign(aiUnrealized)}$${aiUnrealized.toFixed(2)}\n` +
      `   ✅ Победи: ${aiWins} | ❌ Загуби: ${aiLosses} | Realized: ${pnlSign(aiRealized)}$${aiRealized.toFixed(2)}\n\n` +
      `📊 <b>Copy ImJustKen ($${COPY_BALANCE})</b>\n` +
      `   Отворени: ${copyOpen.length} | P&L: ${pnlSign(copyUnrealized)}$${copyUnrealized.toFixed(2)}\n` +
      `   ✅ Победи: ${copyWins} | ❌ Загуби: ${copyLosses} | Realized: ${pnlSign(copyRealized)}$${copyRealized.toFixed(2)}\n\n` +
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
      ai_pnl: aiPnl,
      copy_pnl: copyPnl,
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
