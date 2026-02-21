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

function toId(value: number | string | undefined): string {
  return String(value ?? '');
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
      teamName: item.team?.name?.trim() ?? 'Unknown team',
      teamLogo: item.team?.logo ?? '',
      country: item.team?.country ?? '',
    }))
    .filter(item => Boolean(item.teamId));

  return uniqueById(mapped, item => item.teamId).slice(0, limit);
}

function resolvePlayerSearchStat(
  payload: FollowsApiPlayerSearchDto,
): PlayerSearchStat | undefined {
  return payload.statistics?.[0];
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
        playerName: item.player?.name?.trim() ?? 'Unknown player',
        playerPhoto: item.player?.photo ?? '',
        position: stat?.games?.position ?? '',
        teamName: stat?.team?.name ?? '',
        teamLogo: stat?.team?.logo ?? '',
        leagueName: stat?.league?.name ?? '',
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
    teamName: teamDetails?.team?.name ?? teamNameFromFixture ?? `Team #${normalizedTeamId}`,
    teamLogo: teamDetails?.team?.logo ?? teamLogoFromFixture ?? '',
    nextMatch: nextFixture?.fixture?.id
      ? {
          fixtureId: toId(nextFixture.fixture.id),
          opponentTeamName: opponentTeam?.name ?? '',
          opponentTeamLogo: opponentTeam?.logo ?? '',
          startDate: nextFixture.fixture.date ?? '',
        }
      : null,
  };
}

function resolvePlayerSeasonStat(payload: FollowsApiPlayerSeasonDto):
  | PlayerSeasonStat
  | undefined {
  return payload.statistics?.[0];
}

export function mapPlayerSeasonToFollowedCard(
  playerId: string,
  payload: FollowsApiPlayerSeasonDto | null,
): FollowedPlayerCard {
  const normalizedPlayerId = toId(playerId);
  const stat = payload ? resolvePlayerSeasonStat(payload) : undefined;

  return {
    playerId: normalizedPlayerId,
    playerName: payload?.player?.name ?? `Player #${normalizedPlayerId}`,
    playerPhoto: payload?.player?.photo ?? '',
    position: stat?.games?.position ?? '',
    teamName: stat?.team?.name ?? '',
    teamLogo: stat?.team?.logo ?? '',
    leagueName: stat?.league?.name ?? '',
    goals: stat?.goals?.total ?? 0,
    assists: stat?.goals?.assists ?? 0,
  };
}

export function mapTrendingTeamsFromStandings(
  payload: FollowsApiStandingDto[],
  limit: number,
): TrendTeamItem[] {
  const collected = payload.flatMap(leagueItem => {
    const leagueName = leagueItem.league?.name ?? '';
    const standing = leagueItem.league?.standings?.[0] ?? [];

    return standing.map(item => ({
      teamId: toId(item.team?.id),
      teamName: item.team?.name ?? 'Unknown team',
      teamLogo: item.team?.logo ?? '',
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
): TrendPlayerItem[] {
  const mapped = payload.map(item => ({
    playerId: toId(item.player?.id),
    playerName: item.player?.name ?? 'Unknown player',
    playerPhoto: item.player?.photo ?? '',
    position: item.statistics?.[0]?.games?.position ?? '',
    teamName: item.statistics?.[0]?.team?.name ?? '',
    teamLogo: item.statistics?.[0]?.team?.logo ?? '',
  }));

  return uniqueById(mapped, item => item.playerId)
    .filter(item => Boolean(item.playerId))
    .slice(0, limit);
}
