# Deploy Alaa's Academy on Vercel (free plan)

You need: a GitHub account, a Vercel account (free "Hobby" plan is enough) and a MongoDB Atlas account (free M0 cluster is enough).

The site and the API deploy together from this one repository. Vercel serves the website as static files and runs the API as one serverless function. Both live on the same address, so there is no CORS setup and cookies just work.

## 1. Create the database (MongoDB Atlas, free)
1. Create a free **M0** cluster. Pick a region close to **Frankfurt (AWS eu-central-1)**: the function in `vercel.json` runs in `fra1`.
2. **Database Access** → add a user with a password (letters and numbers only keeps the connection string simple).
3. **Network Access** → **Add IP Address** → **Allow access from anywhere** (`0.0.0.0/0`). Vercel has no fixed IP address, so this is required. The database is still protected by its password.
4. **Connect** → **Drivers** → copy the connection string. Replace `<password>` and add the database name before the `?`:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/alaas-academy?retryWrites=true&w=majority`

## 2. Make your `.env`
Copy `.env.example` to `.env` and fill in:

| Variable | What to put |
|---|---|
| `MONGO_URI` | The connection string from step 1 |
| `JWT_SECRET` | A long random text. Run `openssl rand -base64 48` (no openssl? run `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`) |
| `TOKEN_ENCRYPTION_KEY` | Exactly 64 hex characters. Run `openssl rand -hex 32` (or `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`). **Keep it unchanged forever:** it protects the exam PINs, and changing it invalidates every PIN already issued. |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Your first teacher account (8+ characters, with a letter and a number). It is created automatically on the first visit. |

Everything else is optional (email, your own domain, session lengths).

> **Do not commit `.env` to GitHub.** It contains your database password and the keys that protect your students' sessions and PINs. `.gitignore` already excludes it, so a normal `git add .` leaves it out. You will give it to Vercel directly in step 4.

## 3. Put the code on GitHub
```
git init
git add .
git commit -m "Alaa's Academy"
git branch -M main
git remote add origin https://github.com/YOUR-NAME/alaas-academy.git
git push -u origin main
```
Check on GitHub that there is **no** `.env` file in the repository (only `.env.example`).

## 4. Deploy on Vercel
1. Vercel → **Add New… → Project** → import your GitHub repository.
2. Leave **Root Directory** as the repository root and the framework as **Other**. The build settings come from `vercel.json`.
3. Open **Environment Variables**, then **import your `.env` file** (drag it in, or paste its contents into the first field: Vercel splits it into separate variables). Leave "Production", "Preview" and "Development" ticked.
4. Click **Deploy**. It takes about a minute.

Open the address Vercel shows (`https://your-project.vercel.app`) and sign in with `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

## 5. Right after your first sign-in
- Change your password (Settings), then delete `ADMIN_PASSWORD` from Vercel → Settings → Environment Variables and redeploy. It is only used while no teacher exists, so leaving it is harmless, but there is no reason to keep a password there.
- Add your first student. Without email set up, the invitation link is shown on screen for you to send yourself.

## Optional
- **Email** (invitations, password resets): set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` and `MAIL_FROM`, then redeploy.
- **Your own domain:** add it in Vercel → Settings → Domains, then set `CLIENT_URL=https://your-domain.com` and redeploy. The `*.vercel.app` address keeps working.
- **Updating the app:** push to GitHub and Vercel redeploys by itself.
- **Coming from an older version with data:** run once on your computer, with your production `MONGO_URI` in `.env`: `npm install` then `npm run migrate`. Back up first.

## The free plan, explained
- **No scheduled jobs are needed.** The free plan only allows a cron job once a day, so the app does not use them. Exams whose time ran out are closed when you open Results or the dashboard, and "exam closes soon" notices appear when your notification bell loads.
- **Rate limits and login protection** are kept in the database, not in memory, so they hold even though the function restarts constantly.
- The first request after a quiet period takes a second or two longer (a cold start). Everything after that is fast.
- Requests are limited to 4.5 MB, and a function call to 30 seconds. Both are far above what the app needs.
- Vercel's free plan is meant for personal, non-commercial use. If the academy charges fees, check their terms and consider the Pro plan.
- Atlas M0 gives 512 MB of storage, which is a lot of exams.

## If something goes wrong
| You see | Cause and fix |
|---|---|
| `MISCONFIGURED … Missing or invalid environment variables: X` | `X` is missing or wrong in Vercel. Fix it under Settings → Environment Variables, then **Redeploy** (changes apply to new deployments only). |
| `DATABASE_UNAVAILABLE` | The connection string is wrong, or Atlas does not allow Vercel in. Re-check step 1.3 and the password. |
| Sign-in works, then you are sent back to the login page | Open the site over `https://`. Cookies are secure-only. Also make sure you use one address consistently. |
| `CSRF_BLOCKED` | You are using an address the app doesn't know (a custom domain). Set `CLIENT_URL`, or add more addresses to `EXTRA_ALLOWED_ORIGINS`, and redeploy. |
| Every `/api/...` call is 404 | `vercel.json` is not at the repository root, or **Root Directory** in the Vercel project is not the root. |
| Exam PINs stopped working after a redeploy | `TOKEN_ENCRYPTION_KEY` was changed. Put the original value back; or generate new PINs for each student. |

Function logs: Vercel → your project → **Logs**. Passwords, links and tokens are never written to them.

## What was verified, and what to check on your first deploy
Verified here: the whole app against a real database; Vercel's own CLI build of this repository (the function bundles the native password library and the PDF font files, runs on Node 22, and routes every `/api/…` path to the function); the web pages with their security headers in a real browser, with no blocked resources.
Not verifiable from here: your actual Vercel and Atlas accounts. On the first deploy, sign in, create a student, open an exam with its PIN, and download a student PDF report. If any of those fail, the Logs page will say why.
