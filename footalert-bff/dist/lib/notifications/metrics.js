const counters = new Map();
const gauges = new Map();
export function incrementNotificationMetric(name, amount = 1) {
    counters.set(name, (counters.get(name) ?? 0) + amount);
}
export function setNotificationGauge(name, value) {
    gauges.set(name, value);
}
export function getNotificationsMetricsSnapshot() {
    return {
        counters: Object.fromEntries(counters.entries()),
        gauges: Object.fromEntries(gauges.entries()),
    };
}
export function resetNotificationsMetricsForTests() {
    counters.clear();
    gauges.clear();
}
