import { useAuth } from '@/stores/auth';

// Запросам к своим функциям (Supabase Edge Functions) — токен сессии Supabase.
export async function authHeaders(): Promise<Record<string, string>> {
  const token = useAuth.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
