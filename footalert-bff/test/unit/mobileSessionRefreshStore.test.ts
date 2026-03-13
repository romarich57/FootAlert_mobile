import assert from 'node:assert/strict';
import test from 'node:test';

import { createPostgresMobileSessionRefreshStoreForTests } from '../../src/lib/mobileSessionRefreshStore.ts';

type StoredRefreshRow = {
  id: string;
  familyId: string;
  subject: string;
  platform: 'android' | 'ios';
  integrity: 'strong' | 'device' | 'basic' | 'unknown';
  scope: string[];
  tokenHash: string;
  expiresAtMs: number;
  rotatedAtMs: number | null;
  revokedAtMs: number | null;
  replacedBy: string | null;
};

class FakeMobileRefreshPool {
  private readonly rowsById = new Map<string, StoredRefreshRow>();

  private readonly rowIdsByTokenHash = new Map<string, string>();

  async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
    const normalized = text.replace(/\s+/g, ' ').trim();

    if (normalized === 'BEGIN' || normalized === 'COMMIT' || normalized === 'ROLLBACK') {
      return { rows: [] };
    }

    if (normalized.startsWith('INSERT INTO mobile_refresh_sessions')) {
      const [id, familyId, subject, platform, integrity, scopeJson, tokenHash, , expiresAtMs] = values as [
        string,
        string,
        string,
        'android' | 'ios',
        'strong' | 'device' | 'basic' | 'unknown',
        string,
        string,
        number,
        number,
      ];

      const row: StoredRefreshRow = {
        id,
        familyId,
        subject,
        platform,
        integrity,
        scope: JSON.parse(scopeJson) as string[],
        tokenHash,
        expiresAtMs,
        rotatedAtMs: null,
        revokedAtMs: null,
        replacedBy: null,
      };
      this.rowsById.set(id, row);
      this.rowIdsByTokenHash.set(tokenHash, id);
      return { rows: [] };
    }

    if (normalized.includes('FROM mobile_refresh_sessions WHERE token_hash = $1 FOR UPDATE')) {
      const [tokenHash] = values as [string];
      const rowId = this.rowIdsByTokenHash.get(tokenHash);
      if (!rowId) {
        return { rows: [] };
      }

      const row = this.rowsById.get(rowId);
      if (!row) {
        return { rows: [] };
      }

      return {
        rows: [
          {
            id: row.id,
            familyId: row.familyId,
            subject: row.subject,
            platform: row.platform,
            integrity: row.integrity,
            scope: row.scope,
            tokenHash: row.tokenHash,
            expiresAt: new Date(row.expiresAtMs),
            rotatedAt: row.rotatedAtMs === null ? null : new Date(row.rotatedAtMs),
            revokedAt: row.revokedAtMs === null ? null : new Date(row.revokedAtMs),
          } as T,
        ],
      };
    }

    if (normalized.startsWith('UPDATE mobile_refresh_sessions SET rotated_at = to_timestamp')) {
      const [id, rotatedAtMs, replacedBy] = values as [string, number, string];
      if (!this.rowsById.has(replacedBy)) {
        throw new Error(`FK violation: replacement row ${replacedBy} is missing`);
      }

      const row = this.rowsById.get(id);
      if (row) {
        row.rotatedAtMs = rotatedAtMs;
        row.replacedBy = replacedBy;
      }
      return { rows: [] };
    }

    if (normalized.startsWith('UPDATE mobile_refresh_sessions SET revoked_at = COALESCE')) {
      const [familyId, revokedAtMs] = values as [string, number];
      for (const row of this.rowsById.values()) {
        if (row.familyId === familyId && row.revokedAtMs === null) {
          row.revokedAtMs = revokedAtMs;
        }
      }
      return { rows: [] };
    }

    throw new Error(`Unsupported fake query: ${normalized}`);
  }

  async connect(): Promise<{
    query: <T = unknown>(text: string, values?: unknown[]) => Promise<{ rows: T[] }>;
    release: () => void;
  }> {
    return {
      query: (text, values) => this.query(text, values),
      release: () => {},
    };
  }

  async end(): Promise<void> {}

  listRows(): StoredRefreshRow[] {
    return [...this.rowsById.values()].map(row => ({ ...row, scope: [...row.scope] }));
  }
}

test('postgres refresh rotation inserts successor before linking replacement FK', async () => {
  const pool = new FakeMobileRefreshPool();
  const store = createPostgresMobileSessionRefreshStoreForTests(pool);

  const issued = await store.issue({
    subject: 'device-hash-abc',
    platform: 'android',
    integrity: 'strong',
    scope: ['api:read', 'notifications:write'],
    ttlMs: 60_000,
    nowMs: 1_000,
  });

  const [initialRow] = pool.listRows();
  assert.ok(initialRow);
  assert.equal(initialRow.replacedBy, null);

  const rotated = await store.rotate({
    refreshToken: issued.refreshToken,
    ttlMs: 60_000,
    nowMs: 2_000,
  });

  assert.equal(rotated.ok, true);

  const rows = pool.listRows();
  assert.equal(rows.length, 2);

  const originalRow = rows.find(row => row.id === initialRow.id);
  assert.ok(originalRow);
  assert.equal(originalRow.rotatedAtMs, 2_000);
  assert.ok(originalRow.replacedBy);

  const replacementRow = rows.find(row => row.id === originalRow.replacedBy);
  assert.ok(replacementRow);
  assert.equal(replacementRow?.familyId, originalRow.familyId);
  assert.equal(replacementRow?.rotatedAtMs, null);
});
