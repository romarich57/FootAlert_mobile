import {
  loadFollowedPlayerIds,
  loadFollowedTeamIds,
  loadHideTrends,
  saveFollowedPlayerIds,
  saveFollowedTeamIds,
  saveHideTrends,
  toggleFollowedPlayer,
  toggleFollowedTeam,
} from '@data/storage/followsStorage';

const mockStore = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (key: string) => mockStore.get(key) ?? null),
  setItem: jest.fn(async (key: string, value: string) => {
    mockStore.set(key, value);
  }),
  removeItem: jest.fn(async (key: string) => {
    mockStore.delete(key);
  }),
}));

describe('followsStorage', () => {
  beforeEach(() => {
    mockStore.clear();
  });

  it('toggles team follow and unfollow', async () => {
    const added = await toggleFollowedTeam('85', 30);
    expect(added.ids).toEqual(['85']);

    const removed = await toggleFollowedTeam('85', 30);
    expect(removed.ids).toEqual([]);
  });

  it('respects team follow limit', async () => {
    await saveFollowedTeamIds(['1', '2']);

    const result = await toggleFollowedTeam('3', 2);

    expect(result.changed).toBe(false);
    expect(result.reason).toBe('limit_reached');
    expect(await loadFollowedTeamIds()).toEqual(['1', '2']);
  });

  it('toggles player follow and unfollow', async () => {
    const added = await toggleFollowedPlayer('154', 30);
    expect(added.ids).toEqual(['154']);

    const removed = await toggleFollowedPlayer('154', 30);
    expect(removed.ids).toEqual([]);
  });

  it('loads and saves player ids', async () => {
    await saveFollowedPlayerIds(['10', '11']);
    expect(await loadFollowedPlayerIds()).toEqual(['10', '11']);
  });

  it('loads and saves hide trends per tab', async () => {
    expect(await loadHideTrends('teams')).toBe(false);
    expect(await loadHideTrends('players')).toBe(false);

    await saveHideTrends('teams', true);
    await saveHideTrends('players', false);

    expect(await loadHideTrends('teams')).toBe(true);
    expect(await loadHideTrends('players')).toBe(false);
  });
});
