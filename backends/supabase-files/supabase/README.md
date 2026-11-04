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
4. **Способы входа:**
   - **Authentication → Providers.** Почта включена сразу. Телефон, Google и Apple — по желанию: [телефон](https://supabase.com/docs/guides/auth/phone-login), [Google](https://supabase.com/docs/guides/auth/social-login/auth-google), [Apple](https://supabase.com/docs/guides/auth/social-login/auth-apple).
   - **.env приложения.** В `EXPO_PUBLIC_AUTH_METHODS` перечислите те же способы, например `email,phone,google,apple`. Приложение покажет только их кнопки.
   - **Возврат после входа.** В **Authentication → URL Configuration → Redirect URLs** добавьте `<схема из app.json>://auth-callback` — туда приложение вернётся после входа через Google или Apple ([подробнее](https://supabase.com/docs/guides/auth/native-mobile-deep-linking)).
   - **iOS.** Если в iOS-приложении есть вход через Google, App Store требует и Sign in with Apple (правило 4.8, см. `STORES.md`).
   - **Яндекс ID и VK ID.** В Supabase их нет, для них нужен вариант `--backend=server`.

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
