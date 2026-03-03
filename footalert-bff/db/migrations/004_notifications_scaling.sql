CREATE INDEX IF NOT EXISTS idx_notification_deliveries_event_status_created
ON notification_deliveries (event_fk, status, created_at);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_device_status_created
ON notification_deliveries (device_fk, status, created_at);

CREATE INDEX IF NOT EXISTS idx_push_devices_status_last_seen
ON push_devices (status, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_events_status_occurred
ON notification_events (status, occurred_at DESC);
