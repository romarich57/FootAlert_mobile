import type {
  ApiFootballFixtureDto,
  MatchLifecycleState,
} from '@ui/features/matches/types/matches.types';
import type { TeamStandingStats } from '@ui/features/teams/types/teams.types';

type ProjectionRowBase = {
  teamId: string | null;
  rank: number | null;
  points: number | null;
  goalDiff: number | null;
  played: number | null;
  update: string | null;
  all: TeamStandingStats;
  home: TeamStandingStats;
  away: TeamStandingStats;
};

type ApplyLiveStandingsProjectionParams<T extends ProjectionRowBase> = {
  rows: T[];
  lifecycleState: MatchLifecycleState;
  fixture: ApiFootballFixtureDto | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
};

function resolveLiveMatchStats(fixture: ApiFootballFixtureDto | null) {
  if (!fixture) {
    return null;
  }

  const homeGoals = fixture.goals.home;
  const awayGoals = fixture.goals.away;
  if (homeGoals === null || awayGoals === null) {
    return null;
  }

  const homeWin = homeGoals > awayGoals;
  const awayWin = awayGoals > homeGoals;
  const draw = homeGoals === awayGoals;

  return {
    home: {
      points: homeWin ? 3 : draw ? 1 : 0,
      goalsFor: homeGoals,
      goalsAgainst: awayGoals,
      win: homeWin ? 1 : 0,
      draw: draw ? 1 : 0,
      lose: awayWin ? 1 : 0,
    },
    away: {
      points: awayWin ? 3 : draw ? 1 : 0,
      goalsFor: awayGoals,
      goalsAgainst: homeGoals,
      win: awayWin ? 1 : 0,
      draw: draw ? 1 : 0,
      lose: homeWin ? 1 : 0,
    },
  };
}

function isStandingAlreadyUpdated(updateText: string | null, fixtureDateRaw: string | null): boolean {
  if (!updateText || !fixtureDateRaw) {
    return false;
  }
  const updateTime = new Date(updateText).getTime();
  const fixtureTime = new Date(fixtureDateRaw).getTime();

  // If the standings update is more than 2 hours after the kickoff, it includes the match result.
  if (Number.isFinite(updateTime) && Number.isFinite(fixtureTime)) {
    return updateTime > fixtureTime + 2 * 60 * 60 * 1000;
  }

  return false;
}

export function applyLiveStandingsProjection<T extends ProjectionRowBase>({
  rows,
  lifecycleState,
  fixture,
  homeTeamId,
  awayTeamId,
}: ApplyLiveStandingsProjectionParams<T>): T[] {
  if (lifecycleState !== 'live' && lifecycleState !== 'finished') {
    return rows;
  }

  const statsDelta = resolveLiveMatchStats(fixture);
  if (!statsDelta) {
    return rows;
  }

  const projectedRows = rows.map(row => {
    // If the match is finished, check if the API has already synced this standing update.
    if (lifecycleState === 'finished' && isStandingAlreadyUpdated(row.update, fixture?.fixture.date ?? null)) {
      return row; // No projection needed, it's already updated!
    }

    if (row.teamId === homeTeamId) {
      const delta = statsDelta.home;
      return {
        ...row,
        points: (row.points ?? 0) + delta.points,
        played: (row.played ?? 0) + 1,
        goalDiff: (row.goalDiff ?? 0) + (delta.goalsFor - delta.goalsAgainst),
        all: {
          played: (row.all.played ?? 0) + 1,
          win: (row.all.win ?? 0) + delta.win,
          draw: (row.all.draw ?? 0) + delta.draw,
          lose: (row.all.lose ?? 0) + delta.lose,
          goalsFor: (row.all.goalsFor ?? 0) + delta.goalsFor,
          goalsAgainst: (row.all.goalsAgainst ?? 0) + delta.goalsAgainst,
        },
        home: {
          played: (row.home.played ?? 0) + 1,
          win: (row.home.win ?? 0) + delta.win,
          draw: (row.home.draw ?? 0) + delta.draw,
          lose: (row.home.lose ?? 0) + delta.lose,
          goalsFor: (row.home.goalsFor ?? 0) + delta.goalsFor,
          goalsAgainst: (row.home.goalsAgainst ?? 0) + delta.goalsAgainst,
        },
      };
    }

    if (row.teamId === awayTeamId) {
      const delta = statsDelta.away;
      return {
        ...row,
        points: (row.points ?? 0) + delta.points,
        played: (row.played ?? 0) + 1,
        goalDiff: (row.goalDiff ?? 0) + (delta.goalsFor - delta.goalsAgainst),
        all: {
          played: (row.all.played ?? 0) + 1,
          win: (row.all.win ?? 0) + delta.win,
          draw: (row.all.draw ?? 0) + delta.draw,
          lose: (row.all.lose ?? 0) + delta.lose,
          goalsFor: (row.all.goalsFor ?? 0) + delta.goalsFor,
          goalsAgainst: (row.all.goalsAgainst ?? 0) + delta.goalsAgainst,
        },
        away: {
          played: (row.away.played ?? 0) + 1,
          win: (row.away.win ?? 0) + delta.win,
          draw: (row.away.draw ?? 0) + delta.draw,
          lose: (row.away.lose ?? 0) + delta.lose,
          goalsFor: (row.away.goalsFor ?? 0) + delta.goalsFor,
          goalsAgainst: (row.away.goalsAgainst ?? 0) + delta.goalsAgainst,
        },
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
