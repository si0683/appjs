import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { deviceLanguage, type Language } from '@/i18n';
import { kvStorage } from '@/lib/storage';

export type ThemeChoice = 'system' | 'light' | 'dark';

type SettingsState = {
  theme: ThemeChoice;
  language: Language;
  haptics: boolean;
  setTheme: (theme: ThemeChoice) => void;
  setLanguage: (language: Language) => void;
  setHaptics: (haptics: boolean) => void;
};

// Настройки сохраняются на устройстве и переживают перезапуск.
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      language: deviceLanguage(),
      haptics: true,
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setHaptics: (haptics) => set({ haptics }),
    }),
    { name: 'settings', storage: kvStorage }
  )
);
