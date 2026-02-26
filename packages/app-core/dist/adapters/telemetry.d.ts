export type TelemetryScalar = string | number | boolean | null | undefined;
export type TelemetryAttributes = Record<string, TelemetryScalar>;
export type TelemetryErrorContext = {
    feature: string;
    endpoint: string;
    details?: TelemetryAttributes;
};
export interface TelemetryAdapter {
    addBreadcrumb(name: string, attributes?: TelemetryAttributes): void;
    trackError(error: unknown, context: TelemetryErrorContext): void;
}
export declare const noopTelemetryAdapter: TelemetryAdapter;
//# sourceMappingURL=telemetry.d.ts.map