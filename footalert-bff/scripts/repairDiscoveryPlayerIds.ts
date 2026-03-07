import { buildApiSportsPlayerPhoto, FOLLOW_DISCOVERY_PLAYER_ID_CORRECTIONS } from '@footalert/app-core';
import { Pool } from 'pg';

type MetadataRow = {
  name: string | null;
  position: string | null;
  team_name: string | null;
  team_logo: string | null;
  league_name: string | null;
};

function resolveDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to repair discovery player ids.');
  }

  return databaseUrl;
}

function isMeaningfulValue(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

async function mergePlayerIdCorrection(
  pool: Pool,
  sourcePlayerId: string,
  targetPlayerId: string,
): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      `
      INSERT INTO follow_entity_states (
        subject_hash,
        entity_kind,
        entity_id,
        is_following,
        first_followed_at,
        last_changed_at,
        last_source
      )
      SELECT
        source.subject_hash,
        'player',
        $2,
        source.is_following,
        source.first_followed_at,
        source.last_changed_at,
        source.last_source
      FROM follow_entity_states source
      WHERE source.entity_kind = 'player'
        AND source.entity_id = $1
      ON CONFLICT (subject_hash, entity_kind, entity_id)
      DO UPDATE SET
        is_following = follow_entity_states.is_following OR EXCLUDED.is_following,
        first_followed_at = CASE
          WHEN follow_entity_states.first_followed_at IS NULL THEN EXCLUDED.first_followed_at
          WHEN EXCLUDED.first_followed_at IS NULL THEN follow_entity_states.first_followed_at
          ELSE LEAST(follow_entity_states.first_followed_at, EXCLUDED.first_followed_at)
        END,
        last_changed_at = GREATEST(follow_entity_states.last_changed_at, EXCLUDED.last_changed_at),
        last_source = CASE
          WHEN EXCLUDED.last_changed_at >= follow_entity_states.last_changed_at
            THEN EXCLUDED.last_source
          ELSE follow_entity_states.last_source
        END
      `,
      [sourcePlayerId, targetPlayerId],
    );

    await client.query(
      `
      DELETE FROM follow_entity_states
      WHERE entity_kind = 'player'
        AND entity_id = $1
      `,
      [sourcePlayerId],
    );

    await client.query(
      `
      INSERT INTO follow_entity_daily_stats (
        bucket_date,
        entity_kind,
        entity_id,
        follow_adds_count,
        follow_removes_count
      )
      SELECT
        source.bucket_date,
        'player',
        $2,
        source.follow_adds_count,
        source.follow_removes_count
      FROM follow_entity_daily_stats source
      WHERE source.entity_kind = 'player'
        AND source.entity_id = $1
      ON CONFLICT (bucket_date, entity_kind, entity_id)
      DO UPDATE SET
        follow_adds_count = follow_entity_daily_stats.follow_adds_count + EXCLUDED.follow_adds_count,
        follow_removes_count = follow_entity_daily_stats.follow_removes_count + EXCLUDED.follow_removes_count
      `,
      [sourcePlayerId, targetPlayerId],
    );

    await client.query(
      `
      DELETE FROM follow_entity_daily_stats
      WHERE entity_kind = 'player'
        AND entity_id = $1
      `,
      [sourcePlayerId],
    );

    const metadataResult = await client.query<MetadataRow>(
      `
      SELECT name, position, team_name, team_logo, league_name
      FROM follow_entity_metadata
      WHERE entity_kind = 'player'
        AND entity_id IN ($1, $2)
      ORDER BY CASE WHEN entity_id = $2 THEN 0 ELSE 1 END
      `,
      [sourcePlayerId, targetPlayerId],
    );

    const mergedMetadata = metadataResult.rows.reduce<MetadataRow>(
      (accumulator, row) => ({
        name: isMeaningfulValue(accumulator.name) ? accumulator.name : row.name,
        position: isMeaningfulValue(accumulator.position) ? accumulator.position : row.position,
        team_name: isMeaningfulValue(accumulator.team_name) ? accumulator.team_name : row.team_name,
        team_logo: isMeaningfulValue(accumulator.team_logo) ? accumulator.team_logo : row.team_logo,
        league_name: isMeaningfulValue(accumulator.league_name) ? accumulator.league_name : row.league_name,
      }),
      {
        name: null,
        position: null,
        team_name: null,
        team_logo: null,
        league_name: null,
      },
    );

    await client.query(
      `
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
      VALUES (
        'player',
        $1,
        $2,
        $3,
        NULL,
        $4,
        $5,
        $6,
        $7,
        NOW()
      )
      ON CONFLICT (entity_kind, entity_id)
      DO UPDATE SET
        name = EXCLUDED.name,
        image_url = EXCLUDED.image_url,
        position = EXCLUDED.position,
        team_name = EXCLUDED.team_name,
        team_logo = EXCLUDED.team_logo,
        league_name = EXCLUDED.league_name,
        updated_at = EXCLUDED.updated_at
      `,
      [
        targetPlayerId,
        mergedMetadata.name ?? targetPlayerId,
        buildApiSportsPlayerPhoto(targetPlayerId),
        mergedMetadata.position,
        mergedMetadata.team_name,
        mergedMetadata.team_logo,
        mergedMetadata.league_name,
      ],
    );

    await client.query(
      `
      DELETE FROM follow_entity_metadata
      WHERE entity_kind = 'player'
        AND entity_id = $1
      `,
      [sourcePlayerId],
    );

    const activeFollowersResult = await client.query<{ count: string }>(
      `
      SELECT COUNT(*)::text AS count
      FROM follow_entity_states
      WHERE entity_kind = 'player'
        AND entity_id = $1
        AND is_following = TRUE
      `,
      [targetPlayerId],
    );
    const totalAddsResult = await client.query<{ count: string }>(
      `
      SELECT COALESCE(SUM(follow_adds_count), 0)::text AS count
      FROM follow_entity_daily_stats
      WHERE entity_kind = 'player'
        AND entity_id = $1
      `,
      [targetPlayerId],
    );
    const lastFollowedAtResult = await client.query<{ value: Date | null }>(
      `
      SELECT MAX(last_changed_at) AS value
      FROM follow_entity_states
      WHERE entity_kind = 'player'
        AND entity_id = $1
        AND is_following = TRUE
      `,
      [targetPlayerId],
    );

    await client.query(
      `
      INSERT INTO follow_entity_aggregates (
        entity_kind,
        entity_id,
        active_followers_count,
        total_follow_adds_count,
        last_followed_at,
        updated_at
      )
      VALUES ('player', $1, $2, $3, $4, NOW())
      ON CONFLICT (entity_kind, entity_id)
      DO UPDATE SET
        active_followers_count = EXCLUDED.active_followers_count,
        total_follow_adds_count = EXCLUDED.total_follow_adds_count,
        last_followed_at = EXCLUDED.last_followed_at,
        updated_at = EXCLUDED.updated_at
      `,
      [
        targetPlayerId,
        Number(activeFollowersResult.rows[0]?.count ?? '0'),
        Number(totalAddsResult.rows[0]?.count ?? '0'),
        lastFollowedAtResult.rows[0]?.value ?? null,
      ],
    );

    await client.query(
      `
      DELETE FROM follow_entity_aggregates
      WHERE entity_kind = 'player'
        AND entity_id = $1
      `,
      [sourcePlayerId],
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function main(): Promise<void> {
  const corrections = Object.entries(FOLLOW_DISCOVERY_PLAYER_ID_CORRECTIONS).filter(
    ([sourcePlayerId, targetPlayerId]) => sourcePlayerId !== targetPlayerId,
  );

  if (corrections.length === 0) {
    console.log('No discovery player id corrections configured. Nothing to repair.');
    return;
  }

  const pool = new Pool({
    connectionString: resolveDatabaseUrl(),
  });

  try {
    for (const [sourcePlayerId, targetPlayerId] of corrections) {
      await mergePlayerIdCorrection(pool, sourcePlayerId, targetPlayerId);
      console.log(`Merged discovery player id ${sourcePlayerId} -> ${targetPlayerId}`);
    }
  } finally {
    await pool.end();
  }
}

void main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
