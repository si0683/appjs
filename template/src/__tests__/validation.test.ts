import { describe, expect, it } from '@jest/globals';
import { normalizePhone, noteSchema, phoneSchema, signInSchema } from '@/lib/validation';

describe('схемы форм', () => {
  it('вход: неверная почта и короткий пароль', () => {
    const r = signInSchema.safeParse({ email: 'abc', password: '123' });
    expect(r.success).toBe(false);
    const messages = r.error?.issues.map((i) => i.message);
    expect(messages).toEqual(['validation.email', 'validation.min|8']);
  });

  it('вход: корректные данные', () => {
    expect(signInSchema.safeParse({ email: 'a@b.ru', password: '12345678' }).success).toBe(true);
  });

  it('заметка: пустой заголовок не проходит', () => {
    expect(noteSchema.safeParse({ title: '   ', body: '' }).success).toBe(false);
  });
});

describe('телефон', () => {
  it('номер приводится к международному формату', () => {
    expect(normalizePhone('8 (999) 123-45-67')).toBe('+79991234567');
    expect(normalizePhone('+7 999 123 45 67')).toBe('+79991234567');
  });
  it('короткий номер не проходит', () => {
    expect(phoneSchema.safeParse({ phone: '+7 999' }).success).toBe(false);
    expect(phoneSchema.safeParse({ phone: '8 999 123-45-67' }).success).toBe(true);
  });
});
