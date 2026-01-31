# Resend + Reducto Workflow Tests

Quick guide to testing the email and PDF parsing workflows.

## Quick Start

### 1. Configure API Keys

Make sure these are set in your `.env` file:

```env
RESEND_API_KEY=re_your_key_here
REDUCTO_API_KEY=your_key_here
OPENROUTER_API_KEY=sk-or-v1-your_key_here
```

### 2. Update Test Email

Edit the test files and replace `test@example.com` with your actual email:

- `tests/test-resend-email.ts`
- `tests/test-reducto-pdf.ts`
- `tests/test-send-reducto-workflow.ts`

### 3. Run Tests

```bash
# Test Resend email service
npm run test:resend

# Test Reducto PDF parsing
npm run test:reducto

# Test complete workflow (Reducto + AI + Resend)
npm run test:workflow
```

## Test Files

### `test-resend-email.ts`
Tests all email workflows:
- ✉️ Basic email sending
- 🏠 Listing alerts
- 🔍 Research reports
- 📄 Lease analysis reports

**What it does:**
- Sends test emails to your address
- Validates email formatting
- Tests all email templates

**Expected output:**
- Success messages with message IDs
- Check your inbox for test emails

### `test-reducto-pdf.ts`
Tests PDF parsing workflows:
- 📄 Parse PDF from URL
- 📁 Parse PDF from buffer (file upload)
- 🏠 Parse lease PDF (optimized)
- 🤖 Full lease analysis (Reducto + AI)

**What it does:**
- Parses sample PDFs
- Extracts text content
- Tests lease-specific optimizations
- Runs AI analysis on extracted text

**Expected output:**
- Parsed text content
- Page counts and metadata
- AI analysis results

**Note:** Some tests require a sample PDF at `tests/sample-lease.pdf`

### `test-send-reducto-workflow.ts`
Tests the complete end-to-end workflow:
1. 📄 Parse lease PDF with Reducto
2. 🤖 Analyze with OpenRouter AI
3. ✉️ Send results via Resend email

**What it does:**
- Runs the full lease analysis pipeline
- Demonstrates real-world usage
- Tests all integrations together

**Expected output:**
- Step-by-step progress
- Analysis results in console
- Email sent to your inbox

## Adding Sample PDFs

To test with real PDFs:

1. Find a sample lease agreement PDF
2. Save it as `tests/sample-lease.pdf`
3. Run the tests again

The tests will automatically use the local PDF if available.

## Common Issues

### "API key not configured"
- Check your `.env` file
- Make sure keys are correct
- Restart your terminal/IDE

### "Email not received"
- Check spam folder
- Verify email address is correct
- Check Resend dashboard for delivery status

### "PDF parsing failed"
- Verify PDF is valid (not corrupted)
- Check file size (may have limits)
- Try with a simpler PDF first

### "AI analysis failed"
- Check OpenRouter API key
- Verify you have credits
- Check rate limits

## What to Expect

### Resend Email Test
You should receive 4 test emails:
1. Basic test email
2. Listing alert (2 sample listings)
3. Research report
4. Lease analysis report

### Reducto PDF Test
Console output showing:
- Parsed text content
- Page counts
- Metadata
- AI analysis results

### Complete Workflow Test
- Console shows step-by-step progress
- Analysis results displayed
- Email sent with full report

## Next Steps

After testing:

1. ✅ Verify all tests pass
2. ✅ Check emails received correctly
3. ✅ Review analysis quality
4. 📝 Integrate into your API routes
5. 🚀 Deploy to production

## Integration Examples

### API Route Example

```typescript
// POST /api/lease/analyze
app.post('/api/lease/analyze', async (req, res) => {
  try {
    const { pdfBuffer, userEmail } = req.body;
    
    // Parse and analyze
    const analysis = await LeaseService.analyzeLeasePDF(pdfBuffer);
    
    // Send email
    await EmailService.sendLeaseAnalysis(userEmail, analysis);
    
    res.json({ success: true, analysis });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Frontend Example

```typescript
// Upload and analyze lease
const formData = new FormData();
formData.append('file', pdfFile);
formData.append('email', userEmail);

const response = await fetch('/api/lease/analyze', {
  method: 'POST',
  body: formData,
});

const { analysis } = await response.json();
```

## Documentation

For detailed documentation, see:
- `docs/RESEND_REDUCTO_GUIDE.md` - Complete integration guide
- `src/services/email.service.ts` - Email service code
- `src/services/reducto.service.ts` - PDF parsing code
- `src/services/lease.service.ts` - Lease analysis code

## Support

If you encounter issues:
1. Check the main documentation
2. Review error messages carefully
3. Verify API keys are correct
4. Check service status pages:
   - Resend: https://resend.com/status
   - OpenRouter: https://openrouter.ai/status

## Tips

- **Start simple**: Test basic email first, then move to complex workflows
- **Use real data**: Test with actual lease PDFs for best results
- **Monitor costs**: Check API usage in dashboards
- **Cache results**: Store parsed PDFs to avoid re-parsing
- **Error handling**: Always handle failures gracefully in production
