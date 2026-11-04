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
  // Способы входа: провайдер включается, когда заданы его ключи (см. AUTH.md)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  APPLE_CLIENT_ID: z.string().optional(),
  APPLE_CLIENT_SECRET: z.string().optional(),
  APPLE_APP_BUNDLE_IDENTIFIER: z.string().optional(),
  YANDEX_CLIENT_ID: z.string().optional(),
  YANDEX_CLIENT_SECRET: z.string().optional(),
  VK_CLIENT_ID: z.string().optional(),
  VK_CLIENT_SECRET: z.string().optional(),
  // Вход по телефону (код по SMS): off | console | smsru | twilio
  SMS_PROVIDER: z.enum(['off', 'console', 'smsru', 'twilio']).default('console'),
  SMS_SENDER: z.string().optional(),
  SMSRU_API_ID: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Неверные переменные окружения:\n' + z.prettifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
