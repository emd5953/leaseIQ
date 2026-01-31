const { spawn } = require('child_process');

console.log('🚀 Starting LeaseIQ...\n');

// Start the server
const server = spawn('node', ['dist/server.js'], {
  stdio: 'inherit',
  shell: true
});

// Start the alerts cron job
const alerts = spawn('tsx', ['src/jobs/alert-cron.ts'], {
  stdio: 'inherit',
  shell: true
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down...');
  server.kill();
  alerts.kill();
  process.exit();
});

server.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
  alerts.kill();
  process.exit(code);
});

alerts.on('exit', (code) => {
  console.log(`Alerts exited with code ${code}`);
  server.kill();
  process.exit(code);
});
