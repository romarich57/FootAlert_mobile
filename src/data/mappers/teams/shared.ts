import type { TeamApiPlayerDto } from '@ui/features/teams/types/teams.types';

export type TeamPlayerStatistic = NonNullable<TeamApiPlayerDto['statistics']>[number];

export type TeamPlayerStatContext = {
  season?: number | null;
  teamId?: string | null;
  leagueId?: string | null;
};

export function toText(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function toNumber(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function toId(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

export function toParsedFloat(value: string | null | undefined): number | null {
  if (typeof value !== 'string') {
    return null;
  }

  const parsed = Number.parseFloat(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

export function resolvePrimaryTeamPlayerStatistic(
  statistics: TeamApiPlayerDto['statistics'],
  context: TeamPlayerStatContext,
): TeamPlayerStatistic | undefined {
  if (!statistics || statistics.length === 0) {
    return undefined;
  }

  const normalizedTeamId = toId(context.teamId);
  const normalizedLeagueId = toId(context.leagueId);
  const season = typeof context.season === 'number' ? context.season : null;

  const hasSeason = season !== null;
  const hasTeam = Boolean(normalizedTeamId);
  const hasLeague = Boolean(normalizedLeagueId);

  const filterBy = (
    matcher: (stat: TeamPlayerStatistic) => boolean,
  ): TeamPlayerStatistic[] => statistics.filter(matcher);

  const getCandidates = (): TeamPlayerStatistic[] => {
    if (hasSeason && hasTeam && hasLeague) {
      const strict = filterBy(
        stat =>
          stat.league?.season === season &&
          toId(stat.team?.id) === normalizedTeamId &&
          toId(stat.league?.id) === normalizedLeagueId,
      );
      if (strict.length > 0) return strict;
    }

    if (hasSeason && hasTeam) {
      const bySeasonAndTeam = filterBy(
        stat =>
          stat.league?.season === season &&
          toId(stat.team?.id) === normalizedTeamId,
      );
      if (bySeasonAndTeam.length > 0) return bySeasonAndTeam;
    }

    if (hasSeason && hasLeague) {
      const bySeasonAndLeague = filterBy(
        stat =>
          stat.league?.season === season &&
          toId(stat.league?.id) === normalizedLeagueId,
      );
      if (bySeasonAndLeague.length > 0) return bySeasonAndLeague;
    }

    if (hasTeam && hasLeague) {
      const byTeamAndLeague = filterBy(
        stat =>
          toId(stat.team?.id) === normalizedTeamId &&
          toId(stat.league?.id) === normalizedLeagueId,
      );
      if (byTeamAndLeague.length > 0) return byTeamAndLeague;
    }

    if (hasSeason) {
      const bySeason = filterBy(stat => stat.league?.season === season);
      if (bySeason.length > 0) return bySeason;
    }

    if (hasTeam) {
      const byTeam = filterBy(stat => toId(stat.team?.id) === normalizedTeamId);
      if (byTeam.length > 0) return byTeam;
    }

    if (hasLeague) {
      const byLeague = filterBy(stat => toId(stat.league?.id) === normalizedLeagueId);
      if (byLeague.length > 0) return byLeague;
    }

    return statistics;
  };

  const candidates = getCandidates();

  return [...candidates].sort((a, b) => {
    const aMinutes = toNumber(a.games?.minutes) ?? 0;
    const bMinutes = toNumber(b.games?.minutes) ?? 0;
    if (bMinutes !== aMinutes) {
      return bMinutes - aMinutes;
    }

    const aAppearances = toNumber(a.games?.appearences) ?? 0;
    const bAppearances = toNumber(b.games?.appearences) ?? 0;
    if (bAppearances !== aAppearances) {
      return bAppearances - aAppearances;
    }

    const aGoals = toNumber(a.goals?.total) ?? 0;
    const bGoals = toNumber(b.goals?.total) ?? 0;
    if (bGoals !== aGoals) {
      return bGoals - aGoals;
    }

    const aAssists = toNumber(a.goals?.assists) ?? 0;
    const bAssists = toNumber(b.goals?.assists) ?? 0;
    if (bAssists !== aAssists) {
      return bAssists - aAssists;
    }

    const aRating = toParsedFloat(a.games?.rating) ?? 0;
    const bRating = toParsedFloat(b.games?.rating) ?? 0;
    return bRating - aRating;
  })[0];
}

export function toSortableTimestamp(value: string | null): number {
  if (!value) {
    return Number.MAX_SAFE_INTEGER;
  }

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}
