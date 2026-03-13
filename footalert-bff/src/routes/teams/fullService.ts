import type { FastifyBaseLogger } from 'fastify';

import { apiFootballGet } from '../../lib/apiFootballClient.js';
import {
  buildFreshnessMeta,
  freshnessHints,
  type PayloadFreshnessMeta,
} from '../../lib/freshnessMeta.js';
import type { FullPayloadHydration } from '../../lib/readStore/hydration.js';

import {
  buildTeamAdvancedStatsPayload,
  computeLeagueAdvancedTeamStats,
  type TeamAdvancedStatsPayload,
} from './advancedStats.js';
import { toNumericId } from './helpers.js';
import {
  fetchOverviewFixtures,
  fetchOverviewPlayers,
  fetchOverviewStandings,
  fetchTeamOverviewCorePayload,
  fetchTeamOverviewLeadersPayload,
  parseOverviewHistorySeasons,
} from './overview.js';
import type {
  TeamApiFixtureDto,
  TeamApiPlayerDto,
  TeamApiStandingsPayload,
  TeamOverviewCoreResponse,
  TeamOverviewLeadersResponse,
} from './overview.types.js';
import { fetchNormalizedTeamTransfers } from './transfers.js';
import { fetchTeamTrophiesWithFallback } from './trophies.js';

type ApiFootballListResponse<T> = {
  response?: T[];
};

type TeamSquadRecord = {
  players?: unknown[];
  coach?: {
    id: number | string | null;
    name: string | null;
    photo: string | null;
    age: number | null;
  } | null;
} & Record<string, unknown>;

type TeamCoachDto = {
  id?: number | string;
  name?: string;
  photo?: string;
  age?: number;
  career?: Array<{
    team?: {
      id?: number;
    };
    end?: string | null;
  }>;
};

type TeamCompetitionOption = {
  leagueId: string;
  seasons: number[];
  currentSeason: number | null;
  type: string | null;
};

type TeamFullSelection = {
  leagueId: string | null;
  season: number | null;
};

export type TeamFullRoutePayload = {
  _meta: PayloadFreshnessMeta;
  _hydration?: FullPayloadHydration;
  response: {
    details: { response: unknown[] };
    leagues: { response: unknown[] };
    selection: TeamFullSelection;
    overview: TeamOverviewCoreResponse | null;
    overviewLeaders: TeamOverviewLeadersResponse | null;
    standings: { response: TeamApiStandingsPayload | null };
    matches: { response: TeamApiFixtureDto[] };
    statistics: { response: unknown | null };
    advancedStats: { response: TeamAdvancedStatsPayload | null };
    statsPlayers: { response: TeamApiPlayerDto[] };
    squad: { response: TeamSquadRecord[] };
    transfers: { response: unknown[] };
    trophies: { response: unknown[] };
  };
};

export type TeamCoreSnapshotPayload = Pick<
  TeamFullRoutePayload['response'],
  'details' | 'leagues' | 'selection' | 'overview' | 'overviewLeaders' | 'standings' | 'matches'
>;

export type TeamStatisticsSectionPayload = TeamFullRoutePayload['response']['statistics'];
export type TeamAdvancedStatsSectionPayload = TeamFullRoutePayload['response']['advancedStats'];
export type TeamStatsPlayersSectionPayload = TeamFullRoutePayload['response']['statsPlayers'];
export type TeamSquadSectionPayload = TeamFullRoutePayload['response']['squad'];
export type TeamTransfersSectionPayload = TeamFullRoutePayload['response']['transfers'];
export type TeamTrophiesSectionPayload = TeamFullRoutePayload['response']['trophies'];

function firstSettledError(results: PromiseSettledResult<unknown>[]): Error {
  for (const result of results) {
    if (result.status === 'rejected') {
      return result.reason instanceof Error
        ? result.reason
        : new Error(String(result.reason));
    }
  }

  return new Error('Unable to load team full payload');
}

function resolveSettledValue<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === 'fulfilled' ? result.value : fallback;
}

function toOptionalText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function toOptionalNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function sortSeasonsDesc(seasons: number[]): number[] {
  return [...seasons].sort((first, second) => second - first);
}

function mapTeamCompetitionOptions(leagues: unknown[]): TeamCompetitionOption[] {
  return leagues
    .map<TeamCompetitionOption | null>(item => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const record = item as Record<string, unknown>;
      const league =
        record.league && typeof record.league === 'object'
          ? (record.league as Record<string, unknown>)
          : null;
      if (!league) {
        return null;
      }

      const leagueIdValue = league.id;
      const leagueId =
        typeof leagueIdValue === 'number' || typeof leagueIdValue === 'string'
          ? String(leagueIdValue)
          : null;
      if (!leagueId) {
        return null;
      }

      const seasonsPayload = Array.isArray(record.seasons) ? record.seasons : [];
      const seasons = seasonsPayload
        .map(seasonEntry => {
          if (!seasonEntry || typeof seasonEntry !== 'object') {
            return null;
          }

          return toOptionalNumber((seasonEntry as Record<string, unknown>).year);
        })
        .filter((season): season is number => season !== null);

      const currentSeasonEntry = seasonsPayload.find(seasonEntry => {
        if (!seasonEntry || typeof seasonEntry !== 'object') {
          return false;
        }

        return (seasonEntry as Record<string, unknown>).current === true;
      });

      return {
        leagueId,
        seasons: sortSeasonsDesc(Array.from(new Set(seasons))),
        currentSeason:
          currentSeasonEntry && typeof currentSeasonEntry === 'object'
            ? toOptionalNumber((currentSeasonEntry as Record<string, unknown>).year)
            : null,
        type: toOptionalText(league.type),
      };
    })
    .filter((item): item is TeamCompetitionOption => item !== null);
}

function resolveDefaultTeamSelection(competitions: TeamCompetitionOption[]): TeamFullSelection {
  const selectMostRecent = (items: TeamCompetitionOption[]): TeamCompetitionOption | null =>
    [...items]
      .filter(item => item.seasons.length > 0)
      .sort((first, second) => (second.seasons[0] ?? 0) - (first.seasons[0] ?? 0))[0] ?? null;

  const leagueWithCurrentSeason = competitions.find(
    option => option.type?.toLowerCase() === 'league' && typeof option.currentSeason === 'number',
  );
  if (leagueWithCurrentSeason) {
    return {
      leagueId: leagueWithCurrentSeason.leagueId,
      season: leagueWithCurrentSeason.currentSeason,
    };
  }

  const withCurrentSeason = competitions.find(option => typeof option.currentSeason === 'number');
  if (withCurrentSeason) {
    return {
      leagueId: withCurrentSeason.leagueId,
      season: withCurrentSeason.currentSeason,
    };
  }

  const leagueWithRecentSeason = selectMostRecent(
    competitions.filter(option => option.type?.toLowerCase() === 'league'),
  );
  if (leagueWithRecentSeason) {
    return {
      leagueId: leagueWithRecentSeason.leagueId,
      season: leagueWithRecentSeason.seasons[0] ?? null,
    };
  }

  const withRecentSeason = selectMostRecent(competitions);
  if (withRecentSeason) {
    return {
      leagueId: withRecentSeason.leagueId,
      season: withRecentSeason.seasons[0] ?? null,
    };
  }

  return {
    leagueId: null,
    season: null,
  };
}

function resolveRequestedSelection(input: {
  competitions: TeamCompetitionOption[];
  leagueId?: string;
  season?: number;
}): TeamFullSelection {
  const { competitions, leagueId, season } = input;

  if (leagueId) {
    const selectedCompetition = competitions.find(item => item.leagueId === leagueId);
    if (selectedCompetition) {
      if (typeof season === 'number' && selectedCompetition.seasons.includes(season)) {
        return { leagueId, season };
      }

      return {
        leagueId,
        season: selectedCompetition.currentSeason ?? selectedCompetition.seasons[0] ?? season ?? null,
      };
    }
  }

  if (typeof season === 'number') {
    const seasonScopedCompetitions = competitions.filter(item => item.seasons.includes(season));
    if (seasonScopedCompetitions.length > 0) {
      const preferredCompetition =
        seasonScopedCompetitions.find(item => item.type?.toLowerCase() === 'league')
        ?? seasonScopedCompetitions[0]
        ?? null;
      if (preferredCompetition) {
        return {
          leagueId: preferredCompetition.leagueId,
          season,
        };
      }
    }
  }

  return resolveDefaultTeamSelection(competitions);
}

function hasResolvedSelection(
  selection: TeamFullSelection,
): selection is { leagueId: string; season: number } {
  return (
    typeof selection.leagueId === 'string'
    && selection.leagueId.trim().length > 0
    && typeof selection.season === 'number'
    && Number.isFinite(selection.season)
  );
}

type TeamSelectionContext = {
  details: { response: unknown[] };
  leagues: { response: unknown[] };
  selection: TeamFullSelection;
  historySeasons: number[];
};

async function fetchTeamDetailsPayload(teamId: string): Promise<{ response: unknown[] }> {
  const payload = await apiFootballGet<ApiFootballListResponse<unknown>>(
    `/teams?id=${encodeURIComponent(teamId)}`,
  );
  return {
    response: Array.isArray(payload.response) ? payload.response : [],
  };
}

async function fetchTeamLeaguesPayload(teamId: string): Promise<{ response: unknown[] }> {
  const payload = await apiFootballGet<ApiFootballListResponse<unknown>>(
    `/leagues?team=${encodeURIComponent(teamId)}`,
  );
  return {
    response: Array.isArray(payload.response) ? payload.response : [],
  };
}

async function fetchTeamStatisticsPayload(
  teamId: string,
  leagueId: string,
  season: number,
): Promise<{ response: unknown | null }> {
  const payload = await apiFootballGet<{ response?: unknown | unknown[] }>(
    `/teams/statistics?league=${encodeURIComponent(leagueId)}&season=${encodeURIComponent(String(season))}&team=${encodeURIComponent(teamId)}`,
  );

  return {
    response: Array.isArray(payload.response)
      ? (payload.response[0] ?? null)
      : (payload.response ?? null),
  };
}

async function fetchTeamStandingsPayload(
  leagueId: string,
  season: number,
): Promise<{ response: TeamApiStandingsPayload | null }> {
  return {
    response: await fetchOverviewStandings(leagueId, season),
  };
}

async function fetchTeamMatchesPayload(params: {
  teamId: string;
  leagueId: string;
  season: number;
  timezone: string;
}): Promise<{ response: TeamApiFixtureDto[] }> {
  return {
    response: await fetchOverviewFixtures(
      params.teamId,
      params.leagueId,
      params.season,
      params.timezone,
    ),
  };
}

async function fetchTeamStatsPlayersPayload(
  teamId: string,
  leagueId: string,
  season: number,
): Promise<{ response: TeamApiPlayerDto[] }> {
  return {
    response: await fetchOverviewPlayers(teamId, leagueId, season),
  };
}

async function fetchTeamSquadPayload(teamId: string): Promise<{ response: TeamSquadRecord[] }> {
  const [squadResult, coachResult] = await Promise.allSettled([
    apiFootballGet<{ response?: TeamSquadRecord[] }>(`/players/squads?team=${encodeURIComponent(teamId)}`),
    apiFootballGet<{ response?: TeamCoachDto[] }>(`/coachs?team=${encodeURIComponent(teamId)}`),
  ]);

  if (squadResult.status === 'rejected' && coachResult.status === 'rejected') {
    throw firstSettledError([squadResult, coachResult]);
  }

  const squadPayload =
    squadResult.status === 'fulfilled'
      ? squadResult.value
      : ({ response: [{ players: [] }] } satisfies { response?: TeamSquadRecord[] });
  const coachPayload =
    coachResult.status === 'fulfilled'
      ? coachResult.value
      : ({ response: [] } satisfies { response?: TeamCoachDto[] });

  const squad = squadPayload.response?.[0] ?? { players: [] };
  squad.players = Array.isArray(squad.players) ? squad.players : [];

  const coaches = coachPayload.response ?? [];
  const teamIdAsNumber = Number(teamId);
  const currentCoach =
    coaches.find(coach => coach.career?.[0]?.team?.id === teamIdAsNumber && coach.career?.[0]?.end === null)
    ?? coaches[0]
    ?? null;

  squad.coach = currentCoach
    ? {
        id: currentCoach.id ?? null,
        name: typeof currentCoach.name === 'string' ? currentCoach.name : null,
        photo: typeof currentCoach.photo === 'string' ? currentCoach.photo : null,
        age: typeof currentCoach.age === 'number' ? currentCoach.age : null,
      }
    : null;

  return { response: [squad] };
}

async function fetchTeamAdvancedStatsPayload(
  teamId: string,
  leagueId: string,
  season: number,
): Promise<{ response: TeamAdvancedStatsPayload | null }> {
  const rankings = await computeLeagueAdvancedTeamStats(leagueId, season);
  return {
    response: buildTeamAdvancedStatsPayload(
      toNumericId(teamId) ?? Number(teamId),
      rankings.leagueId,
      rankings.season,
      rankings.sourceUpdatedAt,
      rankings.rankings,
    ),
  };
}

async function fetchTeamTrophiesPayload(
  teamId: string,
  logger: FastifyBaseLogger,
): Promise<{ response: unknown[] }> {
  const payload = await fetchTeamTrophiesWithFallback(teamId, logger);
  return {
    response: Array.isArray(payload.response) ? payload.response : [],
  };
}

async function buildTeamSelectionContext(params: {
  teamId: string;
  leagueId?: string;
  season?: number;
  timezone: string;
  historySeasons?: string;
  logger: FastifyBaseLogger;
}): Promise<TeamSelectionContext> {
  const baseResults = await Promise.allSettled([
    fetchTeamDetailsPayload(params.teamId),
    fetchTeamLeaguesPayload(params.teamId),
  ]);

  if (baseResults.every(result => result.status === 'rejected')) {
    throw firstSettledError(baseResults);
  }

  const details = resolveSettledValue(baseResults[0], { response: [] });
  const leagues = resolveSettledValue(baseResults[1], { response: [] });
  const competitions = mapTeamCompetitionOptions(leagues.response);
  const selection = resolveRequestedSelection({
    competitions,
    leagueId: params.leagueId,
    season: params.season,
  });
  const selectedCompetition =
    selection.leagueId !== null
      ? competitions.find(item => item.leagueId === selection.leagueId) ?? null
      : null;
  const derivedHistorySeasons = parseOverviewHistorySeasons(params.historySeasons) ?? [];
  const historySeasons =
    derivedHistorySeasons.length > 0
      ? derivedHistorySeasons
      : (selectedCompetition?.seasons ?? []).filter(season => season !== selection.season).slice(0, 5);

  return {
    details,
    leagues,
    selection,
    historySeasons,
  };
}

export async function buildTeamCoreSnapshot(params: {
  teamId: string;
  leagueId?: string;
  season?: number;
  timezone: string;
  historySeasons?: string;
  logger: FastifyBaseLogger;
}): Promise<TeamCoreSnapshotPayload> {
  const context = await buildTeamSelectionContext(params);
  const selected = hasResolvedSelection(context.selection);
  const resolvedSelection = selected
    ? {
        leagueId: context.selection.leagueId as string,
        season: context.selection.season as number,
      }
    : null;

  const secondaryResults = await Promise.allSettled([
    resolvedSelection
      ? fetchTeamOverviewCorePayload({
          teamId: params.teamId,
          leagueId: resolvedSelection.leagueId,
          season: resolvedSelection.season,
          timezone: params.timezone,
          historySeasons: context.historySeasons,
          logger: params.logger,
        })
      : Promise.resolve(null),
    resolvedSelection
      ? fetchTeamOverviewLeadersPayload({
          teamId: params.teamId,
          leagueId: resolvedSelection.leagueId,
          season: resolvedSelection.season,
        })
      : Promise.resolve(null),
    resolvedSelection
      ? fetchTeamStandingsPayload(resolvedSelection.leagueId, resolvedSelection.season)
      : Promise.resolve({ response: null }),
    resolvedSelection
      ? fetchTeamMatchesPayload({
          teamId: params.teamId,
          leagueId: resolvedSelection.leagueId,
          season: resolvedSelection.season,
          timezone: params.timezone,
        })
      : Promise.resolve({ response: [] }),
  ]);

  const [overview, overviewLeaders, standings, matches] = secondaryResults;

  return {
    details: context.details,
    leagues: context.leagues,
    selection: context.selection,
    overview: resolveSettledValue(overview, null),
    overviewLeaders: resolveSettledValue(overviewLeaders, null),
    standings: resolveSettledValue(standings, { response: null }),
    matches: resolveSettledValue(matches, { response: [] }),
  };
}

export async function buildTeamStatisticsSection(input: {
  teamId: string;
  selection: TeamFullSelection;
}): Promise<TeamStatisticsSectionPayload> {
  if (!hasResolvedSelection(input.selection)) {
    return { response: null };
  }

  return fetchTeamStatisticsPayload(
    input.teamId,
    input.selection.leagueId,
    input.selection.season,
  );
}

export async function buildTeamAdvancedStatsSection(input: {
  teamId: string;
  selection: TeamFullSelection;
}): Promise<TeamAdvancedStatsSectionPayload> {
  if (!hasResolvedSelection(input.selection)) {
    return { response: null };
  }

  return fetchTeamAdvancedStatsPayload(
    input.teamId,
    input.selection.leagueId,
    input.selection.season,
  );
}

export async function buildTeamStatsPlayersSection(input: {
  teamId: string;
  selection: TeamFullSelection;
}): Promise<TeamStatsPlayersSectionPayload> {
  if (!hasResolvedSelection(input.selection)) {
    return { response: [] };
  }

  return fetchTeamStatsPlayersPayload(
    input.teamId,
    input.selection.leagueId,
    input.selection.season,
  );
}

export async function buildTeamSquadSection(input: {
  teamId: string;
}): Promise<TeamSquadSectionPayload> {
  return fetchTeamSquadPayload(input.teamId);
}

export async function buildTeamTransfersSection(input: {
  teamId: string;
  selection: TeamFullSelection;
  requestedSeason?: number;
}): Promise<TeamTransfersSectionPayload> {
  return fetchNormalizedTeamTransfers(
    input.teamId,
    hasResolvedSelection(input.selection) ? input.selection.season : input.requestedSeason,
  );
}

export async function buildTeamTrophiesSection(input: {
  teamId: string;
  logger: FastifyBaseLogger;
}): Promise<TeamTrophiesSectionPayload> {
  return fetchTeamTrophiesPayload(input.teamId, input.logger);
}

export function composeTeamFullPayload(input: {
  core: TeamCoreSnapshotPayload;
  statistics: TeamStatisticsSectionPayload;
  advancedStats: TeamAdvancedStatsSectionPayload;
  statsPlayers: TeamStatsPlayersSectionPayload;
  squad: TeamSquadSectionPayload;
  transfers: TeamTransfersSectionPayload;
  trophies: TeamTrophiesSectionPayload;
  hydration?: FullPayloadHydration;
}): TeamFullRoutePayload {
  return {
    _meta: buildFreshnessMeta({
      details: freshnessHints.static,
      leagues: freshnessHints.static,
      trophies: freshnessHints.static,
      squad: freshnessHints.postMatch,
      overview: freshnessHints.postMatch,
      overviewLeaders: freshnessHints.postMatch,
      standings: freshnessHints.postMatch,
      matches: freshnessHints.postMatch,
      statistics: freshnessHints.postMatch,
      statsPlayers: freshnessHints.postMatch,
      advancedStats: freshnessHints.postMatch,
      transfers: freshnessHints.weekly,
    }),
    _hydration: input.hydration,
    response: {
      ...input.core,
      statistics: input.statistics,
      advancedStats: input.advancedStats,
      statsPlayers: input.statsPlayers,
      squad: input.squad,
      transfers: input.transfers,
      trophies: input.trophies,
    },
  };
}

export function splitTeamFullPayload(payload: TeamFullRoutePayload): {
  core: TeamCoreSnapshotPayload;
  statistics: TeamStatisticsSectionPayload;
  advancedStats: TeamAdvancedStatsSectionPayload;
  statsPlayers: TeamStatsPlayersSectionPayload;
  squad: TeamSquadSectionPayload;
  transfers: TeamTransfersSectionPayload;
  trophies: TeamTrophiesSectionPayload;
} {
  return {
    core: {
      details: payload.response.details,
      leagues: payload.response.leagues,
      selection: payload.response.selection,
      overview: payload.response.overview,
      overviewLeaders: payload.response.overviewLeaders,
      standings: payload.response.standings,
      matches: payload.response.matches,
    },
    statistics: payload.response.statistics,
    advancedStats: payload.response.advancedStats,
    statsPlayers: payload.response.statsPlayers,
    squad: payload.response.squad,
    transfers: payload.response.transfers,
    trophies: payload.response.trophies,
  };
}

export async function fetchTeamFullPayload(params: {
  teamId: string;
  leagueId?: string;
  season?: number;
  timezone: string;
  historySeasons?: string;
  logger: FastifyBaseLogger;
}): Promise<TeamFullRoutePayload> {
  const core = await buildTeamCoreSnapshot(params);
  const [statistics, advancedStats, statsPlayers, squad, transfers, trophies] = await Promise.all([
    buildTeamStatisticsSection({
      teamId: params.teamId,
      selection: core.selection,
    }),
    buildTeamAdvancedStatsSection({
      teamId: params.teamId,
      selection: core.selection,
    }),
    buildTeamStatsPlayersSection({
      teamId: params.teamId,
      selection: core.selection,
    }),
    buildTeamSquadSection({
      teamId: params.teamId,
    }),
    buildTeamTransfersSection({
      teamId: params.teamId,
      selection: core.selection,
      requestedSeason: params.season,
    }),
    buildTeamTrophiesSection({
      teamId: params.teamId,
      logger: params.logger,
    }),
  ]);

  return composeTeamFullPayload({
    core,
    statistics,
    advancedStats,
    statsPlayers,
    squad,
    transfers,
    trophies,
  });
}
