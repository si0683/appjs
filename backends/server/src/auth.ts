import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { bearer, phoneNumber } from 'better-auth/plugins';
import { genericOAuth, yandex } from 'better-auth/plugins/generic-oauth';
import { expo } from '@better-auth/expo';

import { db } from './db/client.js';
import * as schema from './db/schema.js';
import { env } from './env.js';
import { isPhone, sendSms } from './lib/sms.js';

// Вход и аккаунты — Better Auth. Способы входа включаются ключами в .env:
//   почта + пароль — всегда;
//   телефон (код по SMS) — SMS_PROVIDER (console / smsru / twilio);
//   Google, Apple, VK ID — встроенные провайдеры; Яндекс ID — через общий OAuth.
// Как получить ключи каждого сервиса — AUTH.md. Приложение узнаёт включённые
// способы из GET /api/auth-methods и показывает только их кнопки.
// Удаление аккаунта включено — его требуют App Store и Google Play.

const google =
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET }
    : undefined;
const apple = env.APPLE_CLIENT_ID
  ? {
      clientId: env.APPLE_CLIENT_ID,
      clientSecret: env.APPLE_CLIENT_SECRET ?? '',
      // Вход нативной кнопкой в iOS: токен выдан для bundle id приложения
      appBundleIdentifier: env.APPLE_APP_BUNDLE_IDENTIFIER,
    }
  : undefined;
const vk =
  env.VK_CLIENT_ID && env.VK_CLIENT_SECRET
    ? { clientId: env.VK_CLIENT_ID, clientSecret: env.VK_CLIENT_SECRET }
    : undefined;
const yandexOn = Boolean(env.YANDEX_CLIENT_ID && env.YANDEX_CLIENT_SECRET);

/** Включённые способы входа — их показывает экран входа в приложении. */
export const authMethods = {
  email: true,
  phone: env.SMS_PROVIDER !== 'off',
  google: Boolean(google),
  apple: Boolean(apple),
  yandex: yandexOn,
  vk: Boolean(vk),
};

const options = {
  baseURL: env.PUBLIC_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
  user: { deleteUser: { enabled: true } },
  account: {
    // Один человек — один аккаунт: вход через Google с той же почтой привязывается
    // к существующему аккаунту (только для провайдеров, подтверждающих почту)
    accountLinking: { enabled: true, trustedProviders: ['google', 'apple', 'yandex'] },
  },
  socialProviders: {
    ...(google ? { google } : {}),
    ...(apple ? { apple } : {}),
    ...(vk ? { vk } : {}),
  },
  trustedOrigins: [...env.TRUSTED_ORIGINS, 'https://appleid.apple.com'],
  plugins: [
    expo(),
    bearer(),
    ...(yandexOn
      ? [
          genericOAuth({
            config: [yandex({ clientId: env.YANDEX_CLIENT_ID!, clientSecret: env.YANDEX_CLIENT_SECRET! })],
          }),
        ]
      : []),
    phoneNumber({
      otpLength: 6,
      expiresIn: 300,
      allowedAttempts: 3,
      phoneNumberValidator: (phone) => isPhone(phone),
      sendOTP: async ({ phoneNumber: phone, code }) => {
        await sendSms(phone, `Код входа: ${code}. Никому не сообщайте его.`);
      },
      // Первый вход по номеру создаёт аккаунт (почта — служебная, её можно сменить)
      signUpOnVerification: {
        getTempEmail: (phone) => `${phone.replace(/\D/g, '')}@phone.invalid`,
        getTempName: (phone) => phone,
      },
    }),
  ],
  rateLimit: {
    enabled: true,
    window: 60,
    max: 30,
    // SMS стоят денег и привлекают ботов: не больше 3 кодов в 10 минут с одного адреса
    customRules: { '/phone-number/send-otp': { window: 600, max: 3 } },
  },
} satisfies BetterAuthOptions;

export const auth = betterAuth(options);

export type Session = typeof auth.$Infer.Session;
