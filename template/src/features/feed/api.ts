import { useInfiniteQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { api } from '@/lib/api';

// Схема ответа сервера: всё лишнее отбрасывается, неверный формат — понятная ошибка.
const postSchema = z.object({
  id: z.number(),
  title: z.string(),
  body: z.string(),
  tags: z.array(z.string()),
  reactions: z.object({ likes: z.number() }),
});
const pageSchema = z.object({
  posts: z.array(postSchema),
  total: z.number(),
  skip: z.number(),
  limit: z.number(),
});

export type Post = z.infer<typeof postSchema>;

const LIMIT = 15;

// Бесконечная лента: данные кэшируются, подгружаются при прокрутке,
// обновляются жестом «потянуть вниз».
export function usePosts() {
  return useInfiniteQuery({
    queryKey: ['posts'],
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      api(`/posts?limit=${LIMIT}&skip=${pageParam}&select=title,body,tags,reactions`, pageSchema, {
        signal,
      }),
    getNextPageParam: (last) =>
      last.skip + last.limit < last.total ? last.skip + last.limit : undefined,
  });
}
