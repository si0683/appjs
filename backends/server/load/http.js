// Нагрузка на API: npm run load:http (одна копия) · npm run load:http:scale (за балансировщиком)
// Смесь запросов как у живого приложения:
//   50 % — котировки (кэш Redis), 30 % — список своих сделок (вход + PostgreSQL),
//   15 % — запись сделки (PostgreSQL), 5 % — /health.
// Поток запросов растёт ступенями до MAX_RPS; k6 показывает, где растёт задержка и ошибки.
import http from 'k6/http';
import { check } from 'k6';
import { Rate } from 'k6/metrics';

const BASE = __ENV.BASE || 'http://api:8080';
const MAX_RPS = Number(__ENV.MAX_RPS || 2000);
const STAGE = __ENV.STAGE || '30s';
const ORIGIN = 'http://localhost:8081';
const errors = new Rate('errors');

export const options = {
  discardResponseBodies: true,
  scenarios: {
    mix: {
      executor: 'ramping-arrival-rate',
      startRate: Math.round(MAX_RPS / 10),
      timeUnit: '1s',
      preAllocatedVUs: 200,
      maxVUs: 2000,
      stages: [
        { target: Math.round(MAX_RPS * 0.25), duration: STAGE },
        { target: Math.round(MAX_RPS * 0.5), duration: STAGE },
        { target: Math.round(MAX_RPS * 0.75), duration: STAGE },
        { target: MAX_RPS, duration: STAGE },
        { target: MAX_RPS, duration: STAGE },
      ],
    },
  },
  thresholds: {
    errors: ['rate<0.01'],
    http_req_duration: ['p(95)<300'],
  },
  summaryTrendStats: ['avg', 'p(50)', 'p(95)', 'p(99)', 'max'],
};

// Один пользователь на весь прогон: регистрация и cookie сессии
export function setup() {
  const email = `load${Date.now()}@example.com`;
  const res = http.post(
    `${BASE}/api/auth/sign-up/email`,
    JSON.stringify({ email, password: 'password123', name: 'Load' }),
    { headers: { 'Content-Type': 'application/json', Origin: ORIGIN }, responseType: 'text' }
  );
  check(res, { 'регистрация': (r) => r.status === 200 });
  const cookie = Object.entries(res.cookies)
    .map(([name, list]) => `${name}=${list[0].value}`)
    .join('; ');
  return { cookie };
}

export default function ({ cookie }) {
  const auth = { headers: { Cookie: cookie, Origin: ORIGIN, 'Content-Type': 'application/json' } };
  const roll = Math.random();
  let res;
  if (roll < 0.5) {
    res = http.get(`${BASE}/api/market/tickers?symbols=BTCUSDT,ETHUSDT,SOLUSDT`, { tags: { name: 'tickers' } });
  } else if (roll < 0.8) {
    res = http.get(`${BASE}/api/trades?limit=50`, { ...auth, tags: { name: 'trades:list' } });
  } else if (roll < 0.95) {
    const body = JSON.stringify({
      items: [{ symbol: 'BTCUSDT', side: 'buy', price: '64250.10', qty: '0.001', createdAt: new Date().toISOString() }],
    });
    res = http.post(`${BASE}/api/trades`, body, { ...auth, tags: { name: 'trades:add' } });
  } else {
    res = http.get(`${BASE}/health`, { tags: { name: 'health' } });
  }
  errors.add(res.status >= 400);
}
