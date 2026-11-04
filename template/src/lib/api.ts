import { QueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { APP } from '@/config/app';
import { authHeaders } from '@/lib/auth-headers';

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
  const res = await fetch(`${APP.apiUrl}${path}`, {
    ...rest,
    headers: {
      Accept: 'application/json',
      ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(await authHeaders()),
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
