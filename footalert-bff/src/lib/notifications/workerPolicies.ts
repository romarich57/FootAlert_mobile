export function chunkForMulticast<T>(items: T[], chunkSize: number): T[][] {
  if (items.length === 0) {
    return [];
  }

  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
}

export function sortRecipientsForFanout<T extends { lastSeenAt: string; deviceId: string }>(items: T[]): T[] {
  return [...items].sort((left, right) => {
    const byLastSeen = right.lastSeenAt.localeCompare(left.lastSeenAt);
    if (byLastSeen !== 0) {
      return byLastSeen;
    }

    return left.deviceId.localeCompare(right.deviceId);
  });
}

export function splitImmediateAndDeferred<T>(items: T[], maxImmediate: number): {
  immediate: T[];
  deferred: T[];
} {
  const safeMaxImmediate = Math.max(0, Math.floor(maxImmediate));
  return {
    immediate: items.slice(0, safeMaxImmediate),
    deferred: items.slice(safeMaxImmediate),
  };
}

export function isInvalidTokenCode(code: string | null): boolean {
  if (!code) {
    return false;
  }

  return code.includes('registration-token-not-registered') || code.includes('invalid-registration-token');
}

export function isTransientErrorCode(code: string | null): boolean {
  if (!code) {
    return false;
  }

  return code.includes('unavailable') || code.includes('internal') || code.includes('timeout');
}
