import type {
  ApiFootballFixtureDto,
  MatchLifecycleState,
} from '@ui/features/matches/types/matches.types';

type ProjectionRowBase = {
  teamId: string | null;
  rank: number | null;
  points: number | null;
  goalDiff: number | null;
};

type ApplyLiveStandingsProjectionParams<T extends ProjectionRowBase> = {
  rows: T[];
  lifecycleState: MatchLifecycleState;
  fixture: ApiFootballFixtureDto | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
};

function resolveLivePointsDelta(fixture: ApiFootballFixtureDto | null): { home: number; away: number } | null {
  if (!fixture) {
    return null;
  }

  const homeGoals = fixture.goals.home;
  const awayGoals = fixture.goals.away;
  if (homeGoals === null || awayGoals === null) {
    return null;
  }

  if (homeGoals > awayGoals) {
    return { home: 3, away: 0 };
  }

  if (awayGoals > homeGoals) {
    return { home: 0, away: 3 };
  }

  return { home: 1, away: 1 };
}

export function applyLiveStandingsProjection<T extends ProjectionRowBase>({
  rows,
  lifecycleState,
  fixture,
  homeTeamId,
  awayTeamId,
}: ApplyLiveStandingsProjectionParams<T>): T[] {
  if (lifecycleState !== 'live') {
    return rows;
  }

  const pointsDelta = resolveLivePointsDelta(fixture);
  if (!pointsDelta) {
    return rows;
  }

  const projectedRows = rows.map(row => {
    if (row.teamId === homeTeamId) {
      return {
        ...row,
        points: (row.points ?? 0) + pointsDelta.home,
      };
    }

    if (row.teamId === awayTeamId) {
      return {
        ...row,
        points: (row.points ?? 0) + pointsDelta.away,
      };
    }

    return row;
  });

  return [...projectedRows]
    .sort((left, right) => {
      if ((right.points ?? 0) !== (left.points ?? 0)) {
        return (right.points ?? 0) - (left.points ?? 0);
      }

      return (right.goalDiff ?? 0) - (left.goalDiff ?? 0);
    })
    .map((row, index) => ({
      ...row,
      rank: index + 1,
    }));
}
