import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, FileText, ListChecks } from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api, ApiError } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AccessInfo, RunnerData } from './types';

/** The exam's instructions and the Start button. The PIN was already checked by the server on the previous page. */
export function StartExamPage() {
  const st = useLocation().state as { pin: string; info: AccessInfo } | null;
  const navigate = useNavigate(); const qc = useQueryClient();
  const start = useMutation({
    mutationFn: async () => (await api.post<RunnerData>('/attempts/start', { pin: st!.pin })).data,
    onSuccess: (d) => { qc.setQueryData(['attempt', d.attemptId], d); navigate(`/exam/run/${d.attemptId}`, { replace: true }); },
  });
  if (!st?.info) return <Navigate to="/exam/join" replace />; // opened directly or the PIN was lost: ask for it again
  const d = st.info; const ex = d.exam;
  const err = start.error instanceof ApiError ? start.error.message : start.isError ? 'Something went wrong. Please try again.' : null;
  return (
    <Card className="p-6">
      <h1 className="text-xl font-semibold">{ex.title}</h1>
      {ex.description && <p className="mt-1 text-sm text-neutral-600">{ex.description}</p>}
      <dl className="mt-5 grid grid-cols-3 divide-x divide-neutral-200 rounded-md border border-neutral-200 text-center">
        {[[ListChecks, `${ex.questionCount}`, 'Questions'], [Clock, ex.durationMinutes ? `${ex.durationMinutes} min` : 'No limit', 'Time'], [FileText, `${ex.passingScore}%`, 'To pass']].map(([Icon, v, l], i) => {
          const I = Icon as typeof Clock;
          return <div key={i} className="px-2 py-3"><I className="mx-auto mb-1 size-4 text-neutral-400" aria-hidden /><dd className="tabular text-base font-semibold">{v as string}</dd><dt className="text-xs text-neutral-500">{l as string}</dt></div>;
        })}
      </dl>
      {ex.instructions && <div className="mt-5"><h2 className="text-sm font-semibold">Instructions</h2><p className="mt-1 whitespace-pre-line text-sm text-neutral-700">{ex.instructions}</p></div>}
      <ul className="mt-5 space-y-1.5 text-[13px] text-neutral-600">
        {ex.durationMinutes && <li>The timer starts when you press the button and keeps running if you close the page.</li>}
        <li>Your answers are saved automatically as you go.</li>
        <li>Attempts used: {d.attemptsUsed} of {d.maxAttempts}.</li>
      </ul>
      {err && <p role="alert" className="mt-4 text-sm text-red-600">{err}</p>}
      <div className="mt-6">
        {d.canStart ? <Button variant="primary" className="w-full sm:w-auto" loading={start.isPending} onClick={() => start.mutate()}>{d.inProgressAttemptId ? 'Continue exam' : d.attemptsUsed > 0 ? 'Start another attempt' : 'Start exam'}</Button>
          : <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4 text-sm"><p className="font-medium">You've used all your attempts.</p>
            {d.lastAttemptId && <Link to={`/exam/result/${d.lastAttemptId}`} className="mt-1 inline-block font-medium text-brand-700 hover:underline">See your result</Link>}</div>}
      </div>
    </Card>
  );
}
