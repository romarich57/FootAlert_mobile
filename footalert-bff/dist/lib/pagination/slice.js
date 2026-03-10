export function sliceByOffset(input) {
    const start = Math.max(0, Math.floor(input.startPosition));
    const limit = Math.max(1, Math.floor(input.limit));
    const sliced = input.items.slice(start, start + limit);
    const hasMore = start + sliced.length < input.items.length;
    return { sliced, hasMore };
}
export function buildCursorPageInfo(input) {
    const hasMore = input.hasMore && input.returnedCount > 0;
    if (!hasMore) {
        return {
            hasMore: false,
            nextCursor: null,
            returnedCount: input.returnedCount,
        };
    }
    const nextPosition = input.startPosition + input.returnedCount;
    const nextCursor = input.cursorCodec.encode({
        route: input.route,
        filtersHash: input.filtersHash,
        position: nextPosition,
    });
    return {
        hasMore: true,
        nextCursor,
        returnedCount: input.returnedCount,
    };
}
