import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, Stat } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Field';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { ReviewBody } from '@/features/questions/ReviewBody';
import { TYPE_LABEL } from '@/features/questions/types';
import { formatDateTime } from '@/lib/format';
import { SubmissionQuestion, useGradeHw, useHwSubmission } from './api';

type Draft = { points: string; feedback: string };

export function SubmissionPage() {
  const { id = '', sid = '' } = useParams(); const toast = useToast(); const q = useHwSubmission(id, sid); const grade = useGradeHw();
  const [drafts, setDrafts] = useState<Record<string, Draft>>({}); const [overall, setOverall] = useState<string | null>(null);
  const msg = (e: unknown) => (e instanceof ApiError ? e.message : 'Something went wrong.');
  if (q.isPending) return <div className="space-y-4"><Skeleton className="h-8 w-1/3" /><Skeleton className="h-64 w-full" /></div>;
  if (q.isError) return <Card><ErrorState message={msg(q.error)} onRetry={() => void q.refetch()} /></Card>;
  const s = q.data; const toGrade = s.questions.filter((x) => x.needsReview).length;
  const val = (t: SubmissionQuestion): Draft => drafts[t.id] ?? { points: t.pointsAwarded == null || t.needsReview ? '' : String(t.pointsAwarded), feedback: t.feedback ?? '' };
  const set = (t: SubmissionQuestion, patch: Partial<Draft>) => setDrafts((d) => ({ ...d, [t.id]: { ...val(t), ...patch } }));
  const save = () => {
    const grades: { questionId: string; points: number; feedback?: string }[] = [];
    for (const t of s.questions) {
      const d = drafts[t.id]; if (!d || d.points.trim() === '') continue;
      const n = Number(d.points); if (!Number.isFinite(n) || n < 0 || n > t.points) return toast.error(`Points must be between 0 and ${t.points}`);
      grades.push({ questionId: t.id, points: n, ...(d.feedback.trim() && { feedback: d.feedback.trim() }) });
    }
    if (!grades.length && overall == null) return toast.info('Enter a score first');
    if (!grades.length) return toast.info('Score at least one question to save a comment');
    grade.mutate({ id, sid, grades, ...(overall != null && { feedback: overall }) }, { onSuccess: () => { setDrafts({}); setOverall(null); toast.success('Grades saved'); }, onError: (e) => toast.error(msg(e)) });
  };
  return (
    <>
      <Link to={`/admin/assignments/${id}`} className="mb-3 inline-flex items-center gap-1 text-[13px] text-neutral-600 hover:text-neutral-900"><ArrowLeft className="size-3.5" aria-hidden />{s.assignment.title}</Link>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-xl font-semibold">{s.student?.name ?? 'Deleted student'}</h1><p className="text-sm text-neutral-500">Submitted {formatDateTime(s.submittedAt)} {s.late && <Badge tone="danger">Late</Badge>}</p></div>
        <Button variant="primary" loading={grade.isPending} disabled={!Object.values(drafts).some((d) => d.points.trim() !== '')} onClick={save}>Save grades</Button>
      </div>
      {toGrade > 0 && <div className="mb-4 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-[13px] text-neutral-700">{toGrade} {toGrade === 1 ? 'answer needs' : 'answers need'} your grading. The other questions were scored automatically; you can still adjust any score.</div>}
      <Card className="mb-5 grid grid-cols-3 divide-x divide-neutral-200"><Stat label="Status" value={s.status === 'graded' ? 'Graded' : 'Needs grading'} /><Stat label="Score" value={s.score == null ? '—' : `${s.score}/${s.maxScore}`} /><Stat label="Questions" value={s.questions.length} /></Card>
      <Card><CardHeader title="Answers" />
        <ol className="divide-y divide-neutral-100">{s.questions.map((t, i) => (
          <li key={t.id} className="px-4 py-4">
            <div className="flex justify-between gap-3"><p className="text-sm font-medium"><span className="mr-1 text-neutral-500">{i + 1}.</span>{t.text}</p>
              <div className="flex shrink-0 items-center gap-2"><Badge>{TYPE_LABEL[t.type]}</Badge>{t.needsReview && <Badge tone="warning">Needs grading</Badge>}<span className="tabular text-xs text-neutral-500">{t.points} pt</span></div></div>
            <ReviewBody q={{ type: t.type, options: t.options, response: t.response, correctOptionIds: t.correctOptionIds, acceptedAnswers: t.acceptedAnswers }} />
            <div className="mt-3 grid gap-3 sm:grid-cols-[120px_1fr]">
              <label className="block text-[13px] font-medium text-neutral-700">Points<input type="number" min={0} max={t.points} step={0.25} placeholder={`0 to ${t.points}`} value={val(t).points} onChange={(e) => set(t, { points: e.target.value })}
                className="mt-1 h-9 w-full rounded-md border border-neutral-300 px-3 text-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600" /></label>
              <label className="block text-[13px] font-medium text-neutral-700">Feedback (optional)<Textarea rows={2} className="mt-1" value={val(t).feedback} onChange={(e) => set(t, { feedback: e.target.value })} /></label></div>
          </li>))}</ol>
        <div className="border-t border-neutral-200 p-4"><label className="block text-[13px] font-medium text-neutral-700">Overall comment (optional)<Textarea rows={2} className="mt-1" value={overall ?? s.feedback ?? ''} onChange={(e) => setOverall(e.target.value)} /></label></div></Card>
    </>
  );
}
