import type { PlayerCareerSeason, PlayerCareerTeam } from '@ui/features/players/types/players.types';

export function formatStatValue(value: number | null): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return String(value);
}

export function formatSeasonValue(season: string | null): string | null {
  if (!season) {
    return null;
  }

  const seasonYear = Number.parseInt(season, 10);
  if (!Number.isFinite(seasonYear)) {
    return season;
  }

  return `${seasonYear}/${seasonYear + 1}`;
}

export function formatLabelValue(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function formatRatingValue(rating: string | null, languageTag: string): string | null {
  if (!rating) {
    return null;
  }

  const parsed = Number.parseFloat(rating);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return new Intl.NumberFormat(languageTag, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(parsed);
}

function parseSeasonYear(value: string | null): number {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

function parsePeriodBounds(period: string | null): { start: number; end: number } {
  if (!period) {
    return {
      start: Number.NEGATIVE_INFINITY,
      end: Number.NEGATIVE_INFINITY,
    };
  }

  const years = (period.match(/\d{4}/g) ?? [])
    .map(token => Number.parseInt(token, 10))
    .filter((value): value is number => Number.isFinite(value));

  if (years.length === 0) {
    return {
      start: Number.NEGATIVE_INFINITY,
      end: Number.NEGATIVE_INFINITY,
    };
  }

  return {
    start: Math.min(...years),
    end: Math.max(...years),
  };
}

function looksLikeNationalTeam(teamName: string | null, nationality?: string): boolean {
  if (!teamName) {
    return false;
  }

  const normalizedTeamName = teamName.trim();
  if (!normalizedTeamName) {
    return false;
  }

  if (nationality && normalizedTeamName.toLowerCase() === nationality.trim().toLowerCase()) {
    return true;
  }

  return /(U21|U20|U19|U18|U17|National)/i.test(normalizedTeamName);
}

export function buildSeasonRows(seasons: PlayerCareerSeason[], nationality?: string): PlayerCareerSeason[] {
  return [...seasons]
    .filter(season => !looksLikeNationalTeam(season.team.name, nationality))
    .sort((first, second) => {
      const firstYear = parseSeasonYear(first.season);
      const secondYear = parseSeasonYear(second.season);
      if (secondYear !== firstYear) {
        return secondYear - firstYear;
      }

      const firstMatches = typeof first.matches === 'number' ? first.matches : Number.NEGATIVE_INFINITY;
      const secondMatches = typeof second.matches === 'number' ? second.matches : Number.NEGATIVE_INFINITY;
      if (secondMatches !== firstMatches) {
        return secondMatches - firstMatches;
      }

      const firstGoals = typeof first.goals === 'number' ? first.goals : Number.NEGATIVE_INFINITY;
      const secondGoals = typeof second.goals === 'number' ? second.goals : Number.NEGATIVE_INFINITY;
      return secondGoals - firstGoals;
    });
}

export function splitCareerTeams(
  teams: PlayerCareerTeam[],
  nationality?: string,
): { professionalTeams: PlayerCareerTeam[]; nationalTeams: PlayerCareerTeam[] } {
  const sortedTeams = [...teams].sort((first, second) => {
    const firstBounds = parsePeriodBounds(first.period);
    const secondBounds = parsePeriodBounds(second.period);

    if (secondBounds.end !== firstBounds.end) {
      return secondBounds.end - firstBounds.end;
    }

    if (secondBounds.start !== firstBounds.start) {
      return secondBounds.start - firstBounds.start;
    }

    const firstMatches = typeof first.matches === 'number' ? first.matches : Number.NEGATIVE_INFINITY;
    const secondMatches = typeof second.matches === 'number' ? second.matches : Number.NEGATIVE_INFINITY;
    if (secondMatches !== firstMatches) {
      return secondMatches - firstMatches;
    }

    const firstGoals = typeof first.goals === 'number' ? first.goals : Number.NEGATIVE_INFINITY;
    const secondGoals = typeof second.goals === 'number' ? second.goals : Number.NEGATIVE_INFINITY;
    return secondGoals - firstGoals;
  });

  return sortedTeams.reduce<{
    professionalTeams: PlayerCareerTeam[];
    nationalTeams: PlayerCareerTeam[];
  }>(
    (accumulator, team) => {
      if (looksLikeNationalTeam(team.team.name, nationality)) {
        accumulator.nationalTeams.push(team);
      } else {
        accumulator.professionalTeams.push(team);
      }
      return accumulator;
    },
    {
      professionalTeams: [],
      nationalTeams: [],
    },
  );
}
