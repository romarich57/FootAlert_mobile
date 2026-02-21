import {
  DEFAULT_MATCH_NOTIFICATION_PREFS,
  loadMatchNotificationPrefs,
  saveMatchNotificationPrefs,
} from '@data/storage/matchPreferencesStorage';

describe('matchPreferencesStorage', () => {
  it('returns default preferences when no value exists', async () => {
    const prefs = await loadMatchNotificationPrefs('fixture-1');
    expect(prefs).toEqual(DEFAULT_MATCH_NOTIFICATION_PREFS);
  });

  it('saves and loads preferences for a fixture', async () => {
    const payload = {
      goal: false,
      redCard: true,
      start: true,
      end: false,
    };

    await saveMatchNotificationPrefs('fixture-2', payload);
    const loaded = await loadMatchNotificationPrefs('fixture-2');
    expect(loaded).toEqual(payload);
  });
});
