// `npm run dev`. Starts the local database, brings the schema up to date,
// makes sure an admin exists, then runs the Next.js dev server.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import { readEnvLocal, ensureSecret } from './lib/env.mjs';
import { startLocalDb, LOCAL_DATABASE_URL, DB_PORT } from './lib/local-db.mjs';
import { migrate } from './lib/migrate.mjs';
import { seedAdmin } from './lib/seed.mjs';

const require = createRequire(import.meta.url);
const env = readEnvLocal();

const sessionSecret = ensureSecret(env, 'SESSION_SECRET', 'Signs session cookies. Generated on first run.');
const adminEmail = ensureSecret(env, 'SEED_ADMIN_EMAIL', 'First admin account, created on first run.', () => 'admin@coursecavern.test');
const adminPassword = ensureSecret(env, 'SEED_ADMIN_PASSWORD', 'Password for the account above.', () => randomBytes(9).toString('base64url'));

const external = process.env.DATABASE_URL || env.DATABASE_URL;
let db = { stop: async () => {} };
let databaseUrl = external;

try {
  if (external) {
    console.log('› Using DATABASE_URL from the environment');
  } else {
    process.stdout.write(`› Starting local database on port ${DB_PORT} ... `);
    db = await startLocalDb();
    databaseUrl = LOCAL_DATABASE_URL;
    console.log(db.reused ? 'already running, reusing it' : db.fresh ? 'created' : 'ready');
  }

  const applied = await migrate(databaseUrl, (m) => console.log(m));
  console.log(applied ? `› Applied ${applied} migration(s)` : '› Schema up to date');

  if (await seedAdmin(databaseUrl, { email: adminEmail, password: adminPassword, name: 'Site admin' })) {
    console.log(`› Created admin account ${adminEmail}. Its password is SEED_ADMIN_PASSWORD in .env.local`);
  }
} catch (err) {
  console.error(`\n✗ ${err.message}\n`);
  await db.stop().catch(() => {});
  process.exit(1);
}

const next = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: databaseUrl, SESSION_SECRET: sessionSecret },
});

let stopping = false;
async function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  await db.stop().catch(() => {});
  process.exit(code);
}

next.on('exit', (code) => shutdown(code ?? 0));
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    if (!next.killed) next.kill(sig);
  });
}
