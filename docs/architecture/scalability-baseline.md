# Scalability Baseline (FootAlert BFF 10K -> 1M)

Date: 2026-03-02  
Scope: cache/read routes, API-Football protection, notifications dispatch/send pipeline

## SLO Targets

| Domain | SLI | Target |
| --- | --- | --- |
| Read API | p95 latency on critical routes | <= 1200 ms |
| Upstream API-Football | uncontrolled expiration burst | 0 stampede burst |
| Notifications queue | `notifications_queue_lag_ms` p95 | < 60 000 ms |
| Notifications delivery | failure ratio over 15 min | < 5% |
| Fanout policy | immediate sends per event | max 10 000 |

## Implemented Controls (P2 + P3)

1. Cache anti-stampede:
   - process-local coalescing (`inFlight`) kept.
   - Redis distributed lock added (`SET NX PX`) in `withCache`.
   - bounded wait/re-check (`CACHE_COALESCE_WAIT_MS`).
   - stale fallback when upstream is degraded.
2. Cache expiration smoothing:
   - TTL jitter added (`CACHE_TTL_JITTER_PCT`, default 15%).
3. Upstream quota protection:
   - global token bucket guard per minute (`UPSTREAM_GLOBAL_RPM_LIMIT`).
   - explicit 429 `UPSTREAM_QUOTA_EXCEEDED`.
4. Upstream circuit breaker:
   - opens on upstream 429/5xx for `UPSTREAM_CIRCUIT_BREAKER_WINDOW_MS`.
   - explicit 429 `UPSTREAM_CIRCUIT_OPEN`.
5. Notifications persistence scaling:
   - migration `004_notifications_scaling.sql` indexes for event/device/status/time filters.
   - bulk delivery insert via `UNNEST` (no per-device insert loop).
   - pending delivery pagination cursor API in store.
6. Fanout throttling:
   - cap `NOTIFICATIONS_FANOUT_MAX_PER_EVENT` (default 10 000 immediate).
   - overflow in `deferred`.
   - deferred promotion worker (`NOTIFICATIONS_DEFERRED_PROMOTION_BATCH`, `NOTIFICATIONS_DEFERRED_DELAY_MS`).

## k6 Benchmark Profiles

Planned profiles for staging baselines:

1. 10K profile (steady):
   - read-heavy on `/v1/matches`, `/v1/competitions/{id}/matches`.
2. 100K profile (burst + expiry):
   - synchronized cache expiry simulation.
   - upstream 429 simulation and breaker open/close validation.
3. 1M model (extrapolated + queue pressure):
   - large notifications fanout events (12K+ recipients).
   - deferred backlog drain observation.

## Reporting Format (to populate after run)

| Profile | p95 read latency | queue lag p95 | send failure ratio | deferred backlog max | status |
| --- | --- | --- | --- | --- | --- |
| 10K | pending | pending | pending | pending | pending |
| 100K | pending | pending | pending | pending | pending |
| 1M | pending | pending | pending | pending | pending |

## Gate Conditions

Release gate passes only when:

1. Read p95 <= 1200 ms on target routes.
2. No uncontrolled upstream burst during cache expiry tests.
3. `notifications_queue_lag_ms` p95 < 60 s.
4. Delivery failures < 5% over 15 minutes.
5. Immediate fanout never exceeds configured cap (default 10 000/event).
