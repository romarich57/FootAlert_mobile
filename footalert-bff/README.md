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
3. Install dependencies and start:

```bash
npm install
npm run dev
```

Default base URL: `http://localhost:3001`.

## Integration tests (fastify.inject)

```bash
npm run test
```

Coverage currently includes:

- 4xx validation errors on strict query schemas.
- 5xx/502 normalization for upstream/API-Football failures.
- Critical route contracts (`matches`, `competitions`, `teams`, `players`, `follows`).

## Staging smoke checks

Use the same base URL as the mobile app:

```bash
MOBILE_API_BASE_URL=https://your-staging-domain/v1 npm run smoke:staging
```

The smoke command checks:

- `/health`
- Critical 200 routes (`/v1/competitions`, `/v1/matches`, `/v1/follows/trends/teams`)
- Validation 400 routes (`/v1/matches` missing timezone, `/v1/teams/standings` missing season)

## CI staging gate

Workflow: `.github/workflows/bff-staging.yml`.

Required GitHub secrets:

- `BFF_STAGING_DEPLOY_HOOK_URL`
- `MOBILE_API_BASE_URL_STAGING`

## Exposed Routes

- `GET /v1/matches`
- `GET /v1/matches/:id`
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

- Cache is in-memory only (ephemeral per process).
- For production, use a shared cache and centralized rate limiting.
