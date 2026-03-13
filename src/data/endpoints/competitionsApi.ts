import { createCompetitionsReadService } from '@app-core/services/competitionsService';
import type {
  CompetitionBracket,
  CompetitionKind,
  CompetitionTeamStatsDashboardData,
  CompetitionsApiFixtureDto,
  CompetitionsApiLeagueDto,
  CompetitionsApiPlayerStatDto,
  CompetitionsApiStandingDto,
  CompetitionsApiTransferDto,
} from '@domain/contracts/competitions.types';
import type {
  MobileFullPayloadHydration,
} from '@domain/contracts/fullPayloadHydration.types';
import type { PayloadFreshnessMeta } from '@domain/contracts/freshnessMeta.types';
import {
  mobileReadHttpAdapter,
  mobileReadTelemetryAdapter,
} from '@data/endpoints/sharedReadServiceAdapters';

const competitionsReadService = createCompetitionsReadService({
  http: mobileReadHttpAdapter,
  telemetry: mobileReadTelemetryAdapter,
});

export async function fetchAllLeagues(signal?: AbortSignal): Promise<CompetitionsApiLeagueDto[]> {
  return competitionsReadService.fetchAllLeagues<CompetitionsApiLeagueDto>(signal);
}

export async function searchLeaguesByName(
  query: string,
  signal?: AbortSignal,
): Promise<CompetitionsApiLeagueDto[]> {
  return competitionsReadService.searchLeaguesByName<CompetitionsApiLeagueDto>(query, signal);
}

export async function fetchLeagueById(
  id: string,
  signal?: AbortSignal,
): Promise<CompetitionsApiLeagueDto | null> {
  return competitionsReadService.fetchLeagueById<CompetitionsApiLeagueDto>(id, signal);
}

export async function fetchLeagueStandings(
  leagueId: number,
  season: number,
  signal?: AbortSignal,
): Promise<CompetitionsApiStandingDto | null> {
  return competitionsReadService.fetchLeagueStandings<CompetitionsApiStandingDto>(
    leagueId,
    season,
    signal,
  );
}

export async function fetchLeagueFixtures(
  leagueId: number,
  season: number,
  signal?: AbortSignal,
  options?: {
    limit?: number;
    cursor?: string;
  },
): Promise<CompetitionsApiFixtureDto[]> {
  return competitionsReadService.fetchLeagueFixtures<CompetitionsApiFixtureDto>(
    leagueId,
    season,
    signal,
    options,
  );
}

export type FixturesPage = {
  items: CompetitionsApiFixtureDto[];
  pageInfo:
    | {
        hasMore: boolean;
        nextCursor: string | null;
        hasPrevious: boolean;
        previousCursor: string | null;
      }
    | undefined;
};

export async function fetchLeagueFixturesPage(
  leagueId: number,
  season: number,
  signal?: AbortSignal,
  options?: {
    limit?: number;
    cursor?: string;
  },
): Promise<FixturesPage> {
  const envelope = await competitionsReadService.fetchLeagueFixturesPage<CompetitionsApiFixtureDto>(
    leagueId,
    season,
    signal,
    options,
  );
  return {
    items: envelope.response,
    pageInfo: envelope.pageInfo
      ? {
          hasMore: envelope.pageInfo.hasMore,
          nextCursor: envelope.pageInfo.nextCursor,
          hasPrevious: envelope.pageInfo.hasPrevious,
          previousCursor: envelope.pageInfo.previousCursor,
        }
      : undefined,
  };
}

async function fetchLeaguePlayerStatsByType(
  leagueId: number,
  season: number,
  type: 'topscorers' | 'topassists' | 'topyellowcards' | 'topredcards',
  signal?: AbortSignal,
): Promise<CompetitionsApiPlayerStatDto[]> {
  return competitionsReadService.fetchLeaguePlayerStats<CompetitionsApiPlayerStatDto>(
    leagueId,
    season,
    type,
    signal,
  );
}

export async function fetchLeagueTopScorers(
  leagueId: number,
  season: number,
  signal?: AbortSignal,
): Promise<CompetitionsApiPlayerStatDto[]> {
  return fetchLeaguePlayerStatsByType(leagueId, season, 'topscorers', signal);
}

export async function fetchLeagueTopAssists(
  leagueId: number,
  season: number,
  signal?: AbortSignal,
): Promise<CompetitionsApiPlayerStatDto[]> {
  return fetchLeaguePlayerStatsByType(leagueId, season, 'topassists', signal);
}

export async function fetchLeagueTopYellowCards(
  leagueId: number,
  season: number,
  signal?: AbortSignal,
): Promise<CompetitionsApiPlayerStatDto[]> {
  return fetchLeaguePlayerStatsByType(leagueId, season, 'topyellowcards', signal);
}

export async function fetchLeagueTopRedCards(
  leagueId: number,
  season: number,
  signal?: AbortSignal,
): Promise<CompetitionsApiPlayerStatDto[]> {
  return fetchLeaguePlayerStatsByType(leagueId, season, 'topredcards', signal);
}

export async function fetchLeagueTransfers(
  leagueId: number,
  season?: number,
  signal?: AbortSignal,
): Promise<CompetitionsApiTransferDto[]> {
  return competitionsReadService.fetchLeagueTransfers<CompetitionsApiTransferDto>(
    leagueId,
    season,
    signal,
  );
}

export async function fetchCompetitionBracket(
  leagueId: number,
  season: number,
  signal?: AbortSignal,
): Promise<CompetitionBracket> {
  // Le BFF retourne { competitionKind, bracket } — pas d'enveloppe response[]
  const raw = await competitionsReadService.fetchCompetitionBracket<{
    competitionKind: string;
    bracket: unknown[] | null;
  }>(leagueId, season, signal);

  const validKinds: CompetitionKind[] = ['league', 'cup', 'mixed'];
  const kind: CompetitionKind = validKinds.includes(raw.competitionKind as CompetitionKind)
    ? (raw.competitionKind as CompetitionKind)
    : 'league';

  return {
    competitionKind: kind,
    bracket: raw.bracket as CompetitionBracket['bracket'],
  };
}

export type CompetitionFullPayload = {
  _meta?: PayloadFreshnessMeta;
  _hydration?: MobileFullPayloadHydration;
  competition: CompetitionsApiLeagueDto | null;
  competitionKind: CompetitionKind;
  season: number;
  standings: CompetitionsApiStandingDto | null;
  matches: CompetitionsApiFixtureDto[];
  bracket: CompetitionBracket['bracket'];
  playerStats: {
    topScorers: CompetitionsApiPlayerStatDto[];
    topAssists: CompetitionsApiPlayerStatDto[];
    topYellowCards: CompetitionsApiPlayerStatDto[];
    topRedCards: CompetitionsApiPlayerStatDto[];
  };
  teamStats: CompetitionTeamStatsDashboardData | null;
  transfers: CompetitionsApiTransferDto[];
};

type RawCompetitionFullPayload = Omit<CompetitionFullPayload, 'competitionKind' | 'playerStats'> & {
  competitionKind: string;
  playerStats?: Partial<CompetitionFullPayload['playerStats']>;
};

export async function fetchCompetitionFull(
  leagueId: number,
  season?: number,
  signal?: AbortSignal,
): Promise<CompetitionFullPayload> {
  const raw = await competitionsReadService.fetchCompetitionFull<RawCompetitionFullPayload>(
    leagueId,
    season,
    signal,
  );
  const validKinds: CompetitionKind[] = ['league', 'cup', 'mixed'];
  const competitionKind: CompetitionKind = validKinds.includes(raw.competitionKind as CompetitionKind)
    ? (raw.competitionKind as CompetitionKind)
    : 'league';

  return {
    _meta: raw._meta,
    _hydration: raw._hydration,
    competition: raw.competition ?? null,
    competitionKind,
    season: raw.season,
    standings: raw.standings ?? null,
    matches: raw.matches ?? [],
    bracket: raw.bracket ?? null,
    playerStats: {
      topScorers: raw.playerStats?.topScorers ?? [],
      topAssists: raw.playerStats?.topAssists ?? [],
      topYellowCards: raw.playerStats?.topYellowCards ?? [],
      topRedCards: raw.playerStats?.topRedCards ?? [],
    },
    teamStats: raw.teamStats ?? null,
    transfers: raw.transfers ?? [],
  };
}

export async function fetchCompetitionTotw(
  leagueId: number,
  season: number,
  signal?: AbortSignal,
): Promise<{
  topScorers: CompetitionsApiPlayerStatDto[];
  topAssists: CompetitionsApiPlayerStatDto[];
  topYellowCards: CompetitionsApiPlayerStatDto[];
  topRedCards: CompetitionsApiPlayerStatDto[];
}> {
  return competitionsReadService.fetchCompetitionTotw<CompetitionsApiPlayerStatDto>(
    leagueId,
    season,
    signal,
  );
}

export async function fetchCompetitionTeamStats(
  leagueId: number,
  season: number,
  signal?: AbortSignal,
): Promise<CompetitionTeamStatsDashboardData> {
  return competitionsReadService.fetchCompetitionTeamStats<CompetitionTeamStatsDashboardData>(
    leagueId,
    season,
    signal,
  );
}
