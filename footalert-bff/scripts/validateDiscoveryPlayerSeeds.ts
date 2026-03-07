import { readFile, writeFile } from 'node:fs/promises';

import { FOLLOW_DISCOVERY_SEED_PLAYERS } from '@footalert/app-core';

type RawSeedPlayer = Omit<(typeof FOLLOW_DISCOVERY_SEED_PLAYERS)[number], 'playerPhoto'>;

type ScriptEnv = {
  apiFootballBaseUrl: string;
  apiFootballKey: string;
};

type PlayerSeasonResponse = {
  response?: Array<{
    player?: {
      id?: number;
      name?: string;
    };
    statistics?: Array<{
      team?: {
        name?: string;
        logo?: string;
      };
      league?: {
        name?: string;
      };
      games?: {
        position?: string;
      };
    }>;
  }>;
};

type TopScorerResponse = {
  response?: Array<{
    player?: {
      id?: number;
      name?: string;
    };
    statistics?: Array<{
      team?: {
        name?: string;
        logo?: string;
      };
      league?: {
        name?: string;
      };
      games?: {
        position?: string;
      };
    }>;
  }>;
};

const DEFAULT_LEGACY_LEAGUE_IDS = ['140', '39', '61', '78', '253'];
const APP_CORE_SEEDS_PATH = new URL(
  '../../packages/app-core/src/follows/discoverySeeds.ts',
  import.meta.url,
);

function normalizeName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function readEnvValue(key: string): string | null {
  const directValue = process.env[key]?.trim();
  if (directValue) {
    return directValue;
  }

  return null;
}

function resolveScriptEnv(): ScriptEnv {
  const apiFootballBaseUrl = readEnvValue('API_FOOTBALL_BASE_URL');
  const apiFootballKey = readEnvValue('API_FOOTBALL_KEY');

  if (!apiFootballBaseUrl || !apiFootballKey) {
    throw new Error(
      'API_FOOTBALL_BASE_URL and API_FOOTBALL_KEY are required. Run the script with the BFF env loaded.',
    );
  }

  return {
    apiFootballBaseUrl,
    apiFootballKey,
  };
}

async function apiFootballGet<T>(env: ScriptEnv, path: string): Promise<T> {
  const response = await fetch(`${env.apiFootballBaseUrl}${path}`, {
    headers: {
      'x-apisports-key': env.apiFootballKey,
    },
  });

  if (!response.ok) {
    throw new Error(`API-Football request failed (${response.status}) for ${path}`);
  }

  return (await response.json()) as T;
}

function matchesSeedName(seedName: string, upstreamName: string): boolean {
  const normalizedSeedName = normalizeName(seedName);
  const normalizedUpstreamName = normalizeName(upstreamName);

  return normalizedSeedName === normalizedUpstreamName
    || normalizedSeedName.includes(normalizedUpstreamName)
    || normalizedUpstreamName.includes(normalizedSeedName);
}

async function validateSeed(
  env: ScriptEnv,
  seed: (typeof FOLLOW_DISCOVERY_SEED_PLAYERS)[number],
  season: number,
): Promise<boolean> {
  const payload = await apiFootballGet<PlayerSeasonResponse>(
    env,
    `/players?id=${encodeURIComponent(seed.playerId)}&season=${encodeURIComponent(String(season))}`,
  );
  const player = payload.response?.[0]?.player;

  if (!player?.id || !player?.name) {
    return false;
  }

  return String(player.id) === seed.playerId && matchesSeedName(seed.playerName, player.name);
}

async function loadLegacyPlayerCandidates(
  env: ScriptEnv,
  season: number,
): Promise<RawSeedPlayer[]> {
  const candidates: RawSeedPlayer[] = [];
  const seen = new Set<string>();

  for (const leagueId of DEFAULT_LEGACY_LEAGUE_IDS) {
    const payload = await apiFootballGet<TopScorerResponse>(
      env,
      `/players/topscorers?league=${encodeURIComponent(leagueId)}&season=${encodeURIComponent(String(season))}`,
    );

    for (const item of payload.response ?? []) {
      const playerId = String(item.player?.id ?? '').trim();
      const playerName = item.player?.name?.trim() ?? '';
      if (!playerId || !playerName || seen.has(playerId)) {
        continue;
      }

      seen.add(playerId);
      const firstStats = item.statistics?.[0];
      candidates.push({
        playerId,
        playerName,
        position: firstStats?.games?.position ?? '',
        teamName: firstStats?.team?.name ?? '',
        teamLogo: firstStats?.team?.logo ?? '',
        leagueName: firstStats?.league?.name ?? '',
        activeFollowersCount: 0,
        recentNet30d: 0,
        totalFollowAdds: 0,
      });
    }
  }

  return candidates;
}

function renderRawSeedBlock(seeds: RawSeedPlayer[]): string {
  const lines = seeds.flatMap(seed => [
    '  {',
    `    playerId: '${seed.playerId}',`,
    `    playerName: '${seed.playerName.replace(/'/g, "\\'")}',`,
    `    position: '${seed.position.replace(/'/g, "\\'")}',`,
    `    teamName: '${seed.teamName.replace(/'/g, "\\'")}',`,
    `    teamLogo: '${seed.teamLogo.replace(/'/g, "\\'")}',`,
    `    leagueName: '${seed.leagueName.replace(/'/g, "\\'")}',`,
    '    ...ZERO_COUNTS,',
    '  },',
  ]);

  return `const RAW_FOLLOW_DISCOVERY_SEED_PLAYERS: RawFollowDiscoverySeedPlayerItem[] = [\n${lines.join('\n')}\n];`;
}

async function replaceSeedBlock(seeds: RawSeedPlayer[]): Promise<void> {
  const currentFile = await readFile(APP_CORE_SEEDS_PATH, 'utf8');
  const nextSeedBlock = renderRawSeedBlock(seeds);
  const nextFile = currentFile.replace(
    /const RAW_FOLLOW_DISCOVERY_SEED_PLAYERS: RawFollowDiscoverySeedPlayerItem\[] = \[[\s\S]*?\];/,
    nextSeedBlock,
  );

  if (nextFile === currentFile) {
    throw new Error('Failed to replace RAW_FOLLOW_DISCOVERY_SEED_PLAYERS block.');
  }

  await writeFile(APP_CORE_SEEDS_PATH, nextFile, 'utf8');
}

async function main(): Promise<void> {
  const env = resolveScriptEnv();
  const writeChanges = process.argv.includes('--write');
  // Force season to 2024 because topscorers for 2025 are not fully complete/available yet on API-Football
  const season = 2024;
  const usedPlayerIds = new Set<string>();
  const legacyCandidates = await loadLegacyPlayerCandidates(env, season); console.log("Candidates loaded:", legacyCandidates.length);
  const repairedSeeds: RawSeedPlayer[] = [];

  for (const seed of FOLLOW_DISCOVERY_SEED_PLAYERS) {
    const seedIsValid = await validateSeed(env, seed, season).catch(() => false);
    if (seedIsValid && !usedPlayerIds.has(seed.playerId)) {
      usedPlayerIds.add(seed.playerId);
      repairedSeeds.push({
        playerId: seed.playerId,
        playerName: seed.playerName,
        position: seed.position,
        teamName: seed.teamName,
        teamLogo: seed.teamLogo,
        leagueName: seed.leagueName,
        activeFollowersCount: 0,
        recentNet30d: 0,
        totalFollowAdds: 0,
      });
      continue;
    }

    const replacement = legacyCandidates.find(candidate => !usedPlayerIds.has(candidate.playerId));
    if (!replacement) {
      throw new Error(`No validated replacement candidate available for seed ${seed.playerName}.`);
    }

    usedPlayerIds.add(replacement.playerId);
    repairedSeeds.push(replacement);
  }

  if (writeChanges) {
    await replaceSeedBlock(repairedSeeds);
    console.log(`Updated ${APP_CORE_SEEDS_PATH.pathname} with ${repairedSeeds.length} validated seeds.`);
    return;
  }

  console.log(JSON.stringify(repairedSeeds, null, 2));
}

void main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
