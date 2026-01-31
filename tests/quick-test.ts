#!/usr/bin/env tsx
/**
 * Quick Test Script for Resend + Reducto Workflows
 * 
 * Run this to quickly verify your setup is working
 * Usage: npm run test:workflow
 */

import { EmailService } from '../src/services/email.service';
import { ReductoService } from '../src/services/reducto.service';
import { LeaseService } from '../src/services/lease.service';

const TEST_EMAIL = 'test@example.com'; // ⚠️ CHANGE THIS TO YOUR EMAIL

async function checkConfiguration() {
  console.log('🔍 Checking Configuration...\n');
  
  const checks = {
    resend: !!process.env.RESEND_API_KEY,
    reducto: !!process.env.REDUCTO_API_KEY,
    openrouter: !!process.env.OPENROUTER_API_KEY,
  };

  console.log('Resend API Key:', checks.resend ? '✅ Set' : '❌ Missing');
  console.log('Reducto API Key:', checks.reducto ? '✅ Set' : '❌ Missing');
  console.log('OpenRouter API Key:', checks.openrouter ? '✅ Set' : '❌ Missing');
  console.log();

  const allConfigured = Object.values(checks).every(v => v);
  
  if (!allConfigured) {
    console.log('❌ Some API keys are missing. Please add them to your .env file:\n');
    if (!checks.resend) console.log('  RESEND_API_KEY=re_your_key_here');
    if (!checks.reducto) console.log('  REDUCTO_API_KEY=your_key_here');
    if (!checks.openrouter) console.log('  OPENROUTER_API_KEY=sk-or-v1-your_key_here');
    console.log();
    return false;
  }

  return true;
}

async function testEmail() {
  console.log('📧 Testing Email Service...');
  
  try {
    const result = await EmailService.send({
      to: TEST_EMAIL,
      subject: '✅ LeaseIQ Email Test',
      html: '<h1>Success!</h1><p>Your Resend integration is working correctly.</p>',
    });

    if (result.success) {
      console.log('✅ Email sent successfully!');
      console.log(`   Message ID: ${result.messageId}`);
      console.log(`   Check your inbox: ${TEST_EMAIL}\n`);
      return true;
    } else {
      console.log('❌ Email failed:', result.error, '\n');
      return false;
    }
  } catch (error) {
    console.log('❌ Email error:', error, '\n');
    return false;
  }
}

async function testLeaseAnalysis() {
  console.log('🤖 Testing Lease Analysis...');
  
  const sampleLease = `
RESIDENTIAL LEASE AGREEMENT

Rent: $3,500/month
Security Deposit: $3,500
Term: 12 months (Aug 1, 2024 - Jul 31, 2025)
Late Fee: $100 if not paid by 5th
Pet Deposit: $500 (non-refundable)
Automatic Renewal: Yes, requires 60 days notice to terminate
Rent Increase: Up to 5% upon renewal
Tenant Repairs: Responsible for repairs under $500
  `.trim();

  try {
    const analysis = await LeaseService.analyzeLease(sampleLease);
    
    console.log('✅ Analysis complete!\n');
    console.log('Summary:', analysis.summary.substring(0, 100) + '...');
    console.log('Red Flags:', analysis.redFlags.length);
    console.log('Key Terms:', Object.keys(analysis.keyTerms).length, '\n');
    
    return true;
  } catch (error) {
    console.log('❌ Analysis failed:', error, '\n');
    return false;
  }
}

async function testCompleteWorkflow() {
  console.log('🔄 Testing Complete Workflow...');
  
  const sampleLease = `
RESIDENTIAL LEASE AGREEMENT

Property: 123 Main St, Apt 4B, New York, NY
Landlord: John Smith Properties LLC
Tenant: Jane Doe

TERMS:
- Monthly Rent: $3,500 (due 1st of month)
- Security Deposit: $3,500
- Lease Term: 12 months (Aug 1, 2024 - Jul 31, 2025)
- Late Fee: $100 after 5th of month
- Pet Policy: One pet allowed, $500 deposit (non-refundable)
- Utilities: Tenant pays electricity, landlord pays water/heat
- Maintenance: Tenant responsible for repairs under $500
- Renewal: Automatic renewal unless 60 days notice given
- Rent Increase: May increase up to 5% upon renewal
- Subletting: Not permitted without written approval
  `.trim();

  try {
    // Step 1: Analyze
    console.log('  Step 1: Analyzing lease...');
    const analysis = await LeaseService.analyzeLease(sampleLease);
    console.log('  ✅ Analysis complete');

    // Step 2: Send email
    console.log('  Step 2: Sending email...');
    const emailResult = await EmailService.sendLeaseAnalysis(TEST_EMAIL, analysis);
    
    if (emailResult.success) {
      console.log('  ✅ Email sent successfully');
      console.log(`  📧 Check your inbox: ${TEST_EMAIL}\n`);
      
      // Display results
      console.log('📊 Analysis Results:');
      console.log('─'.repeat(60));
      console.log('\nSummary:', analysis.summary);
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
      console.log('─'.repeat(60) + '\n');
      
      return true;
    } else {
      console.log('  ❌ Email failed:', emailResult.error, '\n');
      return false;
    }
  } catch (error) {
    console.log('  ❌ Workflow failed:', error, '\n');
    return false;
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        RESEND + REDUCTO QUICK TEST                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Check email configuration
  if (TEST_EMAIL === 'test@example.com') {
    console.log('⚠️  WARNING: Update TEST_EMAIL in tests/quick-test.ts');
    console.log('   Current: test@example.com');
    console.log('   Change to your actual email address\n');
  }

  // Check API keys
  const configured = await checkConfiguration();
  if (!configured) {
    console.log('❌ Setup incomplete. Please configure API keys first.\n');
    process.exit(1);
  }

  console.log('✅ All API keys configured!\n');
  console.log('═'.repeat(60) + '\n');

  // Run tests
  const results = {
    email: false,
    analysis: false,
    workflow: false,
  };

  results.email = await testEmail();
  results.analysis = await testLeaseAnalysis();
  results.workflow = await testCompleteWorkflow();

  // Summary
  console.log('═'.repeat(60));
  console.log('\n📊 TEST SUMMARY\n');
  console.log('Email Service:', results.email ? '✅ PASS' : '❌ FAIL');
  console.log('Lease Analysis:', results.analysis ? '✅ PASS' : '❌ FAIL');
  console.log('Complete Workflow:', results.workflow ? '✅ PASS' : '❌ FAIL');
  console.log();

  const allPassed = Object.values(results).every(v => v);
  
  if (allPassed) {
    console.log('🎉 ALL TESTS PASSED!');
    console.log('\nYour Resend + Reducto integration is working correctly.');
    console.log('Check your email inbox for test messages.\n');
    console.log('Next steps:');
    console.log('  1. Review the analysis results above');
    console.log('  2. Check your email for the lease analysis report');
    console.log('  3. Integrate into your API routes (see lease.routes.example.ts)');
    console.log('  4. Add to your frontend\n');
  } else {
    console.log('❌ SOME TESTS FAILED');
    console.log('\nPlease review the errors above and:');
    console.log('  1. Verify API keys are correct');
    console.log('  2. Check your internet connection');
    console.log('  3. Review service status pages');
    console.log('  4. See docs/RESEND_REDUCTO_GUIDE.md for troubleshooting\n');
  }

  console.log('═'.repeat(60) + '\n');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
