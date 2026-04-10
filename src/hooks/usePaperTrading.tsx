import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TrackedWallet {
  id: string;
  name: string;
  address: string;
  is_active: boolean;
  last_checked_at: string | null;
  notes: string | null;
}

export interface PaperPosition {
  id: string;
  wallet_source: string;
  market_slug: string;
  market_question: string;
  outcome: string;
  side: string;
  entry_price: number;
  current_price: number | null;
  size_usd: number;
  shares: number;
  pnl_usd: number;
  pnl_pct: number;
  status: string;
  opened_at: string;
  closed_at: string | null;
}

export interface WalletTrade {
  id: string;
  wallet_address: string;
  market_question: string;
  outcome: string;
  side: string;
  price: number;
  size: number;
  timestamp: string;
}

export interface PaperStats {
  virtualBalance: number;
  totalExposure: number;
  unrealizedPnl: number;
  realizedPnl: number;
  openCount: number;
  closedCount: number;
  winRate: number;
}

export function usePaperTrading() {
  const [wallets, setWallets] = useState<TrackedWallet[]>([]);
  const [openPositions, setOpenPositions] = useState<PaperPosition[]>([]);
  const [closedPositions, setClosedPositions] = useState<PaperPosition[]>([]);
  const [recentTrades, setRecentTrades] = useState<WalletTrade[]>([]);
  const [stats, setStats] = useState<PaperStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);

    const [walletsRes, openRes, closedRes, tradesRes] = await Promise.all([
      (supabase as any).from("tracked_wallets").select("*").order("created_at"),
      (supabase as any).from("paper_positions").select("*").eq("status", "open").order("opened_at", { ascending: false }),
      (supabase as any).from("paper_positions").select("*").neq("status", "open").order("closed_at", { ascending: false }).limit(50),
      (supabase as any).from("wallet_trades").select("id,wallet_address,market_question,outcome,side,price,size,timestamp").order("timestamp", { ascending: false }).limit(100),
    ]);

    const w = (walletsRes.data ?? []) as TrackedWallet[];
    const op = (openRes.data ?? []) as PaperPosition[];
    const cp = (closedRes.data ?? []) as PaperPosition[];
    const tr = (tradesRes.data ?? []) as WalletTrade[];

    setWallets(w);
    setOpenPositions(op);
    setClosedPositions(cp);
    setRecentTrades(tr);

    // Compute stats
    const VIRTUAL_BALANCE = 3000;
    const totalExposure = op.reduce((s, p) => s + (p.size_usd || 0), 0);
    const unrealizedPnl = op.reduce((s, p) => s + (p.pnl_usd || 0), 0);
    const realizedPnl = cp.reduce((s, p) => s + (p.pnl_usd || 0), 0);
    const wins = cp.filter((p) => p.pnl_usd > 0).length;
    const winRate = cp.length > 0 ? (wins / cp.length) * 100 : 0;

    setStats({
      virtualBalance: VIRTUAL_BALANCE,
      totalExposure,
      unrealizedPnl,
      realizedPnl,
      openCount: op.length,
      closedCount: cp.length,
      winRate,
    });

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { wallets, openPositions, closedPositions, recentTrades, stats, loading, refetch: fetchAll };
}
