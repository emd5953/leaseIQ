import { EmailService } from '../src/services/email.service';

/**
 * Test script to verify Resend email works for listing alerts
 * 
 * Usage:
 *   npx tsx tests/test-alert-email.ts your-email@example.com
 */

async function testAlertEmail() {
  const testEmail = process.argv[2];
  
  if (!testEmail) {
    console.error('❌ Please provide an email address as argument');
    console.log('Usage: npx tsx tests/test-alert-email.ts your-email@example.com');
    process.exit(1);
  }

  console.log('🧪 Testing Resend email for listing alerts...');
  console.log(`📧 Sending to: ${testEmail}\n`);

  // Mock listing data
  const mockListings = [
    {
      _id: '507f1f77bcf86cd799439011',
      address: {
        street: '123 Broadway',
        neighborhood: 'Upper West Side',
        city: 'New York',
        state: 'NY',
      },
      price: { amount: 3500 },
      bedrooms: 2,
      bathrooms: 1,
      squareFeet: 900,
      petPolicy: { allowed: true },
      brokerFee: { required: false },
      sources: [{ url: 'https://example.com/listing/123' }],
    },
    {
      _id: '507f1f77bcf86cd799439012',
      address: {
        street: '456 Park Ave',
        neighborhood: 'Midtown',
        city: 'New York',
        state: 'NY',
      },
      price: { amount: 4200 },
      bedrooms: 3,
      bathrooms: 2,
      squareFeet: 1200,
      petPolicy: { allowed: false },
      brokerFee: { required: true, amount: '1 month rent' },
      sources: [{ url: 'https://example.com/listing/456' }],
    },
  ];

  try {
    const result = await EmailService.sendListingAlert(
      testEmail,
      mockListings,
      'Test Search - 2BR in Manhattan'
    );

    if (result.success) {
      console.log('✅ Email sent successfully!');
      console.log(`📬 Message ID: ${result.messageId}`);
      console.log('\n📝 Check your inbox for the alert email');
      console.log('   Subject: 🏠 2 New Listings Match Your Search: Test Search - 2BR in Manhattan');
    } else {
      console.error('❌ Email failed to send');
      console.error(`Error: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Test failed with exception:', error);
    process.exit(1);
  }
}

testAlertEmail();
