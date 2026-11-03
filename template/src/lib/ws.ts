import { AppState } from 'react-native';

// WebSocket с переподключением: пауза 1 → 2 → 4 … до 30 с, сброс при успехе.
// В фоне приложение закрывает соединение и открывает снова при возврате —
// так не тратится батарея и не копятся старые данные.

export type SocketHandle = { close: () => void; send: (data: string) => void };

export function connectSocket(opts: {
  url: string;
  onOpen?: (send: (data: string) => void) => void;
  onMessage: (data: unknown) => void;
  /** Пинг каждые N мс (некоторым биржам нужен), сообщение — строка. */
  ping?: { everyMs: number; message: string };
}): SocketHandle {
  let ws: WebSocket | null = null;
  let closed = false;
  let attempt = 0;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let pinger: ReturnType<typeof setInterval> | undefined;

  const send = (data: string) => {
    if (ws?.readyState === WebSocket.OPEN) ws.send(data);
  };

  const open = () => {
    if (closed) return;
    ws = new WebSocket(opts.url);
    ws.onopen = () => {
      attempt = 0;
      opts.onOpen?.(send);
      if (opts.ping) pinger = setInterval(() => send(opts.ping!.message), opts.ping.everyMs);
    };
    ws.onmessage = (e) => {
      try {
        opts.onMessage(JSON.parse(String(e.data)));
      } catch {
        // не JSON (pong и т. п.) — пропускаем
      }
    };
    ws.onclose = () => {
      clearInterval(pinger);
      if (closed || AppState.currentState !== 'active') return;
      retry = setTimeout(open, Math.min(30_000, 1000 * 2 ** attempt++));
    };
    ws.onerror = () => ws?.close();
  };

  const sub = AppState.addEventListener('change', (state) => {
    if (state === 'active' && (!ws || ws.readyState === WebSocket.CLOSED)) open();
    if (state === 'background') ws?.close();
  });

  open();
  return {
    send,
    close: () => {
      closed = true;
      clearTimeout(retry);
      clearInterval(pinger);
      sub.remove();
      ws?.close();
    },
  };
}
