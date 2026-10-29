// Verifies the real launcher without credentials, database writes, or paid calls.
const { fork } = require('node:child_process');
const net = require('node:net');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
async function port() {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const value = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return value;
}
function run(api, web) {
  const env = {
    ...process.env,
    NODE_ENV: 'development',
    PORT: String(api),
    FRONTEND_PORT: String(web),
    NEXT_DIST_DIR: '.next-lifecycle',
    LEASEIQ_E2E: '',
    MONGODB_URI: '',
    JWT_SECRET: '',
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: '',
    NEXT_PUBLIC_API_URL: '',
  };
  for (const key of [
    'FIRECRAWL_API_KEY',
    'GOOGLE_OAUTH_CLIENT_ID',
    'GOOGLE_OAUTH_CLIENT_SECRET',
    'GOOGLE_GEOCODING_API_KEY',
    'RESEND_API_KEY',
    'OPENROUTER_API_KEY',
    'REDUCTO_API_KEY',
    'INTERNAL_JOB_TOKEN',
  ])
    env[key] = '';
  const child = fork(path.join(root, 'scripts/dev.cjs'), [], {
    cwd: root,
    env,
    silent: true,
    windowsHide: true,
  });
  const state = { child, output: '', exited: false, code: null };
  child.stdout.on('data', (data) => (state.output += data));
  child.stderr.on('data', (data) => (state.output += data));
  child.on('exit', (code) => {
    state.exited = true;
    state.code = code;
  });
  return state;
}
async function until(predicate, state, timeout = 90000) {
  const deadline = Date.now() + timeout;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error('Launcher timeout:\n' + state.output);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}
async function closed(value) {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(value, '127.0.0.1', resolve);
  });
  await new Promise((resolve) => server.close(resolve));
}
async function main() {
  const api = await port(),
    web = await port();
  const healthy = run(api, web);
  try {
    await until(() => healthy.output.includes('LeaseIQ ready:') || healthy.exited, healthy);
    assert.equal(healthy.exited, false, healthy.output);
    assert.equal((await fetch(`http://127.0.0.1:${api}/health`)).status, 200);
    healthy.child.send({ type: 'shutdown' });
    await until(() => healthy.exited, healthy, 15000);
    assert.equal(healthy.code, 0, healthy.output);
    await closed(api);
    await closed(web);
    console.log('PASS: both services become ready; shutdown releases both ports.');
  } finally {
    if (!healthy.exited && healthy.child.connected) healthy.child.send({ type: 'shutdown' });
  }
  for (const failedService of ['api', 'web']) {
    const blocker = net.createServer((socket) => {
      socket.on('error', () => {});
      socket.destroy();
    });
    const blockedPort = failedService === 'api' ? api : web;
    await new Promise((resolve) => blocker.listen(blockedPort, '127.0.0.1', resolve));
    const failed = run(api, web);
    try {
      await until(() => failed.exited, failed, 45000);
      assert.notEqual(failed.code, 0, failed.output);
      assert.match(failed.output, /EADDRINUSE|address already in use/);
      await closed(failedService === 'api' ? web : api);
      console.log(`PASS: ${failedService} startup failure is visible and stops its sibling.`);
    } finally {
      if (!failed.exited && failed.child.connected) failed.child.send({ type: 'shutdown' });
      await new Promise((resolve) => blocker.close(resolve));
    }
  }
}
let completed = false;
process.on('beforeExit', () => {
  if (!completed) {
    console.error('Lifecycle checks did not finish.');
    process.exitCode = 1;
  }
});
main()
  .then(() => {
    completed = true;
  })
  .catch((error) => {
    completed = true;
    console.error(error);
    process.exitCode = 1;
  });
