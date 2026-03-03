import type { HttpAdapter } from '../adapters/http';
import type { TelemetryAdapter } from '../adapters/telemetry';
type FollowsServiceDependencies = {
    http: HttpAdapter;
    telemetry: TelemetryAdapter;
};
export declare function createFollowsReadService({ http, telemetry }: FollowsServiceDependencies): {
    searchTeams<T = unknown>(query: string, signal?: AbortSignal): Promise<T[]>;
    searchPlayers<T = unknown>(query: string, season?: number, signal?: AbortSignal): Promise<T[]>;
    fetchTeamDetails<T = unknown>(teamId: string, signal?: AbortSignal): Promise<T | null>;
    fetchTeamNextFixture<T = unknown>(teamId: string, timezone: string, signal?: AbortSignal): Promise<T | null>;
    fetchPlayerSeason<T = unknown>(playerId: string, season: number, signal?: AbortSignal): Promise<T | null>;
    fetchTeamsTrends<T = unknown>(leagueIds: string, season: number, signal?: AbortSignal): Promise<T[]>;
    fetchPlayersTrends<T = unknown>(leagueIds: string, season: number, signal?: AbortSignal): Promise<T[]>;
};
export {};
//# sourceMappingURL=followsService.d.ts.map