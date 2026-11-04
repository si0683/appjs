import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { secureStorage } from '@/lib/storage';

// Вход. Здесь — демо без сервера: подходит любая почта и пароль от 6 символов.
// При создании проекта с --backend=server этот файл заменяется на вход через
// свой сервер (Better Auth), с --backend=supabase — на Supabase Auth.
// Интерфейс одинаковый, экраны не меняются.

export type User = { id: string; email: string; name: string };

export type AuthState = {
  /** Откуда вход: экран входа показывает подсказку только для демо. */
  mode: 'demo' | 'server' | 'supabase';
  token: string | null;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Удаление аккаунта — обязательно в App Store и Google Play, если есть регистрация. */
  deleteAccount: () => Promise<void>;
};

const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 600));
const demoUser = (email: string): User => ({
  id: email,
  email,
  name: email.split('@')[0] ?? email,
});

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      mode: 'demo',
      token: null,
      user: null,
      signIn: async (email) => {
        await wait();
        set({ token: `demo-${Date.now()}`, user: demoUser(email) });
      },
      signUp: async (email) => {
        await wait();
        set({ token: `demo-${Date.now()}`, user: demoUser(email) });
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
