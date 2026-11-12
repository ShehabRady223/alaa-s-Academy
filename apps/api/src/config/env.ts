import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Local development only. On Vercel the variables come from Project Settings; no .env file is read or needed there.
dotenv.config({ path: [path.resolve(process.cwd(), '.env'), path.resolve(__dirname, '../../../../.env')] });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  MONGO_URI: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_MINUTES: z.coerce.number().min(1).max(60).default(10),
  REFRESH_TOKEN_DAYS: z.coerce.number().min(1).max(30).default(7), // sliding lifetime of one refresh token
  REFRESH_ABSOLUTE_DAYS: z.coerce.number().min(1).max(90).default(30), // hard cap for a whole login session
  CLIENT_URL: z.string().url().optional(), // optional on Vercel: derived from the deployment URL
  EXTRA_ALLOWED_ORIGINS: z.string().optional(), // comma-separated, e.g. a second custom domain
  TOKEN_ENCRYPTION_KEY: z.string().regex(/^[a-f0-9]{64}$/i, 'must be 64 hex chars (generate with: openssl rand -hex 32)'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default("Alaa's Academy <no-reply@alaas-academy.local>"),
  ADMIN_NAME: z.string().optional(),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().optional(),
});

/** Thrown (not process.exit) so a serverless function can answer with a readable message instead of crashing blind. Names only, never values. */
export class EnvError extends Error {
  constructor(public missing: string[]) { super(`Missing or invalid environment variables: ${missing.join(', ')}`); }
}

const parsed = schema.safeParse(process.env);
if (!parsed.success) throw new EnvError([...new Set(parsed.error.issues.map((i) => String(i.path[0] ?? 'environment')))]);

const host = (h?: string) => (h ? `https://${h}` : undefined);
const preview = process.env.VERCEL_ENV === 'preview';
// On Vercel the site address is known, so CLIENT_URL can be left out. Production uses the production domain, previews their own.
const vercelPrimary = preview ? host(process.env.VERCEL_BRANCH_URL ?? process.env.VERCEL_URL) : host(process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL);
const primary = parsed.data.CLIENT_URL ?? vercelPrimary;
if (!primary) throw new EnvError(['CLIENT_URL']);
const origins = [primary, host(process.env.VERCEL_PROJECT_PRODUCTION_URL), host(process.env.VERCEL_BRANCH_URL), host(process.env.VERCEL_URL), ...(parsed.data.EXTRA_ALLOWED_ORIGINS ?? '').split(',')]
  .map((u) => u?.trim()).filter((u): u is string => !!u).map((u) => new URL(u).origin);

export const env = { ...parsed.data, CLIENT_URL: primary.replace(/\/$/, ''), ALLOWED_ORIGINS: [...new Set(origins)] };
export const isProd = env.NODE_ENV === 'production';
