const metricStore = new Map<string, number>();

export type MobileAuthMetricName =
  | 'mobile_auth_attest_success_total'
  | 'mobile_auth_attest_failure_total';

export function incrementMobileAuthMetric(name: MobileAuthMetricName): void {
  metricStore.set(name, (metricStore.get(name) ?? 0) + 1);
}

export function readMobileAuthMetricsForTests(): Record<string, number> {
  const next: Record<string, number> = {};
  for (const [name, value] of metricStore.entries()) {
    next[name] = value;
  }
  return next;
}

export function resetMobileAuthMetricsForTests(): void {
  metricStore.clear();
}
