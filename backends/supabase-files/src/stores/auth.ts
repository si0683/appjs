import type { User as SupabaseUser } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { create } from 'zustand';

import { supabase } from '@/lib/supabase';

// Вход через Supabase Auth: почта и пароль, телефон (SMS), Google, Apple.
// Включаются в панели Supabase → Authentication → Providers, а в приложении —
// списком EXPO_PUBLIC_AUTH_METHODS в .env (например: email,phone,google,apple).
// Яндекс ID и VK ID в Supabase не встроены — для них --backend=server.

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

const enabled = new Set(
  (process.env.EXPO_PUBLIC_AUTH_METHODS ?? 'email').split(',').map((s: string) => s.trim())
);

const toUser = (u: SupabaseUser): User => ({
  id: u.id,
  email: u.email ?? '',
  name:
    (u.user_metadata?.full_name as string | undefined) ??
    (u.user_metadata?.name as string | undefined) ??
    u.email?.split('@')[0] ??
    u.phone ??
    '',
  phone: u.phone || undefined,
});

// Адрес возврата из браузера: добавьте его в Supabase → Authentication →
// URL Configuration → Redirect URLs (например, myapp://auth-callback)
const redirectTo = Linking.createURL('auth-callback');

export const useAuth = create<AuthState>()(() => ({
  mode: 'supabase',
  token: null,
  user: null,
  methods: async () => ({
    email: enabled.has('email'),
    phone: enabled.has('phone'),
    google: enabled.has('google'),
    apple: enabled.has('apple'),
    yandex: false,
    vk: false,
  }),
  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },
  signUp: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    // Если в Supabase включено подтверждение почты, сессии ещё нет
    if (!data.session) throw new Error('Подтвердите почту — письмо уже отправлено');
  },
  sendPhoneCode: async (phone) => {
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) throw error;
  },
  verifyPhoneCode: async (phone, token) => {
    const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
    if (error) throw error;
  },
  signInWith: async (provider) => {
    if (provider === 'yandex' || provider === 'vk') {
      throw new Error('Supabase не поддерживает этот вход — нужен --backend=server');
    }
    if (provider === 'apple' && Platform.OS === 'ios') {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error('Apple не вернул токен');
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      if (error) throw error;
      return;
    }
    // Страница провайдера в браузере → возврат по redirectTo с кодом (PKCE)
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success') return;
    const code = new URL(result.url).searchParams.get('code');
    if (!code) throw new Error('Вход прерван');
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) throw exchangeError;
  },
  signOut: async () => {
    await supabase.auth.signOut();
  },
  deleteAccount: async () => {
    // Удаляет функция на сервере Supabase (supabase/functions/delete-account):
    // удалить пользователя может только ключ service_role, которого нет в приложении
    const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
    if (error) throw error;
    await supabase.auth.signOut();
  },
}));

// Состояние входа следует за Supabase: вход, выход, обновление токена
supabase.auth.onAuthStateChange((_event, session) => {
  useAuth.setState({
    user: session?.user ? toUser(session.user) : null,
    token: session?.access_token ?? null,
  });
});
