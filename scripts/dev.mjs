// `npm run dev`. Starts the local database, brings the schema up to date,
// makes sure an admin exists, then runs the Next.js dev server.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { prepare } from './lib/prepare.mjs';

const require = createRequire(import.meta.url);

let ready;
try {
  ready = await prepare();
} catch (err) {
  console.error(`\n✗ ${err.message}\n`);
  process.exit(1);
}

const next = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: ready.nextEnv,
});

let stopping = false;
async function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  await ready.stopDb();
  process.exit(code);
}

next.on('exit', (code) => shutdown(code ?? 0));
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    if (!next.killed) next.kill(sig);
  });
}
