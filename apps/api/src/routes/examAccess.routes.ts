import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as c from '../controllers/examAccess.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { MongoRateLimitStore } from '../utils/mongoRateLimitStore';
import { idParams } from '../validators/common';
import { createAccessBody, enterBody, listAccessQuery } from '../validators/examAccess';

/** Counts only FAILED tries (wrong, expired, not yours...) per signed-in student: guessing a PIN is capped at 10 misses per 15 minutes. */
export const pinGuessLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 10, skipSuccessfulRequests: true, standardHeaders: 'draft-7', legacyHeaders: false, validate: false,
  keyGenerator: (req) => req.user?.id ?? req.ip ?? 'anon', store: new MongoRateLimitStore('pin-guess'), message: { error: { code: 'RATE_LIMITED', message: 'Too many wrong PINs. Wait a few minutes and try again.' } } });
export const tokenLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 60, standardHeaders: 'draft-7', legacyHeaders: false, validate: false, store: new MongoRateLimitStore('pin-ip'),
  message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again in a few minutes.' } } });
const teacher = [authenticate, requireRole('admin')];

export const examAccessRoutes = Router();
examAccessRoutes.post('/enter', authenticate, requireRole('student'), pinGuessLimiter, tokenLimiter, validate({ body: enterBody }), c.enter); // student: scan a QR
examAccessRoutes.get('/', ...teacher, validate({ query: listAccessQuery }), c.list);
examAccessRoutes.post('/', ...teacher, validate({ body: createAccessBody }), c.create);
examAccessRoutes.get('/:id', ...teacher, validate({ params: idParams }), c.get);
examAccessRoutes.post('/:id/revoke', ...teacher, validate({ params: idParams }), c.revoke);
examAccessRoutes.get('/:id/pin', ...teacher, validate({ params: idParams }), c.pin);
examAccessRoutes.post('/:id/pin/regenerate', ...teacher, validate({ params: idParams }), c.regenerate);
