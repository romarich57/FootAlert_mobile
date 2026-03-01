import type {
  PlayerApiTrophyDto,
  PlayerCareerSeason,
  PlayerTrophiesByClub,
  PlayerTrophyEntry,
} from '@domain/contracts/players.types';

import { normalizeString, toId } from './shared';

type CareerClubYear = {
  clubId: string | null;
  clubName: string | null;
  clubLogo: string | null;
  matches: number;
};

type TrophyCompetitionAccumulator = {
  competition: string;
  country: string | null;
  count: number;
  seasons: string[];
};

type TrophyClubAccumulator = {
  clubId: string | null;
  clubName: string | null;
  clubLogo: string | null;
  total: number;
  competitions: Map<string, TrophyCompetitionAccumulator>;
};

type CareerClubMapping = {
  yearToClubMap: Map<number, CareerClubYear>;
  knownYears: number[];
  primaryClub: CareerClubYear | null;
};

function normalizePlace(place: string | null | undefined): string {
  if (!place) {
    return '';
  }

  return place.trim().toLowerCase();
}

function isWinningPlace(place: string | null | undefined): boolean {
  const normalized = normalizePlace(place);
  if (!normalized) {
    return false;
  }

  return (
    normalized.includes('winner') ||
    normalized.includes('champion') ||
    normalized.includes('title') ||
    normalized.includes('vainqueur')
  );
}

function parseSeasonYear(season: string | null | undefined): number | null {
  if (!season) {
    return null;
  }

  const fourDigitYears = season.match(/\b(19|20)\d{2}\b/g);
  if (!fourDigitYears || fourDigitYears.length === 0) {
    return null;
  }

  const parsed = Number.parseInt(fourDigitYears[0], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function compareSeasonsDesc(first: string, second: string): number {
  const firstYear = parseSeasonYear(first);
  const secondYear = parseSeasonYear(second);
  if (secondYear !== firstYear) {
    return (secondYear ?? Number.NEGATIVE_INFINITY) - (firstYear ?? Number.NEGATIVE_INFINITY);
  }

  return second.localeCompare(first);
}

function parseCareerSeasonYear(season: string | null): number | null {
  if (!season) {
    return null;
  }

  const parsed = Number.parseInt(season.slice(0, 4), 10);
  if (Number.isFinite(parsed)) {
    return parsed;
  }

  return parseSeasonYear(season);
}

function toMatchesWeight(matches: number | null): number {
  return typeof matches === 'number' && Number.isFinite(matches) ? matches : 0;
}

function compareClubNames(first: string | null, second: string | null): number {
  return (first ?? '').localeCompare(second ?? '');
}

function buildCareerYearToClubMap(careerSeasons: PlayerCareerSeason[]): Map<number, CareerClubYear> {
  const byYear = new Map<number, CareerClubYear>();

  careerSeasons.forEach(careerSeason => {
    const year = parseCareerSeasonYear(careerSeason.season);
    if (year === null) {
      return;
    }

    const candidate: CareerClubYear = {
      clubId: toId(careerSeason.team.id),
      clubName: normalizeString(careerSeason.team.name),
      clubLogo: normalizeString(careerSeason.team.logo),
      matches: toMatchesWeight(careerSeason.matches),
    };

    const current = byYear.get(year);
    if (!current || candidate.matches > current.matches) {
      byYear.set(year, candidate);
    }
  });

  return byYear;
}

function buildPrimaryCareerClub(careerSeasons: PlayerCareerSeason[]): CareerClubYear | null {
  const clubTotals = new Map<string, CareerClubYear>();

  careerSeasons.forEach(careerSeason => {
    const clubId = toId(careerSeason.team.id);
    const clubName = normalizeString(careerSeason.team.name);
    const clubLogo = normalizeString(careerSeason.team.logo);
    if (!clubId && !clubName) {
      return;
    }

    const key = clubId ? `club-${clubId}` : `club-name-${clubName ?? ''}`;
    const existing = clubTotals.get(key) ?? {
      clubId,
      clubName,
      clubLogo,
      matches: 0,
    };

    existing.matches += toMatchesWeight(careerSeason.matches);
    if (!existing.clubLogo && clubLogo) {
      existing.clubLogo = clubLogo;
    }

    clubTotals.set(key, existing);
  });

  const sortedClubs = Array.from(clubTotals.values()).sort((first, second) => {
    if (second.matches !== first.matches) {
      return second.matches - first.matches;
    }

    return compareClubNames(first.clubName, second.clubName);
  });

  return sortedClubs[0] ?? null;
}

function buildCareerClubMapping(careerSeasons: PlayerCareerSeason[]): CareerClubMapping {
  const yearToClubMap = buildCareerYearToClubMap(careerSeasons);
  const knownYears = Array.from(yearToClubMap.keys()).sort((a, b) => a - b);
  const primaryClub = buildPrimaryCareerClub(careerSeasons);

  return {
    yearToClubMap,
    knownYears,
    primaryClub,
  };
}

function resolveNearestCareerYear(targetYear: number, knownYears: number[]): number | null {
  if (knownYears.length === 0) {
    return null;
  }

  const [nearest] = [...knownYears].sort((first, second) => {
    const firstDistance = Math.abs(first - targetYear);
    const secondDistance = Math.abs(second - targetYear);
    if (firstDistance !== secondDistance) {
      return firstDistance - secondDistance;
    }

    return second - first;
  });

  return nearest ?? null;
}

function createClubKey(clubId: string | null, clubName: string | null): string {
  if (clubId) {
    return `club-${clubId}`;
  }

  if (clubName) {
    return `club-name-${clubName.toLowerCase()}`;
  }

  return 'club-unknown';
}

export function mapPlayerTrophies(dtos: PlayerApiTrophyDto[]): PlayerTrophyEntry[] {
  return dtos
    .filter(dto => isWinningPlace(dto.place))
    .map<PlayerTrophyEntry>(dto => {
      const season = normalizeString(dto.season);

      return {
        competition: normalizeString(dto.league) ?? '',
        country: normalizeString(dto.country),
        season,
        seasonYear: parseSeasonYear(season),
      };
    })
    .filter(entry => entry.competition.length > 0)
    .sort((first, second) => {
      if (second.seasonYear !== first.seasonYear) {
        return (second.seasonYear ?? Number.NEGATIVE_INFINITY) - (first.seasonYear ?? Number.NEGATIVE_INFINITY);
      }

      return first.competition.localeCompare(second.competition);
    });
}

export function groupPlayerTrophiesByClub(
  trophies: PlayerTrophyEntry[],
  careerSeasons: PlayerCareerSeason[],
): PlayerTrophiesByClub {
  if (trophies.length === 0) {
    return [];
  }

  const careerMapping = buildCareerClubMapping(careerSeasons);
  const clubs = new Map<string, TrophyClubAccumulator>();

  trophies.forEach(trophy => {
    let linkedClub: CareerClubYear | undefined;

    if (trophy.seasonYear !== null) {
      linkedClub = careerMapping.yearToClubMap.get(trophy.seasonYear);
      if (!linkedClub) {
        const nearestYear = resolveNearestCareerYear(trophy.seasonYear, careerMapping.knownYears);
        linkedClub = nearestYear !== null ? careerMapping.yearToClubMap.get(nearestYear) : undefined;
      }
    }

    if (!linkedClub && careerMapping.primaryClub) {
      linkedClub = careerMapping.primaryClub;
    }

    const clubId = linkedClub?.clubId ?? null;
    const clubName = linkedClub?.clubName ?? null;
    const clubLogo = linkedClub?.clubLogo ?? null;
    const clubKey = createClubKey(clubId, clubName);

    const clubAccumulator = clubs.get(clubKey) ?? {
      clubId,
      clubName,
      clubLogo,
      total: 0,
      competitions: new Map<string, TrophyCompetitionAccumulator>(),
    };

    clubAccumulator.total += 1;

    const competitionKey = `${trophy.competition.toLowerCase()}|${trophy.country ?? ''}`;
    const competition = clubAccumulator.competitions.get(competitionKey) ?? {
      competition: trophy.competition,
      country: trophy.country,
      count: 0,
      seasons: [],
    };

    competition.count += 1;
    if (trophy.season && !competition.seasons.includes(trophy.season)) {
      competition.seasons.push(trophy.season);
    }

    competition.seasons.sort(compareSeasonsDesc);
    clubAccumulator.competitions.set(competitionKey, competition);
    clubs.set(clubKey, clubAccumulator);
  });

  return Array.from(clubs.values())
    .map(group => ({
      clubId: group.clubId,
      clubName: group.clubName,
      clubLogo: group.clubLogo,
      total: group.total,
      competitions: Array.from(group.competitions.values()).sort((first, second) => {
        if (second.count !== first.count) {
          return second.count - first.count;
        }

        const firstSeason = first.seasons[0] ?? '';
        const secondSeason = second.seasons[0] ?? '';
        const seasonCompare = compareSeasonsDesc(firstSeason, secondSeason);
        if (seasonCompare !== 0) {
          return seasonCompare;
        }

        return first.competition.localeCompare(second.competition);
      }),
    }))
    .sort((first, second) => {
      if (second.total !== first.total) {
        return second.total - first.total;
      }

      const firstUnknown = !first.clubId && !first.clubName;
      const secondUnknown = !second.clubId && !second.clubName;
      if (firstUnknown !== secondUnknown) {
        return firstUnknown ? 1 : -1;
      }

      return compareClubNames(first.clubName, second.clubName);
    });
}
