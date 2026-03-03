# Notifications Runbook (BFF + Worker)

## Scope

This runbook covers production incidents for the notifications pipeline:

- event ingestion (`POST /v1/notifications/events`)
- dispatch queue (`notifications.dispatch`)
- deferred promotion queue (`notifications.deferred-promotion`)
- send queue (`notifications.send`)
- dead-letter queue (`notifications.dlq`)
- delivery/open tracking persistence in PostgreSQL

For rollout sequencing and canary policy, see:

- `docs/infra/notifications-prod-rollout.md`

## Feature Flags / Kill Switches

Use these env flags to reduce blast radius without destructive rollback:

- `NOTIFICATIONS_BACKEND_ENABLED`
- `NOTIFICATIONS_EVENT_INGEST_ENABLED`
- `NOTIFICATIONS_MATCH_BACKEND_ENABLED` (mobile rollout guard for match scope)

## Primary Signals

Monitor:

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

Log correlation keys:

- `eventId`
- `jobId`
- `deliveryId`
- `deviceId`

## Incident Triage

1. Check worker health and recent restarts.
2. Check queue lag and DLQ depth.
3. Check deferred backlog (`notifications_deferred_backlog`) and promotion cadence.
4. Check failure ratio (`failed / sent`) on 5-minute windows.
5. Inspect recent `send_batch_result` logs for error patterns.
6. Determine if failure is transient (provider/network) or permanent (invalid token/payload).

## Response Playbook

### A) Failure spike with high queue lag

1. Keep ingestion enabled if backlog can drain, otherwise set `NOTIFICATIONS_EVENT_INGEST_ENABLED=false`.
2. Scale worker concurrency/replicas.
3. Validate Redis and PostgreSQL latency.
4. Re-enable ingestion when lag returns below threshold.

### B) Invalid token spike

1. Confirm Firebase error codes include token invalidation patterns.
2. Ensure devices are marked `invalid` and no longer selected.
3. Keep pipeline running; invalidation is expected cleanup behavior.

### C) Provider outage / transient errors

1. Keep retries enabled (BullMQ exponential backoff).
2. Watch retry success before forcing manual intervention.
3. If retries saturate, temporarily disable ingestion and drain/retry later.

### D) Deferred backlog growth

1. Check `NOTIFICATIONS_FANOUT_MAX_PER_EVENT` and event recipient distribution.
2. Verify `NOTIFICATIONS_DEFERRED_PROMOTION_BATCH` and `NOTIFICATIONS_DEFERRED_DELAY_MS` values.
3. Temporarily increase promotion batch only if Redis/DB latency remains stable.
4. Do not remove fanout cap in production incident mode.

## DLQ Replay Procedure

1. Identify affected window (`occurred_at`, `created_at`).
2. Export failed jobs from `notifications.dlq`.
3. Reconstruct original payload:
   - `dispatch_failed`: replay on `notifications.dispatch`
   - `send_failed`: replay on `notifications.send`
4. Replay in controlled batches.
5. Verify:
   - deliveries status transitions
   - queue lag normalization
   - failure ratio back under threshold

## Validation Checklist After Recovery

1. New events are accepted and enqueued.
2. Dispatch creates expected deliveries.
3. Send marks `sent` and no abnormal DLQ growth.
4. Open tracking (`/v1/notifications/opened`) updates delivery status.
5. Dashboards and alerts are back to normal thresholds.
6. Deferred backlog returns to nominal range.

## Postmortem Inputs

Capture:

- incident start/end timestamps
- impacted scopes (`match/team/player/competition`)
- failing error codes by count
- DLQ size and replay volume
- corrective actions and prevention items
