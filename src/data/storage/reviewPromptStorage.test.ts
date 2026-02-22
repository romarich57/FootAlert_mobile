import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  incrementAppLaunchCount,
  incrementPositiveEventCount,
  isReviewPromptEligible,
  loadReviewPromptState,
  markReviewPrompted,
} from '@data/storage/reviewPromptStorage';

describe('reviewPromptStorage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('creates a default state when storage is empty', async () => {
    const now = new Date('2026-02-22T12:00:00.000Z');
    const state = await loadReviewPromptState(now);

    expect(state.appLaunchCount).toBe(0);
    expect(state.positiveEventCount).toBe(0);
    expect(state.promptCount).toBe(0);
    expect(state.lastPromptAt).toBeNull();
    expect(state.firstSeenAt).toBe(now.toISOString());
  });

  it('increments launches and positive events', async () => {
    await incrementAppLaunchCount(new Date('2026-02-22T12:00:00.000Z'));
    await incrementAppLaunchCount(new Date('2026-02-23T12:00:00.000Z'));
    const updated = await incrementPositiveEventCount(new Date('2026-02-24T12:00:00.000Z'));

    expect(updated.appLaunchCount).toBe(2);
    expect(updated.positiveEventCount).toBe(1);
  });

  it('marks review prompt metadata', async () => {
    const now = new Date('2026-04-01T10:00:00.000Z');
    const updated = await markReviewPrompted('1.2.3', now);

    expect(updated.promptCount).toBe(1);
    expect(updated.lastPromptAt).toBe(now.toISOString());
    expect(updated.lastPromptedVersion).toBe('1.2.3');
  });

  it('returns false in dev runtime even when thresholds are met', () => {
    const state = {
      firstSeenAt: '2026-01-01T00:00:00.000Z',
      appLaunchCount: 10,
      positiveEventCount: 10,
      lastPromptAt: null,
      promptCount: 0,
      lastPromptedVersion: null,
    };

    expect(
      isReviewPromptEligible(state, {
        isDevRuntime: true,
        appVersion: '1.0.0',
        now: new Date('2026-02-01T00:00:00.000Z'),
      }),
    ).toBe(false);
  });

  it('returns true when all conditions are met', () => {
    const state = {
      firstSeenAt: '2026-01-01T00:00:00.000Z',
      appLaunchCount: 4,
      positiveEventCount: 5,
      lastPromptAt: null,
      promptCount: 0,
      lastPromptedVersion: null,
    };

    expect(
      isReviewPromptEligible(state, {
        isDevRuntime: false,
        appVersion: '1.0.0',
        now: new Date('2026-02-01T00:00:00.000Z'),
      }),
    ).toBe(true);
  });

  it('blocks when cooldown, prompt limit, or same version constraints are violated', () => {
    const state = {
      firstSeenAt: '2026-01-01T00:00:00.000Z',
      appLaunchCount: 10,
      positiveEventCount: 10,
      lastPromptAt: '2026-01-20T00:00:00.000Z',
      promptCount: 3,
      lastPromptedVersion: '1.0.0',
    };

    expect(
      isReviewPromptEligible(state, {
        isDevRuntime: false,
        appVersion: '1.0.0',
        now: new Date('2026-02-01T00:00:00.000Z'),
      }),
    ).toBe(false);
  });
});

