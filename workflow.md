┌─────────────────────────────────────────────────────────────┐
│                      LEASEIQ PLATFORM                       │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
   BACKGROUND          USER FLOWS          BACKGROUND
   INGESTION                               ALERTS


═══════════════════════════════════════════════════════════════

1️⃣  DATA COLLECTION (Every 15 min)

    Cron Job
       ↓
    Firecrawl scrapes 14 rental sites
    (Zillow, StreetEasy, Apartments.com, etc.)
       ↓
    Parse & normalize data
       ↓
    Remove duplicates
       ↓
    Save to MongoDB


═══════════════════════════════════════════════════════════════

2️⃣  SEARCH (User visits site)

    User searches with filters
       ↓
    Query MongoDB
       ↓
    Display results


═══════════════════════════════════════════════════════════════

3️⃣  RESEARCH (User clicks "Research")

    Get listing from MongoDB
       ↓
    Firecrawl scrapes:
    • Landlord reviews (Google)
    • Building violations (NYC DOB)
       ↓
    OpenRouter AI summarizes
       ↓
    Resend sends email report


═══════════════════════════════════════════════════════════════

4️⃣  LEASE ANALYSIS (User uploads PDF)

    Upload lease PDF
       ↓
    Reducto extracts text
       ↓
    OpenRouter AI analyzes:
    • Summary
    • Red flags
    • Key terms (rent, deposit, fees)
       ↓
    Resend sends email report


═══════════════════════════════════════════════════════════════

5️⃣  FLOOR PLAN ANALYSIS (User uploads image)

    Upload floor plan image
       ↓
    OpenRouter AI (GPT-4 Vision) analyzes:
    • Count rooms
    • Identify features
    • Rate efficiency
    • Recommendations
       ↓
    Return results


═══════════════════════════════════════════════════════════════

6️⃣  COMBINED ANALYSIS (Upload both)

    Upload lease PDF + floor plan
       ↓
    Run both analyses
       ↓
    Cross-reference data:
    • Calculate $/sqft
    • Generate match score (0-100)
    • Combined recommendations
       ↓
    Resend sends comprehensive report


═══════════════════════════════════════════════════════════════

7️⃣  ALERTS (Every 15 min)

    Cron Job
       ↓
    Check user saved searches
       ↓
    Find NEW matching listings
       ↓
    Resend sends alert emails


═══════════════════════════════════════════════════════════════

🔌 EXTERNAL SERVICES

    Firecrawl    → Web scraping
    Reducto      → PDF parsing
    OpenRouter   → AI analysis (GPT-3.5/4)
    Resend       → Email delivery
    MongoDB      → Database
    Google       → Geocoding

