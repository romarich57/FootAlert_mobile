# syntax=docker/dockerfile:1.7

FROM node:22.11.0-alpine AS build

ENV NODE_ENV=development
ENV npm_config_update_notifier=false
ENV npm_config_fund=false

WORKDIR /workspace

COPY --from=app_core package*.json /workspace/packages/app-core/
COPY --from=app_core tsconfig.json /workspace/packages/app-core/
COPY --from=app_core src /workspace/packages/app-core/src
COPY package*.json /workspace/footalert-bff/
COPY . /workspace/footalert-bff/

WORKDIR /workspace/footalert-bff

RUN npm ci
RUN npm run build
RUN npm prune --omit=dev

FROM node:22.11.0-alpine AS runtime

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3001

RUN addgroup -S footalert && adduser -S footalert -G footalert

WORKDIR /app

COPY --from=build --chown=footalert:footalert /workspace/footalert-bff/package*.json ./
COPY --from=build --chown=footalert:footalert /workspace/footalert-bff/node_modules ./node_modules
COPY --from=build --chown=footalert:footalert /workspace/footalert-bff/dist ./dist

USER footalert

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/liveness" >/dev/null || exit 1

CMD ["node", "dist/index.js"]
