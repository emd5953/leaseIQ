/**
 * Complete Resend + Reducto Workflow Test
 * 
 * Demonstrates the full lease analysis workflow:
 * 1. Parse lease PDF with Reducto
 * 2. Analyze with AI (OpenRouter)
 * 3. Send results via email (Resend)
 */

import fs from 'fs';
import path from 'path';
import { LeaseService } from '../src/services/lease.service';
import { EmailService } from '../src/services/email.service';
import { ReductoService } from '../src/services/reducto.service';

// Configuration
const TEST_EMAIL = 'test@example.com'; // Replace with your email
const SAMPLE_LEASE_PATH = path.join(__dirname, 'sample-lease.pdf');

async function testCompleteWorkflow() {
  console.log('=== COMPLETE LEASE ANALYSIS WORKFLOW ===\n');

  // Step 1: Check configuration
  console.log('Step 1: Checking API configuration...');
  const reducto = new ReductoService();
  
  if (!reducto.isConfigured()) {
    console.error('✗ Reducto API key not configured');
    console.log('  Set REDUCTO_API_KEY in .env file');
    return;
  }
  console.log('✓ Reducto configured');

  if (!process.env.OPENROUTER_API_KEY) {
    console.error('✗ OpenRouter API key not configured');
    console.log('  Set OPENROUTER_API_KEY in .env file');
    return;
  }
  console.log('✓ OpenRouter configured');

  if (!process.env.RESEND_API_KEY) {
    console.error('✗ Resend API key not configured');
    console.log('  Set RESEND_API_KEY in .env file');
    return;
  }
  console.log('✓ Resend configured\n');

  // Step 2: Parse PDF
  console.log('Step 2: Parsing lease PDF...');
  
  let leaseText: string;
  
  if (fs.existsSync(SAMPLE_LEASE_PATH)) {
    console.log('  Using local PDF file');
    const buffer = fs.readFileSync(SAMPLE_LEASE_PATH);
    
    try {
      leaseText = await LeaseService.parseLeasePDF(buffer, 'sample-lease.pdf');
      console.log(`✓ PDF parsed successfully (${leaseText.length} characters)\n`);
    } catch (error) {
      console.error('✗ Failed to parse PDF:', error);
      return;
    }
  } else {
    console.log('  No local PDF found, using sample text');
    leaseText = getSampleLeaseText();
    console.log(`✓ Using sample lease text (${leaseText.length} characters)\n`);
  }

  // Step 3: Analyze lease
  console.log('Step 3: Analyzing lease with AI...');
  
  let analysis;
  try {
    analysis = await LeaseService.analyzeLease(leaseText);
    console.log('✓ Analysis complete\n');
    
    // Display results
    console.log('ANALYSIS RESULTS:');
    console.log('─'.repeat(60));
    console.log('\nSUMMARY:');
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
    console.log('\n' + '─'.repeat(60) + '\n');
  } catch (error) {
    console.error('✗ Failed to analyze lease:', error);
    return;
  }

  // Step 4: Send email
  console.log('Step 4: Sending analysis via email...');
  console.log(`  To: ${TEST_EMAIL}`);
  
  try {
    const emailResult = await EmailService.sendLeaseAnalysis(TEST_EMAIL, analysis);
    
    if (emailResult.success) {
      console.log('✓ Email sent successfully');
      console.log('  Message ID:', emailResult.messageId);
    } else {
      console.error('✗ Failed to send email:', emailResult.error);
    }
  } catch (error) {
    console.error('✗ Email error:', error);
  }

  console.log('\n=== WORKFLOW COMPLETE ===');
}

async function testURLWorkflow() {
  console.log('\n=== PDF FROM URL WORKFLOW ===\n');

  // Sample PDF URL (replace with actual lease PDF URL)
  const pdfURL = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

  console.log('Step 1: Parsing PDF from URL...');
  console.log(`  URL: ${pdfURL}`);

  try {
    const analysis = await LeaseService.analyzeLeasePDFFromURL(pdfURL);
    
    console.log('✓ PDF parsed and analyzed\n');
    console.log('SUMMARY:');
    console.log(analysis.summary);
    
    if (analysis.redFlags.length > 0) {
      console.log('\n⚠️  RED FLAGS:');
      analysis.redFlags.forEach((flag, i) => {
        console.log(`  ${i + 1}. ${flag}`);
      });
    }

    console.log('\nStep 2: Sending email...');
    const emailResult = await EmailService.sendLeaseAnalysis(TEST_EMAIL, analysis);
    
    if (emailResult.success) {
      console.log('✓ Email sent successfully');
    } else {
      console.error('✗ Failed to send email:', emailResult.error);
    }
  } catch (error) {
    console.error('✗ Workflow error:', error);
  }
}

function getSampleLeaseText(): string {
  return `
RESIDENTIAL LEASE AGREEMENT

This Lease Agreement ("Agreement") is entered into on August 1, 2024, between:

LANDLORD: John Smith Properties LLC
Address: 456 Property Management Blvd, New York, NY 10002
Phone: (555) 123-4567

TENANT: Jane Doe
Phone: (555) 987-6543
Email: jane.doe@email.com

PROPERTY ADDRESS: 123 Main Street, Apartment 4B, New York, NY 10001

LEASE TERMS AND CONDITIONS:

1. RENT
   Monthly Rent: $3,500.00
   Due Date: 1st day of each month
   Payment Method: Check, bank transfer, or online portal
   Late Fee: $100.00 if not received by the 5th of the month
   Returned Check Fee: $50.00

2. SECURITY DEPOSIT
   Amount: $3,500.00 (one month's rent)
   Held in: Escrow account at First National Bank
   Return: Within 30 days of lease termination, minus any deductions for damages

3. LEASE TERM
   Start Date: August 1, 2024
   End Date: July 31, 2025
   Duration: 12 months

4. UTILITIES AND SERVICES
   Tenant Responsible For:
   - Electricity
   - Internet/Cable
   - Renter's Insurance (required, minimum $100,000 liability)
   
   Landlord Responsible For:
   - Water and Sewer
   - Heat and Hot Water
   - Building Maintenance
   - Trash Removal

5. PETS
   - One cat or dog under 40 lbs permitted
   - Additional Pet Deposit: $500.00 (non-refundable)
   - Monthly Pet Rent: $50.00
   - Tenant responsible for all pet-related damages

6. MAINTENANCE AND REPAIRS
   - Tenant responsible for repairs under $500
   - Landlord responsible for major repairs and appliances
   - Emergency repairs: Contact landlord immediately at (555) 123-4567
   - Non-emergency repairs: Submit request via online portal within 48 hours

7. LEASE RENEWAL AND TERMINATION
   - Automatic Renewal: Lease automatically renews for another 12 months unless 60 days written notice is provided by either party
   - Rent Increase: Upon renewal, rent may increase by up to 5% annually
   - Early Termination: Requires 2 months' rent as penalty, plus forfeiture of security deposit

8. SUBLETTING AND ASSIGNMENT
   - Subletting not permitted without written landlord approval
   - Unauthorized subletting is grounds for immediate lease termination
   - Assignment fee: $500 if approved

9. PROPERTY USE
   - Residential use only
   - No commercial activities permitted
   - Maximum occupancy: 3 persons
   - Quiet hours: 10 PM - 8 AM daily

10. LANDLORD ACCESS
    - Landlord may enter with 24 hours notice for:
      * Repairs and maintenance
      * Inspections (maximum quarterly)
      * Showing to prospective tenants (last 60 days of lease)
    - Emergency access permitted without notice

11. TENANT OBLIGATIONS
    - Maintain cleanliness and sanitary conditions
    - Dispose of trash properly
    - Report maintenance issues promptly
    - Not disturb other tenants
    - Comply with building rules and regulations

12. PROHIBITED ACTIVITIES
    - Smoking inside the apartment (balcony permitted)
    - Illegal activities
    - Alterations without written permission
    - Excessive noise or disturbances

13. INSURANCE
    - Tenant must maintain renter's insurance with minimum $100,000 liability coverage
    - Proof of insurance required within 14 days of move-in
    - Landlord not responsible for tenant's personal property

14. DEFAULT AND REMEDIES
    - Failure to pay rent: 5-day notice to pay or quit
    - Violation of lease terms: 10-day notice to cure or quit
    - Landlord may pursue eviction proceedings and damages

15. ADDITIONAL FEES
    - Move-in Administrative Fee: $250.00 (one-time, non-refundable)
    - Key Replacement: $75.00 per key
    - Lock Change (if requested): $150.00
    - Parking Space (optional): $200.00/month

TENANT ACKNOWLEDGMENTS:
- I have inspected the property and accept it in its current condition
- I have received a copy of building rules and regulations
- I understand all terms and conditions of this lease
- I have been provided with lead paint disclosure (if applicable)

TENANT SIGNATURE: _________________________ DATE: __________
PRINT NAME: Jane Doe

LANDLORD SIGNATURE: _________________________ DATE: __________
PRINT NAME: John Smith
  `.trim();
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     RESEND + REDUCTO COMPLETE WORKFLOW TEST                ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('This test demonstrates the complete lease analysis workflow:');
  console.log('  1. Parse PDF with Reducto API');
  console.log('  2. Analyze with OpenRouter AI');
  console.log('  3. Send results via Resend email\n');

  console.log('CONFIGURATION:');
  console.log(`  Test Email: ${TEST_EMAIL}`);
  console.log(`  Sample PDF: ${SAMPLE_LEASE_PATH}`);
  console.log('  (Update these values in the script)\n');

  console.log('═'.repeat(60) + '\n');

  // Run complete workflow
  await testCompleteWorkflow();

  // Optionally test URL workflow
  // await testURLWorkflow();

  console.log('\n' + '═'.repeat(60));
  console.log('\nNEXT STEPS:');
  console.log('  1. Check your email for the lease analysis report');
  console.log('  2. Review the analysis results above');
  console.log('  3. Place a real lease PDF at tests/sample-lease.pdf to test with actual documents');
  console.log('  4. Update TEST_EMAIL constant to your email address\n');
}

main().catch(console.error);
