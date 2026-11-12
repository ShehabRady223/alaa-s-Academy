import { ClipboardList, FilePlus2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { buttonClass } from '@/components/ui/Button';
import { Card, CardHeader, PageHeader, Stat } from '@/components/ui/Card';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { CountBars, Meter, ProgressLine } from '@/components/charts';
import { formatPercent } from '@/lib/format';
import { ApiError } from '@/api/client';
import { QStat, useAdminDashboard } from '@/features/insights/api';

function QuestionList({ items, empty }: { items: QStat[]; empty: string }) {
  if (!items.length) return <p className="px-4 py-6 text-sm text-neutral-500">{empty}</p>;
  return <ul className="divide-y divide-neutral-100">{items.map((q) => (
    <li key={q.questionId} className="px-4 py-2.5"><div className="flex items-start justify-between gap-3"><p className="line-clamp-2 text-[13px]">{q.text}</p><span className="tabular shrink-0 text-[13px] font-medium">{q.successRate}%</span></div>
      <div className="mt-1.5 flex items-center gap-2"><Meter value={q.successRate} className="h-1.5 flex-1" /><span className="text-[11px] text-neutral-500">{q.topic} · {q.attempts} answers</span></div></li>))}</ul>;
}

export function DashboardPage() {
  const q = useAdminDashboard();
  if (q.isError) return <Card><ErrorState message={q.error instanceof ApiError ? q.error.message : 'Something went wrong.'} onRetry={() => void q.refetch()} /></Card>;
  const d = q.data; const c = d?.cards;
  const cards: [string, React.ReactNode, string?, string?][] = c ? [
    ['Students', c.totalStudents, `${c.activeStudents} active`], ['Exams', c.totalExams, `${c.publishedExams} published`], ['Completed attempts', c.completedAttempts],
    ['Average score', formatPercent(c.averageScore)], ['Needs grading', c.pendingReviews, c.pendingReviews ? 'Review now' : 'All caught up', c.pendingReviews ? '/admin/results?status=pending_review' : undefined],
    ['Completion rate', d?.completionRate.rate == null ? '—' : `${d.completionRate.rate}%`, d ? `${d.completionRate.completed} of ${d.completionRate.assigned} assigned` : undefined]] : [];

  return (
    <>
      <PageHeader title="Dashboard" description="How your students are doing."
        actions={<><Link to="/admin/assignments/new" className={buttonClass('secondary')}><ClipboardList className="size-4" aria-hidden />Create assignment</Link><Link to="/admin/exams/new" className={buttonClass('primary')}><FilePlus2 className="size-4" aria-hidden />Create exam</Link></>} />
      <Card className="mb-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 [&>*]:border-b [&>*]:border-r [&>*]:border-neutral-200 [&>*:nth-child(2n)]:border-r-0 sm:[&>*:nth-child(2n)]:border-r lg:[&>*]:border-b-0 lg:[&>*:nth-child(6)]:border-r-0">
        {q.isPending ? Array.from({ length: 6 }, (_, i) => <div key={i} className="p-4"><Skeleton className="h-10 w-full" /></div>)
          : cards.map(([label, value, hint, to]) => to ? <Link key={label} to={to} className="block hover:bg-neutral-50"><Stat label={label} value={value} hint={hint} /></Link> : <Stat key={label} label={label} value={value} hint={hint} />)}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card><CardHeader title="Average score by week" description="Last 12 weeks" />
          <div className="p-4">{q.isPending ? <Skeleton className="h-[220px] w-full" /> : d!.performanceOverTime.length < 2 ? <EmptyState title="Not enough data yet" description="This chart fills in as students complete exams." />
            : <ProgressLine data={d!.performanceOverTime.map((p) => ({ label: new Date(p.weekOf).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), value: p.averagePercentage, sub: `Week of ${p.weekOf} · ${p.attempts} attempts` }))} />}</div></Card>
        <Card><CardHeader title="Score distribution" description="Graded attempts by percentage" />
          <div className="p-4">{q.isPending ? <Skeleton className="h-[200px] w-full" /> : d!.distribution.every((x) => x.count === 0) ? <EmptyState title="No graded attempts yet" />
            : <CountBars data={d!.distribution.map((x) => ({ label: x.range, value: x.count }))} />}</div></Card>
        <Card><CardHeader title="Hardest questions" description="Lowest success rate" />{q.isPending ? <div className="p-4"><Skeleton className="h-24 w-full" /></div> : <QuestionList items={d!.hardestQuestions} empty="Needs at least 3 answers per question." />}</Card>
        <Card><CardHeader title="Easiest questions" description="Highest success rate" />{q.isPending ? <div className="p-4"><Skeleton className="h-24 w-full" /></div> : <QuestionList items={d!.easiestQuestions} empty="Needs at least 3 answers per question." />}</Card>
      </div>

    </>
  );
}
