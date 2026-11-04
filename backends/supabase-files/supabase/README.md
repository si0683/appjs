# Supabase

Бэкенд без своего сервера: PostgreSQL, вход, хранилище файлов, realtime и функции — в облаке [Supabase](https://supabase.com).

## Подключение

1. Создайте проект на [supabase.com](https://supabase.com/dashboard) (регион — ближе к пользователям).
2. **Project Settings → API Keys** → в `.env` приложения:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…
   ```
   Это публичный ключ: данные защищают политики RLS. Ключ `service_role` / secret — никогда в приложении.
3. Таблицы и функция удаления аккаунта:
   ```bash
   npx supabase login
   npx supabase link --project-ref xxxx
   npx supabase db push                          # таблицы из supabase/migrations
   npx supabase functions deploy delete-account  # удаление аккаунта (требование магазинов)
   ```
4. **Authentication → Providers**: почта включена; Google, Apple, VK — по желанию. Для iOS при входе через сторонние сервисы нужен и Sign in with Apple (правило App Store 4.8, `STORES.md`).

## Что где

| Что                                         | Где                                          |
| ------------------------------------------- | -------------------------------------------- |
| Клиент Supabase                             | `src/lib/supabase.ts`                        |
| Вход, выход, регистрация, удаление аккаунта | `src/stores/auth.ts`                         |
| Таблицы и политики доступа (RLS)            | `supabase/migrations/*.sql`                  |
| Удаление аккаунта на сервере                | `supabase/functions/delete-account/index.ts` |

Новая таблица: `npx supabase migration new имя` → SQL с `enable row level security` и политиками → `npx supabase db push`. Без политик RLS таблица недоступна приложению — так и задумано.

## Локально и свой сервер

- Локальная копия Supabase в Docker: `npx supabase start` (нужен Docker Desktop).
- Supabase можно поднять на своём сервере (self-hosting, официальный Docker Compose) — тогда меняется только `EXPO_PUBLIC_SUPABASE_URL`.
- Котировки бирж в этом варианте идут из приложения напрямую (`EXPO_PUBLIC_MARKET_SOURCE=binance`); общий поток для многих пользователей — вариант `--backend=server`.
