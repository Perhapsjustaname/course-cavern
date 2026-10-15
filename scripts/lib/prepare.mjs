// Shared by `npm run dev` and `npm run share`: secrets, database, schema, admin.
import { randomBytes } from 'node:crypto';
import { readEnvLocal, ensureSecret } from './env.mjs';
import { startLocalDb, LOCAL_DATABASE_URL, DB_PORT } from './local-db.mjs';
import { migrate } from './migrate.mjs';
import { seedAdmin } from './seed.mjs';

/** Returns the env the Next process needs, and a function that stops the database. */
export async function prepare() {
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
    await db.stop().catch(() => {});
    throw err;
  }

  return {
    nextEnv: { ...process.env, DATABASE_URL: databaseUrl, SESSION_SECRET: sessionSecret },
    stopDb: () => db.stop().catch(() => {}),
  };
}
