# Alaa's Academy

Exams (opened with a personal PIN) and homework assignments for a private academy. React + Vite web app, Express + MongoDB API, deployable on Vercel's free plan.

- **Deploy:** see [DEPLOY-VERCEL.md](DEPLOY-VERCEL.md). Put your variables in Vercel, push to GitHub, done.
- **Run locally:** `cp .env.example .env`, fill it in, `npm install`, then `npm run dev:api` and `npm run dev:web` (app on http://localhost:5173).
- **Test:** `npm test` (needs a MongoDB-compatible server on 127.0.0.1:27017). `npm run typecheck`.
- **What changed between versions:** [CHANGES-v2.md](CHANGES-v2.md).

Layout: `apps/web` (website), `apps/api` (API, also run as the single Vercel function in `api/index.ts`), `vercel.json` (build, routing, security headers).
