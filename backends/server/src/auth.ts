import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { bearer } from 'better-auth/plugins';
import { expo } from '@better-auth/expo';

import { db } from './db/client.js';
import * as schema from './db/schema.js';
import { env } from './env.js';

// Вход и аккаунты — Better Auth: почта + пароль, сессии в PostgreSQL,
// мобильное приложение хранит токен в Keychain/Keystore (@better-auth/expo).
// Удаление аккаунта включено — его требуют App Store и Google Play.
// Вход через Google / Apple / VK — socialProviders (см. README сервера).
export const auth = betterAuth({
  baseURL: env.PUBLIC_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
  user: { deleteUser: { enabled: true } },
  trustedOrigins: env.TRUSTED_ORIGINS,
  plugins: [expo(), bearer()],
  rateLimit: { enabled: true, window: 60, max: 30 },
});

export type Session = typeof auth.$Infer.Session;
