# Product polish and data trust — October 23, 2026

## Audit

Started `feature/leaseiq-polish` from `origin/main` and fast-forwarded the existing
`leaseiq-research-reliability` commits into it to preserve the previous research,
verification, repair and test work. The starting suite passed 314 tests.

The main remaining problems were:

- Extracted IDs could change while the detail URL stayed the same. The ID-only
  audit missed duplicate URL ownership. Reused IDs could overwrite a different
  address or unit.
- Numeric rents were assumed monthly; missing rents were rejected. Contact prices,
  ranges, concessions and foreign currencies needed explicit handling.
- Imported observations looked more authoritative than they were. Freshness did
  not distinguish identity verification, and Date parsing lost milliseconds.
- Mobile filters occupied most of the first screen. Saving required sign-in,
  and listing comparison was missing. Report comparison already worked.
- Alert emails and saved cards still assumed exact monthly prices. Unknown fees
  could become “No Fee,” and proxy outages could expose JSON parsing errors.

## Implementation

### Identity and provenance

New imports validate the source hostname and observation date. Source IDs,
canonical detail URLs and explicit normalized unit identities participate in the
existing sparse unique source-key index. Concurrent imports, tracking parameters,
and changed extraction IDs cannot create a second owner of those keys.

Legacy source URLs are checked before writes. Multiple owners cause an explicit
import failure, with job accounting preserved. A changed street, unit, ZIP, city,
or source detail URL is quarantined before the original data is touched.
Missing units are never inferred from rent or nearby addresses. Existing ambiguous
records remain visible with warnings; no production records were deleted or merged
in this pass. Search/detail reads also flag exact legacy URL sharing. Canonical
tracking variants are covered by the audit and ingestion checks; read-time cross-record
warnings currently look up stored URLs exactly before comparing canonical keys.

Observations retain field dates, source dates and raw rent evidence. Primary-source
verification remains separate from observation freshness. Stale counting no longer
marks unverified rentals inactive. Only evidence-backed availability changes should
hide a rental. Updating a range to contact pricing atomically clears old numeric
bounds. Missing rent observations clear the current quote rather than preserving
an apparently current amount.

### Rent behavior

- USD numeric quotes and well-formed currency strings retain their reported daily,
  weekly or monthly cadence. Legacy numeric extraction defaults to monthly, which
  is explicitly recorded in rent evidence; it is not an independently verified term.
- Ranges, “from” quotes, net-effective text, malformed numbers and non-USD quotes
  never become exact unit rents. Missing/ambiguous prices stay visible as unknown.
- Building ranges and contact pricing have a separate source-dated object.
- Budget filters include known monthly USD unit rents only. Building/unknown rents
  remain available in unfiltered search.
- Rent sorting uses monthly equivalents for weekly/daily quotes (52 weeks or 365
  days divided by 12). The UI discloses this calculation. Unknown and building rents
  sort last in both directions; they are never treated as zero.
- Dashboard cards and alert emails handle building, unknown and nonmonthly rents.
  Alert HTML escapes listing content, uses real source URLs, and does not infer
  “no fee” from missing data. Scheduled email processing excludes disabled alerts,
  inactive rentals and historical duplicate records. No emails were sent during validation.

### Experience

A quieter editorial home page uses an original architectural SVG, direct search,
and borough shortcuts. Rental search uses a compact expandable filter bar,
shareable filter URLs, a responsive card grid, clear warnings and a comparison tray.
Guests can save up to 50 IDs in their browser; signed-in users retain account saves.
Three-rental comparison loads current API details rather than stale price snapshots.
Guest saves are kept separately from account saves, without an automatic migration.

Listing detail reveals source trails and costs on demand. Existing public-record
research, report comparison, lease analysis, account dashboard and saved alerts are
retained. Loading, empty, partial-failure and retry states are explicit. Motion honors
`prefers-reduced-motion`, including programmatic report scrolling.

## Validation

| Check | Result |
| --- | --- |
| Full suite (`npm test`, Node 22) | 349 tests passed, 31 files; no skips |
| Backend production build | Passed |
| Next.js production build | Passed; 11 generated routes/pages |
| Live public-record validation | Manhattan, Brooklyn and Queens all matched; all seven source checks available for each |
| Live listing replay | 24 observations → 21 isolated records; 24 repeat imports created no duplicates |
| Live database audit | Read-only, 661 records at audit time |
| Production browser checks | Passed at desktop 1440×960 and phone 390×844; no horizontal page overflow on phone home/search |

The replay (`npm run validate:listing-flow`) reads the running listing API and writes
only to a temporary MongoDB instance. It exercises parser → normalizer → unique
storage → presentation → search with real observations. It is not a fresh Firecrawl
extraction and does not write to Atlas.

Browser checks covered guest saving, reload persistence, two-rental comparison,
Brooklyn studios under $4,000, no-match recovery, loading states, home/search
responsive layouts, and a live 230 West 55 Street report. Stopping the local API
produced the intended outage state; restarting it and pressing Retry restored real
results. The final app was inspected using production builds. Source photos are
actual listing images; unavailable images have an explicit fallback.

One randomized range test exposed an existing generator bug: equal generated dates
were incorrectly expected to be an invalid range. The generator now constructs
strictly reversed dates without reducing its sample count or weakening assertions.

Screenshots: [home](validation/home-desktop.png),
[search desktop](validation/search-desktop.png),
[search phone](validation/search-mobile.png).

## Remaining limitations and rollout

- The live audit found **103 shared detail URLs across 333 records** despite zero
  shared source IDs. Some historical records contain multiple unit URLs and no unit
  identity. Automatically collapsing them would risk combining different apartments
  or breaking saved references. These remain visible and flagged; incoming collisions
  fail closed. Resolve them with primary unit evidence and preserve reference history.
- The audit also found 491 stale records, two unknown rents, 97 building ranges and
  one contact-priced building. Counts are a snapshot; the existing external ingestion
  schedule continues to change the live database independently of this branch.
- Deploy the backend and scraper together to use the new identity keys and guards.
  An older deployed scraper still creates ID-only writes. This PR does not deploy it.
- Primary-source accessibility still limits verification. A source host match or an
  HTTP success is not a verified apartment. Unverified observations are labeled.
- OAuth credentials were unavailable to the local frontend, so browser validation
  covered guest saving; authenticated email delivery and production scheduling were
  not exercised. Existing account tests remain in the full suite.
- Existing Next.js/SWC version, Browserslist age and multiple-lockfile warnings
  remain nonfatal. Dependencies were not upgraded in this product change.
- No additional datasets, building safety scores, tenant reviews or rent-stabilization
  claims were invented. Research retains its source coverage limits.
