// Embedded Postgres for local development. Real Postgres 17, no install, data
// kept in .localdb/ (gitignored).
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT } from './env.mjs';

export const DB_DIR = resolve(ROOT, '.localdb');
export const DB_PORT = Number(process.env.LOCAL_DB_PORT || 54329);
export const DB_NAME = 'course_cavern';
const USER = 'postgres';
const PASSWORD = 'postgres';

export const LOCAL_DATABASE_URL = `postgresql://${USER}:${PASSWORD}@localhost:${DB_PORT}/${DB_NAME}`;

function makeInstance() {
  return new EmbeddedPostgres({
    databaseDir: DB_DIR,
    port: DB_PORT,
    user: USER,
    password: PASSWORD,
    persistent: true,
    onLog: () => {},
    onError: (e) => {
      const msg = String(e ?? '');
      // initdb and postgres both chatter on stderr during normal startup.
      if (/error|fatal|panic/i.test(msg)) console.error('[db]', msg.trim());
    },
  });
}

async function canConnect(database = 'postgres') {
  const client = new pg.Client({
    host: 'localhost', port: DB_PORT, user: USER, password: PASSWORD, database,
    connectionTimeoutMillis: 1500,
  });
  try {
    await client.connect();
    await client.end();
    return true;
  } catch {
    return false;
  }
}

/**
 * Start the local cluster. If one is already listening on our port (a previous
 * run that was killed before it could shut down), reuse it rather than fail.
 * Returns a stop function, which is a no-op for a reused cluster.
 */
export async function startLocalDb() {
  if (await canConnect()) {
    await ensureDatabase();
    return { stop: async () => {}, reused: true };
  }

  const instance = makeInstance();
  const fresh = !existsSync(resolve(DB_DIR, 'PG_VERSION'));
  if (fresh) await instance.initialise();

  try {
    await instance.start();
  } catch (err) {
    throw new Error(
      `Could not start the local database on port ${DB_PORT}.\n` +
        `If another program is using that port, set LOCAL_DB_PORT in .env.local.\n` +
        `If .localdb is corrupted, run: npm run db:reset\n\n${err?.message ?? err}`,
    );
  }

  await ensureDatabase();
  return { stop: () => instance.stop(), reused: false, fresh };
}

async function ensureDatabase() {
  const client = new pg.Client({
    host: 'localhost', port: DB_PORT, user: USER, password: PASSWORD, database: 'postgres',
  });
  await client.connect();
  try {
    const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [DB_NAME]);
    if (!rowCount) await client.query(`CREATE DATABASE ${DB_NAME}`);
  } finally {
    await client.end();
  }
}
