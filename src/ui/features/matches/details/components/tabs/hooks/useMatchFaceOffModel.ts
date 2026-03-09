import { useCallback, useEffect, useMemo, useState } from 'react';

import { resolveAppLocaleTag } from '@ui/shared/i18n/locale';
import { parseH2HFixtures } from '@ui/features/matches/details/components/tabs/shared/matchFaceOffHelpers';
import type { MatchDetailsDatasetErrorReason } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabTypes';

const INITIAL_VISIBLE_FIXTURES = 10;
const LOAD_MORE_STEP = 10;

const toPercentWidth = (value: number): { width: `${number}%` } => ({
  width: `${value}%` as `${number}%`,
});

type UseMatchFaceOffModelParams = {
  headToHead: unknown[];
  homeTeamId: string | null;
  awayTeamId: string | null;
  language: string;
  hasDataError: boolean;
  dataErrorReason: MatchDetailsDatasetErrorReason;
};

export function useMatchFaceOffModel({
  headToHead,
  homeTeamId,
  awayTeamId,
  language,
  hasDataError,
  dataErrorReason,
}: UseMatchFaceOffModelParams) {
  const locale = useMemo(() => resolveAppLocaleTag(language), [language]);
  const [activeLeague, setActiveLeague] = useState('all');
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_FIXTURES);

  const { fixtures, summary } = useMemo(
    () => parseH2HFixtures(headToHead, homeTeamId ?? '', awayTeamId ?? ''),
    [awayTeamId, headToHead, homeTeamId],
  );

  const leagues = useMemo(() => {
    const seen = new Map<string, string>();
    for (const fixture of fixtures) {
      if (!seen.has(fixture.leagueId)) {
        seen.set(fixture.leagueId, fixture.leagueName);
      }
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [fixtures]);

  useEffect(() => {
    if (activeLeague === 'all') {
      return;
    }
    if (!leagues.some(league => league.id === activeLeague)) {
      setActiveLeague('all');
    }
  }, [activeLeague, leagues]);

  const filteredFixtures = useMemo(
    () => (activeLeague === 'all' ? fixtures : fixtures.filter(fixture => fixture.leagueId === activeLeague)),
    [activeLeague, fixtures],
  );
  const visibleFixtures = useMemo(
    () => filteredFixtures.slice(0, visibleCount),
    [filteredFixtures, visibleCount],
  );
  const canLoadMore = filteredFixtures.length > visibleCount;

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_FIXTURES);
  }, [activeLeague, fixtures]);

  const total = summary.total > 0 ? summary.total : 1;
  const homeBarPercent = Math.round((summary.homeWins / total) * 100);
  const drawBarPercent = Math.round((summary.draws / total) * 100);
  const awayBarPercent = summary.total > 0 ? 100 - homeBarPercent - drawBarPercent : 0;
  const homeBarWidthStyle = useMemo(() => toPercentWidth(homeBarPercent), [homeBarPercent]);
  const drawBarWidthStyle = useMemo(() => toPercentWidth(drawBarPercent), [drawBarPercent]);
  const awayBarWidthStyle = useMemo(() => toPercentWidth(awayBarPercent), [awayBarPercent]);

  const loadMore = useCallback(() => {
    setVisibleCount(currentCount => currentCount + LOAD_MORE_STEP);
  }, []);

  const emptyStateKey =
    hasDataError && dataErrorReason === 'endpoint_not_available'
      ? 'matchDetails.states.datasetErrorsUnsupported.faceOff'
      : hasDataError
        ? 'matchDetails.states.datasetErrors.faceOff'
        : 'matchDetails.faceOff.noData';

  return {
    locale,
    activeLeague,
    setActiveLeague,
    summary,
    leagues,
    visibleFixtures,
    filteredFixtures,
    canLoadMore,
    loadMore,
    homeBarWidthStyle,
    drawBarWidthStyle,
    awayBarWidthStyle,
    emptyStateKey,
  };
}
