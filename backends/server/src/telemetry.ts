// Трассировка OpenTelemetry — по желанию. Загружается до приложения:
//   node --import ./dist/telemetry.js dist/index.js
// Включается адресом сборщика OTLP: OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318
// (Jaeger из профиля monitoring, Grafana Tempo, SigNoz, Honeycomb…). Без него —
// ничего не грузит. Видны входящие HTTP-запросы, запросы к бирже (fetch) и Redis.

const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

if (endpoint) {
  const [{ NodeSDK }, { OTLPTraceExporter }, { HttpInstrumentation }, { UndiciInstrumentation }, { IORedisInstrumentation }, { resourceFromAttributes }, { ATTR_SERVICE_NAME }] =
    await Promise.all([
      import('@opentelemetry/sdk-node'),
      import('@opentelemetry/exporter-trace-otlp-http'),
      import('@opentelemetry/instrumentation-http'),
      import('@opentelemetry/instrumentation-undici'),
      import('@opentelemetry/instrumentation-ioredis'),
      import('@opentelemetry/resources'),
      import('@opentelemetry/semantic-conventions'),
    ]);

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? 'appjs-server',
    }),
    traceExporter: new OTLPTraceExporter({ url: `${endpoint.replace(/\/$/, '')}/v1/traces` }),
    instrumentations: [
      new HttpInstrumentation({
        // Проверки здоровья и сбор метрик не засоряют трассы
        ignoreIncomingRequestHook: (req) => /^\/(health|ready|metrics)/.test(req.url ?? ''),
      }),
      new UndiciInstrumentation(),
      new IORedisInstrumentation(),
    ],
  });
  sdk.start();
  console.log(`OpenTelemetry: трассы → ${endpoint}`);
  process.on('SIGTERM', () => void sdk.shutdown());
}

export {};
