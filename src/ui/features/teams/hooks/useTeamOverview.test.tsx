import { useQuery } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-native';

import {
  fetchLeagueStandings,
  fetchTeamFixtures,
  fetchTeamNextFixture,
  fetchTeamPlayers,
  fetchTeamSquad,
  fetchTeamStatistics,
  fetchTeamTrophies,
} from '@data/endpoints/teamsApi';
import {
  findTeamStandingRow,
  mapFixtureToTeamMatch,
  mapFixturesToTeamMatches,
  mapPlayersToTopPlayers,
  mapPlayersToTopPlayersByCategory,
  mapRecentTeamForm,
  mapSquadToTeamSquad,
  mapStandingsToTeamData,
  mapTeamStatisticsToStats,
  mapTrophiesToTeamTrophies,
} from '@data/mappers/teamsMapper';
import { useTeamOverview } from '@ui/features/teams/hooks/useTeamOverview';
import type {
  TeamOverviewData,
  TeamStandingRow,
  TeamTopPlayer,
} from '@ui/features/teams/types/teams.types';

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('@data/endpoints/teamsApi', () => ({
  fetchTeamFixtures: jest.fn(),
  fetchTeamNextFixture: jest.fn(),
  fetchLeagueStandings: jest.fn(),
  fetchTeamStatistics: jest.fn(),
  fetchTeamPlayers: jest.fn(),
  fetchTeamSquad: jest.fn(),
  fetchTeamTrophies: jest.fn(),
}));

jest.mock('@data/mappers/teamsMapper', () => ({
  mapFixtureToTeamMatch: jest.fn(),
  mapFixturesToTeamMatches: jest.fn(),
  mapPlayersToTopPlayers: jest.fn(),
  mapPlayersToTopPlayersByCategory: jest.fn(),
  mapRecentTeamForm: jest.fn(),
  mapSquadToTeamSquad: jest.fn(),
  mapStandingsToTeamData: jest.fn(),
  findTeamStandingRow: jest.fn(),
  mapTeamStatisticsToStats: jest.fn(),
  mapTrophiesToTeamTrophies: jest.fn(),
}));

const mockedUseQuery = jest.mocked(useQuery);
const mockedFetchTeamFixtures = jest.mocked(fetchTeamFixtures);
const mockedFetchTeamNextFixture = jest.mocked(fetchTeamNextFixture);
const mockedFetchLeagueStandings = jest.mocked(fetchLeagueStandings);
const mockedFetchTeamStatistics = jest.mocked(fetchTeamStatistics);
const mockedFetchTeamPlayers = jest.mocked(fetchTeamPlayers);
const mockedFetchTeamSquad = jest.mocked(fetchTeamSquad);
const mockedFetchTeamTrophies = jest.mocked(fetchTeamTrophies);

const mockedMapFixtureToTeamMatch = jest.mocked(mapFixtureToTeamMatch);
const mockedMapFixturesToTeamMatches = jest.mocked(mapFixturesToTeamMatches);
const mockedMapPlayersToTopPlayers = jest.mocked(mapPlayersToTopPlayers);
const mockedMapPlayersToTopPlayersByCategory = jest.mocked(mapPlayersToTopPlayersByCategory);
const mockedMapRecentTeamForm = jest.mocked(mapRecentTeamForm);
const mockedMapSquadToTeamSquad = jest.mocked(mapSquadToTeamSquad);
const mockedMapStandingsToTeamData = jest.mocked(mapStandingsToTeamData);
const mockedFindTeamStandingRow = jest.mocked(findTeamStandingRow);
const mockedMapTeamStatisticsToStats = jest.mocked(mapTeamStatisticsToStats);
const mockedMapTrophiesToTeamTrophies = jest.mocked(mapTrophiesToTeamTrophies);

type CapturedQueryConfig = {
  queryFn?: (context: { signal?: AbortSignal }) => Promise<unknown>;
};

function createAbortError(message = 'aborted'): Error {
  const error = new Error(message);
  error.name = 'AbortError';
  return error;
}

function createStandingRow(rank: number, teamId: string, isTargetTeam: boolean): TeamStandingRow {
  return {
    rank,
    teamId,
    teamName: `Team ${rank}`,
    teamLogo: null,
    played: 25,
    goalDiff: 20 - rank,
    points: 60 - rank,
    isTargetTeam,
    form: null,
    update: null,
    all: {
      played: 25,
      win: 18,
      draw: 4,
      lose: 3,
      goalsFor: 50,
      goalsAgainst: 25,
    },
    home: {
      played: 13,
      win: 10,
      draw: 2,
      lose: 1,
      goalsFor: 30,
      goalsAgainst: 11,
    },
    away: {
      played: 12,
      win: 8,
      draw: 2,
      lose: 2,
      goalsFor: 20,
      goalsAgainst: 14,
    },
  };
}

const lineupPlayers: TeamTopPlayer[] = [
  {
    playerId: 'gk-1',
    name: 'GK',
    photo: null,
    teamLogo: null,
    position: 'Goalkeeper',
    goals: 0,
    assists: 0,
    rating: 7.1,
  },
  {
    playerId: 'def-1',
    name: 'Def',
    photo: null,
    teamLogo: null,
    position: 'Defender',
    goals: 1,
    assists: 1,
    rating: 7.0,
  },
  {
    playerId: 'mid-1',
    name: 'Mid 1',
    photo: null,
    teamLogo: null,
    position: 'Midfielder',
    goals: 4,
    assists: 5,
    rating: 7.5,
  },
  {
    playerId: 'mid-2',
    name: 'Mid 2',
    photo: null,
    teamLogo: null,
    position: 'Midfielder',
    goals: 3,
    assists: 4,
    rating: 7.4,
  },
  {
    playerId: 'mid-3',
    name: 'Mid 3',
    photo: null,
    teamLogo: null,
    position: 'Midfielder',
    goals: 2,
    assists: 3,
    rating: 7.3,
  },
  {
    playerId: 'att-1',
    name: 'Att 1',
    photo: null,
    teamLogo: null,
    position: 'Attacker',
    goals: 18,
    assists: 7,
    rating: 8.2,
  },
  {
    playerId: 'att-2',
    name: 'Att 2',
    photo: null,
    teamLogo: null,
    position: 'Attacker',
    goals: 14,
    assists: 6,
    rating: 7.8,
  },
  {
    playerId: 'att-3',
    name: 'Att 3',
    photo: null,
    teamLogo: null,
    position: 'Attacker',
    goals: 11,
    assists: 4,
    rating: 7.6,
  },
  {
    playerId: 'other-1',
    name: 'Other 1',
    photo: null,
    teamLogo: null,
    position: 'Winger',
    goals: 8,
    assists: 2,
    rating: 7.2,
  },
  {
    playerId: 'other-2',
    name: 'Other 2',
    photo: null,
    teamLogo: null,
    position: 'Forward',
    goals: 7,
    assists: 3,
    rating: 7.1,
  },
  {
    playerId: 'other-3',
    name: 'Other 3',
    photo: null,
    teamLogo: null,
    position: 'Def Mid',
    goals: 6,
    assists: 2,
    rating: 7.0,
  },
];

describe('useTeamOverview', () => {
  let capturedQueryConfig: CapturedQueryConfig | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    capturedQueryConfig = null;

    mockedUseQuery.mockImplementation(config => {
      capturedQueryConfig = config as unknown as CapturedQueryConfig;
      return {} as never;
    });

    mockedFetchTeamFixtures.mockResolvedValue([] as never);
    mockedFetchTeamNextFixture.mockResolvedValue(null as never);
    mockedFetchLeagueStandings.mockImplementation(async (_leagueId, season) => ({ season }) as never);
    mockedFetchTeamStatistics.mockResolvedValue({ league: { name: 'LaLiga' } } as never);
    mockedFetchTeamPlayers.mockResolvedValue({ response: [], paging: { current: 1, total: 1 } } as never);
    mockedFetchTeamSquad.mockResolvedValue({ coach: { id: 1 } } as never);
    mockedFetchTeamTrophies.mockResolvedValue([] as never);

    mockedMapFixtureToTeamMatch.mockReturnValue({ fixtureId: 'next-1' } as never);
    mockedMapFixturesToTeamMatches.mockReturnValue({
      all: [
        {
          fixtureId: 'f1',
          leagueName: 'LaLiga',
          leagueLogo: 'https://example.com/laliga.png',
        },
      ],
      upcoming: [
        {
          fixtureId: 'f-upcoming',
          leagueName: 'LaLiga',
        },
      ],
      live: [],
      past: [{ fixtureId: 'f-past', status: 'finished' }],
    } as never);
    mockedMapRecentTeamForm.mockReturnValue([
      {
        fixtureId: 'f-past',
        result: 'W',
        score: '2-1',
        opponentName: 'Opponent',
        opponentLogo: null,
      },
    ]);

    mockedMapStandingsToTeamData.mockImplementation((payload, teamId) => {
      const season = (payload as { season?: number } | null)?.season ?? 2025;
      const rankBySeason: Record<number, number> = {
        2025: 2,
        2024: 1,
        2023: 2,
        2022: 3,
        2021: 2,
      };
      const targetRank = rankBySeason[season] ?? 2;

      return {
        groups: [
          {
            groupName: null,
            rows: [
              createStandingRow(1, 't-1', false),
              createStandingRow(targetRank, teamId, true),
              createStandingRow(3, 't-3', false),
            ],
          },
        ],
      };
    });

    mockedFindTeamStandingRow.mockImplementation(standings => {
      for (const group of standings.groups) {
        const target = group.rows.find(row => row.isTargetTeam);
        if (target) {
          return target;
        }
      }

      return null;
    });

    mockedMapPlayersToTopPlayers.mockReturnValue(lineupPlayers);
    mockedMapPlayersToTopPlayersByCategory.mockImplementation(players => {
      if (players.length === 0) {
        return { ratings: [], scorers: [], assisters: [] } as never;
      }

      return {
        ratings: lineupPlayers.slice(0, 3),
        scorers: lineupPlayers.slice(5, 8),
        assisters: lineupPlayers.slice(2, 5),
      } as never;
    });

    mockedMapTeamStatisticsToStats.mockReturnValue({
      rank: 2,
      points: 60,
      played: 25,
      wins: 19,
      draws: 3,
      losses: 3,
      goalsFor: 58,
      goalsAgainst: 25,
    } as never);

    mockedMapSquadToTeamSquad.mockReturnValue({
      coach: {
        id: 'coach-1',
        name: 'Coach Name',
        photo: null,
        age: 55,
      },
      players: [],
    } as never);

    mockedMapTrophiesToTeamTrophies.mockReturnValue({
      groups: [],
      total: 6,
      totalWins: 3,
    } as never);
  });

  it('returns complete overview data and limits history to 5 seasons in descending order', async () => {
    renderHook(() =>
      useTeamOverview({
        teamId: '529',
        leagueId: '140',
        season: 2025,
        timezone: 'Europe/Paris',
        competitionSeasons: [2024, 2023, 2022, 2021, 2020],
      }),
    );

    const queryFn = capturedQueryConfig?.queryFn;
    expect(queryFn).toBeDefined();

    const result = (await queryFn?.({ signal: undefined } as never)) as TeamOverviewData;

    expect(result.standingHistory).toEqual([
      { season: 2025, rank: 2 },
      { season: 2024, rank: 1 },
      { season: 2023, rank: 2 },
      { season: 2022, rank: 3 },
      { season: 2021, rank: 2 },
    ]);

    expect(result.miniStanding?.rows).toHaveLength(3);
    expect(result.miniStanding?.rows.some((row: TeamStandingRow) => row.isTargetTeam)).toBe(true);
    expect(result.seasonLineup.goalkeeper?.playerId).toBe('gk-1');
    expect(result.seasonLineup.defenders).toHaveLength(4);
    expect(result.seasonLineup.midfielders).toHaveLength(3);
    expect(result.seasonLineup.attackers).toHaveLength(3);
    expect(result.coachPerformance?.coach?.name).toBe('Coach Name');
    expect(result.coachPerformance?.winRate).toBe(76);
    expect(result.coachPerformance?.pointsPerMatch).toBe(2.32);
  });

  it('returns partial payload when players and one history season fail', async () => {
    mockedFetchTeamPlayers.mockRejectedValue(new Error('players failed'));
    mockedFetchLeagueStandings.mockImplementation(async (_leagueId, season) => {
      if (season === 2024) {
        throw new Error('history failed');
      }

      return { season } as never;
    });

    renderHook(() =>
      useTeamOverview({
        teamId: '529',
        leagueId: '140',
        season: 2025,
        timezone: 'Europe/Paris',
        competitionSeasons: [2024, 2023, 2022, 2021],
      }),
    );

    const queryFn = capturedQueryConfig?.queryFn;
    expect(queryFn).toBeDefined();

    const result = (await queryFn?.({ signal: undefined } as never)) as TeamOverviewData;

    expect(result.playerLeaders).toEqual({
      ratings: [],
      scorers: [],
      assisters: [],
    });
    expect(result.standingHistory).toEqual([
      { season: 2025, rank: 2 },
      { season: 2024, rank: null },
      { season: 2023, rank: 2 },
      { season: 2022, rank: 3 },
      { season: 2021, rank: 2 },
    ]);
  });

  it('throws only when core datasets are all unavailable', async () => {
    mockedFetchTeamFixtures.mockRejectedValue(new Error('fixtures failed'));
    mockedFetchLeagueStandings.mockRejectedValue(new Error('standings failed'));
    mockedFetchTeamStatistics.mockRejectedValue(new Error('stats failed'));

    renderHook(() =>
      useTeamOverview({
        teamId: '529',
        leagueId: '140',
        season: 2025,
        timezone: 'Europe/Paris',
        competitionSeasons: [2024, 2023],
      }),
    );

    const queryFn = capturedQueryConfig?.queryFn;
    expect(queryFn).toBeDefined();

    await expect(queryFn?.({ signal: undefined } as never)).rejects.toThrow('fixtures failed');
  });

  it('rethrows abort errors instead of returning partial payload', async () => {
    const abortError = createAbortError();
    mockedFetchTeamPlayers.mockRejectedValue(abortError);

    renderHook(() =>
      useTeamOverview({
        teamId: '529',
        leagueId: '140',
        season: 2025,
        timezone: 'Europe/Paris',
        competitionSeasons: [2024, 2023],
      }),
    );

    const queryFn = capturedQueryConfig?.queryFn;
    expect(queryFn).toBeDefined();

    await expect(queryFn?.({ signal: undefined } as never)).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(mockedMapTeamStatisticsToStats).not.toHaveBeenCalled();
  });

  it('rethrows abort errors from standing history requests', async () => {
    const abortError = createAbortError('history aborted');
    mockedFetchLeagueStandings.mockImplementation(async (_leagueId, season) => {
      if (season === 2024) {
        throw abortError;
      }

      return { season } as never;
    });

    renderHook(() =>
      useTeamOverview({
        teamId: '529',
        leagueId: '140',
        season: 2025,
        timezone: 'Europe/Paris',
        competitionSeasons: [2024, 2023],
      }),
    );

    const queryFn = capturedQueryConfig?.queryFn;
    expect(queryFn).toBeDefined();

    await expect(queryFn?.({ signal: undefined } as never)).rejects.toMatchObject({
      name: 'AbortError',
    });
  });

  it('builds mini standing correctly when target is first', async () => {
    mockedMapStandingsToTeamData.mockImplementation((_payload, teamId) => ({
      groups: [
        {
          groupName: null,
          rows: [
            createStandingRow(1, teamId, true),
            createStandingRow(2, 't-2', false),
            createStandingRow(3, 't-3', false),
            createStandingRow(4, 't-4', false),
          ],
        },
      ],
    }));

    renderHook(() =>
      useTeamOverview({
        teamId: '529',
        leagueId: '140',
        season: 2025,
        timezone: 'Europe/Paris',
        competitionSeasons: [2024, 2023],
      }),
    );

    const queryFn = capturedQueryConfig?.queryFn;
    const result = (await queryFn?.({ signal: undefined } as never)) as TeamOverviewData;

    expect(result.miniStanding?.rows.map((row: TeamStandingRow) => row.rank)).toEqual([1, 2, 3]);
  });

  it('builds mini standing correctly when target is last', async () => {
    mockedMapStandingsToTeamData.mockImplementation((_payload, teamId) => ({
      groups: [
        {
          groupName: null,
          rows: [
            createStandingRow(1, 't-1', false),
            createStandingRow(2, 't-2', false),
            createStandingRow(3, 't-3', false),
            createStandingRow(4, teamId, true),
          ],
        },
      ],
    }));

    renderHook(() =>
      useTeamOverview({
        teamId: '529',
        leagueId: '140',
        season: 2025,
        timezone: 'Europe/Paris',
        competitionSeasons: [2024, 2023],
      }),
    );

    const queryFn = capturedQueryConfig?.queryFn;
    const result = (await queryFn?.({ signal: undefined } as never)) as TeamOverviewData;

    expect(result.miniStanding?.rows.map((row: TeamStandingRow) => row.rank)).toEqual([2, 3, 4]);
  });
});
