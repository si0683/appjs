import { env } from '../env.js';
import { log } from './logger.js';

// Отправка SMS с кодом входа. Шлюз — SMS_PROVIDER в .env:
//   console — код в логах сервера (разработка, ничего не платить)
//   smsru   — SMS.ru (Россия): SMSRU_API_ID из личного кабинета sms.ru
//   twilio  — Twilio (весь мир): TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM
// Свой шлюз (SMS Aero, МТС Exolve, Vonage…) — ещё одна ветка в sendSms.

export async function sendSms(to: string, text: string) {
  switch (env.SMS_PROVIDER) {
    case 'console':
      log.warn({ to, text }, 'SMS (консоль): код для входа');
      return;
    case 'smsru': {
      const url = new URL('https://sms.ru/sms/send');
      url.search = new URLSearchParams({
        api_id: env.SMSRU_API_ID ?? '',
        to: to.replace(/^\+/, ''),
        msg: text,
        json: '1',
        ...(env.SMS_SENDER ? { from: env.SMS_SENDER } : {}),
      }).toString();
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      const body = (await res.json()) as { status?: string; status_text?: string };
      if (body.status !== 'OK') throw new Error(`sms.ru: ${body.status_text ?? res.status}`);
      return;
    }
    case 'twilio': {
      const sid = env.TWILIO_ACCOUNT_SID ?? '';
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${sid}:${env.TWILIO_AUTH_TOKEN ?? ''}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: to, From: env.TWILIO_FROM ?? '', Body: text }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`twilio: ${res.status} ${await res.text()}`);
      return;
    }
    case 'off':
      throw new Error('Вход по телефону выключен (SMS_PROVIDER=off)');
  }
}

/** Номер в международном формате: +79991234567 (8XXXXXXXXXX → +7XXXXXXXXXX). */
export function normalizePhone(raw: string) {
  let digits = raw.replace(/[^\d+]/g, '');
  if (/^8\d{10}$/.test(digits)) digits = '+7' + digits.slice(1);
  if (!digits.startsWith('+')) digits = '+' + digits;
  return digits;
}

export const isPhone = (value: string) => /^\+[1-9]\d{9,14}$/.test(value);
