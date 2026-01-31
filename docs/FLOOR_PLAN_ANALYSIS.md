# Floor Plan Analysis Guide

Complete guide for analyzing floor plans with AI vision and combining with lease analysis.

## Overview

LeaseIQ now supports analyzing floor plan images using AI vision (GPT-4 Vision) to provide insights about:
- Room layout and count
- Space efficiency
- Features and amenities
- Pros and cons
- Furniture placement recommendations

Combined with lease analysis, you get a complete property assessment with a match score.

## Features

### Floor Plan Analysis
- ✅ Analyze floor plan images (PNG, JPEG, WebP, GIF)
- ✅ Count bedrooms, bathrooms, and rooms
- ✅ Estimate square footage
- ✅ Identify features (closets, balcony, storage)
- ✅ Rate space efficiency
- ✅ Provide recommendations

### Combined Analysis
- ✅ Analyze lease PDF + floor plan image together
- ✅ Generate overall match score (0-100)
- ✅ Cross-reference lease terms with layout
- ✅ Calculate price per square foot
- ✅ Unified recommendations and concerns
- ✅ Beautiful combined email report

## Quick Start

### 1. Analyze Floor Plan Only

```typescript
import { FloorPlanService } from './src/services';

const imageBuffer = fs.readFileSync('floorplan.png');
const analysis = await FloorPlanService.analyzeFloorPlan(
  imageBuffer,
  'image/png'
);

console.log(analysis.layout); // { bedrooms: 2, bathrooms: 1, ... }
console.log(analysis.spaceEfficiency); // "Good"
console.log(analysis.pros); // ["Open layout", "Large closets"]
console.log(analysis.cons); // ["Small kitchen"]
```

### 2. Combined Analysis (Lease + Floor Plan)

```typescript
import { CombinedAnalysisService } from './src/services';

const result = await CombinedAnalysisService.analyzeCombined({
  leasePDF: {
    buffer: leasePdfBuffer,
    fileName: 'lease.pdf',
  },
  floorPlanImage: {
    buffer: floorPlanBuffer,
    mimeType: 'image/png',
    fileName: 'floorplan.png',
  },
  userEmail: 'user@example.com',
  sendEmail: true,
});

console.log(result.overallAssessment.matchScore); // 85/100
console.log(result.overallAssessment.summary);
console.log(result.lease); // Lease analysis
console.log(result.floorPlan); // Floor plan analysis
```

## API Routes

### Analyze Both (Recommended)

```typescript
POST /api/property/analyze

// FormData with both files
const formData = new FormData();
formData.append('lease', leasePdfFile);
formData.append('floorplan', floorPlanImage);
formData.append('email', 'user@example.com');
formData.append('sendEmail', 'true');

const response = await fetch('/api/property/analyze', {
  method: 'POST',
  body: formData,
});

const data = await response.json();
// {
//   success: true,
//   analysis: {
//     lease: { summary, redFlags, keyTerms },
//     floorPlan: { layout, features, pros, cons, ... },
//     overallAssessment: { matchScore, summary, recommendations, concerns }
//   },
//   emailSent: true
// }
```

### Analyze Lease Only

```typescript
POST /api/property/analyze-lease-only

const formData = new FormData();
formData.append('lease', leasePdfFile);
formData.append('email', 'user@example.com');
formData.append('sendEmail', 'true');
```

### Analyze Floor Plan Only

```typescript
POST /api/property/analyze-floorplan-only

const formData = new FormData();
formData.append('floorplan', floorPlanImage);
```

## Response Structure

### Floor Plan Analysis

```typescript
{
  layout: {
    bedrooms: 2,
    bathrooms: 1,
    totalRooms: 5,
    estimatedSquareFeet: 900
  },
  features: [
    "Walk-in closet",
    "Balcony",
    "Open kitchen",
    "Storage space"
  ],
  pros: [
    "Efficient layout with minimal wasted space",
    "Good natural light from multiple windows",
    "Separate dining area"
  ],
  cons: [
    "Small kitchen",
    "Bathroom not accessible from master bedroom",
    "Limited storage"
  ],
  spaceEfficiency: "Good",
  summary: "Well-designed 2BR/1BA unit with efficient use of space...",
  recommendations: [
    "Place dining table near kitchen for easy access",
    "Use vertical storage in bedroom closets",
    "Consider murphy bed for guest room"
  ]
}
```

### Combined Analysis

```typescript
{
  lease: {
    summary: "Standard 12-month lease...",
    redFlags: ["Automatic renewal", "5% rent increase"],
    keyTerms: {
      rent: "$3,500/month",
      deposit: "$3,500",
      term: "12 months",
      fees: "$250 move-in fee"
    }
  },
  floorPlan: {
    // Floor plan analysis (see above)
  },
  overallAssessment: {
    matchScore: 85,
    summary: "This 2BR/1BA unit with good space efficiency has a match score of 85/100...",
    recommendations: [
      "Good value: $3.89/sqft",
      "Consider roommate to split costs",
      "Verify outdoor space maintenance in lease"
    ],
    concerns: [
      "Automatic renewal clause",
      "Small kitchen",
      "Limited storage"
    ]
  },
  emailSent: true
}
```

## Email Template

The combined analysis email includes:

1. **Overall Match Score** - Large, prominent score (0-100)
2. **Floor Plan Section**
   - Layout details
   - Space efficiency rating
   - Features list
   - Pros (green box)
   - Cons (red box)
3. **Lease Section**
   - Summary
   - Key terms
   - Red flags (if any)
4. **Recommendations** - Blue box with suggestions
5. **Concerns** - Red box with things to consider

## Testing

### Test Floor Plan Analysis

```bash
npm run test:combined
```

### Test Files

Add sample files for testing:
- `tests/sample-lease.pdf` - Sample lease document
- `tests/sample-floorplan.png` - Sample floor plan image

### Manual Testing

```typescript
// Test with your own files
import { CombinedAnalysisService } from './src/services';
import fs from 'fs';

const result = await CombinedAnalysisService.analyzeCombined({
  leasePDF: {
    buffer: fs.readFileSync('my-lease.pdf'),
    fileName: 'my-lease.pdf',
  },
  floorPlanImage: {
    buffer: fs.readFileSync('my-floorplan.png'),
    mimeType: 'image/png',
    fileName: 'my-floorplan.png',
  },
  userEmail: 'your-email@example.com',
  sendEmail: true,
});

console.log(result);
```

## Supported Image Formats

- PNG (`.png`)
- JPEG (`.jpg`, `.jpeg`)
- WebP (`.webp`)
- GIF (`.gif`)

## File Size Limits

- Lease PDF: 10MB max
- Floor Plan Image: 10MB max
- Total upload: 20MB max (both files)

## Cost Estimates

### Per Analysis

**Floor Plan Only:**
- GPT-4 Vision: ~$0.01-0.02
- Total: ~$0.01-0.02

**Lease Only:**
- Reducto: ~$0.01-0.05
- GPT-3.5: ~$0.002-0.01
- Total: ~$0.01-0.06

**Combined (Lease + Floor Plan):**
- Reducto: ~$0.01-0.05
- GPT-4 Vision: ~$0.01-0.02
- GPT-3.5: ~$0.002-0.01
- Resend: ~$0.001
- Total: ~$0.02-0.08

### Monthly Estimates (1000 analyses)

- Floor plan only: $10-20
- Lease only: $10-60
- Combined: $20-80

## Match Score Calculation

The match score (0-100) is calculated based on:

1. **Base Score:** 50
2. **Lease Red Flags:** -5 points each
3. **Space Efficiency:**
   - Excellent: +20
   - Good: +10
   - Fair: 0
   - Poor: -10
4. **Floor Plan Cons:** Considered in overall assessment
5. **Price per Sq Ft:** Bonus for good value

Score is capped between 0-100.

## Best Practices

### For Best Results

1. **Floor Plan Images:**
   - Use high-resolution images
   - Ensure labels are readable
   - Include room dimensions if available
   - Avoid blurry or dark images

2. **Lease PDFs:**
   - Use clear, text-based PDFs (not scanned images)
   - Ensure all pages are included
   - Check PDF is not password-protected

3. **Combined Analysis:**
   - Upload both files for best insights
   - Provide accurate email for delivery
   - Review match score and recommendations

### Error Handling

```typescript
try {
  const result = await CombinedAnalysisService.analyzeCombined(input);
  // Handle success
} catch (error) {
  if (error.message.includes('Invalid file type')) {
    // Handle invalid file type
  } else if (error.message.includes('Failed to parse')) {
    // Handle parsing error
  } else {
    // Handle other errors
  }
}
```

## Frontend Integration

### Upload Component Example

```typescript
function PropertyAnalysisUpload() {
  const [lease, setLease] = useState<File | null>(null);
  const [floorPlan, setFloorPlan] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async () => {
    const formData = new FormData();
    if (lease) formData.append('lease', lease);
    if (floorPlan) formData.append('floorplan', floorPlan);
    formData.append('email', userEmail);
    formData.append('sendEmail', 'true');

    setLoading(true);
    try {
      const response = await fetch('/api/property/analyze', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      setResult(data.analysis);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept=".pdf"
        onChange={(e) => setLease(e.target.files?.[0] || null)}
      />
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFloorPlan(e.target.files?.[0] || null)}
      />
      <button onClick={handleSubmit} disabled={loading}>
        {loading ? 'Analyzing...' : 'Analyze Property'}
      </button>
      
      {result && (
        <div>
          <h2>Match Score: {result.overallAssessment.matchScore}/100</h2>
          <p>{result.overallAssessment.summary}</p>
          {/* Display full results */}
        </div>
      )}
    </div>
  );
}
```

## Troubleshooting

### Floor Plan Not Analyzing

- Check image format (PNG, JPEG, WebP, GIF)
- Ensure image is clear and readable
- Verify file size < 10MB
- Check OpenRouter API key is set

### Low Match Score

- Review red flags in lease
- Check floor plan cons
- Consider space efficiency rating
- Review price per square foot

### Email Not Received

- Check spam folder
- Verify email address
- Check Resend API key
- Review Resend dashboard

## Next Steps

1. ✅ Test floor plan analysis
2. ✅ Test combined analysis
3. ✅ Add API routes to your server
4. ✅ Create frontend upload component
5. ✅ Test with real files
6. ✅ Deploy to production

## Support

- **Documentation:** See this guide
- **API Examples:** `src/api/routes/property-analysis.routes.example.ts`
- **Test Files:** `tests/test-combined-analysis.ts`
- **Main Guide:** `docs/RESEND_REDUCTO_GUIDE.md`

---

**Ready to analyze?** Run `npm run test:combined` to get started!
