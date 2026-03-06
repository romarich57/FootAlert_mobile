import type { HttpAdapter } from '../adapters/http.js';
import type { TelemetryAdapter } from '../adapters/telemetry.js';
type PlayersServiceDependencies = {
    http: HttpAdapter;
    telemetry: TelemetryAdapter;
};
export declare const PLAYER_MATCHES_LIMIT = 99;
export declare function createPlayersReadService({ http, telemetry }: PlayersServiceDependencies): {
    fetchPlayerDetails<T = unknown>(playerId: string, season: number, signal?: AbortSignal): Promise<T | null>;
    fetchPlayerSeasons(playerId: string, signal?: AbortSignal): Promise<number[]>;
    fetchPlayerTrophies<T = unknown>(playerId: string, signal?: AbortSignal): Promise<T[]>;
    fetchPlayerCareerAggregate<TSeason = unknown, TTeam = unknown>(playerId: string, signal?: AbortSignal): Promise<{
        seasons: TSeason[];
        teams: TTeam[];
    }>;
    fetchPlayerOverview<T = unknown>(playerId: string, season: number, signal?: AbortSignal): Promise<T | null>;
    fetchPlayerStatsCatalog<T = unknown>(playerId: string, signal?: AbortSignal): Promise<T | null>;
    fetchTeamFixtures<T = unknown>(teamId: string, season: number, amount?: number, signal?: AbortSignal): Promise<T[]>;
    fetchFixturePlayerStats<T = unknown>(fixtureId: string, teamId: string, signal?: AbortSignal): Promise<T | null>;
    fetchPlayerMatchesAggregate<T = unknown>(playerId: string, teamId: string, season: number, amount?: number, signal?: AbortSignal): Promise<T[]>;
};
export {};
//# sourceMappingURL=playersService.d.ts.map