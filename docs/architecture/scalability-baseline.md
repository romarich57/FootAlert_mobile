# Scalability Baseline (FootAlert BFF 10K -> 1M)

Date: 2026-03-09  
Scope: cache/read routes, API-Football protection, notifications dispatch/send pipeline, runtime topology, observability, managed services

## Target State for 100K

1. Production runtime remains `PM2 + VPS multi-node`.
2. Minimum topology:
   - API node A
   - API node B
   - dedicated worker node C
3. Cloudflare Load Balancer is the only public front door.
4. Redis and PostgreSQL are managed services, not VPS-local state.
5. Kubernetes is prepared through versioned artifacts only; it is not the default runtime in this phase.

## SLO Targets

| Domain | SLI | Target |
| --- | --- | --- |
| Read API | p95 latency on critical routes | <= 1200 ms |
| Upstream API-Football | uncontrolled expiration burst | 0 stampede burst |
| Notifications queue | `notifications_queue_lag_ms` p95 | < 60 000 ms |
| Notifications delivery | failure ratio over 15 min | < 5% |
| Fanout policy | immediate sends per event | max 10 000 |

## Operational Endpoints

1. `GET /health`
   - compatibility endpoint only
   - not used as the primary probe for load balancing
2. `GET /liveness`
   - process-only signal
   - expected `200` while the process is alive
3. `GET /readiness`
   - dependency-aware signal
   - expected `200` only when the node can serve real traffic
   - expected `503` on Redis/PostgreSQL/queue/upstream-guard unavailability
4. `GET /metrics`
   - Prometheus-compatible
   - non-public
   - scraped from the ops network only

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

## Managed Service Posture

1. Redis single managed instance is the 100K default for cache + quota guard + BullMQ.
2. PostgreSQL single managed primary with backups/failover/pooler is the 100K default.
3. Read replicas and Redis Cluster are explicitly deferred to the 1M trigger section.

## Quota and Degradation Policy

Priority classes applied to upstream consumption:

1. `critical_user`
   - match details, competition matches, team overview
2. `interactive_secondary`
   - searches and enrichments not blocking the main journey
3. `background`
   - non-urgent warmups, fanout-adjacent jobs, prefetch paths

Under budget tension:

1. `background` traffic degrades first
2. `interactive_secondary` serves stale or reduced freshness before spending fresh budget
3. `critical_user` preserves quota headroom last

## Observability Baseline

1. structured JSON logs around Fastify/Pino
2. centralized logs to managed Loki-compatible backend
3. `/metrics` scraped by a Prometheus-compatible collector
4. dashboards required for:
   - p95 critical routes
   - cache hit/miss/stale
   - API-Football quota usage
   - circuit breaker families
   - Redis/PostgreSQL saturation
   - notification queue lag and delivery failures

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

## Benchmark Reporting Policy

1. No benchmark number is considered valid unless produced by a dated staging or production smoke artifact.
2. The table below tracks execution status only; it must not be filled with inferred values.
3. Production load remains limited to low-intensity smoke after canary.

## Reporting Format

| Profile | Last run | Evidence source | p95 read latency | queue lag p95 | send failure ratio | deferred backlog max | status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 10K | not-run | ci-artifact-pending | not-measured | not-measured | not-measured | not-measured | pending-execution |
| 100K | not-run | ci-artifact-pending | not-measured | not-measured | not-measured | not-measured | pending-execution |
| 1M model | not-run | ci-artifact-pending | not-measured | not-measured | not-measured | not-measured | pending-execution |

## Gate Conditions

Release gate passes only when:

1. Read p95 <= 1200 ms on target routes.
2. No uncontrolled upstream burst during cache expiry tests.
3. `notifications_queue_lag_ms` p95 < 60 s.
4. Delivery failures < 5% over 15 minutes.
5. Immediate fanout never exceeds configured cap (default 10 000/event).

## 1M Trigger Thresholds

The 100K phase stops being the default operating model when one of the following conditions is sustained for `15 minutes`:

### Redis Cluster trigger

1. `redis_used_memory_ratio >= 0.70`
2. `redis_cpu_ratio >= 0.65`
3. combined cache + queue throughput `>= 10 000 ops/min`

### PostgreSQL read replica trigger

1. read latency p95 `> 250 ms`
2. active connections `> 80%` of pool capacity
3. `postgres_cpu_ratio >= 0.70`

### Kubernetes adoption trigger

1. more than `4` long-lived production nodes are required across API/worker roles
2. PM2/VPS rollouts require multi-host choreography often enough to create operational instability
3. the platform needs automated rolling deployments and self-healing beyond what the PM2 runbook can provide safely
