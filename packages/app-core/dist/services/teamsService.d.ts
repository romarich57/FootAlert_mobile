import type { HttpAdapter } from '../adapters/http.js';
import type { TelemetryAdapter } from '../adapters/telemetry.js';
import type { PagedEnvelope } from '../domain/network.js';
type TeamsServiceDependencies = {
    http: HttpAdapter;
    telemetry: TelemetryAdapter;
};
export declare function createTeamsReadService({ http, telemetry }: TeamsServiceDependencies): {
    fetchTeamDetails<T = unknown>(teamId: string, signal?: AbortSignal): Promise<T | null>;
    fetchTeamLeagues<T = unknown>(teamId: string, signal?: AbortSignal): Promise<T[]>;
    fetchTeamFixtures<T = unknown>(params: {
        teamId: string;
        season?: number;
        leagueId?: string | null;
        timezone?: string;
        next?: number;
    }, signal?: AbortSignal): Promise<T[]>;
    fetchTeamNextFixture<T = unknown>(teamId: string, timezone: string, signal?: AbortSignal): Promise<T | null>;
    fetchLeagueStandings<T = unknown>(leagueId: string, season: number, signal?: AbortSignal): Promise<T | null>;
    fetchTeamStatistics<T = unknown>(leagueId: string, season: number, teamId: string, signal?: AbortSignal): Promise<T | null>;
    fetchTeamOverview<T = unknown>(params: {
        teamId: string;
        leagueId: string;
        season: number;
        timezone: string;
        historySeasons?: number[];
    }, signal?: AbortSignal): Promise<T>;
    fetchTeamOverviewLeaders<T = unknown>(params: {
        teamId: string;
        leagueId: string;
        season: number;
    }, signal?: AbortSignal): Promise<T>;
    fetchTeamAdvancedStats<T = unknown>(leagueId: string, season: number, teamId: string, signal?: AbortSignal): Promise<T | null>;
    fetchTeamPlayers<T = unknown>(params: {
        teamId: string;
        leagueId: string;
        season: number;
        page?: number;
        limit?: number;
        cursor?: string;
    }, signal?: AbortSignal): Promise<PagedEnvelope<T>>;
    fetchTeamSquad<T = unknown>(teamId: string, signal?: AbortSignal): Promise<T | null>;
    fetchTeamTransfers<T = unknown>(params: {
        teamId: string;
        season?: number;
    }, signal?: AbortSignal): Promise<T[]>;
    fetchTeamTrophies<T = unknown>(teamId: string, signal?: AbortSignal): Promise<T[]>;
};
export {};
//# sourceMappingURL=teamsService.d.ts.map