import { bffGet } from '@data/endpoints/bffClient';
import type { BootstrapPayload } from '@domain/contracts/bootstrap.types';

type FetchBootstrapParams = {
  date: string;
  timezone: string;
  season: number;
  followedTeamIds: string[];
  followedPlayerIds: string[];
  discoveryLimit?: number;
  signal?: AbortSignal;
};

function toCsv(ids: string[]): string | undefined {
  if (ids.length === 0) {
    return undefined;
  }

  return ids.join(',');
}

export async function fetchBootstrapPayload({
  date,
  timezone,
  season,
  followedTeamIds,
  followedPlayerIds,
  discoveryLimit,
  signal,
}: FetchBootstrapParams): Promise<BootstrapPayload> {
  return bffGet<BootstrapPayload>(
    '/bootstrap',
    {
      date,
      timezone,
      season,
      followedTeamIds: toCsv(followedTeamIds),
      followedPlayerIds: toCsv(followedPlayerIds),
      discoveryLimit,
    },
    { signal },
  );
}
