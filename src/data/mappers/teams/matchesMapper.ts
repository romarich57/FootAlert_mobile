import type {
  TeamApiFixtureDto,
  TeamFormEntry,
  TeamMatchItem,
  TeamMatchesData,
} from '@ui/features/teams/types/teams.types';

import { classifyTeamMatchStatus } from './detailsMapper';
import { toId, toNumber, toSortableTimestamp, toText } from './shared';

function toStatusLabel(dto: TeamApiFixtureDto): string | null {
  return toText(dto.fixture?.status?.long) ?? toText(dto.fixture?.status?.short);
}

export function mapFixtureToTeamMatch(dto: TeamApiFixtureDto): TeamMatchItem {
  return {
    fixtureId: toId(dto.fixture?.id) ?? '',
    leagueId: toId(dto.league?.id),
    leagueName: toText(dto.league?.name),
    leagueLogo: toText(dto.league?.logo),
    date: toText(dto.fixture?.date),
    round: toText(dto.league?.round),
    venue: toText(dto.fixture?.venue?.name),
    status: classifyTeamMatchStatus(dto.fixture?.status?.short),
    statusLabel: toStatusLabel(dto),
    minute: toNumber(dto.fixture?.status?.elapsed),
    homeTeamId: toId(dto.teams?.home?.id),
    homeTeamName: toText(dto.teams?.home?.name),
    homeTeamLogo: toText(dto.teams?.home?.logo),
    awayTeamId: toId(dto.teams?.away?.id),
    awayTeamName: toText(dto.teams?.away?.name),
    awayTeamLogo: toText(dto.teams?.away?.logo),
    homeGoals: toNumber(dto.goals?.home),
    awayGoals: toNumber(dto.goals?.away),
  };
}

function sortMatchesByDate(items: TeamMatchItem[]): TeamMatchItem[] {
  return [...items].sort((first, second) => {
    return toSortableTimestamp(first.date) - toSortableTimestamp(second.date);
  });
}

export function mapFixturesToTeamMatches(payload: TeamApiFixtureDto[]): TeamMatchesData {
  const all = sortMatchesByDate(
    payload
      .map(mapFixtureToTeamMatch)
      .filter(match => match.fixtureId.length > 0),
  );

  return {
    all,
    upcoming: all.filter(match => match.status === 'upcoming'),
    live: all.filter(match => match.status === 'live'),
    past: all
      .filter(match => match.status === 'finished')
      .sort((first, second) => toSortableTimestamp(second.date) - toSortableTimestamp(first.date)),
  };
}

function resolveFormResult(
  match: TeamMatchItem,
  teamId: string,
): TeamFormEntry['result'] {
  const homeTeamId = match.homeTeamId;
  const awayTeamId = match.awayTeamId;

  if (!homeTeamId || !awayTeamId || (homeTeamId !== teamId && awayTeamId !== teamId)) {
    return '';
  }

  if (match.homeGoals === null || match.awayGoals === null) {
    return '';
  }

  const goalDelta = match.homeGoals - match.awayGoals;
  if (goalDelta === 0) {
    return 'D';
  }

  const isHome = homeTeamId === teamId;
  const hasWon = isHome ? goalDelta > 0 : goalDelta < 0;
  return hasWon ? 'W' : 'L';
}

export function mapRecentTeamForm(
  matches: TeamMatchItem[],
  teamId: string,
  limit = 5,
): TeamFormEntry[] {
  return matches
    .filter(match => match.status === 'finished')
    .sort((first, second) => toSortableTimestamp(second.date) - toSortableTimestamp(first.date))
    .slice(0, limit)
    .map(match => {
      const isHome = match.homeTeamId === teamId;

      return {
        fixtureId: match.fixtureId,
        result: resolveFormResult(match, teamId),
        score:
          match.homeGoals === null || match.awayGoals === null
            ? null
            : `${match.homeGoals}-${match.awayGoals}`,
        opponentName: isHome ? match.awayTeamName : match.homeTeamName,
        opponentLogo: isHome ? match.awayTeamLogo : match.homeTeamLogo,
      };
    });
}
