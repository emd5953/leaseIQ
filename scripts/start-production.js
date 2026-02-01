/**
 * Production startup script
 * Runs both the API server and the scraper cron job
 */

const { spawn } = require('child_process');

console.log('🚀 Starting LeaseIQ Production Services...\n');

// Start API Server
console.log('📡 Starting API Server (port 3001)...');
const apiServer = spawn('npx', ['tsx', 'src/server.ts'], {
  stdio: ['inherit', 'inherit', 'inherit'],
  shell: true,
  env: { ...process.env, SERVICE: 'api' }
});

// Wait a bit for API to start, then start scraper
setTimeout(() => {
  console.log('\n🔄 Starting Scraper Cron (every 15 minutes)...');
  const scraper = spawn('npx', ['tsx', 'src/jobs/scraping-cron.ts'], {
    stdio: ['inherit', 'inherit', 'inherit'],
    shell: true,
    env: { ...process.env, SERVICE: 'scraper' }
  });

  scraper.on('error', (error) => {
    console.error('❌ Scraper failed:', error);
  });

  scraper.on('exit', (code) => {
    console.log(`\n⚠️  Scraper exited with code ${code}`);
    if (code !== 0) {
      console.log('🔄 Restarting scraper in 30 seconds...');
      setTimeout(() => {
        spawn('npx', ['tsx', 'src/jobs/scraping-cron.ts'], {
          stdio: 'inherit',
          shell: true
        });
      }, 30000);
    }
  });

  // Handle shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down services...');
    scraper.kill('SIGINT');
    apiServer.kill('SIGINT');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down services...');
    scraper.kill('SIGTERM');
    apiServer.kill('SIGTERM');
    process.exit(0);
  });
}, 3000);

apiServer.on('error', (error) => {
  console.error('❌ API Server failed:', error);
  process.exit(1);
});

apiServer.on('exit', (code) => {
  console.log(`\n⚠️  API Server exited with code ${code}`);
  process.exit(code);
});

console.log('\n✅ Services starting...');
console.log('   API Server: http://localhost:3001');
console.log('   Scraper: Running every 15 minutes');
console.log('\nPress Ctrl+C to stop all services\n');
