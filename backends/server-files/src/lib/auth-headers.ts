import { Platform } from 'react-native';

import { authClient } from '@/lib/auth-client';

// Своему серверу (server/) — cookie сессии Better Auth из Keychain/Keystore.
// В браузере cookie браузер отправляет сам.
export async function authHeaders(): Promise<Record<string, string>> {
  if (Platform.OS === 'web') return {};
  const cookie = await authClient.getCookie();
  return cookie ? { Cookie: cookie } : {};
}
