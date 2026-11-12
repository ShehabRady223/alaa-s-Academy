import argon2 from 'argon2';
import { env } from '../config/env';
import { User } from '../models/User';
import { passwordRule } from '../validators/auth';

/**
 * First-run convenience for hosts without a shell (e.g. Vercel): when ADMIN_EMAIL and ADMIN_PASSWORD are set and NO teacher
 * exists yet, create the first teacher account. After that it does nothing, so it can stay configured safely.
 */
export async function bootstrapAdmin(): Promise<boolean> {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) return false;
  if (await User.exists({ role: 'admin' })) return false;
  if (!passwordRule.safeParse(env.ADMIN_PASSWORD).success) {
    console.error('[bootstrap] ADMIN_PASSWORD needs 8+ characters with a letter and a number. No account was created.');
    return false;
  }
  try {
    await User.create({ name: env.ADMIN_NAME ?? 'Admin', email: env.ADMIN_EMAIL.toLowerCase(), role: 'admin', passwordHash: await argon2.hash(env.ADMIN_PASSWORD, { type: argon2.argon2id }) });
    console.log('[bootstrap] created the first teacher account');
    return true;
  } catch (e) {
    if ((e as { code?: number }).code === 11000) return false; // another instance won the race
    throw e;
  }
}
