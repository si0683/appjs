import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { authClient } from '@/lib/auth-client';
import { secureStorage } from '@/lib/storage';

// Вход через свой сервер (server/, Better Auth): почта + пароль, сессия
// на сервере в PostgreSQL. Интерфейс тот же, что у демо — экраны не меняются.

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

type AuthUser = { id: string; email: string; name: string };
const toUser = (u: AuthUser): User => ({ id: u.id, email: u.email, name: u.name || u.email });

function fail(error: { message?: string; statusText?: string } | null) {
  if (error) throw new Error(error.message ?? error.statusText ?? 'auth error');
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      mode: 'server',
      token: null,
      user: null,
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
void authClient.getSession().then(({ data }) => {
  if (data?.user) useAuth.setState({ user: toUser(data.user) });
  else if (data === null) useAuth.setState({ user: null, token: null });
});
