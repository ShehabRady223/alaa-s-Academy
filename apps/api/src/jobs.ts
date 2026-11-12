import cron from 'node-cron';
import { finalizeOverdue } from './services/attempt.service';
import { notifyExpiringExams } from './services/maintenance.service';

/**
 * Optional background schedulers for a long-running server (local, Docker, a VPS). They are NOT needed on Vercel or any serverless
 * host: the same work happens on demand (results/dashboard close abandoned attempts, the notification bell sends expiry notices).
 */
export function startJobs() {
  cron.schedule('*/5 * * * *', async () => {
    try { const n = await finalizeOverdue(); if (n) console.log(`[jobs] finalized ${n} overdue attempt(s)`); } catch (e) { console.error('[jobs] finalizeOverdue failed', e); }
  });
  cron.schedule('0 * * * *', async () => { try { await notifyExpiringExams(); } catch (e) { console.error('[jobs] expiry notifications failed', e); } });
}
