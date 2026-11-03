import { z } from 'zod';

import type { NewTrade } from '@/db/schema';
import { tradesRepo } from '@/db/trades';
import { importTable } from '@/lib/export';

// Импорт сделок из CSV / Excel. Колонки (регистр не важен): symbol, side
// (buy/sell или купить/продать), price, qty, fee (необязательно),
// time (необязательно, ISO или «2026-11-04 12:30»). Запятая в числах допустима.

const num = z
  .string()
  .transform((s) => s.replace(/\s/g, '').replace(',', '.'))
  .refine((s) => s !== '' && !Number.isNaN(Number(s)), 'number');

const row = z.object({
  symbol: z
    .string()
    .trim()
    .min(1)
    .transform((s) => s.toUpperCase().replace(/[^A-Z0-9]/g, '')),
  side: z
    .string()
    .trim()
    .toLowerCase()
    .transform(
      (s) => (['buy', 'купить', 'покупка', 'b'].includes(s) ? 'buy' : 'sell') as 'buy' | 'sell'
    ),
  price: num,
  qty: num,
  fee: num.optional().default('0'),
  time: z.string().optional(),
});

/** Разобрать строки таблицы в сделки. Неверная строка — ошибка с её номером. */
export function parseTrades(rows: Record<string, string>[]): NewTrade[] {
  return rows.map((raw, i) => {
    const lower = Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k.trim().toLowerCase(), v])
    );
    const parsed = row.safeParse(lower);
    if (!parsed.success) throw new Error(`row ${i + 2}`);
    const t = parsed.data;
    const date = t.time ? new Date(t.time.replace(' ', 'T')) : new Date();
    return {
      symbol: t.symbol,
      side: t.side,
      price: t.price,
      qty: t.qty,
      fee: t.fee,
      createdAt: Number.isNaN(+date) ? new Date() : date,
    };
  });
}

/** Выбрать файл, разобрать и сохранить. null — пользователь отменил. */
export async function importTrades() {
  const rows = await importTable();
  if (!rows) return null;
  const list = parseTrades(rows);
  await tradesRepo.addMany(list);
  return list.length;
}
