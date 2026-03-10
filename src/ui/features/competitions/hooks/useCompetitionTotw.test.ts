import { useQuery, useQueryClient } from '@tanstack/react-query';

import { appEnv } from '@data/config/env';
import { fetchCompetitionTotw } from '@data/endpoints/competitionsApi';
import {
  mapCompetitionPlayerStatsToTotw,
  mapPlayerStatsDtoToPlayerStats,
} from '@data/mappers/competitionsMapper';
import { loadCompetitionFullPayload } from '@ui/features/competitions/hooks/competitionFullQuery';
import { useCompetitionTotw } from '@ui/features/competitions/hooks/useCompetitionTotw';

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useQueryClient: jest.fn(),
}));
jest.mock('@data/config/env', () => ({
  appEnv: {
    mobileEnableBffCompetitionFull: false,
  },
}));

jest.mock('@data/endpoints/competitionsApi', () => ({
  fetchCompetitionTotw: jest.fn(),
}));

jest.mock('@data/mappers/competitionsMapper', () => ({
  mapPlayerStatsDtoToPlayerStats: jest.fn(),
  mapCompetitionPlayerStatsToTotw: jest.fn(),
}));
jest.mock('@ui/features/competitions/hooks/competitionFullQuery', () => ({
  loadCompetitionFullPayload: jest.fn(),
}));

const mockedUseQuery = jest.mocked(useQuery);
const mockedUseQueryClient = jest.mocked(useQueryClient);
const mockedFetchCompetitionTotw = jest.mocked(fetchCompetitionTotw);
const mockedMapPlayerStatsDtoToPlayerStats = jest.mocked(mapPlayerStatsDtoToPlayerStats);
const mockedMapCompetitionPlayerStatsToTotw = jest.mocked(mapCompetitionPlayerStatsToTotw);
const mockedLoadCompetitionFullPayload = jest.mocked(loadCompetitionFullPayload);

describe('useCompetitionTotw', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    appEnv.mobileEnableBffCompetitionFull = false;
    mockedUseQueryClient.mockReturnValue({} as never);
    mockedUseQuery.mockReturnValue({} as never);
    mockedLoadCompetitionFullPayload.mockResolvedValue(null);
  });

  it('disables query when league or season is missing and query function returns null', async () => {
    useCompetitionTotw(undefined, 2025);
    let queryConfig = mockedUseQuery.mock.calls[0]?.[0];
    let queryFn = queryConfig?.queryFn as (context: { signal: AbortSignal | undefined }) => Promise<unknown>;
    expect(queryConfig).toEqual(expect.objectContaining({ enabled: false }));
    await expect(queryFn({ signal: undefined })).resolves.toBeNull();

    mockedUseQuery.mockClear();

    useCompetitionTotw(61, undefined);
    queryConfig = mockedUseQuery.mock.calls[0]?.[0];
    queryFn = queryConfig?.queryFn as (context: { signal: AbortSignal | undefined }) => Promise<unknown>;
    expect(queryConfig).toEqual(expect.objectContaining({ enabled: false }));
    await expect(queryFn({ signal: undefined })).resolves.toBeNull();
  });

  it('uses expected key and options when parameters are present', () => {
    useCompetitionTotw(61, 2025);

    expect(mockedUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['competition_totw', 61, 2025],
        enabled: true,
        staleTime: 30 * 60 * 1000,
      }),
    );
  });

  it('aggregates 4 endpoints via a single BFF call and forwards data to strict TOTW mapper', async () => {
    const signal = new AbortController().signal;
    const topScorersRaw = [{ key: 'scorer' }] as never;
    const topAssistsRaw = [{ key: 'assist' }] as never;
    const topYellowRaw = [{ key: 'yellow' }] as never;
    const topRedRaw = [{ key: 'red' }] as never;

    mockedFetchCompetitionTotw.mockResolvedValue({
      topScorers: topScorersRaw,
      topAssists: topAssistsRaw,
      topYellowCards: topYellowRaw,
      topRedCards: topRedRaw,
    });

    mockedMapPlayerStatsDtoToPlayerStats
      .mockReturnValueOnce([{ playerId: 1 }] as never)
      .mockReturnValueOnce([{ playerId: 2 }] as never)
      .mockReturnValueOnce([{ playerId: 3 }] as never)
      .mockReturnValueOnce([{ playerId: 4 }] as never);

    const expectedTotw = { formation: '4-3-3' };
    mockedMapCompetitionPlayerStatsToTotw.mockReturnValue(expectedTotw as never);

    useCompetitionTotw(61, 2025);
    const queryConfig = mockedUseQuery.mock.calls[0]?.[0];
    const queryFn = queryConfig?.queryFn as (context: { signal: AbortSignal }) => Promise<unknown>;
    const result = await queryFn({ signal });

    expect(mockedFetchCompetitionTotw).toHaveBeenCalledWith(61, 2025, signal);

    expect(mockedMapPlayerStatsDtoToPlayerStats).toHaveBeenNthCalledWith(1, topScorersRaw, 2025);
    expect(mockedMapPlayerStatsDtoToPlayerStats).toHaveBeenNthCalledWith(2, topAssistsRaw, 2025);
    expect(mockedMapPlayerStatsDtoToPlayerStats).toHaveBeenNthCalledWith(3, topYellowRaw, 2025);
    expect(mockedMapPlayerStatsDtoToPlayerStats).toHaveBeenNthCalledWith(4, topRedRaw, 2025);
    expect(mockedMapCompetitionPlayerStatsToTotw).toHaveBeenCalledWith(
      [{ playerId: 1 }, { playerId: 2 }, { playerId: 3 }, { playerId: 4 }],
      2025,
    );
    expect(result).toEqual(expectedTotw);
  });

  it('propagates BFF error when the aggregated endpoint fails', async () => {
    const signal = new AbortController().signal;
    const upstreamError = new Error('BFF upstream failed');

    mockedFetchCompetitionTotw.mockRejectedValue(upstreamError);

    useCompetitionTotw(61, 2025);
    const queryConfig = mockedUseQuery.mock.calls[0]?.[0];
    const queryFn = queryConfig?.queryFn as (context: { signal: AbortSignal }) => Promise<unknown>;

    await expect(queryFn({ signal })).rejects.toThrow('BFF upstream failed');
    expect(mockedMapPlayerStatsDtoToPlayerStats).not.toHaveBeenCalled();
    expect(mockedMapCompetitionPlayerStatsToTotw).not.toHaveBeenCalled();
  });

  it('uses competitions.full playerStats when available and skips the legacy TOTW endpoint', async () => {
    appEnv.mobileEnableBffCompetitionFull = true;
    mockedLoadCompetitionFullPayload.mockResolvedValue({
      playerStats: {
        topScorers: [{ key: 'scorer' }],
        topAssists: [{ key: 'assist' }],
        topYellowCards: [{ key: 'yellow' }],
        topRedCards: [{ key: 'red' }],
      },
    } as never);
    mockedMapPlayerStatsDtoToPlayerStats
      .mockReturnValueOnce([{ playerId: 11 }] as never)
      .mockReturnValueOnce([{ playerId: 12 }] as never)
      .mockReturnValueOnce([{ playerId: 13 }] as never)
      .mockReturnValueOnce([{ playerId: 14 }] as never);
    mockedMapCompetitionPlayerStatsToTotw.mockReturnValue({ formation: '4-3-3' } as never);

    useCompetitionTotw(61, 2025);
    const queryConfig = mockedUseQuery.mock.calls[0]?.[0];
    const queryFn = queryConfig?.queryFn as (context: { signal: AbortSignal }) => Promise<unknown>;
    const result = await queryFn({ signal: new AbortController().signal });

    expect(mockedLoadCompetitionFullPayload).toHaveBeenCalled();
    expect(mockedFetchCompetitionTotw).not.toHaveBeenCalled();
    expect(result).toEqual({ formation: '4-3-3' });
  });
});
