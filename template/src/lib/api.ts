import { QueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { APP } from '@/config/app';
import { useAuth } from '@/stores/auth';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

// Один запрос к API: подставляет адрес, токен, проверяет ответ схемой zod.
// Если сервер вернёт не то, что ожидали, ошибка будет сразу и понятная.
export async function api<T>(
  path: string,
  schema: z.ZodType<T>,
  init: RequestInit & { json?: unknown } = {}
): Promise<T> {
  const { json, headers, ...rest } = init;
  const token = useAuth.getState().token;
  const res = await fetch(`${APP.apiUrl}${path}`, {
    ...rest,
    headers: {
      Accept: 'application/json',
      ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token && !token.startsWith('demo-') ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  if (!res.ok) throw new ApiError(res.status, `${res.status} ${res.statusText}`);
  return schema.parse(await res.json());
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 2 },
  },
});
