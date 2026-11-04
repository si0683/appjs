import { serve } from '@hono/node-server';
import { createNodeWebSocket } from '@hono/node-ws';

import { app } from './app.js';
import { sql } from './db/client.js';
import { env } from './env.js';
import { jobs } from './jobs/queue.js';
import { log } from './lib/logger.js';
import { redis, subscriber } from './lib/redis.js';
import { startFeed } from './realtime/feed.js';
import { socketHandlers, startHub } from './realtime/hub.js';

// Точка входа API: HTTP + WebSocket /ws. Копий можно запускать сколько угодно
// за балансировщиком — общее состояние в PostgreSQL и Redis.
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });
app.get('/ws', upgradeWebSocket(() => socketHandlers()));

await startHub();
const stopFeed = startFeed();

const server = serve({ fetch: app.fetch, port: env.PORT }, (info) =>
  log.info(`API: http://localhost:${info.port}  (ws: /ws, готовность: /ready)`)
);
injectWebSocket(server);

// Корректная остановка: Docker/Kubernetes шлют SIGTERM при обновлении
let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  log.info('Остановка…');
  server.close();
  await stopFeed();
  await jobs.close();
  await subscriber.quit();
  await redis.quit();
  await sql.end({ timeout: 5 });
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
