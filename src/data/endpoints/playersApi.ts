import { httpGet } from '@data/api/http/client';
import { getApiFootballEnvOrThrow } from '@data/config/env';
import type {
    PlayerApiDetailsDto,
    PlayerApiFixtureDto,
    PlayerApiMatchPerformanceDto,
    PlayerApiResponse,
    PlayerApiTrophyDto,
} from '@ui/features/players/types/players.types';

function buildRequestUrl(pathWithQuery: string): string {
    const { apiFootballBaseUrl } = getApiFootballEnvOrThrow();
    return `${apiFootballBaseUrl}${pathWithQuery}`;
}

function buildAuthHeaders(): Record<string, string> {
    const { apiFootballKey } = getApiFootballEnvOrThrow();
    return {
        'x-apisports-key': apiFootballKey,
    };
}

export async function fetchPlayerDetails(
    playerId: string,
    season: number,
    signal?: AbortSignal,
): Promise<PlayerApiDetailsDto | null> {
    const requestUrl = buildRequestUrl(
        `/players?id=${encodeURIComponent(playerId)}&season=${season}`,
    );
    const payload = await httpGet<PlayerApiResponse<PlayerApiDetailsDto>>(requestUrl, {
        signal,
        headers: buildAuthHeaders(),
    });

    return payload.response[0] ?? null;
}

export async function fetchPlayerSeasons(
    playerId: string,
    signal?: AbortSignal,
): Promise<number[]> {
    const requestUrl = buildRequestUrl(`/players/seasons?player=${encodeURIComponent(playerId)}`);
    const payload = await httpGet<PlayerApiResponse<number>>(requestUrl, {
        signal,
        headers: buildAuthHeaders(),
    });

    return payload.response ?? [];
}

export async function fetchPlayerTrophies(
    playerId: string,
    signal?: AbortSignal,
): Promise<PlayerApiTrophyDto[]> {
    const requestUrl = buildRequestUrl(`/trophies?player=${encodeURIComponent(playerId)}`);
    const payload = await httpGet<PlayerApiResponse<PlayerApiTrophyDto>>(requestUrl, {
        signal,
        headers: buildAuthHeaders(),
    });

    return payload.response ?? [];
}

/**
 * Note: Exploring player match performances requires fetching fixtures for their team,
 * and then looking up player stats per fixture. To avoid huge API call limits, we might
 * limit this to the last N fixtures of the team they are in.
 */
export async function fetchTeamFixtures(
    teamId: string,
    season: number,
    amount: number = 10,
    signal?: AbortSignal,
): Promise<PlayerApiFixtureDto[]> {
    const requestUrl = buildRequestUrl(
        `/fixtures?team=${encodeURIComponent(teamId)}&season=${season}&last=${amount}`,
    );
    const payload = await httpGet<PlayerApiResponse<PlayerApiFixtureDto>>(requestUrl, {
        signal,
        headers: buildAuthHeaders(),
    });

    return payload.response ?? [];
}

export async function fetchFixturePlayerStats(
    fixtureId: string,
    teamId: string,
    signal?: AbortSignal,
): Promise<PlayerApiMatchPerformanceDto | null> {
    const requestUrl = buildRequestUrl(
        `/fixtures/players?fixture=${encodeURIComponent(fixtureId)}&team=${encodeURIComponent(teamId)}`,
    );
    const payload = await httpGet<PlayerApiResponse<PlayerApiMatchPerformanceDto>>(requestUrl, {
        signal,
        headers: buildAuthHeaders(),
    });

    return payload.response[0] ?? null;
}
