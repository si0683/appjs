# Способы входа

Сервер поддерживает почту и пароль, телефон (код по SMS), Google, Apple, Яндекс ID и VK ID. Способ включается, когда в `server/.env` заданы его ключи. Приложение спрашивает `GET /api/auth-methods` и показывает только включённые кнопки. Пустые ключи — кнопки нет, ничего не ломается.

Адрес возврата (callback) у всех провайдеров строится от `PUBLIC_URL` из `server/.env`. Для разработки это `http://localhost:8080`, в продакшене — `https://api.ваш-домен.ru`. У большинства провайдеров адрес должен быть HTTPS.

| Способ         | Что задать в `server/.env`                                              | Адрес возврата для кабинета провайдера       |
| -------------- | ----------------------------------------------------------------------- | -------------------------------------------- |
| Почта и пароль | ничего, включено всегда                                                 | —                                            |
| Телефон        | `SMS_PROVIDER` и ключи шлюза                                            | —                                            |
| Google         | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`                              | `PUBLIC_URL/api/auth/callback/google`        |
| Apple          | `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET`, `APPLE_APP_BUNDLE_IDENTIFIER` | `PUBLIC_URL/api/auth/callback/apple`         |
| Яндекс ID      | `YANDEX_CLIENT_ID`, `YANDEX_CLIENT_SECRET`                              | `PUBLIC_URL/api/auth/oauth2/callback/yandex` |
| VK ID          | `VK_CLIENT_ID`, `VK_CLIENT_SECRET`                                      | `PUBLIC_URL/api/auth/callback/vk`            |

Возврат из браузера в приложение идёт по схеме из `app.json` (`scheme`). Схема должна быть в `TRUSTED_ORIGINS` в `server/.env`, например `myapp://`. Установщик вписывает её сам.

## Телефон (код по SMS)

- `SMS_PROVIDER=console` — код пишется в логи сервера (`npm run logs`). Это для разработки, денег не стоит.
- `SMS_PROVIDER=smsru` — [SMS.ru](https://sms.ru/api), Россия. Ключ `SMSRU_API_ID` берётся в личном кабинете. Буквенное имя отправителя (`SMS_SENDER`) нужно согласовать с SMS.ru.
- `SMS_PROVIDER=twilio` — [Twilio](https://console.twilio.com/), весь мир. Нужны `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` и номер `TWILIO_FROM`.
- Другой шлюз (SMS Aero, МТС Exolve, Vonage…) — ещё одна ветка в `src/lib/sms.ts`.

Защита уже включена:

- код из 6 цифр живёт 5 минут, на ввод — 3 попытки;
- с одного адреса — не больше 3 кодов за 10 минут: SMS стоят денег и привлекают ботов.

Первый вход по номеру сам создаёт аккаунт. Документация: [Better Auth — Phone Number](https://www.better-auth.com/docs/plugins/phone-number).

## Google

1. [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials) → Create credentials → OAuth client ID, тип **Web application**.
2. Authorized redirect URIs: `https://api.ваш-домен.ru/api/auth/callback/google`. Для разработки — `http://localhost:8080/api/auth/callback/google`.
3. Client ID и Client secret вписать в `GOOGLE_CLIENT_ID` и `GOOGLE_CLIENT_SECRET`.
4. OAuth consent screen: название, логотип, ссылка на политику — `PUBLIC_URL/privacy`.

Документация: [Better Auth — Google](https://www.better-auth.com/docs/authentication/google).

## Apple

На iOS приложение показывает нативную кнопку Apple. На Android и в браузере вход идёт через страницу Apple. Если в iOS-приложении есть вход через Google, Яндекс или VK, App Store требует и Sign in with Apple или равноценный вход (правило 4.8, см. `STORES.md`).

1. Нужен аккаунт [Apple Developer](https://developer.apple.com/sign-in-with-apple/).
2. **App ID** приложения (bundle id из `app.json`) → включить Sign In with Apple. EAS Build делает это сам: в `app.json` уже стоит `ios.usesAppleSignIn: true`.
3. **Services ID** ([Identifiers → Services IDs](https://developer.apple.com/account/resources/identifiers/list/serviceId)) → Sign In with Apple → домен API и адрес возврата `https://api.ваш-домен.ru/api/auth/callback/apple`. Этот Services ID — `APPLE_CLIENT_ID`.
4. **Keys** → новый ключ с Sign In with Apple → скачать `.p8`. `APPLE_CLIENT_SECRET` — JWT, подписанный этим ключом. Как его сделать, расписано в документации Better Auth. JWT живёт до 6 месяцев, потом его нужно выпустить заново.
5. `APPLE_APP_BUNDLE_IDENTIFIER` — bundle id из `app.json`. Без него сервер не примет токен нативной кнопки iOS.

Apple отдаёт адрес не на localhost и только по HTTPS: проверяйте на сервере или через HTTPS-туннель. Документация: [Better Auth — Apple](https://www.better-auth.com/docs/authentication/apple).

## Яндекс ID

1. [oauth.yandex.ru → Создать приложение](https://oauth.yandex.ru/client/new) → платформа «Веб-сервисы».
2. Redirect URI: `https://api.ваш-домен.ru/api/auth/oauth2/callback/yandex`.
3. Доступы: «Доступ к адресу электронной почты», «Доступ к логину, имени и фамилии, полу», «Доступ к портрету пользователя».
4. ClientID и Client secret вписать в `YANDEX_CLIENT_ID` и `YANDEX_CLIENT_SECRET`.

Документация: [Яндекс ID](https://yandex.ru/dev/id/doc/ru/), [Better Auth — Generic OAuth](https://www.better-auth.com/docs/plugins/generic-oauth). В Better Auth для Яндекса есть готовая настройка `yandex`.

## VK ID

1. [Кабинет VK ID для бизнеса](https://id.vk.com/about/business/go) → создать приложение → платформа «Web».
2. Доверенный Redirect URL: `https://api.ваш-домен.ru/api/auth/callback/vk`, базовый домен — домен API.
3. ID приложения и защищённый ключ вписать в `VK_CLIENT_ID` и `VK_CLIENT_SECRET`.
4. Чтобы получать почту, в настройках доступа включите email.

Документация: [Better Auth — VK](https://www.better-auth.com/docs/authentication/vk).

## Проверка

```bash
curl http://localhost:8080/api/auth-methods
# {"email":true,"phone":true,"google":true,"apple":false,"yandex":true,"vk":false}
```

Один человек — один аккаунт. Если он вошёл через Google, Apple или Яндекс с той же почтой, что и при регистрации, вход привяжется к существующему аккаунту (`accountLinking` в `src/auth.ts`). Документация по Expo: [Better Auth — Expo](https://www.better-auth.com/docs/integrations/expo).
