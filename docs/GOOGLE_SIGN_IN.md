# Google sign-in recovery

The production database retained a unique, non-sparse `supabaseId_1` index. Google accounts omit this legacy ID, so the second Google account collided with the first account's missing value. The schema already intended a sparse index, but schema changes do not replace existing MongoDB indexes. Production's email index also lacked the schema's intended uniqueness.

The repair builds named unique email and sparse legacy-ID indexes before dropping the two known obsolete indexes. It refuses duplicate or missing account emails, never edits account documents, leaves unrelated indexes alone, and can be rerun after interruption. MongoDB 5+ permits these replacement indexes to coexist during the migration.

```sh
# Review only (no index changes)
npx tsx scripts/repair-user-indexes.ts
# Apply to the database configured by MONGODB_URI
npx tsx scripts/repair-user-indexes.ts --apply
```

Apply the repair before deploying the schema changes. Do not restore the old non-sparse index: after multiple Google accounts exist, it cannot represent valid account data. Application rollback can retain the repaired indexes.

The GIS popup code exchange now uses the request's allowlisted page origin instead of the obsolete `postmessage` value. Client-supplied redirect URIs are ignored. The frontend uses its configured API or the same-origin proxy, and displays actionable sign-in errors. Logs exclude Google codes/tokens and profile details.

References: [Google popup code exchange](https://developers.google.com/identity/oauth2/web/guides/use-code-model), [MongoDB sparse unique indexes](https://www.mongodb.com/docs/manual/core/index-sparse/).

Validation: 355 tests across 32 files passed, including reproduction of the second-account failure, preservation of existing accounts, safe/idempotent index repair, retained email/legacy-ID uniqueness, two-account sign-in and authenticated `/me`, returning account identity, rejection of untrusted origins, and expired-code handling. Google token verification/exchange is mocked in these integration tests; the database and HTTP routes are real. Backend and frontend production builds passed. Completing Google login in production still requires a real user interaction.
