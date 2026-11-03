import { D, Decimal, type Num } from '@/lib/decimal';
import type { Trade } from '@/lib/finance';

// Статистика сделок — перенос из OsEngine (github.com/AlexWan/OsEngine,
// OsEngine/Journal/Internal/DealStatisticGenerator.cs). Формулы и порядок
// показателей те же, что в журнале OsEngine, считаются через Decimal, как
// decimal в C#. Где у OsEngine есть особенности расчёта — они сохранены и
// подписаны, чтобы цифры совпадали с терминалом.

/** Закрытая сделка (позиция) — аналог Position из OsEngine. */
export type Deal = {
  symbol: string;
  side: 'buy' | 'sell';
  entryPrice: string;
  closePrice: string;
  qty: string;
  /** P&L сделки после комиссий (ProfitOperationAbs / ProfitPortfolioAbs). */
  profitAbs: string;
  /** Капитал счёта в момент открытия (PortfolioValueOnOpenPosition). */
  portfolioValueOnOpen: string;
  commission: string;
  timeOpen: Date;
  timeClose: Date;
};

const r6 = (d: Decimal) => d.toDecimalPlaces(6);

/** % движения цены за сделку (ProfitOperationPercent). */
const operationPercent = (d: Deal) => {
  const v = D(d.closePrice).div(d.entryPrice).mul(100).minus(100);
  return d.side === 'buy' ? v : v.neg();
};
/** % прибыли к капиталу на открытии (ProfitPortfolioPercent). */
const portfolioPercent = (d: Deal) =>
  D(d.portfolioValueOnOpen).isZero() ? D(0) : D(d.profitAbs).div(d.portfolioValueOnOpen).mul(100);

/** Чистая прибыль (GetAllProfitInAbsolute). */
export const netProfit = (deals: Deal[]) => r6(deals.reduce((s, d) => s.plus(d.profitAbs), D(0)));

/** Чистая прибыль в % от капитала на первой сделке (GetAllProfitPercent). */
export function netProfitPercent(deals: Deal[]) {
  const start = D(
    deals.find((d) => !D(d.portfolioValueOnOpen).isZero())?.portfolioValueOnOpen ?? 0
  );
  if (start.isZero()) return D(0);
  return start.plus(netProfit(deals)).div(start).mul(100).minus(100);
}

const avg = (values: Decimal[]) =>
  values.length ? values.reduce((s, v) => s.plus(v), D(0)).div(values.length) : D(0);

/**
 * Коэффициент Шарпа как в OsEngine (GetSharpRatio):
 * (доходность за всё время, % − безрисковая за тот же срок, %) / SD,
 * где SD — разброс P&L сделок, делённый на 100. Безрисковая ставка — 7 % годовых.
 * Особенности OsEngine сохранены: нулевые P&L не входят в сумму квадратов,
 * но делитель — число всех сделок.
 */
export function sharpeOsEngine(deals: Deal[], riskFreePerYear = 7) {
  if (deals.length === 0) return D(0);
  const returns = deals.map((d) => D(d.profitAbs));
  const ahpr = netProfitPercent(deals);
  const first = Math.min(...deals.map((d) => +d.timeOpen));
  const last = Math.max(...deals.map((d) => +d.timeClose));
  const days = Math.floor((last - first) / 86_400_000);
  const rfr = D(days).div(365).mul(riskFreePerYear);
  if (returns.length < 2) return D(0);
  const mean = avg(returns);
  const sum = returns
    .filter((v) => !v.isZero())
    .reduce((s, v) => s.plus(v.minus(mean).pow(2)), D(0));
  const sd = sum.div(returns.length).sqrt().div(100).toDecimalPlaces(5);
  if (sd.isZero()) return D(0);
  return ahpr.minus(rfr).div(sd).toDecimalPlaces(4);
}

const series = (deals: Deal[], win: boolean) => {
  let max = 0;
  let now = 0;
  for (const d of deals) {
    const ok = win ? D(d.profitAbs).gt(0) : D(d.profitAbs).lte(0);
    now = ok ? now + 1 : 0;
    max = Math.max(max, now);
  }
  return max;
};

/**
 * Максимальная просадка в % по кривой капитала из сделок (GetMaxDownPercent):
 * идём по сделкам, копим капитал от стартового, считаем падение от пика.
 */
export function maxDrawdownPercent(deals: Deal[]) {
  if (!deals.some((d) => D(d.profitAbs).gt(0))) return D(0);
  let first = D(deals.find((d) => !D(d.portfolioValueOnOpen).isZero())?.portfolioValueOnOpen ?? 1);
  if (first.isZero()) first = D(1);
  let sum = first;
  let peak = first;
  let maxDownAbs: Decimal | null = null;
  let maxDownPct: Decimal | null = null;
  for (const d of deals) {
    sum = sum.plus(d.profitAbs);
    if (sum.gt(peak)) {
      peak = sum;
      continue;
    }
    if (sum.isZero()) continue; // как в OsEngine: ровно ноль не учитывается
    const down = sum.minus(peak);
    if (maxDownAbs === null || down.lt(maxDownAbs)) {
      maxDownAbs = down;
      const pct = down.div(peak.div(100));
      if (maxDownPct === null || pct.lt(maxDownPct)) maxDownPct = pct;
    }
  }
  return maxDownPct ? r6(maxDownPct) : D(0);
}

/** Фактор восстановления: чистая прибыль / максимальная просадка в деньгах (GetRecovery). */
export function recoveryFactor(deals: Deal[]) {
  if (!deals.some((d) => D(d.profitAbs).gt(0))) return D(0);
  let first = D(deals.find((d) => !D(d.portfolioValueOnOpen).isZero())?.portfolioValueOnOpen ?? 1);
  if (first.isZero()) first = D(1);
  let sum = first;
  let peak = first;
  let maxDown: Decimal | null = null;
  for (const d of deals) {
    sum = sum.plus(d.profitAbs);
    if (sum.gt(peak)) peak = sum;
    else if (!sum.isZero()) {
      const down = sum.minus(peak);
      if (maxDown === null || down.lt(maxDown)) maxDown = down;
    }
  }
  const profit = netProfit(deals);
  return maxDown && !maxDown.isZero() && !profit.isZero() ? r6(profit.div(maxDown.abs())) : D(0);
}

/** Профит-фактор: сумма прибылей / |сумма убытков| (GetProfitFactor). */
export function profitFactor(deals: Deal[]) {
  let win = D(0);
  let loss = D(0);
  for (const d of deals) {
    if (D(d.profitAbs).lt(0)) loss = loss.plus(d.profitAbs);
    else win = win.plus(d.profitAbs);
  }
  return !loss.isZero() && !win.isZero() ? r6(win.div(loss).abs()) : D(0);
}

/** Payoff ratio: средняя прибыль / средний убыток (GetPayOffRatio). */
export function payoffRatio(deals: Deal[]) {
  const wins = deals.filter((d) => D(d.profitAbs).gt(0)).map((d) => D(d.profitAbs));
  const losses = deals.filter((d) => D(d.profitAbs).lte(0)).map((d) => D(d.profitAbs));
  if (!wins.length || !losses.length) return D(0);
  const l = avg(losses).abs();
  return l.isZero() ? D(0) : avg(wins).abs().div(l);
}

/** Среднее время в позиции, мс (GetAverageTimeOnPoses). */
export const averageHoldMs = (deals: Deal[]) =>
  deals.length ? deals.reduce((s, d) => s + (+d.timeClose - +d.timeOpen), 0) / deals.length : 0;

/**
 * Полный отчёт в порядке журнала OsEngine (GetStatisticNew).
 * Ключи — для переводов, значения — Decimal / число.
 */
export function dealReport(deals: Deal[]) {
  const sorted = [...deals].sort((a, b) => +a.timeOpen - +b.timeOpen);
  const wins = sorted.filter((d) => D(d.profitAbs).gt(0));
  const losses = sorted.filter((d) => D(d.profitAbs).lte(0));
  const pct = (n: number) => (sorted.length ? D(n).div(sorted.length).mul(100) : D(0));
  const side = (list: Deal[]) => ({
    count: list.length,
    percent: pct(list.length),
    avgProfit: r6(avg(list.map((d) => D(d.profitAbs)))),
    avgProfitPercent: avg(list.map(operationPercent)),
    avgPortfolioPercent: avg(list.map(portfolioPercent)),
  });
  return {
    netProfit: netProfit(sorted),
    netProfitPercent: netProfitPercent(sorted),
    deals: sorted.length,
    averageHoldMs: averageHoldMs(sorted),
    sharpe: sharpeOsEngine(sorted),
    profitFactor: profitFactor(sorted),
    recovery: recoveryFactor(sorted),
    payoff: payoffRatio(sorted),
    avgProfit: r6(avg(sorted.map((d) => D(d.profitAbs)))),
    avgProfitPercent: avg(sorted.map(operationPercent)),
    avgPortfolioPercent: avg(sorted.map(portfolioPercent)),
    wins: { ...side(wins), maxSeries: series(sorted, true) },
    losses: { ...side(losses), maxSeries: series(sorted, false) },
    maxDrawdownPercent: maxDrawdownPercent(sorted),
    commission: r6(sorted.reduce((s, d) => s.plus(d.commission), D(0))),
  };
}

export type DealReport = ReturnType<typeof dealReport>;

/**
 * Сделки → закрытые позиции. Позиция открывается первой покупкой и
 * закрывается продажей (частичная продажа — отдельная сделка на свою часть).
 * Комиссия покупки делится пропорционально проданному количеству.
 */
export function dealsFromTrades(trades: Trade[], startCapital: Num): Deal[] {
  const sorted = [...trades].sort((a, b) => +a.createdAt - +b.createdAt);
  const open: Record<string, { qty: Decimal; avg: Decimal; fee: Decimal; since: Date }> = {};
  let equity = D(startCapital);
  const deals: Deal[] = [];
  for (const t of sorted) {
    const qty = D(t.qty);
    const p = open[t.symbol];
    if (t.side === 'buy') {
      if (!p || p.qty.isZero()) {
        open[t.symbol] = { qty, avg: D(t.price), fee: D(t.fee), since: t.createdAt };
      } else {
        const total = p.qty.plus(qty);
        p.avg = p.qty.mul(p.avg).plus(qty.mul(t.price)).div(total);
        p.qty = total;
        p.fee = p.fee.plus(t.fee);
      }
      continue;
    }
    if (!p || p.qty.isZero()) continue;
    const q = Decimal.min(qty, p.qty);
    const buyFee = p.fee.mul(q).div(p.qty);
    const commission = buyFee.plus(t.fee);
    const profit = D(t.price).minus(p.avg).mul(q).minus(commission);
    deals.push({
      symbol: t.symbol,
      side: 'buy',
      entryPrice: p.avg.toString(),
      closePrice: t.price,
      qty: q.toString(),
      profitAbs: profit.toString(),
      portfolioValueOnOpen: equity.toString(),
      commission: commission.toString(),
      timeOpen: p.since,
      timeClose: t.createdAt,
    });
    equity = equity.plus(profit);
    p.fee = p.fee.minus(buyFee);
    p.qty = p.qty.minus(q);
  }
  return deals;
}
