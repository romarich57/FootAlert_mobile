# PM2 Scaling Runbook (VPS Multi-Node)

## Scope

Scale FootAlert BFF beyond single VPS while keeping PM2 (no Kubernetes in this phase).

## Target Layout

1. Node A/B: API only (`footalert-bff` in PM2 cluster mode).
2. Node C: workers only (`footalert-bff-worker`).
3. Shared Redis + PostgreSQL.

## PM2 Commands

### API node bootstrap

```bash
cd ~/foot_mobile/FootAlert_mobile/footalert-bff
npm ci
npm run build
pm2 describe footalert-bff >/dev/null 2>&1 || pm2 start dist/index.js --name footalert-bff --exec-mode cluster --instances max
pm2 restart footalert-bff --update-env
pm2 scale footalert-bff max
pm2 save
```

### Worker node bootstrap

```bash
cd ~/foot_mobile/FootAlert_mobile/footalert-bff
npm ci
npm run build
pm2 describe footalert-bff-worker >/dev/null 2>&1 || pm2 start dist/worker.js --name footalert-bff-worker
pm2 restart footalert-bff-worker --update-env
pm2 save
```

## Scale-Out Triggers

Scale out when one or more conditions are sustained:

1. CPU > 70%.
2. `notifications_queue_lag_ms` p95 > 60s.
3. p95 read routes > 1200ms.

## Scale-Down Guardrails

1. Never scale worker node down during backlog drain.
2. Keep at least 2 API instances active during production traffic windows.
3. Confirm queue lag and delivery failure ratio are stable before reducing capacity.

## Operational Notes

1. Keep API and worker roles separated by node.
2. Preserve stateless API behavior; no local-only state assumptions.
3. Re-check circuit breaker and quota env values after each rollout.
