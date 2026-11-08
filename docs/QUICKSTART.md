# LeaseIQ quick start

Use Node 24.x. Public address research does not require an account, database or API key.

1. Run `npm ci` and `npm --prefix frontend ci` from the repository root.
2. Run `npm run dev` to start both services.
3. Open http://localhost:3000. Ctrl+C stops both services.

To configure account/search features, copy `.env.example` to `.env` and `frontend/.env.example` to `frontend/.env.local`. Set the intended development MongoDB URI and matching Google OAuth credentials. Keep credentials private. Missing services remain explicitly unavailable; do not insert sample rentals into the development database to hide that state.

Lease PDFs require Reducto and OpenRouter. Floor-plan images require OpenRouter. Requested email requires Resend and a verified sender. The environment templates and [current operations guide](IMPLEMENTATION_2026-10-29.md) describe each variable and the security/feature contracts.

## Validation

`npm test` runs isolated unit, property and reliability suites. For desktop/mobile browser flows, install Chromium once with `npx playwright install chromium`, then run `npm run test:e2e`. No production credentials, paid calls or real email are used. First runs need access to download the test MongoDB binary and Chromium. `npm run test:dev` checks startup, shutdown and occupied-port failures.

Build with `npm run build`, `npm --prefix frontend run typecheck` and `npm --prefix frontend run build`.

`npm run validate:research` makes live, read-only public-data calls. `npm run audit:listings` requires a database and reads it without changing listings. Review [dry-run repairs and rollback](listing-repairs.md) before any data maintenance. Starting the app does not start paid scraping or alert workers.

The October 29 workspace has no configured MongoDB or provider credentials. Search/account/upload services therefore need setup; public address research works. See [current evidence and limitations](IMPLEMENTATION_2026-10-29.md).
