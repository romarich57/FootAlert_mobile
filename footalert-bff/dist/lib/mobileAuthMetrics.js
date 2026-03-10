const metricStore = new Map();
export function incrementMobileAuthMetric(name) {
    metricStore.set(name, (metricStore.get(name) ?? 0) + 1);
}
export function readMobileAuthMetricsForTests() {
    const next = {};
    for (const [name, value] of metricStore.entries()) {
        next[name] = value;
    }
    return next;
}
export function resetMobileAuthMetricsForTests() {
    metricStore.clear();
}
