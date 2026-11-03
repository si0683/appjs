import { count, desc, eq, gt } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { D, roundToStep } from '@/lib/decimal';

import { getDb } from './client';
import { trades, type NewTrade } from './schema';

// Сделки: бумажная торговля из экрана инструмента + импорт из файлов.

export function useTrades() {
  return useLiveQuery(
    getDb().select().from(trades).orderBy(desc(trades.createdAt), desc(trades.id))
  );
}

export const tradesRepo = {
  add: async (t: NewTrade) => {
    await getDb().insert(trades).values(t);
  },
  addMany: async (list: NewTrade[]) => {
    if (list.length) await getDb().insert(trades).values(list);
  },
  remove: async (id: number) => {
    await getDb().delete(trades).where(eq(trades.id, id));
  },
  clear: async () => {
    // Условие обязательно: DELETE без WHERE SQLite выполняет «быстрой очисткой»
    // без уведомлений об изменениях — useLiveQuery не узнал бы об удалении.
    await getDb().delete(trades).where(gt(trades.id, 0));
  },
  async count() {
    const [row] = await getDb().select({ n: count() }).from(trades);
    return row?.n ?? 0;
  },
};

/** Демо-журнал: ~70 сделок за полгода, чтобы портфель и графики были не пустыми. */
export async function seedDemoTrades() {
  if ((await tradesRepo.count()) > 0) return;
  let seed = 42;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const assets = [
    { symbol: 'BTCUSDT', price: 52000, step: '0.0001' },
    { symbol: 'ETHUSDT', price: 2600, step: '0.001' },
    { symbol: 'SOLUSDT', price: 120, step: '0.01' },
  ];
  const DAY = 86_400_000;
  const start = Date.now() - 180 * DAY;
  const list: NewTrade[] = [];
  for (let i = 0; i < 34; i++) {
    const a = assets[Math.floor(rnd() * assets.length)];
    a.price *= 1 + (rnd() - 0.45) * 0.08;
    const t0 = start + i * 5 * DAY + rnd() * DAY;
    const qty = roundToStep(D(1500 + rnd() * 1500).div(a.price), a.step).toString();
    const buy = D(a.price).toDecimalPlaces(2);
    const sell = buy.mul(1 + (rnd() - 0.42) * 0.12).toDecimalPlaces(2);
    const fee = (p: ReturnType<typeof D>) => p.mul(qty).mul('0.001').toDecimalPlaces(4).toString();
    list.push({
      symbol: a.symbol,
      side: 'buy',
      price: buy.toString(),
      qty,
      fee: fee(buy),
      createdAt: new Date(t0),
    });
    list.push({
      symbol: a.symbol,
      side: 'sell',
      price: sell.toString(),
      qty,
      fee: fee(sell),
      createdAt: new Date(t0 + (1 + rnd() * 3) * DAY),
    });
  }
  // Открытые позиции — для доли активов и нереализованной прибыли
  list.push({
    symbol: 'BTCUSDT',
    side: 'buy',
    price: '61250.50',
    qty: '0.0400',
    fee: '2.45',
    createdAt: new Date(Date.now() - 6 * DAY),
  });
  list.push({
    symbol: 'ETHUSDT',
    side: 'buy',
    price: '3080.10',
    qty: '0.650',
    fee: '2.00',
    createdAt: new Date(Date.now() - 4 * DAY),
  });
  list.push({
    symbol: 'SOLUSDT',
    side: 'buy',
    price: '142.30',
    qty: '9.00',
    fee: '1.28',
    createdAt: new Date(Date.now() - 2 * DAY),
  });
  await tradesRepo.addMany(list);
}
