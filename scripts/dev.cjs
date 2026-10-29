const { spawn } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
if (process.env.NODE_ENV !== 'test') require('dotenv').config({ path: path.join(root, '.env') });
if (Number(process.versions.node.split('.')[0]) !== 24) {
  console.error('LeaseIQ requires Node 24.x.');
  process.exit(1);
}
const children = new Set();
let stopping = false;
function launch(name, args, cwd, env = {}) {
  const child = spawn(process.execPath, args, {
    cwd,
    env: { ...process.env, ...env },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  children.add(child);
  for (const stream of [child.stdout, child.stderr])
    stream.on('data', (data) => process.stdout.write(`[${name}] ${data}`));
  child.once('error', (error) => {
    console.error(`${name} failed to start: ${error.message}`);
    stop(1);
  });
  child.once('exit', (code, signal) => {
    children.delete(child);
    if (!stopping) {
      console.error(`${name} stopped (${code ?? signal}). Stopping development services.`);
      stop(code || 1);
    }
  });
  return child;
}
async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  await Promise.all(
    [...children].map(
      (child) =>
        new Promise((resolve) => {
          child.once('exit', resolve);
          if (child.connected) child.send({ type: 'shutdown' });
          if (process.platform === 'win32') {
            // Kill only the process trees started by this launcher, including Next workers.
            const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
              windowsHide: true,
              stdio: 'ignore',
            });
            killer.once('exit', resolve);
          } else {
            child.kill('SIGTERM');
          }
          setTimeout(() => {
            try {
              child.kill('SIGKILL');
            } catch {}
            resolve();
          }, 5000).unref();
        }),
    ),
  );
  process.exit(code);
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
process.on('message', (message) => {
  if (message?.type === 'shutdown') stop();
});
process.on('disconnect', () => stop());
async function ready(url, timeout = 30000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline && !stopping) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`Startup did not become ready: ${url}`);
}
async function main() {
  const port = process.env.PORT || '3001',
    frontendPort = process.env.FRONTEND_PORT || '3000';
  const backend =
    process.env.LEASEIQ_E2E === '1'
      ? path.join(root, 'tests/e2e/server.ts')
      : path.join(root, 'src/server.ts');
  launch('api', [require.resolve('tsx/cli'), backend], root);
  await ready(`http://127.0.0.1:${port}/health`);
  launch(
    'web',
    [
      path.join(root, 'frontend/node_modules/next/dist/bin/next'),
      'dev',
      '-H',
      '127.0.0.1',
      '-p',
      frontendPort,
    ],
    path.join(root, 'frontend'),
    { API_INTERNAL_URL: `http://127.0.0.1:${port}` },
  );
  await ready(`http://127.0.0.1:${frontendPort}`, 60000);
  console.log(
    `LeaseIQ ready: http://localhost:${frontendPort} (API http://localhost:${port}). Ctrl+C stops both services.`,
  );
}
main().catch((error) => {
  console.error(error.message);
  stop(1);
});
