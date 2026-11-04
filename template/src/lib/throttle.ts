// Прореживание потока данных для экрана. Биржа может присылать сотни
// сообщений в секунду, а человеку достаточно 4–10 обновлений: каждое
// лишнее обновление — это перерисовка в JS-потоке.

/**
 * Последнее значение не чаще раза в `ms`: первое — сразу, дальше — в конце окна.
 * Промежуточные значения отбрасываются (для цены, свечи, стакана).
 */
export function throttleLatest<T>(fn: (value: T) => void, ms: number) {
  let last = 0;
  let pending: { value: T } | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const fire = () => {
    timer = null;
    if (!pending) return;
    last = Date.now();
    const { value } = pending;
    pending = null;
    fn(value);
  };

  const push = (value: T) => {
    pending = { value };
    if (timer) return;
    const wait = Math.max(0, ms - (Date.now() - last));
    if (wait === 0) fire();
    else timer = setTimeout(fire, wait);
  };
  push.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    pending = null;
  };
  return push;
}

/**
 * Копит сообщения и отдаёт пачкой раз в `ms`; по ключу остаётся последнее
 * (для списка тикеров: одна запись в кэш вместо сотни).
 */
export function batchByKey<T>(key: (item: T) => string, flush: (items: T[]) => void, ms: number) {
  let buffer = new Map<string, T>();
  let timer: ReturnType<typeof setTimeout> | null = null;

  const push = (item: T) => {
    buffer.set(key(item), item);
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      const items = [...buffer.values()];
      buffer = new Map();
      flush(items);
    }, ms);
  };
  push.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    buffer = new Map();
  };
  return push;
}
