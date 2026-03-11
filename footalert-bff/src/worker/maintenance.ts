import { setTimeout as wait } from 'node:timers/promises';

import type { ReadStore } from '../lib/readStore/runtime.js';
import {
  CALENDAR_POLL_INTERVAL_MS,
  runCalendarScheduleCycle,
} from './match-calendar-scheduler.js';
import {
  READ_STORE_BOOTSTRAP_WARM_INTERVAL_MS,
  READ_STORE_DEFAULT_TIMEZONE,
  READ_STORE_REFRESH_POLL_INTERVAL_MS,
} from './read-store-refresh.js';
import { logWorker } from './shared.js';

const GC_INTERVAL_MS = 10 * 60_000;
const HEARTBEAT_STALE_MS = 5 * 60_000;

export async function runReadStoreMaintenanceLoop(input: {
  readStore: ReadStore;
  readStoreRefreshRuntime: {
    warmBootstrapSnapshot: () => Promise<void>;
    processSnapshotRefreshQueue: () => Promise<void>;
  };
  isShuttingDown: () => boolean;
}): Promise<void> {
  let lastBootstrapWarmAt = Date.now();
  let lastGcAt = 0;
  let lastCalendarAt = 0;
  let consecutiveRefreshErrors = 0;

  while (!input.isShuttingDown()) {
    const nowMs = Date.now();

    if (nowMs - lastBootstrapWarmAt >= READ_STORE_BOOTSTRAP_WARM_INTERVAL_MS) {
      try {
        await input.readStoreRefreshRuntime.warmBootstrapSnapshot();
      } catch (error) {
        logWorker('error', 'bootstrap_warm_failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      lastBootstrapWarmAt = nowMs;
    }

    if (nowMs - lastCalendarAt >= CALENDAR_POLL_INTERVAL_MS) {
      try {
        await runCalendarScheduleCycle({
          readStore: input.readStore,
          timezone: READ_STORE_DEFAULT_TIMEZONE,
        });
      } catch (error) {
        logWorker('error', 'calendar_schedule_failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      lastCalendarAt = nowMs;
    }

    if (nowMs - lastGcAt >= GC_INTERVAL_MS) {
      try {
        const now = new Date();
        const staleBefore = new Date(nowMs - HEARTBEAT_STALE_MS);
        const [deletedSnapshots, deletedHeartbeats] = await Promise.all([
          input.readStore.deleteExpiredSnapshots(now),
          input.readStore.deleteStaleHeartbeats(staleBefore),
        ]);
        if (deletedSnapshots > 0 || deletedHeartbeats > 0) {
          logWorker('info', 'gc_complete', {
            deletedSnapshots,
            deletedHeartbeats,
          });
        }
      } catch (error) {
        logWorker('error', 'gc_failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      lastGcAt = nowMs;
    }

    try {
      await input.readStoreRefreshRuntime.processSnapshotRefreshQueue();
      consecutiveRefreshErrors = 0;
    } catch (error) {
      consecutiveRefreshErrors++;
      logWorker('error', 'read_store_refresh_cycle_failed', {
        error: error instanceof Error ? error.message : String(error),
        consecutiveErrors: consecutiveRefreshErrors,
      });
    }

    const backoffMs = Math.min(
      READ_STORE_REFRESH_POLL_INTERVAL_MS * Math.pow(2, consecutiveRefreshErrors),
      5 * 60_000,
    );
    await wait(consecutiveRefreshErrors > 0 ? backoffMs : READ_STORE_REFRESH_POLL_INTERVAL_MS);
  }
}
