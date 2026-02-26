export type RequestSignaturePayloadInput = {
    method: string;
    pathWithQuery: string;
    timestamp: string;
    nonce: string;
    body: unknown;
};
export declare function stableStringifyForSignature(value: unknown): string;
export declare function buildRequestSignaturePayload(input: RequestSignaturePayloadInput): string;
//# sourceMappingURL=requestSignaturePayload.d.ts.map