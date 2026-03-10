export type EntityCacheTtlConfig = {
  teams: number;
  players: number;
  competitions: number;
  matches: number;
};

export const DEFAULT_ENTITY_CACHE_TTL_MS: EntityCacheTtlConfig = {
  teams: 60_000,
  players: 60_000,
  competitions: 60_000,
  matches: 45_000,
};

type CacheTtlEnvSource = Record<string, string | undefined>;

function readPositiveInt(rawValue: string | undefined, fallback: number): number {
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

export function resolveEntityCacheTtlConfig(
  source: CacheTtlEnvSource = process.env,
): EntityCacheTtlConfig {
  return {
    teams: readPositiveInt(source.CACHE_TTL_TEAMS_MS, DEFAULT_ENTITY_CACHE_TTL_MS.teams),
    players: readPositiveInt(source.CACHE_TTL_PLAYERS_MS, DEFAULT_ENTITY_CACHE_TTL_MS.players),
    competitions: readPositiveInt(
      source.CACHE_TTL_COMPETITIONS_MS,
      DEFAULT_ENTITY_CACHE_TTL_MS.competitions,
    ),
    matches: readPositiveInt(source.CACHE_TTL_MATCHES_MS, DEFAULT_ENTITY_CACHE_TTL_MS.matches),
  };
}
