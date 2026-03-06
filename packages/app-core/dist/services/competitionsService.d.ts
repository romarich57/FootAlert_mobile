import type { HttpAdapter } from '../adapters/http.js';
import type { TelemetryAdapter } from '../adapters/telemetry.js';
import type { ListEnvelope } from '../domain/network.js';
type CompetitionsServiceDependencies = {
    http: HttpAdapter;
    telemetry: TelemetryAdapter;
};
export declare function createCompetitionsReadService({ http, telemetry }: CompetitionsServiceDependencies): {
    fetchAllLeagues<T = unknown>(signal?: AbortSignal): Promise<T[]>;
    searchLeaguesByName<T = unknown>(query: string, signal?: AbortSignal): Promise<T[]>;
    fetchLeagueById<T = unknown>(id: string, signal?: AbortSignal): Promise<T | null>;
    fetchLeagueStandings<T = unknown>(leagueId: number, season: number, signal?: AbortSignal): Promise<T | null>;
    fetchLeagueFixtures<T = unknown>(leagueId: number, season: number, signal?: AbortSignal, options?: {
        limit?: number;
        cursor?: string;
    }): Promise<T[]>;
    fetchLeagueFixturesPage<T = unknown>(leagueId: number, season: number, signal?: AbortSignal, options?: {
        limit?: number;
        cursor?: string;
    }): Promise<ListEnvelope<T>>;
    fetchLeaguePlayerStats<T = unknown>(leagueId: number, season: number, type: "topscorers" | "topassists" | "topyellowcards" | "topredcards", signal?: AbortSignal): Promise<T[]>;
    fetchLeagueTransfers<T = unknown>(leagueId: number, season?: number, signal?: AbortSignal): Promise<T[]>;
    fetchCompetitionBracket<T = unknown>(leagueId: number, season: number, signal?: AbortSignal): Promise<T>;
    fetchCompetitionTotw<T = unknown>(leagueId: number, season: number, signal?: AbortSignal): Promise<{
        topScorers: T[];
        topAssists: T[];
        topYellowCards: T[];
        topRedCards: T[];
    }>;
};
export {};
//# sourceMappingURL=competitionsService.d.ts.map