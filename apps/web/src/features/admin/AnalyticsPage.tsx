import { useState } from 'react';
import { Card, CardHeader, PageHeader, Stat } from '@/components/ui/Card';
import { Field, Select } from '@/components/ui/Field';
import { EmptyState, Skeleton } from '@/components/ui/States';
import { CountBars, Meter, TopicBars } from '@/components/charts';
import { useExams } from '@/features/exams/api';
import { QStat, useExamAnalytics, useGlobalQuestions, useGlobalTopics } from '@/features/insights/api';
import { formatPercent } from '@/lib/format';

const secs = (s: number | null) => (s == null ? '—' : s < 90 ? `${s}s` : `${Math.round(s / 60)} min`);
function Qs({ title, items }: { title: string; items: QStat[] }) {
  return (<Card><CardHeader title={title} />{items.length === 0 ? <p className="px-4 py-6 text-sm text-neutral-500">Not enough answers yet.</p> :
    <ul className="divide-y divide-neutral-100">{items.slice(0, 8).map((q) => <li key={q.questionId} className="px-4 py-2.5"><div className="flex items-start justify-between gap-3"><p className="line-clamp-2 text-[13px]">{q.text}</p><span className="tabular shrink-0 text-[13px] font-medium">{q.successRate}%</span></div>
      <div className="mt-1.5 flex items-center gap-2"><Meter value={q.successRate} className="h-1.5 flex-1" /><span className="shrink-0 text-[11px] text-neutral-500">{q.topic} · {q.attempts} answers · avg {secs(q.avgTimeSec)}</span></div></li>)}</ul>}</Card>);
}

export function AnalyticsPage() {
  const [examId, setExamId] = useState(''); const exams = useExams({ page: 1, limit: 100, status: 'published' });
  const ex = useExamAnalytics(examId || undefined); const gq = useGlobalQuestions(!examId); const gt = useGlobalTopics(!examId);
  const s = ex.data?.summary;
  return (
    <>
      <PageHeader title="Analytics" description="Which topics and questions your students find hard." />
      <div className="mb-5 max-w-xs"><Field label="Show"><Select value={examId} onChange={(e) => setExamId(e.target.value)}><option value="">All exams</option>{exams.data?.items.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}</Select></Field></div>
      {examId && (ex.isPending ? <Skeleton className="h-64 w-full" /> : ex.data && s && <div className="space-y-5">
        <Card className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 [&>*]:border-b [&>*]:border-neutral-200 lg:divide-x lg:[&>*]:border-b-0">
          <Stat label="Assigned" value={s.assigned} /><Stat label="Graded" value={s.gradedAttempts} hint={s.pendingReview ? `${s.pendingReview} pending` : undefined} /><Stat label="Average" value={formatPercent(s.averagePercentage)} />
          <Stat label="Pass rate" value={formatPercent(s.passRate)} /><Stat label="Highest" value={formatPercent(s.highest)} /><Stat label="Lowest" value={formatPercent(s.lowest)} /><Stat label="Avg. time" value={secs(s.averageTimeSec)} /></Card>
        <Card><CardHeader title="Score distribution" /><div className="p-4">{s.gradedAttempts === 0 ? <EmptyState title="No graded attempts yet" /> : <CountBars data={ex.data.distribution.map((x) => ({ label: x.range, value: x.count }))} />}</div></Card>
        <div className="grid gap-5 lg:grid-cols-2"><Qs title="Hardest questions" items={ex.data.questions.hardest} /><Qs title="Easiest questions" items={ex.data.questions.easiest} /></div>
        <Card><CardHeader title="Topic performance" description={`Average time per question: ${secs(ex.data.questions.averageTimePerQuestionSec)}`} /><div className="p-4">{ex.data.subjects.length ? <TopicBars subjects={ex.data.subjects} /> : <p className="text-sm text-neutral-500">No graded answers yet.</p>}</div></Card>
      </div>)}
      {!examId && <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">{gq.data ? <><Qs title="Hardest questions" items={gq.data.hardest} /><Qs title="Easiest questions" items={gq.data.easiest} /></> : <><Skeleton className="h-48 w-full" /><Skeleton className="h-48 w-full" /></>}</div>
        <Card><CardHeader title="Topic performance across all students" description={gq.data ? `Average time per question: ${secs(gq.data.averageTimePerQuestionSec)}` : undefined} />
          <div className="p-4">{gt.isPending ? <Skeleton className="h-32 w-full" /> : gt.data!.subjects.length ? <TopicBars subjects={gt.data!.subjects} /> : <EmptyState title="No graded answers yet" />}</div></Card></div>}
    </>
  );
}
