/**
 * Test Floor Plan Analyzer
 * 
 * Tests the FloorPlanService with a sample floor plan image
 */

import http from 'http';
import https from 'https';
import { FloorPlanService } from '../src/services/floorplan.service';

// Use a reliable image hosting service
const SAMPLE_FLOOR_PLAN_URL = 'https://i.imgur.com/JQxMZGy.png'; // Simple floor plan

async function downloadImage(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const request = protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          console.log(`  Redirecting to: ${redirectUrl.substring(0, 50)}...`);
          downloadImage(redirectUrl).then(resolve).catch(reject);
          return;
        }
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }
      
      const chunks: Buffer[] = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        // Check if it's actually an image
        const contentType = response.headers['content-type'] || '';
        console.log(`  Content-Type: ${contentType}`);
        console.log(`  Size: ${buffer.length} bytes`);
        
        // Check for HTML response (error page)
        if (contentType.includes('text/html') || buffer.toString('utf8', 0, 100).includes('<!DOCTYPE')) {
          reject(new Error('Received HTML instead of image'));
          return;
        }
        
        resolve(buffer);
      });
      response.on('error', reject);
    });
    
    request.on('error', reject);
  });
}

async function testFloorPlanAnalysis() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           FLOOR PLAN ANALYZER TEST                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // First, test the URL-based analysis directly
  console.log('Test 1: Analyzing floor plan from URL...');
  console.log('─'.repeat(60));
  console.log(`URL: ${SAMPLE_FLOOR_PLAN_URL}\n`);

  try {
    const analysis = await FloorPlanService.analyzeFloorPlanFromURL(SAMPLE_FLOOR_PLAN_URL);
    printAnalysis(analysis);
    return true;
  } catch (error) {
    console.error('URL analysis failed:', error);
    console.log('\nTrying buffer-based analysis...\n');
    
    // Fallback: download and analyze
    try {
      console.log('Downloading image...');
      const imageBuffer = await downloadImage(SAMPLE_FLOOR_PLAN_URL);
      
      console.log('\nAnalyzing downloaded image...');
      const analysis = await FloorPlanService.analyzeFloorPlan(imageBuffer, 'image/png');
      printAnalysis(analysis);
      return true;
    } catch (downloadError) {
      console.error('Buffer analysis also failed:', downloadError);
      return false;
    }
  }
}

function printAnalysis(analysis: any) {
  console.log('\n✅ Floor plan analyzed!\n');
  console.log('─'.repeat(60));
  console.log('LAYOUT');
  console.log('─'.repeat(60));
  console.log(`  Bedrooms: ${analysis.layout.bedrooms}`);
  console.log(`  Bathrooms: ${analysis.layout.bathrooms}`);
  console.log(`  Total Rooms: ${analysis.layout.totalRooms}`);
  if (analysis.layout.estimatedSquareFeet) {
    console.log(`  Est. Square Feet: ${analysis.layout.estimatedSquareFeet}`);
  }

  console.log('\n' + '─'.repeat(60));
  console.log('SPACE EFFICIENCY');
  console.log('─'.repeat(60));
  console.log(`  Rating: ${analysis.spaceEfficiency}`);

  if (analysis.features.length > 0) {
    console.log('\n' + '─'.repeat(60));
    console.log('FEATURES');
    console.log('─'.repeat(60));
    analysis.features.forEach((f: string) => console.log(`  • ${f}`));
  }

  if (analysis.pros.length > 0) {
    console.log('\n' + '─'.repeat(60));
    console.log('PROS');
    console.log('─'.repeat(60));
    analysis.pros.forEach((p: string) => console.log(`  ✓ ${p}`));
  }

  if (analysis.cons.length > 0) {
    console.log('\n' + '─'.repeat(60));
    console.log('CONS');
    console.log('─'.repeat(60));
    analysis.cons.forEach((c: string) => console.log(`  ✗ ${c}`));
  }

  console.log('\n' + '─'.repeat(60));
  console.log('SUMMARY');
  console.log('─'.repeat(60));
  console.log(`  ${analysis.summary}`);

  if (analysis.recommendations.length > 0) {
    console.log('\n' + '─'.repeat(60));
    console.log('RECOMMENDATIONS');
    console.log('─'.repeat(60));
    analysis.recommendations.forEach((r: string) => console.log(`  → ${r}`));
  }

  console.log('\n' + '═'.repeat(60));
}

// Run the test
testFloorPlanAnalysis()
  .then(success => {
    console.log(success ? '✅ Test completed successfully!' : '❌ Test failed');
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Test error:', err);
    process.exit(1);
  });
