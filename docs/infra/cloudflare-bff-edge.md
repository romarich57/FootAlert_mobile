# Cloudflare Edge Front Door (BFF)

## Goal

Expose BFF API nodes behind a single public edge while keeping BFF stateless.

## Recommended Topology

1. Cloudflare DNS record for `api.footalert.com`.
2. Origin pool:
   - API node A (`footalert-bff` via PM2 cluster).
   - API node B (`footalert-bff` via PM2 cluster).
3. Dedicated worker node C for `footalert-bff-worker`.
4. Shared external Redis + PostgreSQL for all nodes.
5. Managed observability sinks for metrics/logs (Grafana Cloud style stack).

## Edge Controls

1. TLS mode: Full (strict).
2. WAF and bot protections enabled.
3. Health checks on `/readiness`, not `/health`.
4. Origin failover if one API node returns `503` on `/readiness`.
5. Keep `/health` for compatibility only; it must not drive origin pool decisions.
6. Keep API caching at BFF level; do not add aggressive edge cache for authenticated routes.

## Rollout Checklist

1. Validate both API nodes with:
   - `GET /liveness` for process health,
   - `GET /readiness` for dependency health,
   - `GET /metrics` from the ops network.
2. Add both origins to Cloudflare load balancing pool.
3. Enable weighted traffic (10%/90%, then 50%/50%).
4. Watch:
   - p95 route latency,
   - `notifications_queue_lag_ms`,
   - upstream quota/circuit breaker errors,
   - Redis/PostgreSQL saturation,
   - origin readiness flaps.
5. Configure health-check path `/readiness` with a short timeout and automatic pool eviction.
6. Promote to full edge load balancing once stable.

## Health Check Contract

1. `/liveness`
   - expected status: `200`
   - purpose: detect dead process only
2. `/readiness`
   - expected status: `200` when the node can serve traffic
   - expected status: `503` when Redis/PostgreSQL/queue/upstream guard is not ready
3. `/health`
   - compatibility endpoint only
   - not used by Cloudflare pools in the 100K design

## Edge Failure Policy

1. Any API origin returning `503` on `/readiness` is removed from rotation automatically.
2. Worker nodes are never exposed as Cloudflare origins.
3. Cloudflare LB remains the single public front door until the platform crosses the explicit 1M triggers documented in the scalability baseline.
