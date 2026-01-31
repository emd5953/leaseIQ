/**
 * Test Combined Analysis (Lease + Floor Plan)
 * 
 * Tests the complete workflow of analyzing both lease PDFs and floor plan images
 */

import fs from 'fs';
import path from 'path';
import { CombinedAnalysisService } from '../src/services/combined-analysis.service';
import { FloorPlanService } from '../src/services/floorplan.service';
import { LeaseService } from '../src/services/lease.service';

const TEST_EMAIL = 'test@example.com'; // ⚠️ CHANGE THIS

async function testFloorPlanOnly() {
  console.log('\n=== Testing Floor Plan Analysis Only ===');
  
  const sampleFloorPlanPath = path.join(__dirname, 'sample-floorplan.png');
  
  if (!fs.existsSync(sampleFloorPlanPath)) {
    console.log('⚠️  No sample floor plan found at tests/sample-floorplan.png');
    console.log('   Skipping floor plan test');
    console.log('   To test: Add a floor plan image at tests/sample-floorplan.png\n');
    return;
  }

  try {
    const buffer = fs.readFileSync(sampleFloorPlanPath);
    console.log('Analyzing floor plan image...');
    
    const analysis = await FloorPlanService.analyzeFloorPlan(buffer, 'image/png');
    
    console.log('✅ Floor plan analyzed!\n');
    console.log('Layout:');
    console.log(`  Bedrooms: ${analysis.layout.bedrooms}`);
    console.log(`  Bathrooms: ${analysis.layout.bathrooms}`);
    console.log(`  Total Rooms: ${analysis.layout.totalRooms}`);
    if (analysis.layout.estimatedSquareFeet) {
      console.log(`  Est. Square Feet: ${analysis.layout.estimatedSquareFeet}`);
    }
    
    console.log(`\nSpace Efficiency: ${analysis.spaceEfficiency}`);
    
    if (analysis.features.length > 0) {
      console.log('\nFeatures:');
      analysis.features.forEach(f => console.log(`  • ${f}`));
    }
    
    if (analysis.pros.length > 0) {
      console.log('\n✓ Pros:');
      analysis.pros.forEach(p => console.log(`  • ${p}`));
    }
    
    if (analysis.cons.length > 0) {
      console.log('\n⚠️  Cons:');
      analysis.cons.forEach(c => console.log(`  • ${c}`));
    }
    
    console.log('\nSummary:');
    console.log(analysis.summary);
    
    if (analysis.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      analysis.recommendations.forEach(r => console.log(`  • ${r}`));
    }
    
    console.log();
  } catch (error) {
    console.error('✗ Floor plan analysis failed:', error);
  }
}

async function testCombinedAnalysis() {
  console.log('\n=== Testing Combined Analysis (Lease + Floor Plan) ===');
  
  const leasePath = path.join(__dirname, 'sample-lease.pdf');
  const floorPlanPath = path.join(__dirname, 'sample-floorplan.png');
  
  const hasLease = fs.existsSync(leasePath);
  const hasFloorPlan = fs.existsSync(floorPlanPath);
  
  if (!hasLease && !hasFloorPlan) {
    console.log('⚠️  No sample files found');
    console.log('   Add files at:');
    console.log('   - tests/sample-lease.pdf');
    console.log('   - tests/sample-floorplan.png');
    console.log('   Using mock data instead...\n');
    
    // Use mock data
    await testWithMockData();
    return;
  }

  try {
    const input: any = {
      userEmail: TEST_EMAIL,
      sendEmail: false, // Set to true to test email
    };

    if (hasLease) {
      console.log('✓ Found lease PDF');
      input.leasePDF = {
        buffer: fs.readFileSync(leasePath),
        fileName: 'sample-lease.pdf',
      };
    }

    if (hasFloorPlan) {
      console.log('✓ Found floor plan image');
      input.floorPlanImage = {
        buffer: fs.readFileSync(floorPlanPath),
        mimeType: 'image/png',
        fileName: 'sample-floorplan.png',
      };
    }

    console.log('\nAnalyzing...');
    const analysis = await CombinedAnalysisService.analyzeCombined(input);
    
    console.log('\n✅ Combined analysis complete!\n');
    console.log('═'.repeat(60));
    console.log('OVERALL ASSESSMENT');
    console.log('═'.repeat(60));
    console.log(`\nMatch Score: ${analysis.overallAssessment.matchScore}/100`);
    console.log(`\nSummary: ${analysis.overallAssessment.summary}`);
    
    if (analysis.overallAssessment.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      analysis.overallAssessment.recommendations.forEach(r => {
        console.log(`  • ${r}`);
      });
    }
    
    if (analysis.overallAssessment.concerns.length > 0) {
      console.log('\n⚠️  Concerns:');
      analysis.overallAssessment.concerns.forEach(c => {
        console.log(`  • ${c}`);
      });
    }
    
    if (analysis.floorPlan) {
      console.log('\n' + '─'.repeat(60));
      console.log('FLOOR PLAN DETAILS');
      console.log('─'.repeat(60));
      console.log(`\nLayout: ${analysis.floorPlan.layout.bedrooms}BR / ${analysis.floorPlan.layout.bathrooms}BA`);
      console.log(`Space Efficiency: ${analysis.floorPlan.spaceEfficiency}`);
    }
    
    if (analysis.lease) {
      console.log('\n' + '─'.repeat(60));
      console.log('LEASE DETAILS');
      console.log('─'.repeat(60));
      console.log(`\nRent: ${analysis.lease.keyTerms.rent || 'N/A'}`);
      console.log(`Deposit: ${analysis.lease.keyTerms.deposit || 'N/A'}`);
      console.log(`Term: ${analysis.lease.keyTerms.term || 'N/A'}`);
      console.log(`Red Flags: ${analysis.lease.redFlags.length}`);
    }
    
    console.log('\n' + '═'.repeat(60) + '\n');
    
    if (input.sendEmail) {
      console.log(analysis.emailSent ? '✅ Email sent!' : '❌ Email failed');
    }
  } catch (error) {
    console.error('✗ Combined analysis failed:', error);
  }
}

async function testWithMockData() {
  console.log('Using mock lease text for testing...\n');
  
  const mockLeaseText = `
RESIDENTIAL LEASE AGREEMENT

Property: 123 Main St, Apt 4B, New York, NY
Monthly Rent: $3,500
Security Deposit: $3,500
Lease Term: 12 months (Aug 1, 2024 - Jul 31, 2025)

TERMS:
- Late Fee: $100 after 5th of month
- Pet Policy: One pet allowed, $500 deposit
- Utilities: Tenant pays electricity
- Maintenance: Tenant responsible for repairs under $500
- Renewal: Automatic renewal unless 60 days notice
- Rent Increase: May increase up to 5% upon renewal
  `.trim();

  try {
    console.log('Analyzing mock lease...');
    const analysis = await LeaseService.analyzeLease(mockLeaseText);
    
    console.log('✅ Analysis complete!\n');
    console.log('Summary:', analysis.summary);
    console.log('\nKey Terms:');
    console.log('  Rent:', analysis.keyTerms.rent || 'N/A');
    console.log('  Deposit:', analysis.keyTerms.deposit || 'N/A');
    console.log('  Term:', analysis.keyTerms.term || 'N/A');
    
    if (analysis.redFlags.length > 0) {
      console.log('\n⚠️  Red Flags:');
      analysis.redFlags.forEach((flag, i) => {
        console.log(`  ${i + 1}. ${flag}`);
      });
    }
    console.log();
  } catch (error) {
    console.error('✗ Analysis failed:', error);
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     COMBINED ANALYSIS TEST (Lease + Floor Plan)           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('This test analyzes both lease PDFs and floor plan images.');
  console.log('For best results, add sample files:');
  console.log('  • tests/sample-lease.pdf');
  console.log('  • tests/sample-floorplan.png\n');

  console.log('Test email:', TEST_EMAIL);
  console.log('(Update TEST_EMAIL in this file to test email delivery)\n');

  console.log('═'.repeat(60));

  // Test floor plan only
  await testFloorPlanOnly();

  // Test combined analysis
  await testCombinedAnalysis();

  console.log('═'.repeat(60));
  console.log('\n✅ ALL TESTS COMPLETE\n');
  
  console.log('NEXT STEPS:');
  console.log('  1. Add sample files for full testing');
  console.log('  2. Update TEST_EMAIL to receive analysis emails');
  console.log('  3. Set sendEmail: true in testCombinedAnalysis()');
  console.log('  4. Check your email inbox\n');
}

main().catch(console.error);
