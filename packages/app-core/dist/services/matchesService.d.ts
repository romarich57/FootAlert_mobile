import type { HttpAdapter } from '../adapters/http';
import type { TelemetryAdapter } from '../adapters/telemetry';
type MatchesServiceDependencies = {
    http: HttpAdapter;
    telemetry: TelemetryAdapter;
};
export declare function createMatchesReadService({ http, telemetry }: MatchesServiceDependencies): {
    fetchFixturesByDate<T = unknown>(params: {
        date: string;
        timezone: string;
        signal?: AbortSignal;
    }): Promise<T[]>;
    fetchFixtureById<T = unknown>(params: {
        fixtureId: string;
        timezone: string;
        signal?: AbortSignal;
    }): Promise<T | null>;
};
export {};
//# sourceMappingURL=matchesService.d.ts.map