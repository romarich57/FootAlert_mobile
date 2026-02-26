function normalizePrimitiveForSignature(value) {
    if (typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        value === null) {
        return value;
    }
    return null;
}
export function stableStringifyForSignature(value) {
    if (Array.isArray(value)) {
        return `[${value.map(item => stableStringifyForSignature(item)).join(',')}]`;
    }
    if (value && typeof value === 'object') {
        const objectValue = value;
        const keys = Object.keys(objectValue).sort();
        const serializedEntries = keys.map(key => `${JSON.stringify(key)}:${stableStringifyForSignature(objectValue[key])}`);
        return `{${serializedEntries.join(',')}}`;
    }
    return JSON.stringify(normalizePrimitiveForSignature(value));
}
export function buildRequestSignaturePayload(input) {
    return [
        input.method.toUpperCase(),
        input.pathWithQuery,
        input.timestamp,
        input.nonce,
        stableStringifyForSignature(input.body ?? null),
    ].join('\n');
}
