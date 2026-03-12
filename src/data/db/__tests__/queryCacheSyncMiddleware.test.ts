/**
 * Tests unitaires pour le middleware de sync React Query → SQLite.
 */

// --- Mock op-sqlite ---

const executedStatements: Array<{ sql: string; params: unknown[] }> = [];

function defaultExecuteSyncImpl(sql: string, params: unknown[] = []) {
  executedStatements.push({ sql, params });
  if (sql.startsWith('SELECT')) {
    return { rows: [], rowsAffected: 0 };
  }
  return { rows: [], rowsAffected: 1 };
}

const mockDb = {
  executeSync: jest.fn(defaultExecuteSyncImpl),
  execute: jest.fn(async (sql: string, params: unknown[] = []) => defaultExecuteSyncImpl(sql, params)),
  close: jest.fn(),
};

jest.mock('@op-engineering/op-sqlite', () => ({
  open: jest.fn(() => mockDb),
}));

jest.mock('@data/telemetry/mobileTelemetry', () => ({
  getMobileTelemetry: () => ({
    trackEvent: jest.fn(),
    trackError: jest.fn(),
    addBreadcrumb: jest.fn(),
    setUserContext: jest.fn(),
    trackBatch: jest.fn(),
    flush: jest.fn(),
  }),
}));

// --- Import après mocks ---

import { getDatabase } from '../database';
import { defaultSyncRules, setupQueryCacheSyncMiddleware } from '../queryCacheSyncMiddleware';

type MockSubscriber = (event: {
  type: string;
  action: { type: string };
  query: { queryKey: readonly unknown[]; state: { data: unknown } };
}) => void;

// --- Tests ---

describe('queryCacheSyncMiddleware', () => {
  let subscriber: MockSubscriber;
  let unsubscribeFn: jest.Mock;

  beforeEach(async () => {
    executedStatements.length = 0;
    mockDb.executeSync.mockReset();
    mockDb.executeSync.mockImplementation(defaultExecuteSyncImpl);
    mockDb.execute.mockReset();
    mockDb.execute.mockImplementation(async (sql: string, params: unknown[] = []) =>
      defaultExecuteSyncImpl(sql, params),
    );

    await getDatabase();
    executedStatements.length = 0;

    unsubscribeFn = jest.fn();
    const mockQueryCache = {
      subscribe: jest.fn((cb: MockSubscriber) => {
        subscriber = cb;
        return unsubscribeFn;
      }),
    };

    setupQueryCacheSyncMiddleware(
      mockQueryCache as never,
      defaultSyncRules,
    );
  });

  it('écrit en SQLite quand une query teams/full est mise à jour', () => {
    subscriber({
      type: 'updated',
      action: { type: 'success' },
      query: {
        queryKey: ['teams', 'full', '42', 'Europe/Paris', null, null],
        state: { data: { details: { response: [] }, overview: null } },
      },
    });

    const insertCalls = executedStatements.filter(s =>
      s.sql.includes('INSERT OR REPLACE INTO entities'),
    );
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0].params[0]).toBe('team');
    expect(insertCalls[0].params[1]).toBe('42:base:base:Europe/Paris');
  });

  it('écrit en SQLite pour players/full', () => {
    subscriber({
      type: 'updated',
      action: { type: 'success' },
      query: {
        queryKey: ['players', 'full', '10', 2025],
        state: { data: { details: { response: [] } } },
      },
    });

    const insertCalls = executedStatements.filter(s =>
      s.sql.includes('INSERT OR REPLACE INTO entities'),
    );
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0].params[0]).toBe('player');
    expect(insertCalls[0].params[1]).toBe('10:2025');
  });

  it('écrit en SQLite pour competitions/full', () => {
    subscriber({
      type: 'updated',
      action: { type: 'success' },
      query: {
        queryKey: ['competitions', 'full', '39', 2025],
        state: { data: { competition: {}, standings: null } },
      },
    });

    const insertCalls = executedStatements.filter(s =>
      s.sql.includes('INSERT OR REPLACE INTO entities'),
    );
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0].params[0]).toBe('competition');
    expect(insertCalls[0].params[1]).toBe('39:2025');
  });

  it('écrit en SQLite pour match_details_full', () => {
    subscriber({
      type: 'updated',
      action: { type: 'success' },
      query: {
        queryKey: ['match_details_full', '12345', 'Europe/Paris'],
        state: { data: { fixture: {}, events: [] } },
      },
    });

    const insertCalls = executedStatements.filter(s =>
      s.sql.includes('INSERT OR REPLACE INTO entities'),
    );
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0].params[0]).toBe('match');
    expect(insertCalls[0].params[1]).toBe('12345');
  });

  it('ignore les événements non-success', () => {
    subscriber({
      type: 'updated',
      action: { type: 'error' },
      query: {
        queryKey: ['teams', 'full', '42', 'Europe/Paris'],
        state: { data: { overview: null } },
      },
    });

    const insertCalls = executedStatements.filter(s =>
      s.sql.includes('INSERT OR REPLACE INTO entities'),
    );
    expect(insertCalls).toHaveLength(0);
  });

  it('ignore les événements non-updated', () => {
    subscriber({
      type: 'added',
      action: { type: 'success' },
      query: {
        queryKey: ['teams', 'full', '42'],
        state: { data: {} },
      },
    });

    const insertCalls = executedStatements.filter(s =>
      s.sql.includes('INSERT OR REPLACE INTO entities'),
    );
    expect(insertCalls).toHaveLength(0);
  });

  it('ignore les queries qui ne matchent aucune règle', () => {
    subscriber({
      type: 'updated',
      action: { type: 'success' },
      query: {
        queryKey: ['follows', 'teamIds'],
        state: { data: [1, 2, 3] },
      },
    });

    const insertCalls = executedStatements.filter(s =>
      s.sql.includes('INSERT OR REPLACE INTO entities'),
    );
    expect(insertCalls).toHaveLength(0);
  });

  it('ignore les data null/undefined', () => {
    subscriber({
      type: 'updated',
      action: { type: 'success' },
      query: {
        queryKey: ['teams', 'full', '42'],
        state: { data: null },
      },
    });

    const insertCalls = executedStatements.filter(s =>
      s.sql.includes('INSERT OR REPLACE INTO entities'),
    );
    expect(insertCalls).toHaveLength(0);
  });
});
