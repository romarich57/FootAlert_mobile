import { z } from 'zod';
import type { TelemetryAdapter } from '../adapters/telemetry.js';
export type RuntimeValidationOptions<T> = {
    schema: z.ZodType<T>;
    payload: unknown;
    fallback: T;
    telemetry: TelemetryAdapter;
    feature: string;
    endpoint: string;
};
export declare function parseRuntimePayloadOrFallback<T>({ schema, payload, fallback, telemetry, feature, endpoint, }: RuntimeValidationOptions<T>): T;
//# sourceMappingURL=validation.d.ts.map