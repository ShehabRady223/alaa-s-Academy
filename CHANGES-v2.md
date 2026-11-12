# Changes

## v3.0: ready to deploy on Vercel (free plan)
- One repository, one deployment: `vercel.json` builds the website and runs the API as a single serverless function (`api/index.ts`). See `DEPLOY-VERCEL.md`.
- **Environment variables go into Vercel (Import .env), never into git.** `CLIENT_URL` is optional on Vercel: the site address is derived from the deployment.
- **No cron jobs:** the free plan allows only one run a day, so nothing depends on them. Overdue exam attempts are closed when a teacher opens Results or the dashboard; "exam closes soon" notices are created when the notification bell loads.
- **Rate limiting moved from process memory to MongoDB**, because every serverless instance starts with empty memory (that would silently disable login and PIN brute-force protection). Insert-then-count design: strict under parallel bursts, and a flood does not grow the collection.
- The first teacher account is created from `ADMIN_*` variables on the first request, when no teacher exists. Indexes are ensured once per instance.
- A missing setting now returns a readable message naming the variable; an unreachable database returns a clear 503. Mail bodies (which hold links) are never written to production logs.
- Strict security headers (CSP, frame, referrer) on the website; tested in a real browser with zero violations.
- Found by running Vercel's own build locally: a catch-all file route would have 404'd every `/api/<a>/<b>` call, so the API is reached through an explicit rewrite; the Node version is pinned to 22.x.
- npm workspaces at the repository root (one lockfile). Dependencies of the API are now at the root `node_modules`.


## v2.2: exams open with a PIN instead of a QR code
- Each student gets a personal **8-character PIN** (shown as `K7MQ-4X2R`, no 0/O/1/I) for each exam. They sign in, choose **Enter exam PIN** on their home page and type it. The PIN is tied to that student's account, so it is useless to anyone else.
- Teachers see and copy PINs under **Exam access**, print PIN cards, generate a new PIN, or revoke. QR generation, QR routes and the `qrcode` dependency are gone.
- PINs are stored as a keyed hash (HMAC) plus an encrypted copy for the owning teacher. Wrong guesses are capped at 10 per student per 15 minutes.
- **Upgrade note:** `npm run migrate:v2` gives every active exam access a new PIN. Old printed QR codes stop working (an old QR link sends the student to the PIN page). Reprint PIN cards from Exam access. **Keep `TOKEN_ENCRYPTION_KEY` unchanged:** it keys the PIN hashes, so changing it invalidates every issued PIN.

## v2.1 and v2.0

## Upgrade
1. Back up the database.
2. Deploy, set the new env vars: `ACCESS_TOKEN_MINUTES` (10), `REFRESH_TOKEN_DAYS` (7), `REFRESH_ABSOLUTE_DAYS` (30). `JWT_EXPIRES_DAYS` is gone.
3. `cd apps/api && npm run migrate:v2`  (idempotent). Everyone must sign in again. Old printed QR codes stop working: reprint PIN cards.

## What changed
- **Auth:** 10-minute access token + rotating refresh token (hashed, per-login family, reuse detection, logout/logout-all, revoked on password change/disable). Stateless access check: no DB read per request.
- **Teacher isolation:** every exam, student, PIN, result and assignment query is filtered by the owning teacher; other teachers' ids return 404.
- **No question bank.** Questions are added directly inside an exam or an assignment (multiple choice, true/false, multiple select, short answer, essay). Optional topic label per question groups the progress reports. Subjects/topics/bank pages and APIs are removed.
- **Exams** (QR) and **Assignments** (homework) are separate features: own models, routes, pages. The old per-student QR link is "Exam access" (`/exam-access`). Assignments are auto-graded like exams; essays wait for the teacher.
- **Removed:** activity/audit log, templates, question bank.
- **Frontend fixes:** login/logout did not navigate (the session query was deleted by `queryClient.clear()`); stale screens after changes (central invalidation map); navigation blocked by awaited refetches; double submits (re-entrancy guard); add-question failures (hidden prerequisite, invisible array-level errors, nested form reloading the page).

## Tests
`npm test` (from the repository root) runs 57 integration tests (needs a MongoDB-compatible server on 127.0.0.1:27017).
`apps/api/tests/e2e` holds the 58-check browser test (see its README).
Not exercised by any test: dashboards/analytics (need MongoDB 5.0+ `$first`, `$bucket`, `$dateTrunc`), partial-unique and TTL indexes.
