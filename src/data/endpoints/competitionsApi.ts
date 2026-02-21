import { httpGet } from '@data/api/http/client';
import { getApiFootballEnvOrThrow } from '@data/config/env';
import type {
    CompetitionsApiLeagueDto,
    CompetitionsApiResponse,
} from '@ui/features/competitions/types/competitions.types';

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

export async function fetchAllLeagues(signal?: AbortSignal): Promise<CompetitionsApiLeagueDto[]> {
    const requestUrl = buildRequestUrl('/leagues');
    const payload = await httpGet<CompetitionsApiResponse<CompetitionsApiLeagueDto>>(requestUrl, {
        signal,
        headers: buildAuthHeaders(),
    });

    return payload.response;
}

export async function searchLeaguesByName(
    query: string,
    signal?: AbortSignal,
): Promise<CompetitionsApiLeagueDto[]> {
    const requestUrl = buildRequestUrl(`/leagues?search=${encodeURIComponent(query)}`);
    const payload = await httpGet<CompetitionsApiResponse<CompetitionsApiLeagueDto>>(requestUrl, {
        signal,
        headers: buildAuthHeaders(),
    });

    return payload.response;
}

export async function fetchLeagueById(
    id: string,
    signal?: AbortSignal,
): Promise<CompetitionsApiLeagueDto | null> {
    const requestUrl = buildRequestUrl(`/leagues?id=${encodeURIComponent(id)}`);
    const payload = await httpGet<CompetitionsApiResponse<CompetitionsApiLeagueDto>>(requestUrl, {
        signal,
        headers: buildAuthHeaders(),
    });

    return payload.response[0] ?? null;
}
