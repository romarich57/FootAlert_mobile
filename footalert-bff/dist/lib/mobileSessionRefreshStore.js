import { createHash, randomBytes, randomUUID } from 'node:crypto';
function nowMsOrDefault(nowMs) {
    return nowMs ?? Date.now();
}
function hashRefreshToken(token) {
    return createHash('sha256').update(token).digest('hex');
}
function buildOpaqueRefreshToken() {
    return randomBytes(32).toString('base64url');
}
class InMemoryMobileSessionRefreshStore {
    recordsByHash = new Map();
    recordsByFamily = new Map();
    async issue(input) {
        const issuedAtMs = nowMsOrDefault(input.nowMs);
        const refreshToken = buildOpaqueRefreshToken();
        const tokenHash = hashRefreshToken(refreshToken);
        const familyId = randomUUID();
        const record = {
            id: randomUUID(),
            familyId,
            tokenHash,
            subject: input.subject,
            platform: input.platform,
            integrity: input.integrity,
            scope: [...input.scope],
            expiresAtMs: issuedAtMs + input.ttlMs,
            rotatedAtMs: null,
            revokedAtMs: null,
        };
        this.recordsByHash.set(tokenHash, record);
        this.recordsByFamily.set(familyId, new Set([tokenHash]));
        return {
            refreshToken,
            refreshExpiresAtMs: record.expiresAtMs,
            familyId,
        };
    }
    async rotate(input) {
        const nowMs = nowMsOrDefault(input.nowMs);
        const tokenHash = hashRefreshToken(input.refreshToken);
        const current = this.recordsByHash.get(tokenHash);
        if (!current) {
            return { ok: false, code: 'INVALID' };
        }
        if (current.revokedAtMs) {
            return { ok: false, code: 'REVOKED' };
        }
        if (current.expiresAtMs <= nowMs) {
            await this.revokeFamilyById(current.familyId, nowMs);
            return { ok: false, code: 'EXPIRED' };
        }
        if (current.rotatedAtMs) {
            await this.revokeFamilyById(current.familyId, nowMs);
            return { ok: false, code: 'REPLAYED' };
        }
        const nextToken = buildOpaqueRefreshToken();
        const nextHash = hashRefreshToken(nextToken);
        const nextRecord = {
            ...current,
            id: randomUUID(),
            tokenHash: nextHash,
            expiresAtMs: nowMs + input.ttlMs,
            rotatedAtMs: null,
            revokedAtMs: null,
        };
        current.rotatedAtMs = nowMs;
        this.recordsByHash.set(tokenHash, current);
        this.recordsByHash.set(nextHash, nextRecord);
        const familySet = this.recordsByFamily.get(current.familyId) ?? new Set();
        familySet.add(nextHash);
        this.recordsByFamily.set(current.familyId, familySet);
        return {
            ok: true,
            refreshToken: nextToken,
            refreshExpiresAtMs: nextRecord.expiresAtMs,
            subject: nextRecord.subject,
            platform: nextRecord.platform,
            integrity: nextRecord.integrity,
            scope: nextRecord.scope,
        };
    }
    async revokeFamilyByToken(input) {
        const tokenHash = hashRefreshToken(input.refreshToken);
        const record = this.recordsByHash.get(tokenHash);
        if (!record) {
            return;
        }
        await this.revokeFamilyById(record.familyId, nowMsOrDefault(input.nowMs));
    }
    async purgeBySubject(input) {
        const hashesToDelete = [...this.recordsByHash.entries()]
            .filter(([, record]) => record.subject === input.subject)
            .map(([hash]) => hash);
        for (const hash of hashesToDelete) {
            const record = this.recordsByHash.get(hash);
            if (!record) {
                continue;
            }
            this.recordsByHash.delete(hash);
            const familyRecords = this.recordsByFamily.get(record.familyId);
            if (!familyRecords) {
                continue;
            }
            familyRecords.delete(hash);
            if (familyRecords.size === 0) {
                this.recordsByFamily.delete(record.familyId);
            }
            else {
                this.recordsByFamily.set(record.familyId, familyRecords);
            }
        }
    }
    async revokeFamilyById(familyId, nowMs) {
        const familyRecords = this.recordsByFamily.get(familyId);
        if (!familyRecords) {
            return;
        }
        for (const hash of familyRecords) {
            const record = this.recordsByHash.get(hash);
            if (!record) {
                continue;
            }
            record.revokedAtMs = nowMs;
            this.recordsByHash.set(hash, record);
        }
    }
    async close() {
        this.recordsByHash.clear();
        this.recordsByFamily.clear();
    }
}
class PostgresMobileSessionRefreshStore {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async issue(input) {
        const issuedAtMs = nowMsOrDefault(input.nowMs);
        const refreshToken = buildOpaqueRefreshToken();
        const tokenHash = hashRefreshToken(refreshToken);
        const familyId = randomUUID();
        const expiresAtMs = issuedAtMs + input.ttlMs;
        const id = randomUUID();
        await this.pool.query(`
      INSERT INTO mobile_refresh_sessions (
        id, family_id, auth_subject, platform, integrity, scope,
        token_hash, created_at, expires_at, rotated_at, revoked_at, replaced_by
      ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, to_timestamp($8 / 1000.0), to_timestamp($9 / 1000.0), NULL, NULL, NULL)
      `, [
            id,
            familyId,
            input.subject,
            input.platform,
            input.integrity,
            JSON.stringify(input.scope),
            tokenHash,
            issuedAtMs,
            expiresAtMs,
        ]);
        return {
            refreshToken,
            refreshExpiresAtMs: expiresAtMs,
            familyId,
        };
    }
    async rotate(input) {
        const nowMs = nowMsOrDefault(input.nowMs);
        const tokenHash = hashRefreshToken(input.refreshToken);
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const current = await this.loadForUpdateByTokenHash(client, tokenHash);
            if (!current) {
                await client.query('ROLLBACK');
                return { ok: false, code: 'INVALID' };
            }
            if (current.revokedAtMs) {
                await client.query('ROLLBACK');
                return { ok: false, code: 'REVOKED' };
            }
            if (current.expiresAtMs <= nowMs) {
                await this.revokeFamilyById(client, current.familyId, nowMs);
                await client.query('COMMIT');
                return { ok: false, code: 'EXPIRED' };
            }
            if (current.rotatedAtMs) {
                await this.revokeFamilyById(client, current.familyId, nowMs);
                await client.query('COMMIT');
                return { ok: false, code: 'REPLAYED' };
            }
            const nextId = randomUUID();
            const nextToken = buildOpaqueRefreshToken();
            const nextHash = hashRefreshToken(nextToken);
            const nextExpiresAtMs = nowMs + input.ttlMs;
            await client.query(`
        UPDATE mobile_refresh_sessions
        SET rotated_at = to_timestamp($2 / 1000.0), replaced_by = $3
        WHERE id = $1
        `, [current.id, nowMs, nextId]);
            await client.query(`
        INSERT INTO mobile_refresh_sessions (
          id, family_id, auth_subject, platform, integrity, scope,
          token_hash, created_at, expires_at, rotated_at, revoked_at, replaced_by
        ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, to_timestamp($8 / 1000.0), to_timestamp($9 / 1000.0), NULL, NULL, NULL)
        `, [
                nextId,
                current.familyId,
                current.subject,
                current.platform,
                current.integrity,
                JSON.stringify(current.scope),
                nextHash,
                nowMs,
                nextExpiresAtMs,
            ]);
            await client.query('COMMIT');
            return {
                ok: true,
                refreshToken: nextToken,
                refreshExpiresAtMs: nextExpiresAtMs,
                subject: current.subject,
                platform: current.platform,
                integrity: current.integrity,
                scope: current.scope,
            };
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    async revokeFamilyByToken(input) {
        const tokenHash = hashRefreshToken(input.refreshToken);
        const client = await this.pool.connect();
        try {
            const current = await this.loadForUpdateByTokenHash(client, tokenHash);
            if (!current) {
                return;
            }
            await this.revokeFamilyById(client, current.familyId, nowMsOrDefault(input.nowMs));
        }
        finally {
            client.release();
        }
    }
    async purgeBySubject(input) {
        await this.pool.query(`
      DELETE FROM mobile_refresh_sessions
      WHERE auth_subject = $1
      `, [input.subject]);
    }
    async close() {
        await this.pool.end();
    }
    async loadForUpdateByTokenHash(client, tokenHash) {
        const response = await client.query(`
      SELECT
        id,
        family_id AS "familyId",
        auth_subject AS "subject",
        platform,
        integrity,
        scope,
        token_hash AS "tokenHash",
        expires_at AS "expiresAt",
        rotated_at AS "rotatedAt",
        revoked_at AS "revokedAt"
      FROM mobile_refresh_sessions
      WHERE token_hash = $1
      FOR UPDATE
      `, [tokenHash]);
        const row = response.rows[0];
        if (!row) {
            return null;
        }
        const parsedScope = Array.isArray(row.scope)
            ? row.scope
            : (typeof row.scope === 'string' ? JSON.parse(row.scope) : row.scope);
        const scope = Array.isArray(parsedScope)
            ? parsedScope.filter(item => item === 'api:read'
                || item === 'notifications:write'
                || item === 'telemetry:write'
                || item === 'privacy:erase')
            : [];
        return {
            id: row.id,
            familyId: row.familyId,
            subject: row.subject,
            platform: row.platform,
            integrity: row.integrity,
            scope,
            tokenHash: row.tokenHash,
            expiresAtMs: row.expiresAt.getTime(),
            rotatedAtMs: row.rotatedAt ? row.rotatedAt.getTime() : null,
            revokedAtMs: row.revokedAt ? row.revokedAt.getTime() : null,
        };
    }
    async revokeFamilyById(client, familyId, nowMs) {
        await client.query(`
      UPDATE mobile_refresh_sessions
      SET revoked_at = COALESCE(revoked_at, to_timestamp($2 / 1000.0))
      WHERE family_id = $1
      `, [familyId, nowMs]);
    }
}
async function createPostgresPool(databaseUrl) {
    const pgModule = await import('pg');
    const PoolClass = pgModule.Pool;
    if (!PoolClass) {
        throw new Error('Failed to load pg.Pool.');
    }
    return new PoolClass({
        connectionString: databaseUrl,
    });
}
export async function createMobileSessionRefreshStore(options) {
    if (options.backend === 'postgres') {
        if (!options.databaseUrl) {
            throw new Error('DATABASE_URL is required for postgres mobile refresh sessions.');
        }
        const pool = await createPostgresPool(options.databaseUrl);
        return new PostgresMobileSessionRefreshStore(pool);
    }
    return new InMemoryMobileSessionRefreshStore();
}
