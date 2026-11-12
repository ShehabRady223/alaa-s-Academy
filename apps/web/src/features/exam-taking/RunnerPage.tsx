import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronLeft, ChevronRight, CloudOff } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Alert, ErrorState, FullPageSpinner } from '@/components/ui/States';
import { cn } from '@/lib/cn';
import { Wordmark } from '@/layouts/Wordmark';
import { AnswerInput } from '@/features/questions/AnswerInput';
import { hasAnswer, Response, RunnerData, RunnerQuestion } from './types';

type Answers = Record<string, Response>;
const clock = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const ss = String(s % 60).padStart(2, '0'); return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`; };

export function RunnerPage() {
  const id = useParams().attemptId as string;
  // Seeded by the access page; on refresh this refetches the saved state from the server.
  const q = useQuery({ queryKey: ['attempt', id], retry: false, staleTime: Infinity, refetchOnWindowFocus: false, refetchOnMount: false, queryFn: async () => (await api.get<RunnerData>(`/attempts/${id}`)).data });
  if (q.isPending) return <FullPageSpinner />;
  if (q.isError) {
    const e = q.error instanceof ApiError ? q.error : null;
    if (e?.code === 'ATTEMPT_CLOSED') return <Navigate to={`/exam/result/${id}`} replace />;
    return <div className="mx-auto mt-16 max-w-md"><Card><ErrorState message={e?.message ?? 'Something went wrong.'} onRetry={e && e.status < 500 && e.status > 0 ? undefined : () => void q.refetch()} /></Card></div>;
  }
  return <Runner key={id} data={q.data} />;
}

function Runner({ data }: { data: RunnerData }) {
  const id = data.attemptId; const navigate = useNavigate(); const qc = useQueryClient();
  const [answers, setAnswers] = useState<Answers>(data.answers);
  const [idx, setIdx] = useState(0);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle'); const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false); const [submitting, setSubmitting] = useState(false); const [submitError, setSubmitError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);

  const answersRef = useRef(answers); const idxRef = useRef(idx); idxRef.current = idx;
  const dirty = useRef(new Map<string, number>()); const spent = useRef<Record<string, number>>({}); const since = useRef(Date.now());
  const saving = useRef(false); const busy = useRef(false); const retryAt = useRef(0); const debounce = useRef<ReturnType<typeof setTimeout>>();

  // Server-authoritative timer: measure the clock offset once, then count down locally.
  const skew = useRef(new Date(data.serverNow).getTime() - Date.now());
  const deadline = data.deadline ? new Date(data.deadline).getTime() : null;
  const [now, setNow] = useState(Date.now());
  useEffect(() => { if (deadline == null) return; const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, [deadline]);
  const remaining = deadline == null ? null : deadline - (now + skew.current);

  const flushSpent = useCallback(() => {
    const cur = data.questions[idxRef.current]; if (!cur) return;
    const t = Date.now(); spent.current[cur.questionId] = (spent.current[cur.questionId] ?? 0) + (t - since.current) / 1000; since.current = t;
    dirty.current.set(cur.questionId, (dirty.current.get(cur.questionId) ?? 0) + 1);
  }, [data.questions]);

  const finish = useCallback(() => { qc.removeQueries({ queryKey: ['attempt', id] }); navigate(`/exam/result/${id}`, { replace: true }); }, [qc, id, navigate]);

  const submit = useCallback(async () => {
    if (busy.current) return;
    busy.current = true; setSubmitting(true); setSubmitError(null); flushSpent();
    const payload = data.questions.map((qq) => ({ questionId: qq.questionId, response: answersRef.current[qq.questionId] ?? null, timeSpentSec: Math.round(spent.current[qq.questionId] ?? 0) }));
    try { await api.post(`/attempts/${id}/submit`, { answers: payload }); finish(); }
    catch (e) {
      busy.current = false; setSubmitting(false); retryAt.current = Date.now() + 5000;
      if (e instanceof ApiError && e.code === 'ATTEMPT_CLOSED') return finish();
      if (e instanceof ApiError && e.code === 'PIN_REVOKED') return setBlocked(e.message);
      setSubmitError(e instanceof ApiError && e.status !== 0 ? e.message : 'Could not reach the server. Your answers are kept on this page. Check your connection and try again.');
    }
  }, [data.questions, id, finish, flushSpent]);

  const saveNow = useCallback(async () => {
    if (saving.current || busy.current || dirty.current.size === 0) return;
    saving.current = true; setSaveState('saving');
    const snap = new Map(dirty.current);
    const payload = [...snap.keys()].map((qid) => ({ questionId: qid, response: answersRef.current[qid] ?? null, timeSpentSec: Math.round(spent.current[qid] ?? 0) }));
    try {
      await api.patch(`/attempts/${id}/autosave`, { answers: payload });
      snap.forEach((v, k) => { if (dirty.current.get(k) === v) dirty.current.delete(k); }); // keep anything edited while saving
      setSaveState('saved'); setSavedAt(new Date());
    } catch (e) {
      setSaveState('error');
      if (e instanceof ApiError) {
        if (e.code === 'TIME_UP') void submit();
        else if (e.code === 'ATTEMPT_CLOSED') finish();
        else if (e.code === 'PIN_REVOKED') setBlocked(e.message);
      }
    } finally { saving.current = false; }
  }, [id, submit, finish]);

  useEffect(() => { const t = setInterval(() => void saveNow(), 15000); return () => { clearInterval(t); clearTimeout(debounce.current); }; }, [saveNow]);
  useEffect(() => { // browser warning while the exam is open
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h); return () => window.removeEventListener('beforeunload', h);
  }, []);
  useEffect(() => { if (remaining != null && remaining <= 0 && !busy.current && Date.now() >= retryAt.current) void submit(); }, [remaining, submit]);

  const setAnswer = (qid: string, v: Response) => {
    answersRef.current = { ...answersRef.current, [qid]: v }; setAnswers(answersRef.current);
    dirty.current.set(qid, (dirty.current.get(qid) ?? 0) + 1);
    clearTimeout(debounce.current); debounce.current = setTimeout(() => void saveNow(), 2000);
  };
  const go = (to: number) => { flushSpent(); setIdx(Math.min(Math.max(to, 0), data.questions.length - 1)); void saveNow(); };

  if (blocked) return <div className="mx-auto mt-16 max-w-md"><Card className="p-6"><h1 className="text-lg font-semibold">This exam was withdrawn</h1><p className="mt-1 text-sm text-neutral-600">{blocked}</p><Button className="mt-4" variant="primary" onClick={() => navigate('/me', { replace: true })}>Go to my exams</Button></Card></div>;

  const total = data.questions.length; const qq = data.questions[idx] as RunnerQuestion;
  const answered = data.questions.filter((x) => hasAnswer(answers[x.questionId])).length;
  const low = remaining != null && remaining < 5 * 60_000; const critical = remaining != null && remaining < 60_000;

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-3"><Wordmark className="hidden sm:inline-flex" /><span className="truncate text-sm font-medium text-neutral-700 sm:border-l sm:border-neutral-200 sm:pl-3">{data.examTitle}</span></div>
          {remaining != null && <div role="timer" aria-label="Time remaining" className={cn('tabular rounded-md border px-3 py-1 text-sm font-semibold', critical ? 'border-red-300 bg-red-50 text-red-700' : low ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-neutral-200 text-neutral-800')}>{clock(remaining)}</div>}
        </div>
        <div className="h-1 bg-neutral-100" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={answered} aria-label="Questions answered"><div className="h-full bg-brand-600 transition-all" style={{ width: `${(answered / total) * 100}%` }} /></div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        {remaining != null && remaining <= 0 && <div className="mb-4"><Alert tone="info">Time is up. Submitting your answers…{submitError && <span className="mt-1 block text-red-700">{submitError}</span>}</Alert></div>}
        <div className="mb-3 flex items-center justify-between text-[13px] text-neutral-600">
          <span className="tabular">Question {idx + 1} of {total}</span>
          <span className={cn('inline-flex items-center gap-1.5', saveState === 'error' && 'text-amber-700')}>
            {saveState === 'error' ? <><CloudOff className="size-3.5" aria-hidden />Not saved. Check your connection.</> : saveState === 'saving' ? 'Saving…' : savedAt ? <><Check className="size-3.5 text-green-600" aria-hidden />Saved {savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</> : 'Answers save automatically'}
          </span>
        </div>

        <Card className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4"><h1 className="text-base font-medium leading-relaxed text-neutral-900 sm:text-lg">{qq.text}</h1><span className="shrink-0 text-xs text-neutral-500">{qq.points} {qq.points === 1 ? 'point' : 'points'}</span></div>
          {qq.image && <img src={qq.image} alt="" className="mt-3 max-h-64 rounded-md border border-neutral-200" />}
          <div className="mt-5"><AnswerInput q={qq} value={answers[qq.questionId] ?? null} onChange={(v) => setAnswer(qq.questionId, v)} /></div>
        </Card>

        <div className="mt-4 flex items-center justify-between gap-3">
          <Button onClick={() => go(idx - 1)} disabled={idx === 0}><ChevronLeft className="size-4" aria-hidden />Previous</Button>
          {idx < total - 1 ? <Button variant="primary" onClick={() => go(idx + 1)}>Next<ChevronRight className="size-4" aria-hidden /></Button>
            : <Button variant="primary" onClick={() => { flushSpent(); void saveNow(); setConfirmOpen(true); }}>Review and submit</Button>}
        </div>

        <nav aria-label="Question navigator" className="mt-6 rounded-md border border-neutral-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between"><h2 className="text-[13px] font-medium">Questions</h2><span className="tabular text-xs text-neutral-500">{answered} of {total} answered</span></div>
          <div className="flex flex-wrap gap-1.5">{data.questions.map((x, i) => (
            <button key={x.questionId} type="button" onClick={() => go(i)} aria-label={`Question ${i + 1}${hasAnswer(answers[x.questionId]) ? ', answered' : ', not answered'}`} aria-current={i === idx}
              className={cn('tabular size-8 rounded-md border text-[13px]', hasAnswer(answers[x.questionId]) ? 'border-brand-600 bg-brand-600 text-white' : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50', i === idx && 'ring-2 ring-brand-600 ring-offset-2')}>{i + 1}</button>))}</div>
          <div className="mt-3 text-right"><Button size="sm" onClick={() => { flushSpent(); void saveNow(); setConfirmOpen(true); }}>Review and submit</Button></div>
        </nav>
      </main>

      <Modal open={confirmOpen} onClose={() => !submitting && setConfirmOpen(false)} title="Submit your exam?" size="sm"
        footer={<><Button onClick={() => setConfirmOpen(false)} disabled={submitting}>Keep working</Button><Button variant="primary" loading={submitting} onClick={() => void submit()}>Submit exam</Button></>}>
        <div className="space-y-3 text-sm text-neutral-700">
          {total - answered > 0 ? <Alert tone="danger">You have {total - answered} unanswered {total - answered === 1 ? 'question' : 'questions'}.</Alert> : <p>You've answered every question.</p>}
          <p>After you submit you can't change your answers.</p>
          {submitError && <Alert>{submitError}</Alert>}
        </div>
      </Modal>
    </div>
  );
}
