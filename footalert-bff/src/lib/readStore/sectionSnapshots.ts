import type { FastifyBaseLogger } from 'fastify';

import {
  buildHydrationSection,
  type HydrationSection,
} from './hydration.js';
import type { ReadStore, ReadStoreSnapshotStatus } from './runtime.js';

type SectionSnapshotStatus = ReadStoreSnapshotStatus;

export type SectionSnapshotResult<TValue> = {
  value: TValue;
  hydration: HydrationSection;
  enqueued: boolean;
};

function toHydrationFreshness(
  status: SectionSnapshotStatus,
): 'fresh' | 'stale' | 'miss' {
  if (status === 'fresh') {
    return 'fresh';
  }

  if (status === 'stale' || status === 'expired') {
    return 'stale';
  }

  return 'miss';
}

export async function enqueueSectionRefresh(input: {
  readStore: Pick<ReadStore, 'enqueueRefresh'>;
  entityKind: string;
  entityId: string;
  scopeKey: string;
  priority: number;
  payload?: Record<string, unknown> | null;
  logger?: FastifyBaseLogger;
  cacheKey: string;
}): Promise<boolean> {
  try {
    await input.readStore.enqueueRefresh({
      entityKind: input.entityKind,
      entityId: input.entityId,
      scopeKey: input.scopeKey,
      priority: input.priority,
      notBefore: new Date(),
      payload: input.payload ?? null,
    });
    return true;
  } catch (error) {
    input.logger?.warn(
      {
        err: error instanceof Error ? error.message : String(error),
        cacheKey: input.cacheKey,
      },
      'read_store.section_refresh_enqueue_failed',
    );
    return false;
  }
}

export async function resolveSectionSnapshot<TValue>(input: {
  readStore: ReadStore;
  entityKind: string;
  entityId: string;
  scopeKey: string;
  cacheKey: string;
  defaultValue: TValue;
  isValid?: (payload: TValue) => boolean;
  unavailable?: boolean;
  priority: number;
  payload?: Record<string, unknown> | null;
  logger?: FastifyBaseLogger;
}): Promise<SectionSnapshotResult<TValue>> {
  const snapshot = await input.readStore.getEntitySnapshot<TValue>({
    entityKind: input.entityKind,
    entityId: input.entityId,
    scopeKey: input.scopeKey,
  });

  if (
    snapshot.status !== 'miss' &&
    (input.isValid?.(snapshot.payload) ?? true)
  ) {
    const freshness = toHydrationFreshness(snapshot.status);
    const enqueued =
      freshness === 'stale'
        ? await enqueueSectionRefresh({
            readStore: input.readStore,
            entityKind: input.entityKind,
            entityId: input.entityId,
            scopeKey: input.scopeKey,
            priority: input.priority,
            payload: input.payload,
            logger: input.logger,
            cacheKey: input.cacheKey,
          })
        : false;

    return {
      value: snapshot.payload,
      hydration: buildHydrationSection({
        state: 'ready',
        freshness,
        updatedAt: snapshot.generatedAt,
      }),
      enqueued,
    };
  }

  if (input.unavailable) {
    return {
      value: input.defaultValue,
      hydration: buildHydrationSection({
        state: 'unavailable',
        freshness: 'miss',
      }),
      enqueued: false,
    };
  }

  const enqueued = await enqueueSectionRefresh({
    readStore: input.readStore,
    entityKind: input.entityKind,
    entityId: input.entityId,
    scopeKey: input.scopeKey,
    priority: input.priority,
    payload: input.payload,
    logger: input.logger,
    cacheKey: input.cacheKey,
  });

  return {
    value: input.defaultValue,
    hydration: buildHydrationSection({
      state: 'loading',
      freshness: 'miss',
    }),
    enqueued,
  };
}
