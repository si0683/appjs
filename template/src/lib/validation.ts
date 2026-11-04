import type { TFunction } from 'i18next';
import { z } from 'zod';

// Схемы форм. Текст ошибки — ключ перевода, после «|» — число для подстановки:
// 'validation.min|6' превратится в «Минимум 6 символов».
export const signInSchema = z.object({
  email: z.string().trim().min(1, 'validation.required').email('validation.email'),
  password: z.string().min(8, 'validation.min|8'),
});
export type SignInValues = z.infer<typeof signInSchema>;

/** Номер в международном формате: «8 (999) 123-45-67» → «+79991234567». */
export function normalizePhone(raw: string) {
  let digits = raw.replace(/[^\d+]/g, '');
  if (/^8\d{10}$/.test(digits)) digits = '+7' + digits.slice(1);
  if (!digits.startsWith('+')) digits = '+' + digits;
  return digits;
}

export const phoneSchema = z.object({
  phone: z
    .string()
    .transform(normalizePhone)
    .refine((v) => /^\+[1-9]\d{9,14}$/.test(v), 'validation.phone'),
});
export type PhoneValues = z.input<typeof phoneSchema>;

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
