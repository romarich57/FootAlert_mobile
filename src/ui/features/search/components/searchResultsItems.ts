import type {
  SearchCompetitionResult,
  SearchEntityTab,
  SearchMatchResult,
  SearchPlayerResult,
  SearchTeamResult,
} from '@ui/features/search/types/search.types';

export type SearchListItem =
  | {
    type: 'section-header';
    key: string;
    title: string;
  }
  | {
    type: 'team';
    key: string;
    item: SearchTeamResult;
  }
  | {
    type: 'player';
    key: string;
    item: SearchPlayerResult;
  }
  | {
    type: 'competition';
    key: string;
    item: SearchCompetitionResult;
  }
  | {
    type: 'match';
    key: string;
    item: SearchMatchResult;
  };

type SearchLabels = {
  teams: string;
  competitions: string;
  players: string;
  matches: string;
};

function appendSection(
  target: SearchListItem[],
  sectionId: string,
  title: string,
  rows: SearchListItem[],
): void {
  if (rows.length === 0) {
    return;
  }

  target.push({
    type: 'section-header',
    key: `header-${sectionId}`,
    title,
  });
  target.push(...rows);
}

export function buildSearchItems(
  selectedTab: SearchEntityTab,
  labels: SearchLabels,
  teamResults: SearchTeamResult[],
  competitionResults: SearchCompetitionResult[],
  playerResults: SearchPlayerResult[],
  matchResults: SearchMatchResult[],
): SearchListItem[] {
  const teamRows = teamResults.map(item => ({ type: 'team', key: `team-${item.teamId}`, item }) as const);
  const competitionRows = competitionResults.map(item => ({
    type: 'competition',
    key: `competition-${item.competitionId}`,
    item,
  }) as const);
  const playerRows = playerResults.map(item => ({
    type: 'player',
    key: `player-${item.playerId}`,
    item,
  }) as const);
  const matchRows = matchResults.map(item => ({ type: 'match', key: `match-${item.fixtureId}`, item }) as const);

  if (selectedTab === 'teams') {
    return teamRows;
  }

  if (selectedTab === 'competitions') {
    return competitionRows;
  }

  if (selectedTab === 'players') {
    return playerRows;
  }

  if (selectedTab === 'matches') {
    return matchRows;
  }

  const allRows: SearchListItem[] = [];
  appendSection(allRows, 'teams', labels.teams, teamRows);
  appendSection(allRows, 'competitions', labels.competitions, competitionRows);
  appendSection(allRows, 'players', labels.players, playerRows);
  appendSection(allRows, 'matches', labels.matches, matchRows);
  return allRows;
}

export function formatMatchKickoff(value: string, language: string): string {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return '';
  }

  return parsedDate.toLocaleString(language, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
