type MockRow = Record<string, unknown>;

const mockRows: MockRow[] = [];
const executedStatements: Array<{ sql: string; params: unknown[] }> = [];

function defaultExecuteSyncImpl(sql: string, params: unknown[] = []) {
  executedStatements.push({ sql, params });

  if (sql.startsWith('SELECT')) {
    return {
      rows: [...mockRows],
      rowsAffected: 0,
    };
  }

  if (sql.startsWith('DELETE')) {
    return {
      rows: [],
      rowsAffected: 1,
    };
  }

  return {
    rows: [],
    rowsAffected: 1,
  };
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

import { getDatabase } from '../database';
import { replaceFollowedEntities, listFollowedEntityIds, isEntityFollowed } from '../followedEntitiesStore';
import { upsertNormalizedStandings, getNormalizedStandings } from '../standingsStore';
import { runMigrations } from '../migrationRunner';
import { allMigrations } from '../migrations';

function resetMocks() {
  mockRows.length = 0;
  executedStatements.length = 0;
  mockDb.executeSync.mockReset();
  mockDb.executeSync.mockImplementation(defaultExecuteSyncImpl);
  mockDb.execute.mockReset();
  mockDb.execute.mockImplementation(async (sql: string, params: unknown[] = []) =>
    defaultExecuteSyncImpl(sql, params),
  );
}

describe('relational cache migration', () => {
  beforeEach(async () => {
    resetMocks();
    await getDatabase();
    resetMocks();
  });

  it('applies migration 002 when version 001 is already installed', () => {
    mockDb.executeSync.mockImplementation((sql: string, params: unknown[] = []) => {
      executedStatements.push({ sql, params });

      if (sql.includes('SELECT value FROM sync_metadata')) {
        return {
          rows: [{ value: '1' }],
          rowsAffected: 0,
        };
      }

      return {
        rows: [],
        rowsAffected: 1,
      };
    });

    runMigrations(mockDb as any, allMigrations);

    expect(
      executedStatements.some(statement =>
        statement.sql.includes('CREATE TABLE IF NOT EXISTS followed_entities')),
    ).toBe(true);
    expect(
      executedStatements.some(statement =>
        statement.sql.includes('CREATE TABLE IF NOT EXISTS normalized_standings')),
    ).toBe(true);
    expect(
      executedStatements.some(statement =>
        statement.sql.includes('ALTER TABLE matches_by_date ADD COLUMN home_team_id TEXT')),
    ).toBe(true);
    expect(
      executedStatements.some(statement =>
        statement.sql.includes('CREATE TABLE IF NOT EXISTS bootstrap_snapshots')),
    ).toBe(true);
  });
});

describe('followedEntitiesStore', () => {
  beforeEach(async () => {
    resetMocks();
    await getDatabase();
    resetMocks();
  });

  it('replaces followed IDs transactionally and keeps the provided order', () => {
    replaceFollowedEntities('team', ['33', '44']);

    expect(executedStatements[0]?.sql).toBe('BEGIN TRANSACTION');
    expect(
      executedStatements.some(statement =>
        statement.sql.includes('DELETE FROM followed_entities WHERE entity_type = ?')),
    ).toBe(true);

    const insertStatements = executedStatements.filter(statement =>
      statement.sql.includes('INSERT OR REPLACE INTO followed_entities'));
    expect(insertStatements).toHaveLength(2);
    expect(insertStatements[0]?.params.slice(0, 3)).toEqual(['team', '33', 0]);
    expect(insertStatements[1]?.params.slice(0, 3)).toEqual(['team', '44', 1]);
    expect(executedStatements[executedStatements.length - 1]?.sql).toBe('COMMIT');
  });

  it('lists followed IDs from SQLite in query order', () => {
    mockRows.push(
      { entity_id: '44' },
      { entity_id: '33' },
      { entity_id: 99 },
    );

    expect(listFollowedEntityIds('team')).toEqual(['44', '33']);
  });

  it('checks whether an entity is followed', () => {
    mockRows.push({ 1: 1 });

    expect(isEntityFollowed('player', '7')).toBe(true);

    mockRows.length = 0;

    expect(isEntityFollowed('player', '7')).toBe(false);
  });
});

describe('standingsStore', () => {
  beforeEach(async () => {
    resetMocks();
    await getDatabase();
    resetMocks();
  });

  it('stores normalized standings rows in a single transaction', () => {
    upsertNormalizedStandings('61', 2024, [
      {
        groupName: 'Ligue 1',
        rows: [
          {
            rank: 1,
            teamId: 33,
            teamName: 'PSG',
            teamLogo: 'psg.png',
            points: 65,
            goalsDiff: 40,
            played: 25,
            win: 20,
            draw: 5,
            lose: 0,
            goalsFor: 70,
            goalsAgainst: 30,
            group: 'Ligue 1',
            form: 'WWWWW',
            description: null,
            home: {
              played: 12,
              win: 10,
              draw: 2,
              lose: 0,
              goalsFor: 35,
              goalsAgainst: 10,
            },
            away: {
              played: 13,
              win: 10,
              draw: 3,
              lose: 0,
              goalsFor: 35,
              goalsAgainst: 20,
            },
          },
        ],
      },
    ]);

    expect(executedStatements[0]?.sql).toBe('BEGIN TRANSACTION');
    expect(
      executedStatements.some(statement =>
        statement.sql.includes('DELETE FROM normalized_standings')),
    ).toBe(true);
    expect(
      executedStatements.some(statement =>
        statement.sql.includes('INSERT OR REPLACE INTO normalized_standings')),
    ).toBe(true);
    expect(executedStatements[executedStatements.length - 1]?.sql).toBe('COMMIT');
  });

  it('rebuilds standings groups from normalized rows', () => {
    mockRows.push(
      {
        competition_id: '61',
        season: 2024,
        group_name: 'Ligue 1',
        team_id: '33',
        rank: 1,
        team_name: 'PSG',
        team_logo: 'psg.png',
        points: 65,
        goals_diff: 40,
        played: 25,
        win: 20,
        draw: 5,
        lose: 0,
        goals_for: 70,
        goals_against: 30,
        form: 'WWWWW',
        description: 'UCL',
        home_stats: JSON.stringify({
          played: 12,
          win: 10,
          draw: 2,
          lose: 0,
          goalsFor: 35,
          goalsAgainst: 10,
        }),
        away_stats: JSON.stringify({
          played: 13,
          win: 10,
          draw: 3,
          lose: 0,
          goalsFor: 35,
          goalsAgainst: 20,
        }),
      },
      {
        competition_id: '61',
        season: 2024,
        group_name: 'Ligue 1',
        team_id: '44',
        rank: 2,
        team_name: 'OM',
        team_logo: 'om.png',
        points: 55,
        goals_diff: 20,
        played: 25,
        win: 17,
        draw: 4,
        lose: 4,
        goals_for: 50,
        goals_against: 30,
        form: 'WWWDL',
        description: 'UEL',
        home_stats: '{}',
        away_stats: '{}',
      },
    );

    expect(getNormalizedStandings('61', 2024)).toEqual([
      {
        groupName: 'Ligue 1',
        rows: [
          expect.objectContaining({
            rank: 1,
            teamId: 33,
            teamName: 'PSG',
            form: 'WWWWW',
          }),
          expect.objectContaining({
            rank: 2,
            teamId: 44,
            teamName: 'OM',
            form: 'WWWDL',
          }),
        ],
      },
    ]);
  });
});
