# Scalability Baseline (BFF + Clients)

Date: 2026-02-28  
Scope: `/v1/matches`, `/v1/competitions/{id}/matches`, `/v1/teams/{id}/players`

## Baseline Snapshot

| Metric | `/v1/matches` | `/v1/competitions/{id}/matches` | `/v1/teams/{id}/players` |
| --- | --- | --- | --- |
| p95 latency (origin) | pending capture | pending capture | pending capture |
| avg payload size (bytes) | pending capture | pending capture | pending capture |
| upstream fan-out per screen | pending capture | pending capture | pending capture |
| cache hit ratio (BFF) | pending capture | pending capture | pending capture |

## Release Gate Thresholds

These thresholds become blocking once baseline values are captured.

| Gate | Threshold |
| --- | --- |
| p95 latency | <= 1200ms per scoped route |
| avg payload size drift | <= +20% vs previous release baseline |
| upstream fan-out | no regression vs previous release baseline |
| contract drift | 0 undocumented endpoint/query changes |

## Capture Protocol

1. Enable request timing logs on staging BFF for 24h window.
2. Run smoke traffic with and without cursor params:
   - `GET /v1/matches?date&timezone`
   - `GET /v1/matches?date&timezone&limit=50`
   - `GET /v1/competitions/{id}/matches?season`
   - `GET /v1/competitions/{id}/matches?season&limit=50`
   - `GET /v1/teams/{id}/players?leagueId&season&page=1`
   - `GET /v1/teams/{id}/players?leagueId&season&limit=50`
3. Collect:
   - p50/p95/p99 latency per route,
   - payload size distribution,
   - number of upstream API-Football calls per mobile screen load.
4. Store the captured values in this file and keep one row per release cut.

## CI/Operational Enforcement (v2)

1. Contract check must include platform-scope validation (`x-platform-scope`).
2. App-core shared service tests must pass before web/desktop jobs.
3. Web parity smoke journeys must pass in CI.
4. Desktop smoke checks must keep tauri shell aligned with web route manifest.

## Current Architecture Flags

- Cursor pagination available on the 3 scoped list routes.
- Legacy behavior preserved when `cursor` and `limit` are omitted.
- Redis strict mode is enforced for `APP_ENV in {staging, production}`.
- Health endpoint reports cache degradation and returns `503` when strict cache is degraded.
