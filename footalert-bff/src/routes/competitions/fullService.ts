import { apiFootballGet } from '../../lib/apiFootballClient.js';
import { env } from '../../config/env.js';
import {
  buildCanonicalCacheKey,
  withCache,
  withCacheStaleWhileRevalidate,
} from '../../lib/cache.js';
import {
  buildFreshnessMeta,
  freshnessHints,
  type PayloadFreshnessMeta,
} from '../../lib/freshnessMeta.js';
import type { FullPayloadHydration } from '../../lib/readStore/hydration.js';
import { mapWithConcurrency } from '../../lib/concurrency/mapWithConcurrency.js';

import { buildCompetitionBracket } from './bracketMapper.js';
import {
  COMPETITION_TRANSFERS_MAX_CONCURRENCY,
  type CompetitionLeagueTeamEntry,
  type CompetitionTransfersResponse,
  type FlattenedCompetitionTransfer,
} from './schemas.js';
import { buildCompetitionTeamStatsResponse } from './teamStats/service.js';
import {
  buildPlayerStatsPath,
  buildTransferKey,
  isDateInSeason,
  mapTransferTeamPayload,
  normalizeTransferDate,
  toFiniteNumber,
  toSortedTransfers,
  toText,
} from './transfersMapper.js';

const COMPETITION_CACHE_TTL_MS = env.cacheTtl.competitions;

type CompetitionKind = 'league' | 'cup' | 'mixed';
type ResponseEnvelope = { response?: unknown[] } & Record<string, unknown>;
type CompetitionPlayerStatsBundle = {
  topScorers: unknown[];
  topAssists: unknown[];
  topYellowCards: unknown[];
  topRedCards: unknown[];
};

export type CompetitionFullResponse = {
  _meta: PayloadFreshnessMeta;
  _hydration?: FullPayloadHydration;
  competition: unknown | null;
  competitionKind: CompetitionKind;
  season: number;
  standings: unknown | null;
  matches: unknown[];
  bracket: unknown[] | null;
  playerStats: CompetitionPlayerStatsBundle;
  teamStats: unknown | null;
  transfers: unknown[];
};

export type CompetitionCoreSnapshotPayload = Pick<
  CompetitionFullResponse,
  'competition' | 'competitionKind' | 'season' | 'standings' | 'matches'
>;

export type CompetitionBracketSectionPayload = CompetitionFullResponse['bracket'];
export type CompetitionPlayerStatsSectionPayload = CompetitionFullResponse['playerStats'];
export type CompetitionTeamStatsSectionPayload = CompetitionFullResponse['teamStats'];
export type CompetitionTransfersSectionPayload = CompetitionFullResponse['transfers'];

const EMPTY_PLAYER_STATS: CompetitionPlayerStatsBundle = {
  topScorers: [],
  topAssists: [],
  topYellowCards: [],
  topRedCards: [],
};

function toResponseArray(value: unknown): unknown[] {
  if (!value || typeof value !== 'object') {
    return [];
  }

  const response = (value as ResponseEnvelope).response;
  return Array.isArray(response) ? response : [];
}

function readCompetitionType(value: unknown): string {
  if (!value || typeof value !== 'object') {
    return '';
  }

  const league = (value as Record<string, unknown>).league;
  if (!league || typeof league !== 'object') {
    return '';
  }

  const type = (league as Record<string, unknown>).type;
  return typeof type === 'string' ? type.trim().toLowerCase() : '';
}

function readCompetitionCurrentSeason(value: unknown): number | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const seasons = (value as Record<string, unknown>).seasons;
  if (!Array.isArray(seasons)) {
    return null;
  }

  const currentSeasonEntry = seasons.find(entry => {
    if (!entry || typeof entry !== 'object') {
      return false;
    }

    return (entry as Record<string, unknown>).current === true;
  });
  const fallbackSeasonEntry = currentSeasonEntry ?? seasons[0];
  if (!fallbackSeasonEntry || typeof fallbackSeasonEntry !== 'object') {
    return null;
  }

  const year = (fallbackSeasonEntry as Record<string, unknown>).year;
  return typeof year === 'number' && Number.isFinite(year) ? year : null;
}

function resolveCompetitionKind(
  competition: unknown | null,
  fixtures: unknown[],
): { competitionKind: CompetitionKind; bracket: unknown[] | null } {
  const bracketPayload = buildCompetitionBracket(fixtures);
  const competitionType = readCompetitionType(competition);

  if (fixtures.length === 0 && competitionType === 'cup') {
    return {
      competitionKind: 'cup',
      bracket: null,
    };
  }

  return bracketPayload;
}

async function fetchCompetitionRecord(competitionId: string): Promise<unknown | null> {
  const payload = await withCache<ResponseEnvelope>(
    buildCanonicalCacheKey('competition:full:league', { competitionId }),
    COMPETITION_CACHE_TTL_MS,
    () =>
      apiFootballGet<ResponseEnvelope>(
        `/leagues?id=${encodeURIComponent(competitionId)}`,
      ),
  );

  return toResponseArray(payload)[0] ?? null;
}

async function fetchCompetitionFixtures(
  competitionId: string,
  season: number,
): Promise<unknown[]> {
  const payload = await withCache<ResponseEnvelope>(
    buildCanonicalCacheKey('competition:matches:upstream', {
      competitionId,
      season,
    }),
    COMPETITION_CACHE_TTL_MS,
    () =>
      apiFootballGet<ResponseEnvelope>(
        `/fixtures?league=${encodeURIComponent(competitionId)}&season=${encodeURIComponent(String(season))}`,
      ),
  );

  return toResponseArray(payload);
}

async function fetchCompetitionStandings(
  competitionId: string,
  season: number,
): Promise<unknown | null> {
  const payload = await withCache<ResponseEnvelope>(
    buildCanonicalCacheKey('competition:team-stats:standings', {
      leagueId: competitionId,
      season,
    }),
    COMPETITION_CACHE_TTL_MS,
    () =>
      apiFootballGet<ResponseEnvelope>(
        `/standings?league=${encodeURIComponent(competitionId)}&season=${encodeURIComponent(String(season))}`,
      ),
  );

  return toResponseArray(payload)[0] ?? null;
}

async function fetchCompetitionPlayerStatsList(
  competitionId: string,
  season: number,
  type: 'topscorers' | 'topassists' | 'topyellowcards' | 'topredcards',
): Promise<unknown[]> {
  const payload = await withCache<ResponseEnvelope>(
    buildCanonicalCacheKey('competition:full:player-stats', {
      competitionId,
      season,
      type,
    }),
    COMPETITION_CACHE_TTL_MS,
    () => apiFootballGet<ResponseEnvelope>(buildPlayerStatsPath(type, competitionId, season)),
  );

  return toResponseArray(payload);
}

async function fetchCompetitionPlayerStatsBundle(
  competitionId: string,
  season: number,
): Promise<CompetitionPlayerStatsBundle> {
  const [topScorers, topAssists, topYellowCards, topRedCards] = await Promise.all([
    fetchCompetitionPlayerStatsList(competitionId, season, 'topscorers'),
    fetchCompetitionPlayerStatsList(competitionId, season, 'topassists'),
    fetchCompetitionPlayerStatsList(competitionId, season, 'topyellowcards'),
    fetchCompetitionPlayerStatsList(competitionId, season, 'topredcards'),
  ]);

  return {
    topScorers,
    topAssists,
    topYellowCards,
    topRedCards,
  };
}

async function fetchCompetitionTransfers(
  competitionId: string,
  season: number,
): Promise<unknown[]> {
  return withCache(
    buildCanonicalCacheKey('competition:transfers:v2', {
      competitionId,
      season,
    }),
    COMPETITION_CACHE_TTL_MS,
    async () => {
      const teamsResponse = await apiFootballGet<{ response?: CompetitionLeagueTeamEntry[] }>(
        `/teams?league=${encodeURIComponent(competitionId)}&season=${encodeURIComponent(String(season))}`,
      );
      const teams = teamsResponse.response ?? [];
      if (teams.length === 0) {
        return [];
      }

      const leagueTeamIds = new Set<number>();
      teams.forEach(teamData => {
        const teamId = toFiniteNumber(teamData?.team?.id);
        if (teamId !== null) {
          leagueTeamIds.add(teamId);
        }
      });

      const transfersResponses = await mapWithConcurrency(
        teams,
        COMPETITION_TRANSFERS_MAX_CONCURRENCY,
        async teamData => {
          const teamId = toFiniteNumber(teamData?.team?.id);
          if (teamId === null) {
            return { response: [] } satisfies CompetitionTransfersResponse;
          }

          try {
            return await apiFootballGet<CompetitionTransfersResponse>(`/transfers?team=${teamId}`);
          } catch {
            return { response: [] } satisfies CompetitionTransfersResponse;
          }
        },
      );

      const flattenedTransfers = new Map<string, FlattenedCompetitionTransfer>();

      for (const transferResponse of transfersResponses) {
        const playerTransfers = Array.isArray(transferResponse.response)
          ? transferResponse.response
          : [];

        for (const playerTransfer of playerTransfers) {
          const transferBlock = (playerTransfer ?? {}) as Record<string, unknown>;
          const player = (transferBlock.player ?? {}) as Record<string, unknown>;
          const playerId = toFiniteNumber(player.id);
          const playerName = toText(player.name, '');
          if (playerId === null || !playerName) {
            continue;
          }

          const transferItems = Array.isArray(transferBlock.transfers)
            ? transferBlock.transfers
            : [];

          for (const transferItem of transferItems) {
            const transfer = (transferItem ?? {}) as Record<string, unknown>;
            const transferDate = normalizeTransferDate(toText(transfer.date));
            if (!transferDate || !isDateInSeason(transferDate, season)) {
              continue;
            }

            const transferType = toText(transfer.type);
            if (!transferType) {
              continue;
            }

            const transferTeams = (transfer.teams ?? {}) as Record<string, unknown>;
            const teamIn = mapTransferTeamPayload(transferTeams.in);
            const teamOut = mapTransferTeamPayload(transferTeams.out);
            if (teamIn.id <= 0 || teamOut.id <= 0 || !teamIn.name || !teamOut.name) {
              continue;
            }

            const teamInInLeague = leagueTeamIds.has(teamIn.id);
            const teamOutInLeague = leagueTeamIds.has(teamOut.id);
            if (!teamInInLeague && !teamOutInLeague) {
              continue;
            }

            const transferKey = buildTransferKey({
              playerId,
              playerName,
              transferType,
              teamInId: teamIn.id,
              teamInName: teamIn.name,
              teamOutId: teamOut.id,
              teamOutName: teamOut.name,
              teamInInLeague,
              teamOutInLeague,
            });
            const existingTransfer = flattenedTransfers.get(transferKey);
            const existingDate = existingTransfer?.transfers?.[0]?.date ?? '';
            if (existingDate >= transferDate) {
              continue;
            }

            flattenedTransfers.set(transferKey, {
              player: {
                id: playerId,
                name: playerName,
              },
              update: toText(transferBlock.update),
              transfers: [
                {
                  date: transferDate,
                  type: transferType,
                  teams: {
                    in: teamIn,
                    out: teamOut,
                  },
                },
              ],
              context: {
                teamInInLeague,
                teamOutInLeague,
              },
            });
          }
        }
      }

      return toSortedTransfers(flattenedTransfers);
    },
  );
}

export async function buildCompetitionCoreSnapshot(
  competitionId: string,
  requestedSeason?: number,
): Promise<CompetitionCoreSnapshotPayload> {
  const competition = await fetchCompetitionRecord(competitionId);
  const season =
    requestedSeason ??
    readCompetitionCurrentSeason(competition) ??
    new Date().getUTCFullYear();

  const matches = await fetchCompetitionFixtures(competitionId, season);
  const { competitionKind } = resolveCompetitionKind(competition, matches);
  const standings =
    competitionKind !== 'cup'
      ? await fetchCompetitionStandings(competitionId, season)
      : null;

  return {
    competition,
    competitionKind,
    season,
    standings,
    matches,
  };
}

export async function buildCompetitionBracketSection(input: {
  core: CompetitionCoreSnapshotPayload;
}): Promise<CompetitionBracketSectionPayload> {
  return resolveCompetitionKind(input.core.competition, input.core.matches).bracket;
}

export async function buildCompetitionPlayerStatsSection(input: {
  competitionId: string;
  core: CompetitionCoreSnapshotPayload;
}): Promise<CompetitionPlayerStatsSectionPayload> {
  if (input.core.competitionKind === 'cup') {
    return EMPTY_PLAYER_STATS;
  }

  return fetchCompetitionPlayerStatsBundle(
    input.competitionId,
    input.core.season,
  );
}

export async function buildCompetitionTeamStatsSection(input: {
  competitionId: string;
  core: CompetitionCoreSnapshotPayload;
}): Promise<CompetitionTeamStatsSectionPayload> {
  if (input.core.competitionKind === 'cup') {
    return null;
  }

  return buildCompetitionTeamStatsResponse(
    input.competitionId,
    input.core.season,
  );
}

export async function buildCompetitionTransfersSection(input: {
  competitionId: string;
  core: CompetitionCoreSnapshotPayload;
}): Promise<CompetitionTransfersSectionPayload> {
  return fetchCompetitionTransfers(
    input.competitionId,
    input.core.season,
  );
}

export function composeCompetitionFullPayload(input: {
  core: CompetitionCoreSnapshotPayload;
  bracket: CompetitionBracketSectionPayload;
  playerStats: CompetitionPlayerStatsSectionPayload;
  teamStats: CompetitionTeamStatsSectionPayload;
  transfers: CompetitionTransfersSectionPayload;
  hydration?: FullPayloadHydration;
}): CompetitionFullResponse {
  return {
    _meta: buildFreshnessMeta({
      competition: freshnessHints.static,
      standings: freshnessHints.postMatch,
      matches: freshnessHints.postMatch,
      bracket: freshnessHints.postMatch,
      playerStats: freshnessHints.postMatch,
      teamStats: freshnessHints.postMatch,
      transfers: freshnessHints.weekly,
    }),
    _hydration: input.hydration,
    competition: input.core.competition,
    competitionKind: input.core.competitionKind,
    season: input.core.season,
    standings: input.core.standings,
    matches: input.core.matches,
    bracket: input.bracket,
    playerStats: input.playerStats,
    teamStats: input.teamStats,
    transfers: input.transfers,
  };
}

export function splitCompetitionFullPayload(payload: CompetitionFullResponse): {
  core: CompetitionCoreSnapshotPayload;
  bracket: CompetitionBracketSectionPayload;
  playerStats: CompetitionPlayerStatsSectionPayload;
  teamStats: CompetitionTeamStatsSectionPayload;
  transfers: CompetitionTransfersSectionPayload;
} {
  return {
    core: {
      competition: payload.competition,
      competitionKind: payload.competitionKind,
      season: payload.season,
      standings: payload.standings,
      matches: payload.matches,
    },
    bracket: payload.bracket,
    playerStats: payload.playerStats,
    teamStats: payload.teamStats,
    transfers: payload.transfers,
  };
}

export async function buildCompetitionFullResponse(
  competitionId: string,
  requestedSeason?: number,
): Promise<CompetitionFullResponse> {
  return withCacheStaleWhileRevalidate(
    buildCanonicalCacheKey('competition:full:v1', {
      competitionId,
      season: requestedSeason ?? null,
    }),
    COMPETITION_CACHE_TTL_MS,
    async () => {
      const core = await buildCompetitionCoreSnapshot(
        competitionId,
        requestedSeason,
      );
      const [bracket, playerStats, teamStats, transfers] = await Promise.all([
        buildCompetitionBracketSection({
          core,
        }),
        buildCompetitionPlayerStatsSection({
          competitionId,
          core,
        }),
        buildCompetitionTeamStatsSection({
          competitionId,
          core,
        }),
        buildCompetitionTransfersSection({
          competitionId,
          core,
        }),
      ]);

      return composeCompetitionFullPayload({
        core,
        bracket,
        playerStats,
        teamStats,
        transfers,
      });
    },
  );
}
