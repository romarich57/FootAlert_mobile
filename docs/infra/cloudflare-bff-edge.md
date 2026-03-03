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

## Edge Controls

1. TLS mode: Full (strict).
2. WAF and bot protections enabled.
3. Health checks on `/health`.
4. Origin failover if one API node is unhealthy.
5. Keep API caching at BFF level; do not add aggressive edge cache for authenticated routes.

## Rollout Checklist

1. Validate both API nodes with direct health checks.
2. Add both origins to Cloudflare load balancing pool.
3. Enable weighted traffic (10%/90%, then 50%/50%).
4. Watch:
   - p95 route latency,
   - `notifications_queue_lag_ms`,
   - upstream quota/circuit breaker errors.
5. Promote to full edge load balancing once stable.
