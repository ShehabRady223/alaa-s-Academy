import { ArrowLeft } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/Modal';
import { Alert, ErrorState, Skeleton } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { Answer, MineDetail, useMyHwOne, useSaveDraft, useSubmitHw } from '@/features/assignments/api';
import { AnswerInput } from '@/features/questions/AnswerInput';
import { ReviewBody } from '@/features/questions/ReviewBody';
import { useSingleFlight } from '@/hooks/useSingleFlight';
import { formatDateTime } from '@/lib/format';

export function StudentAssignmentPage() {
  const id = useParams().id as string; const q = useMyHwOne(id);
  if (q.isPending) return <div className="space-y-4"><Skeleton className="h-8 w-1/3" /><Skeleton className="h-64 w-full" /></div>;
  if (q.isError) return <Card><ErrorState message={q.error instanceof ApiError ? q.error.message : 'Something went wrong.'} onRetry={() => void q.refetch()} /></Card>;
  return <Work key={id} a={q.data} />;
}

function Work({ a }: { a: MineDetail }) {
  const toast = useToast(); const save = useSaveDraft(); const submit = useSubmitHw(); const once = useSingleFlight();
  const sub = a.submission; const done = sub?.status === 'submitted' || sub?.status === 'graded';
  const [answers, setAnswers] = useState<Record<string, Answer>>(() => Object.fromEntries((sub?.answers ?? []).map((x) => [x.questionId, x.response])));
  const [dirty, setDirty] = useState(false); const [confirm, setConfirm] = useState(false); const [error, setError] = useState<string | null>(null);
  const overdue = !!a.dueDate && new Date(a.dueDate) < new Date(); const blocked = a.status === 'closed' || (overdue && !a.allowLate);
  const payload = () => a.questions.map((q) => ({ questionId: q.questionId, response: answers[q.questionId] ?? null }));
  const msg = (e: unknown) => (e instanceof ApiError ? e.message : 'Something went wrong.');
  const dirtyRef = useRef(dirty); dirtyRef.current = dirty;
  useEffect(() => { const h = (e: BeforeUnloadEvent) => { if (dirtyRef.current) { e.preventDefault(); e.returnValue = ''; } }; window.addEventListener('beforeunload', h); return () => window.removeEventListener('beforeunload', h); }, []);
  const results = new Map((sub?.results ?? []).map((r) => [r.questionId, r]));

  return (
    <div className="space-y-5">
      <Link to="/me" className="inline-flex items-center gap-1 text-[13px] text-neutral-600 hover:text-neutral-900"><ArrowLeft className="size-3.5" aria-hidden />My work</Link>
      <div><div className="flex items-center gap-2"><h1 className="text-xl font-semibold">{a.title}</h1>
        {sub?.status === 'graded' ? <Badge tone="success">Graded</Badge> : sub?.status === 'submitted' ? <Badge tone="brand">Submitted</Badge> : blocked ? <Badge tone="danger">Closed</Badge> : null}</div>
        <p className="text-sm text-neutral-500">{a.dueDate ? `Due ${formatDateTime(a.dueDate)}` : 'No deadline'} · {a.totalPoints} points{a.allowLate && ' · late work accepted'}</p></div>
      {a.description && <p className="text-sm text-neutral-700">{a.description}</p>}
      {a.instructions && <Card className="px-4 py-3 text-sm"><span className="text-xs font-medium text-neutral-500">Instructions</span><p className="mt-0.5 whitespace-pre-line">{a.instructions}</p></Card>}
      {sub?.status === 'graded' && <Card className="p-4"><div className="flex items-baseline justify-between"><span className="text-sm font-medium">Your grade</span><span className="tabular text-xl font-semibold">{sub.score}/{sub.maxScore}</span></div>{sub.feedback && <p className="mt-2 text-sm text-neutral-700"><span className="font-medium">Teacher comment: </span>{sub.feedback}</p>}</Card>}
      {sub?.status === 'submitted' && <Alert tone="info">Submitted. Your teacher still needs to grade some answers, and you'll see your grade here when they have.</Alert>}
      {blocked && !done && <Alert tone="danger">{a.status === 'closed' ? 'This assignment is closed.' : 'The due date has passed and late work is not accepted.'}</Alert>}
      {error && <Alert>{error}</Alert>}
      <Card><CardHeader title={`Questions (${a.questions.length})`} />
        <ol className="divide-y divide-neutral-100">{a.questions.map((q, i) => { const r = results.get(q.questionId); return (
          <li key={q.questionId} className="px-4 py-4">
            <div className="flex justify-between gap-3"><p className="text-sm font-medium"><span className="mr-1 text-neutral-500">{i + 1}.</span>{q.text}</p><span className="shrink-0 text-xs text-neutral-500">{r ? <span className="font-medium text-neutral-800">{r.points}/{q.points} pt</span> : `${q.points} pt`}</span></div>
            {q.image && <img src={q.image} alt="" className="mt-2 max-h-48 rounded-md border border-neutral-200" />}
            <div className="mt-3">{r ? <ReviewBody q={{ type: q.type, options: q.options, response: answers[q.questionId] ?? null, correctOptionIds: r.correctOptionIds, acceptedAnswers: r.acceptedAnswers }} />
              : <AnswerInput q={q} value={answers[q.questionId] ?? null} disabled={done || blocked} onChange={(v) => { setAnswers((x) => ({ ...x, [q.questionId]: v })); setDirty(true); }} />}</div>
            {r?.feedback && <p className="mt-2 rounded border-l-2 border-brand-600 bg-brand-50 px-2 py-1.5 text-[13px]"><span className="font-medium">Feedback: </span>{r.feedback}</p>}
            {r?.explanation && <p className="mt-2 text-[13px] text-neutral-600"><span className="font-medium text-neutral-800">Explanation: </span>{r.explanation}</p>}</li>); })}</ol></Card>
      {!done && !blocked && (
        <div className="flex flex-wrap justify-end gap-2">
          <Button loading={save.isPending} disabled={!dirty} onClick={() => save.mutate({ id: a.id, answers: payload() }, { onSuccess: () => { setDirty(false); toast.success('Draft saved'); }, onError: (e) => toast.error(msg(e)) })}>Save draft</Button>
          <Button variant="primary" onClick={() => { setError(null); setConfirm(true); }}>Submit</Button></div>)}
      <ConfirmDialog open={confirm} title="Submit your work?" confirmLabel="Submit" loading={submit.isPending} onClose={() => setConfirm(false)}
        message={`You won't be able to change your answers after submitting.${overdue ? ' This will be marked as late.' : ''}`}
        onConfirm={() => void once(async () => { try { await submit.mutateAsync({ id: a.id, answers: payload() }); setDirty(false); setConfirm(false); toast.success('Submitted'); } catch (e) { setConfirm(false); setError(msg(e)); } })} />
    </div>
  );
}
