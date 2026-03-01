import type {
  TeamApiTrophyDto,
  TeamTrophiesData,
  TeamTrophyGroup,
} from '@domain/contracts/teams.types';

import { toText } from './shared';

function isWinnerTrophy(place: string | null): boolean {
  const normalizedPlace = (place ?? '').toLowerCase();
  if (normalizedPlace.includes('runner') || normalizedPlace.includes('vice')) {
    return false;
  }
  return normalizedPlace.includes('winner') || normalizedPlace.includes('champion');
}

function normalizeTrophyPlace(place: string | null): string {
  const norm = (place ?? '').toLowerCase();
  if (norm.includes('runner') || norm.includes('vice')) return 'runnerUp';
  if (norm.includes('winner') || norm.includes('champion')) return 'champion';
  if (norm.includes('semi')) return 'semifinalist';
  return 'title';
}

const PLACE_SCORE: Record<string, number> = {
  champion: 3,
  runnerUp: 2,
  semifinalist: 1,
  title: 0,
};

type SeasonBounds = {
  start: number;
  end: number;
};

function parseSeasonBounds(value: string): SeasonBounds | null {
  const normalized = value.trim();
  const startMatch = normalized.match(/\d{4}/);
  if (!startMatch) {
    return null;
  }

  const start = Number(startMatch[0]);
  if (!Number.isFinite(start)) {
    return null;
  }

  const remaining = normalized.slice((startMatch.index ?? 0) + startMatch[0].length);
  const endMatch = remaining.match(/(?:\/|-|–|—)\s*(\d{2,4})/);
  if (!endMatch) {
    return { start, end: start };
  }

  const rawEnd = endMatch[1];
  if (!rawEnd) {
    return { start, end: start };
  }

  let end = Number(rawEnd);
  if (!Number.isFinite(end)) {
    return { start, end: start };
  }

  if (rawEnd.length === 2) {
    // Expand "2003/04" and handle season rollovers like "1999/00".
    end = Math.floor(start / 100) * 100 + end;
    if (end < start) {
      end += 100;
    }
  }

  return { start, end };
}

function compareSeasonStringsDesc(first: string, second: string): number {
  const firstBounds = parseSeasonBounds(first);
  const secondBounds = parseSeasonBounds(second);

  if (firstBounds && secondBounds) {
    if (secondBounds.start !== firstBounds.start) {
      return secondBounds.start - firstBounds.start;
    }
    if (secondBounds.end !== firstBounds.end) {
      return secondBounds.end - firstBounds.end;
    }
    return second.localeCompare(first);
  }

  if (firstBounds) return -1;
  if (secondBounds) return 1;
  return second.localeCompare(first);
}

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

  const groups = Array.from(groupsByCompetition.values()).map(group => {
    group.placements.forEach(placement => {
      placement.seasons.sort(compareSeasonStringsDesc);
    });
    group.placements.sort((a, b) => (PLACE_SCORE[b.place] ?? 0) - (PLACE_SCORE[a.place] ?? 0));
    return group;
  });

  return {
    groups,
    total: payload.length,
    totalWins,
  };
}
