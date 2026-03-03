# Notifications Prod Rollout (BFF + Worker)

## Scope

This document defines the release procedure for notifications in production:

- same VPS topology with PM2 (`footalert-bff` + `footalert-bff-worker`)
- manual PostgreSQL migration before process restart
- canary rollout by mobile app version

## 1) Secrets and env checklist

### BFF staging/prod runtime

- `API_FOOTBALL_KEY`
- `MOBILE_SESSION_JWT_SECRET`
- `NOTIFICATIONS_BACKEND_ENABLED=true`
- `NOTIFICATIONS_EVENT_INGEST_ENABLED=true`
- `NOTIFICATIONS_PERSISTENCE_BACKEND=postgres`
- `NOTIFICATIONS_FANOUT_MAX_PER_EVENT=10000`
- `NOTIFICATIONS_DEFERRED_PROMOTION_BATCH`
- `NOTIFICATIONS_DEFERRED_DELAY_MS`
- `CACHE_TTL_JITTER_PCT`
- `CACHE_LOCK_TTL_MS`
- `CACHE_COALESCE_WAIT_MS`
- `UPSTREAM_GLOBAL_RPM_LIMIT`
- `UPSTREAM_CIRCUIT_BREAKER_WINDOW_MS`
- `DATABASE_URL`
- `REDIS_URL`
- `NOTIFICATIONS_INGEST_TOKEN`
- `PUSH_TOKEN_ENCRYPTION_KEY`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

### GitHub Environment secrets (production)

- `PROD_VPS_SSH_HOST`
- `PROD_VPS_SSH_USERNAME`
- `PROD_VPS_SSH_KEY`
- `MOBILE_API_BASE_URL_PRODUCTION`

### Mobile rollout variable (by app version)

- Canary version: `NOTIFICATIONS_MATCH_BACKEND_ENABLED=true`
- Stable version before ramp: `NOTIFICATIONS_MATCH_BACKEND_ENABLED=false`

## 2) Manual migration (blocking pre-deploy step)

Run before restarting app/worker:

```bash
cd ~/foot_mobile/FootAlert_mobile/footalert-bff
DATABASE_URL='***' npm run db:migrate:notifications
```

Immediate verification:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema='public'
AND table_name IN ('push_devices','push_subscriptions','notification_events','notification_deliveries');
```

```sql
SELECT COUNT(*) FROM push_devices;
SELECT COUNT(*) FROM push_subscriptions;
```

If migration fails, stop rollout and do not restart PM2 processes.
The production workflow (`bff-production.yml`) must be dispatched with `migration_confirmed=yes` only after this step.

## 3) PM2 convergence commands

```bash
cd ~/foot_mobile/FootAlert_mobile/footalert-bff
git pull origin main
npm ci
npm run build
pm2 describe footalert-bff >/dev/null 2>&1 || pm2 start dist/index.js --name footalert-bff
pm2 describe footalert-bff-worker >/dev/null 2>&1 || pm2 start dist/worker.js --name footalert-bff-worker
pm2 restart footalert-bff --update-env
pm2 restart footalert-bff-worker --update-env
pm2 save
```

## 4) Staging dress rehearsal

1. Run full staging workflow (`bff-staging.yml`).
2. Confirm worker emits logs:
- `dispatch_resolved_recipients`
- `deferred_promotion_job_failed` absent in normal flow
- `send_batch_result`
3. Validate flow:
- token registration -> subscription upsert -> event ingest -> push received -> opened tracked
4. Validate metrics endpoint:
- `notifications_events_received_total`
- `notifications_jobs_enqueued_total`
- `notifications_deliveries_sent_total`
- `notifications_deliveries_failed_total`
- `notifications_invalid_token_total`
- `notifications_opened_total`
- `notifications_deliveries_deferred_total`
- `notifications_deferred_promotions_total`
- `notifications_queue_lag_ms`
- `notifications_delivery_latency_ms`
- `notifications_deferred_backlog`

## 5) Production canary by app version

### Step A: infra canary (0% mobile)

- Deploy BFF + worker in production.
- Keep stable app version on `NOTIFICATIONS_MATCH_BACKEND_ENABLED=false`.
- Verify base health and queue behavior.

### Step B: producer canary

- Send restricted/controlled notification events.
- Observe for 60 minutes.

### Step C: mobile app canary

- Release canary app version with `NOTIFICATIONS_MATCH_BACKEND_ENABLED=true`.
- Start with 5% Android staged rollout and restricted iOS cohort.

### Step D: ramp

- 5% -> 20% -> 50% -> 100%
- Minimum 60-minute stable window before next step.

### Ramp gates

- `queue_lag_ms` p95 < 60_000
- failure rate (`failed_total / (sent_total + failed_total)`) < 5% over 15 minutes
- immediate fanout per event <= `NOTIFICATIONS_FANOUT_MAX_PER_EVENT`
- no continuous DLQ growth
- no P1/P2 notifications incident

## 6) Rollback (non-destructive)

1. Disable ingestion:
- `NOTIFICATIONS_EVENT_INGEST_ENABLED=false`
2. Remove match impact by app version:
- publish fallback app version with `NOTIFICATIONS_MATCH_BACKEND_ENABLED=false`
3. If necessary, disable notifications backend:
- `NOTIFICATIONS_BACKEND_ENABLED=false`
4. Keep worker alive for drain/inspection and follow:
- `docs/infra/notifications-runbook.md`
