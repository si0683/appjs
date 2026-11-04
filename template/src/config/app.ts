import Constants from 'expo-constants';

// Общие настройки приложения. Секреты сюда не класть: всё, что начинается
// с EXPO_PUBLIC_, попадает в сборку и видно любому пользователю.
const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

export const APP = {
  name: 'AppJS',
  // Адрес вашего API. Задаётся в .env: EXPO_PUBLIC_API_URL=https://api.example.com
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080',
  // Требования магазинов (см. STORES.md) — задаются в app.json → expo.extra:
  // политика конфиденциальности (RuStore: на русском и внутри приложения),
  // страница удаления аккаунта (Google Play: удаление и по ссылке в интернете).
  privacyPolicyUrl: extra.privacyPolicyUrl ?? '',
  deleteAccountUrl: extra.deleteAccountUrl ?? '',
  supportEmail: extra.supportEmail ?? 'support@example.com',
} as const;
