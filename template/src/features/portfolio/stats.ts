import type { TradeRow } from '@/db/schema';
import { dealReport, dealsFromTrades } from '@/lib/deal-stats';
import { D } from '@/lib/decimal';
import {
  cagr,
  equityByDay,
  maxDrawdown,
  monthlyReturns,
  positionsFromTrades,
  realizedEvents,
  returns,
  sharpe,
  sortino,
  tradeStats,
  unrealizedPnl,
  volatility,
} from '@/lib/finance';

// Стартовый капитал журнала. В реальном приложении — из настроек или с сервера.
export const START_CAPITAL = 10_000;
export const QUOTE = 'USDT';

/** Вся аналитика портфеля одним вызовом: из сделок и текущих цен. */
export function portfolioStats(rows: TradeRow[], prices: Record<string, string>) {
  const trades = rows.map((r) => ({ ...r, side: r.side as 'buy' | 'sell' }));
  const events = realizedEvents(trades);
  const curve = equityByDay(START_CAPITAL, events);
  const values = curve.map((p) => p.equity);
  const daily = returns(values);
  const positions = Object.values(positionsFromTrades(trades)).filter((p) => !D(p.qty).isZero());

  const holdings = positions.map((p) => {
    const price = prices[p.symbol] ?? p.avgPrice;
    const value = D(p.qty).mul(price);
    return {
      ...p,
      price,
      value: value.toString(),
      pnl: unrealizedPnl(p, price).toString(),
      pnlPercent: D(p.avgPrice).isZero()
        ? '0'
        : D(price).div(p.avgPrice).minus(1).mul(100).toString(),
    };
  });

  const realized = events.reduce((s, e) => s.plus(e.pnl), D(0));
  const unrealized = holdings.reduce((s, h) => s.plus(h.pnl), D(0));
  const invested = holdings.reduce((s, h) => s.plus(D(h.qty).mul(h.avgPrice)), D(0));
  const equity = D(START_CAPITAL).plus(realized).plus(unrealized);
  const cash = D(START_CAPITAL).plus(realized).minus(invested);
  const days = curve.length;
  const closed = tradeStats(events.filter((e) => e.kind === 'close').map((e) => e.pnl));

  // Статистика сделок как в журнале OsEngine
  const report = dealReport(dealsFromTrades(trades, START_CAPITAL));

  return {
    report,
    curve,
    monthly: monthlyReturns(curve),
    holdings,
    allocation: [
      ...holdings.map((h) => ({ label: h.symbol.replace(QUOTE, ''), value: Number(h.value) })),
      { label: QUOTE, value: Math.max(0, cash.toNumber()) },
    ],
    equity: equity.toString(),
    cash: cash.toString(),
    realized: realized.toString(),
    unrealized: unrealized.toString(),
    totalReturn: equity.div(START_CAPITAL).minus(1).toNumber(),
    cagr: values.length > 1 ? cagr(values[0], values[values.length - 1], days) : 0,
    maxDrawdown: maxDrawdown(values).value,
    volatility: volatility(daily),
    sharpe: sharpe(daily),
    sortino: sortino(daily),
    ...closed,
  };
}

export type PortfolioStats = ReturnType<typeof portfolioStats>;
