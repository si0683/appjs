import { useAuth } from '@/stores/auth';

// Заголовки авторизации для запросов к своему API (src/lib/api.ts).
// Демо: токена-«заглушки» сервер не знает — ничего не шлём.
// С --backend=server / supabase файл заменяется (cookie Better Auth / токен Supabase).
export async function authHeaders(): Promise<Record<string, string>> {
  const token = useAuth.getState().token;
  return token && !token.startsWith('demo-') ? { Authorization: `Bearer ${token}` } : {};
}
