const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting LeaseIQ Frontend...\n');

// Start frontend dev server
const frontend = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, 'frontend'),
  stdio: 'inherit',
  shell: true
});

frontend.on('error', (error) => {
  console.error('❌ Failed to start frontend:', error);
  process.exit(1);
});

frontend.on('exit', (code) => {
  if (code !== 0) {
    console.error(`❌ Frontend exited with code ${code}`);
    process.exit(code);
  }
});

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down frontend...');
  frontend.kill('SIGINT');
  process.exit(0);
});
