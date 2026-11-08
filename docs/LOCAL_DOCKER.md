# Local Docker QA

Start Docker Desktop, then from the repository root:

```sh
docker compose up --build -d
```

Open **http://localhost:3100/local-test.html**. Choose Alice or Bob to enter an isolated fixture account, download the fictional lease, and inspect the local email outbox. The app runs at http://localhost:3100; QA health is http://localhost:3100/api/local/health. The web port is bound to loopback only; Mongo and the API have no published ports. Existing processes on ports 3000/3001 are unaffected.

## What is real and what is mocked

- Real production frontend build, Express routes, JWT verification, MongoDB persistence, account ownership checks, search, saved-listing tracking, alert matching/history, email templates, and multipart upload validation.
- Google sign-in is replaced by a local-only fixture-account page. It does **not** validate Google OAuth.
- Email transport is captured in memory, viewable from the local test page. No email leaves Docker. The outbox resets when the API restarts; account data persists in the local Mongo volume.
- Lease extraction/AI is replaced by an explicitly labeled response for the **exact bundled fictional PDF**. Other PDFs fail rather than receive invented analysis. This does **not** validate OCR, model availability, floor-plan analysis, or provider delivery.
- The API, database, and tests use an internal Docker network without internet egress. The frontend also joins a separate network so Docker can publish its loopback port. Public-record research and other external providers are therefore unavailable. Image builds still need internet for official images and npm packages.
- No host `.env`, credentials, production database, source bind mounts, or production tokens are used. `.dockerignore` excludes environment files from the build context. The local server refuses any other database URL, environment, or JWT secret. Its login endpoint and provider stubs are absent from the production server entry point. The QA HTML/PDF are copied only into the local frontend image.

## Repeatable checks

```sh
# All unit, property, and reliability tests in Linux containers.
# Each database test retains its isolated MongoMemoryServer and original sample counts.
# The official Mongo image supplies the binary, avoiding downloads at test runtime.
docker compose --profile test build tests
docker compose --profile test run --rm tests

# End-to-end HTTP smoke test: browser-facing Next proxy -> API -> local Mongo.
# Captures one local-only email, validates upload/auth, then removes its saves/alerts.
docker compose exec -T api node scripts/local/smoke.mjs

docker compose logs --tail=50 api web
```

Use the local test page to switch accounts and check ownership, then test saving, stages, alerts, and the supplied PDF in-browser. Fixture listings are clearly marked fictional and must never be imported to production.

```sh
docker compose down       # stop; preserve local data
# Only if you intentionally want to erase this disposable QA database:
docker compose down -v
```

This setup requires no Render collaborator access or provider credentials. Production email still requires a verified sender configured by the owner; Docker capture is not evidence of real email delivery.
