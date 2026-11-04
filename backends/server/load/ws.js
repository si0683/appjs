// Нагрузка на WebSocket: npm run load:ws · npm run load:ws:scale
// CLIENTS подключений держат подписку на тикер и стакан HOLD секунд — как экраны
// «Рынок» и «Инструмент» у живых пользователей. Считаем время подключения,
// сообщения и обрывы.
import ws from 'k6/ws';
import { check } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const BASE = (__ENV.BASE || 'http://api:8080').replace(/^http/, 'ws');
const CLIENTS = Number(__ENV.CLIENTS || 2000);
const HOLD = Number(__ENV.HOLD || 60);
const RAMP = __ENV.RAMP || '30s';

const received = new Counter('ws_messages_received');
const firstMessage = new Trend('ws_first_message_ms', true);

export const options = {
  scenarios: {
    clients: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { target: CLIENTS, duration: RAMP },
        { target: CLIENTS, duration: `${HOLD}s` },
      ],
      gracefulRampDown: '0s',
    },
  },
  thresholds: {
    ws_connecting: ['p(95)<1000'],
    checks: ['rate>0.99'],
  },
  summaryTrendStats: ['avg', 'p(50)', 'p(95)', 'p(99)', 'max'],
};

export default function () {
  const started = Date.now();
  let first = true;
  const res = ws.connect(`${BASE}/ws`, {}, (socket) => {
    socket.on('open', () => {
      socket.send(JSON.stringify({ op: 'sub', topics: ['ticker:BTCUSDT', 'book:BTCUSDT', 'ticker:ETHUSDT'] }));
    });
    socket.on('message', () => {
      received.add(1);
      if (first) {
        firstMessage.add(Date.now() - started);
        first = false;
      }
    });
    socket.setTimeout(() => socket.close(), HOLD * 1000);
  });
  check(res, { 'подключение 101': (r) => r && r.status === 101 });
}
