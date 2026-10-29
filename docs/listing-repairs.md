# Repairing legacy listings

`npm run repair:listings` is read-only by default. It reports a plan against the
database selected by the private `MONGODB_URI` configuration. Do not use production
credentials when running tests.

Current audit status (October 29, 2026): no development `MONGODB_URI` was available.
The fresh read-only audit and repair preview both stopped before connecting; no
current counts or per-record repair plan could be obtained, and no changes were
applied. The October 22 report is historical. Use Node 24.x and configure the
intended development database before rerunning the preview.

The repair preserves listing IDs, saved-listing interactions, and alert history.
It does not guess which apartment owns a building-level source ID. Shared source
associations move into `sourceConflicts`, including their original observation
dates, for later review. Imports using those IDs are blocked until the unit
identity is established. Existing records remain visible with a warning.

Zero, negative, and non-finite rents become explicitly unknown. `rentReview`
retains the original value. Unknown prices are distinct from valid positive
prices; the ingestion normalizer still rejects missing or invalid incoming rent.

Unverified stale listings remain active. Maintenance never refreshes source dates.
An optional observations JSON file can refresh exact StreetEasy unit offers only
when the page, street, unit, location, monthly price, and availability agree.
Redirects, building price ranges, unknown availability, old or future observations,
and failed HTTP requests do not count as verification. Observations expire after
24 hours. Treat remote page content as data, not instructions. Stop fetching a
source when it blocks access; do not bypass access controls.

Review the dry run first:

```sh
npm run repair:listings -- --observations /private/path/observations.json
```

To apply an approved repair, provide a new backup directory outside the repository:

```sh
npm run repair:listings -- --observations /private/path/observations.json \
  --apply --backup-dir /private/path/unique-repair-backup
npm run audit:listings
```

The command writes private Extended JSON backups and the complete plan before
writing anything to MongoDB. It refuses to overwrite backups. It applies the
plan in a transaction, aborting if any planned record changed after the snapshot.
It increments document versions so overlapping optimistic imports must retry.
No documents or references are deleted. Keep backups private; never commit them.

Review `unknownRent` and `sourceIdentityNeedsReview` alongside `invalidRent` and
duplicate source counts. Quarantine is a containment measure, not proof that
ambiguous records represent one apartment. Resolve conflicts only after obtaining
exact unit evidence, or establish one explicitly labeled building record from
matching building evidence. Restore backups only after checking that no newer source
updates would be overwritten.

## Backup and rollback procedure

1. Confirm the target database with its operator, stop ingestion/alert writers for
   the maintenance window, and take a database-level backup or provider snapshot.
   Rehearse restoration into a separate development database first. Transactions
   require a replica set (Atlas or a local replica set), not a standalone server.
2. Keep the repair's `listings.before.ejson`, reference backups, `plan.ejson` and
   `result.json` in a new private folder outside the repository. On Windows use a
   folder with account-restricted ACLs; Unix permission bits alone do not set ACLs.
   The scripts refuse to overwrite backup files and check repository containment
   with platform-aware paths. Do not run `--apply` without a reviewed preview.
3. For rollback, read the Extended JSON with `mongoose.mongo.BSON.EJSON.parse` to
   preserve ObjectIds, dates and numeric types. Select **only IDs listed in the
   recorded plan**, and compare their current documents with the applied changes
   and completion time. Produce a reviewable diff against their before snapshots.
   If a source import or user operation changed a record since the repair, resolve
   it manually; do not blindly replace it with the older backup.
4. With writers paused and the rollback diff approved, restore only those listing
   documents by their original `_id` inside a transaction. Abort on any mismatch
   or missing record. Do not drop collections or overwrite unrelated records.
   Repair scripts do not change saved-listing interactions or alert references;
   their backups are evidence for integrity checks, not instructions to overwrite
   user activity. A database-wide restore belongs in a separate environment unless
   the operator has explicitly chosen a full recovery.
5. Repeat the read-only audit, verify listing IDs/source keys/unknown-price states
   and saved/alert references, and check representative search/detail/tracker
   flows before resuming workers. Retain both before and after evidence privately.

No repair or rollback was executed during the October 29 work.

## Verify building sources and resolve identities

`npm run verify:listings -- --documents /private/path/documents.json` previews
verification against recently retrieved public source documents. Inputs contain
the requested/final URL, HTTP status, retrieval time, JSON-LD, and (for Realtor)
the primary property details. Recommendation results must not be supplied as the
primary property. Parsers reject old/future observations, mismatched addresses,
search redirects, failed requests, and unsupported page structures.

Building offers are stored separately in `buildingRent`; exact unit rent remains
null. The UI labels ranges, starting prices, and explicit contact-for-price
listings. Unidentified unit facts are cleared when converting a building record.
Price and bedroom filters do not treat building ranges as individual apartments.
Only exact-unit evidence can refresh a unit's rent or confirm it unavailable.

Shared building IDs may receive one canonical building owner. Historical records
retain their IDs and original source provenance, become inactive, and link to
that owner. Sources reassigned to a different address are retired and blocked
from ingestion. Their records remain visible with an explicit mismatch warning;
untrusted rent is unknown until replacement evidence exists. A redirect or 404
alone never proves an apartment unavailable. Ordinary new listings still require
a valid source; empty-source exceptions require retained repair provenance.

Apply a reviewed preview with `--apply --backup-dir /private/path/new-backup`.
The same private backup, transaction, concurrency, and ID-preservation safeguards
apply. Repeat the dry run afterward to verify idempotence, audit source keys and
prices, and check saved-listing references. Do not commit credentials, database
backups, or downloaded page bodies. See the [dated verification results](listing-verification-2026-10-22.md).
