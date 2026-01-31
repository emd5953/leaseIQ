# 🚀 Quick Start: Resend + Reducto

Get up and running with lease analysis in 5 minutes.

## Step 1: Configure (2 minutes)

Add to `.env`:
```env
RESEND_API_KEY=re_your_key_here
REDUCTO_API_KEY=your_key_here
OPENROUTER_API_KEY=sk-or-v1-your_key_here
```

## Step 2: Update Email (30 seconds)

Edit `tests/quick-test.ts`:
```typescript
const TEST_EMAIL = 'your-email@example.com'; // Change this
```

## Step 3: Test (2 minutes)

```bash
npm run test:workflow
```

Expected output:
```
✅ All API keys configured!
✅ Email sent successfully!
✅ Analysis complete!
✅ Email sent successfully!

🎉 ALL TESTS PASSED!
```

## Step 4: Check Email (1 minute)

Check your inbox for 2 emails:
1. ✅ Test email
2. 📄 Lease analysis report

## Done! ✅

Your Resend + Reducto integration is working!

## What's Next?

### Quick Integration (30 minutes)
```bash
# 1. Copy example routes
cp src/api/routes/lease.routes.example.ts src/api/routes/lease.routes.ts

# 2. Add to your Express app
# See: src/api/routes/lease.routes.example.ts

# 3. Test with Postman
POST http://localhost:3001/api/lease/analyze
```

### Full Documentation
- **[Complete Guide](docs/RESEND_REDUCTO_GUIDE.md)** - Everything you need
- **[Integration Checklist](docs/INTEGRATION_CHECKLIST.md)** - Step-by-step
- **[Workflow Diagrams](docs/WORKFLOW_DIAGRAM.md)** - Visual guide
- **[Testing Guide](tests/README-WORKFLOWS.md)** - Test all features

## Usage Example

```typescript
import { LeaseService, EmailService } from './src/services';

// Parse and analyze lease PDF
const analysis = await LeaseService.analyzeLeasePDF(pdfBuffer);

// Send results via email
await EmailService.sendLeaseAnalysis('user@example.com', analysis);

// Display results
console.log(analysis.summary);
console.log(analysis.redFlags);
console.log(analysis.keyTerms);
```

## Test Commands

```bash
npm run test:workflow       # Quick test (recommended)
npm run test:resend         # Email only
npm run test:reducto        # PDF parsing only
npm run test:workflow-full  # Complete workflow
```

## Troubleshooting

### Email not received?
- Check spam folder
- Verify email in `tests/quick-test.ts`
- Check Resend dashboard

### Tests failing?
- Verify API keys in `.env`
- Check internet connection
- Review error messages

### Need help?
- See [Complete Guide](docs/RESEND_REDUCTO_GUIDE.md)
- Check [Integration Checklist](docs/INTEGRATION_CHECKLIST.md)
- Review test files for examples

## Features

✅ Parse PDF leases (Reducto)  
✅ AI analysis (OpenRouter)  
✅ Email delivery (Resend)  
✅ Red flag detection  
✅ Key terms extraction  
✅ Beautiful email templates  

## Cost per Analysis

- Reducto: ~$0.01-0.05
- AI: ~$0.002-0.03
- Email: ~$0.001
- **Total: ~$0.01-0.08**

## Architecture

```
PDF Upload → Reducto → AI Analysis → Resend → User Email
```

## Files Created

```
src/services/
  ├── reducto.service.ts       # PDF parsing
  ├── lease.service.ts         # Lease analysis
  └── email.service.ts         # Email sending

tests/
  ├── quick-test.ts            # Quick verification ⭐
  ├── test-resend-email.ts     # Email tests
  ├── test-reducto-pdf.ts      # PDF tests
  └── test-send-reducto-workflow.ts  # Full workflow

docs/
  ├── RESEND_REDUCTO_GUIDE.md  # Complete guide ⭐
  ├── INTEGRATION_CHECKLIST.md # Step-by-step
  └── WORKFLOW_DIAGRAM.md      # Visual diagrams
```

## Status

✅ **COMPLETE AND TESTED**

All services implemented, tested, and ready to use.

---

**Ready to integrate?** See [Integration Checklist](docs/INTEGRATION_CHECKLIST.md)

**Need more details?** See [Complete Guide](docs/RESEND_REDUCTO_GUIDE.md)

**Questions?** Check the test files for working examples.
