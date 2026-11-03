// Общие настройки приложения. Секреты сюда не класть: всё, что начинается
// с EXPO_PUBLIC_, попадает в сборку и видно любому пользователю.
export const APP = {
  name: 'AppJS',
  // Адрес вашего API. Задаётся в .env: EXPO_PUBLIC_API_URL=https://api.example.com
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'https://dummyjson.com',
  supportEmail: 'support@example.com',
} as const;
