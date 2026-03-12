import { renderHook } from '@testing-library/react-native';

import { usePlayerCareer } from '@ui/features/players/hooks/usePlayerCareer';
import { usePlayerDetailsScreenModel } from '@ui/features/players/hooks/usePlayerDetailsScreenModel';
import { usePlayerMatches } from '@ui/features/players/hooks/usePlayerMatches';
import { usePlayerOverview } from '@ui/features/players/hooks/usePlayerOverview';
import { usePlayerStats } from '@ui/features/players/hooks/usePlayerStats';
import { usePlayerStatsCatalog } from '@ui/features/players/hooks/usePlayerStatsCatalog';
import { useFollowsActions } from '@ui/features/follows/hooks/useFollowsActions';

jest.mock('@ui/features/players/hooks/usePlayerOverview', () => ({
  usePlayerOverview: jest.fn(),
}));

jest.mock('@ui/features/players/hooks/usePlayerMatches', () => ({
  usePlayerMatches: jest.fn(),
}));

jest.mock('@ui/features/players/hooks/usePlayerStatsCatalog', () => ({
  usePlayerStatsCatalog: jest.fn(),
}));

jest.mock('@ui/features/players/hooks/usePlayerStats', () => ({
  usePlayerStats: jest.fn(),
}));

jest.mock('@ui/features/players/hooks/usePlayerCareer', () => ({
  usePlayerCareer: jest.fn(),
}));

jest.mock('@ui/features/follows/hooks/useFollowsActions', () => ({
  useFollowsActions: jest.fn(),
}));

const mockedUsePlayerOverview = jest.mocked(usePlayerOverview);
const mockedUsePlayerMatches = jest.mocked(usePlayerMatches);
const mockedUsePlayerStatsCatalog = jest.mocked(usePlayerStatsCatalog);
const mockedUsePlayerStats = jest.mocked(usePlayerStats);
const mockedUsePlayerCareer = jest.mocked(usePlayerCareer);
const mockedUseFollowsActions = jest.mocked(useFollowsActions);

describe('usePlayerDetailsScreenModel behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedUseFollowsActions.mockReturnValue({
      followedPlayerIds: [],
      togglePlayerFollow: jest.fn(),
    } as never);

    mockedUsePlayerOverview.mockReturnValue({
      profile: {
        id: '278',
        name: 'Player',
        team: { id: '40', name: 'Team A', logo: null },
        league: { id: '39', name: 'Premier League', logo: null },
      },
      characteristics: null,
      positions: null,
      seasonStats: null,
      seasonStatsDataset: {
        overall: {},
        byCompetition: [],
      },
      profileCompetitionStats: null,
      profileTrophiesByClub: [],
      trophies: [],
      isLoading: false,
      isError: false,
      dataUpdatedAt: 0,
      refetch: jest.fn(),
    } as never);

    mockedUsePlayerMatches.mockReturnValue({
      matches: [],
      isLoading: false,
      isError: false,
      dataUpdatedAt: 0,
      refetch: jest.fn(),
    } as never);

    mockedUsePlayerStatsCatalog.mockReturnValue({
      competitions: [],
      defaultSelection: { season: 2025, leagueId: null },
      isLoading: false,
      isError: false,
      dataUpdatedAt: 0,
      refetch: jest.fn(),
    } as never);

    mockedUsePlayerStats.mockReturnValue({
      stats: null,
      isLoading: false,
      isError: false,
      dataUpdatedAt: 0,
      refetch: jest.fn(),
    } as never);

    mockedUsePlayerCareer.mockReturnValue({
      careerSeasons: [],
      careerTeams: [],
      isLoading: false,
      isError: false,
      dataUpdatedAt: 0,
      refetch: jest.fn(),
    } as never);
  });

  it('does not load career when the profile tab is active', () => {
    renderHook(() =>
      usePlayerDetailsScreenModel({
        playerId: '278',
        activeTab: 'profil',
      }),
    );

    expect(mockedUsePlayerCareer).toHaveBeenLastCalledWith('278', false);
  });

  it('does not load career when the stats tab is active', () => {
    renderHook(() =>
      usePlayerDetailsScreenModel({
        playerId: '278',
        activeTab: 'stats',
      }),
    );

    expect(mockedUsePlayerCareer).toHaveBeenLastCalledWith('278', false);
  });

  it('surfaces a coherent active-tab error state for matches', () => {
    mockedUsePlayerMatches.mockReturnValue({
      matches: [],
      isLoading: false,
      isError: true,
      dataUpdatedAt: 0,
      refetch: jest.fn(),
    } as never);

    const { result } = renderHook(() =>
      usePlayerDetailsScreenModel({
        playerId: '278',
        activeTab: 'matchs',
      }),
    );

    expect(result.current.isMatchesError).toBe(true);
    expect(result.current.hasActiveTabError).toBe(true);
  });

  it('keeps the matches query enabled even when the overview has no resolved team yet', () => {
    mockedUsePlayerOverview.mockReturnValue({
      profile: {
        id: '278',
        name: 'Player',
        team: { id: '', name: '', logo: null },
        league: { id: '39', name: 'Premier League', logo: null },
      },
      characteristics: null,
      positions: null,
      seasonStats: null,
      seasonStatsDataset: {
        overall: {},
        byCompetition: [],
      },
      profileCompetitionStats: null,
      profileTrophiesByClub: [],
      trophies: [],
      isLoading: false,
      isError: false,
      dataUpdatedAt: 0,
      refetch: jest.fn(),
    } as never);

    renderHook(() =>
      usePlayerDetailsScreenModel({
        playerId: '278',
        activeTab: 'matchs',
      }),
    );

    expect(mockedUsePlayerMatches).toHaveBeenLastCalledWith('278', '', expect.any(Number), true);
  });

  it('does not mark the active tab as errored when only an inactive tab failed', () => {
    mockedUsePlayerCareer.mockReturnValue({
      careerSeasons: [],
      careerTeams: [],
      isLoading: false,
      isError: true,
      dataUpdatedAt: 0,
      refetch: jest.fn(),
    } as never);

    const { result } = renderHook(() =>
      usePlayerDetailsScreenModel({
        playerId: '278',
        activeTab: 'profil',
      }),
    );

    expect(result.current.isCareerError).toBe(true);
    expect(result.current.hasActiveTabError).toBe(false);
  });
});
