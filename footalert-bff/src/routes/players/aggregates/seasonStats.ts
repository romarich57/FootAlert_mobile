import type {
  PlayerCompetitionSeasonStats,
  PlayerDetailsDto,
  PlayerSeasonStats,
  PlayerSeasonStatsDataset,
  PlayerStatDto,
} from './contracts.js';

export function normalizeString(value: string | undefined | null): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeNumber(value: number | undefined | null): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function normalizeRating(
  value: string | number | undefined | null,
  precision = 2,
): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed.toFixed(precision);
}

export function toId(value: number | string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

export function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function sumOrNull(first: number | null, second: number | null): number | null {
  if (first === null && second === null) {
    return null;
  }

  return (first ?? 0) + (second ?? 0);
}

export function resolvePrimaryStatistic(
  statistics: PlayerDetailsDto['statistics'],
  season?: number,
): PlayerStatDto | null {
  if (!statistics || statistics.length === 0) {
    return null;
  }

  const seasonScoped =
    typeof season === 'number'
      ? statistics.filter(item => item.league?.season === season)
      : statistics;
  const candidates = seasonScoped.length > 0 ? seasonScoped : statistics;

  return (
    [...candidates].sort((first, second) => {
      const firstMinutes = first.games?.minutes ?? 0;
      const secondMinutes = second.games?.minutes ?? 0;
      if (secondMinutes !== firstMinutes) {
        return secondMinutes - firstMinutes;
      }

      const firstAppearances = first.games?.appearences ?? 0;
      const secondAppearances = second.games?.appearences ?? 0;
      if (secondAppearances !== firstAppearances) {
        return secondAppearances - firstAppearances;
      }

      return (second.goals?.total ?? 0) - (first.goals?.total ?? 0);
    })[0] ?? null
  );
}

export function resolveSeasonStatistics(
  statistics: PlayerDetailsDto['statistics'],
  season?: number,
): PlayerStatDto[] {
  if (!statistics || statistics.length === 0) {
    return [];
  }

  const seasonScoped =
    typeof season === 'number'
      ? statistics.filter(item => item.league?.season === season)
      : statistics;

  return seasonScoped.length > 0 ? seasonScoped : statistics;
}

export function createEmptySeasonStats(): PlayerSeasonStats {
  return {
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
}

export function aggregateSeasonStats(statsRows: PlayerStatDto[]): PlayerSeasonStats {
  if (statsRows.length === 0) {
    return createEmptySeasonStats();
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

  statsRows.forEach(stat => {
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

type CompetitionGroup = {
  leagueId: string | null;
  leagueName: string | null;
  leagueLogo: string | null;
  season: number | null;
  statsRows: PlayerStatDto[];
};

function groupStatsByCompetition(statsRows: PlayerStatDto[]): CompetitionGroup[] {
  const groups = new Map<string, CompetitionGroup>();

  statsRows.forEach((stat, index) => {
    const leagueId = toId(stat.league?.id);
    const leagueName = normalizeString(stat.league?.name);
    const leagueLogo = normalizeString(stat.league?.logo);
    const leagueSeason = normalizeNumber(stat.league?.season);
    const fallbackKey = `competition-${index}`;
    const key = `${leagueId ?? leagueName ?? fallbackKey}-${leagueSeason ?? 'unknown'}`;

    const existing = groups.get(key);
    if (existing) {
      existing.statsRows.push(stat);
      if (!existing.leagueName && leagueName) {
        existing.leagueName = leagueName;
      }
      if (!existing.leagueLogo && leagueLogo) {
        existing.leagueLogo = leagueLogo;
      }
      if (existing.season === null && leagueSeason !== null) {
        existing.season = leagueSeason;
      }
      return;
    }

    groups.set(key, {
      leagueId,
      leagueName,
      leagueLogo,
      season: leagueSeason,
      statsRows: [stat],
    });
  });

  return Array.from(groups.values());
}

function compareCompetitionStats(
  first: PlayerCompetitionSeasonStats,
  second: PlayerCompetitionSeasonStats,
): number {
  const firstSeason = first.season ?? Number.NEGATIVE_INFINITY;
  const secondSeason = second.season ?? Number.NEGATIVE_INFINITY;
  if (secondSeason !== firstSeason) {
    return secondSeason - firstSeason;
  }

  const firstMatches = first.stats.matches ?? Number.NEGATIVE_INFINITY;
  const secondMatches = second.stats.matches ?? Number.NEGATIVE_INFINITY;
  if (secondMatches !== firstMatches) {
    return secondMatches - firstMatches;
  }

  return (first.leagueName ?? '').localeCompare(second.leagueName ?? '');
}

export function mapPlayerDetailsToSeasonStatsDataset(
  dto: PlayerDetailsDto,
  season?: number,
): PlayerSeasonStatsDataset {
  const statsRows = resolveSeasonStatistics(dto.statistics, season);
  const overall = aggregateSeasonStats(statsRows);

  if (statsRows.length === 0) {
    return {
      overall,
      byCompetition: [],
    };
  }

  const byCompetition = groupStatsByCompetition(statsRows)
    .map<PlayerCompetitionSeasonStats>(group => ({
      leagueId: group.leagueId,
      leagueName: group.leagueName,
      leagueLogo: group.leagueLogo,
      season: group.season,
      stats: aggregateSeasonStats(group.statsRows),
    }))
    .filter(item => (item.stats.matches ?? 0) > 0)
    .sort(compareCompetitionStats);

  return {
    overall,
    byCompetition,
  };
}
