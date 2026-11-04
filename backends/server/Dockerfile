# Образ сервера: сборка TypeScript → лёгкий образ только с runtime-зависимостями.
# docker build -t my-app-server .   ·   один образ запускает и API, и worker.

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --ignore-scripts; else npm install --ignore-scripts; fi
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev --ignore-scripts

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
# Не root: меньше вреда, если процесс взломают
USER node
COPY --chown=node:node --from=build /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node drizzle ./drizzle
COPY --chown=node:node package.json ./
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s CMD wget -qO- http://127.0.0.1:8080/health || exit 1
# Миграции → API (трассировка — если задан OTEL_EXPORTER_OTLP_ENDPOINT).
# Для worker команда переопределяется: node --import ./dist/telemetry.js dist/jobs/worker.js
CMD ["sh", "-c", "node dist/db/migrate.js && node --import ./dist/telemetry.js dist/index.js"]
