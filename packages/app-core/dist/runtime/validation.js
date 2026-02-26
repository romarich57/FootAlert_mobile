export function parseRuntimePayloadOrFallback({ schema, payload, fallback, telemetry, feature, endpoint, }) {
    const parsedPayload = schema.safeParse(payload);
    if (parsedPayload.success) {
        return parsedPayload.data;
    }
    telemetry.addBreadcrumb('network.payload_validation_failed', {
        endpoint,
        feature,
    });
    telemetry.trackError(parsedPayload.error, {
        feature,
        endpoint,
    });
    return fallback;
}
