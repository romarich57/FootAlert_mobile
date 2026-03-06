import { useQuery } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-native';

import { fetchTeamOverview } from '@data/endpoints/teamsApi';
import { useTeamOverview } from '@ui/features/teams/hooks/useTeamOverview';
import type { TeamOverviewData } from '@ui/features/teams/types/teams.types';

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('@data/endpoints/teamsApi', () => ({
  fetchTeamOverview: jest.fn(),
}));

const mockedUseQuery = jest.mocked(useQuery);
const mockedFetchTeamOverview = jest.mocked(fetchTeamOverview);

type CapturedQueryConfig = {
  enabled?: boolean;
  queryKey?: readonly unknown[];
  queryFn?: (context: { signal?: AbortSignal }) => Promise<unknown>;
  structuralSharing?: (
    oldData: TeamOverviewData | undefined,
    newData: TeamOverviewData,
  ) => TeamOverviewData;
};

const BASE_OVERVIEW: TeamOverviewData = {
  nextMatch: null,
  recentForm: [],
  seasonStats: {
    rank: 2,
    points: 60,
    played: 25,
    goalDiff: 20,
    wins: 19,
    draws: 3,
    losses: 3,
    scored: 58,
    conceded: 38,
  },
  seasonLineup: {
    formation: '4-3-3',
    estimated: true,
    goalkeeper: {
      playerId: 'gk-1',
      name: 'GK',
      photo: null,
      teamLogo: null,
      position: 'Goalkeeper',
      goals: 0,
      assists: 0,
      rating: 7.2,
    },
    defenders: [],
    midfielders: [],
    attackers: [],
  },
  miniStanding: {
    leagueId: '140',
    leagueName: 'LaLiga',
    leagueLogo: 'laliga.png',
    rows: [],
  },
  standingHistory: [
    { season: 2025, rank: 2 },
    { season: 2024, rank: 1 },
  ],
  coachPerformance: {
    coach: {
      id: 'coach-1',
      name: 'Coach Name',
      photo: null,
      age: 55,
    },
    winRate: 76,
    pointsPerMatch: 2.32,
    played: 25,
    wins: 19,
    draws: 3,
    losses: 3,
  },
  playerLeaders: {
    ratings: [],
    scorers: [],
    assisters: [],
  },
  trophiesCount: 6,
  trophyWinsCount: 3,
};

describe('useTeamOverview', () => {
  let capturedQueryConfig: CapturedQueryConfig | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    capturedQueryConfig = null;

    mockedUseQuery.mockImplementation(config => {
      capturedQueryConfig = config as unknown as CapturedQueryConfig;
      return {} as never;
    });

    mockedFetchTeamOverview.mockResolvedValue(BASE_OVERVIEW);
  });

  it('returns the empty overview when required params are missing', async () => {
    renderHook(() =>
      useTeamOverview({
        teamId: '529',
        leagueId: null,
        season: null,
        timezone: 'Europe/Paris',
      }),
    );

    expect(capturedQueryConfig?.enabled).toBe(false);

    const result = (await capturedQueryConfig?.queryFn?.({ signal: undefined })) as TeamOverviewData;

    expect(result).toEqual({
      nextMatch: null,
      recentForm: [],
      seasonStats: {
        rank: null,
        points: null,
        played: null,
        goalDiff: null,
        wins: null,
        draws: null,
        losses: null,
        scored: null,
        conceded: null,
      },
      seasonLineup: {
        formation: '4-3-3',
        estimated: true,
        goalkeeper: null,
        defenders: [],
        midfielders: [],
        attackers: [],
      },
      miniStanding: null,
      standingHistory: [],
      coachPerformance: null,
      playerLeaders: {
        ratings: [],
        scorers: [],
        assisters: [],
      },
      trophiesCount: null,
      trophyWinsCount: null,
    });
    expect(mockedFetchTeamOverview).not.toHaveBeenCalled();
  });

  it('delegates to the aggregate endpoint and limits history seasons to five entries', async () => {
    renderHook(() =>
      useTeamOverview({
        teamId: '529',
        leagueId: '140',
        season: 2025,
        timezone: 'Europe/Paris',
        competitionSeasons: [2024, 2023, 2022, 2021, 2020, 2019],
      }),
    );

    expect(capturedQueryConfig?.enabled).toBe(true);
    expect(capturedQueryConfig?.queryKey).toEqual([
      'team_overview',
      '529',
      '140',
      2025,
      'Europe/Paris',
      '2024,2023,2022,2021,2020',
    ]);

    await capturedQueryConfig?.queryFn?.({ signal: undefined });

    expect(mockedFetchTeamOverview).toHaveBeenCalledWith(
      {
        teamId: '529',
        leagueId: '140',
        season: 2025,
        timezone: 'Europe/Paris',
        historySeasons: [2024, 2023, 2022, 2021, 2020],
      },
      undefined,
    );
  });

  it('keeps previous useful data when the new aggregate payload is partial', () => {
    renderHook(() =>
      useTeamOverview({
        teamId: '529',
        leagueId: '140',
        season: 2025,
        timezone: 'Europe/Paris',
      }),
    );

    const nextData: TeamOverviewData = {
      ...BASE_OVERVIEW,
      nextMatch: null,
      recentForm: [],
      seasonStats: {
        rank: null,
        points: 61,
        played: null,
        goalDiff: null,
        wins: null,
        draws: null,
        losses: null,
        scored: null,
        conceded: null,
      },
      seasonLineup: {
        formation: '4-3-3',
        estimated: true,
        goalkeeper: null,
        defenders: [],
        midfielders: [],
        attackers: [],
      },
      miniStanding: null,
      standingHistory: [
        { season: 2025, rank: null },
        { season: 2024, rank: null },
      ],
      coachPerformance: null,
      playerLeaders: {
        ratings: [],
        scorers: [],
        assisters: [],
      },
      trophiesCount: null,
      trophyWinsCount: null,
    };

    const merged = capturedQueryConfig?.structuralSharing?.(BASE_OVERVIEW, nextData);

    expect(merged).toMatchObject({
      nextMatch: BASE_OVERVIEW.nextMatch,
      recentForm: BASE_OVERVIEW.recentForm,
      seasonStats: {
        rank: 2,
        points: 61,
        played: 25,
      },
      seasonLineup: BASE_OVERVIEW.seasonLineup,
      miniStanding: BASE_OVERVIEW.miniStanding,
      standingHistory: [
        { season: 2025, rank: 2 },
        { season: 2024, rank: 1 },
      ],
      coachPerformance: BASE_OVERVIEW.coachPerformance,
      playerLeaders: BASE_OVERVIEW.playerLeaders,
      trophiesCount: 6,
      trophyWinsCount: 3,
    });
  });
});
