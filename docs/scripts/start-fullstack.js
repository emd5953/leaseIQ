const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting LeaseIQ Full Stack...\n');

// Start backend API server
console.log('📡 Starting backend API on http://localhost:3001...');
const backend = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true
});

// Wait a bit for backend to start, then start frontend
setTimeout(() => {
  console.log('\n🎨 Starting frontend on http://localhost:3000...');
  const frontend = spawn('npm', ['run', 'dev'], {
    cwd: path.join(__dirname, '..', '..', 'frontend'),
    stdio: 'inherit',
    shell: true
  });

  frontend.on('error', (error) => {
    console.error('❌ Failed to start frontend:', error);
    backend.kill();
    process.exit(1);
  });

  // Handle shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    frontend.kill('SIGINT');
    backend.kill('SIGINT');
    process.exit(0);
  });
}, 3000);

backend.on('error', (error) => {
  console.error('❌ Failed to start backend:', error);
  process.exit(1);
});

backend.on('exit', (code) => {
  if (code !== 0) {
    console.error(`❌ Backend exited with code ${code}`);
    process.exit(code);
  }
});
