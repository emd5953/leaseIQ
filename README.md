# LeaseIQ

Rental research for New York City, built with Next.js, Express, TypeScript, and MongoDB. Research a building by street address without an account, or investigate a rental from the listing search.

## What you can research

- An exact active HPD building match, with the identifiers used for subsequent queries.
- Building-wide housing violation counts and the latest 20 records, with issue/status dates.
- Registered owners and managing agents, registration dates, and tax lot details.
- Community districts and nearby subway station complexes from official MTA data. Distances are calculated straight-line distances, not walking times.
- Separate source facts, analysis, missing information, and questions to ask before signing.
- Up to three report snapshots in a browser-local comparison, plus a print/PDF view.

Every retrieved source has a query link, retrieval time, publisher update date when available, and a status. An unavailable source is never presented as zero records. Reports do not invent safety ratings, Walk Scores, rent recommendations, or tenant reviews.

## Run locally

Use Node 22 (see `.nvmrc`).

```sh
npm ci
npm --prefix frontend ci
npm run dev
# In another terminal:
npm --prefix frontend run dev
```

Frontend: http://localhost:3000. Backend: http://localhost:3001.

Address research uses public NYC and NY State Open Data endpoints and needs no API keys or database. Without `MONGODB_URI`, search returns an explicit unavailable response while address research stays usable. No demo rentals are substituted.

Configure these services as needed in a local `.env` (never commit credentials):

| Variable | Used for |
| --- | --- |
| `MONGODB_URI` | Rental listings, accounts, saved searches, import jobs |
| `FIRECRAWL_API_KEY` | StreetEasy ingestion |
| `GOOGLE_GEOCODING_API_KEY` | Optional ingestion coordinates; an unsuccessful lookup remains missing |
| `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `JWT_SECRET` | Account authentication |
| `RESEND_API_KEY` | Explicit email delivery |
| `OPENROUTER_API_KEY`, `REDUCTO_API_KEY` | Existing lease/floor-plan analysis |
| `PORT` | API port (default 3001) |
| `FRONTEND_URL` | Allowed production frontend origin |

Frontend configuration belongs in `frontend/.env.local`: `NEXT_PUBLIC_API_URL` for a separately hosted API and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` for sign-in. The central API client defaults to the existing same-origin Next.js `/api` rewrite. An email request requires authentication and can only target the signed-in address.

## Validation and maintenance

```sh
npm run build
npm --prefix frontend run build
npm run test:reliability
npm run validate:research       # live, read-only checks for three real properties
npm run audit:listings          # read-only MongoDB audit; requires MONGODB_URI
npm run validate:listing-flow   # replay live API observations in temporary MongoDB
npm test                       # full unit, property, and reliability suite
```

`RESEARCH_VALIDATION_OUTPUT=/tmp/leaseiq-reports npm run validate:research` also saves full dated JSON reports. Source failures or unmatched expected properties produce a nonzero exit status.

The reliability suite exercises ingestion, storage, deduplication, source failure handling, report provenance, HTTP endpoints, search, and email rendering without sending email. The full suite passes 349 tests across 31 files, including the legacy account and listing suites. Database-backed property cases start with isolated data and use the original sample counts. See [validation evidence and remaining limitations](docs/RESEARCH_RELIABILITY.md) for exact results.

## Architecture

```text
StreetEasy → Firecrawl → parser → normalizer → conservative duplicate match
          → canonical Listing model → MongoDB → search API → property page

Street address + borough → exact active HPD building match
          → building ID: violations + registration → registration ID: contacts
          → borough/block/lot: PLUTO → coordinates: MTA stations
          → deterministic evidence report → UI / comparison / print / email
```

The research path does not send public records to an LLM. Lease and floor-plan analysis retain the existing services. Ingestion and the API share one listing schema; the read boundary supports legacy area and source-date fields. New imports retain per-field observation dates and preserve missing values rather than inventing defaults.

See [data flow, rollout, and validation notes](docs/RESEARCH_RELIABILITY.md) before running imports against an existing database.

## Rental workspace

Browse with compact filters, save rentals in this browser without an account, and compare up to three listings at `/shortlist`. Signed-in saves remain in the account dashboard. Source dates and identity warnings are shown separately; unknown rents stay visible. Budget filters apply to known monthly unit rents, while building ranges stay distinct.

See [product audit, validation screenshots, and rollout limitations](docs/PRODUCT_POLISH.md).
