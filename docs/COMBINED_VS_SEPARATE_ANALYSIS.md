# Combined vs Separate Analysis - Why Results Differ

## The Issue

When you analyze lease and floor plan:
- **Together (combined)**: You get one result
- **Lease only**: You get a different result  
- **Floor plan only**: You get yet another result

## Why This Happens

### 1. **Different Return Structures**

#### Lease Only (`LeaseService.analyzeLeasePDF`)
Returns:
```typescript
{
  summary: string,
  overallRating: 'favorable' | 'neutral' | 'concerning',
  redFlags: Array<{title, description, severity}>,
  keyTerms: {...},
  importantDates: [...],
  financialSummary: {...},
  tenantRights: [...],
  landlordObligations: [...],
  terminationClauses: [...],
  recommendations: [...],
  fullText: string  // The extracted lease text
}
```

#### Floor Plan Only (`FloorPlanService.analyzeFloorPlan`)
Returns:
```typescript
{
  layout: {bedrooms, bathrooms, totalRooms, estimatedSquareFeet},
  features: [...],
  pros: [...],
  cons: [...],
  spaceEfficiency: 'Excellent' | 'Good' | 'Fair' | 'Poor',
  summary: string,
  recommendations: [...]
}
```

#### Combined (`CombinedAnalysisService.analyzeCombined`)
Returns:
```typescript
{
  lease: LeaseAnalysis,           // Full lease analysis
  floorPlan: FloorPlanAnalysis,   // Full floor plan analysis
  overallAssessment: {            // NEW - Combined insights
    summary: string,              // Different from individual summaries
    matchScore: number,           // 0-100 score
    recommendations: [...],       // Combined recommendations
    concerns: [...]               // Combined concerns
  },
  emailSent: boolean
}
```

### 2. **Different Processing Logic**

#### Lease Only
- Extracts text from PDF using Reducto
- Sends text to AI (GPT-4o-mini) with lease-specific prompt
- Returns detailed lease analysis
- **Summary**: Focuses on lease terms, red flags, tenant rights

#### Floor Plan Only
- Converts image to base64
- Sends to AI Vision (GPT-4o) with floor plan prompt
- Returns layout analysis
- **Summary**: Focuses on space efficiency, layout pros/cons

#### Combined
- Runs BOTH analyses independently
- Then generates a **NEW overall assessment** that:
  - Calculates a match score (0-100)
  - Combines red flags + cons into concerns
  - Merges recommendations from both
  - Creates cross-referenced insights (e.g., "price per sqft")
  - Generates a **different summary** that synthesizes both

### 3. **The Combined Summary is Synthesized**

The combined analysis creates a NEW summary by:

```typescript
// From combined-analysis.service.ts
private static generateSummary(lease, floorPlan, matchScore) {
  const parts = [];
  
  if (lease && floorPlan) {
    // Creates a NEW summary combining both
    parts.push(
      `This ${floorPlan.layout.bedrooms}BR/${floorPlan.layout.bathrooms}BA unit 
       with ${floorPlan.spaceEfficiency.toLowerCase()} space efficiency 
       has a match score of ${matchScore}/100.`
    );
    
    if (lease.redFlags.length > 0) {
      parts.push(`The lease has ${lease.redFlags.length} red flag(s) to review.`);
    }
    
    if (floorPlan.pros.length > 0) {
      parts.push(`The floor plan offers ${floorPlan.pros.length} notable advantage(s).`);
    }
  }
  
  return parts.join(' ');
}
```

This is **completely different** from the individual summaries!

### 4. **Match Score Calculation**

The combined analysis adds a match score that doesn't exist in individual analyses:

```typescript
let matchScore = 50; // Base score

// Deduct for lease red flags
matchScore -= lease.redFlags.length * 5;

// Add/subtract based on space efficiency
const efficiencyScores = {
  Excellent: 20,
  Good: 10,
  Fair: 0,
  Poor: -10,
};
matchScore += efficiencyScores[floorPlan.spaceEfficiency];

// Ensure 0-100 range
matchScore = Math.max(0, Math.min(100, matchScore));
```

### 5. **Cross-Referenced Insights**

Combined analysis creates insights that can't exist separately:

```typescript
// Example: Price per square foot
if (floorPlan.layout.estimatedSquareFeet) {
  const sqft = floorPlan.layout.estimatedSquareFeet;
  const rent = extractRentAmount(lease.keyTerms.monthlyRent);
  
  if (rent && sqft) {
    const pricePerSqft = rent / sqft;
    if (pricePerSqft > 4) {
      concerns.push(`High price per sq ft: ${pricePerSqft.toFixed(2)}/sqft`);
    } else {
      recommendations.push(`Good value: ${pricePerSqft.toFixed(2)}/sqft`);
    }
  }
}

// Example: Roommate suggestion
if (floorPlan.layout.bedrooms >= 2) {
  recommendations.push('Consider roommate to split costs mentioned in lease');
}

// Example: Outdoor space maintenance
if (floorPlan.features.includes('balcony')) {
  recommendations.push('Verify outdoor space maintenance responsibilities in lease');
}
```

## Visual Comparison

### Lease Only Result
```json
{
  "summary": "Standard 12-month lease for $3,500/month with $3,500 security deposit...",
  "redFlags": [
    {"title": "Double rent penalty", "severity": "high"}
  ],
  "recommendations": [
    "Review early termination clause",
    "Document pre-move-in condition"
  ]
}
```

### Floor Plan Only Result
```json
{
  "summary": "Well-designed 2BR/1BA layout with good natural light and efficient use of space...",
  "spaceEfficiency": "Good",
  "pros": ["Open kitchen", "Large bedrooms"],
  "cons": ["Only one bathroom", "No storage"],
  "recommendations": [
    "Place dining table near window",
    "Use vertical storage solutions"
  ]
}
```

### Combined Result
```json
{
  "lease": { /* full lease analysis */ },
  "floorPlan": { /* full floor plan analysis */ },
  "overallAssessment": {
    "summary": "This 2BR/1BA unit with good space efficiency has a match score of 65/100. The lease has 1 red flag(s) to review. The floor plan offers 2 notable advantage(s).",
    "matchScore": 65,
    "recommendations": [
      "Good value: $3.89/sqft",
      "Consider roommate to split costs mentioned in lease",
      "Place dining table near window"
    ],
    "concerns": [
      "Double rent penalty: Tenant must pay double rent if staying past lease end",
      "Only one bathroom",
      "No storage"
    ]
  }
}
```

## The Problem

You're seeing **three different summaries** because:

1. **Lease only**: AI-generated summary focused on lease terms
2. **Floor plan only**: AI-generated summary focused on layout
3. **Combined**: Programmatically-generated summary that synthesizes both

## The Solution

### Option 1: Use Individual Summaries in Combined Result
Keep the original summaries and add the overall assessment:

```typescript
{
  lease: {
    summary: "Original lease AI summary...",
    // ... rest of lease data
  },
  floorPlan: {
    summary: "Original floor plan AI summary...",
    // ... rest of floor plan data
  },
  overallAssessment: {
    summary: "Combined synthesis...",
    matchScore: 65,
    // ...
  }
}
```

### Option 2: Make Combined Summary More Detailed
Enhance the combined summary to include more context:

```typescript
private static generateSummary(lease, floorPlan, matchScore) {
  const parts = [];
  
  // Add lease summary
  if (lease?.summary) {
    parts.push(`**Lease**: ${lease.summary}`);
  }
  
  // Add floor plan summary
  if (floorPlan?.summary) {
    parts.push(`**Floor Plan**: ${floorPlan.summary}`);
  }
  
  // Add overall assessment
  if (lease && floorPlan) {
    parts.push(
      `**Overall**: This property scores ${matchScore}/100 with ${lease.redFlags.length} lease concerns and ${floorPlan.pros.length} layout advantages.`
    );
  }
  
  return parts.join(' ');
}
```

### Option 3: Return All Three Summaries
Add separate fields for clarity:

```typescript
{
  lease: { /* ... */ },
  floorPlan: { /* ... */ },
  overallAssessment: {
    leaseSummary: lease.summary,      // Original lease summary
    floorPlanSummary: floorPlan.summary, // Original floor plan summary
    combinedSummary: "Synthesized...",   // New combined summary
    matchScore: 65,
    // ...
  }
}
```

## Recommendation

**Option 3** is best because it:
- Preserves all AI-generated insights
- Adds the combined synthesis
- Gives users complete information
- Makes it clear why results differ

## Implementation

Would you like me to implement Option 3 to make the combined analysis include all three summaries clearly labeled?
