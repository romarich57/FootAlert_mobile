type PlayerFullPayloadLike = {
  details?: {
    response?: unknown[];
  };
  overview?: {
    response?: {
      profile?: unknown;
    } | null;
  };
};

export function hasPlayerFullIdentity(
  payload: PlayerFullPayloadLike | null | undefined,
): boolean {
  if (!payload) {
    return false;
  }

  return Boolean(
    payload.overview?.response?.profile ||
      payload.details?.response?.[0],
  );
}
