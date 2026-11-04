# Сервер приложения

Свой бэкенд на TypeScript: **Node 24 · Hono · PostgreSQL 17 (Drizzle) · Redis 7 · BullMQ · Better Auth · WebSocket · Docker**. Схемы данных (zod) — те же, что в приложении.

## Что умеет

| Часть                  | Что делает                                                                                                                                                                                                                                                           | Где                         |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Вход                   | почта + пароль, телефон (SMS), Google, Apple, Яндекс ID, VK ID — включаются ключами (AUTH.md); сессии в PostgreSQL, удаление аккаунта (требование магазинов); приложение хранит сессию в Keychain/Keystore                                                           | `src/auth.ts` (Better Auth) |
| API                    | сделки пользователя (только свои, постранично `?limit=50&before=<id>`), проверка ввода zod                                                                                                                                                                                                                | `src/routes/trades.ts`      |
| Рынок                  | прокси к бирже с кэшем в Redis «отдать сразу, обновить в фоне»: 100 000 пользователей = несколько запросов к Binance в секунду                                                                                                                                                                     | `src/routes/market.ts`      |
| Realtime               | `/ws`: подписки `ticker:BTCUSDT`, `candles:BTCUSDT:1h`, `book:BTCUSDT`; одно соединение с биржей на весь кластер (лидер по блокировке в Redis), поток прорежен до 4 обновлений/с и разослан всем копиям через Redis pub/sub; медленные клиенты пропускают обновления | `src/realtime/*`            |
| Фоновые задачи         | BullMQ: письма, очистка сессий раз в сутки; worker — отдельный процесс                                                                                                                                                                                               | `src/jobs/*`                |
| Защита                 | лимит запросов на IP и лимит SMS по IP и номеру (общие счётчики в Redis), заголовки безопасности, CORS только для своих адресов, процесс в контейнере не от root                                                                                                                                 | `src/app.ts`                |
| Страницы для магазинов | `/privacy` — политика конфиденциальности, `/delete-account` — удаление аккаунта по ссылке (Google Play)                                                                                                                                                              | `src/routes/pages.ts`       |
| Здоровье и метрики     | `/health` — процесс жив, `/ready` — база и Redis доступны (для балансировщика), `/metrics` — Prometheus, трассы OpenTelemetry                                                                                                                                                                                       | `src/app.ts`                |

## Запуск

```bash
cd server
npm run up          # PostgreSQL + Redis + API + worker в Docker → http://localhost:8080
npm run logs        # логи API и worker
npm run down        # остановить (данные в томах Docker сохраняются)
npm run up:monitoring   # + Prometheus, Grafana (:3001), Jaeger (:16686)
npm run up:scale        # 4 копии API + балансировщик Caddy + PgBouncer + 2 worker + мониторинг
```

Разработка с перезапуском при правках:

```bash
docker compose --profile dev up -d db redis db-port redis-port   # база :5433, Redis :6380
npm run db:migrate
npm run dev            # API
npm run worker:dev     # фоновые задачи (в другом окне)
```

Приложение: в `.env` проекта `EXPO_PUBLIC_API_URL` — адрес сервера. На телефоне `localhost` — это сам телефон: укажите IP компьютера в сети (`http://192.168.1.10:8080`) или адрес туннеля.

## База

- Таблицы — `src/db/schema.ts`; после правок `npm run db:generate` создаёт миграцию в `drizzle/`, контейнер `api` применяет её при старте.
- Таблицы входа — `src/db/auth-schema.ts` (создаёт `npm run auth:generate`, руками не править).
- Деньги — `numeric(38, 18)`, без потери точности.

## Образ Docker

Один образ запускает и API (`node dist/index.js`), и worker (`node dist/jobs/worker.js`).

- **Автоматически:** `.github/workflows/server-image.yml` — при push в `main` (изменения в `server/`) проверяет код и публикует образ `ghcr.io/<владелец>/<репозиторий>-server` для `amd64` и `arm64`; тег `v1.2.3` → образы `:1.2.3`, `:1.2`. Docker Hub — по желанию: секреты `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`.
- **Вручную:** `docker build -t my-app-server .`

## Выкладка на VPS

```bash
# на сервере (Docker установлен), в папке с docker-compose.yml и .env:
export SERVER_IMAGE=ghcr.io/<владелец>/<репозиторий>-server:1.0.0
docker compose pull api && docker compose up -d --no-build
```

В `.env` на сервере — свои значения: `BETTER_AUTH_SECRET` (`openssl rand -base64 32`), `POSTGRES_PASSWORD`, `PUBLIC_URL=https://api.example.com`, `TRUSTED_ORIGINS=<схема-приложения>://`. Перед API — HTTPS (Caddy или nginx + Let's Encrypt): магазины требуют HTTPS.

## Большая нагрузка

Замеры, наблюдаемость и масштабирование — [LOAD.md](LOAD.md). Кратко: на 4 ядрах Docker одна копия API держит ~1150 запросов/с, четыре копии за балансировщиком — пик 3000/с при p95 42 мс и 0 % ошибок; 2000 клиентов WebSocket — подключение p95 14 мс.

- **API без состояния:** любое число копий за балансировщиком (`API_REPLICAS=8 npm run up:scale` или Kubernetes); общее — в PostgreSQL и Redis.
- **WebSocket:** копии раздают события из Redis — подключения распределяются по копиям, биржа видит одно соединение.
- **База:** PgBouncer (transaction) между копиями и PostgreSQL, `DB_POOL_MAX` на копию, миграции — отдельным сервисом один раз.
- **Задачи:** тяжёлое — в worker (BullMQ), чтобы не росла задержка event loop; worker масштабируется так же.
- **За балансировщиком** включите `TRUST_PROXY=true` — иначе лимиты увидят один IP балансировщика. Без своего прокси не включайте: клиент подделает `X-Forwarded-For`.
- **Наблюдаемость:** `/metrics` (закройте снаружи или задайте `METRICS_TOKEN`), трассы — `OTEL_EXPORTER_OTLP_ENDPOINT`, логи JSON (pino) → Loki/ELK.

## Способы входа

Почта и пароль, телефон (код по SMS), Google, Apple, Яндекс ID, VK ID. Способ включается ключами в `.env`. Как получить ключи каждого сервиса — [AUTH.md](AUTH.md).

## Проверки

```bash
npm run check   # типы + тесты
npm run build   # сборка в dist/
npm run load:http:scale   # нагрузочный тест (LOAD.md)
```
