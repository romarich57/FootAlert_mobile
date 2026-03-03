# footalert-bff

BFF (Backend For Frontend) for the FootAlert mobile app.

## Purpose

- Keep `API_FOOTBALL_KEY` server-side only.
- Validate and sanitize all incoming query params.
- Apply endpoint-level rate limiting.
- Add short in-memory caching to reduce API-Football quota usage.

## Quick Start

1. Copy `.env.example` to `.env`.
2. Set `API_FOOTBALL_KEY`.
3. For proxy/staging/prod set `TRUST_PROXY_HOPS` and `CORS_ALLOWED_ORIGINS` (or `WEB_APP_ORIGIN`).
4. Install dependencies and start:

```bash
npm install
npm run dev
```

Default base URL: `http://localhost:3001`.

Security-related env vars:

- `TRUST_PROXY_HOPS` (default `0` local, `1` behind trusted proxy/CDN)
- `CORS_ALLOWED_ORIGINS` (comma-separated allowlist; mandatory when proxy/staging/prod)
- `WEB_APP_ORIGIN` (optional single origin merged into CORS allowlist, e.g. `http://localhost:5173`)
- `CACHE_MAX_ENTRIES` (default `1000`)
- `CACHE_CLEANUP_INTERVAL_MS` (default `60000`)
- `CACHE_BACKEND` (`memory` | `redis`, default `memory`)
- `REDIS_URL` (required if `CACHE_BACKEND=redis`)
- `REDIS_CACHE_PREFIX` (default `footalert:bff:`)
- `BFF_EXPOSE_ERROR_DETAILS` (default `false`)
- `MOBILE_REQUEST_SIGNING_KEY` (shared secret for signed mobile technical routes)
- `MOBILE_REQUEST_SIGNATURE_MAX_SKEW_MS` (default `300000`)

## Integration tests (fastify.inject)

```bash
npm run test
```

Coverage currently includes:

- 4xx validation errors on strict query schemas.
- 5xx/502 normalization for upstream/API-Football failures.
- Critical route contracts (`matches`, `competitions`, `teams`, `players`, `follows`).

## Quality gates (routes, coverage, E2E)

```bash
npm run routes:catalog
npm run test:routes
npm run routes:line-limits
npm run test:e2e:bff
npm run test:coverage
npm run coverage:critical
```

- `test/routes/**`: suites par domaine.
- `test/route-contract.test.ts`: cohérence `buildServer` <-> `route-catalog` <-> `route-test-matrix`.
- `coverage:critical`: gate globale `>=85%` + routes/fichiers critiques `>=95%`.

Checklist convention:

1. Toute nouvelle route doit apparaître dans `test/fixtures/route-catalog.json`.
2. Toute nouvelle route doit être mappée dans `test/fixtures/route-test-matrix.json`.
3. Toute nouvelle route doit avoir des tests domaine (succès, validation, erreur amont normalisée).
4. Toute PR BFF doit passer `bff-quality.yml` avant merge.

## Staging smoke checks

Use the same base URL as the mobile app:

```bash
MOBILE_API_BASE_URL=https://your-staging-domain/v1 npm run smoke:staging
```

The smoke command checks:

- `/health`
- Critical 200 routes (`/v1/competitions`, `/v1/matches`, `/v1/follows/trends/teams`)
- Match details contract:
  - `/v1/matches/:id?timezone=...`
  - `/v1/matches/:id/events`
  - `/v1/matches/:id/statistics`
  - `/v1/matches/:id/statistics?period=first|second`
  - `/v1/matches/:id/lineups`
  - `/v1/matches/:id/head-to-head`
  - `/v1/matches/:id/predictions`
  - `/v1/matches/:id/absences?timezone=...`
  - `/v1/matches/:id/players/:teamId/stats`
- Validation 400 routes (`/v1/matches` missing timezone, `/v1/teams/standings` missing season)

Optional smoke overrides:

- `SMOKE_MATCH_ID` to force a fixture id for match detail checks.
- `SMOKE_TEAM_ID` to force the team id used for `/players/:teamId/stats`.

## Notifications production readiness

Required BFF runtime env for notifications in staging/production:

- `NOTIFICATIONS_BACKEND_ENABLED=true`
- `NOTIFICATIONS_EVENT_INGEST_ENABLED=true`
- `NOTIFICATIONS_PERSISTENCE_BACKEND=postgres`
- `DATABASE_URL`
- `REDIS_URL`
- `NOTIFICATIONS_INGEST_TOKEN`
- `PUSH_TOKEN_ENCRYPTION_KEY`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

Required PM2 processes on VPS:

- `footalert-bff` -> `node dist/index.js`
- `footalert-bff-worker` -> `node dist/worker.js`

Manual migration policy (before restart/deploy):

```bash
cd ~/foot_mobile/FootAlert_mobile/footalert-bff
DATABASE_URL='***' npm run db:migrate:notifications
```

If migration fails, do not restart `footalert-bff` or `footalert-bff-worker`.

## CI staging gate

Workflow: `.github/workflows/bff-staging.yml`.

Required GitHub secrets:

- `VPS_SSH_HOST`
- `VPS_SSH_USERNAME`
- `VPS_SSH_KEY`
- `MOBILE_API_BASE_URL_STAGING`

## CI production gate

Workflow: `.github/workflows/bff-production.yml` (manual dispatch only).
Mandatory dispatch input:

- `migration_confirmed=yes` (set only after running `npm run db:migrate:notifications` on production DB)

Required GitHub secrets:

- `PROD_VPS_SSH_HOST`
- `PROD_VPS_SSH_USERNAME`
- `PROD_VPS_SSH_KEY`
- `MOBILE_API_BASE_URL_PRODUCTION`

## Exposed Routes

- `GET /v1/matches`
- `GET /v1/matches/:id`
- `GET /v1/matches/:id/events`
- `GET /v1/matches/:id/statistics`
- `GET /v1/matches/:id/statistics?period=first|second`
- `GET /v1/matches/:id/lineups`
- `GET /v1/matches/:id/head-to-head`
- `GET /v1/matches/:id/predictions`
- `GET /v1/matches/:id/absences`
- `GET /v1/matches/:id/players/:teamId/stats`
- `GET /v1/competitions`
- `GET /v1/competitions/search`
- `GET /v1/competitions/:id`
- `GET /v1/competitions/:id/standings`
- `GET /v1/competitions/:id/matches`
- `GET /v1/competitions/:id/player-stats`
- `GET /v1/competitions/:id/transfers`
- `GET /v1/teams/:id/*`
- `GET /v1/players/:id/*`
- `GET /v1/follows/*`

## Notes

- Cache backend supports `memory` and `redis` (with in-memory fallback if Redis is unavailable).
- For production, use a shared cache and centralized rate limiting.
