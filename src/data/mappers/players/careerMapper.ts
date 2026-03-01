import type {
  PlayerApiCareerSeasonAggregateDto,
  PlayerApiCareerTeamAggregateDto,
  PlayerApiDetailsDto,
  PlayerCareerSeason,
  PlayerCareerTeam,
} from '@domain/contracts/players.types';

import {
  normalizeNumber,
  normalizeRating,
  normalizeString,
  sumOrNull,
  toId,
} from './shared';

export function mapPlayerCareerSeasonAggregate(
  dto: PlayerApiCareerSeasonAggregateDto,
): PlayerCareerSeason {
  return {
    season: normalizeString(dto.season),
    team: {
      id: toId(dto.team?.id),
      name: normalizeString(dto.team?.name),
      logo: normalizeString(dto.team?.logo),
    },
    matches: normalizeNumber(dto.matches),
    goals: normalizeNumber(dto.goals),
    assists: normalizeNumber(dto.assists),
    rating: normalizeRating(dto.rating, 2),
  };
}

export function mapPlayerCareerTeamAggregate(
  dto: PlayerApiCareerTeamAggregateDto,
): PlayerCareerTeam {
  return {
    team: {
      id: toId(dto.team?.id),
      name: normalizeString(dto.team?.name),
      logo: normalizeString(dto.team?.logo),
    },
    period: normalizeString(dto.period),
    matches: normalizeNumber(dto.matches),
    goals: normalizeNumber(dto.goals),
    assists: normalizeNumber(dto.assists),
  };
}

export function mapPlayerCareerSeasons(dto: PlayerApiDetailsDto): PlayerCareerSeason[] {
  if (!dto.statistics) return [];

  return dto.statistics
    .map(s => ({
      season: s.league?.season ? String(s.league.season) : null,
      team: {
        id: toId(s.team?.id),
        name: normalizeString(s.team?.name),
        logo: normalizeString(s.team?.logo),
      },
      matches: normalizeNumber(s.games?.appearences),
      goals: normalizeNumber(s.goals?.total),
      assists: normalizeNumber(s.goals?.assists),
      rating: normalizeRating(s.games?.rating, 2),
    }))
    .sort((a, b) => {
      const aYear = a.season ? Number.parseInt(a.season, 10) : Number.NEGATIVE_INFINITY;
      const bYear = b.season ? Number.parseInt(b.season, 10) : Number.NEGATIVE_INFINITY;
      return bYear - aYear;
    });
}

export function mapPlayerCareerTeams(dto: PlayerApiDetailsDto): PlayerCareerTeam[] {
  if (!dto.statistics) return [];

  const teamMap = new Map<string, PlayerCareerTeam>();

  dto.statistics.forEach(s => {
    const teamId = toId(s.team?.id);
    const seasonStr = s.league?.season ? String(s.league.season) : '';
    if (!teamId) {
      return;
    }

    if (!teamMap.has(teamId)) {
      teamMap.set(teamId, {
        team: {
          id: teamId,
          name: normalizeString(s.team?.name),
          logo: normalizeString(s.team?.logo),
        },
        period: seasonStr || null,
        matches: null,
        goals: null,
        assists: null,
      });
    }

    const team = teamMap.get(teamId);
    if (!team) {
      return;
    }

    team.matches = sumOrNull(team.matches, normalizeNumber(s.games?.appearences));
    team.goals = sumOrNull(team.goals, normalizeNumber(s.goals?.total));
    team.assists = sumOrNull(team.assists, normalizeNumber(s.goals?.assists));

    if (seasonStr && !(team.period ?? '').includes(seasonStr)) {
      if (!team.period) {
        team.period = seasonStr;
      } else {
        const years = team.period
          .split(' - ')
          .map(Number)
          .filter(n => !Number.isNaN(n));
        const newYear = Number(seasonStr);
        if (!Number.isNaN(newYear)) {
          years.push(newYear);
          const min = Math.min(...years);
          const max = Math.max(...years);
          team.period = min === max ? `${min}` : `${min} - ${max}`;
        }
      }
    }
  });

  return Array.from(teamMap.values());
}
