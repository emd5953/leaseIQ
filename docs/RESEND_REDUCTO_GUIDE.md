# Resend + Reducto Integration Guide

Complete guide for using Resend (email) and Reducto (PDF parsing) in LeaseIQ.

## Table of Contents

- [Overview](#overview)
- [Setup](#setup)
- [Resend Email Service](#resend-email-service)
- [Reducto PDF Service](#reducto-pdf-service)
- [Complete Workflows](#complete-workflows)
- [Testing](#testing)
- [API Reference](#api-reference)

## Overview

### Resend
Resend is used for sending transactional emails including:
- Listing alerts to users
- Research reports
- Lease analysis results
- General notifications

### Reducto
Reducto is used for parsing PDF documents into structured text:
- Lease agreements
- Property documents
- Any PDF that needs AI analysis

## Setup

### 1. Environment Variables

Add these to your `.env` file:

```env
# Resend Email API
RESEND_API_KEY=re_your_api_key_here

# Reducto PDF Parsing API
REDUCTO_API_KEY=your_reducto_api_key_here

# OpenRouter (for AI analysis)
OPENROUTER_API_KEY=sk-or-v1-your_key_here
```

### 2. Install Dependencies

```bash
npm install resend
```

The Reducto client is built-in (uses native https module).

### 3. Verify Configuration

```bash
# Test Resend
npx tsx tests/test-resend-email.ts

# Test Reducto
npx tsx tests/test-reducto-pdf.ts

# Test complete workflow
npx tsx tests/test-send-reducto-workflow.ts
```

## Resend Email Service

### Basic Usage

```typescript
import { EmailService } from './src/services/email.service';

// Send basic email
const result = await EmailService.send({
  to: 'user@example.com',
  subject: 'Hello from LeaseIQ',
  html: '<h1>Welcome!</h1><p>Your message here</p>',
});

if (result.success) {
  console.log('Email sent:', result.messageId);
} else {
  console.error('Failed:', result.error);
}
```

### Listing Alerts

```typescript
const listings = [
  {
    address: {
      street: '123 Main St',
      neighborhood: 'Downtown',
      city: 'New York',
    },
    price: { amount: 3500 },
    bedrooms: 2,
    bathrooms: 1,
    squareFeet: 900,
    petPolicy: { allowed: true },
    brokerFee: { required: false },
    sources: [{ url: 'https://...' }],
  },
];

await EmailService.sendListingAlert(
  'user@example.com',
  listings,
  'Downtown 2BR Search'
);
```

### Research Reports

```typescript
const listing = {
  address: {
    street: '456 Park Ave',
    neighborhood: 'Midtown',
    city: 'New York',
  },
};

const research = {
  summary: 'Well-maintained building with good reviews',
  landlordReviews: 'Responsive landlord, 4.2/5 rating',
  violations: 'No active violations',
};

await EmailService.sendResearchReport(
  'user@example.com',
  listing,
  research
);
```

### Lease Analysis

```typescript
const analysis = {
  summary: 'Standard 12-month lease agreement',
  redFlags: [
    'Automatic renewal clause',
    'Tenant responsible for repairs under $500',
  ],
  keyTerms: {
    rent: '$3,500/month',
    deposit: '$3,500',
    term: '12 months',
    fees: 'Move-in fee: $250',
  },
};

await EmailService.sendLeaseAnalysis(
  'user@example.com',
  analysis
);
```

## Reducto PDF Service

### Basic PDF Parsing

```typescript
import { ReductoService } from './src/services/reducto.service';

const reducto = new ReductoService();

// From URL
const result = await reducto.parsePDF({
  url: 'https://example.com/lease.pdf',
});

// From buffer (file upload)
const buffer = fs.readFileSync('lease.pdf');
const result = await reducto.parsePDF({
  file: buffer,
  fileName: 'lease.pdf',
});

if (result.success) {
  console.log('Text:', result.text);
  console.log('Pages:', result.metadata?.pages);
  console.log('Chunks:', result.chunks?.length);
}
```

### Lease-Specific Parsing

```typescript
// Optimized for lease documents
const result = await reducto.parseLeasePDF({
  file: buffer,
  fileName: 'lease.pdf',
});

// Text is automatically cleaned:
// - Page markers removed
// - Underscores cleaned
// - Line breaks normalized
```

### Response Structure

```typescript
interface ReductoParseResult {
  success: boolean;
  text?: string;              // Full text content
  markdown?: string;          // Markdown formatted
  chunks?: Array<{
    content: string;
    page?: number;
    type?: string;
  }>;
  metadata?: {
    pages?: number;
    title?: string;
    author?: string;
  };
  error?: string;
}
```

## Complete Workflows

### Workflow 1: Analyze Uploaded Lease PDF

```typescript
import { LeaseService } from './src/services/lease.service';
import { EmailService } from './src/services/email.service';

// User uploads PDF
const pdfBuffer = req.file.buffer;

// Parse and analyze
const analysis = await LeaseService.analyzeLeasePDF(
  pdfBuffer,
  'user-lease.pdf'
);

// Send results via email
await EmailService.sendLeaseAnalysis(
  'user@example.com',
  analysis
);

// Return to frontend
res.json({
  success: true,
  analysis: {
    summary: analysis.summary,
    redFlags: analysis.redFlags,
    keyTerms: analysis.keyTerms,
  },
});
```

### Workflow 2: Analyze Lease from URL

```typescript
// User provides PDF URL
const pdfURL = 'https://landlord.com/lease.pdf';

// Parse and analyze
const analysis = await LeaseService.analyzeLeasePDFFromURL(pdfURL);

// Send results
await EmailService.sendLeaseAnalysis(
  'user@example.com',
  analysis
);
```

### Workflow 3: Parse Only (No Analysis)

```typescript
// Just extract text from PDF
const leaseText = await LeaseService.parseLeasePDF(
  pdfBuffer,
  'lease.pdf'
);

// Use text for other purposes
console.log('Extracted text:', leaseText);
```

## Testing

### Test Individual Services

```bash
# Test Resend email service
npx tsx tests/test-resend-email.ts

# Test Reducto PDF parsing
npx tsx tests/test-reducto-pdf.ts
```

### Test Complete Workflow

```bash
# Test full lease analysis workflow
npx tsx tests/test-send-reducto-workflow.ts
```

### Test with Real PDFs

1. Place a lease PDF at `tests/sample-lease.pdf`
2. Update `TEST_EMAIL` in test files
3. Run tests

```bash
npx tsx tests/test-send-reducto-workflow.ts
```

## API Reference

### EmailService

#### `send(options: EmailOptions)`
Send a basic email.

**Parameters:**
- `to: string` - Recipient email
- `subject: string` - Email subject
- `html: string` - HTML content
- `from?: string` - Sender (optional, defaults to LeaseIQ)

**Returns:** `{ success: boolean, messageId?: string, error?: string }`

#### `sendListingAlert(userEmail, listings, searchName)`
Send listing alert email.

#### `sendResearchReport(userEmail, listing, research)`
Send property research report.

#### `sendLeaseAnalysis(userEmail, analysis)`
Send lease analysis results.

### ReductoService

#### `parsePDF(options: ReductoParseOptions)`
Parse any PDF document.

**Parameters:**
- `file?: Buffer` - PDF file buffer
- `url?: string` - PDF URL
- `fileName?: string` - Original filename

**Returns:** `ReductoParseResult`

#### `parseLeasePDF(options: ReductoParseOptions)`
Parse lease PDF with optimizations.

#### `isConfigured()`
Check if API key is set.

### LeaseService

#### `analyzeLease(leaseText: string)`
Analyze lease text with AI.

**Returns:** `LeaseAnalysis`

#### `parseLeasePDF(pdfBuffer: Buffer, fileName?: string)`
Parse PDF to text.

**Returns:** `string` (lease text)

#### `parseLeasePDFFromURL(url: string)`
Parse PDF from URL to text.

**Returns:** `string` (lease text)

#### `analyzeLeasePDF(pdfBuffer: Buffer, fileName?: string)`
Complete workflow: parse + analyze.

**Returns:** `LeaseAnalysis` (includes `fullText`)

#### `analyzeLeasePDFFromURL(url: string)`
Complete workflow from URL: parse + analyze.

**Returns:** `LeaseAnalysis` (includes `fullText`)

## Error Handling

### Resend Errors

```typescript
const result = await EmailService.send({...});

if (!result.success) {
  // Handle error
  console.error('Email failed:', result.error);
  
  // Common errors:
  // - Invalid API key
  // - Invalid email address
  // - Rate limit exceeded
}
```

### Reducto Errors

```typescript
const result = await reducto.parsePDF({...});

if (!result.success) {
  // Handle error
  console.error('Parse failed:', result.error);
  
  // Common errors:
  // - Invalid API key
  // - Invalid PDF format
  // - File too large
  // - Timeout
}
```

### Lease Service Errors

```typescript
try {
  const analysis = await LeaseService.analyzeLeasePDF(buffer);
} catch (error) {
  // Handle error
  console.error('Analysis failed:', error.message);
  
  // Common errors:
  // - PDF parsing failed
  // - AI analysis failed
  // - Invalid lease format
}
```

## Best Practices

### Email

1. **Always validate email addresses** before sending
2. **Use appropriate from addresses** for different email types
3. **Include unsubscribe links** for marketing emails
4. **Test email templates** in multiple clients
5. **Monitor bounce rates** and delivery issues

### PDF Parsing

1. **Validate PDF files** before parsing (size, format)
2. **Set appropriate timeouts** for large files
3. **Handle parsing failures gracefully**
4. **Cache parsed results** when possible
5. **Clean extracted text** before AI analysis

### Lease Analysis

1. **Validate lease text length** before AI analysis
2. **Chunk large leases** if needed
3. **Store analysis results** for future reference
4. **Provide fallback** if AI analysis fails
5. **Review AI results** for accuracy

## Rate Limits

### Resend
- Free tier: 100 emails/day
- Paid tier: Based on plan
- Monitor usage in Resend dashboard

### Reducto
- Check your plan limits
- Implement rate limiting if needed
- Cache results when possible

### OpenRouter
- Varies by model
- Monitor token usage
- Implement retry logic

## Troubleshooting

### Email Not Sending

1. Check API key is correct
2. Verify email address format
3. Check Resend dashboard for errors
4. Verify domain is configured (if using custom domain)

### PDF Parsing Fails

1. Verify PDF is valid (not corrupted)
2. Check file size (may have limits)
3. Ensure API key is correct
4. Try with a simpler PDF first

### AI Analysis Fails

1. Check OpenRouter API key
2. Verify text length is reasonable
3. Check for rate limits
4. Review error messages

## Next Steps

1. **Set up API keys** in `.env`
2. **Run test scripts** to verify setup
3. **Integrate into your routes** (see API routes)
4. **Add error handling** for production
5. **Monitor usage** and costs

## Support

- Resend Docs: https://resend.com/docs
- Reducto Docs: https://reducto.ai/docs
- OpenRouter Docs: https://openrouter.ai/docs

For LeaseIQ-specific issues, check the main documentation or create an issue.
