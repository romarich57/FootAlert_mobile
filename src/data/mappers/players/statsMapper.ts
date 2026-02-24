import type { PlayerApiDetailsDto, PlayerSeasonStats } from '@ui/features/players/types/players.types';

import {
  normalizeNumber,
  normalizeRating,
  resolveSeasonStatistics,
  sumOrNull,
  toFiniteNumber,
} from './shared';

export function mapPlayerDetailsToSeasonStats(
  dto: PlayerApiDetailsDto,
  season?: number,
): PlayerSeasonStats {
  const emptyStats: PlayerSeasonStats = {
    matches: null,
    starts: null,
    minutes: null,
    goals: null,
    assists: null,
    rating: null,
    shots: null,
    shotsOnTarget: null,
    penaltyGoals: null,
    passes: null,
    passesAccuracy: null,
    keyPasses: null,
    dribblesAttempts: null,
    dribblesSuccess: null,
    tackles: null,
    interceptions: null,
    blocks: null,
    duelsTotal: null,
    duelsWon: null,
    foulsCommitted: null,
    foulsDrawn: null,
    yellowCards: null,
    redCards: null,
    dribblesBeaten: null,
    saves: null,
    goalsConceded: null,
    penaltiesWon: null,
    penaltiesMissed: null,
    penaltiesCommitted: null,
  };

  const stats = resolveSeasonStatistics(dto.statistics, season);
  if (stats.length === 0) {
    return emptyStats;
  }

  let matches: number | null = null;
  let starts: number | null = null;
  let minutes: number | null = null;
  let goals: number | null = null;
  let assists: number | null = null;
  let shots: number | null = null;
  let shotsOnTarget: number | null = null;
  let penaltyGoals: number | null = null;
  let passes: number | null = null;
  let keyPasses: number | null = null;
  let dribblesAttempts: number | null = null;
  let dribblesSuccess: number | null = null;
  let tackles: number | null = null;
  let interceptions: number | null = null;
  let blocks: number | null = null;
  let duelsTotal: number | null = null;
  let duelsWon: number | null = null;
  let foulsCommitted: number | null = null;
  let foulsDrawn: number | null = null;
  let yellowCards: number | null = null;
  let redCards: number | null = null;
  let dribblesBeaten: number | null = null;
  let savesTotal: number | null = null;
  let goalsConceded: number | null = null;
  let penaltiesWon: number | null = null;
  let penaltiesMissed: number | null = null;
  let penaltiesCommitted: number | null = null;

  let ratingWeightedSum = 0;
  let ratingWeight = 0;

  let passesAccuracyWeightedSum = 0;
  let passesAccuracyWeight = 0;

  stats.forEach(stat => {
    const appearances = normalizeNumber(stat.games?.appearences);
    const lineups = normalizeNumber(stat.games?.lineups);
    const playedMinutes = normalizeNumber(stat.games?.minutes);
    const goalsValue = normalizeNumber(stat.goals?.total);
    const assistsValue = normalizeNumber(stat.goals?.assists);
    const shotsValue = normalizeNumber(stat.shots?.total);
    const shotsOnTargetValue = normalizeNumber(stat.shots?.on);
    const passesValue = normalizeNumber(stat.passes?.total);
    const keyPassesValue = normalizeNumber(stat.passes?.key);
    const tacklesValue = normalizeNumber(stat.tackles?.total);
    const interceptionsValue = normalizeNumber(stat.tackles?.interceptions);
    const blocksValue = normalizeNumber(stat.tackles?.blocks);
    const duelsTotalValue = normalizeNumber(stat.duels?.total);
    const duelsWonValue = normalizeNumber(stat.duels?.won);
    const dribblesAttemptsValue = normalizeNumber(stat.dribbles?.attempts);
    const dribblesSuccessValue = normalizeNumber(stat.dribbles?.success);
    const dribblesBeatenValue = normalizeNumber(stat.dribbles?.past);
    const foulsCommittedValue = normalizeNumber(stat.fouls?.committed);
    const foulsDrawnValue = normalizeNumber(stat.fouls?.drawn);
    const yellowCardsValue = normalizeNumber(stat.cards?.yellow);
    const redCardsValue = normalizeNumber(stat.cards?.red);
    const savesValue = normalizeNumber(stat.goals?.saves);
    const goalsConcededValue = normalizeNumber(stat.goals?.conceded);
    const penaltiesWonValue = normalizeNumber(stat.penalty?.won);
    const penaltiesMissedValue = normalizeNumber(stat.penalty?.missed);
    const penaltiesCommittedValue = normalizeNumber(stat.penalty?.commited);
    const penaltyGoalsValue = normalizeNumber(stat.penalty?.scored);

    matches = sumOrNull(matches, appearances);
    starts = sumOrNull(starts, lineups);
    minutes = sumOrNull(minutes, playedMinutes);
    goals = sumOrNull(goals, goalsValue);
    assists = sumOrNull(assists, assistsValue);
    shots = sumOrNull(shots, shotsValue);
    shotsOnTarget = sumOrNull(shotsOnTarget, shotsOnTargetValue);
    penaltyGoals = sumOrNull(penaltyGoals, penaltyGoalsValue);
    passes = sumOrNull(passes, passesValue);
    keyPasses = sumOrNull(keyPasses, keyPassesValue);
    dribblesAttempts = sumOrNull(dribblesAttempts, dribblesAttemptsValue);
    dribblesSuccess = sumOrNull(dribblesSuccess, dribblesSuccessValue);
    tackles = sumOrNull(tackles, tacklesValue);
    interceptions = sumOrNull(interceptions, interceptionsValue);
    blocks = sumOrNull(blocks, blocksValue);
    duelsTotal = sumOrNull(duelsTotal, duelsTotalValue);
    duelsWon = sumOrNull(duelsWon, duelsWonValue);
    foulsCommitted = sumOrNull(foulsCommitted, foulsCommittedValue);
    foulsDrawn = sumOrNull(foulsDrawn, foulsDrawnValue);
    yellowCards = sumOrNull(yellowCards, yellowCardsValue);
    redCards = sumOrNull(redCards, redCardsValue);
    dribblesBeaten = sumOrNull(dribblesBeaten, dribblesBeatenValue);
    savesTotal = sumOrNull(savesTotal, savesValue);
    goalsConceded = sumOrNull(goalsConceded, goalsConcededValue);
    penaltiesWon = sumOrNull(penaltiesWon, penaltiesWonValue);
    penaltiesMissed = sumOrNull(penaltiesMissed, penaltiesMissedValue);
    penaltiesCommitted = sumOrNull(penaltiesCommitted, penaltiesCommittedValue);

    const ratingValue = toFiniteNumber(stat.games?.rating);
    if (ratingValue !== null) {
      const weight = playedMinutes ?? appearances ?? 1;
      if (weight > 0) {
        ratingWeightedSum += ratingValue * weight;
        ratingWeight += weight;
      }
    }

    const passesAccuracyValue = toFiniteNumber(stat.passes?.accuracy);
    if (passesAccuracyValue !== null) {
      const weight = passesValue ?? playedMinutes ?? appearances ?? 1;
      if (weight > 0) {
        passesAccuracyWeightedSum += passesAccuracyValue * weight;
        passesAccuracyWeight += weight;
      }
    }
  });

  return {
    matches,
    starts,
    minutes,
    goals,
    assists,
    rating: ratingWeight > 0 ? normalizeRating(ratingWeightedSum / ratingWeight, 2) : null,
    shots,
    shotsOnTarget,
    penaltyGoals,
    passes,
    passesAccuracy:
      passesAccuracyWeight > 0
        ? Number((passesAccuracyWeightedSum / passesAccuracyWeight).toFixed(2))
        : null,
    keyPasses,
    dribblesAttempts,
    dribblesSuccess,
    tackles,
    interceptions,
    blocks,
    duelsTotal,
    duelsWon,
    foulsCommitted,
    foulsDrawn,
    yellowCards,
    redCards,
    dribblesBeaten,
    saves: savesTotal,
    goalsConceded,
    penaltiesWon,
    penaltiesMissed,
    penaltiesCommitted,
  };
}
