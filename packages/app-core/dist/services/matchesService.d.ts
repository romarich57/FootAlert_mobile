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
    fetchFixtureEvents<T = unknown>(params: {
        fixtureId: string;
        signal?: AbortSignal;
    }): Promise<T[]>;
    fetchFixtureStatistics<T = unknown>(params: {
        fixtureId: string;
        signal?: AbortSignal;
    }): Promise<T[]>;
    fetchFixtureLineups<T = unknown>(params: {
        fixtureId: string;
        signal?: AbortSignal;
    }): Promise<T[]>;
    fetchFixturePredictions<T = unknown>(params: {
        fixtureId: string;
        signal?: AbortSignal;
    }): Promise<T[]>;
    fetchFixturePlayersStatsByTeam<T = unknown>(params: {
        fixtureId: string;
        teamId: string;
        signal?: AbortSignal;
    }): Promise<T[]>;
    fetchFixtureAbsences<T = unknown>(params: {
        fixtureId: string;
        timezone?: string;
        signal?: AbortSignal;
    }): Promise<T[]>;
    fetchFixtureHeadToHead<T = unknown>(params: {
        fixtureId: string;
        last?: number;
        timezone?: string;
        signal?: AbortSignal;
    }): Promise<T[]>;
};
export {};
//# sourceMappingURL=matchesService.d.ts.map