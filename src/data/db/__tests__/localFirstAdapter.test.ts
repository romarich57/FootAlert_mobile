/**
 * Tests unitaires pour le local-first adapter.
 */

// --- Mock op-sqlite ---

type MockRow = Record<string, unknown>;
const mockRows: MockRow[] = [];
const executedStatements: Array<{ sql: string; params: unknown[] }> = [];

function defaultExecuteSyncImpl(sql: string, params: unknown[] = []) {
  executedStatements.push({ sql, params });
  if (sql.startsWith('SELECT')) {
    return { rows: [...mockRows], rowsAffected: 0 };
  }
  if (sql.startsWith('DELETE')) {
    return { rows: [], rowsAffected: mockRows.length };
  }
  return { rows: [], rowsAffected: 1 };
}

const mockDb = {
  executeSync: jest.fn(defaultExecuteSyncImpl),
  execute: jest.fn(async (sql: string, params: unknown[] = []) => defaultExecuteSyncImpl(sql, params)),
  close: jest.fn(),
};
const mockTelemetry = {
  trackEvent: jest.fn(),
  trackError: jest.fn(),
  addBreadcrumb: jest.fn(),
  setUserContext: jest.fn(),
  trackBatch: jest.fn(),
  flush: jest.fn(),
};

jest.mock('@op-engineering/op-sqlite', () => ({
  open: jest.fn(() => mockDb),
}));

jest.mock('@data/telemetry/mobileTelemetry', () => ({
  getMobileTelemetry: () => mockTelemetry,
}));

let mockIsOnline = true;
jest.mock('@tanstack/react-query', () => ({
  onlineManager: {
    isOnline: () => mockIsOnline,
  },
}));

// --- Import après mocks ---

import { getDatabase } from '../database';
import {
  createLocalFirstQueryFn,
  writeToLocalStore,
  readFromLocalStore,
  LocalFirstOfflineError,
} from '../localFirstAdapter';

// --- Helpers ---

function resetMocks() {
  mockRows.length = 0;
  executedStatements.length = 0;
  mockDb.executeSync.mockReset();
  mockDb.executeSync.mockImplementation(defaultExecuteSyncImpl);
  mockDb.execute.mockReset();
  mockDb.execute.mockImplementation(async (sql: string, params: unknown[] = []) =>
    defaultExecuteSyncImpl(sql, params),
  );
  jest.clearAllMocks();
  mockIsOnline = true;
}

// --- Tests ---

describe('createLocalFirstQueryFn', () => {
  beforeEach(async () => {
    resetMocks();
    await getDatabase();
    resetMocks();
  });

  it('retourne les données réseau quand pas de cache local', async () => {
    const networkData = { name: 'PSG', id: 42 };
    const fetchFn = jest.fn().mockResolvedValue(networkData);

    const queryFn = createLocalFirstQueryFn({
      entityType: 'team',
      entityId: '42',
      maxAgeMs: 60_000,
      fetchFn,
    });

    const result = await queryFn({ signal: new AbortController().signal });

    expect(result).toEqual(networkData);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    // Vérifie que les données ont été écrites en DB
    const insertCalls = executedStatements.filter(s =>
      s.sql.includes('INSERT OR REPLACE INTO entities'),
    );
    expect(insertCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('retourne le cache SQLite quand il est frais', async () => {
    const cachedData = { name: 'OM', id: 13 };
    const fetchFn = jest.fn().mockResolvedValue({ name: 'OM fresh' });

    // Simule un cache frais : getEntityById retourne des données,
    // getLastSyncTimestamp retourne un timestamp récent
    mockDb.executeSync.mockImplementation((sql: string, params: unknown[] = []) => {
      executedStatements.push({ sql, params });

      // SELECT pour getEntityById
      if (sql.includes('SELECT data, updated_at, etag FROM entities')) {
        return {
          rows: [{
            data: JSON.stringify(cachedData),
            updated_at: Date.now(),
            etag: null,
          }],
          rowsAffected: 0,
        };
      }

      // SELECT pour getLastSyncTimestamp (via getSyncMeta)
      if (sql.includes('SELECT value FROM sync_metadata')) {
        return {
          rows: [{ value: String(Date.now()) }],
          rowsAffected: 0,
        };
      }

      return { rows: [], rowsAffected: 1 };
    });

    const queryFn = createLocalFirstQueryFn({
      entityType: 'team',
      entityId: '13',
      maxAgeMs: 60_000,
      fetchFn,
    });

    const result = await queryFn({ signal: new AbortController().signal });

    expect(result).toEqual(cachedData);
    // Le réseau ne doit PAS être appelé quand le cache est frais
    expect(fetchFn).not.toHaveBeenCalled();
    expect(mockTelemetry.trackEvent).toHaveBeenCalledWith(
      'db.local_first.read',
      expect.objectContaining({
        entityType: 'team',
        entityId: '13',
        outcome: 'fresh_hit',
      }),
    );
  });

  it('retourne le cache stale quand offline', async () => {
    mockIsOnline = false;
    const cachedData = { name: 'Lyon', id: 7 };
    const fetchFn = jest.fn();

    mockDb.executeSync.mockImplementation((sql: string, params: unknown[] = []) => {
      executedStatements.push({ sql, params });

      if (sql.includes('SELECT data, updated_at, etag FROM entities')) {
        return {
          rows: [{
            data: JSON.stringify(cachedData),
            updated_at: Date.now() - 999_999_999, // très ancien
            etag: null,
          }],
          rowsAffected: 0,
        };
      }

      if (sql.includes('SELECT value FROM sync_metadata')) {
        return { rows: [], rowsAffected: 0 };
      }

      return { rows: [], rowsAffected: 1 };
    });

    const queryFn = createLocalFirstQueryFn({
      entityType: 'team',
      entityId: '7',
      maxAgeMs: 60_000,
      fetchFn,
    });

    const result = await queryFn({ signal: new AbortController().signal });

    expect(result).toEqual(cachedData);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('lance LocalFirstOfflineError quand offline sans cache', async () => {
    mockIsOnline = false;

    const queryFn = createLocalFirstQueryFn({
      entityType: 'team',
      entityId: '999',
      maxAgeMs: 60_000,
      fetchFn: jest.fn(),
    });

    await expect(queryFn({ signal: new AbortController().signal }))
      .rejects.toThrow(LocalFirstOfflineError);
  });

  it('fallback sur cache stale quand le réseau échoue', async () => {
    const cachedData = { name: 'Marseille', id: 5 };
    const fetchFn = jest.fn().mockRejectedValue(new Error('Network timeout'));

    mockDb.executeSync.mockImplementation((sql: string, params: unknown[] = []) => {
      executedStatements.push({ sql, params });

      if (sql.includes('SELECT data, updated_at, etag FROM entities')) {
        return {
          rows: [{
            data: JSON.stringify(cachedData),
            updated_at: Date.now() - 120_000, // 2 minutes ago (stale)
            etag: null,
          }],
          rowsAffected: 0,
        };
      }

      if (sql.includes('SELECT value FROM sync_metadata')) {
        // Simule un sync ancien (stale)
        return {
          rows: [{ value: String(Date.now() - 120_000) }],
          rowsAffected: 0,
        };
      }

      return { rows: [], rowsAffected: 1 };
    });

    const queryFn = createLocalFirstQueryFn({
      entityType: 'team',
      entityId: '5',
      maxAgeMs: 60_000,
      fetchFn,
    });

    const result = await queryFn({ signal: new AbortController().signal });

    expect(result).toEqual(cachedData);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(mockTelemetry.trackEvent).toHaveBeenCalledWith(
      'db.local_first.read',
      expect.objectContaining({
        entityType: 'team',
        entityId: '5',
        outcome: 'stale_fallback',
      }),
    );
  });

  it('propage l\'erreur réseau quand pas de cache fallback', async () => {
    const fetchFn = jest.fn().mockRejectedValue(new Error('500 Server Error'));

    const queryFn = createLocalFirstQueryFn({
      entityType: 'team',
      entityId: '404',
      maxAgeMs: 60_000,
      fetchFn,
    });

    await expect(queryFn({ signal: new AbortController().signal }))
      .rejects.toThrow('500 Server Error');
  });
});

describe('writeToLocalStore / readFromLocalStore', () => {
  beforeEach(async () => {
    resetMocks();
    await getDatabase();
    resetMocks();
  });

  it('writeToLocalStore écrit en DB', () => {
    writeToLocalStore('team', '42', { name: 'PSG' });

    const insertCalls = executedStatements.filter(s =>
      s.sql.includes('INSERT OR REPLACE INTO entities'),
    );
    expect(insertCalls).toHaveLength(1);
  });

  it('readFromLocalStore retourne null si pas en DB', () => {
    const result = readFromLocalStore('team', '999');
    expect(result).toBeNull();
  });

  it('readFromLocalStore retourne les données', () => {
    const data = { name: 'PSG' };
    mockRows.push({
      data: JSON.stringify(data),
      updated_at: Date.now(),
      etag: null,
    });

    const result = readFromLocalStore<typeof data>('team', '42');
    expect(result).toEqual(data);
  });
});
