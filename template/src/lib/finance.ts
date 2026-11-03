import { mean, std } from 'mathjs';

import { D, Decimal, type Num } from '@/lib/decimal';

// Финансовая математика портфеля. Вход — точные значения (строки/Decimal),
// статистика (волатильность, Шарп) считается в числах: это оценки, не деньги.

export type Trade = {
  id?: number;
  symbol: string;
  side: 'buy' | 'sell';
  price: string;
  qty: string;
  fee: string;
  createdAt: Date;
};

export type EquityPoint = { time: number; equity: number };

export type Position = { symbol: string; qty: string; avgPrice: string; realized: string };

/**
 * Позиции по сделкам методом средней цены: покупка увеличивает позицию и
 * пересчитывает среднюю, продажа фиксирует прибыль (realized) от средней цены.
 */
export function positionsFromTrades(trades: Trade[]): Record<string, Position> {
  const out: Record<string, Position> = {};
  const sorted = [...trades].sort((a, b) => +a.createdAt - +b.createdAt);
  for (const t of sorted) {
    const p = (out[t.symbol] ??= { symbol: t.symbol, qty: '0', avgPrice: '0', realized: '0' });
    const qty = D(p.qty);
    const price = D(t.price);
    const tq = D(t.qty);
    if (t.side === 'buy') {
      const newQty = qty.plus(tq);
      p.avgPrice = newQty.isZero()
        ? '0'
        : qty.mul(p.avgPrice).plus(tq.mul(price)).div(newQty).toString();
      p.qty = newQty.toString();
    } else {
      const sellQty = Decimal.min(tq, qty);
      p.realized = D(p.realized).plus(price.minus(p.avgPrice).mul(sellQty)).toString();
      p.qty = qty.minus(sellQty).toString();
      if (D(p.qty).isZero()) p.avgPrice = '0';
    }
    p.realized = D(p.realized).minus(t.fee).toString();
  }
  return out;
}

/** Каждая продажа фиксирует прибыль: { time, symbol, pnl } по средней цене покупки, за вычетом комиссий. */
export function realizedEvents(trades: Trade[]) {
  const sorted = [...trades].sort((a, b) => +a.createdAt - +b.createdAt);
  const state: Record<string, { qty: ReturnType<typeof D>; avg: ReturnType<typeof D> }> = {};
  const events: { time: number; symbol: string; pnl: number; kind: 'fee' | 'close' }[] = [];
  for (const t of sorted) {
    const s = (state[t.symbol] ??= { qty: D(0), avg: D(0) });
    const qty = D(t.qty);
    if (t.side === 'buy') {
      const total = s.qty.plus(qty);
      s.avg = total.isZero() ? D(0) : s.qty.mul(s.avg).plus(qty.mul(t.price)).div(total);
      s.qty = total;
      if (!D(t.fee).isZero())
        events.push({
          time: +t.createdAt,
          symbol: t.symbol,
          pnl: -D(t.fee).toNumber(),
          kind: 'fee',
        });
    } else {
      const q = Decimal.min(qty, s.qty);
      const pnl = D(t.price).minus(s.avg).mul(q).minus(t.fee);
      s.qty = s.qty.minus(q);
      events.push({ time: +t.createdAt, symbol: t.symbol, pnl: pnl.toNumber(), kind: 'close' });
    }
  }
  return events;
}

/** Кривая капитала по зафиксированной прибыли, по дням (пропуски заполняются прошлым значением). */
export function equityByDay(
  capital: number,
  events: { time: number; pnl: number }[],
  until = Date.now()
) {
  if (!events.length) return [] as EquityPoint[];
  const DAY = 86_400_000;
  const start = Math.floor(events[0].time / DAY) * DAY;
  const points: EquityPoint[] = [];
  let equity = capital;
  let i = 0;
  for (let day = start; day <= until; day += DAY) {
    while (i < events.length && events[i].time < day + DAY) equity += events[i++].pnl;
    points.push({ time: day, equity });
  }
  return points;
}

/** Нереализованная прибыль позиции при текущей цене. */
export const unrealizedPnl = (p: Position, price: Num) => D(price).minus(p.avgPrice).mul(p.qty);

/** Доходности между соседними точками: r_i = E_i / E_(i-1) - 1. */
export function returns(values: number[]) {
  const r: number[] = [];
  for (let i = 1; i < values.length; i++) {
    if (values[i - 1] !== 0) r.push(values[i] / values[i - 1] - 1);
  }
  return r;
}

/** Максимальная просадка в долях (0.25 = −25 %) и где она была. */
export function maxDrawdown(values: number[]) {
  let peak = -Infinity;
  let mdd = 0;
  let peakIndex = 0;
  let troughIndex = 0;
  let currentPeakIndex = 0;
  values.forEach((v, i) => {
    if (v > peak) {
      peak = v;
      currentPeakIndex = i;
    }
    const dd = peak > 0 ? (peak - v) / peak : 0;
    if (dd > mdd) {
      mdd = dd;
      peakIndex = currentPeakIndex;
      troughIndex = i;
    }
  });
  return { value: mdd, peakIndex, troughIndex };
}

/** Среднегодовая доходность (CAGR) по первому и последнему значению и числу дней. */
export function cagr(first: number, last: number, days: number) {
  if (first <= 0 || days <= 0) return 0;
  return Math.pow(last / first, 365 / days) - 1;
}

/** Годовая волатильность по дневным доходностям. */
export function volatility(dailyReturns: number[], periodsPerYear = 365) {
  if (dailyReturns.length < 2) return 0;
  return (std(dailyReturns, 'unbiased') as number) * Math.sqrt(periodsPerYear);
}

/** Коэффициент Шарпа (годовой). riskFree — годовая безрисковая ставка. */
export function sharpe(dailyReturns: number[], riskFree = 0, periodsPerYear = 365) {
  if (dailyReturns.length < 2) return 0;
  const excess = dailyReturns.map((r) => r - riskFree / periodsPerYear);
  const s = std(excess, 'unbiased') as number;
  return s === 0 ? 0 : ((mean(excess) as number) / s) * Math.sqrt(periodsPerYear);
}

/** Коэффициент Сортино: как Шарп, но штрафует только падения. */
export function sortino(dailyReturns: number[], periodsPerYear = 365) {
  const down = dailyReturns.filter((r) => r < 0);
  if (dailyReturns.length < 2 || down.length === 0) return 0;
  const dd = Math.sqrt(down.reduce((s, r) => s + r * r, 0) / dailyReturns.length);
  return dd === 0 ? 0 : ((mean(dailyReturns) as number) / dd) * Math.sqrt(periodsPerYear);
}

/** Доля прибыльных сделок и профит-фактор по списку P&L закрытых сделок. */
export function tradeStats(pnls: number[]) {
  const wins = pnls.filter((p) => p > 0);
  const losses = pnls.filter((p) => p < 0);
  const grossWin = wins.reduce((s, p) => s + p, 0);
  const grossLoss = Math.abs(losses.reduce((s, p) => s + p, 0));
  return {
    count: pnls.length,
    winRate: pnls.length ? wins.length / pnls.length : 0,
    profitFactor: grossLoss === 0 ? (grossWin > 0 ? Infinity : 0) : grossWin / grossLoss,
    avgWin: wins.length ? grossWin / wins.length : 0,
    avgLoss: losses.length ? grossLoss / losses.length : 0,
  };
}

/**
 * Размер позиции по риску: сколько купить, чтобы при стопе потерять не больше
 * risk% капитала. Результат округляется вниз до шага лота.
 */
export function positionSize(opts: {
  capital: Num;
  riskPercent: Num;
  entry: Num;
  stop: Num;
  lotStep?: Num;
}) {
  const riskMoney = D(opts.capital).mul(opts.riskPercent).div(100);
  const perUnit = D(opts.entry).minus(opts.stop).abs();
  if (perUnit.isZero()) return { qty: D(0), riskMoney, notional: D(0) };
  let qty = riskMoney.div(perUnit);
  if (opts.lotStep) qty = qty.div(opts.lotStep).floor().mul(opts.lotStep);
  return { qty, riskMoney, notional: qty.mul(opts.entry) };
}

/** Доходность по месяцам: { '2026-03': 0.042, … } из ряда equity. */
export function monthlyReturns(points: EquityPoint[]) {
  const lastByMonth = new Map<string, number>();
  for (const p of points) {
    const d = new Date(p.time);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    lastByMonth.set(key, p.equity);
  }
  const keys = [...lastByMonth.keys()];
  const firstEquity = points[0]?.equity ?? 0;
  return keys.map((key, i) => {
    const prev = i === 0 ? firstEquity : lastByMonth.get(keys[i - 1])!;
    const cur = lastByMonth.get(key)!;
    return { month: key, value: prev ? cur / prev - 1 : 0 };
  });
}
