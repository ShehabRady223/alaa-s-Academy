import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, CircleDashed, MinusCircle, XCircle } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '@/api/client';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, Stat } from '@/components/ui/Card';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/format';
import { ResultPayload, ResultQuestion } from './types';

const mins = (s: number | null) => (s == null ? '—' : s < 60 ? `${s}s` : `${Math.round(s / 60)} min`);

export function ResultPage() {
  const id = useParams().attemptId as string;
  const q = useQuery({ queryKey: ['result', id], retry: false, queryFn: async () => (await api.get<{ status: string; result: ResultPayload }>(`/attempts/${id}/result`)).data });
  if (q.isPending) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-48 w-full" /></div>;
  if (q.isError) return <Card><ErrorState message={q.error instanceof ApiError ? q.error.message : 'Something went wrong.'} onRetry={() => void q.refetch()} /></Card>;
  const r = q.data.result;

  if (!r.released) return (
    <Card className="p-6"><CheckCircle2 className="mb-3 size-7 text-green-600" aria-hidden /><h1 className="text-lg font-semibold">Your exam was submitted</h1>
      <p className="mt-1 text-sm text-neutral-600">{r.message}</p><Link to="/me" className="mt-5 inline-flex h-9 items-center rounded-md border border-neutral-300 bg-white px-4 text-sm font-medium hover:bg-neutral-50">Back to my exams</Link></Card>);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2"><h1 className="text-xl font-semibold">Your result</h1><Link to="/me" className="text-[13px] font-medium text-brand-700 hover:underline">Back to my exams</Link></div>
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-neutral-200 px-4 py-3"><Badge tone={r.passed ? 'success' : 'danger'}>{r.passed ? 'Passed' : 'Not passed'}</Badge><span className="text-[13px] text-neutral-600">Pass mark {r.passingScore}% · Submitted {formatDateTime(r.submittedAt)}</span></div>
        <div className="grid grid-cols-3 divide-x divide-neutral-200"><Stat label="Score" value={`${r.score}/${r.maxScore}`} /><Stat label="Percentage" value={`${r.percentage}%`} /><Stat label="Time taken" value={mins(r.timeTakenSec)} /></div>
      </Card>
      <Card><CardHeader title="Question review" />
        <ol className="divide-y divide-neutral-100">{r.questions.map((qq, i) => <Review key={qq.questionId} q={qq} n={i + 1} />)}</ol></Card>
    </div>
  );
}

function Review({ q, n }: { q: ResultQuestion; n: number }) {
  const choice = q.type === 'multiple_choice' || q.type === 'true_false' || q.type === 'multiple_select';
  const chosen = new Set(Array.isArray(q.response) ? q.response : typeof q.response === 'string' ? [q.response] : []);
  const correct = new Set(q.correctOptionIds ?? []);
  const state = q.type === 'essay' ? (q.response ? 'reviewed' : 'blank') : q.isCorrect === true ? 'correct' : q.isCorrect === false ? 'wrong' : 'partial';
  const Icon = state === 'correct' ? CheckCircle2 : state === 'wrong' ? XCircle : state === 'partial' ? MinusCircle : CircleDashed;
  const tone = state === 'correct' ? 'text-green-600' : state === 'wrong' ? 'text-red-600' : state === 'partial' ? 'text-amber-600' : 'text-neutral-400';
  return (
    <li className="px-4 py-4">
      <div className="flex items-start gap-3"><Icon className={cn('mt-0.5 size-5 shrink-0', tone)} aria-label={state} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3"><p className="text-sm font-medium"><span className="mr-1 text-neutral-500">{n}.</span>{q.text}</p><span className="tabular shrink-0 text-xs text-neutral-600">{q.pointsAwarded}/{q.maxPoints}</span></div>
          {q.image && <img src={q.image} alt="" className="mt-2 max-h-40 rounded-md border border-neutral-200" />}
          {choice ? <ul className="mt-2 space-y-1">{q.options.map((o) => {
            const mine = chosen.has(o.id); const ok = correct.has(o.id);
            return <li key={o.id} className={cn('flex items-center justify-between gap-2 rounded px-2 py-1 text-[13px]', mine && ok && 'bg-green-50', mine && !ok && q.correctOptionIds && 'bg-red-50', mine && !q.correctOptionIds && 'bg-neutral-100')}>
              <span>{o.text}</span><span className="shrink-0 text-xs text-neutral-600">{mine ? 'Your answer' : ''}{mine && ok ? ' · ' : ''}{ok && q.correctOptionIds ? 'Correct' : ''}</span></li>;
          })}{chosen.size === 0 && <li className="px-2 text-[13px] italic text-neutral-500">You didn't answer this question.</li>}</ul>
            : <div className="mt-2 space-y-1.5 text-[13px]"><p className="whitespace-pre-line rounded bg-neutral-50 px-2 py-1.5 text-neutral-800">{typeof q.response === 'string' && q.response ? q.response : <em className="text-neutral-500">No answer</em>}</p>
              {q.acceptedAnswers && q.acceptedAnswers.length > 0 && <p className="text-neutral-600">Accepted: {q.acceptedAnswers.join(', ')}</p>}</div>}
          {q.feedback && <p className="mt-2 rounded border-l-2 border-brand-600 bg-brand-50 px-2 py-1.5 text-[13px] text-neutral-800"><span className="font-medium">Teacher feedback: </span>{q.feedback}</p>}
          {q.explanation && <p className="mt-2 text-[13px] text-neutral-600"><span className="font-medium text-neutral-800">Explanation: </span>{q.explanation}</p>}
        </div>
      </div>
    </li>
  );
}
