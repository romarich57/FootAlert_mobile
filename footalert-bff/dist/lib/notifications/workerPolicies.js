export function chunkForMulticast(items, chunkSize) {
    if (items.length === 0) {
        return [];
    }
    const chunks = [];
    for (let index = 0; index < items.length; index += chunkSize) {
        chunks.push(items.slice(index, index + chunkSize));
    }
    return chunks;
}
export function sortRecipientsForFanout(items) {
    return [...items].sort((left, right) => {
        const byLastSeen = right.lastSeenAt.localeCompare(left.lastSeenAt);
        if (byLastSeen !== 0) {
            return byLastSeen;
        }
        return left.deviceId.localeCompare(right.deviceId);
    });
}
export function splitImmediateAndDeferred(items, maxImmediate) {
    const safeMaxImmediate = Math.max(0, Math.floor(maxImmediate));
    return {
        immediate: items.slice(0, safeMaxImmediate),
        deferred: items.slice(safeMaxImmediate),
    };
}
export function isInvalidTokenCode(code) {
    if (!code) {
        return false;
    }
    return code.includes('registration-token-not-registered') || code.includes('invalid-registration-token');
}
export function isTransientErrorCode(code) {
    if (!code) {
        return false;
    }
    return code.includes('unavailable') || code.includes('internal') || code.includes('timeout');
}
