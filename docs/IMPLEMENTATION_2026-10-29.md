# LeaseIQ implementation and operations — October 29, 2026

This is the current behavior and setup guide. October 22 reports remain dated historical evidence, including their old runtime versions and database counts.

## Local setup and deployment

Use Node **24.x** for both packages and all deployment services. `.nvmrc`, `.node-version`, package engines and `render.yaml` agree. Install with `npm ci` and `npm --prefix frontend ci`; then run `npm run dev` from the repository root. Frontend is http://localhost:3000 and API is http://localhost:3001. Ctrl+C stops both process trees. A startup failure in either service stops its sibling. `npm run test:dev` checks those behaviors with isolated ports and no credentials. The launcher reads the root `.env`, supports `PORT`/`FRONTEND_PORT`, and sets the Next.js server's API rewrite target automatically.

Copy the two `.env.example` files to root `.env` and `frontend/.env.local` only when configuring services. Public NYC research works without either file. Configure the intended **development** MongoDB database, network access and database user before enabling account/search features. No localhost database or fabricated listings are silently substituted.

For sign-in, create a Google OAuth web client with the actual frontend origin (locally `http://localhost:3000`) as an authorized JavaScript origin. Set its public ID in `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, and its matching backend ID/secret in `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET`. The frontend uses the popup authorization-code flow. MongoDB stores accounts. Production also requires a stable random `JWT_SECRET` of at least 32 characters; generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. Never share that value with browser code. Missing/placeholder production signing secrets fail startup. Without a configured development secret, restarting the API invalidates sessions and signed receipts.

Configure `REDUCTO_API_KEY` plus `OPENROUTER_API_KEY` for lease PDFs, only `OPENROUTER_API_KEY` for floor plans, and `RESEND_API_KEY` plus a verified `RESEND_FROM_EMAIL` for requested email. `EMAIL_FROM` remains a compatibility alias. Production rejects missing senders and the provider's sandbox domain. Google sign-in and these live integrations remain unverified in this workspace because credentials were absent; automated fixtures verify the complete local integrations without paid calls or email.

Configure `FIRECRAWL_API_KEY` for ingestion; Google geocoding is optional and ambiguous/partial matches leave coordinates unknown. `npm run scraping` and `npm run alerts` run scheduled workers separately. Starting the app never launches them. The Render blueprint schedules ingestion every 15 minutes and alerts at minutes 3, 18, 33 and 48. Configure the same database, sender/frontend URL and signing secret on relevant services. No claim is made about provider budget, deployment health or actual listing refresh cadence until jobs run successfully.

Production API: `npm run build && npm start`. Frontend: `npm --prefix frontend run build` then `npm --prefix frontend start`. Configure `FRONTEND_URL` for allowed production origins and either `API_INTERNAL_URL` for the Next.js server rewrite or `NEXT_PUBLIC_API_URL` for a separately hosted browser API. The hosting project's Node setting must also be 24.x. Restart/rebuild after changing frontend public environment values.

## Upload and email contract

Uploads require an authenticated bearer token before multipart parsing. The UI disables file selection before sign-in and clearly reports expired sessions. All frontend requests use the shared API client. Supported files are one PDF lease and/or one PNG/JPEG/GIF/WebP floor-plan image, at most 10 MB per file. File signatures must agree with their content types. DOCX must be exported as PDF first.

`POST /api/property/analyze` accepts multipart `lease`, `floorplan`, and optional `sendEmail`. The aliases `/api/property/analyze-lease-only` (`lease`), `/api/property/analyze-floorplan-only` (`floorplan`), `/api/lease/upload` (`file`) and `/api/floorplan/analyze` (`file`) share the same response:

```json
{
  "success": true,
  "analysis": { "lease": {}, "floorPlan": {} },
  "errors": {},
  "partial": false,
  "generatedAt": "ISO timestamp",
  "emailSent": false,
  "receipt": "signed receipt"
}
```

Only successfully analyzed document keys are present. Independent analyses run concurrently; a failure preserves the other result. The UI retries only the failed file and retains the completed analysis. Missing configuration produces 503, failed analysis 502, invalid content 415 and oversized files 413. Loading describes work without simulated progress. Provider output is structurally validated; missing room counts/terms remain unknown. Structured terms are normalized into readable text, and financial subtotals are calculated from extracted rent/deposit with an explicit basis and exclusions rather than trusting model-generated totals. Lease extraction has bounded requests and the model call has a 60-second timeout; the client allows 180 seconds for the full operation. Analysis covers at most the first 15,000 characters of extracted lease text, so it is not a full legal review. Truncation is disclosed in the completed report.

Emails are opt-in and can only target the signed-in account address. A failed/uncertain request never displays success. `emailSent: true` means the provider returned a message ID, **not proof of inbox delivery**; the UI explicitly says “Email provider accepted.” There is no delivery-event integration. Document/provider text is escaped in email HTML.

`POST /api/property/email` retries verified analysis using its signed receipt without another extraction/model call. It accepts either `{analysis, receipt}` or up to two `{analysis, receipt}` entries under `parts` for a completed partial retry. Each receipt is bound to the user and exact content, expires after 23 hours, and yields a stable idempotency key. Partial reports are not automatically emailed. After a failed file succeeds, the user can send the completed report via Retry email. Resend retains [idempotency keys for 24 hours](https://resend.com/docs/dashboard/emails/idempotency-keys); beyond the shorter retry window, run a fresh analysis deliberately.

## Authorization and downloads

Users can trigger only their own saved-search alerts. Global `POST /api/alerts/process` requires a separate `INTERNAL_JOB_TOKEN` of at least 32 characters, compared in constant time; account JWTs do not authorize this action. The scheduled CLI worker does not need an HTTP token. JWT verification fixes the signing algorithm and validates the user/email payload. Account routes require configured, reachable storage and restrict writable fields.

The image proxy and URL floor-plan analyzer share a downloader that permits public HTTP(S) destinations on standard ports only. It validates all DNS answers and every redirect, pins the verified address for the actual connection, rejects private/reserved IPv4/IPv6 destinations, limits redirects to three, enforces an 8 MB body cap, and checks both image MIME and magic bytes. A ten-second deadline covers DNS, headers, redirects and the entire body. SVG and compressed responses are rejected. Tests cover rebinding, numeric aliases, redirect loops, size limits and stalled bodies.

The legacy Firecrawl webhook was only logging callbacks and returning success without ingestion. It now explicitly returns 503. Use the actual polling ingestion worker; no webhook signature or result-consumption integration is claimed.

## Alerts and job health

Delivery obeys `alertsEnabled`, `isActive`, frequency and selected method. `immediate` means eligible at the next worker run, daily waits 24 hours and weekly waits seven days since the last completed delivery (or search creation for a first delivery). Manually requesting a check respects the same preferences. Disabled/inactive/not-due searches never send. Email, in-app and both are implemented independently; the dashboard reads and acknowledges account-owned in-app records.

An atomic per-search lease coordinates overlapping workers. Durable `AlertDelivery` records keep immutable payloads and keys, attempts, provider acceptance, errors and read state. Unique delivery/history keys and provider idempotency prevent repeat sends during concurrent jobs and retries. Successful in-app delivery is not repeated when its paired email fails. A crash between confirmed delivery and history recording is reconciled without resending. Definitive provider rejections remain retryable; uncertain deliveries older than 23 hours enter `review` and require operator investigation instead of automatic duplicate email. Provider acceptance cannot prove inbox delivery.

Workers rotate through the least recently checked searches in batches of 100, including unsuccessful checks, and drain at most 50 eligible listings per channel per check. Only active NYC listings created since the saved search, without known duplicate/mismatch markers and with source observations within 72 hours, qualify. An observation still does not establish current availability. Newly supported channels may deliver previously unnotified listings for that channel. Legacy `lastAlertSentAt` can contain an initialization baseline; `lastDeliveryAt`, the outbox and history record actual new delivery state.

`GET /api/jobs/health` reports database availability, latest refresh status, last successful refresh, source counts/errors, last alert check and counts of failed/needs-review deliveries. It contains no recipient data. A missing run is `never_run`; a latest failed job is `failed`; no successful completion within 60 minutes is `overdue`; a recent completion with source errors is `degraded`. Legacy jobs without source-result arrays remain readable. Individual listing observations older than 72 hours are stale even if another source/job succeeded. Search displays the job-health limitation and preserves individual source timestamps, unknown rents and building-level price labels.

## Research, sharing and tracker

Suggestions query authoritative HPD building data and expose their source. Keyboard arrows/Enter select a candidate; selecting does not run research. The user explicitly confirms the HPD building before submitting it. Server matching rechecks address, borough and building ID. Ambiguous or unmatched addresses do not join another building's records. Unmatched recovery points to HPD spelling/borough/alternate-entrance checks; unavailable sources are distinct from empty sources, with preserved successful evidence and a fresh-lookup retry.

Anonymous history stays in this browser (up to 20 reports); comparisons retain up to three. Existing version-2 browser comparisons remain readable. Account history and comparisons live in MongoDB with owner checks and pagination. Sync browser history is explicit; browser copies are preserved. Only server-signed, unchanged reports can be synced, with seven-day receipts. Older browser reports remain readable but need a fresh lookup to sync. Storage failures expose retry actions instead of false success.

Snapshots are private by default. Create share link explicitly enables anyone-with-link access; the 256-bit token is stored only as a hash. Public reads expose the immutable report and sharing date, with no account identifiers. The report shows snapshot age, source retrieval dates and publisher update dates. Creating a new link rotates the old one; Revoke sharing invalidates it. Snapshot reads use no-store/noindex headers. Revocation cannot recall copies already downloaded by a recipient.

The application tracker treats server state as authoritative. Pending changes are scoped to the account in browser storage; a failed response triggers a reread to reconcile a possibly completed save. Otherwise the error and Retry save remain visible. A repeated Save listing does not reset existing status/notes; explicitly supplied updates are validated and persisted. Ownership and valid statuses are checked on the API; missing listing references remain visible instead of disappearing. The rental UI also retains the anonymous shortlist, comparison tray, compact search filters, and source-aware rent labels from main.

## Current verification and remaining setup

Final checks on Node 24.19.0, Windows:

| Check | Result |
| --- | --- |
| `npm test` | 444 passing tests in 41 files; no failures or skipped tests |
| `npm run test:e2e` | 18 passing desktop/mobile Chromium tests |
| `npm run test:dev` | Startup/readiness, shutdown/port release, API-port failure and frontend-port failure passed |
| `npm run build` | Backend TypeScript build passed |
| `npm --prefix frontend run typecheck` | Passed |
| `npm --prefix frontend run build` | Production build passed |
| Root and frontend `npm audit` | Zero reported vulnerabilities in the resolved dependency trees |
| Production startup without `JWT_SECRET` | Nonzero exit with explicit configuration error |
| `git diff --check` | Passed |
| Running local app | Frontend pages return 200; API health reports database unavailable; search/job health return explicit 503; anonymous uploads return 401 |

The full suite retains existing property-test sample counts. Browser tests use a dedicated in-memory MongoDB database, isolated frontend build directory, controlled OAuth/analysis/research/email fixtures and blocked external networking. Coverage includes address/report/comparison persistence, keyboard selection, account history, shared viewer/revocation, tracker failed-save recovery, all upload combinations, partial-analysis and email retries, expired sessions, unmatched addresses and source outages. Test routes are only present in the test entry point, excluded from production builds. Real Google OAuth, paid providers and mailbox delivery were not exercised. Mobile tests emulate an iPhone-sized viewport in Chromium; they do not claim device or Safari coverage.

Dependencies were updated within the supported runtime, unused provider SDKs were removed, and Next.js's PostCSS dependency is overridden to the patched compatible 8.5.x line. Both lockfiles record the resolved versions. The test runner emits a future Vite config-loader compatibility notice; it does not affect the passing suite. Missing Google OAuth configuration is deliberately reported during the frontend build.

The live read-only `npm run validate:research` check on October 29 matched:

| Address | HPD ID |
| --- | --- |
| 230 West 55 Street, Manhattan | 34133 |
| 125 Court Street, Brooklyn | 973593 |
| 42-12 28 Street, Queens | 969865 |

All queried sources were available in that check; the deliberately nonexistent address remained unmatched with no building metrics. HPD building/registration source timestamps were October 28, violations October 29, PLUTO August 24 and subway data October 29. Those publisher dates are distinct from retrieval time and do not establish live listing availability.

`npm run audit:listings` and the default read-only `npm run repair:listings` both stopped before connecting because `MONGODB_URI` was missing. There was no configured local database or credential to connect. The October 22 figure of 498 stale/unverified listings is historical and has not been revalidated. No production records, source evidence, IDs, saved references or availability were changed. Configure a development database, run a fresh audit and review the dry-run plan before proposing data changes; see [repair/backup/rollback instructions](listing-repairs.md).
