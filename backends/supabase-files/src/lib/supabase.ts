import 'expo-sqlite/localStorage/install';

import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

// Supabase: база PostgreSQL, вход, хранилище файлов и realtime «из коробки».
// Ключи — в .env: EXPO_PUBLIC_SUPABASE_URL и EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
// (Project Settings → API Keys). Это публичный ключ: доступ к данным ограничивают
// политики RLS в supabase/migrations. Секретный ключ (service_role) — никогда в приложении.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

export const supabase = createClient(url, key, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // Вход через Google / Apple в браузере — с кодом подтверждения (PKCE)
    flowType: 'pkce',
  },
});

// Токен обновляется, только пока приложение на экране
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') void supabase.auth.startAutoRefresh();
    else void supabase.auth.stopAutoRefresh();
  });
}
