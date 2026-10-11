import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from server root or parent
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432', 10),
  database: process.env.PGDATABASE || 'kom_kitchen_db',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error]: Unexpected client error', err);
});

/**
 * Execute a unit of work inside an isolated database transaction with ONE checked-out client.
 * Guarantees COMMIT on success and ROLLBACK on error.
 * ALWAYS releases client in the finally block.
 */
export async function withTransaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('[PostgreSQL Transaction] Rollback failed:', rollbackError);
    }
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get next monotonically increasing sequence number using the database sequence_tracker table.
 */
export async function getNextSequenceNumber(client?: pg.PoolClient): Promise<number> {
  const query = `
    UPDATE sequence_tracker
    SET current_val = current_val + 1
    WHERE id = 1
    RETURNING current_val;
  `;
  const executor = client || pool;
  const res = await executor.query(query);
  return parseInt(res.rows[0].current_val, 10);
}
