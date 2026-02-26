export type RequestSignaturePayloadInput = {
  method: string;
  pathWithQuery: string;
  timestamp: string;
  nonce: string;
  body: unknown;
};

function normalizePrimitiveForSignature(value: unknown): unknown {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null
  ) {
    return value;
  }

  return null;
}

export function stableStringifyForSignature(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(item => stableStringifyForSignature(item)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const objectValue = value as Record<string, unknown>;
    const keys = Object.keys(objectValue).sort();
    const serializedEntries = keys.map(
      key => `${JSON.stringify(key)}:${stableStringifyForSignature(objectValue[key])}`,
    );
    return `{${serializedEntries.join(',')}}`;
  }

  return JSON.stringify(normalizePrimitiveForSignature(value));
}

export function buildRequestSignaturePayload(input: RequestSignaturePayloadInput): string {
  return [
    input.method.toUpperCase(),
    input.pathWithQuery,
    input.timestamp,
    input.nonce,
    stableStringifyForSignature(input.body ?? null),
  ].join('\n');
}
