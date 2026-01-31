# 📧 Resend + 📄 Reducto + 🏠 Floor Plan Integration

Complete email, PDF parsing, and floor plan analysis workflows for LeaseIQ.

## Features

### 📄 Lease Analysis
- Parse PDF leases with Reducto
- AI analysis with OpenRouter
- Extract red flags and key terms
- Send results via Resend email

### 🏠 Floor Plan Analysis (NEW!)
- Analyze floor plan images with AI vision
- Count bedrooms, bathrooms, rooms
- Identify features and amenities
- Rate space efficiency
- Provide layout recommendations

### 🎯 Combined Analysis (NEW!)
- Analyze lease + floor plan together
- Generate overall match score (0-100)
- Cross-reference lease terms with layout
- Calculate price per square foot
- Unified recommendations and concerns

## Quick Start

### 1. Configure API Keys

Add to your `.env` file:

```env
RESEND_API_KEY=re_your_key_here
REDUCTO_API_KEY=your_key_here
OPENROUTER_API_KEY=sk-or-v1-your_key_here
```

### 2. Update Test Email

Edit `tests/quick-test.ts` and change:
```typescript
const TEST_EMAIL = 'test@example.com'; // Change to your email
```

### 3. Run Quick Test

```bash
npm run test:workflow
```

This will:
- ✅ Check your configuration
- ✅ Send a test email
- ✅ Run lease analysis
- ✅ Send analysis results via email

**Check your inbox!** You should receive 2 emails.

## What's Included

### Services
- **EmailService** - Send emails via Resend
  - Listing alerts
  - Research reports
  - Lease analysis reports
  - Combined analysis reports (NEW!)
  
- **ReductoService** - Parse PDFs
  - Extract text from PDFs
  - Parse from buffer or URL
  - Lease-specific optimizations
  
- **LeaseService** - Lease analysis
  - Parse PDF → Analyze with AI → Send email
  - Multiple input methods
  - Structured output

- **FloorPlanService** (NEW!) - Floor plan analysis
  - Analyze floor plan images with AI vision
  - Extract layout details
  - Identify features and efficiency
  - Provide recommendations

- **CombinedAnalysisService** (NEW!) - Complete property analysis
  - Analyze lease + floor plan together
  - Generate match score
  - Cross-reference data
  - Unified insights

### Test Scripts

```bash
# Quick test (recommended)
npm run test:workflow

# Test individual services
npm run test:resend      # Email only
npm run test:reducto     # PDF parsing only
npm run test:combined    # Floor plan + combined analysis (NEW!)

# Full workflow test
npm run test:workflow-full
```

### Documentation

- **[Complete Guide](docs/RESEND_REDUCTO_GUIDE.md)** - Full integration guide
- **[Testing Guide](tests/README-WORKFLOWS.md)** - How to test
- **[Summary](docs/WORKFLOWS_SUMMARY.md)** - Implementation overview
- **[API Examples](src/api/routes/lease.routes.example.ts)** - Route examples

## Usage Examples

### Parse and Analyze Lease PDF

```typescript
import { LeaseService } from './src/services';

// From uploaded file
const analysis = await LeaseService.analyzeLeasePDF(
  pdfBuffer,
  'lease.pdf'
);

// From URL
const analysis = await LeaseService.analyzeLeasePDFFromURL(
  'https://example.com/lease.pdf'
);

console.log(analysis.summary);
console.log(analysis.redFlags);
console.log(analysis.keyTerms);
```

### Send Email

```typescript
import { EmailService } from './src/services';

// Send analysis results
await EmailService.sendLeaseAnalysis(
  'user@example.com',
  analysis
);

// Send listing alert
await EmailService.sendListingAlert(
  'user@example.com',
  listings,
  'Downtown 2BR'
);
```

### Complete Workflow

```typescript
// Upload → Parse → Analyze → Email
const pdfBuffer = req.file.buffer;
const userEmail = req.body.email;

const analysis = await LeaseService.analyzeLeasePDF(pdfBuffer);
await EmailService.sendLeaseAnalysis(userEmail, analysis);

res.json({ success: true, analysis });
```

## API Integration

See `src/api/routes/lease.routes.example.ts` for complete API route examples:

```typescript
// POST /api/lease/analyze - Upload and analyze PDF
// POST /api/lease/analyze-url - Analyze from URL
// POST /api/lease/analyze-text - Analyze text directly
// POST /api/lease/parse - Parse PDF only (no analysis)
// GET /api/lease/status - Check service status
```

## Features

### Email Templates
- ✅ Beautiful HTML templates
- ✅ Mobile responsive
- ✅ Property cards with images
- ✅ Red flag highlighting
- ✅ Key terms summary

### PDF Parsing
- ✅ Parse from buffer or URL
- ✅ Text extraction
- ✅ Metadata extraction
- ✅ Chunked content
- ✅ Lease-specific cleaning

### AI Analysis
- ✅ Summary generation
- ✅ Red flag detection
- ✅ Key terms extraction
- ✅ JSON structured output

## Architecture

```
User Upload PDF
    ↓
ReductoService.parsePDF()
    ↓
LeaseService.analyzeLease()
    ↓
EmailService.sendLeaseAnalysis()
    ↓
User receives email
```

## Cost Estimates

Per lease analysis:
- Reducto: ~$0.01-0.05
- AI: ~$0.002-0.03
- Email: ~$0.001
- **Total: ~$0.01-0.08**

## Troubleshooting

### Email not received?
- Check spam folder
- Verify email address
- Check Resend dashboard

### PDF parsing failed?
- Verify PDF is valid
- Check file size
- Try simpler PDF first

### AI analysis failed?
- Check OpenRouter key
- Verify credits available
- Check rate limits

See [Complete Guide](docs/RESEND_REDUCTO_GUIDE.md) for detailed troubleshooting.

## Next Steps

1. ✅ Run `npm run test:workflow`
2. ✅ Check your email inbox
3. ✅ Review analysis results
4. 📝 Add API routes to your server
5. 🎨 Create frontend upload component
6. 🚀 Deploy to production

## Files Created

```
src/services/
  ├── reducto.service.ts          # PDF parsing service
  ├── lease.service.ts            # Enhanced with Reducto
  └── index.ts                    # Updated exports

tests/
  ├── test-resend-email.ts        # Email tests
  ├── test-reducto-pdf.ts         # PDF parsing tests
  ├── test-send-reducto-workflow.ts  # Full workflow
  ├── quick-test.ts               # Quick verification
  └── README-WORKFLOWS.md         # Testing guide

docs/
  ├── RESEND_REDUCTO_GUIDE.md     # Complete guide
  └── WORKFLOWS_SUMMARY.md        # Implementation summary

src/api/routes/
  └── lease.routes.example.ts     # API route examples
```

## Support

- **Documentation**: See `docs/` folder
- **Examples**: See `tests/` and `src/api/routes/`
- **Issues**: Check error messages and logs

## Status

✅ **COMPLETE AND READY TO USE**

All services implemented, tested, and documented.

---

**Need help?** Check the [Complete Guide](docs/RESEND_REDUCTO_GUIDE.md) or review the test files for examples.
