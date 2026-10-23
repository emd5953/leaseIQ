# Rental research reliability and validation

Implemented and checked October 22, 2026. This document distinguishes verified local behavior from deployment and source limitations.

## Architecture review and changes

The existing app uses Next.js 15/React/Tailwind, an Express API, MongoDB/Mongoose, a StreetEasy scraper backed by Firecrawl, and optional Google, Resend, Reducto, and OpenRouter services. The original research service asked an LLM to invent neighborhood scores, safety assessments, restaurants, and rent recommendations without source retrieval. Two independently registered `Listing` schemas used the same MongoDB collection with incompatible area, coordinate, pet-policy, and building fields.

The new research service uses deterministic, attributed public records. It runs independently of the listing database. There is no paid research API or LLM dependency. Accounts remain necessary for account features and email delivery, but public address research is accessible without sign-in.

### Listing data path

1. **Extraction:** StreetEasy remains the configured source. Source failures are propagated. A fallback identity is stable across rent changes; address-only identity requires an explicit unit. An empty extraction is flagged as unsuccessful coverage, not a successful refresh.
2. **Parsing/normalization:** Numeric values must be finite, missing rent rejects an import, studios retain zero bedrooms, malformed dates stay unknown, and missing utilities/policies are nullable. Pet negation is handled and the original restriction text is retained. Generic laundry is no longer promoted to in-unit laundry.
3. **Address scope:** Unit numbers are separated from the street. Explicit borough/city names establish NYC scope; a coarse ZIP range or bounding box alone does not. This intentionally leaves ambiguous neighborhood-as-city addresses for correction. Geocoding is optional, bounded by timeouts, and rejects partial/coarse matches. It never fabricates coordinates.
4. **Deduplication:** A source and ID must match within the same source-array entry. Cross-source matching requires a normalized street, explicit unit, city, and state. Adjacent units and addresses without units do not merge based on price similarity. A sparse unique source-key index prevents concurrent new imports of the same identity.
5. **Storage:** One schema is shared by ingestion and API reads. Area, floor plans, building fields, fees, utilities, and unit numbers survive ingestion. An update refreshes `lastSeenAt` and the source URL, preserves `firstSeenAt`, and ignores older observations. Missing fields do not erase known values. `fieldObservedAt` preserves each extracted field's observation date; optimistic concurrency retries protect competing updates.
6. **Presentation:** The API reads both legacy `squareFeet` and canonical `squareFootage`. Freshness comes from source observations, not `updatedAt` or the time the browser loaded results. Observations older than 72 hours are explicitly stale; this is a product freshness threshold, not a claim that the unit is unavailable. Source dates in the future or absent are unknown. Historically defaulted false fee/utility values are suppressed unless supported by a field observation. No-fee searches require explicit observation evidence.
7. **Jobs:** Returned processing errors and rejected writes both count as failures. Partial successes are retained in job metrics, with `failed` status and bounded diagnostic messages. Source HTTP clients enforce deadlines; the old outer `Promise.race` timers were removed because they left abandoned imports writing after completion was recorded. Hosts must allow the job enough time to finish. Jobs no longer expire listings simply because a partial scrape omitted them.

### Public-record research path

| Source | Join / scope | Used for |
| --- | --- | --- |
| [HPD buildings](https://data.cityofnewyork.us/d/kj4p-ruqc) | Exact house number + normalized street + borough, active records; one distinct building ID required | Building identity, BIN, block/lot |
| [HPD violations](https://data.cityofnewyork.us/d/wvxf-dwi5) | Building ID | Distinct violation counts grouped by status/class; latest 20 records across all available dates |
| [HPD registrations](https://data.cityofnewyork.us/d/tesw-yqqr) | Building ID, latest registration end date | Registration ID and filing/end dates |
| [HPD contacts](https://data.cityofnewyork.us/d/feu5-w2e2) | Registration ID | Registered owner/agent names and roles; contact addresses are not displayed |
| [PLUTO](https://data.cityofnewyork.us/d/64uk-42ks) | Borough code + block + lot, exactly one tax lot | Year built, residential units, owner, districts, coordinates |
| [MTA subway stations](https://data.ny.gov/d/39hk-dx4f) | Coordinate bounding query, then calculated distance ≤0.5 mile | Up to three nearby station complexes and inventory daytime routes |

[HPD defines class C as immediately hazardous](https://www.nyc.gov/site/hpd/services-and-information/clear-violations.page). This is a classification in the source, not a LeaseIQ safety score or a determination about a specific apartment. Open and closed totals span all available dates and may include common-area records or orders. Large buildings are not directly comparable to small ones by raw counts alone.

The backend allows only these fixed source domains/datasets, escapes SoQL string values, bounds returned rows, sets request timeouts, and preserves failed-source status. Publisher metadata is cached for one hour (failed metadata for one minute); record queries are fresh per report. Metadata and record requests are separate calls, not a transactional publisher snapshot. Aggregate and individual-violation queries have separate provenance, so one may succeed while the other fails.

Unmatched, ambiguous, or unavailable building identities stop downstream joins. Missing data does not trigger an AI fallback. Owner identity is not a measure of management quality; expired registration dates are described as a published record to verify, not an accusation of current noncompliance. Transit distances are calculated from tax lot coordinates to station coordinates, not entrances, accessible routes, walking distances, or travel times.

## Real-property checks

Read-only live source validation on October 22, 2026 returned:

| Property | HPD building ID | Open violations | Open class C | Total recorded | Result |
| --- | --- | ---: | ---: | ---: | --- |
| 230 West 55 Street, Manhattan | 34133 | 0 | 0 | 4 | Unique match; all seven source queries available |
| 125 Court Street, Brooklyn | 973593 | 1 | 0 | 96 | Unique match; all seven source queries available |
| 42-12 28 Street, Queens | 969865 | 6 | 0 | 7 | Unique match; all seven source queries available |

These are dated observations, not fixed expected counts or statements about current unit conditions. `npm run validate:research` reruns the checks without asserting changing counts. It also verifies that an intentionally unmatched address receives no building metrics.

Publisher dates at validation: HPD buildings, registration, and contacts August 12, 2026; PLUTO August 24, 2026; violations October 21, 2026; MTA stations October 22, 2026. The report exposes these older snapshots even though retrieval occurred October 22. The Brooklyn registration end date had passed in the retrieved snapshot; the report explicitly says the published data may lag and asks the renter to confirm with HPD.

The browser flow was exercised against real Manhattan and Brooklyn addresses, including lookup, report sections, source dates, and a two-property comparison. Typography inspection identified and fixed an invalid font fallback that had rendered body text in Times. Desktop content had no horizontal overflow. Search correctly displays a service-unavailable state when MongoDB is absent instead of reporting zero matches. Listing ingestion/search integration uses a disposable MongoDB and explicitly synthetic rents, never production data.

## Verification results

- Backend TypeScript build and frontend production build: passed on Node 22.23.4.
- Focused `npm run test:reliability`: 107 passing tests on Node 22.23.4, covering source failures (403/429/500/timeouts), missing/ambiguous matches, no fabricated scores, exact unit identity, concurrent writes, field preservation, stale source observations, filtering, pagination, partial import failures, public HTTP research, authenticated email boundaries, and escaping in rendered email. No email was sent.
- Full suite after repairing the legacy contracts and test isolation: **275 passed across 26 files, zero failures or skips**, using `npm test` on Node 22.23.4. The original 257 tests remain, with 18 added regressions. Earlier validation had reported 102 failures; those are now resolved.
- A second full run with `npm test -- --sequence.shuffle --sequence.seed=20261022` also passed all 275 tests. The backend TypeScript build and `git diff --check` passed after the repairs.

### Full-suite repairs

- Restored the legacy `supabaseId` field and its sparse unique index. Existing external-only accounts can be stored without fabricated passwords. Password accounts still require both a hash and salt; partial credentials are rejected even when an external ID exists. External-only accounts cannot authenticate through `validatePassword`. Existing Google account storage is preserved; no new authentication endpoint was added.
- Migrated obsolete listing fixtures and assertions to canonical `price.amount`, `source`, `firstSeenAt`, and `lastSeenAt` fields. Price ranges, source identity, persistence, coordinate validation, and merge checks remain asserted. Source interfaces now match the persisted schema; geocodes are correctly optional.
- Fixed the older deduplication utility to retain every incoming source, preserve the first observation, refresh source URLs, and reject stale overwrites. Exact source identity can refresh an ungeocoded listing. Missing geocodes no longer crash comparisons, ambiguous matches do not select an arbitrary document, and antipodal distance calculations remain finite.
- Isolated every database-backed generated property case, including shrinking, with collection cleanup. Previously records leaked between generated cases and broke pagination/hidden-listing assertions. Index creation is awaited before index-dependent properties. At most four Vitest workers run concurrently so temporary MongoDB servers do not overload the host; no test timeouts were increased and no sample counts were reduced.
- Strengthened query properties to assert the complete expected result set, including unknown versus explicitly observed fees. Merge properties now check the newest observation in either arrival order. The 18 added regressions cover account types, credential requirements, identity/email uniqueness, stale merges, all-source retention, missing geocodes, ambiguous identities, invalid observation dates, and numerical distance limits. No tests were removed, skipped, or marked as expected failures.

## Existing-database rollout

The initial implementation was validated without production credentials. The later authorized database repair is recorded below. Run `npm run audit:listings` with the intended database before deployment; it only reads and reports missing source dates, stale observations, ambiguous units, legacy fields, unverified fee fields, and repeated source identities.

New source keys are sparse, allowing older records without keys to coexist. Existing duplicate source records are not silently collapsed. Review the audit, select survivors, and remap saved listing/alert references before any future merge. Reimports establish keys and observed fields for matched records. Historical documents without normalized unit keys may not deduplicate across sources until normalized. Legacy source-name variants and records whose identity changed require a deliberate migration. Do not invent dates, units, policies, or fees during that process.

The canonical schema preserves legacy root coordinates on reads because an existing database can retain its old geospatial index. New records omit absent coordinates rather than writing malformed empty geometry. Keep the old index until a reviewed migration has moved legacy coordinates; do not drop production indexes automatically. Application index creation must be enabled or the documented source-key index must be provisioned before relying on concurrent-import uniqueness.

## Remaining source and access limitations

- Live scheduled StreetEasy/Firecrawl ingestion, Google authentication, account creation, and real email delivery remain unvalidated. Parser-to-storage-to-search was verified using a disposable database. Research uses genuine public-source responses.
- DOB permits/complaints, HPD complaint details, litigation, rent stabilization, tenant reviews, manager response quality, street noise, flood exposure, grocery access, and market rent comparisons are not collected as verified findings. An exploratory request to the HPD complaints dataset `uwyv-629c` returned HTTP 403; it was not wired into the product as if available.
- Public source access may throttle, time out, or change schemas. A failed query produces an evidence gap; it never clears a building. Source metadata can be older than a report and may fail independently.
- Conservative exact matching can miss alternate entrances, house-number ranges, renamed streets, and properties outside HPD jurisdiction. It deliberately does not fuzzy-match these to a different building.
- PLUTO is tax-lot scoped, not necessarily a single building or unit. MTA inventory is not live service or elevator status. No commute, safety, demographic, or management reputation score is generated.
- Comparison snapshots live only in the current browser; they are not synced to accounts and become dated. Run a new lookup and choose “Update comparison” to refresh a saved brief. A print/export is a snapshot, not a live monitor.
- Mobile breakpoints are implemented; this validation used the desktop in-app browser. No device-specific mobile or assistive-technology audit is claimed.


## Authorized database repair — October 22, 2026

The local backend authenticated to the LeaseIQ Atlas database using a dedicated
user restricted to `readWrite` on `leaseiq`. Credentials remain outside Git.
Private Extended JSON backups were written before a transaction updated the data.
All 612 listing IDs and the existing saved-listing reference were preserved.

- Converted three zero rents to explicit unknown values, retaining the original
  values for review. No building-level minimum rent was invented as a unit price.
- Quarantined four shared source IDs across eight records. These records stay
  visible with source-identity warnings; their unit ownership still requires
  evidence. Imports of quarantined IDs are blocked.
- Backfilled source keys and enabled the sparse unique `sourceKeys` index.
- Verified five records against exact unit offers and marked them unavailable.
  Further source checking encountered an access block and stopped. Unverified
  stale listings remain active with warnings.
- The follow-up audit reports zero invalid numeric rents, zero duplicate active
  source associations, three unknown rents, and eight records needing identity
  review. A second repair dry run proposes zero changes.
- Backend health reports connected; NYC search returns 283 results. API and
  browser checks verified unknown-rent warnings, source-identity flags, stale
  visibility, and inactive status for confirmed unavailable records.
- All 294 tests across 27 files pass without weakening the existing tests. Backend
  and frontend production builds pass. Tests use disposable databases, not Atlas.

The remaining 603 stale records and four records with only quarantined source
associations have not been freshly verified. Quarantine contains ambiguous
identity data; it does not prove that multiple records represent the same unit.
See [repair operation and safeguards](listing-repairs.md).
