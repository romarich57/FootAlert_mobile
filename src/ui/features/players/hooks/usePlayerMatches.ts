import { useMemo } from 'react';

import { isHydrationSectionLoading } from '@domain/contracts/fullPayloadHydration.types';
import {
  usePlayerFullQuery,
  type PlayerFullPayload,
} from '@ui/features/players/hooks/playerFullQuery';
import type { PlayerMatchPerformance } from '@ui/features/players/types/players.types';

function selectPlayerMatchesFromFull(
  payload: PlayerFullPayload,
): PlayerMatchPerformance[] {
  return payload.matches.response ?? [];
}

export function usePlayerMatches(
  playerId: string,
  _teamId: string,
  season: number,
  enabled: boolean = true,
) {
  const fullPlayerQuery = usePlayerFullQuery(
    playerId,
    season,
    enabled && !!playerId && !!season,
  );
  const isMatchesSectionLoading = isHydrationSectionLoading(
    fullPlayerQuery.hydration,
    'matches',
  );
  const fullMatches = useMemo(
    () =>
      fullPlayerQuery.data && !isMatchesSectionLoading
        ? selectPlayerMatchesFromFull(fullPlayerQuery.data as PlayerFullPayload)
        : undefined,
    [fullPlayerQuery.data, isMatchesSectionLoading],
  );
  const activeQuery = {
    ...fullPlayerQuery,
    data: fullMatches as PlayerMatchPerformance[] | undefined,
  };

  return {
    matches: activeQuery.data ?? [],
    isLoading: activeQuery.isLoading || isMatchesSectionLoading,
    isError: activeQuery.isError,
    dataUpdatedAt: activeQuery.dataUpdatedAt,
    refetch: activeQuery.refetch,
  };
}
