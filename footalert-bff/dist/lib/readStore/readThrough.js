const inFlightSnapshotRefreshes = new Map();
function normalizeScopeValue(value) {
    if (typeof value === 'boolean') {
        return value ? '1' : '0';
    }
    return String(value);
}
function normalizeScopeKey(scopeKey) {
    const normalized = scopeKey?.trim();
    return normalized && normalized.length > 0 ? normalized : '';
}
export function buildReadStoreScopeKey(parts) {
    const searchParams = new URLSearchParams();
    const sortedEntries = Object.entries(parts).sort((first, second) => first[0].localeCompare(second[0]));
    for (const [key, value] of sortedEntries) {
        if (value === null || typeof value === 'undefined') {
            continue;
        }
        searchParams.set(key, normalizeScopeValue(value));
    }
    return searchParams.toString();
}
export function decodeReadStoreScopeKey(scopeKey) {
    const output = {};
    if (!scopeKey || scopeKey.trim().length === 0) {
        return output;
    }
    const searchParams = new URLSearchParams(scopeKey);
    for (const [key, value] of searchParams.entries()) {
        output[key] = value;
    }
    return output;
}
export function buildSnapshotWindow(input) {
    const generatedAt = input.now ?? new Date();
    const staleAt = new Date(generatedAt.getTime() + Math.max(0, Math.floor(input.staleAfterMs)));
    const expiresAt = new Date(generatedAt.getTime() + Math.max(0, Math.floor(input.expiresAfterMs)));
    return {
        generatedAt,
        staleAt,
        expiresAt: expiresAt < staleAt ? staleAt : expiresAt,
    };
}
function registerInFlightRefresh(key, refreshPromise) {
    inFlightSnapshotRefreshes.set(key, refreshPromise);
    void refreshPromise.finally(() => {
        const current = inFlightSnapshotRefreshes.get(key);
        if (current === refreshPromise) {
            inFlightSnapshotRefreshes.delete(key);
        }
    });
}
export async function readThroughSnapshot(input) {
    let snapshot;
    try {
        snapshot = await input.getSnapshot();
    }
    catch (error) {
        input.logger?.warn({
            err: error instanceof Error ? error.message : String(error),
            cacheKey: input.cacheKey,
        }, 'read_store.snapshot_read_failed');
        snapshot = { status: 'miss' };
    }
    if (snapshot.status === 'fresh') {
        return {
            payload: snapshot.payload,
            freshness: 'fresh',
        };
    }
    if (snapshot.status === 'stale' || snapshot.status === 'expired') {
        const staleSnapshot = snapshot;
        if (!inFlightSnapshotRefreshes.has(input.cacheKey)) {
            const backgroundRefresh = (async () => {
                try {
                    const payload = await input.fetchFresh();
                    const window = buildSnapshotWindow({
                        staleAfterMs: input.staleAfterMs,
                        expiresAfterMs: input.expiresAfterMs,
                    });
                    await input.upsertSnapshot({
                        payload,
                        ...window,
                    });
                }
                catch (error) {
                    input.logger?.warn({
                        err: error instanceof Error ? error.message : String(error),
                        cacheKey: input.cacheKey,
                    }, 'read_store.background_refresh_failed');
                }
            })();
            registerInFlightRefresh(input.cacheKey, backgroundRefresh);
        }
        if (input.queue) {
            void input.queue.store.enqueueRefresh({
                entityKind: input.queue.target.entityKind,
                entityId: input.queue.target.entityId,
                scopeKey: input.queue.target.scopeKey ?? null,
                notBefore: new Date(),
            }).catch(error => {
                input.logger?.warn({
                    err: error instanceof Error ? error.message : String(error),
                    cacheKey: input.cacheKey,
                }, 'read_store.refresh_enqueue_failed');
            });
        }
        return {
            payload: staleSnapshot.payload,
            freshness: 'stale',
        };
    }
    const payload = await input.fetchFresh();
    const window = buildSnapshotWindow({
        staleAfterMs: input.staleAfterMs,
        expiresAfterMs: input.expiresAfterMs,
    });
    await input.upsertSnapshot({
        payload,
        ...window,
    });
    return {
        payload,
        freshness: 'miss',
    };
}
export async function readThroughEntitySnapshot(input) {
    if (input.store) {
        try {
            const snapshot = await input.store.getEntitySnapshot(input.entityKind, input.entityId, input.scopeKey);
            if (snapshot) {
                if (snapshot.freshness !== 'fresh') {
                    void input.store.enqueueRefreshTask({
                        ...input.refreshTask,
                        nextRefreshAt: new Date(),
                    }).catch(error => {
                        input.logger?.warn({
                            err: error instanceof Error ? error.message : String(error),
                            entityKind: input.entityKind,
                            entityId: input.entityId,
                        }, 'read_store.refresh_enqueue_failed');
                    });
                }
                return snapshot.payload;
            }
        }
        catch (error) {
            input.logger?.warn({
                err: error instanceof Error ? error.message : String(error),
                entityKind: input.entityKind,
                entityId: input.entityId,
            }, 'read_store.snapshot_read_failed');
        }
    }
    const payload = await input.loader();
    if (input.store) {
        try {
            await input.store.upsertEntitySnapshot({
                entityKind: input.entityKind,
                entityId: input.entityId,
                scopeKey: input.scopeKey,
                payload,
                payloadVersion: input.payloadVersion,
                freshUntil: input.freshUntil,
                staleUntil: input.staleUntil,
            });
        }
        catch (error) {
            input.logger?.warn({
                err: error instanceof Error ? error.message : String(error),
                entityKind: input.entityKind,
                entityId: input.entityId,
            }, 'read_store.snapshot_write_failed');
        }
    }
    return payload;
}
