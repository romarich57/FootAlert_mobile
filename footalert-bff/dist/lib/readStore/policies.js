export const BOOTSTRAP_POLICY = {
    freshMs: 5 * 60_000,
    staleMs: 30 * 60_000,
    refreshIntervalMs: 5 * 60_000,
};
export const TEAM_POLICY = {
    freshMs: 6 * 60 * 60_000,
    staleMs: 24 * 60 * 60_000,
    refreshIntervalMs: 6 * 60 * 60_000,
};
export const PLAYER_POLICY = {
    freshMs: 12 * 60 * 60_000,
    staleMs: 36 * 60 * 60_000,
    refreshIntervalMs: 12 * 60 * 60_000,
};
export const COMPETITION_POLICY = {
    freshMs: 2 * 60 * 60_000,
    staleMs: 12 * 60 * 60_000,
    refreshIntervalMs: 2 * 60 * 60_000,
};
export const MATCH_DEFAULT_POLICY = {
    freshMs: 5 * 60_000,
    staleMs: 30 * 60_000,
    refreshIntervalMs: 5 * 60_000,
};
export const MATCH_LIVE_POLICY = {
    freshMs: 2 * 60_000,
    staleMs: 10 * 60_000,
    refreshIntervalMs: 2 * 60_000,
};
export const MATCH_LIVE_OVERLAY_POLICY = {
    freshMs: 30_000,
    staleMs: 2 * 60_000,
    refreshIntervalMs: 30_000,
};
export function resolveMatchSnapshotPolicy(lifecycleState) {
    if (lifecycleState === 'live') {
        return MATCH_LIVE_POLICY;
    }
    return MATCH_DEFAULT_POLICY;
}
