/**
 * Test Reducto PDF Parsing Service
 * 
 * Tests PDF parsing workflows:
 * - Parse PDF from URL
 * - Parse PDF from buffer (file upload simulation)
 * - Parse lease PDF specifically
 * - Full lease analysis workflow
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { ReductoService } from '../src/services/reducto.service';
import { LeaseService } from '../src/services/lease.service';

async function downloadSamplePDF(): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // Sample lease PDF URL (public domain)
    const url = 'https://www.lawdepot.com/contracts/residential-lease-agreement/sample/';
    
    https.get(url, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
  });
}

async function testParseFromURL() {
  console.log('\n=== Testing Parse PDF from URL ===');
  
  try {
    const reducto = new ReductoService();
    
    if (!reducto.isConfigured()) {
      console.error('✗ Reducto API key not configured');
      return;
    }

    // Sample PDF URL (replace with actual lease PDF URL for testing)
    const testURL = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
    
    console.log('Parsing PDF from URL...');
    const result = await reducto.parsePDF({ url: testURL });

    if (result.success) {
      console.log('✓ PDF parsed successfully');
      console.log('  Pages:', result.metadata?.pages);
      console.log('  Text length:', result.text?.length, 'characters');
      console.log('  Chunks:', result.chunks?.length);
      console.log('\nFirst 200 characters:');
      console.log(result.text?.substring(0, 200));
    } else {
      console.error('✗ Failed to parse PDF:', result.error);
    }
  } catch (error) {
    console.error('✗ Error:', error);
  }
}

async function testParseFromBuffer() {
  console.log('\n=== Testing Parse PDF from Buffer ===');
  
  try {
    const reducto = new ReductoService();
    
    if (!reducto.isConfigured()) {
      console.error('✗ Reducto API key not configured');
      return;
    }

    // Check if sample PDF exists locally
    const samplePath = path.join(__dirname, 'sample-lease.pdf');
    
    if (!fs.existsSync(samplePath)) {
      console.log('No local sample PDF found. Skipping buffer test.');
      console.log('To test: Place a PDF file at tests/sample-lease.pdf');
      return;
    }

    const buffer = fs.readFileSync(samplePath);
    console.log('Parsing PDF from buffer...');
    
    const result = await reducto.parsePDF({
      file: buffer,
      fileName: 'sample-lease.pdf',
    });

    if (result.success) {
      console.log('✓ PDF parsed successfully');
      console.log('  Pages:', result.metadata?.pages);
      console.log('  Text length:', result.text?.length, 'characters');
      console.log('  Chunks:', result.chunks?.length);
      console.log('\nFirst 200 characters:');
      console.log(result.text?.substring(0, 200));
    } else {
      console.error('✗ Failed to parse PDF:', result.error);
    }
  } catch (error) {
    console.error('✗ Error:', error);
  }
}

async function testParseLeasePDF() {
  console.log('\n=== Testing Parse Lease PDF (Optimized) ===');
  
  try {
    const reducto = new ReductoService();
    
    if (!reducto.isConfigured()) {
      console.error('✗ Reducto API key not configured');
      return;
    }

    // Sample lease PDF URL
    const testURL = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
    
    console.log('Parsing lease PDF with optimizations...');
    const result = await reducto.parseLeasePDF({ url: testURL });

    if (result.success) {
      console.log('✓ Lease PDF parsed successfully');
      console.log('  Pages:', result.metadata?.pages);
      console.log('  Text length:', result.text?.length, 'characters');
      console.log('\nCleaned text preview:');
      console.log(result.text?.substring(0, 300));
    } else {
      console.error('✗ Failed to parse lease PDF:', result.error);
    }
  } catch (error) {
    console.error('✗ Error:', error);
  }
}

async function testFullLeaseWorkflow() {
  console.log('\n=== Testing Full Lease Analysis Workflow ===');
  console.log('(Reducto PDF parsing + OpenRouter AI analysis)');
  
  try {
    // Sample lease text (simulating parsed PDF)
    const sampleLeaseText = `
RESIDENTIAL LEASE AGREEMENT

This Lease Agreement ("Agreement") is entered into on August 1, 2024, between:

LANDLORD: John Smith Properties LLC
TENANT: Jane Doe

PROPERTY: 123 Main Street, Apartment 4B, New York, NY 10001

TERMS:
1. RENT: Tenant agrees to pay $3,500 per month, due on the 1st of each month.
2. SECURITY DEPOSIT: $3,500 (one month's rent)
3. LEASE TERM: 12 months, from August 1, 2024 to July 31, 2025
4. LATE FEE: $100 if rent is not received by the 5th of the month
5. UTILITIES: Tenant responsible for electricity and internet. Landlord pays water and heat.
6. PETS: One cat or dog allowed with additional $500 pet deposit (non-refundable)
7. MAINTENANCE: Tenant responsible for repairs under $500
8. RENEWAL: Lease automatically renews for another 12 months unless 60 days written notice is provided
9. RENT INCREASE: Upon renewal, rent may increase by up to 5% annually
10. SUBLETTING: Not permitted without written landlord approval

TENANT SIGNATURE: _________________ DATE: _________
LANDLORD SIGNATURE: _________________ DATE: _________
    `.trim();

    console.log('Analyzing lease text...');
    const analysis = await LeaseService.analyzeLease(sampleLeaseText);

    console.log('\n✓ Lease analysis complete!\n');
    console.log('SUMMARY:');
    console.log(analysis.summary);
    console.log('\nKEY TERMS:');
    console.log('  Rent:', analysis.keyTerms.rent || 'N/A');
    console.log('  Deposit:', analysis.keyTerms.deposit || 'N/A');
    console.log('  Term:', analysis.keyTerms.term || 'N/A');
    console.log('  Fees:', analysis.keyTerms.fees || 'N/A');
    
    if (analysis.redFlags.length > 0) {
      console.log('\n⚠️  RED FLAGS:');
      analysis.redFlags.forEach((flag, i) => {
        console.log(`  ${i + 1}. ${flag}`);
      });
    } else {
      console.log('\n✓ No major red flags detected');
    }
  } catch (error) {
    console.error('✗ Error:', error);
  }
}

async function testLeaseServiceIntegration() {
  console.log('\n=== Testing LeaseService with Reducto Integration ===');
  
  try {
    const samplePath = path.join(__dirname, 'sample-lease.pdf');
    
    if (!fs.existsSync(samplePath)) {
      console.log('No local sample PDF found. Skipping integration test.');
      console.log('To test: Place a lease PDF at tests/sample-lease.pdf');
      return;
    }

    const buffer = fs.readFileSync(samplePath);
    console.log('Parsing and analyzing lease PDF...');
    
    const analysis = await LeaseService.analyzeLeasePDF(buffer, 'sample-lease.pdf');

    console.log('\n✓ Complete workflow successful!\n');
    console.log('SUMMARY:');
    console.log(analysis.summary);
    console.log('\nKEY TERMS:');
    console.log('  Rent:', analysis.keyTerms.rent || 'N/A');
    console.log('  Deposit:', analysis.keyTerms.deposit || 'N/A');
    console.log('  Term:', analysis.keyTerms.term || 'N/A');
    console.log('  Fees:', analysis.keyTerms.fees || 'N/A');
    
    if (analysis.redFlags.length > 0) {
      console.log('\n⚠️  RED FLAGS:');
      analysis.redFlags.forEach((flag, i) => {
        console.log(`  ${i + 1}. ${flag}`);
      });
    }
    
    console.log('\nFull text length:', analysis.fullText?.length, 'characters');
  } catch (error) {
    console.error('✗ Error:', error);
  }
}

async function main() {
  console.log('=== REDUCTO PDF PARSING SERVICE TESTS ===');
  console.log('Make sure REDUCTO_API_KEY is set in .env file');
  console.log('Make sure OPENROUTER_API_KEY is set for AI analysis\n');

  // Test individual components
  await testParseFromURL();
  await testParseFromBuffer();
  await testParseLeasePDF();
  
  // Test full workflow
  await testFullLeaseWorkflow();
  await testLeaseServiceIntegration();

  console.log('\n=== ALL TESTS COMPLETE ===');
  console.log('\nNOTE: Some tests may be skipped if sample PDFs are not available.');
  console.log('For full testing, place a lease PDF at: tests/sample-lease.pdf');
}

main().catch(console.error);
