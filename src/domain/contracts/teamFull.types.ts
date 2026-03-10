import type {
  TeamAdvancedStatsDto,
  TeamApiFixtureDto,
  TeamApiLeagueDto,
  TeamApiPlayerDto,
  TeamApiSquadDto,
  TeamApiStandingsDto,
  TeamApiStatisticsDto,
  TeamApiTeamDetailsDto,
  TeamApiTransferDto,
  TeamOverviewCoreData,
  TeamOverviewLeadersData,
} from './teams.types';

export type TeamFullSelection = {
  leagueId: string | null;
  season: number | null;
};

export type TeamFullResponsePayload = {
  response: {
    details: { response: TeamApiTeamDetailsDto[] };
    leagues: { response: TeamApiLeagueDto[] };
    selection: TeamFullSelection;
    overview: TeamOverviewCoreData | null;
    overviewLeaders: TeamOverviewLeadersData | null;
    standings: { response: TeamApiStandingsDto | null };
    matches: { response: TeamApiFixtureDto[] };
    statistics: { response: TeamApiStatisticsDto | null };
    advancedStats: { response: TeamAdvancedStatsDto | null };
    statsPlayers: { response: TeamApiPlayerDto[] };
    squad: { response: TeamApiSquadDto[] };
    transfers: { response: TeamApiTransferDto[] };
    trophies: { response: unknown[] };
  };
};
