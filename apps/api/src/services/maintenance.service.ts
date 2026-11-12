import { Exam } from '../models/Exam';
import { notifyUser } from './notification.service';

/**
 * "Exam closes within 24 hours" notice, sent once per exam. Idempotent (an atomic claim per exam), so it is safe to run from
 * several places at once. It runs on demand when a teacher's notifications load, so it needs no scheduler.
 */
export async function notifyExpiringExams(teacherId?: string): Promise<number> {
  const now = new Date();
  const soon = await Exam.find({
    ...(teacherId ? { teacherId } : {}), status: 'published', expiresAt: { $gt: now, $lte: new Date(now.getTime() + 24 * 3600_000) }, expiryNotifiedAt: { $exists: false },
  }).select('title expiresAt teacherId').lean();
  let sent = 0;
  for (const e of soon) {
    const claimed = await Exam.updateOne({ _id: e._id, expiryNotifiedAt: { $exists: false } }, { expiryNotifiedAt: now });
    if (claimed.matchedCount) { sent++; await notifyUser(e.teacherId, 'exam_expiring', `"${e.title}" expires soon`, `Closes ${e.expiresAt?.toISOString()}`, { type: 'Exam', id: e._id }); }
  }
  return sent;
}

const lastCheck = new Map<string, number>();
/** At most one check per teacher every 10 minutes per server instance (best effort; the claim above keeps duplicates impossible anyway). */
export async function maybeNotifyExpiring(teacherId: string) {
  const now = Date.now();
  if ((lastCheck.get(teacherId) ?? 0) + 10 * 60_000 > now) return;
  lastCheck.set(teacherId, now);
  try { await notifyExpiringExams(teacherId); } catch (e) { console.error('expiry notices failed', e); } // never break the page for a notice
}
