import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { ExamAttempt } from '../src/models/ExamAttempt';
import { Client, makeExam, makeStudent, makeTeacher, startApp, stopApp } from './helpers';

before(startApp); after(stopApp);
const ROOT = path.resolve(__dirname, '../../..');
const run = (file: string, env: Record<string, string | undefined>) => JSON.parse(execFileSync('npx', ['tsx', path.join(__dirname, 'fixtures', file)], { env: { PATH: process.env.PATH, HOME: process.env.HOME, ...env } as never, encoding: 'utf8' }).trim().split('\n').pop()!);
const goodEnv = () => ({ MONGO_URI: process.env.MONGO_URI, JWT_SECRET: process.env.JWT_SECRET, TOKEN_ENCRYPTION_KEY: process.env.TOKEN_ENCRYPTION_KEY, CLIENT_URL: process.env.CLIENT_URL });

describe('Vercel entry point and first-run setup', () => {
  it('the serverless handler serves the API, and creates the first teacher from ADMIN_* only when none exists', async () => {
    const { createHandler } = await import('../src/serverless'); const { User } = await import('../src/models/User');
    const server = http.createServer(createHandler()); await new Promise<void>((r) => server.listen(0, r)); const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    try {
      assert.equal((await fetch(`${base}/api/health`)).status, 200);
      assert.equal(await User.countDocuments({ role: 'admin' }), 1, 'first teacher created on the first request');
      const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }) });
      assert.equal(login.status, 200); assert.equal((await login.json()).user.role, 'admin');
      assert.match(login.headers.getSetCookie().join(';'), /aa_access=.*HttpOnly/i);
      await fetch(`${base}/api/health`); const { bootstrapAdmin } = await import('../src/services/bootstrap.service');
      assert.equal(await bootstrapAdmin(), false, 'does nothing once a teacher exists'); assert.equal(await User.countDocuments({ role: 'admin' }), 1);
    } finally { server.close(); }
  });

  it('requests arriving the way Vercel rewrites them (/api/index?__p=...) reach the right route; plain paths still work', () => {
    const r = run('url-probe.ts', goodEnv());
    assert.deepEqual(r, { '/api/health': 200, '/api/index?__p=health': 200, '/api/index?__p=auth/me': 401, '/api/auth/me': 401, '/api/index?__p=students&search=x': 401, '/api/index?__p=nope/nothing': 404 });
  });

  it('missing configuration gives a readable error naming the variables, never their values', () => {
    const r = run('handler-probe.ts', { MONGO_URI: 'mongodb://user:SuperSecretPassword123@db.example.com/x', CLIENT_URL: 'https://x.example.com' });
    assert.equal(r.status, 500); assert.equal(r.body.error.code, 'MISCONFIGURED');
    assert.match(r.body.error.message, /JWT_SECRET/); assert.match(r.body.error.message, /TOKEN_ENCRYPTION_KEY/); assert.ok(!JSON.stringify(r.body).includes('SuperSecretPassword123'));
  });

  it('an unreachable database gives a clear 503 that explains the Atlas network setting', () => {
    const r = run('handler-probe.ts', { ...goodEnv(), MONGO_URI: 'mongodb://127.0.0.1:1/none', MONGO_TIMEOUT_MS: '1200' });
    assert.equal(r.status, 503); assert.equal(r.body.error.code, 'DATABASE_UNAVAILABLE'); assert.match(r.body.error.message, /0\.0\.0\.0\/0/);
  });

  it('on Vercel, CLIENT_URL is optional: the site address is derived, and both addresses are allowed', () => {
    const base = { ...goodEnv(), CLIENT_URL: undefined };
    let r = run('env-derive.ts', { ...base, VERCEL_ENV: 'production', VERCEL_PROJECT_PRODUCTION_URL: 'my-academy.vercel.app', VERCEL_URL: 'my-academy-abc123.vercel.app' });
    assert.equal(r.client, 'https://my-academy.vercel.app'); assert.ok(r.origins.includes('https://my-academy-abc123.vercel.app'));
    r = run('env-derive.ts', { ...base, VERCEL_ENV: 'preview', VERCEL_BRANCH_URL: 'my-academy-git-fix.vercel.app', VERCEL_URL: 'my-academy-xyz.vercel.app', VERCEL_PROJECT_PRODUCTION_URL: 'my-academy.vercel.app' });
    assert.equal(r.client, 'https://my-academy-git-fix.vercel.app', 'previews link to themselves, not production');
    r = run('env-derive.ts', { ...goodEnv(), CLIENT_URL: 'https://school.example.com', EXTRA_ALLOWED_ORIGINS: 'https://www.school.example.com, https://old.example.org', VERCEL_URL: 'a.vercel.app' });
    assert.equal(r.client, 'https://school.example.com'); for (const o of ['https://www.school.example.com', 'https://old.example.org', 'https://a.vercel.app']) assert.ok(r.origins.includes(o), o);
  });

  it('the CSRF check accepts every allowed address and still refuses strangers', async () => {
    const t = await makeTeacher(); const evil = new Client('https://evil.example'); evil.jar = t.c.jar;
    assert.equal((await evil.post('/api/students', { name: 'Mallory X', email: 'm@example.com' })).code, 'CSRF_BLOCKED');
    assert.equal((await t.c.post('/api/students', { name: 'Fine Student', email: `f${Date.now()}@example.com` })).status, 201);
  });
});

describe('no scheduler needed: the work happens on demand', () => {
  it('abandoned attempts are closed when the teacher opens Results', async () => {
    const t = await makeTeacher(); const s = await makeStudent(t.c); const { exam } = await makeExam(t.c, { publish: true });
    const acc = (await t.c.post('/api/exam-access', { examId: exam.id, studentIds: [s.id] })).json.created[0];
    const run = (await s.c.post('/api/attempts/start', { pin: acc.pin })).json;
    await ExamAttempt.updateOne({ _id: run.attemptId }, { deadline: new Date(Date.now() - 120_000) }); // time ran out and the student never came back
    assert.equal((await t.c.get('/api/results')).json.total, 1, 'the abandoned attempt now appears in the results');
    assert.notEqual((await ExamAttempt.findById(run.attemptId))!.status, 'in_progress');
  });

  it('the "exam closes soon" notice appears when notifications load, once, and only for the owner', async () => {
    const A = await makeTeacher(), B = await makeTeacher(); const { exam } = await makeExam(A.c, { publish: true });
    const { Exam } = await import('../src/models/Exam'); await Exam.updateOne({ _id: exam.id }, { expiresAt: new Date(Date.now() + 12 * 3600_000) });
    const first = (await A.c.get('/api/notifications')).json; assert.equal(first.items.filter((n: any) => n.type === 'exam_expiring').length, 1);
    assert.equal((await A.c.get('/api/notifications')).json.items.filter((n: any) => n.type === 'exam_expiring').length, 1, 'never duplicated');
    assert.equal((await B.c.get('/api/notifications')).json.items.length, 0, 'another teacher is not told');
  });
});

describe('rate limits are shared by every server instance (kept in MongoDB, not in memory)', () => {
  it('two separate stores with the same name see one counter; windows expire; concurrent hits are all counted', async () => {
    const { MongoRateLimitStore } = await import('../src/utils/mongoRateLimitStore');
    const a = new MongoRateLimitStore('t-shared'), b = new MongoRateLimitStore('t-shared'); a.init({ windowMs: 400 } as never); b.init({ windowMs: 400 } as never);
    assert.equal((await a.increment('k')).totalHits, 1); assert.equal((await b.increment('k')).totalHits, 2, 'a second instance continues the same count');
    await b.decrement('k'); assert.equal((await a.increment('k')).totalHits, 2, 'decrement is shared too');
    await new Promise((r) => setTimeout(r, 450)); assert.equal((await a.increment('k')).totalHits, 1, 'a new window starts after expiry');
    const c = new MongoRateLimitStore('t-burst'); c.init({ windowMs: 60_000 } as never);
    await Promise.all(Array.from({ length: 25 }, () => c.increment('k'))); assert.equal((await c.increment('k')).totalHits, 26, 'no hit is lost under concurrency');
    await c.resetKey('k'); assert.equal((await c.increment('k')).totalHits, 1);
  });

  it('a burst of parallel requests can never get more than the limit through, and a flood does not grow the collection', async () => {
    const { MongoRateLimitStore } = await import('../src/utils/mongoRateLimitStore'); const mongoose = (await import('mongoose')).default;
    const s = new MongoRateLimitStore('t-limit'); s.init({ windowMs: 60_000, limit: 5 } as never);
    const hits = await Promise.all(Array.from({ length: 40 }, () => s.increment('attacker')));
    assert.ok(hits.filter((h) => h.totalHits <= 5).length <= 5, 'at most 5 of 40 parallel requests are within the limit');
    for (let i = 0; i < 100; i++) await s.increment('attacker'); // a flood after the burst
    const stored = await mongoose.connection.collection('ratehits').countDocuments({ k: 't-limit:attacker' });
    assert.ok(stored <= 45, `over-limit requests write nothing (stored ${stored})`);
    assert.ok((await s.increment('someone-else')).totalHits === 1, 'other keys are unaffected');
  });
});

describe('deployment files', () => {
  const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
  it('vercel.json fits the free (Hobby) plan', () => {
    assert.equal(vercel.crons, undefined, 'no cron jobs: the free plan allows only one run a day, and nothing depends on them');
    assert.equal(vercel.regions.length, 1, 'Hobby allows a single region'); assert.ok(vercel.functions['api/index.ts'].maxDuration <= 60);
    assert.equal(vercel.outputDirectory, 'apps/web/dist'); assert.equal(vercel.buildCommand, 'npm run build');
  });
  it('the function file exists, the SPA fallback never swallows /api, and the PDF font files are really included', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'api/index.ts')));
    assert.deepEqual(vercel.rewrites[0], { source: '/api/(.*)', destination: '/api/index?__p=$1' }, 'every /api/* path, however deep, goes to the function');
    const rule = new RegExp(`^${vercel.rewrites[1].source}$`); assert.ok(!rule.test('/api/auth/login') && !rule.test('/api/health') && rule.test('/admin/exams') && rule.test('/exam/join') && rule.test('/'));
    assert.ok(fs.existsSync(path.join(ROOT, 'node_modules/pdfkit/js/data')), vercel.functions['api/index.ts'].includeFiles);
  });
  it('the web pages carry strict security headers; .env is ignored by git', () => {
    const h = Object.fromEntries(vercel.headers[0].headers.map((x: any) => [x.key, x.value]));
    assert.match(h['Content-Security-Policy'], /frame-ancestors 'none'/); assert.match(h['Content-Security-Policy'], /default-src 'self'/); assert.equal(h['X-Frame-Options'], 'DENY');
    assert.match(fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8'), /^\.env$/m);
  });
});
