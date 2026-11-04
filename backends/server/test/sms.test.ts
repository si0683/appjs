import { expect, it } from 'vitest';

process.env.DATABASE_URL ??= 'postgres://x@localhost/x';
process.env.REDIS_URL ??= 'redis://localhost';
process.env.BETTER_AUTH_SECRET ??= 'x'.repeat(32);
const { isPhone, normalizePhone } = await import('../src/lib/sms.js');

it('номер телефона приводится к международному формату', () => {
  expect(normalizePhone('8 (999) 123-45-67')).toBe('+79991234567');
  expect(normalizePhone('+7 999 123 45 67')).toBe('+79991234567');
  expect(normalizePhone('44 20 7946 0958')).toBe('+442079460958');
});

it('проверка номера', () => {
  expect(isPhone('+79991234567')).toBe(true);
  expect(isPhone('+7999')).toBe(false);
  expect(isPhone('79991234567')).toBe(false);
});
