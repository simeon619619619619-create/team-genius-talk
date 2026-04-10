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

// Paper trading config
const VIRTUAL_BALANCE = 100; // start with 100€ virtual
const POSITION_SIZE_PCT = 5; // 5% of balance per copy trade = 5€

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
  const url = `${DATA_API}/trades?user=${wallet.address}&limit=50`;
  const trades = await fetchJSON(url);

  if (!Array.isArray(trades) || trades.length === 0) return [];

  // Filter to only new trades (after last_trade_id)
  const newTrades = [];
  for (const t of trades) {
    if (wallet.last_trade_id && t.id === wallet.last_trade_id) break;
    newTrades.push(t);
  }

  return newTrades;
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

    // Simulate paper trade (copy at same price, scaled to our position size)
    const positionSize = VIRTUAL_BALANCE * (POSITION_SIZE_PCT / 100);
    const shares = positionSize / price;

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

// ── Main handler ──

Deno.serve(async (req: Request) => {
  const startTime = Date.now();

  try {
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
      } catch (e) {
        allAlerts.push(`⚠️ ${w.name}: ${(e as Error).message}`);
      }
    }

    // 3. Update prices on open positions
    await updateOpenPositions();

    // 4. Get current P&L summary
    const { data: openPositions } = await supabase
      .from('paper_positions')
      .select('pnl_usd, size_usd')
      .eq('status', 'open');

    const totalUnrealizedPnl = (openPositions || []).reduce((s, p) => s + (p.pnl_usd || 0), 0);
    const totalExposure = (openPositions || []).reduce((s, p) => s + (p.size_usd || 0), 0);
    const openCount = (openPositions || []).length;

    // 5. Send Telegram if we have alerts
    if (allAlerts.length > 0) {
      const header = `🤖 <b>Polymarket Paper Trader</b>\n\n`;
      const footer = `\n\n📊 Баланс: ${VIRTUAL_BALANCE}€ | Експозиция: ${totalExposure.toFixed(2)}€ | P&L: ${totalUnrealizedPnl >= 0 ? '+' : ''}${totalUnrealizedPnl.toFixed(2)}€ | Отворени: ${openCount}`;
      await sendTelegram(header + allAlerts.join('\n\n') + footer);
    }

    const duration = Date.now() - startTime;
    return new Response(JSON.stringify({
      ok: true,
      wallets_checked: wallets.length,
      new_alerts: allAlerts.length,
      open_positions: openCount,
      unrealized_pnl: totalUnrealizedPnl,
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
