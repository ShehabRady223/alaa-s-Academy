import type { ClientRateLimitInfo, Options, Store } from 'express-rate-limit';
import { Model, model, models, Schema } from 'mongoose';

interface Hit { k: string; at: Date; expireAt: Date }
const Hits = (models.RateHit ?? model('RateHit', new Schema<Hit>({ k: { type: String, required: true }, at: { type: Date, required: true }, expireAt: { type: Date, required: true } }, { versionKey: false })
  .index({ k: 1, at: 1 }).index({ expireAt: 1 }, { expireAfterSeconds: 0 }))) as Model<Hit>; // MongoDB removes expired hits by itself

/**
 * Rate-limit counters kept in MongoDB instead of process memory. On serverless every request may land on a fresh instance with
 * empty memory, which would silently switch brute-force protection off; here all instances share one count.
 *
 * Each request is stored as its own small document, then hits in the window are counted. Inserts cannot be lost under concurrency,
 * so the count never falls behind: of any burst of parallel requests, at most `limit` can observe a count within the limit.
 * Once a key is over its limit nothing more is written, so flooding cannot grow the collection beyond about `limit` rows per key.
 */
export class MongoRateLimitStore implements Store {
  private windowMs = 60_000;
  private limit: number | undefined;
  constructor(private ns: string) {}
  init(options: Options) { this.windowMs = options.windowMs; this.limit = typeof options.limit === 'number' ? options.limit : undefined; }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const k = `${this.ns}:${key}`; const now = Date.now(); const since = new Date(now - this.windowMs); const resetTime = new Date(now + this.windowMs);
    const before = await Hits.countDocuments({ k, at: { $gt: since } });
    if (this.limit !== undefined && before >= this.limit) return { totalHits: before + 1, resetTime }; // already blocked: write nothing
    await Hits.create({ k, at: new Date(now), expireAt: resetTime });
    return { totalHits: await Hits.countDocuments({ k, at: { $gt: since } }), resetTime }; // counted AFTER our own insert
  }
  /** Used for "skip successful requests": forgets the most recent hit. */
  async decrement(key: string) {
    const last = await Hits.findOne({ k: `${this.ns}:${key}` }).sort({ at: -1 }).select('_id').lean();
    if (last) await Hits.deleteOne({ _id: last._id });
  }
  async resetKey(key: string) { await Hits.deleteMany({ k: `${this.ns}:${key}` }); }
}
