import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { secureStorage } from '@/lib/storage';

type User = { email: string; name: string };

type AuthState = {
  token: string | null;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
};

// Демо-вход без сервера. Для настоящего входа замените тело signIn
// на запрос к своему API (см. src/lib/api.ts) и сохраните полученный токен.
export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      signIn: async (email) => {
        await new Promise((resolve) => setTimeout(resolve, 600));
        const name = email.split('@')[0] ?? email;
        set({ token: `demo-${Date.now()}`, user: { email, name } });
      },
      signOut: () => set({ token: null, user: null }),
    }),
    {
      name: 'auth',
      storage: secureStorage,
      partialize: ({ token, user }) => ({ token, user }),
    }
  )
);
