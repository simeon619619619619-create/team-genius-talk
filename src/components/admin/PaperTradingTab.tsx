import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Wallet,
  Activity,
  RefreshCw,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Clock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { bg } from "date-fns/locale";
import { usePaperTrading, type PaperPosition, type WalletTrade } from "@/hooks/usePaperTrading";

/** Safely parse a timestamp that could be ISO string, unix seconds, or unix ms */
function safeDate(v: unknown): Date | null {
  if (!v) return null;
  if (typeof v === "number") {
    // Unix seconds (< 2e10) vs milliseconds
    return new Date(v < 2e10 ? v * 1000 : v);
  }
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
}

function timeAgo(v: unknown): string {
  const d = safeDate(v);
  if (!d) return "—";
  try {
    return formatDistanceToNow(d, { addSuffix: true, locale: bg });
  } catch {
    return "—";
  }
}

function StatCard({ label, value, subvalue, icon: Icon, trend }: {
  label: string;
  value: string;
  subvalue?: string;
  icon: any;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className={`text-2xl font-bold ${
        trend === "up" ? "text-green-500" : trend === "down" ? "text-red-500" : ""
      }`}>
        {value}
      </div>
      {subvalue && <div className="text-xs text-muted-foreground mt-1">{subvalue}</div>}
    </div>
  );
}

function PnlBadge({ pnl, pct }: { pnl: number; pct?: number }) {
  const isPositive = pnl >= 0;
  return (
    <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? "text-green-500" : "text-red-500"}`}>
      {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
      {isPositive ? "+" : ""}{pnl.toFixed(2)}€
      {pct !== undefined && (
        <span className="text-xs opacity-70">({isPositive ? "+" : ""}{pct.toFixed(1)}%)</span>
      )}
    </div>
  );
}

function PositionsTable({ positions, showPnl }: { positions: PaperPosition[]; showPnl: boolean }) {
  if (positions.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-10">
        Няма позиции.
      </div>
    );
  }

  return (
    <div className="rounded-xl border overflow-auto max-h-[60vh]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Пазар</TableHead>
            <TableHead>Wallet</TableHead>
            <TableHead>Позиция</TableHead>
            <TableHead>Вход</TableHead>
            <TableHead>Сега</TableHead>
            <TableHead>Размер</TableHead>
            {showPnl && <TableHead>P&L</TableHead>}
            <TableHead>Кога</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {positions.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="max-w-[300px]">
                <div className="text-sm font-medium line-clamp-2">{p.market_question || p.market_slug || "—"}</div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">{p.wallet_source}</Badge>
              </TableCell>
              <TableCell>
                <Badge className={p.outcome === "YES" ? "bg-green-600" : "bg-red-600"}>
                  {p.outcome}
                </Badge>
              </TableCell>
              <TableCell className="font-mono text-sm">{(p.entry_price * 100).toFixed(1)}¢</TableCell>
              <TableCell className="font-mono text-sm">
                {p.current_price ? `${(p.current_price * 100).toFixed(1)}¢` : "—"}
              </TableCell>
              <TableCell className="text-sm">{p.size_usd?.toFixed(2)}€</TableCell>
              {showPnl && (
                <TableCell>
                  <PnlBadge pnl={p.pnl_usd} pct={p.pnl_pct} />
                </TableCell>
              )}
              <TableCell className="text-xs text-muted-foreground">
                {timeAgo(p.opened_at)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function TradesFeed({ trades, wallets }: { trades: WalletTrade[]; wallets: { address: string; name: string }[] }) {
  const nameMap = new Map(wallets.map((w) => [w.address?.toLowerCase(), w.name]));

  if (trades.length === 0) {
    return <div className="text-center text-muted-foreground py-10">Няма записани trades.</div>;
  }

  return (
    <div className="rounded-xl border overflow-auto max-h-[60vh]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Кога</TableHead>
            <TableHead>Wallet</TableHead>
            <TableHead>Действие</TableHead>
            <TableHead>Пазар</TableHead>
            <TableHead>Цена</TableHead>
            <TableHead>Размер</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trades.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                {timeAgo(t.timestamp)}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {nameMap.get(t.wallet_address?.toLowerCase()) || t.wallet_address?.slice(0, 8)}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  <Badge className={t.side === "BUY" ? "bg-green-600" : "bg-red-600"}>
                    {t.side}
                  </Badge>
                  <Badge variant="outline">{t.outcome}</Badge>
                </div>
              </TableCell>
              <TableCell className="max-w-[250px] text-sm line-clamp-1">
                {t.market_question || "—"}
              </TableCell>
              <TableCell className="font-mono text-sm">{(t.price * 100).toFixed(1)}¢</TableCell>
              <TableCell className="text-sm">${t.size?.toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function PaperTradingTab() {
  const { wallets, openPositions, closedPositions, recentTrades, stats, loading, refetch } = usePaperTrading();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalPnl = (stats?.unrealizedPnl ?? 0) + (stats?.realizedPnl ?? 0);

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard
          label="Виртуален баланс"
          value={`${stats?.virtualBalance ?? 100}€`}
          icon={Wallet}
        />
        <StatCard
          label="Общ P&L"
          value={`${totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}€`}
          trend={totalPnl >= 0 ? "up" : "down"}
          icon={totalPnl >= 0 ? TrendingUp : TrendingDown}
        />
        <StatCard
          label="Unrealized"
          value={`${(stats?.unrealizedPnl ?? 0) >= 0 ? "+" : ""}${(stats?.unrealizedPnl ?? 0).toFixed(2)}€`}
          trend={(stats?.unrealizedPnl ?? 0) >= 0 ? "up" : "down"}
          icon={Activity}
        />
        <StatCard
          label="Realized"
          value={`${(stats?.realizedPnl ?? 0) >= 0 ? "+" : ""}${(stats?.realizedPnl ?? 0).toFixed(2)}€`}
          trend={(stats?.realizedPnl ?? 0) >= 0 ? "up" : "down"}
          icon={DollarSign}
        />
        <StatCard
          label="Отворени"
          value={`${stats?.openCount ?? 0}`}
          subvalue={`Експозиция: ${(stats?.totalExposure ?? 0).toFixed(2)}€`}
          icon={Target}
        />
        <StatCard
          label="Win Rate"
          value={`${(stats?.winRate ?? 0).toFixed(0)}%`}
          subvalue={`${stats?.closedCount ?? 0} затворени`}
          icon={BarChart3}
        />
      </div>

      {/* Wallets status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Tracked Wallets
              </CardTitle>
              <CardDescription>Wallets които копираме (paper)</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={refetch} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              Обнови
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {wallets.map((w) => (
              <div key={w.id} className="flex items-center gap-2 rounded-lg border px-3 py-2">
                <div className={`h-2 w-2 rounded-full ${w.is_active ? "bg-green-500" : "bg-gray-400"}`} />
                <span className="font-medium text-sm">{w.name}</span>
                {w.address && (
                  <span className="text-xs text-muted-foreground font-mono">{w.address.slice(0, 6)}...{w.address.slice(-4)}</span>
                )}
                {w.last_checked_at && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {timeAgo(w.last_checked_at)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Open positions / Closed / Trades feed */}
      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="open">
            <TabsList className="mb-4">
              <TabsTrigger value="open" className="gap-1.5">
                <Target className="h-3.5 w-3.5" />
                Отворени ({openPositions.length})
              </TabsTrigger>
              <TabsTrigger value="closed" className="gap-1.5">
                <BarChart3 className="h-3.5 w-3.5" />
                Затворени ({closedPositions.length})
              </TabsTrigger>
              <TabsTrigger value="feed" className="gap-1.5">
                <Activity className="h-3.5 w-3.5" />
                Trade Feed ({recentTrades.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="open">
              <PositionsTable positions={openPositions} showPnl={true} />
            </TabsContent>

            <TabsContent value="closed">
              <PositionsTable positions={closedPositions} showPnl={true} />
            </TabsContent>

            <TabsContent value="feed">
              <TradesFeed trades={recentTrades} wallets={wallets} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
