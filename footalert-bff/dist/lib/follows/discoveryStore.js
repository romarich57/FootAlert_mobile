import { createHash } from 'node:crypto';
function normalizeDate(value) {
    if (!value) {
        return null;
    }
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}
function toBucketDate(date) {
    return date.toISOString().slice(0, 10);
}
function hashSubject(subject) {
    return createHash('sha256').update(subject).digest('hex');
}
function buildEntityKey(entityKind, entityId) {
    return `${entityKind}:${entityId}`;
}
function buildStateKey(subjectHash, entityKind, entityId) {
    return `${subjectHash}:${entityKind}:${entityId}`;
}
function buildDailyKey(bucketDate, entityKind, entityId) {
    return `${bucketDate}:${entityKind}:${entityId}`;
}
function compareDiscoveryEntities(first, second) {
    if (second.recentNet30d !== first.recentNet30d) {
        return second.recentNet30d - first.recentNet30d;
    }
    if (second.activeFollowersCount !== first.activeFollowersCount) {
        return second.activeFollowersCount - first.activeFollowersCount;
    }
    if (second.totalFollowAddsCount !== first.totalFollowAddsCount) {
        return second.totalFollowAddsCount - first.totalFollowAddsCount;
    }
    return first.entityId.localeCompare(second.entityId);
}
class InMemoryFollowsDiscoveryStore {
    stateByKey = new Map();
    aggregateByKey = new Map();
    dailyStatsByKey = new Map();
    metadataByKey = new Map();
    async recordEvent(input) {
        const occurredAt = input.occurredAt ?? new Date();
        const subjectHash = hashSubject(input.subject);
        const stateKey = buildStateKey(subjectHash, input.entityKind, input.entityId);
        const entityKey = buildEntityKey(input.entityKind, input.entityId);
        const bucketDate = toBucketDate(occurredAt);
        const dailyKey = buildDailyKey(bucketDate, input.entityKind, input.entityId);
        const existingState = this.stateByKey.get(stateKey);
        if (input.action === 'follow') {
            if (existingState?.isFollowing) {
                return {
                    applied: false,
                    state: 'followed',
                };
            }
            this.stateByKey.set(stateKey, {
                isFollowing: true,
                firstFollowedAt: existingState?.firstFollowedAt ?? occurredAt,
                lastChangedAt: occurredAt,
                lastSource: input.source,
            });
            const aggregate = this.aggregateByKey.get(entityKey);
            this.aggregateByKey.set(entityKey, {
                activeFollowersCount: (aggregate?.activeFollowersCount ?? 0) + 1,
                totalFollowAddsCount: (aggregate?.totalFollowAddsCount ?? 0) + 1,
                lastFollowedAt: occurredAt,
                updatedAt: occurredAt,
            });
            const dailyStats = this.dailyStatsByKey.get(dailyKey);
            this.dailyStatsByKey.set(dailyKey, {
                followAddsCount: (dailyStats?.followAddsCount ?? 0) + 1,
                followRemovesCount: dailyStats?.followRemovesCount ?? 0,
            });
            return {
                applied: true,
                state: 'followed',
            };
        }
        if (!existingState?.isFollowing) {
            return {
                applied: false,
                state: 'unfollowed',
            };
        }
        this.stateByKey.set(stateKey, {
            isFollowing: false,
            firstFollowedAt: existingState.firstFollowedAt,
            lastChangedAt: occurredAt,
            lastSource: input.source,
        });
        const aggregate = this.aggregateByKey.get(entityKey);
        this.aggregateByKey.set(entityKey, {
            activeFollowersCount: Math.max((aggregate?.activeFollowersCount ?? 0) - 1, 0),
            totalFollowAddsCount: aggregate?.totalFollowAddsCount ?? 0,
            lastFollowedAt: aggregate?.lastFollowedAt ?? null,
            updatedAt: occurredAt,
        });
        const dailyStats = this.dailyStatsByKey.get(dailyKey);
        this.dailyStatsByKey.set(dailyKey, {
            followAddsCount: dailyStats?.followAddsCount ?? 0,
            followRemovesCount: (dailyStats?.followRemovesCount ?? 0) + 1,
        });
        return {
            applied: true,
            state: 'unfollowed',
        };
    }
    async getDiscovery(entityKind, limit) {
        const thresholdDate = toBucketDate(new Date(Date.now() - (29 * 24 * 60 * 60 * 1000)));
        const items = [...this.aggregateByKey.entries()].reduce((accumulator, [key, aggregate]) => {
            if (!key.startsWith(`${entityKind}:`)) {
                return accumulator;
            }
            const entityId = key.slice(entityKind.length + 1);
            const metadata = this.metadataByKey.get(key);
            if (!metadata || !metadata.name.trim()) {
                return accumulator;
            }
            let recentNet30d = 0;
            for (const [dailyKey, dailyStats] of this.dailyStatsByKey.entries()) {
                const [bucketDate, dailyEntityKind, dailyEntityId] = dailyKey.split(':');
                if (dailyEntityKind !== entityKind ||
                    dailyEntityId !== entityId ||
                    bucketDate < thresholdDate) {
                    continue;
                }
                recentNet30d += dailyStats.followAddsCount - dailyStats.followRemovesCount;
            }
            accumulator.push({
                entityKind,
                entityId,
                metadata: {
                    name: metadata.name,
                    imageUrl: metadata.imageUrl,
                    country: metadata.country ?? null,
                    position: metadata.position ?? null,
                    teamName: metadata.teamName ?? null,
                    teamLogo: metadata.teamLogo ?? null,
                    leagueName: metadata.leagueName ?? null,
                },
                activeFollowersCount: aggregate.activeFollowersCount,
                recentNet30d,
                totalFollowAddsCount: aggregate.totalFollowAddsCount,
            });
            return accumulator;
        }, []).sort(compareDiscoveryEntities);
        return items.slice(0, limit);
    }
    async getMetadataUpdatedAt(entityKind, entityId) {
        const metadata = this.metadataByKey.get(buildEntityKey(entityKind, entityId));
        return metadata?.updatedAt ?? null;
    }
    async upsertMetadata(entityKind, entityId, metadata, updatedAt = new Date()) {
        this.metadataByKey.set(buildEntityKey(entityKind, entityId), {
            ...metadata,
            updatedAt,
        });
    }
    async close() {
        this.stateByKey.clear();
        this.aggregateByKey.clear();
        this.dailyStatsByKey.clear();
        this.metadataByKey.clear();
    }
}
class PostgresFollowsDiscoveryStore {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async recordEvent(input) {
        const occurredAt = input.occurredAt ?? new Date();
        const occurredAtMs = occurredAt.getTime();
        const subjectHash = hashSubject(input.subject);
        const bucketDate = toBucketDate(occurredAt);
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const stateResult = await client.query(`
        SELECT is_following, first_followed_at
        FROM follow_entity_states
        WHERE subject_hash = $1
          AND entity_kind = $2
          AND entity_id = $3
        FOR UPDATE
        `, [subjectHash, input.entityKind, input.entityId]);
            const existingState = stateResult.rows[0];
            if (input.action === 'follow') {
                if (existingState?.is_following) {
                    await client.query('COMMIT');
                    return {
                        applied: false,
                        state: 'followed',
                    };
                }
                await client.query(`
          INSERT INTO follow_entity_states (
            subject_hash,
            entity_kind,
            entity_id,
            is_following,
            first_followed_at,
            last_changed_at,
            last_source
          )
          VALUES ($1, $2, $3, TRUE, to_timestamp($4 / 1000.0), to_timestamp($5 / 1000.0), $6)
          ON CONFLICT (subject_hash, entity_kind, entity_id)
          DO UPDATE SET
            is_following = TRUE,
            first_followed_at = COALESCE(follow_entity_states.first_followed_at, EXCLUDED.first_followed_at),
            last_changed_at = EXCLUDED.last_changed_at,
            last_source = EXCLUDED.last_source
          `, [
                    subjectHash,
                    input.entityKind,
                    input.entityId,
                    normalizeDate(existingState?.first_followed_at)?.getTime() ?? occurredAtMs,
                    occurredAtMs,
                    input.source,
                ]);
                await client.query(`
          INSERT INTO follow_entity_aggregates (
            entity_kind,
            entity_id,
            active_followers_count,
            total_follow_adds_count,
            last_followed_at,
            updated_at
          )
          VALUES ($1, $2, 1, 1, to_timestamp($3 / 1000.0), to_timestamp($4 / 1000.0))
          ON CONFLICT (entity_kind, entity_id)
          DO UPDATE SET
            active_followers_count = follow_entity_aggregates.active_followers_count + 1,
            total_follow_adds_count = follow_entity_aggregates.total_follow_adds_count + 1,
            last_followed_at = EXCLUDED.last_followed_at,
            updated_at = EXCLUDED.updated_at
          `, [input.entityKind, input.entityId, occurredAtMs, occurredAtMs]);
                await client.query(`
          INSERT INTO follow_entity_daily_stats (
            bucket_date,
            entity_kind,
            entity_id,
            follow_adds_count,
            follow_removes_count
          )
          VALUES ($1::date, $2, $3, 1, 0)
          ON CONFLICT (bucket_date, entity_kind, entity_id)
          DO UPDATE SET
            follow_adds_count = follow_entity_daily_stats.follow_adds_count + 1
          `, [bucketDate, input.entityKind, input.entityId]);
                await client.query('COMMIT');
                return {
                    applied: true,
                    state: 'followed',
                };
            }
            if (!existingState?.is_following) {
                await client.query('COMMIT');
                return {
                    applied: false,
                    state: 'unfollowed',
                };
            }
            await client.query(`
        INSERT INTO follow_entity_states (
          subject_hash,
          entity_kind,
          entity_id,
          is_following,
          first_followed_at,
          last_changed_at,
          last_source
        )
        VALUES ($1, $2, $3, FALSE, $4, to_timestamp($5 / 1000.0), $6)
        ON CONFLICT (subject_hash, entity_kind, entity_id)
        DO UPDATE SET
          is_following = FALSE,
          first_followed_at = COALESCE(follow_entity_states.first_followed_at, EXCLUDED.first_followed_at),
          last_changed_at = EXCLUDED.last_changed_at,
          last_source = EXCLUDED.last_source
        `, [
                subjectHash,
                input.entityKind,
                input.entityId,
                normalizeDate(existingState.first_followed_at),
                occurredAtMs,
                input.source,
            ]);
            await client.query(`
        INSERT INTO follow_entity_aggregates (
          entity_kind,
          entity_id,
          active_followers_count,
          total_follow_adds_count,
          last_followed_at,
          updated_at
        )
        VALUES ($1, $2, 0, 0, NULL, to_timestamp($3 / 1000.0))
        ON CONFLICT (entity_kind, entity_id)
        DO UPDATE SET
          active_followers_count = GREATEST(follow_entity_aggregates.active_followers_count - 1, 0),
          updated_at = EXCLUDED.updated_at
        `, [input.entityKind, input.entityId, occurredAtMs]);
            await client.query(`
        INSERT INTO follow_entity_daily_stats (
          bucket_date,
          entity_kind,
          entity_id,
          follow_adds_count,
          follow_removes_count
        )
        VALUES ($1::date, $2, $3, 0, 1)
        ON CONFLICT (bucket_date, entity_kind, entity_id)
        DO UPDATE SET
          follow_removes_count = follow_entity_daily_stats.follow_removes_count + 1
        `, [bucketDate, input.entityKind, input.entityId]);
            await client.query('COMMIT');
            return {
                applied: true,
                state: 'unfollowed',
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
    async getDiscovery(entityKind, limit) {
        const result = await this.pool.query(`
      SELECT
        aggregates.entity_id,
        aggregates.active_followers_count,
        aggregates.total_follow_adds_count,
        COALESCE(
          SUM(
            CASE
              WHEN daily.bucket_date >= CURRENT_DATE - INTERVAL '29 days'
                THEN daily.follow_adds_count - daily.follow_removes_count
              ELSE 0
            END
          ),
          0
        )::int AS recent_net_30d,
        metadata.name,
        metadata.image_url,
        metadata.country,
        metadata.position,
        metadata.team_name,
        metadata.team_logo,
        metadata.league_name,
        metadata.updated_at
      FROM follow_entity_aggregates aggregates
      LEFT JOIN follow_entity_daily_stats daily
        ON daily.entity_kind = aggregates.entity_kind
       AND daily.entity_id = aggregates.entity_id
      LEFT JOIN follow_entity_metadata metadata
        ON metadata.entity_kind = aggregates.entity_kind
       AND metadata.entity_id = aggregates.entity_id
      WHERE aggregates.entity_kind = $1
      GROUP BY
        aggregates.entity_id,
        aggregates.active_followers_count,
        aggregates.total_follow_adds_count,
        metadata.name,
        metadata.image_url,
        metadata.country,
        metadata.position,
        metadata.team_name,
        metadata.team_logo,
        metadata.league_name,
        metadata.updated_at
      ORDER BY recent_net_30d DESC,
               aggregates.active_followers_count DESC,
               aggregates.total_follow_adds_count DESC,
               aggregates.entity_id ASC
      LIMIT $2
      `, [entityKind, limit]);
        return result.rows
            .filter(row => Boolean(row.name?.trim()))
            .map(row => ({
            entityKind,
            entityId: row.entity_id,
            metadata: {
                name: row.name ?? '',
                imageUrl: row.image_url ?? '',
                country: row.country,
                position: row.position,
                teamName: row.team_name,
                teamLogo: row.team_logo,
                leagueName: row.league_name,
            },
            activeFollowersCount: Number(row.active_followers_count ?? 0),
            recentNet30d: Number(row.recent_net_30d ?? 0),
            totalFollowAddsCount: Number(row.total_follow_adds_count ?? 0),
        }));
    }
    async getMetadataUpdatedAt(entityKind, entityId) {
        const result = await this.pool.query(`
      SELECT updated_at
      FROM follow_entity_metadata
      WHERE entity_kind = $1
        AND entity_id = $2
      `, [entityKind, entityId]);
        return normalizeDate(result.rows[0]?.updated_at);
    }
    async upsertMetadata(entityKind, entityId, metadata, updatedAt = new Date()) {
        await this.pool.query(`
      INSERT INTO follow_entity_metadata (
        entity_kind,
        entity_id,
        name,
        image_url,
        country,
        position,
        team_name,
        team_logo,
        league_name,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, to_timestamp($10 / 1000.0))
      ON CONFLICT (entity_kind, entity_id)
      DO UPDATE SET
        name = EXCLUDED.name,
        image_url = EXCLUDED.image_url,
        country = EXCLUDED.country,
        position = EXCLUDED.position,
        team_name = EXCLUDED.team_name,
        team_logo = EXCLUDED.team_logo,
        league_name = EXCLUDED.league_name,
        updated_at = EXCLUDED.updated_at
      `, [
            entityKind,
            entityId,
            metadata.name,
            metadata.imageUrl,
            metadata.country ?? null,
            metadata.position ?? null,
            metadata.teamName ?? null,
            metadata.teamLogo ?? null,
            metadata.leagueName ?? null,
            updatedAt.getTime(),
        ]);
    }
    async close() {
        await this.pool.end();
    }
}
async function createPostgresPool(databaseUrl) {
    const pgModule = await import('pg');
    const Pool = pgModule.Pool ?? pgModule.default?.Pool;
    if (!Pool) {
        throw new Error('Failed to load pg.Pool.');
    }
    return new Pool({
        connectionString: databaseUrl,
    });
}
export async function createFollowsDiscoveryStore(options) {
    if (options.backend === 'postgres') {
        if (!options.databaseUrl) {
            throw new Error('DATABASE_URL is required for postgres follows discovery backend.');
        }
        const pool = await createPostgresPool(options.databaseUrl);
        return new PostgresFollowsDiscoveryStore(pool);
    }
    return new InMemoryFollowsDiscoveryStore();
}
