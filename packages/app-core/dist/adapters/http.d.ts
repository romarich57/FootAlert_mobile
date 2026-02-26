export type QueryValue = string | number | boolean | null | undefined;
export type HttpRequestOptions = {
    signal?: AbortSignal;
    timeoutMs?: number;
    headers?: Record<string, string>;
};
export interface HttpAdapter {
    get<T = unknown>(path: string, query?: Record<string, QueryValue>, options?: HttpRequestOptions): Promise<T>;
}
//# sourceMappingURL=http.d.ts.map