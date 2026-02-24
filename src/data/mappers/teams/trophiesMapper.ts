import type {
  TeamApiTrophyDto,
  TeamTrophiesData,
  TeamTrophyGroup,
} from '@ui/features/teams/types/teams.types';

import { toText } from './shared';

function isWinnerTrophy(place: string | null): boolean {
  return (place ?? '').toLowerCase().includes('winner');
}

function normalizeTrophyPlace(place: string | null): string {
  const norm = (place ?? '').toLowerCase();
  if (norm.includes('winner') || norm.includes('champion')) return 'champion';
  if (norm.includes('runner') || norm.includes('vice')) return 'runnerUp';
  if (norm.includes('semi')) return 'semifinalist';
  return 'title';
}

const PLACE_SCORE: Record<string, number> = {
  champion: 3,
  runnerUp: 2,
  semifinalist: 1,
  title: 0,
};

export function mapTrophiesToTeamTrophies(payload: TeamApiTrophyDto[]): TeamTrophiesData {
  const groupsByCompetition = new Map<string, TeamTrophyGroup>();
  let totalWins = 0;

  payload.forEach(item => {
    const competition = toText(item.league);
    const country = toText(item.country);
    const groupKey = `${competition ?? '__unknown_competition__'}::${country ?? '__unknown_country__'}`;
    const existingGroup = groupsByCompetition.get(groupKey);
    const place = toText(item.place);
    const season = toText(item.season);

    const isWin = isWinnerTrophy(place);
    if (isWin) totalWins++;

    const normPlaceKey = normalizeTrophyPlace(place);

    if (!existingGroup) {
      groupsByCompetition.set(groupKey, {
        id: groupKey,
        competition,
        country,
        placements: [{ place: normPlaceKey, count: 1, seasons: season ? [season] : [] }],
      });
      return;
    }

    const existingPlacement = existingGroup.placements.find(p => p.place === normPlaceKey);
    if (existingPlacement) {
      existingPlacement.count++;
      if (season) {
        existingPlacement.seasons.push(season);
      }
    } else {
      existingGroup.placements.push({ place: normPlaceKey, count: 1, seasons: season ? [season] : [] });
    }
  });

  const groups = Array.from(groupsByCompetition.values())
    .map(group => {
      group.placements.forEach(p => p.seasons.sort((a, b) => b.localeCompare(a)));
      group.placements.sort((a, b) => (PLACE_SCORE[b.place] ?? 0) - (PLACE_SCORE[a.place] ?? 0));
      return group;
    })
    .sort((first, second) => {
      const firstWins = first.placements.find(p => p.place === 'champion')?.count ?? 0;
      const secondWins = second.placements.find(p => p.place === 'champion')?.count ?? 0;
      if (secondWins !== firstWins) {
        return secondWins - firstWins;
      }
      return (first.competition ?? '').localeCompare(second.competition ?? '');
    });

  return {
    groups,
    total: payload.length,
    totalWins,
  };
}
