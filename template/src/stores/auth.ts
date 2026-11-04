import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { secureStorage } from '@/lib/storage';

// Вход. Здесь — демо без сервера: подходит любая почта и пароль от 8 символов,
// код по SMS — 123456, кнопки Google / Apple / Яндекс / VK входят сразу.
// При создании проекта с --backend=server этот файл заменяется на вход через
// свой сервер (Better Auth), с --backend=supabase — на Supabase Auth.
// Интерфейс одинаковый, экраны не меняются.

export type User = { id: string; email: string; name: string; phone?: string };

/** Внешние способы входа. Кнопки показываются только для включённых. */
export type Provider = 'google' | 'apple' | 'yandex' | 'vk';

export type AuthMethods = { email: boolean; phone: boolean } & Record<Provider, boolean>;

export type AuthState = {
  /** Откуда вход: экран входа показывает подсказки только для демо. */
  mode: 'demo' | 'server' | 'supabase';
  token: string | null;
  user: User | null;
  /** Какие способы входа доступны (у сервера — по ключам в его .env). */
  methods: () => Promise<AuthMethods>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  /** Отправить код по SMS. Номер — в международном формате: +79991234567. */
  sendPhoneCode: (phone: string) => Promise<void>;
  /** Проверить код; первый вход по номеру создаёт аккаунт. */
  verifyPhoneCode: (phone: string, code: string) => Promise<void>;
  /** Вход через Google, Apple, Яндекс ID или VK ID. */
  signInWith: (provider: Provider) => Promise<void>;
  signOut: () => Promise<void>;
  /** Удаление аккаунта — обязательно в App Store и Google Play, если есть регистрация. */
  deleteAccount: () => Promise<void>;
};

export const DEMO_SMS_CODE = '123456';

const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 600));
const demoUser = (email: string, extra: Partial<User> = {}): User => ({
  id: email,
  email,
  name: email.split('@')[0] ?? email,
  ...extra,
});
const PROVIDER_NAMES: Record<Provider, string> = {
  google: 'Google',
  apple: 'Apple',
  yandex: 'Яндекс',
  vk: 'VK',
};

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      mode: 'demo',
      token: null,
      user: null,
      methods: async () => ({
        email: true,
        phone: true,
        google: true,
        apple: true,
        yandex: true,
        vk: true,
      }),
      signIn: async (email) => {
        await wait();
        set({ token: `demo-${Date.now()}`, user: demoUser(email) });
      },
      signUp: async (email) => {
        await wait();
        set({ token: `demo-${Date.now()}`, user: demoUser(email) });
      },
      sendPhoneCode: async () => {
        await wait();
      },
      verifyPhoneCode: async (phone, code) => {
        await wait();
        if (code !== DEMO_SMS_CODE) throw new Error('неверный код');
        set({ token: `demo-${Date.now()}`, user: { id: phone, email: '', name: phone, phone } });
      },
      signInWith: async (provider) => {
        await wait();
        const name = PROVIDER_NAMES[provider];
        set({ token: `demo-${Date.now()}`, user: demoUser(`${provider}@example.com`, { name }) });
      },
      signOut: async () => {
        set({ token: null, user: null });
      },
      deleteAccount: async () => {
        await wait();
        set({ token: null, user: null });
      },
    }),
    {
      name: 'auth',
      storage: secureStorage,
      partialize: ({ token, user }) => ({ token, user }),
    }
  )
);
