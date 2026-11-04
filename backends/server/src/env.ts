import { z } from 'zod';

// Все настройки — из переменных окружения, проверяются при старте:
// неверный DATABASE_URL лучше увидеть сразу, а не на первом запросе.
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(8080),
  PUBLIC_URL: z.url().default('http://localhost:8080'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET — минимум 32 символа'),
  TRUSTED_ORIGINS: z
    .string()
    .default('appjs://')
    .transform((s) => s.split(',').map((x) => x.trim()).filter(Boolean)),
  MARKET_FEED: z.enum(['binance', 'off']).default('binance'),
  MARKET_SYMBOLS: z
    .string()
    .default('BTCUSDT,ETHUSDT')
    .transform((s) => s.split(',').map((x) => x.trim().toUpperCase()).filter(Boolean)),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(120),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Неверные переменные окружения:\n' + z.prettifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
