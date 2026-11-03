import { describe, expect, it } from '@jest/globals';
import { noteSchema, signInSchema } from '@/lib/validation';

describe('схемы форм', () => {
  it('вход: неверная почта и короткий пароль', () => {
    const r = signInSchema.safeParse({ email: 'abc', password: '123' });
    expect(r.success).toBe(false);
    const messages = r.error?.issues.map((i) => i.message);
    expect(messages).toEqual(['validation.email', 'validation.min|6']);
  });

  it('вход: корректные данные', () => {
    expect(signInSchema.safeParse({ email: 'a@b.ru', password: '123456' }).success).toBe(true);
  });

  it('заметка: пустой заголовок не проходит', () => {
    expect(noteSchema.safeParse({ title: '   ', body: '' }).success).toBe(false);
  });
});
