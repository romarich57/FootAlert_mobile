import type { HttpAdapter } from '../adapters/http.js';
import type { TelemetryAdapter } from '../adapters/telemetry.js';
type MatchesServiceDependencies = {
    http: HttpAdapter;
    telemetry: TelemetryAdapter;
};
export type MatchFullResponse<TFixture = unknown, TDataset = unknown> = {
    fixture: TFixture | null;
    lifecycleState: 'pre_match' | 'live' | 'finished';
    context: {
        leagueId: string | number | null;
        season: string | number | null;
        homeTeamId: string | number | null;
        awayTeamId: string | number | null;
    };
    events: TDataset[];
    statistics: {
        all: TDataset[];
        first: TDataset[];
        second: TDataset[];
    };
    lineups: TDataset[];
    predictions: TDataset[];
    absences: TDataset[];
    headToHead: TDataset[];
    standings: TDataset | null;
    homeRecentResults: TDataset[];
    awayRecentResults: TDataset[];
    homeLeaders: TDataset | null;
    awayLeaders: TDataset | null;
    playersStats: {
        homeTeamId: string | number | null;
        awayTeamId: string | number | null;
        home: TDataset[];
        away: TDataset[];
    };
};
export declare function createMatchesReadService({ http, telemetry }: MatchesServiceDependencies): {
    fetchFixturesByDate<T = unknown>(params: {
        date: string;
        timezone: string;
        limit?: number;
        cursor?: string;
        signal?: AbortSignal;
    }): Promise<T[]>;
    fetchFixtureById<T = unknown>(params: {
        fixtureId: string;
        timezone: string;
        signal?: AbortSignal;
    }): Promise<T | null>;
    fetchMatchFull<TFixture = unknown, TDataset = unknown>(params: {
        fixtureId: string;
        timezone: string;
        signal?: AbortSignal;
    }): Promise<MatchFullResponse<TFixture, TDataset>>;
    fetchFixtureEvents<T = unknown>(params: {
        fixtureId: string;
        signal?: AbortSignal;
    }): Promise<T[]>;
    fetchFixtureStatistics<T = unknown>(params: {
        fixtureId: string;
        period?: "all" | "first" | "second";
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