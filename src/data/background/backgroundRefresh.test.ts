import BackgroundFetch from 'react-native-background-fetch';

import {
  isBackgroundRefreshEligible,
  registerBackgroundRefresh,
  resetBackgroundRefreshStateForTests,
} from '@data/background/backgroundRefresh';

const mockedBackgroundFetchConfigure = jest.mocked(BackgroundFetch.configure);
const mockedBackgroundFetchScheduleTask = jest.mocked(BackgroundFetch.scheduleTask);

describe('backgroundRefresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetBackgroundRefreshStateForTests();
    mockedBackgroundFetchConfigure.mockResolvedValue(2 as never);
    mockedBackgroundFetchScheduleTask.mockResolvedValue(undefined as never);
  });

  it('blocks registration until the app hydration is complete', async () => {
    expect(
      isBackgroundRefreshEligible({
        isHydrated: false,
      }),
    ).toEqual({
      allowed: false,
      reason: 'not_hydrated',
    });

    await registerBackgroundRefresh({
      isHydrated: false,
    });

    expect(mockedBackgroundFetchConfigure).not.toHaveBeenCalled();
  });

  it('blocks registration while low power mode is active', async () => {
    expect(
      isBackgroundRefreshEligible({
        isHydrated: true,
        isOnline: true,
        lowPowerMode: true,
      }),
    ).toEqual({
      allowed: false,
      reason: 'low_power_mode',
    });

    await registerBackgroundRefresh({
      isHydrated: true,
      isOnline: true,
      lowPowerMode: true,
    });

    expect(mockedBackgroundFetchConfigure).not.toHaveBeenCalled();
  });

  it('registers background refresh once when runtime conditions are eligible', async () => {
    await registerBackgroundRefresh({
      isHydrated: true,
      isOnline: true,
      lowPowerMode: false,
    });

    expect(mockedBackgroundFetchConfigure).toHaveBeenCalledTimes(1);
    expect(mockedBackgroundFetchScheduleTask).toHaveBeenCalledTimes(1);

    expect(
      isBackgroundRefreshEligible({
        isHydrated: true,
        isOnline: true,
        lowPowerMode: false,
      }),
    ).toEqual({
      allowed: false,
      reason: 'already_registered',
    });
  });
});
