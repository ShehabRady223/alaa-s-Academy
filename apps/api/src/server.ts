import { app } from './app';
import { env } from './config/env';
import { startJobs } from './jobs';
import { ensureReady } from './serverless';

// Long-running mode (local development, Docker, a VPS). On Vercel this file is not used: see /api/[...path].ts.
async function main() {
  await ensureReady();
  startJobs();
  app.listen(env.PORT, () => console.log(`API listening on :${env.PORT}`));
}
main().catch((e) => { console.error(e); process.exit(1); });
