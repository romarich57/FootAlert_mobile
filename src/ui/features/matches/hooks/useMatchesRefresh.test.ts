import { act, renderHook } from '@testing-library/react-native';

import {
  LIVE_REFRESH_INTERVAL_MS,
  MAX_REFRESH_BACKOFF_MS,
  SLOW_REFRESH_INTERVAL_MS,
} from '@/shared/constants';
import { useMatchesRefresh } from './useMatchesRefresh';

async function advance(ms: number): Promise<void> {
  await act(async () => {
    jest.advanceTimersByTime(ms);
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('useMatchesRefresh', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('refreshes every 60s when live matches are visible', async () => {
    const refetch = jest.fn(async () => ({ isError: false }));

    renderHook(() =>
      useMatchesRefresh({
        enabled: true,
        hasLiveMatches: true,
        isSlowNetwork: false,
        refetch,
      }),
    );

    await advance(LIVE_REFRESH_INTERVAL_MS);
    await advance(LIVE_REFRESH_INTERVAL_MS);

    expect(refetch).toHaveBeenCalledTimes(2);
  });

  it('switches to 120s cadence on slow network', async () => {
    const refetch = jest.fn(async () => ({ isError: false }));

    renderHook(() =>
      useMatchesRefresh({
        enabled: true,
        hasLiveMatches: true,
        isSlowNetwork: true,
        refetch,
      }),
    );

    await advance(SLOW_REFRESH_INTERVAL_MS - 1);
    expect(refetch).toHaveBeenCalledTimes(0);

    await advance(1);
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('applies backoff up to the configured max delay', async () => {
    const refetch = jest.fn(async () => ({ isError: true }));

    renderHook(() =>
      useMatchesRefresh({
        enabled: true,
        hasLiveMatches: true,
        isSlowNetwork: false,
        refetch,
      }),
    );

    await advance(LIVE_REFRESH_INTERVAL_MS);
    await advance(LIVE_REFRESH_INTERVAL_MS * 2);
    await advance(LIVE_REFRESH_INTERVAL_MS * 4);
    await advance(MAX_REFRESH_BACKOFF_MS);
    await advance(MAX_REFRESH_BACKOFF_MS);

    expect(refetch).toHaveBeenCalledTimes(5);
  });
});
