import { env } from '../../src/config/env.js';
import {
  createReadStoreBackfillRuntime,
  resolveReadStoreBackfillConfigFromEnv,
} from '../../src/lib/readStore/backfill.js';
import { getReadStore } from '../../src/lib/readStore/runtime.js';

function log(
  level: 'info' | 'warn' | 'error',
  event: string,
  data?: Record<string, unknown>,
): void {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      event,
      ...data,
    }),
  );
}

function createScriptLogger() {
  const logger = {
    info: (data?: unknown, message?: string) => {
      log('info', message ?? 'read_store_backfill.info', { data });
    },
    warn: (data?: unknown, message?: string) => {
      log('warn', message ?? 'read_store_backfill.warn', { data });
    },
    error: (data?: unknown, message?: string) => {
      log('error', message ?? 'read_store_backfill.error', { data });
    },
    child: () => logger,
  };

  return logger;
}

async function main(): Promise<void> {
  if (!env.databaseUrl) {
    log('error', 'read_store_backfill.abort', {
      reason: 'DATABASE_URL is not set',
    });
    process.exit(1);
  }

  if (!env.apiFootballKey) {
    log('error', 'read_store_backfill.abort', {
      reason: 'API_FOOTBALL_KEY is not set',
    });
    process.exit(1);
  }

  const config = resolveReadStoreBackfillConfigFromEnv(process.env);
  log('info', 'read_store_backfill.start', {
    config,
  });

  const readStore = await getReadStore({
    databaseUrl: env.databaseUrl,
  });

  try {
    const runtime = createReadStoreBackfillRuntime({
      readStore,
      config,
      logger: createScriptLogger(),
    });
    const report = await runtime.run();
    const hasFailures =
      report.competitions.failed > 0
      || report.teams.failed > 0
      || report.players.failed > 0;

    log(hasFailures ? 'warn' : 'info', 'read_store_backfill.complete', {
      report,
    });
    process.exit(hasFailures ? 1 : 0);
  } finally {
    await readStore.close();
  }
}

main().catch(error => {
  log('error', 'read_store_backfill.fatal', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  process.exit(1);
});
