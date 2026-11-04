import { expoClient } from '@better-auth/expo/client';
import { phoneNumberClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

import { APP } from '@/config/app';

// Клиент входа своего сервера (папка server/, Better Auth). Сессия хранится
// в Keychain / Keystore; адрес сервера — EXPO_PUBLIC_API_URL в .env.
export const authClient = createAuthClient({
  baseURL: APP.apiUrl,
  plugins: [
    expoClient({
      scheme: String(Constants.expoConfig?.scheme ?? 'app'),
      storagePrefix: 'app',
      storage: SecureStore,
    }),
    phoneNumberClient(),
  ],
});
