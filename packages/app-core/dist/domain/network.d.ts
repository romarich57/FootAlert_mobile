export type FlexibleObject = Record<string, unknown>;
export type PagingInfo = {
    current?: number;
    total?: number;
};
export type CursorPageInfo = {
    hasMore: boolean;
    nextCursor: string | null;
    returnedCount: number;
};
export type ListEnvelope<T = FlexibleObject> = {
    response: T[];
    pageInfo?: CursorPageInfo;
};
export type OptionalEnvelope<T = unknown> = {
    response?: T;
};
export type PagedEnvelope<T = FlexibleObject> = {
    response: T[];
    paging?: PagingInfo;
    pageInfo?: CursorPageInfo;
};
//# sourceMappingURL=network.d.ts.map