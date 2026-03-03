type CounterName =
  | 'notifications_events_received_total'
  | 'notifications_jobs_enqueued_total'
  | 'notifications_deliveries_sent_total'
  | 'notifications_deliveries_failed_total'
  | 'notifications_deliveries_deferred_total'
  | 'notifications_deferred_promotions_total'
  | 'notifications_invalid_token_total'
  | 'notifications_opened_total';

type GaugeName =
  | 'notifications_queue_lag_ms'
  | 'notifications_delivery_latency_ms'
  | 'notifications_deferred_backlog';

const counters = new Map<CounterName, number>();
const gauges = new Map<GaugeName, number>();

export function incrementNotificationMetric(name: CounterName, amount = 1): void {
  counters.set(name, (counters.get(name) ?? 0) + amount);
}

export function setNotificationGauge(name: GaugeName, value: number): void {
  gauges.set(name, value);
}

export function getNotificationsMetricsSnapshot(): {
  counters: Record<string, number>;
  gauges: Record<string, number>;
} {
  return {
    counters: Object.fromEntries(counters.entries()),
    gauges: Object.fromEntries(gauges.entries()),
  };
}

export function resetNotificationsMetricsForTests(): void {
  counters.clear();
  gauges.clear();
}
