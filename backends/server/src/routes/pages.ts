import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { html } from 'hono/html';
import { z } from 'zod';

import { env } from '../env.js';
import { jobs } from '../jobs/queue.js';

// Публичные страницы, которых требуют магазины (см. STORES.md в приложении):
//   /privacy         — политика конфиденциальности (RuStore: на русском)
//   /delete-account  — удаление аккаунта по ссылке в интернете (Google Play)
// Тексты — заготовки: замените своими (юрист, 152-ФЗ / GDPR).

const page = (title: string, body: ReturnType<typeof html>) => html`<!doctype html>
  <html lang="ru">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${title}</title>
      <style>
        body { font: 16px/1.6 system-ui, sans-serif; max-width: 680px; margin: 40px auto; padding: 0 16px; color: #111; }
        input, button { font: inherit; padding: 10px 12px; border-radius: 8px; border: 1px solid #ccc; }
        button { background: #7c3aed; color: #fff; border: 0; cursor: pointer; }
      </style>
    </head>
    <body>
      ${body}
    </body>
  </html>`;

export const pages = new Hono()
  .get('/privacy', (c) =>
    c.html(
      page(
        'Политика конфиденциальности',
        html`<h1>Политика конфиденциальности</h1>
          <p>Заготовка. Опишите: какие данные собираются (почта, сделки, устройство), зачем, где и
            сколько хранятся, кому передаются, как их удалить, контакт ответственного лица.</p>
          <p>Удалить аккаунт и данные: в приложении «Настройки → Удалить аккаунт» или
            <a href="/delete-account">по этой ссылке</a>.</p>`
      )
    )
  )
  .get('/delete-account', (c) =>
    c.html(
      page(
        'Удаление аккаунта',
        html`<h1>Удаление аккаунта</h1>
          <p>Быстрее всего — в приложении: «Настройки → Удалить аккаунт». Если приложения уже нет,
            оставьте почту аккаунта — пришлём ссылку для подтверждения, после неё аккаунт и все
            данные будут удалены.</p>
          <form method="post">
            <input type="email" name="email" placeholder="you@example.com" required />
            <button type="submit">Удалить аккаунт</button>
          </form>`
      )
    )
  )
  .post('/delete-account', zValidator('form', z.object({ email: z.email() })), async (c) => {
    const { email } = c.req.valid('form');
    await jobs.add('delete-request', { email, at: Date.now() }, { removeOnComplete: true });
    return c.html(
      page(
        'Запрос принят',
        html`<h1>Запрос принят</h1>
          <p>Если аккаунт с адресом ${email} существует, на него придёт письмо для подтверждения.
            <a href="${env.PUBLIC_URL}/privacy">Политика конфиденциальности</a>.</p>`
      )
    );
  });
