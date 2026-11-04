import { afterEach, beforeEach, expect, it, jest } from '@jest/globals';

import { batchByKey, throttleLatest } from '@/lib/throttle';

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

it('throttleLatest: 1000 тиков за 100 мс → 2 обновления, последнее значение', () => {
  const seen: number[] = [];
  const push = throttleLatest<number>((v) => seen.push(v), 100);
  for (let i = 1; i <= 1000; i++) push(i);
  jest.advanceTimersByTime(100);
  expect(seen).toEqual([1, 1000]);
});

it('batchByKey: по ключу остаётся последнее, одна пачка за окно', () => {
  const batches: { s: string; p: number }[][] = [];
  const push = batchByKey<{ s: string; p: number }>(
    (x) => x.s,
    (b) => batches.push(b),
    250
  );
  for (let i = 0; i < 300; i++) push({ s: i % 2 ? 'BTC' : 'ETH', p: i });
  jest.advanceTimersByTime(250);
  expect(batches).toHaveLength(1);
  expect(batches[0]).toEqual([
    { s: 'ETH', p: 298 },
    { s: 'BTC', p: 299 },
  ]);
});

it('cancel: ничего не отдаётся после отписки', () => {
  const fn = jest.fn();
  const push = throttleLatest<number>(fn, 100);
  push(1);
  push(2);
  push.cancel();
  jest.advanceTimersByTime(200);
  expect(fn).toHaveBeenCalledTimes(1);
});
