# 🏠 Floor Plan Analysis - Quick Reference

## 🚀 Quick Start (2 minutes)

```bash
# 1. Test combined analysis
npm run test:combined

# 2. Add sample files (optional)
# - tests/sample-lease.pdf
# - tests/sample-floorplan.png
```

## 📝 Usage Examples

### Analyze Floor Plan Only
```typescript
import { FloorPlanService } from './src/services';

const analysis = await FloorPlanService.analyzeFloorPlan(
  imageBuffer,
  'image/png'
);
// Returns: layout, features, pros, cons, efficiency, recommendations
```

### Combined Analysis (Lease + Floor Plan)
```typescript
import { CombinedAnalysisService } from './src/services';

const result = await CombinedAnalysisService.analyzeCombined({
  leasePDF: { buffer, fileName: 'lease.pdf' },
  floorPlanImage: { buffer, mimeType: 'image/png', fileName: 'plan.png' },
  userEmail: 'user@example.com',
  sendEmail: true,
});
// Returns: lease, floorPlan, overallAssessment (with matchScore)
```

### API Route
```typescript
// Upload both files
const formData = new FormData();
formData.append('lease', leasePdfFile);
formData.append('floorplan', floorPlanImage);
formData.append('email', 'user@example.com');
formData.append('sendEmail', 'true');

const response = await fetch('/api/property/analyze', {
  method: 'POST',
  body: formData,
});
```

## 📊 Response Structure

```typescript
{
  lease: {
    summary: string,
    redFlags: string[],
    keyTerms: { rent, deposit, term, fees }
  },
  floorPlan: {
    layout: { bedrooms, bathrooms, totalRooms, estimatedSquareFeet },
    features: string[],
    pros: string[],
    cons: string[],
    spaceEfficiency: "Excellent" | "Good" | "Fair" | "Poor",
    summary: string,
    recommendations: string[]
  },
  overallAssessment: {
    matchScore: number, // 0-100
    summary: string,
    recommendations: string[],
    concerns: string[]
  },
  emailSent: boolean
}
```

## 🎯 Match Score Calculation

```
Base Score: 50
- Lease red flags: -5 each
+ Space efficiency:
  • Excellent: +20
  • Good: +10
  • Fair: 0
  • Poor: -10
+ Good value ($/sqft): +5
= Final Score (0-100)
```

## 📁 Supported Formats

**Lease:** PDF (max 10MB)  
**Floor Plan:** PNG, JPEG, WebP, GIF (max 10MB)

## 💰 Cost per Analysis

- Floor plan only: ~$0.01-0.02
- Lease only: ~$0.01-0.06
- Combined: ~$0.02-0.08

## 🔧 API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/property/analyze` | Both lease + floor plan |
| `POST /api/property/analyze-lease-only` | Lease only |
| `POST /api/property/analyze-floorplan-only` | Floor plan only |
| `GET /api/property/status` | Service status |

## 🧪 Test Commands

```bash
npm run test:combined      # Floor plan + combined
npm run test:workflow      # Quick test all
npm run test:resend        # Email only
npm run test:reducto       # PDF only
```

## 📧 Email Template Features

- ✅ Match score (0-100) prominently displayed
- ✅ Floor plan section (layout, pros, cons)
- ✅ Lease section (terms, red flags)
- ✅ Recommendations (blue box)
- ✅ Concerns (red box)
- ✅ Mobile responsive

## 🎨 Frontend Component

```typescript
<input type="file" accept=".pdf" onChange={setLease} />
<input type="file" accept="image/*" onChange={setFloorPlan} />
<button onClick={handleAnalyze}>Analyze Property</button>

{result && (
  <div>
    <h2>Match Score: {result.overallAssessment.matchScore}/100</h2>
    <p>{result.overallAssessment.summary}</p>
  </div>
)}
```

## 📚 Documentation

- **[Floor Plan Guide](docs/FLOOR_PLAN_ANALYSIS.md)** - Complete guide
- **[Main Guide](docs/RESEND_REDUCTO_GUIDE.md)** - Lease analysis
- **[API Examples](src/api/routes/property-analysis.routes.example.ts)** - Routes
- **[Tests](tests/test-combined-analysis.ts)** - Test examples

## ⚡ Quick Tips

1. **Best Results:** Upload both lease and floor plan
2. **Image Quality:** Use clear, high-res floor plan images
3. **PDF Format:** Text-based PDFs work best (not scanned)
4. **Match Score:** 80+ is excellent, 60-79 is good, <60 needs review
5. **Email:** Check spam folder if not received

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Floor plan not analyzing | Check image format and clarity |
| Low match score | Review red flags and cons |
| Email not received | Check spam, verify email address |
| API error | Verify API keys in `.env` |

## ✅ Checklist

- [ ] API keys configured in `.env`
- [ ] Run `npm run test:combined`
- [ ] Add sample files for testing
- [ ] Copy API routes to your server
- [ ] Create frontend upload component
- [ ] Test with real files
- [ ] Deploy!

## 🎯 Status

✅ **READY TO USE**

All services implemented and tested!

---

**Quick Start:** `npm run test:combined`  
**Full Docs:** [Floor Plan Guide](docs/FLOOR_PLAN_ANALYSIS.md)  
**Questions:** Check test files for examples
