import { describe, expect, it } from '@jest/globals';

import {
  dealReport,
  dealsFromTrades,
  maxDrawdownPercent,
  profitFactor,
  type Deal,
} from '@/lib/deal-stats';
import { D, formatPercent, percentChange, roundToStep } from '@/lib/decimal';
import { toCsv } from '@/lib/export';
import {
  cagr,
  equityByDay,
  maxDrawdown,
  positionSize,
  positionsFromTrades,
  realizedEvents,
  sharpe,
  type Trade,
} from '@/lib/finance';
import { parseTrades } from '@/features/portfolio/import';

const day = (n: number) => new Date(Date.UTC(2026, 0, 1 + n));

describe('decimal', () => {
  it('0.1 + 0.2 = 0.3 ровно', () => {
    expect(D('0.1').plus('0.2').toString()).toBe('0.3');
  });
  it('округление до лота вниз', () => {
    expect(roundToStep('0.123456', '0.001').toString()).toBe('0.123');
    expect(roundToStep('64250.127', '0.01', 'nearest').toString()).toBe('64250.13');
  });
  it('процент изменения и формат', () => {
    expect(percentChange(100, 112.5).toString()).toBe('12.5');
    expect(formatPercent('2.5', 2, 'en-US')).toBe('+2.50 %');
  });
});

describe('финансы', () => {
  const trades: Trade[] = [
    { symbol: 'BTCUSDT', side: 'buy', price: '100', qty: '1', fee: '0', createdAt: day(0) },
    { symbol: 'BTCUSDT', side: 'buy', price: '200', qty: '1', fee: '0', createdAt: day(1) },
    { symbol: 'BTCUSDT', side: 'sell', price: '180', qty: '1', fee: '1', createdAt: day(2) },
  ];

  it('средняя цена и зафиксированная прибыль', () => {
    const p = positionsFromTrades(trades).BTCUSDT;
    expect(p.avgPrice).toBe('150');
    expect(p.qty).toBe('1');
    expect(p.realized).toBe('29'); // (180 − 150) × 1 − 1
    expect(realizedEvents(trades).filter((e) => e.kind === 'close')[0].pnl).toBe(29);
  });

  it('кривая капитала по дням', () => {
    const curve = equityByDay(1000, realizedEvents(trades), +day(4));
    expect(curve.at(-1)?.equity).toBe(1029);
    expect(curve).toHaveLength(3); // кривая начинается с первой зафиксированной прибыли (день 2)
  });

  it('просадка, CAGR, Шарп', () => {
    expect(maxDrawdown([100, 120, 90, 130]).value).toBeCloseTo(0.25);
    expect(cagr(100, 121, 730)).toBeCloseTo(0.1, 5);
    expect(sharpe([0.01, 0.01, 0.01])).toBe(0);
  });

  it('размер позиции по риску', () => {
    const r = positionSize({ capital: 10000, riskPercent: 1, entry: 100, stop: 95, lotStep: '1' });
    expect(r.qty.toString()).toBe('20');
    expect(r.riskMoney.toString()).toBe('100');
  });
});

describe('статистика как в OsEngine', () => {
  const deal = (profit: string, value: string, n: number): Deal => ({
    symbol: 'X',
    side: 'buy',
    entryPrice: '100',
    closePrice: '110',
    qty: '1',
    profitAbs: profit,
    portfolioValueOnOpen: value,
    commission: '0',
    timeOpen: day(n),
    timeClose: day(n + 1),
  });
  const deals = [deal('100', '1000', 0), deal('-50', '1100', 2), deal('150', '1050', 4)];

  it('чистая прибыль, профит-фактор, серии', () => {
    const r = dealReport(deals);
    expect(r.netProfit.toString()).toBe('200');
    expect(r.netProfitPercent.toString()).toBe('20');
    expect(profitFactor(deals).toString()).toBe('5');
    expect(r.wins.count).toBe(2);
    expect(r.losses.maxSeries).toBe(1);
  });

  it('максимальная просадка в %', () => {
    // 1000 → 1100 (пик) → 1050: −50 / 11 = −4.545454…
    expect(maxDrawdownPercent(deals).toNumber()).toBeCloseTo(-4.545454, 5);
  });

  it('сделки из ордеров: частичная продажа делит комиссию', () => {
    const d = dealsFromTrades(
      [
        { symbol: 'A', side: 'buy', price: '10', qty: '10', fee: '2', createdAt: day(0) },
        { symbol: 'A', side: 'sell', price: '12', qty: '5', fee: '1', createdAt: day(1) },
      ],
      1000
    );
    expect(d).toHaveLength(1);
    expect(d[0].commission).toBe('2'); // 1 (половина покупки) + 1
    expect(d[0].profitAbs).toBe('8'); // (12 − 10) × 5 − 2
  });
});

describe('импорт и экспорт', () => {
  it('CSV с BOM и разделителем ;', () => {
    const csv = toCsv(
      [{ a: 'x', b: 1.5 }],
      [
        { title: 'A', value: (r) => r.a },
        { title: 'B', value: (r) => r.b, numeric: true },
      ]
    );
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.slice(1).split(/\r?\n/)).toEqual(['A;B', 'x;1.5']);
  });

  it('разбор сделок: русские стороны и запятая в числах', () => {
    const [t] = parseTrades([
      { Symbol: 'btc/usdt', Side: 'Купить', Price: '64 250,5', Qty: '0,01' },
    ]);
    expect(t).toMatchObject({
      symbol: 'BTCUSDT',
      side: 'buy',
      price: '64250.5',
      qty: '0.01',
      fee: '0',
    });
  });

  it('неверная строка — ошибка с номером', () => {
    expect(() => parseTrades([{ symbol: 'X', side: 'buy', price: 'abc', qty: '1' }])).toThrow(
      'row 2'
    );
  });
});
