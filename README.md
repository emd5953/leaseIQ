# LeaseIQ

Find apartments faster. Know what you're signing before you sign.

## Problem

Apartment hunting in NYC is brutal:

1. **Speed kills** — Good listings disappear in hours. By the time you see it on StreetEasy, it's gone.
2. **Scattered inventory** — Listings spread across StreetEasy, Zillow, Apartments.com, Craigslist, Facebook. Nobody checks all of them.
3. **Hidden risks** — You don't know if the landlord is sketchy or the building has violations until you've already moved in.
4. **Lease pressure** — You get approved, receive a 20-page lease, and have 24-72 hours to sign. Most people skim and hope for the best.

## Solution

LeaseIQ is a rental platform that helps you find, research, and decide — all in one place.

### 1. Find (Speed + Coverage)

- Scrape listings from all sources: StreetEasy, Zillow, Apartments.com, Craigslist, Facebook, broker sites
- Open search for anyone — no signup required
- Signup to set preferences (budget, neighborhood, beds, pets, no-fee)
- Get alerted instantly when a match drops — before others see it

### 2. Research (Due Diligence)

- Click any listing → we pull landlord reviews, building violations, complaint history
- Upload floorplan PDF → we check if square footage matches the listing
- Get a short summary emailed to you before you tour

### 3. Decide (Lease Analysis)

- You get approved, landlord sends lease
- Upload lease PDF → we extract key terms, flag red flags, explain in plain English
- Don't like something? You can still walk away before signing.
- Sign with confidence — or don't.

### 4. Report (Email Delivery)

- Every step, you get a clean summary via email
- Alerts, research reports, lease analysis — all in your inbox

## Tech Stack

| Tool | Purpose |
|------|---------|
| Next.js + TypeScript | Frontend + API routes |
| Supabase | Auth |
| MongoDB | Database (users, listings, alerts, saved data) |
| Firecrawl | Scrape listings, landlord reviews, building violations |
| Reducto | Parse floorplan PDFs, lease PDFs |
| Open Router | Summarize, analyze, flag red flags |
| Resend | Email alerts + reports |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
     ┌───────────┐     ┌───────────┐     ┌───────────┐
     │  Search   │     │  Alerts   │     │  Upload   │
     │ (public)  │     │ (signup)  │     │   PDFs    │
     └───────────┘     └───────────┘     └───────────┘
            │                 │                 │
            └─────────────────┼─────────────────┘
                              ▼
                    ┌─────────────────┐
                    │    Firecrawl    │
                    │  - Listings     │
                    │  - Reviews      │
                    │  - Violations   │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │    Reducto      │
                    │  - Floorplans   │
                    │  - Leases       │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Open Router   │
                    │  - Summarize    │
                    │  - Analyze      │
                    │  - Flag risks   │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │     Resend      │
                    │  - Alerts       │
                    │  - Reports      │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │    MongoDB      │
                    │  - Users        │
                    │  - Listings     │
                    │  - Preferences  │
                    └─────────────────┘
```

## What We Built vs. What We Skipped

### Built

- Real data ingestion from live websites (not mock data)
- Open search (no auth required) + personalized alerts (with auth)
- Floorplan analysis to catch sqft discrepancies
- Lease analysis to flag bad clauses
- Email delivery at every step

### Intentionally Skipped

- **Multiple cities** — Focused on NYC. Expanding = adding more Firecrawl targets.
- **Pretty UI** — Judges value working systems over polish.
- **Real-time websockets** — Email alerts are sufficient for MVP.
- **Payment/subscription** — Not needed for demo.

## How It's Different

| Other Platforms | LeaseIQ |
|-----------------|---------|
| Single source (their own listings) | Aggregates all sources |
| Slow updates | Real-time scraping + instant alerts |
| Stops at listing | Full pipeline: find → research → decide |
| No landlord intel | Scrapes reviews + violations |
| No lease help | Analyzes lease before you sign |

