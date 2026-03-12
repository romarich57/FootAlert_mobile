import { useMemo } from 'react';

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
  const fullMatches = useMemo(
    () =>
      fullPlayerQuery.data
        ? selectPlayerMatchesFromFull(fullPlayerQuery.data as PlayerFullPayload)
        : undefined,
    [fullPlayerQuery.data],
  );
  const activeQuery = {
    ...fullPlayerQuery,
    data: fullMatches as PlayerMatchPerformance[] | undefined,
  };

  return {
    matches: activeQuery.data ?? [],
    isLoading: activeQuery.isLoading,
    isError: activeQuery.isError,
    dataUpdatedAt: activeQuery.dataUpdatedAt,
    refetch: activeQuery.refetch,
  };
}
