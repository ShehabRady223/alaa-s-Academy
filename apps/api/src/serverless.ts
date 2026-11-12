import './config/flags'; // must run before any model initialises
import type { IncomingMessage, ServerResponse } from 'http';
import mongoose from 'mongoose';
import { app } from './app';
import { connectDb } from './config/db';
import { bootstrapAdmin } from './services/bootstrap.service';

let ready: Promise<void> | null = null;

/** Once per server instance: connect, make sure every index exists (unique indexes protect against races), create the first teacher if asked. */
export function ensureReady(): Promise<void> {
  ready ??= (async () => {
    await connectDb();
    await Promise.all(Object.values(mongoose.models).map((m) => m.createIndexes().catch((e: Error) => console.error(`[startup] could not create indexes for ${m.modelName}: ${e.message}`))));
    await bootstrapAdmin();
  })().catch((e) => { ready = null; throw e; });
  return ready;
}

/** The (req, res) function Vercel calls. Express is just a function of that shape. */
export function createHandler() {
  return async (req: IncomingMessage, res: ServerResponse) => {
    try { await ensureReady(); }
    catch (e) {
      console.error('[startup] database not ready:', e);
      res.statusCode = 503; res.setHeader('content-type', 'application/json'); res.setHeader('cache-control', 'no-store');
      res.end(JSON.stringify({ error: { code: 'DATABASE_UNAVAILABLE', message: 'The database is not reachable. Check MONGO_URI and, on MongoDB Atlas, allow connections from anywhere (Network Access, 0.0.0.0/0), because Vercel has no fixed IP address.' } }));
      return;
    }
    (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(req, res);
  };
}
