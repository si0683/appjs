import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { APP } from '@/config/app';
import { authClient } from '@/lib/auth-client';
import { secureStorage } from '@/lib/storage';

// Вход через свой сервер (server/, Better Auth): почта и пароль, телефон с кодом
// по SMS, Google, Apple, Яндекс ID, VK ID. Какие способы включены — решает сервер
// по ключам в server/.env (GET /api/auth-methods). Интерфейс тот же, что у демо.

export type User = { id: string; email: string; name: string; phone?: string };
export type Provider = 'google' | 'apple' | 'yandex' | 'vk';
export type AuthMethods = { email: boolean; phone: boolean } & Record<Provider, boolean>;

export type AuthState = {
  mode: 'demo' | 'server' | 'supabase';
  token: string | null;
  user: User | null;
  methods: () => Promise<AuthMethods>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  sendPhoneCode: (phone: string) => Promise<void>;
  verifyPhoneCode: (phone: string, code: string) => Promise<void>;
  signInWith: (provider: Provider) => Promise<void>;
  signOut: () => Promise<void>;
  /** Удаление аккаунта — обязательно в App Store и Google Play, если есть регистрация. */
  deleteAccount: () => Promise<void>;
};

export const DEMO_SMS_CODE = '';

type AuthUser = { id: string; email: string; name: string; phoneNumber?: string | null };
const toUser = (u: AuthUser): User => ({
  id: u.id,
  // Аккаунт по телефону получает служебную почту — её не показываем
  email: u.email.endsWith('@phone.invalid') ? '' : u.email,
  name: u.name || u.email,
  phone: u.phoneNumber ?? undefined,
});

function fail(error: { message?: string; statusText?: string } | null) {
  if (error) throw new Error(error.message ?? error.statusText ?? 'auth error');
}

async function loadSession() {
  const { data } = await authClient.getSession();
  if (data?.user) useAuth.setState({ user: toUser(data.user as AuthUser), token: data.session.token });
  else useAuth.setState({ user: null, token: null });
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      mode: 'server',
      token: null,
      user: null,
      methods: async () => {
        const res = await fetch(`${APP.apiUrl}/api/auth-methods`);
        if (!res.ok) throw new Error(`server ${res.status}`);
        return (await res.json()) as AuthMethods;
      },
      signIn: async (email, password) => {
        const { data, error } = await authClient.signIn.email({ email, password });
        fail(error);
        set({ user: toUser(data!.user), token: data!.token ?? null });
      },
      signUp: async (email, password) => {
        const { data, error } = await authClient.signUp.email({
          email,
          password,
          name: email.split('@')[0] ?? email,
        });
        fail(error);
        set({ user: toUser(data!.user), token: data!.token ?? null });
      },
      sendPhoneCode: async (phoneNumber) => {
        const { error } = await authClient.phoneNumber.sendOtp({ phoneNumber });
        fail(error);
      },
      verifyPhoneCode: async (phoneNumber, code) => {
        const { error } = await authClient.phoneNumber.verify({ phoneNumber, code });
        fail(error);
        await loadSession();
      },
      signInWith: async (provider) => {
        if (provider === 'apple' && Platform.OS === 'ios') {
          // iOS: нативное окно Apple, сервер проверяет выданный Apple токен
          const credential = await AppleAuthentication.signInAsync({
            requestedScopes: [
              AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
              AppleAuthentication.AppleAuthenticationScope.EMAIL,
            ],
          });
          if (!credential.identityToken) throw new Error('Apple не вернул токен');
          const { error } = await authClient.signIn.social({
            provider: 'apple',
            idToken: { token: credential.identityToken },
          });
          fail(error);
        } else {
          // Остальные: страница провайдера в браузере → возврат в приложение
          // по схеме из app.json (её должен знать server/.env → TRUSTED_ORIGINS)
          const { error } = await authClient.signIn.social({ provider, callbackURL: '/' });
          fail(error);
        }
        await loadSession();
      },
      signOut: async () => {
        await authClient.signOut();
        set({ user: null, token: null });
      },
      deleteAccount: async () => {
        const { error } = await authClient.deleteUser();
        fail(error);
        set({ user: null, token: null });
      },
    }),
    {
      name: 'auth',
      storage: secureStorage,
      partialize: ({ token, user }) => ({ token, user }),
    }
  )
);

// При запуске сверяем сессию с сервером: истекла или удалена — выходим
void loadSession().catch(() => undefined);
