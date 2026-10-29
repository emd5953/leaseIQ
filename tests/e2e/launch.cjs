// Dedicated fixture process. Never inherit paid-service or production database credentials.
const { spawn } = require('node:child_process');
const env = { ...process.env };
for (const name of Object.keys(env))
  if (
    /MONGO|RESEND|REDUCTO|OPENROUTER|GOOGLE|JWT|FIRECRAWL|NEXT_PUBLIC|API_INTERNAL|EMAIL_FROM/.test(
      name,
    )
  )
    delete env[name];
Object.assign(env, {
  NODE_ENV: 'test',
  LEASEIQ_E2E: '1',
  PORT: '3101',
  FRONTEND_PORT: '3100',
  NEXT_DIST_DIR: '.next-e2e',
  NEXT_PUBLIC_API_URL: '',
  FRONTEND_URL: 'http://127.0.0.1:3100',
  JWT_SECRET: 'isolated-browser-fixture-signing-key-never-deploy-73957',
  GOOGLE_OAUTH_CLIENT_ID: 'fixture.apps.googleusercontent.com',
  GOOGLE_OAUTH_CLIENT_SECRET: 'fixture',
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: 'fixture.apps.googleusercontent.com',
  OPENROUTER_API_KEY: 'fixture',
  REDUCTO_API_KEY: 'fixture',
  RESEND_API_KEY: 'fixture',
});
const child = spawn(process.execPath, ['scripts/dev.cjs'], {
  env,
  stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
  windowsHide: true,
});
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  if (child.connected) child.send({ type: 'shutdown' });
  else child.kill('SIGTERM');
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
child.on('exit', (code) => process.exit(code || 0));
