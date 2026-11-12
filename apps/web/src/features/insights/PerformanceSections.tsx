import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, Tone } from '@/components/ui/Badge';
import { Card, CardHeader, Stat } from '@/components/ui/Card';
import { Column, DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/States';
import { ProgressLine, TopicBars } from '@/components/charts';
import { formatDate, formatPercent } from '@/lib/format';
import type { HistoryItem, Perf, Trend } from './api';

const TREND: Record<Trend, { label: string; tone: Tone; icon: typeof Minus }> = {
  improving: { label: 'Improving', tone: 'success', icon: TrendingUp }, declining: { label: 'Declining', tone: 'danger', icon: TrendingDown },
  stable: { label: 'Steady', tone: 'neutral', icon: Minus }, insufficient_data: { label: 'Not enough data', tone: 'neutral', icon: Minus },
};
const mins = (s: number | null) => (s == null ? '—' : s < 60 ? `${s}s` : `${Math.round(s / 60)} min`);

function outcome(h: HistoryItem, student: boolean) {
  if (h.status === 'pending_review' || h.percentage == null) return <Badge tone="warning">{student ? 'Awaiting results' : 'Needs grading'}</Badge>;
  return <Badge tone={h.passed ? 'success' : 'danger'}>{h.passed ? 'Passed' : 'Not passed'}</Badge>;
}

/** Shared by the teacher's student profile and the student's own dashboard. */
export function PerformanceSections({ perf, historyHref, student = false }: { perf: Perf; historyHref: (h: HistoryItem) => string; student?: boolean }) {
  const o = perf.overview; const T = TREND[o.trend]; const TI = T.icon;
  const columns: Column<HistoryItem>[] = [
    { key: 'd', header: 'Date', cell: (h) => <span className="whitespace-nowrap text-neutral-600">{formatDate(h.submittedAt)}</span> },
    { key: 'e', header: 'Exam', cell: (h) => <Link to={historyHref(h)} className="font-medium text-neutral-900 hover:text-brand-700">{h.examTitle}{h.attemptNumber > 1 ? ` (attempt ${h.attemptNumber})` : ''}</Link> },
    { key: 's', header: 'Score', align: 'right', cell: (h) => (h.score == null ? '—' : `${h.score}/${h.maxScore}`) },
    { key: 'p', header: '%', align: 'right', cell: (h) => formatPercent(h.percentage) },
    { key: 'r', header: 'Result', cell: (h) => outcome(h, student) },
    { key: 't', header: 'Time', align: 'right', cell: (h) => <span className="text-neutral-600">{mins(h.timeTakenSec)}</span> },
  ];
  return (
    <div className="space-y-5">
      <Card className="grid grid-cols-2 divide-neutral-200 sm:grid-cols-5 sm:divide-x [&>*]:border-b [&>*]:border-neutral-200 sm:[&>*]:border-b-0">
        <Stat label="Exams completed" value={`${o.completedExams}/${o.assignedExams}`} />
        <Stat label="Average" value={formatPercent(o.averagePercentage)} />
        <Stat label="Highest" value={formatPercent(o.highestPercentage)} />
        <Stat label="Lowest" value={formatPercent(o.lowestPercentage)} />
        <div className="px-4 py-3"><div className="text-xs text-neutral-500">Trend</div><div className="mt-1.5"><Badge tone={T.tone}><TI className="mr-1 size-3" aria-hidden />{T.label}</Badge></div></div>
      </Card>

      <Card><CardHeader title="Progress over time" description="Percentage on each graded exam" />
        <div className="p-4">{perf.performanceOverTime.length < 2
          ? <EmptyState title="Not enough results yet" description="A progress chart appears after two graded exams." />
          : <ProgressLine data={perf.performanceOverTime.map((p) => ({ label: formatDate(p.date), value: p.percentage, sub: `${p.examTitle}, ${formatDate(p.date)}` }))} />}</div></Card>

      <div className="grid gap-5 md:grid-cols-2">
        <Card><CardHeader title="Strengths" description="Topics at 80% or above" />
          {perf.strengths.length ? <ul className="divide-y divide-neutral-100">{perf.strengths.map((t) => <li key={t.subject + t.topic} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"><span>{t.topic} <span className="text-xs text-neutral-500">{t.subject}</span></span><span className="tabular font-medium text-green-700">{t.percentage}%</span></li>)}</ul>
            : <p className="px-4 py-6 text-sm text-neutral-500">No clear strengths yet. A topic needs at least 3 answered questions.</p>}</Card>
        <Card><CardHeader title={student ? 'Areas to practise' : 'Needs improvement'} description="Topics below 60%" />
          {perf.weaknesses.length ? <ul className="divide-y divide-neutral-100">{perf.weaknesses.map((t) => <li key={t.subject + t.topic} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"><span>{t.topic} <span className="text-xs text-neutral-500">{t.subject}</span></span><span className="tabular font-medium text-amber-700">{t.percentage}%</span></li>)}</ul>
            : <p className="px-4 py-6 text-sm text-neutral-500">Nothing below 60% so far.</p>}</Card>
      </div>

      <Card><CardHeader title="Performance by topic" />
        <div className="p-4">{perf.subjects.length ? <TopicBars subjects={perf.subjects} /> : <p className="py-4 text-center text-sm text-neutral-500">Topic results appear after the first graded exam.</p>}</div></Card>

      <div><h2 className="mb-2 text-sm font-semibold">Exam history</h2>
        <DataTable columns={columns} rows={perf.history} rowKey={(h) => h.attemptId} empty={<EmptyState title="No exams taken yet" />}
          renderMobile={(h) => (<div className="space-y-1"><div className="flex items-start justify-between gap-2"><Link to={historyHref(h)} className="font-medium">{h.examTitle}</Link>{outcome(h, student)}</div>
            <div className="tabular text-xs text-neutral-600">{formatDate(h.submittedAt)} · {h.score == null ? 'No score yet' : `${h.score}/${h.maxScore} (${formatPercent(h.percentage)})`}</div></div>)} /></div>
    </div>
  );
}
