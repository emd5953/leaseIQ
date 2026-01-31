/**
 * Test Resend Email Service
 * 
 * Tests all email workflows:
 * - Basic email sending
 * - Listing alerts
 * - Research reports
 * - Lease analysis reports
 */

import { EmailService } from '../src/services/email.service';

async function testBasicEmail() {
  console.log('\n=== Testing Basic Email ===');
  
  try {
    const result = await EmailService.send({
      to: 'test@example.com', // Replace with your email for testing
      subject: 'Test Email from LeaseIQ',
      html: '<h1>Hello from LeaseIQ!</h1><p>This is a test email.</p>',
    });

    if (result.success) {
      console.log('✓ Basic email sent successfully');
      console.log('  Message ID:', result.messageId);
    } else {
      console.error('✗ Failed to send email:', result.error);
    }
  } catch (error) {
    console.error('✗ Error:', error);
  }
}

async function testListingAlert() {
  console.log('\n=== Testing Listing Alert Email ===');
  
  const mockListings = [
    {
      address: {
        street: '123 Main St, Apt 4B',
        neighborhood: 'Upper West Side',
        city: 'New York',
      },
      price: {
        amount: 3500,
      },
      bedrooms: 2,
      bathrooms: 1,
      squareFeet: 900,
      petPolicy: {
        allowed: true,
      },
      brokerFee: {
        required: false,
      },
      sources: [
        {
          url: 'https://example.com/listing/123',
        },
      ],
    },
    {
      address: {
        street: '456 Park Ave, Unit 12',
        neighborhood: 'Midtown',
        city: 'New York',
      },
      price: {
        amount: 4200,
      },
      bedrooms: 3,
      bathrooms: 2,
      squareFeet: 1200,
      petPolicy: {
        allowed: false,
      },
      brokerFee: {
        required: true,
        amount: '1 month rent',
      },
      sources: [
        {
          url: 'https://example.com/listing/456',
        },
      ],
    },
  ];

  try {
    const result = await EmailService.sendListingAlert(
      'test@example.com', // Replace with your email
      mockListings,
      'Upper West Side 2BR'
    );

    if (result.success) {
      console.log('✓ Listing alert sent successfully');
      console.log('  Message ID:', result.messageId);
    } else {
      console.error('✗ Failed to send alert:', result.error);
    }
  } catch (error) {
    console.error('✗ Error:', error);
  }
}

async function testResearchReport() {
  console.log('\n=== Testing Research Report Email ===');
  
  const mockListing = {
    address: {
      street: '789 Broadway, Apt 5C',
      neighborhood: 'SoHo',
      city: 'New York',
    },
  };

  const mockResearch = {
    summary: 'This property is located in a well-maintained building with good landlord reviews. No major violations found in the past 2 years.',
    landlordReviews: 'Landlord is responsive and maintains the building well. Average rating: 4.2/5 based on 15 reviews.',
    violations: 'No active violations. 1 minor violation resolved in 2023.',
  };

  try {
    const result = await EmailService.sendResearchReport(
      'test@example.com', // Replace with your email
      mockListing,
      mockResearch
    );

    if (result.success) {
      console.log('✓ Research report sent successfully');
      console.log('  Message ID:', result.messageId);
    } else {
      console.error('✗ Failed to send report:', result.error);
    }
  } catch (error) {
    console.error('✗ Error:', error);
  }
}

async function testLeaseAnalysis() {
  console.log('\n=== Testing Lease Analysis Email ===');
  
  const mockAnalysis = {
    summary: 'Standard residential lease agreement for a 12-month term. Rent is $3,500/month with a security deposit of one month rent.',
    redFlags: [
      'Lease includes automatic renewal clause - requires 60 days notice to terminate',
      'Landlord can increase rent by up to 5% upon renewal',
      'Tenant responsible for all repairs under $500',
    ],
    keyTerms: {
      rent: '$3,500/month',
      deposit: '$3,500 (1 month)',
      term: '12 months (Aug 1, 2024 - Jul 31, 2025)',
      fees: 'Move-in fee: $250, Pet deposit: $500 (if applicable)',
    },
  };

  try {
    const result = await EmailService.sendLeaseAnalysis(
      'test@example.com', // Replace with your email
      mockAnalysis
    );

    if (result.success) {
      console.log('✓ Lease analysis sent successfully');
      console.log('  Message ID:', result.messageId);
    } else {
      console.error('✗ Failed to send analysis:', result.error);
    }
  } catch (error) {
    console.error('✗ Error:', error);
  }
}

async function main() {
  console.log('=== RESEND EMAIL SERVICE TESTS ===');
  console.log('Make sure RESEND_API_KEY is set in .env file');
  console.log('Replace test@example.com with your actual email address\n');

  await testBasicEmail();
  await testListingAlert();
  await testResearchReport();
  await testLeaseAnalysis();

  console.log('\n=== ALL TESTS COMPLETE ===');
}

main().catch(console.error);
