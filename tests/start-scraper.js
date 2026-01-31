/**
 * Start the automatic NYC apartment scraper
 * Runs every 15 minutes and stores listings in MongoDB
 * 
 * Usage: node start-scraper.js
 */

const { spawn } = require('child_process');

console.log('🚀 Starting NYC apartment scraper...');
console.log('📍 Target: New York City apartments');
console.log('⏰ Schedule: Every 15 minutes');
console.log('🎯 Goal: 100+ listings per run');
console.log('');

const scraper = spawn('npx', ['tsx', 'src/jobs/scraping-cron.ts'], {
  stdio: 'inherit',
  shell: true
});

scraper.on('error', (error) => {
  console.error('❌ Failed to start scraper:', error);
  process.exit(1);
});

scraper.on('exit', (code) => {
  console.log(`\n⚠️  Scraper exited with code ${code}`);
  process.exit(code);
});

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping scraper...');
  scraper.kill('SIGINT');
});
