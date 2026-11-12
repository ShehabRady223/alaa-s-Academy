import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, Stat } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Field';
import { Alert, ErrorState, Skeleton } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { TYPE_LABEL } from '@/features/questions/types';
import { ResultQuestion, useGrade, useRelease, useResult } from '@/features/insights/api';
import { cn } from '@/lib/cn';
import { formatDateTime, formatPercent } from '@/lib/format';

type Draft = { points: string; feedback: string };

export function ResultDetailPage() {
  const id = useParams().id as string; const toast = useToast();
  const q = useResult(id); const grade = useGrade(); const release = useRelease();
  const [drafts, setDrafts] = useState<Record<string, Draft>>({}); const [open, setOpen] = useState<Set<string>>(new Set());
  const msg = (e: unknown) => (e instanceof ApiError ? e.message : 'Something went wrong.');
  if (q.isPending) return <div className="space-y-4"><Skeleton className="h-8 w-1/2" /><Skeleton className="h-64 w-full" /></div>;
  if (q.isError) return <Card><ErrorState message={msg(q.error)} onRetry={() => void q.refetch()} /></Card>;
  const r = q.data; const toGrade = r.questions.filter((x) => x.needsReview).length;
  const set = (qid: string, patch: Partial<Draft>, base: ResultQuestion) => setDrafts((d) => ({ ...d, [qid]: { points: d[qid]?.points ?? (base.needsReview ? '' : String(base.pointsAwarded)), feedback: d[qid]?.feedback ?? base.feedback ?? '', ...patch } }));

  const save = () => {
    const grades: { questionId: string; points: number; feedback?: string }[] = [];
    for (const [qid, d] of Object.entries(drafts)) {
      if (d.points.trim() === '') continue;
      const qq = r.questions.find((x) => x.questionId === qid)!; const n = Number(d.points);
      if (!Number.isFinite(n) || n < 0 || n > qq.maxPoints) return toast.error(`Points must be between 0 and ${qq.maxPoints}`);
      grades.push({ questionId: qid, points: n, ...(d.feedback.trim() && { feedback: d.feedback.trim() }) });
    }
    if (!grades.length) return toast.info('Enter a score first');
    grade.mutate({ id, grades }, { onSuccess: () => { setDrafts({}); setOpen(new Set()); toast.success('Grades saved'); }, onError: (e) => toast.error(msg(e)) });
  };
  const dirty = Object.values(drafts).some((d) => d.points.trim() !== '');

  return (
    <>
      <Link to="/admin/results" className="mb-3 inline-flex items-center gap-1 text-[13px] text-neutral-600 hover:text-neutral-900"><ArrowLeft className="size-3.5" aria-hidden />All results</Link>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-xl font-semibold">{r.student ? <Link to={`/admin/students/${r.student.id}`} className="hover:text-brand-700">{r.student.name}</Link> : 'Deleted student'}</h1>
          <p className="text-sm text-neutral-500">{r.exam?.title}{r.attemptNumber > 1 ? ` · attempt ${r.attemptNumber}` : ''} · Submitted {formatDateTime(r.submittedAt)}</p></div>
        <div className="flex items-center gap-2">
          {r.released ? <Badge tone="success">Released to student</Badge> : r.status === 'graded' && <Button variant="primary" loading={release.isPending} onClick={() => release.mutate(id, { onSuccess: () => toast.success('Result released'), onError: (e) => toast.error(msg(e)) })}>Release to student</Button>}
          <Button variant={toGrade || dirty ? 'primary' : 'secondary'} disabled={!dirty} loading={grade.isPending} onClick={save}>Save grades</Button></div>
      </div>
      {toGrade > 0 && <div className="mb-4"><Alert tone="info">{toGrade} {toGrade === 1 ? 'answer needs' : 'answers need'} your grading before the final score is calculated.</Alert></div>}
      <Card className="mb-5 grid grid-cols-2 sm:grid-cols-4 [&>*]:border-neutral-200 sm:divide-x">
        <Stat label="Score" value={`${r.score}/${r.maxScore}`} /><Stat label="Percentage" value={formatPercent(r.percentage)} />
        <Stat label="Result" value={r.passed == null ? '—' : r.passed ? 'Passed' : 'Not passed'} hint={`Pass mark ${r.exam?.passingScore ?? '—'}%`} /><Stat label="Time taken" value={r.timeTakenSec == null ? '—' : `${Math.round(r.timeTakenSec / 60)} min`} />
      </Card>
      <Card><CardHeader title="Answers" />
        <ol className="divide-y divide-neutral-100">{r.questions.map((x, i) => {
          const d = drafts[x.questionId]; const chosen = new Set(Array.isArray(x.response) ? x.response : typeof x.response === 'string' ? [x.response] : []); const correct = new Set(x.correctOptionIds);
          const isChoice = x.options.length > 0; const editing = x.needsReview || open.has(x.questionId);
          return (
            <li key={x.questionId} className={cn('px-4 py-4', x.needsReview && 'bg-amber-50/40')}>
              <div className="flex items-start justify-between gap-3"><p className="text-sm font-medium"><span className="mr-1 text-neutral-500">{i + 1}.</span>{x.text}</p>
                <div className="flex shrink-0 items-center gap-2"><Badge>{TYPE_LABEL[x.type]}</Badge><span className="tabular text-xs text-neutral-600">{x.pointsAwarded}/{x.maxPoints}</span></div></div>
              {isChoice ? <ul className="mt-2 space-y-1">{x.options.map((o) => { const mine = chosen.has(o.id); const ok = correct.has(o.id);
                return <li key={o.id} className={cn('flex justify-between gap-2 rounded px-2 py-1 text-[13px]', mine && ok && 'bg-green-50', mine && !ok && 'bg-red-50')}><span>{o.text}</span><span className="shrink-0 text-xs text-neutral-600">{[mine && 'Student answer', ok && 'Correct'].filter(Boolean).join(' · ')}</span></li>; })}
                {chosen.size === 0 && <li className="px-2 text-[13px] italic text-neutral-500">Not answered</li>}</ul>
                : <div className="mt-2 space-y-1.5 text-[13px]"><p className="whitespace-pre-line rounded border border-neutral-200 bg-neutral-50 px-3 py-2">{typeof x.response === 'string' && x.response ? x.response : <em className="text-neutral-500">Not answered</em>}</p>
                  {x.acceptedAnswers.length > 0 && <p className="text-neutral-600">Accepted: {x.acceptedAnswers.join(', ')}</p>}</div>}
              {editing ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-[120px_1fr]">
                  <label className="block text-[13px] font-medium text-neutral-700">Points<input type="number" min={0} max={x.maxPoints} step={0.25} placeholder={`0 to ${x.maxPoints}`} value={d?.points ?? (x.needsReview ? '' : String(x.pointsAwarded))} onChange={(e) => set(x.questionId, { points: e.target.value }, x)}
                    className="mt-1 h-9 w-full rounded-md border border-neutral-300 px-3 text-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600" /></label>
                  <label className="block text-[13px] font-medium text-neutral-700">Feedback for the student (optional)<Textarea rows={2} className="mt-1" value={d?.feedback ?? x.feedback ?? ''} onChange={(e) => set(x.questionId, { feedback: e.target.value }, x)} /></label>
                </div>
              ) : (
                <div className="mt-2 flex items-center gap-3 text-[13px]">{x.feedback && <span className="text-neutral-600">Feedback: {x.feedback}</span>}
                  <button type="button" className="font-medium text-brand-700 hover:underline" onClick={() => setOpen((s) => new Set(s).add(x.questionId))}>Adjust score</button></div>)}
            </li>);
        })}</ol></Card>
    </>
  );
}
