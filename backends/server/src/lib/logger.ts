import { pino } from 'pino';

import { env, isProd } from '../env.js';

// JSON-логи в проде (их собирают Loki / ELK / Grafana), читаемые — при разработке.
export const log = pino({
  level: env.LOG_LEVEL,
  ...(isProd ? {} : { transport: { target: 'pino-pretty', options: { colorize: true } } }),
});
