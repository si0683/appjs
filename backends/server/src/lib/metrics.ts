import { trace } from '@opentelemetry/api';
import type { MiddlewareHandler } from 'hono';
import { routePath } from 'hono/route';
import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from 'prom-client';

// Метрики для Prometheus (GET /metrics). По ним видно, когда пора добавлять копии
// API или worker: растут задержка ответов, задержка event loop, очередь задач.
// Готовая панель Grafana — server/monitoring (docker compose --profile monitoring).

export const registry = new Registry();
registry.setDefaultLabels({ service: 'api' });

// Память, CPU, сборка мусора и главное для Node — задержка event loop
// (nodejs_eventloop_lag_*): если она растёт, процесс перегружен вычислениями
collectDefaultMetrics({ register: registry, eventLoopMonitoringPrecision: 10 });

export const httpDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Время ответа API',
  labelNames: ['method', 'route', 'status'] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [registry],
});

export const wsClients = new Gauge({
  name: 'ws_clients',
  help: 'Подключённые WebSocket-клиенты этой копии',
  registers: [registry],
});
export const wsTopics = new Gauge({
  name: 'ws_topics',
  help: 'Темы, на которые есть подписчики',
  registers: [registry],
});
export const wsMessages = new Counter({
  name: 'ws_messages_sent_total',
  help: 'Отправлено сообщений клиентам',
  registers: [registry],
});
export const wsDropped = new Counter({
  name: 'ws_messages_dropped_total',
  help: 'Пропущено сообщений медленным клиентам (буфер переполнен)',
  registers: [registry],
});
export const feedLeader = new Gauge({
  name: 'market_feed_leader',
  help: '1 — эта копия держит соединение с биржей',
  registers: [registry],
});
export const feedPublished = new Counter({
  name: 'market_events_published_total',
  help: 'Событий рынка опубликовано в Redis',
  registers: [registry],
});
export const rateLimited = new Counter({
  name: 'http_rate_limited_total',
  help: 'Запросов отклонено лимитом (429)',
  registers: [registry],
});
export const queueJobs = new Gauge({
  name: 'queue_jobs',
  help: 'Задачи BullMQ по состояниям',
  labelNames: ['state'] as const,
  registers: [registry],
});

/** Время ответа по шаблону маршрута (/api/trades/:id), а не по адресу — иначе метрик будет бесконечно много. */
export const httpMetrics: MiddlewareHandler = async (c, next) => {
  const end = httpDuration.startTimer();
  await next();
  if (c.req.path === '/metrics') return;
  const route = routePath(c, -1) || 'unknown';
  end({ method: c.req.method, route, status: String(c.res.status) });
  // Трасса (если включена OpenTelemetry) называется по маршруту: «GET /api/trades/:id»
  const span = trace.getActiveSpan();
  span?.updateName(`${c.req.method} ${route}`);
  span?.setAttribute('http.route', route);
};
