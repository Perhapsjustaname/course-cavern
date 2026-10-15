// `npm run db:reset` wipes the local database and rebuilds it from the migrations.
// `npm run db:migrate` applies any migrations that have not run yet.
import { rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import pg from 'pg';
import { readEnvLocal, ensureSecret, ROOT } from './lib/env.mjs';
import { startLocalDb, LOCAL_DATABASE_URL, DB_DIR, DB_PORT } from './lib/local-db.mjs';
import { migrate } from './lib/migrate.mjs';
import { seedAdmin } from './lib/seed.mjs';

const command = process.argv[2];
const env = readEnvLocal();

async function isRunning() {
  const c = new pg.Client({
    host: 'localhost', port: DB_PORT, user: 'postgres', password: 'postgres',
    database: 'postgres', connectionTimeoutMillis: 1500,
  });
  try { await c.connect(); await c.end(); return true; } catch { return false; }
}

if (command === 'reset') {
  if (await isRunning()) {
    console.error('✗ The local database is running. Stop `npm run dev` first, then reset.');
    process.exit(1);
  }
  if (existsSync(DB_DIR)) rmSync(DB_DIR, { recursive: true, force: true });
  console.log('› Removed .localdb');
  // Uploaded documents belong to rows that no longer exist after a reset.
  const storage = resolve(ROOT, 'storage');
  if (existsSync(storage)) rmSync(storage, { recursive: true, force: true });
  console.log('› Removed uploaded files in storage/');
}

if (command !== 'reset' && command !== 'migrate') {
  console.error('Usage: node scripts/db.mjs <reset|migrate>');
  process.exit(1);
}

const db = await startLocalDb();
try {
  const n = await migrate(LOCAL_DATABASE_URL, (m) => console.log(m));
  console.log(n ? `› Applied ${n} migration(s)` : '› Schema up to date');
  const email = ensureSecret(env, 'SEED_ADMIN_EMAIL', 'First admin account, created on first run.', () => 'admin@coursecavern.test');
  const password = ensureSecret(env, 'SEED_ADMIN_PASSWORD', 'Password for the account above.', () => randomBytes(9).toString('base64url'));
  if (await seedAdmin(LOCAL_DATABASE_URL, { email, password, name: 'Site admin' })) {
    console.log(`› Created admin account ${email}. Its password is SEED_ADMIN_PASSWORD in .env.local`);
  }
} finally {
  await db.stop();
}
