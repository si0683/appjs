import type { TFunction } from 'i18next';
import { z } from 'zod';

// Схемы форм. Текст ошибки — ключ перевода, после «|» — число для подстановки:
// 'validation.min|6' превратится в «Минимум 6 символов».
export const signInSchema = z.object({
  email: z.string().trim().min(1, 'validation.required').email('validation.email'),
  password: z.string().min(6, 'validation.min|6'),
});
export type SignInValues = z.infer<typeof signInSchema>;

export const noteSchema = z.object({
  title: z.string().trim().min(1, 'validation.required').max(80, 'validation.max|80'),
  body: z.string().trim().max(2000, 'validation.max|2000'),
});
export type NoteValues = z.infer<typeof noteSchema>;

export function errorText(t: TFunction, message?: string) {
  if (!message) return undefined;
  const [key, count] = message.split('|');
  return t(key as never, count ? { count: Number(count) } : undefined) as string;
}
