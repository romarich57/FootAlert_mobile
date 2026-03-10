/**
 * Tests unitaires pour le store SQLite local.
 *
 * Utilise un mock de op-sqlite pour fonctionner sans runtime natif.
 * Vérifie la logique CRUD, les transactions batch, le GC et la gestion d'erreurs.
 */

// --- Mock op-sqlite ---

type MockRow = Record<string, unknown>;

const mockRows: MockRow[] = [];
const executedStatements: Array<{ sql: string; params: unknown[] }> = [];

function defaultExecuteSyncImpl(sql: string, params: any[] = []) {
  executedStatements.push({ sql, params });

  // Simule les SELECT
  if (sql.startsWith('SELECT')) {
    return {
      rows: [...mockRows],
      rowsAffected: 0,
    };
  }

  // Simule les DELETE
  if (sql.startsWith('DELETE')) {
    return { rows: [], rowsAffected: mockRows.length };
  }

  // INSERT, CREATE, PRAGMA, etc.
  return { rows: [], rowsAffected: 1 };
}

const mockDb = {
  executeSync: jest.fn(defaultExecuteSyncImpl),
  execute: jest.fn(async (sql: string, params: any[] = []) => defaultExecuteSyncImpl(sql, params)),
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

import { getDatabase, getDatabaseSync } from '../database';
import {
  upsertEntity,
  upsertEntities,
  getEntityById,
  getEntitiesByIds,
  queryEntities,
  deleteEntity,
  countEntities,
  getStoreSizeBytes,
} from '../entityStore';
import { getSyncMeta, setSyncMeta, isSyncStale, setLastSyncTimestamp, getLastSyncTimestamp } from '../syncMetadata';
import { runMigrations } from '../migrationRunner';
import { allMigrations } from '../migrations';

// --- Helpers ---

function resetMocks() {
  mockRows.length = 0;
  executedStatements.length = 0;
  mockDb.executeSync.mockReset();
  mockDb.executeSync.mockImplementation(defaultExecuteSyncImpl);
  mockDb.execute.mockReset();
  mockDb.execute.mockImplementation(async (sql: string, params: any[] = []) =>
    defaultExecuteSyncImpl(sql, params),
  );
}

// --- Tests ---

describe('database', () => {
  beforeEach(resetMocks);

  it('initialise la DB et applique les pragmas', async () => {
    const db = await getDatabase();
    expect(db).toBe(mockDb);

    const pragmaStatements = executedStatements
      .filter(s => s.sql.startsWith('PRAGMA'))
      .map(s => s.sql);

    expect(pragmaStatements).toContain('PRAGMA journal_mode = WAL');
    expect(pragmaStatements).toContain('PRAGMA synchronous = NORMAL');
    expect(pragmaStatements).toContain('PRAGMA foreign_keys = ON');
  });

  it('getDatabaseSync retourne le singleton après init', async () => {
    await getDatabase();
    const db = getDatabaseSync();
    expect(db).toBe(mockDb);
  });
});

describe('migrationRunner', () => {
  beforeEach(resetMocks);

  it('exécute toutes les migrations dans l\'ordre', () => {
    // Simule version 0 (table sync_metadata n'existe pas)
    mockDb.executeSync.mockImplementation((sql: string, params: any[] = []) => {
      executedStatements.push({ sql, params });

      if (sql.includes('SELECT value FROM sync_metadata')) {
        throw new Error('no such table');
      }

      return { rows: [], rowsAffected: 1 };
    });

    runMigrations(mockDb as any, allMigrations);

    const createStatements = executedStatements.filter(s =>
      s.sql.startsWith('CREATE TABLE') || s.sql.startsWith('CREATE INDEX'),
    );

    // Vérifie que les tables principales sont créées
    expect(createStatements.some(s => s.sql.includes('entities'))).toBe(true);
    expect(createStatements.some(s => s.sql.includes('sync_metadata'))).toBe(true);
    expect(createStatements.some(s => s.sql.includes('matches_by_date'))).toBe(true);
  });

  it('skip les migrations déjà appliquées', () => {
    // Simule version = 1 (migration 001 déjà appliquée, migration 002 encore à jouer)
    mockDb.executeSync.mockImplementation((sql: string, params: any[] = []) => {
      executedStatements.push({ sql, params });

      if (sql.includes('SELECT value FROM sync_metadata')) {
        return {
          rows: [{ value: '1' }],
          rowsAffected: 0,
        };
      }

      return { rows: [], rowsAffected: 1 };
    });

    runMigrations(mockDb as any, allMigrations);

    const createStatements = executedStatements.filter(s =>
      s.sql.startsWith('CREATE TABLE'),
    );

    expect(
      createStatements.some(s => s.sql.includes('CREATE TABLE IF NOT EXISTS entities')),
    ).toBe(false);
    expect(
      createStatements.some(s => s.sql.includes('CREATE TABLE IF NOT EXISTS sync_metadata')),
    ).toBe(false);
    expect(
      createStatements.some(s => s.sql.includes('CREATE TABLE IF NOT EXISTS followed_entities')),
    ).toBe(true);
    expect(
      createStatements.some(s => s.sql.includes('CREATE TABLE IF NOT EXISTS normalized_standings')),
    ).toBe(true);
  });
});

describe('entityStore', () => {
  beforeEach(async () => {
    resetMocks();
    await getDatabase();
    resetMocks();
  });

  it('upsertEntity exécute un INSERT OR REPLACE', () => {
    upsertEntity({
      entityType: 'team',
      entityId: '42',
      data: { name: 'PSG', logo: 'psg.png' },
      etag: '"abc123"',
    });

    const insertCall = executedStatements.find(s =>
      s.sql.includes('INSERT OR REPLACE INTO entities'),
    );
    expect(insertCall).toBeDefined();
    expect(insertCall!.params[0]).toBe('team');
    expect(insertCall!.params[1]).toBe('42');
    expect(JSON.parse(insertCall!.params[2] as string)).toEqual({
      name: 'PSG',
      logo: 'psg.png',
    });
    expect(insertCall!.params[4]).toBe('"abc123"');
  });

  it('upsertEntities wraps en transaction', () => {
    upsertEntities('player', [
      { id: '1', data: { name: 'Mbappé' } },
      { id: '2', data: { name: 'Messi' } },
    ]);

    expect(executedStatements[0].sql).toBe('BEGIN TRANSACTION');
    const inserts = executedStatements.filter(s =>
      s.sql.includes('INSERT OR REPLACE'),
    );
    expect(inserts).toHaveLength(2);
    expect(executedStatements[executedStatements.length - 1].sql).toBe('COMMIT');
  });

  it('getEntityById retourne null si non trouvé', () => {
    const result = getEntityById('team', '999');
    expect(result).toBeNull();
  });

  it('getEntityById parse le JSON correctement', () => {
    const teamData = { name: 'OM', logo: 'om.png', id: 13 };
    mockRows.push({
      data: JSON.stringify(teamData),
      updated_at: 1700000000000,
      etag: '"xyz"',
    });

    const result = getEntityById<typeof teamData>('team', '13');
    expect(result).not.toBeNull();
    expect(result!.data).toEqual(teamData);
    expect(result!.updatedAt).toBe(1700000000000);
    expect(result!.etag).toBe('"xyz"');
  });

  it('getEntitiesByIds retourne un Map avec les résultats', () => {
    mockRows.push(
      { entity_id: '1', data: '{"name":"PSG"}', updated_at: 1000, etag: null },
      { entity_id: '2', data: '{"name":"OM"}', updated_at: 2000, etag: '"e1"' },
    );

    const result = getEntitiesByIds<{ name: string }>('team', ['1', '2', '3']);
    expect(result.size).toBe(2);
    expect(result.get('1')?.data.name).toBe('PSG');
    expect(result.get('2')?.data.name).toBe('OM');
    expect(result.has('3')).toBe(false);
  });

  it('queryEntities avec limite et ordre', () => {
    mockRows.push(
      { data: '{"name":"PSG"}' },
      { data: '{"name":"OM"}' },
    );

    const result = queryEntities<{ name: string }>({
      entityType: 'team',
      limit: 10,
      orderByUpdatedAt: 'desc',
    });

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('PSG');

    const selectCall = executedStatements.find(s =>
      s.sql.includes('SELECT entity_id, data, updated_at, etag FROM entities'),
    );
    expect(selectCall!.sql).toContain('ORDER BY updated_at DESC');
    expect(selectCall!.sql).toContain('LIMIT ?');
    expect(selectCall!.params).toContain(10);
  });

  it('deleteEntity exécute un DELETE ciblé', () => {
    deleteEntity('team', '42');

    const deleteCall = executedStatements.find(s =>
      s.sql.includes('DELETE FROM entities'),
    );
    expect(deleteCall).toBeDefined();
    expect(deleteCall!.params).toEqual(['team', '42']);
  });

  it('countEntities retourne le count', () => {
    mockRows.push({ cnt: 42 });

    const count = countEntities('team');
    expect(count).toBe(42);
  });

  it('getStoreSizeBytes retourne la taille', () => {
    mockRows.push({ size: 1024000 });

    const size = getStoreSizeBytes();
    expect(size).toBe(1024000);
  });
});

describe('syncMetadata', () => {
  beforeEach(async () => {
    resetMocks();
    await getDatabase();
    resetMocks();
  });

  it('getSyncMeta retourne null si clé absente', () => {
    const result = getSyncMeta('nonexistent');
    expect(result).toBeNull();
  });

  it('getSyncMeta retourne la valeur', () => {
    mockRows.push({ value: '1700000000000' });
    const result = getSyncMeta('last_sync:teams');
    expect(result).toBe('1700000000000');
  });

  it('setSyncMeta exécute un INSERT OR REPLACE', () => {
    setSyncMeta('last_sync:teams', '1700000000000');

    const insertCall = executedStatements.find(s =>
      s.sql.includes('INSERT OR REPLACE INTO sync_metadata'),
    );
    expect(insertCall).toBeDefined();
    expect(insertCall!.params[0]).toBe('last_sync:teams');
    expect(insertCall!.params[1]).toBe('1700000000000');
  });

  it('isSyncStale retourne true si pas de dernière sync', () => {
    const stale = isSyncStale('teams', 60_000);
    expect(stale).toBe(true);
  });

  it('isSyncStale retourne false si sync récente', () => {
    mockRows.push({ value: String(Date.now()) });
    const stale = isSyncStale('teams', 60_000);
    expect(stale).toBe(false);
  });

  it('setLastSyncTimestamp + getLastSyncTimestamp round-trip', () => {
    // Set
    setLastSyncTimestamp('teams', '42');
    const setCall = executedStatements.find(s =>
      s.sql.includes('INSERT OR REPLACE'),
    );
    expect(setCall!.params[0]).toBe('last_sync:teams:42');

    // Get (simulate the value being stored)
    resetMocks();
    mockDb.executeSync.mockImplementation(defaultExecuteSyncImpl);
    mockRows.push({ value: String(Date.now()) });
    const ts = getLastSyncTimestamp('teams', '42');
    expect(ts).not.toBeNull();
    expect(typeof ts).toBe('number');
  });
});

describe('performance', () => {
  beforeEach(async () => {
    resetMocks();
    await getDatabase();
    resetMocks();
  });

  it('batch upsert de 100 entités utilise une seule transaction', () => {
    const entities = Array.from({ length: 100 }, (_, i) => ({
      id: String(i),
      data: { name: `Team ${i}`, logo: `team_${i}.png` },
    }));

    upsertEntities('team', entities);

    const beginCount = executedStatements.filter(s => s.sql === 'BEGIN TRANSACTION').length;
    const commitCount = executedStatements.filter(s => s.sql === 'COMMIT').length;
    const insertCount = executedStatements.filter(s =>
      s.sql.includes('INSERT OR REPLACE'),
    ).length;

    expect(beginCount).toBe(1);
    expect(commitCount).toBe(1);
    expect(insertCount).toBe(100);
  });

  it('upsertEntities fait rollback en cas d\'erreur', () => {
    let callCount = 0;
    mockDb.executeSync.mockImplementation((sql: string, params: any[] = []) => {
      executedStatements.push({ sql, params });
      callCount++;

      // Échoue au 5ème INSERT
      if (sql.includes('INSERT OR REPLACE') && callCount > 5) {
        throw new Error('disk full');
      }

      return { rows: [], rowsAffected: 1 };
    });

    const entities = Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      data: { name: `Team ${i}` },
    }));

    expect(() => upsertEntities('team', entities)).toThrow('disk full');

    const rollbackCount = executedStatements.filter(s => s.sql === 'ROLLBACK').length;
    expect(rollbackCount).toBe(1);
  });
});
