import 'server-only';
import pg from 'pg';

/**
 * One pool per server process. In development the module is re-evaluated on
 * every hot reload, so the pool is parked on globalThis to stop each edit from
 * opening a fresh set of connections.
 *
 * The limits matter. A pool with no max and no timeouts turns a single
 * unreleased client into a silent, permanent hang: every later request just
 * waits forever. These make that fail loudly and quickly instead.
 */
const g = globalThis as unknown as { __ccPool?: pg.Pool };

function makePool() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Start the app with `npm run dev`.');
  }
  return new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    statement_timeout: 10_000,
  });
}

/**
 * Created on first use rather than at import, so `next build` can load this
 * module without a database. Builds usually run where DATABASE_URL is not set.
 */
function pool(): pg.Pool {
  return (g.__ccPool ??= makePool());
}

type Params = unknown[];

export async function query<T extends pg.QueryResultRow>(sql: string, params: Params = []): Promise<T[]> {
  const res = await pool().query<T>(sql, params);
  return res.rows;
}

export async function queryOne<T extends pg.QueryResultRow>(sql: string, params: Params = []): Promise<T | null> {
  const res = await pool().query<T>(sql, params);
  return res.rows[0] ?? null;
}

/**
 * Run several statements atomically. The client is always released, whatever
 * happens inside, which is the whole reason this helper exists.
 *
 * Do authorisation before calling this, never inside it: checking out a client
 * and then redirecting away holds a connection for nothing.
 */
export async function withTransaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/** Postgres error code for a unique constraint violation. */
export function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505';
}
