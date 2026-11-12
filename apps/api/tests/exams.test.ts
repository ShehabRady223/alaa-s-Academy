import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { makeExam, makeStudent, makeTeacher, mcq, startApp, stopApp, toInput } from './helpers';

before(startApp); after(stopApp);

describe('exams: CRUD, publishing, PIN access, attempts', () => {
  it('create with questions in ONE request, update + reorder in one request (ids kept), delete', async () => {
    const t = await makeTeacher(); const { exam, q1 } = await makeExam(t.c);
    assert.equal(exam.status, 'draft'); assert.equal(exam.questionCount, 1); assert.equal(exam.totalPoints, 2);
    const u = await t.c.patch(`/api/exams/${exam.id}`, { title: 'Renamed', subject: 'Maths', passingScore: 70, questions: [mcq('Second?', { points: 3, topic: 'Algebra' }), toInput(q1)] });
    assert.equal(u.status, 200); assert.equal(u.json.exam.title, 'Renamed'); assert.deepEqual(u.json.exam.questions.map((q: any) => q.text), ['Second?', q1.text]);
    assert.equal(u.json.exam.questions[1].id, q1.id, 'an edited question keeps its identity'); assert.equal(u.json.exam.questions[0].topic, 'Algebra');
    assert.equal(u.json.exam.questionCount, 2); assert.equal(u.json.exam.totalPoints, 5);
    assert.equal((await t.c.del(`/api/exams/${exam.id}`)).status, 204); assert.equal((await t.c.get(`/api/exams/${exam.id}`)).status, 404);
  });

  it('publishing freezes the exam; empty exams cannot be published; a duplicate is a fresh editable draft', async () => {
    const t = await makeTeacher(); assert.equal((await t.c.post(`/api/exams/${(await t.c.post('/api/exams', { title: 'Empty exam' })).json.exam.id}/publish`)).status, 400);
    const { exam, q1 } = await makeExam(t.c, { publish: true });
    for (const body of [{ durationMinutes: 99 }, { passingScore: 10 }, { questions: [] }, { settings: { shuffleQuestions: true } }, { subject: 'X' }]) assert.equal((await t.c.patch(`/api/exams/${exam.id}`, body)).status, 409, JSON.stringify(body));
    assert.equal((await t.c.patch(`/api/exams/${exam.id}`, { title: 'Still editable' })).status, 200);
    const dup = await t.c.post(`/api/exams/${exam.id}/duplicate`); assert.equal(dup.status, 201); assert.equal(dup.json.exam.status, 'draft'); assert.notEqual(dup.json.exam.questions[0].id, q1.id);
    assert.equal((await t.c.patch(`/api/exams/${dup.json.exam.id}`, { questions: [mcq('Changed in the copy')] })).status, 200);
    assert.equal((await t.c.get(`/api/exams/${exam.id}`)).json.exam.questions[0].text, 'What is 2 + 2?', 'the original is untouched');
  });

  it('PIN: 8 unambiguous characters, per student, tolerant typing; regenerate kills the old PIN; revoke ends access', async () => {
    const t = await makeTeacher(); const s = await makeStudent(t.c); const { exam } = await makeExam(t.c, { publish: true });
    const acc = (await t.c.post('/api/exam-access', { examId: exam.id, studentIds: [s.id] })).json.created[0];
    assert.match(acc.pin, /^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/, 'XXXX-XXXX, no 0 O 1 I');
    assert.equal((await t.c.get(`/api/exam-access/${acc.id}/pin`)).json.pin, acc.pin); assert.equal((await s.c.get(`/api/exam-access/${acc.id}/pin`)).status, 403, 'students cannot read PINs');
    for (const typed of [acc.pin, acc.pin.toLowerCase(), acc.pin.replace('-', ' '), acc.pin.replace('-', '')]) assert.equal((await s.c.post('/api/exam-access/enter', { pin: typed })).status, 200, typed);
    assert.equal((await s.c.post('/api/exam-access/enter', { pin: '0000-0000' })).code, 'PIN_INVALID', 'characters outside the alphabet never match');
    assert.equal((await t.c.post(`/api/exam-access/${acc.id}/pin/regenerate`)).status, 200);
    const fresh = (await t.c.get(`/api/exam-access/${acc.id}/pin`)).json.pin; assert.notEqual(fresh, acc.pin);
    assert.equal((await s.c.post('/api/exam-access/enter', { pin: acc.pin })).code, 'PIN_INVALID', 'the old PIN stops working at once');
    assert.equal((await s.c.post('/api/exam-access/enter', { pin: fresh })).status, 200);
    assert.equal((await t.c.post(`/api/exam-access/${acc.id}/revoke`)).status, 200);
    assert.equal((await s.c.post('/api/exam-access/enter', { pin: fresh })).code, 'PIN_INVALID', 'a revoked PIN is not even recognised');
    assert.equal((await t.c.get(`/api/exam-access/${acc.id}/pin`)).status, 409); assert.equal((await t.c.get('/api/exam-access')).json.items[0].pin, null, 'no PIN is shown for a revoked access');
    const again = (await t.c.post('/api/exam-access', { examId: exam.id, studentIds: [s.id] })).json.created; assert.equal(again.length, 1, 'can be shared again after revoking'); assert.notEqual(again[0].pin, fresh);
  });

  it('access rules: unpublished, not yet open, expired link, exam closed', async () => {
    const t = await makeTeacher(); const s = await makeStudent(t.c); const { exam } = await makeExam(t.c);
    assert.equal((await t.c.post('/api/exam-access', { examId: exam.id, studentIds: [s.id] })).status, 409, 'draft exams cannot be shared');
    await t.c.post(`/api/exams/${exam.id}/publish`);
    const acc = (await t.c.post('/api/exam-access', { examId: exam.id, studentIds: [s.id] })).json.created[0]; const tok = acc.pin as string;
    const { Exam } = await import('../src/models/Exam'); const { ExamAccess } = await import('../src/models/ExamAccess');
    await Exam.updateOne({ _id: exam.id }, { startDate: new Date(Date.now() + 3600_000) }); assert.equal((await s.c.post('/api/exam-access/enter', { pin: tok })).code, 'EXAM_NOT_OPEN');
    await Exam.updateOne({ _id: exam.id }, { startDate: null, expiresAt: new Date(Date.now() - 1000) }); assert.equal((await s.c.post('/api/exam-access/enter', { pin: tok })).code, 'EXAM_EXPIRED');
    await Exam.updateOne({ _id: exam.id }, { expiresAt: null }); await ExamAccess.updateOne({ _id: acc.id }, { expiresAt: new Date(Date.now() - 1000) });
    assert.equal((await s.c.post('/api/exam-access/enter', { pin: tok })).code, 'PIN_EXPIRED');
  });

  it('attempt lifecycle: server grading, attempt limit, double submit, late/timer rules, result visibility', async () => {
    const t = await makeTeacher(); const s = await makeStudent(t.c); const { exam, q1 } = await makeExam(t.c, { publish: true });
    const acc = (await t.c.post('/api/exam-access', { examId: exam.id, studentIds: [s.id] })).json.created[0]; const tok = acc.pin as string;
    const run = (await s.c.post('/api/attempts/start', { pin: tok })).json; const again = (await s.c.post('/api/attempts/start', { pin: tok })).json;
    assert.equal(again.attemptId, run.attemptId, 'second start resumes the same attempt'); assert.ok(run.deadline, 'server-side deadline');
    const right = run.questions[0].options.find((o: any) => o.text === '4').id;
    assert.equal((await s.c.req('PATCH', `/api/attempts/${run.attemptId}/autosave`, { answers: [{ questionId: q1.id, response: 'not-an-option' }] })).status, 400);
    assert.equal((await s.c.req('PATCH', `/api/attempts/${run.attemptId}/autosave`, { answers: [{ questionId: q1.id, response: right }] })).status, 200);
    const { ExamAttempt } = await import('../src/models/ExamAttempt');
    await ExamAttempt.updateOne({ _id: run.attemptId }, { deadline: new Date(Date.now() - 20_000) });
    assert.equal((await s.c.req('PATCH', `/api/attempts/${run.attemptId}/autosave`, { answers: [{ questionId: q1.id, response: right }] })).code, 'TIME_UP', 'autosave refused after the deadline');
    const [a, b] = await Promise.all([s.c.post(`/api/attempts/${run.attemptId}/submit`, { answers: [] }), s.c.post(`/api/attempts/${run.attemptId}/submit`, { answers: [] })]);
    assert.deepEqual([a.status, b.status], [200, 200]); assert.equal(await ExamAttempt.countDocuments({ accessId: acc.id, status: { $ne: 'in_progress' } }), 1);
    const res = (await s.c.get(`/api/attempts/${run.attemptId}/result`)).json.result; assert.equal(res.released, true); assert.equal(res.score, 2, 'graded from the saved answer on the server');
    const info = (await s.c.post('/api/exam-access/enter', { pin: tok })).json; assert.equal(info.canStart, false);
    assert.equal((await s.c.post('/api/attempts/start', { pin: tok })).code, 'NO_ATTEMPTS_LEFT');
    assert.equal((await t.c.del(`/api/exams/${exam.id}`)).status, 409, 'exams with results cannot be deleted');
    assert.equal((await t.c.post(`/api/exams/${exam.id}/archive`)).status, 200); assert.equal((await s.c.post('/api/exam-access/enter', { pin: tok })).code, 'PIN_INVALID', 'an archived exam withdraws its PINs');
  });

  it('essays wait for the teacher; manual release hides the result until released', async () => {
    const t = await makeTeacher(); const s = await makeStudent(t.c); const { exam, q1 } = await makeExam(t.c, { essay: true });
    await t.c.patch(`/api/exams/${exam.id}`, { settings: { resultRelease: 'manual' } }); await t.c.post(`/api/exams/${exam.id}/publish`);
    const acc = (await t.c.post('/api/exam-access', { examId: exam.id, studentIds: [s.id] })).json.created[0]; const tok = acc.pin as string;
    const run = (await s.c.post('/api/attempts/start', { pin: tok })).json; const essay = run.questions.find((q: any) => !q.options.length); const mc = run.questions.find((q: any) => q.options.length);
    const sub = await s.c.post(`/api/attempts/${run.attemptId}/submit`, { answers: [{ questionId: mc.questionId, response: mc.options.find((o: any) => o.text === '4').id }, { questionId: essay.questionId, response: 'Slope is rise over run.' }] });
    assert.equal(sub.json.status, 'pending_review'); assert.equal(sub.json.result.released, false);
    const rid = (await t.c.get('/api/results?status=pending_review')).json.items[0].id;
    assert.equal((await t.c.patch(`/api/results/${rid}/grade`, { grades: [{ questionId: essay.questionId, points: 99 }] })).status, 400, 'points above the maximum are rejected');
    const g = await t.c.patch(`/api/results/${rid}/grade`, { grades: [{ questionId: essay.questionId, points: 1.5, feedback: 'Good' }] });
    assert.equal(g.json.result.status, 'graded'); assert.equal(g.json.result.score, 3.5);
    assert.equal((await s.c.get(`/api/attempts/${run.attemptId}/result`)).json.result.released, false, 'graded but not released');
    assert.equal((await t.c.post(`/api/results/${rid}/release`)).status, 200);
    const shown = (await s.c.get(`/api/attempts/${run.attemptId}/result`)).json.result; assert.equal(shown.released, true); assert.equal(shown.questions.find((x: any) => x.questionId === essay.questionId).feedback, 'Good');
    void q1;
  });
});
