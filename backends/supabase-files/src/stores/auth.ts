import type { User as SupabaseUser } from '@supabase/supabase-js';
import { create } from 'zustand';

import { supabase } from '@/lib/supabase';

// Вход через Supabase Auth: почта + пароль (Google, Apple, VK — в панели
// Supabase → Authentication → Providers). Сессию хранит сам Supabase.
// Интерфейс тот же, что у демо — экраны не меняются.

export type User = { id: string; email: string; name: string };

export type AuthState = {
  mode: 'demo' | 'server' | 'supabase';
  token: string | null;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Удаление аккаунта — обязательно в App Store и Google Play, если есть регистрация. */
  deleteAccount: () => Promise<void>;
};

const toUser = (u: SupabaseUser): User => ({
  id: u.id,
  email: u.email ?? '',
  name: (u.user_metadata?.name as string | undefined) ?? u.email?.split('@')[0] ?? '',
});

export const useAuth = create<AuthState>()(() => ({
  mode: 'supabase',
  token: null,
  user: null,
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
