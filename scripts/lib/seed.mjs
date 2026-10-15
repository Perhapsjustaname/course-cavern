// Creates the first administrator if there is none. Local development only;
// the credentials come from .env.local, where dev.mjs generates them.
import pg from 'pg';
import bcrypt from 'bcryptjs';

export async function seedAdmin(databaseUrl, { email, password, name }) {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const { rowCount } = await client.query("SELECT 1 FROM users WHERE role = 'admin' LIMIT 1");
    if (rowCount) return false;
    const hash = await bcrypt.hash(password, 12);
    await client.query(
      `INSERT INTO users (name, email, password_hash, role, email_verified_at)
       VALUES ($1, $2, $3, 'admin', now())
       ON CONFLICT (email) DO UPDATE SET role = 'admin'`,
      [name, email.toLowerCase(), hash],
    );
    return true;
  } finally {
    await client.end();
  }
}
