// `npm run share`. Builds the app, runs it on this machine only, and opens a
// temporary public link through a Cloudflare quick tunnel so other people can
// try it. The link dies when this process stops, and is different every run.
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { prepare } from './lib/prepare.mjs';

const require = createRequire(import.meta.url);
const NEXT = require.resolve('next/dist/bin/next');
const PORT = Number(process.env.SHARE_PORT || 3100);
// Bound to loopback, not every interface: the tunnel is the only way in, and
// nobody on the same Wi-Fi can reach the server over plain HTTP.
const LOCAL = `http://127.0.0.1:${PORT}`;

if (spawnSync('cloudflared', ['--version'], { stdio: 'ignore' }).error) {
  console.error(
    '\n✗ cloudflared is not installed. Download it from\n' +
      '  https://github.com/cloudflare/cloudflared/releases\n' +
      '  and put it somewhere on your PATH, then run this again.\n',
  );
  process.exit(1);
}

let ready;
try {
  ready = await prepare();
} catch (err) {
  console.error(`\n✗ ${err.message}\n`);
  process.exit(1);
}

let server;
let tunnel;
let stopping = false;
async function shutdown(code = 0, why) {
  if (stopping) return;
  stopping = true;
  if (why) console.error(`\n✗ ${why}`);
  console.log('\n› Stopping. The link no longer works.');
  tunnel?.kill('SIGTERM');
  server?.kill('SIGTERM');
  await ready.stopDb();
  process.exit(code);
}
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => shutdown(0));

console.log('› Building a production version ...');
const build = spawnSync(process.execPath, [NEXT, 'build'], { stdio: 'inherit', env: ready.nextEnv });
if (build.status !== 0) await shutdown(build.status ?? 1, 'The build failed. Fix the error above and run this again.');

console.log(`› Starting on ${LOCAL} ...`);
server = spawn(process.execPath, [NEXT, 'start', '-H', '127.0.0.1', '-p', String(PORT)], {
  stdio: ['ignore', 'ignore', 'inherit'],
  env: ready.nextEnv,
});
server.on('exit', (code) => shutdown(code ?? 1, `The app stopped. Is port ${PORT} already in use? Set SHARE_PORT to use another.`));

async function waitForLocal(timeoutMs) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    try {
      await fetch(LOCAL, { method: 'HEAD' });
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  return false;
}
if (!(await waitForLocal(60_000))) await shutdown(1, 'The app did not start within a minute.');

console.log('› Opening a public link ...');
tunnel = spawn('cloudflared', ['tunnel', '--no-autoupdate', '--url', LOCAL], { stdio: ['ignore', 'pipe', 'pipe'] });

// cloudflared logs to stderr. Keep the tail in case something goes wrong.
const recent = [];
let publicUrl;
const registered = new Promise((resolve) => {
  const read = (buf) => {
    for (const line of buf.toString().split('\n').filter(Boolean)) {
      recent.push(line);
      if (recent.length > 25) recent.shift();
      publicUrl ??= line.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)?.[0];
      // Wait for a live connection rather than polling the new hostname. A
      // lookup that fires too early gets cached as "does not exist" on this
      // machine, and the link then looks broken here while working elsewhere.
      if (publicUrl && /Registered tunnel connection/.test(line)) resolve(publicUrl);
    }
  };
  tunnel.stdout.on('data', read);
  tunnel.stderr.on('data', read);
});
tunnel.on('exit', () => {
  if (!stopping) {
    console.error(recent.join('\n'));
    shutdown(1, 'The tunnel closed unexpectedly. Its last output is above.');
  }
});

const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 60_000));
const url = await Promise.race([registered, timeout]);
if (!url) {
  console.error(recent.join('\n'));
  await shutdown(1, 'Could not open a public link within a minute. The output above may say why.');
}

// Stop the Mac idle-sleeping while people are using it. Closing the lid still sleeps it.
if (process.platform === 'darwin') {
  spawn('caffeinate', ['-i', '-w', String(process.pid)], { stdio: 'ignore' }).unref();
}

const line = '='.repeat(64);
console.log(`
${line}

  Course Cavern is live at:

      ${url}

  Send that link to your testers. Give it about half a minute to
  start working the first time.

  It stops when you press Ctrl+C here, close this window, or the
  laptop sleeps. You get a new link every time you run this.

  Ask testers to upload made-up documents, not real licences or
  IDs. Everything uploaded is stored on this laptop.

  Sign in as admin with SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD
  from .env.local to approve their applications.

${line}
`);
