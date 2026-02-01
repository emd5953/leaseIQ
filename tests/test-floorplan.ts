/**
 * Test Floor Plan Analyzer
 * 
 * Tests the FloorPlanService with a sample floor plan image URL
 */

import { FloorPlanService } from '../src/services/floorplan.service';

// Sample floor plan image URL (public domain floor plan)
const SAMPLE_FLOOR_PLAN_URL = 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800';

async function testFloorPlanFromURL() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           FLOOR PLAN ANALYZER TEST                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('Testing floor plan analysis from URL...\n');
  console.log('URL:', SAMPLE_FLOOR_PLAN_URL);
  console.log('─'.repeat(60));

  try {
    const analysis = await FloorPlanService.analyzeFloorPlanFromURL(SAMPLE_FLOOR_PLAN_URL);

    console.log('\n✅ Floor plan analyzed successfully!\n');
    console.log('─'.repeat(60));
    console.log('LAYOUT');
    console.log('─'.repeat(60));
    console.log(`  Bedrooms: ${analysis.layout.bedrooms}`);
    console.log(`  Bathrooms: ${analysis.layout.bathrooms}`);
    console.log(`  Total Rooms: ${analysis.layout.totalRooms}`);
    if (analysis.layout.estimatedSquareFeet) {
      console.log(`  Est. Square Feet: ${analysis.layout.estimatedSquareFeet}`);
    }

    console.log('\n─'.repeat(60));
    console.log('SPACE EFFICIENCY');
    console.log('─'.repeat(60));
    console.log(`  Rating: ${analysis.spaceEfficiency}`);

    console.log('\n─'.repeat(60));
    console.log('FEATURES');
    console.log('─'.repeat(60));
    analysis.features.forEach(f => console.log(`  • ${f}`));

    console.log('\n─'.repeat(60));
    console.log('PROS');
    console.log('─'.repeat(60));
    analysis.pros.forEach(p => console.log(`  ✓ ${p}`));

    console.log('\n─'.repeat(60));
    console.log('CONS');
    console.log('─'.repeat(60));
    analysis.cons.forEach(c => console.log(`  ✗ ${c}`));

    console.log('\n─'.repeat(60));
    console.log('SUMMARY');
    console.log('─'.repeat(60));
    console.log(`  ${analysis.summary}`);

    console.log('\n─'.repeat(60));
    console.log('RECOMMENDATIONS');
    console.log('─'.repeat(60));
    analysis.recommendations.forEach(r => console.log(`  → ${r}`));

    console.log('\n═'.repeat(60));
    console.log('✅ Test completed successfully!');
    console.log('═'.repeat(60));

    return true;
  } catch (error) {
    console.error('\n❌ Floor plan analysis failed:', error);
    return false;
  }
}

// Run the test
testFloorPlanFromURL()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('Test error:', err);
    process.exit(1);
  });
