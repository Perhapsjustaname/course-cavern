// Minimal .env.local handling for the dev scripts, which run before Next.js
// loads its own environment.
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, appendFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const ROOT = resolve(import.meta.dirname, '..', '..');
const ENV_FILE = resolve(ROOT, '.env.local');

export function readEnvLocal() {
  if (!existsSync(ENV_FILE)) return {};
  const out = {};
  for (const line of readFileSync(ENV_FILE, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

function appendEnvLocal(key, value, comment) {
  if (!existsSync(ENV_FILE)) {
    writeFileSync(ENV_FILE, '# Local development settings. Not committed.\n');
  }
  appendFileSync(ENV_FILE, `\n# ${comment}\n${key}=${value}\n`);
}

/** Make sure a secret exists in .env.local, generating it the first time. */
export function ensureSecret(env, key, comment, make = () => randomBytes(32).toString('base64url')) {
  if (process.env[key]) return process.env[key];
  if (env[key]) return env[key];
  const value = make();
  appendEnvLocal(key, value, comment);
  env[key] = value;
  return value;
}
