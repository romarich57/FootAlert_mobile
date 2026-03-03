import fs from 'node:fs';
import path from 'node:path';

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required.');
}

const pgModule = await import('pg');
const Pool = pgModule.Pool;
if (!Pool) {
  throw new Error('Failed to load pg.Pool.');
}

const pool = new Pool({
  connectionString: databaseUrl,
});

const migrationsDir = path.resolve('db/migrations');
const migrationFiles = fs.readdirSync(migrationsDir)
  .filter(fileName => fileName.endsWith('.sql'))
  .sort((first, second) => first.localeCompare(second));

try {
  for (const migrationFile of migrationFiles) {
    const migrationPath = path.join(migrationsDir, migrationFile);
    const sql = fs.readFileSync(migrationPath, 'utf8');
    console.log(`[db:migrate:notifications] Applying ${migrationFile}`);
    await pool.query(sql);
  }
  console.log('[db:migrate:notifications] Completed successfully.');
} finally {
  await pool.end();
}
