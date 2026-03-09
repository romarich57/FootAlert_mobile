import type {
  PlayerCharacteristics,
  PlayerDetailsDto,
  PlayerProfile,
  PlayerProfileCompetitionStats,
  PlayerSeasonStatsDataset,
} from './contracts.js';
import { normalizeNumber, normalizeString, resolvePrimaryStatistic, sumOrNull, toId } from './seasonStats.js';

export function mapPlayerDetailsToProfile(
  dto: PlayerDetailsDto,
  season?: number,
): PlayerProfile | null {
  if (!dto.player) {
    return null;
  }

  const profile = dto.player;
  const statistic = resolvePrimaryStatistic(dto.statistics, season);

  return {
    id: toId(profile.id),
    name: normalizeString(profile.name),
    photo: normalizeString(profile.photo),
    position: normalizeString(statistic?.games?.position),
    age: normalizeNumber(profile.age),
    height: normalizeString(profile.height),
    weight: normalizeString(profile.weight),
    nationality: normalizeString(profile.nationality),
    dateOfBirth: normalizeString(profile.birth?.date),
    number: statistic?.games?.number ?? null,
    foot: null,
    transferValue: null,
    team: {
      id: toId(statistic?.team?.id),
      name: normalizeString(statistic?.team?.name),
      logo: normalizeString(statistic?.team?.logo),
    },
    league: {
      id: toId(statistic?.league?.id),
      name: normalizeString(statistic?.league?.name),
      logo: normalizeString(statistic?.league?.logo),
      season: normalizeNumber(statistic?.league?.season),
    },
  };
}

export function mapPlayerDetailsToCharacteristics(
  dto: PlayerDetailsDto,
  season?: number,
): PlayerCharacteristics {
  const statistic = resolvePrimaryStatistic(dto.statistics, season);
  if (!statistic) {
    return {
      touches: null,
      dribbles: null,
      chances: null,
      defense: null,
      duels: null,
      attack: null,
    };
  }

  const touches = sumOrNull(
    normalizeNumber(statistic.passes?.total),
    normalizeNumber(statistic.dribbles?.attempts),
  );
  const dribbles = normalizeNumber(statistic.dribbles?.success);
  const chances = normalizeNumber(statistic.passes?.key);
  const defense = sumOrNull(
    normalizeNumber(statistic.tackles?.total),
    normalizeNumber(statistic.tackles?.interceptions),
  );
  const duels = normalizeNumber(statistic.duels?.won);
  const attack = sumOrNull(
    normalizeNumber(statistic.goals?.total),
    normalizeNumber(statistic.shots?.on),
  );

  return { touches, dribbles, chances, defense, duels, attack };
}

function toRatingWeight(value: string | null): number {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

function compareByMostPlayed(
  first: PlayerProfileCompetitionStats,
  second: PlayerProfileCompetitionStats,
): number {
  const firstMatches = first.matches ?? Number.NEGATIVE_INFINITY;
  const secondMatches = second.matches ?? Number.NEGATIVE_INFINITY;
  if (secondMatches !== firstMatches) {
    return secondMatches - firstMatches;
  }

  const firstRating = toRatingWeight(first.rating);
  const secondRating = toRatingWeight(second.rating);
  if (secondRating !== firstRating) {
    return secondRating - firstRating;
  }

  return (first.leagueName ?? '').localeCompare(second.leagueName ?? '');
}

export function selectProfileCompetitionStats(
  seasonStatsDataset: PlayerSeasonStatsDataset | null | undefined,
): PlayerProfileCompetitionStats | null {
  if (!seasonStatsDataset || seasonStatsDataset.byCompetition.length === 0) {
    return null;
  }

  const mappedStats = seasonStatsDataset.byCompetition.map<PlayerProfileCompetitionStats>(competition => ({
    leagueId: competition.leagueId,
    leagueName: competition.leagueName,
    leagueLogo: competition.leagueLogo,
    season: competition.season,
    matches: competition.stats.matches,
    goals: competition.stats.goals,
    assists: competition.stats.assists,
    rating: competition.stats.rating,
  }));

  const recentSeasons = mappedStats
    .map(item => item.season)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  const latestSeason = recentSeasons.length > 0 ? Math.max(...recentSeasons) : null;
  const seasonScoped =
    latestSeason !== null
      ? mappedStats.filter(item => item.season === latestSeason)
      : mappedStats;

  if (seasonScoped.length === 0) {
    return null;
  }

  return [...seasonScoped].sort(compareByMostPlayed)[0] ?? null;
}
