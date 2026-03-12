import { renderHook } from '@testing-library/react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { useCompetitionBracket } from '@ui/features/competitions/hooks/useCompetitionBracket';
import { useCompetitionDetailsScreenModel } from '@ui/features/competitions/hooks/useCompetitionDetailsScreenModel';
import { useCompetitionFullQuery } from '@ui/features/competitions/hooks/competitionFullQuery';
import { useCompetitionSeasons } from '@ui/features/competitions/hooks/useCompetitionSeasons';
import { useFollowedCompetitions } from '@ui/features/competitions/hooks/useFollowedCompetitions';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
}));
jest.mock('@ui/features/competitions/hooks/competitionFullQuery', () => ({
  useCompetitionFullQuery: jest.fn(),
}));
jest.mock('@ui/features/competitions/hooks/useCompetitionSeasons', () => ({
  useCompetitionSeasons: jest.fn(),
}));
jest.mock('@ui/features/competitions/hooks/useCompetitionBracket', () => ({
  useCompetitionBracket: jest.fn(),
}));
jest.mock('@ui/features/competitions/hooks/useFollowedCompetitions', () => ({
  useFollowedCompetitions: jest.fn(),
}));

const mockedUseNavigation = jest.mocked(useNavigation);
const mockedUseRoute = jest.mocked(useRoute);
const mockedUseCompetitionFullQuery = jest.mocked(useCompetitionFullQuery);
const mockedUseCompetitionSeasons = jest.mocked(useCompetitionSeasons);
const mockedUseCompetitionBracket = jest.mocked(useCompetitionBracket);
const mockedUseFollowedCompetitions = jest.mocked(useFollowedCompetitions);

describe('useCompetitionDetailsScreenModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseNavigation.mockReturnValue({ goBack: jest.fn(), navigate: jest.fn() } as never);
    mockedUseRoute.mockReturnValue({
      key: 'CompetitionDetails-key',
      name: 'CompetitionDetails',
      params: {
        competitionId: '61',
        competition: {
          id: '61',
          name: 'Route Ligue 1',
          logo: 'route.png',
          type: 'League',
          countryName: 'France',
        },
      },
    } as never);
    mockedUseCompetitionSeasons.mockReturnValue({
      data: [{ year: 2025, current: true }],
      isLoading: false,
      dataUpdatedAt: 0,
    } as never);
    mockedUseCompetitionBracket.mockReturnValue({
      data: { competitionKind: 'league', bracket: null },
      isLoading: false,
      isFetching: false,
      dataUpdatedAt: 0,
    } as never);
    mockedUseFollowedCompetitions.mockReturnValue({
      followedIds: [],
      toggleFollow: jest.fn(),
    } as never);
  });

  it('prefers competitionFullQuery data over the route placeholder for the header competition', () => {
    mockedUseCompetitionFullQuery.mockReturnValue({
      data: {
        competition: {
          league: {
            id: 61,
            name: 'Full Ligue 1',
            type: 'League',
            logo: 'full.png',
          },
          country: {
            name: 'France',
          },
          seasons: [{ year: 2025, current: true }],
        },
        season: 2025,
      },
      isLoading: false,
      isFetching: false,
      isFetched: true,
      isError: false,
      dataUpdatedAt: 0,
    } as never);

    const { result } = renderHook(() => useCompetitionDetailsScreenModel());

    expect(result.current.competition?.name).toBe('Full Ligue 1');
    expect(result.current.competition?.logo).toBe('full.png');
  });

  it('drops the route placeholder once the full query has resolved in error', () => {
    mockedUseCompetitionFullQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isFetched: true,
      isError: true,
      dataUpdatedAt: 0,
    } as never);

    const { result } = renderHook(() => useCompetitionDetailsScreenModel());

    expect(result.current.competition).toBeNull();
    expect(result.current.isCompetitionQueryLoading).toBe(false);
  });
});
