import type {
  TeamApiPlayerDto,
  TeamApiStatisticsDto,
  TeamStatsData,
  TeamStandingsData,
  TeamTopPlayer,
} from '@ui/features/teams/types/teams.types';

import {
  resolvePrimaryTeamPlayerStatistic,
  TeamPlayerStatContext,
  toId,
  toNumber,
  toParsedFloat,
  toText,
} from './shared';
import { findTeamStandingRow } from './standingsMapper';

function mapGoalMinuteBreakdown(payload: TeamApiStatisticsDto): TeamStatsData['goalBreakdown'] {
  const goalMinutes = payload.goals?.for?.minute;
  const slots = ['0-15', '16-30', '31-45', '46-60', '61-75', '76-90', '91-105', '106-120'];

  return slots.map(slot => ({
    key: slot,
    label: slot,
    value: toNumber(goalMinutes?.[slot]?.total),
  }));
}

export function mapPlayersToTopPlayers(
  payload: TeamApiPlayerDto[],
  limit = 8,
  context: TeamPlayerStatContext = {},
): TeamTopPlayer[] {
  const mapped = payload
    .map<TeamTopPlayer | null>(item => {
      const playerId = toId(item.player?.id);
      if (!playerId) {
        return null;
      }

      const stat = resolvePrimaryTeamPlayerStatistic(item.statistics, context);
      return {
        playerId,
        name: toText(item.player?.name),
        photo: toText(item.player?.photo),
        position: toText(stat?.games?.position),
        goals: toNumber(stat?.goals?.total),
        assists: toNumber(stat?.goals?.assists),
        rating: toParsedFloat(stat?.games?.rating),
      };
    })
    .filter((item): item is TeamTopPlayer => item !== null)
    .sort((first, second) => {
      const firstScore = (first.goals ?? 0) * 3 + (first.assists ?? 0) * 2 + (first.rating ?? 0);
      const secondScore = (second.goals ?? 0) * 3 + (second.assists ?? 0) * 2 + (second.rating ?? 0);
      return secondScore - firstScore;
    });

  return mapped.slice(0, limit);
}

export function mapTeamStatisticsToStats(
  payload: TeamApiStatisticsDto | null,
  standings: TeamStandingsData,
  topPlayers: TeamTopPlayer[],
): TeamStatsData {
  const standingRow = findTeamStandingRow(standings);

  return {
    rank: standingRow?.rank ?? null,
    points: standingRow?.points ?? null,
    played: toNumber(payload?.fixtures?.played?.total),
    wins: toNumber(payload?.fixtures?.wins?.total),
    draws: toNumber(payload?.fixtures?.draws?.total),
    losses: toNumber(payload?.fixtures?.loses?.total),
    goalsFor: toNumber(payload?.goals?.for?.total?.total),
    goalsAgainst: toNumber(payload?.goals?.against?.total?.total),
    homePlayed: toNumber(payload?.fixtures?.played?.home),
    homeWins: toNumber(payload?.fixtures?.wins?.home),
    homeDraws: toNumber(payload?.fixtures?.draws?.home),
    homeLosses: toNumber(payload?.fixtures?.loses?.home),
    awayPlayed: toNumber(payload?.fixtures?.played?.away),
    awayWins: toNumber(payload?.fixtures?.wins?.away),
    awayDraws: toNumber(payload?.fixtures?.draws?.away),
    awayLosses: toNumber(payload?.fixtures?.loses?.away),
    expectedGoalsFor: toParsedFloat(payload?.goals?.for?.average?.total),
    goalBreakdown: payload ? mapGoalMinuteBreakdown(payload) : [],
    topPlayers,
  };
}
