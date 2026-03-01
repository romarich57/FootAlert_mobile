import type {
  PlayerApiFixtureDto,
  PlayerApiMatchPerformanceAggregateDto,
  PlayerApiMatchPerformanceDto,
  PlayerMatchPerformance,
} from '@domain/contracts/players.types';

import {
  normalizeNumber,
  normalizeRating,
  normalizeString,
  PlayerApiMatchStat,
  toFiniteNumber,
  toId,
} from './shared';

export function mapPlayerMatchPerformanceAggregate(
  dto: PlayerApiMatchPerformanceAggregateDto,
): PlayerMatchPerformance | null {
  const fixtureId = toId(dto.fixtureId);
  if (!fixtureId) {
    return null;
  }

  return {
    fixtureId,
    date: normalizeString(dto.date),
    playerTeamId: toId(dto.playerTeamId),
    competition: {
      id: toId(dto.competition?.id),
      name: normalizeString(dto.competition?.name),
      logo: normalizeString(dto.competition?.logo),
    },
    homeTeam: {
      id: toId(dto.homeTeam?.id),
      name: normalizeString(dto.homeTeam?.name),
      logo: normalizeString(dto.homeTeam?.logo),
    },
    awayTeam: {
      id: toId(dto.awayTeam?.id),
      name: normalizeString(dto.awayTeam?.name),
      logo: normalizeString(dto.awayTeam?.logo),
    },
    goalsHome: normalizeNumber(dto.goalsHome),
    goalsAway: normalizeNumber(dto.goalsAway),
    playerStats: {
      minutes: normalizeNumber(dto.playerStats?.minutes),
      rating: normalizeRating(dto.playerStats?.rating, 1),
      goals: normalizeNumber(dto.playerStats?.goals),
      assists: normalizeNumber(dto.playerStats?.assists),
      yellowCards: normalizeNumber(dto.playerStats?.yellowCards),
      secondYellowCards: normalizeNumber(dto.playerStats?.secondYellowCards),
      redCards: normalizeNumber(dto.playerStats?.redCards),
      saves: normalizeNumber(dto.playerStats?.saves),
      penaltiesSaved: normalizeNumber(dto.playerStats?.penaltiesSaved),
      penaltiesMissed: normalizeNumber(dto.playerStats?.penaltiesMissed),
      isStarter:
        typeof dto.playerStats?.isStarter === 'boolean'
          ? dto.playerStats.isStarter
          : null,
    },
  };
}

export function mapPlayerMatchPerformance(
  playerId: string,
  fixtureDto: PlayerApiFixtureDto,
  performanceDto: PlayerApiMatchPerformanceDto | null,
): PlayerMatchPerformance | null {
  if (!fixtureDto.fixture || !fixtureDto.teams) return null;

  let playerStats: PlayerMatchPerformance['playerStats'] = {
    minutes: null,
    rating: null,
    goals: null,
    assists: null,
    yellowCards: null,
    secondYellowCards: null,
    redCards: null,
    saves: null,
    penaltiesSaved: null,
    penaltiesMissed: null,
    isStarter: null,
  };

  const resolvePrimaryMatchStatistic = (
    statistics: PlayerApiMatchStat[] | undefined,
  ): PlayerApiMatchStat | null => {
    if (!statistics || statistics.length === 0) {
      return null;
    }

    return (
      [...statistics].sort((a, b) => {
        const aMinutes = normalizeNumber(a.games?.minutes) ?? 0;
        const bMinutes = normalizeNumber(b.games?.minutes) ?? 0;
        if (bMinutes !== aMinutes) {
          return bMinutes - aMinutes;
        }

        const aGoals = normalizeNumber(a.goals?.total) ?? 0;
        const bGoals = normalizeNumber(b.goals?.total) ?? 0;
        if (bGoals !== aGoals) {
          return bGoals - aGoals;
        }

        const aRating = toFiniteNumber(a.games?.rating) ?? 0;
        const bRating = toFiniteNumber(b.games?.rating) ?? 0;
        return bRating - aRating;
      })[0] ?? null
    );
  };

  let playerTeamId: string | null = null;

  if (performanceDto?.players) {
    for (const teamTeam of performanceDto.players) {
      const matchPlayer = teamTeam.players?.find(p => String(p.player?.id) === playerId);
      if (matchPlayer && matchPlayer.statistics && matchPlayer.statistics.length > 0) {
        playerTeamId = toId(teamTeam.team?.id);
        const s = resolvePrimaryMatchStatistic(matchPlayer.statistics);
        if (!s) {
          continue;
        }
        playerStats = {
          minutes: normalizeNumber(s.games?.minutes),
          rating: normalizeRating(s.games?.rating, 1),
          goals: normalizeNumber(s.goals?.total),
          assists: normalizeNumber(s.goals?.assists),
          yellowCards: normalizeNumber(s.cards?.yellow),
          secondYellowCards: normalizeNumber(s.cards?.yellowred),
          redCards: normalizeNumber(s.cards?.red),
          saves: normalizeNumber(s.goals?.saves),
          penaltiesSaved: normalizeNumber(s.penalty?.saved),
          penaltiesMissed: normalizeNumber(s.penalty?.missed),
          isStarter:
            typeof s.games?.substitute === 'boolean'
              ? s.games.substitute === false
              : null,
        };
        break;
      }
    }
  }

  const fixtureId = toId(fixtureDto.fixture.id);
  if (!fixtureId) {
    return null;
  }

  return {
    fixtureId,
    date: normalizeString(fixtureDto.fixture.date),
    playerTeamId,
    competition: {
      id: toId(fixtureDto.league?.id),
      name: normalizeString(fixtureDto.league?.name),
      logo: normalizeString(fixtureDto.league?.logo),
    },
    homeTeam: {
      id: toId(fixtureDto.teams.home?.id),
      name: normalizeString(fixtureDto.teams.home?.name),
      logo: normalizeString(fixtureDto.teams.home?.logo),
    },
    awayTeam: {
      id: toId(fixtureDto.teams.away?.id),
      name: normalizeString(fixtureDto.teams.away?.name),
      logo: normalizeString(fixtureDto.teams.away?.logo),
    },
    goalsHome: fixtureDto.goals?.home ?? null,
    goalsAway: fixtureDto.goals?.away ?? null,
    playerStats,
  };
}
