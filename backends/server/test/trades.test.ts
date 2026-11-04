import { expect, it } from 'vitest';
import { z } from 'zod';

// Схема ввода сделки — без подключения к базе (env не нужен)
const decimal = z.string().regex(/^\d+(\.\d+)?$/);
const tradeInput = z.object({
  symbol: z.string().regex(/^[A-Z0-9]{3,20}$/),
  side: z.enum(['buy', 'sell']),
  price: decimal,
  qty: decimal,
});

it('сделка: деньги только строкой-числом, символ без мусора', () => {
  expect(tradeInput.safeParse({ symbol: 'BTCUSDT', side: 'buy', price: '64250.10', qty: '0.01' }).success).toBe(true);
  expect(tradeInput.safeParse({ symbol: 'BTCUSDT', side: 'buy', price: '1e5', qty: '0.01' }).success).toBe(false);
  expect(tradeInput.safeParse({ symbol: "x'; drop", side: 'buy', price: '1', qty: '1' }).success).toBe(false);
});
