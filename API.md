# LeaseIQ API Documentation

## Base URL
```
http://localhost:3000
```

## Endpoints

### 1. Search Listings (Public - No Auth)

**GET** `/api/search`

Search for apartment listings with filters.

**Query Parameters:**
- `minPrice` (number) - Minimum monthly rent
- `maxPrice` (number) - Maximum monthly rent
- `minBedrooms` (number) - Minimum bedrooms
- `maxBedrooms` (number) - Maximum bedrooms
- `minBathrooms` (number) - Minimum bathrooms
- `maxBathrooms` (number) - Maximum bathrooms
- `neighborhoods` (string) - Comma-separated list (e.g., "Williamsburg,Bushwick")
- `petsAllowed` (boolean) - Filter for pet-friendly listings
- `noFee` (boolean) - Filter for no-fee listings
- `amenities` (string) - Comma-separated list (e.g., "gym,doorman")
- `minSquareFeet` (number) - Minimum square footage
- `maxSquareFeet` (number) - Maximum square footage
- `page` (number) - Page number (default: 1)
- `limit` (number) - Results per page (default: 20)
- `sortBy` (string) - Sort field: "price", "bedrooms", "createdAt" (default: "createdAt")
- `sortOrder` (string) - Sort order: "asc" or "desc" (default: "desc")

**Example:**
```bash
curl "http://localhost:3000/api/search?minPrice=2000&maxPrice=3500&minBedrooms=2&neighborhoods=Williamsburg,Bushwick&petsAllowed=true&noFee=true"
```

**Response:**
```json
{
  "listings": [...],
  "total": 45,
  "page": 1,
  "totalPages": 3
}
```

---

### 2. Get Recent Listings

**GET** `/api/search/recent`

Get the most recently added listings.

**Query Parameters:**
- `limit` (number) - Number of listings to return (default: 10)

**Example:**
```bash
curl "http://localhost:3000/api/search/recent?limit=5"
```

---

### 3. Get Listing by ID

**GET** `/api/search/:id`

Get detailed information about a specific listing.

**Example:**
```bash
curl "http://localhost:3000/api/search/507f1f77bcf86cd799439011"
```

---

### 4. Process Alerts (Cron Job)

**POST** `/api/alerts/process`

Process all active saved searches and send email alerts for new matching listings.

**Example:**
```bash
curl -X POST "http://localhost:3000/api/alerts/process"
```

**Response:**
```json
{
  "processed": 10,
  "sent": 5,
  "errors": 0
}
```

---

### 5. Send Immediate Alert

**POST** `/api/alerts/send/:savedSearchId`

Send an immediate alert for a specific saved search.

**Example:**
```bash
curl -X POST "http://localhost:3000/api/alerts/send/507f1f77bcf86cd799439011"
```

---

### 6. Research Listing

**POST** `/api/research/:listingId`

Research a listing's landlord and building violations.

**Body:**
```json
{
  "email": "user@example.com"  // Optional - send report via email
}
```

**Example:**
```bash
curl -X POST "http://localhost:3000/api/research/507f1f77bcf86cd799439011" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

**Response:**
```json
{
  "research": {
    "landlordReviews": "...",
    "violations": "...",
    "summary": "..."
  },
  "emailSent": true
}
```

---

### 7. Analyze Lease

**POST** `/api/lease/analyze`

Analyze lease text and extract key terms and red flags.

**Body:**
```json
{
  "leaseText": "Full lease text here...",
  "email": "user@example.com"  // Optional - send analysis via email
}
```

**Example:**
```bash
curl -X POST "http://localhost:3000/api/lease/analyze" \
  -H "Content-Type: application/json" \
  -d '{
    "leaseText": "This lease agreement...",
    "email": "user@example.com"
  }'
```

**Response:**
```json
{
  "analysis": {
    "summary": "...",
    "redFlags": ["...", "..."],
    "keyTerms": {
      "rent": "$2,500/month",
      "deposit": "1 month rent",
      "term": "12 months",
      "fees": "None"
    }
  },
  "emailSent": true
}
```

---

## Running the Services

### Start API Server
```bash
npm run dev
```

### Start Alert Cron Job (runs every 15 minutes)
```bash
npm run alerts
```

### Run Scraping Job
```bash
npm run scrape
```

---

## Environment Variables

Required in `.env`:

```env
# MongoDB
MONGODB_URI=mongodb+srv://...

# Email
RESEND_API_KEY=re_...

# AI Analysis
OPENROUTER_API_KEY=sk-...

# Scraping
FIRECRAWL_API_KEY=fc-...

# Optional
GOOGLE_GEOCODING_API_KEY=...
REDUCTO_API_KEY=...
PORT=3000
```

---

## Email Templates

The system sends three types of emails:

1. **Listing Alerts** - New listings matching saved searches
2. **Research Reports** - Landlord reviews and building violations
3. **Lease Analysis** - Key terms and red flags from lease documents

All emails are sent via Resend with clean HTML templates.
