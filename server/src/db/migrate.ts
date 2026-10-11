import fs from 'fs';
import path from 'path';
import { pool } from './index';

export async function runMigrations() {
  console.log('[Migration Engine] Starting database migrations...');
  const client = await pool.connect();
  try {
    // 1. Ensure migrations tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Read migration files
    const migrationsDir = path.resolve(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.log('[Migration Engine] No migrations directory found at', migrationsDir);
      return;
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const checkRes = await client.query(
        'SELECT 1 FROM schema_migrations WHERE migration_name = $1',
        [file]
      );
      if (checkRes.rows.length === 0) {
        console.log(`[Migration Engine] Applying migration: ${file}...`);
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf-8');

        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (migration_name) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log(`[Migration Engine] Successfully applied: ${file}`);
      } else {
        console.log(`[Migration Engine] Migration already applied: ${file}`);
      }
    }

    console.log('[Migration Engine] All migrations up to date.');
  } catch (error) {
    console.error('[Migration Engine] Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

if (process.argv[1] && process.argv[1].includes('migrate.ts')) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
