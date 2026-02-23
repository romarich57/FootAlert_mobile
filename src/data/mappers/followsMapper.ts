import type {
  FollowedPlayerCard,
  FollowedTeamCard,
  FollowsApiFixtureDto,
  FollowsApiPlayerSearchDto,
  FollowsApiPlayerSeasonDto,
  FollowsApiStandingDto,
  FollowsApiTeamDetailsDto,
  FollowsApiTeamSearchDto,
  FollowsApiTopScorerDto,
  FollowsSearchResultPlayer,
  FollowsSearchResultTeam,
  TrendPlayerItem,
  TrendTeamItem,
} from '@ui/features/follows/types/follows.types';

type PlayerSearchStat = NonNullable<FollowsApiPlayerSearchDto['statistics']>[number];
type PlayerSeasonStat = NonNullable<FollowsApiPlayerSeasonDto['statistics']>[number];
type PlayerComparableStat = {
  league?: { season?: number };
  games?: { minutes?: number; appearences?: number; position?: string };
  goals?: { total?: number | null };
};

function toId(value: number | string | undefined): string {
  if (value === undefined || value === null) {
    return '';
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : '';
}

function normalizeText(value: string | undefined | null, fallback = ''): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function normalizeImageUri(value: string | undefined | null): string {
  if (typeof value !== 'string') {
    return '';
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : '';
}

function normalizeDateIso(value: string | undefined | null): string {
  if (typeof value !== 'string') {
    return '';
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : '';
}

function normalizeNumber(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function resolvePrimaryStat<T extends PlayerComparableStat>(
  stats: T[] | undefined,
  preferredSeason?: number,
): T | undefined {
  if (!stats || stats.length === 0) {
    return undefined;
  }

  const seasonScoped = typeof preferredSeason === 'number'
    ? stats.filter(item => item.league?.season === preferredSeason)
    : stats;
  const candidates = seasonScoped.length > 0 ? seasonScoped : stats;

  return [...candidates].sort((a, b) => {
    const aMinutes = a.games?.minutes ?? 0;
    const bMinutes = b.games?.minutes ?? 0;
    if (bMinutes !== aMinutes) {
      return bMinutes - aMinutes;
    }

    const aAppearances = a.games?.appearences ?? 0;
    const bAppearances = b.games?.appearences ?? 0;
    if (bAppearances !== aAppearances) {
      return bAppearances - aAppearances;
    }

    const aGoals = a.goals?.total ?? 0;
    const bGoals = b.goals?.total ?? 0;
    return bGoals - aGoals;
  })[0];
}

function uniqueById<T>(items: T[], getId: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const id = getId(item);
    if (!id || seen.has(id)) {
      return false;
    }

    seen.add(id);
    return true;
  });
}

export function getCurrentSeasonYear(now = new Date()): number {
  const month = now.getUTCMonth() + 1;
  const year = now.getUTCFullYear();

  return month >= 7 ? year : year - 1;
}

export function mapTeamSearchResults(
  payload: FollowsApiTeamSearchDto[],
  limit: number,
): FollowsSearchResultTeam[] {
  const mapped = payload
    .map(item => ({
      teamId: toId(item.team?.id),
      teamName: normalizeText(item.team?.name),
      teamLogo: normalizeImageUri(item.team?.logo),
      country: normalizeText(item.team?.country),
    }))
    .filter(item => Boolean(item.teamId));

  return uniqueById(mapped, item => item.teamId).slice(0, limit);
}

function resolvePlayerSearchStat(
  payload: FollowsApiPlayerSearchDto,
): PlayerSearchStat | undefined {
  return resolvePrimaryStat(payload.statistics, getCurrentSeasonYear());
}

export function mapPlayerSearchResults(
  payload: FollowsApiPlayerSearchDto[],
  limit: number,
): FollowsSearchResultPlayer[] {
  const mapped = payload
    .map(item => {
      const stat = resolvePlayerSearchStat(item);

      return {
        playerId: toId(item.player?.id),
        playerName: normalizeText(item.player?.name),
        playerPhoto: normalizeImageUri(item.player?.photo),
        position: normalizeText(stat?.games?.position),
        teamName: normalizeText(stat?.team?.name),
        teamLogo: normalizeImageUri(stat?.team?.logo),
        leagueName: normalizeText(stat?.league?.name),
      };
    })
    .filter(item => Boolean(item.playerId));

  return uniqueById(mapped, item => item.playerId).slice(0, limit);
}

export function mapTeamDetailsAndFixtureToFollowedCard(
  teamId: string,
  teamDetails: FollowsApiTeamDetailsDto | null,
  nextFixture: FollowsApiFixtureDto | null,
): FollowedTeamCard {
  const normalizedTeamId = toId(teamId);
  const homeTeam = nextFixture?.teams?.home;
  const awayTeam = nextFixture?.teams?.away;

  const isHome = toId(homeTeam?.id) === normalizedTeamId;
  const teamNameFromFixture = isHome ? homeTeam?.name : awayTeam?.name;
  const teamLogoFromFixture = isHome ? homeTeam?.logo : awayTeam?.logo;
  const opponentTeam = isHome ? awayTeam : homeTeam;

  return {
    teamId: normalizedTeamId,
    teamName: normalizeText(teamDetails?.team?.name ?? teamNameFromFixture),
    teamLogo: normalizeImageUri(teamDetails?.team?.logo ?? teamLogoFromFixture),
    nextMatch: nextFixture?.fixture?.id
      ? {
          fixtureId: toId(nextFixture.fixture.id),
          opponentTeamName: normalizeText(opponentTeam?.name),
          opponentTeamLogo: normalizeImageUri(opponentTeam?.logo),
          startDate: normalizeDateIso(nextFixture.fixture.date),
        }
      : null,
  };
}

function resolvePlayerSeasonStat(
  payload: FollowsApiPlayerSeasonDto,
  season?: number,
):
  | PlayerSeasonStat
  | undefined {
  return resolvePrimaryStat(payload.statistics, season);
}

export function mapPlayerSeasonToFollowedCard(
  playerId: string,
  payload: FollowsApiPlayerSeasonDto | null,
  season?: number,
): FollowedPlayerCard {
  const normalizedPlayerId = toId(playerId);
  const stat = payload ? resolvePlayerSeasonStat(payload, season) : undefined;

  return {
    playerId: normalizedPlayerId,
    playerName: normalizeText(payload?.player?.name),
    playerPhoto: normalizeImageUri(payload?.player?.photo),
    position: normalizeText(stat?.games?.position),
    teamName: normalizeText(stat?.team?.name),
    teamLogo: normalizeImageUri(stat?.team?.logo),
    leagueName: normalizeText(stat?.league?.name),
    goals: normalizeNumber(stat?.goals?.total),
    assists: normalizeNumber(stat?.goals?.assists),
  };
}

export function mapTrendingTeamsFromStandings(
  payload: FollowsApiStandingDto[],
  limit: number,
): TrendTeamItem[] {
  const collected = payload.flatMap(leagueItem => {
    const leagueName = normalizeText(leagueItem.league?.name);
    const standing = leagueItem.league?.standings?.[0] ?? [];

    return standing.map(item => ({
      teamId: toId(item.team?.id),
      teamName: normalizeText(item.team?.name),
      teamLogo: normalizeImageUri(item.team?.logo),
      leagueName,
    }));
  });

  return uniqueById(collected, item => item.teamId)
    .filter(item => Boolean(item.teamId))
    .slice(0, limit);
}

export function mapTrendingPlayersFromTopScorers(
  payload: FollowsApiTopScorerDto[],
  limit: number,
  season?: number,
): TrendPlayerItem[] {
  const mapped = payload.map(item => {
    const stat = resolvePrimaryStat(item.statistics, season);

    return {
      playerId: toId(item.player?.id),
      playerName: normalizeText(item.player?.name),
      playerPhoto: normalizeImageUri(item.player?.photo),
      position: normalizeText(stat?.games?.position),
      teamName: normalizeText(stat?.team?.name),
      teamLogo: normalizeImageUri(stat?.team?.logo),
    };
  });

  return uniqueById(mapped, item => item.playerId)
    .filter(item => Boolean(item.playerId))
    .slice(0, limit);
}
