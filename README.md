# LeaseIQ

Rental research for New York City, built with Next.js, Express, TypeScript, and MongoDB. Research a building by street address without an account, or investigate a rental from the listing search.

## What you can research

- An exact active HPD building match, with the identifiers used for subsequent queries.
- Building-wide housing violation counts and the latest 20 records, with issue/status dates.
- Registered owners and managing agents, registration dates, and tax lot details.
- Community districts and nearby subway station complexes from official MTA data. Distances are calculated straight-line distances, not walking times.
- Separate source facts, analysis, missing information, and questions to ask before signing.
- Anonymous browser history and comparisons, account-synced history and comparisons, print/PDF views, and explicitly shared, revocable snapshots.

Every retrieved source has a query link, retrieval time, publisher update date when available, and a status. An unavailable source is never presented as zero records. Reports do not invent safety ratings, Walk Scores, rent recommendations, or tenant reviews.

## Run locally

Use Node 24 (see `.nvmrc`).

```sh
npm ci
npm --prefix frontend ci
npm run dev
```

Frontend: http://localhost:3000. Backend: http://localhost:3001. The single development command starts both, reports readiness/startup errors, and stops both on Ctrl+C. It does not start scraping or send scheduled alerts. `npm run dev:api` starts only the API.

Address research uses public NYC and NY State Open Data endpoints and needs no API keys or database. Without `MONGODB_URI`, search returns an explicit unavailable response while address research stays usable. No demo rentals are substituted.

Copy `.env.example` to `.env` and `frontend/.env.example` to `frontend/.env.local` if configuring services. Blank credentials are supported; never commit real credentials.

| Variable | Used for |
| --- | --- |
| `MONGODB_URI` | Development database for rentals, accounts, tracker, research snapshots, comparisons, notifications, jobs |
| `FIRECRAWL_API_KEY` | StreetEasy ingestion |
| `GOOGLE_GEOCODING_API_KEY` | Optional ingestion coordinates; an unsuccessful lookup remains missing |
| `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `JWT_SECRET` | Google sign-in; matching public client ID in frontend; production requires a random signing secret of at least 32 characters |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (or `EMAIL_FROM`) | Requested emails from a provider-verified sender; missing configuration never reports success |
| `OPENROUTER_API_KEY` | Lease text analysis and floor-plan vision |
| `REDUCTO_API_KEY` | PDF lease extraction, in addition to OpenRouter |
| `INTERNAL_JOB_TOKEN` | Separate server-only secret, at least 32 characters, for global HTTP alert processing; ordinary account tokens are rejected |
| `PORT` | API port (default 3001) |
| `FRONTEND_PORT` | Frontend port used by the root launcher (default 3000) |
| `FRONTEND_URL` | Allowed production frontend origin |

Frontend configuration belongs in `frontend/.env.local`: `NEXT_PUBLIC_API_URL` for a separately hosted API and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` for sign-in. The central API client defaults to the existing same-origin Next.js `/api` rewrite. An email request requires authentication and can only target the signed-in address.

See [development, feature contracts, operations, and current validation](docs/IMPLEMENTATION_2026-10-29.md). Production uses Node 24 for the API, workers and frontend. Set the same stable `JWT_SECRET` on API replicas; without a development secret, sessions and signed report receipts expire when the API restarts. Public address research does not require Google sign-in.

## Validation and maintenance

```sh
npm run build
npm --prefix frontend run typecheck
npm --prefix frontend run build
npm run test:reliability
npx playwright install chromium # once, for browser tests
npm run test:e2e                # desktop/mobile, isolated fixtures and database
npm run test:dev                # real startup, shutdown and occupied-port failures
npm run validate:research       # live, read-only checks for three real properties
npm run audit:listings          # read-only MongoDB audit; requires MONGODB_URI
npm run validate:listing-flow   # replay live API observations in temporary MongoDB
npm test                       # full unit, property, and reliability suite
```

`RESEARCH_VALIDATION_OUTPUT=/tmp/leaseiq-reports npm run validate:research` also saves full dated JSON reports. Source failures or unmatched expected properties produce a nonzero exit status.

The suites exercise ingestion, storage, deduplication, source failures, provenance, authorization, uploads, SSRF, alert delivery, private snapshots and tracker persistence. Automated tests use isolated MongoDB instances and controlled service responses; browser tests block external network calls. No production credentials, real emails or paid model calls are required. MongoDB test binaries and Chromium must be installed/downloadable on first run. Existing property-test sample counts remain intact. The manual `test:resend`, `test:workflow`, `test:combined`, scraping and verification commands can contact configured services; they are not part of the isolated suites.

The October 22 listing counts are historical. The October 29 audit could not connect because no development `MONGODB_URI` was available. Search and job health therefore explicitly return unavailable locally. No current listing count, availability or freshness is asserted, and no existing data repair was applied. Run a fresh read-only audit once development access is configured, then review [dry-run repair and rollback instructions](docs/listing-repairs.md).

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

See [product audit, validation screenshots, and rollout limitations](docs/PRODUCT_POLISH.md) and [Google sign-in setup and account-index repair](docs/GOOGLE_SIGN_IN.md).
