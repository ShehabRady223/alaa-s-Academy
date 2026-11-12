import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '@/api/client';
import { Badge, Tone } from '@/components/ui/Badge';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { Link } from 'react-router-dom';
import { HW_STATUS, MineRow, useMyHw } from '@/features/assignments/api';
import { JoinForm } from '@/features/exam-taking/JoinForm';
import { PerformanceSections } from '@/features/insights/PerformanceSections';
import type { Perf } from '@/features/insights/api';
import { formatDateTime } from '@/lib/format';
import { useAuth } from '@/store/auth';

type State = 'not_started' | 'in_progress' | 'completed' | 'expired' | 'scheduled';
interface Dashboard extends Perf { myExams: { accessId: string; examTitle: string; durationMinutes: number | null; opensAt: string | null; closesAt: string | null; attemptsUsed: number; maxAttempts: number; state: State }[] }
const STATE: Record<State, { label: string; tone: Tone }> = {
  not_started: { label: 'Not started', tone: 'neutral' }, in_progress: { label: 'In progress', tone: 'brand' }, completed: { label: 'Completed', tone: 'success' }, expired: { label: 'Closed', tone: 'neutral' }, scheduled: { label: 'Opens later', tone: 'warning' },
};

function hwBadge(a: MineRow) {
  const sub = a.submission;
  if (sub?.status === 'graded') return <Badge tone="success">Graded {sub.score}/{sub.maxScore}</Badge>;
  if (sub?.status === 'submitted') return <Badge tone="brand">Submitted</Badge>;
  if (a.status === 'closed') return <Badge tone="warning">{HW_STATUS.closed.label}</Badge>;
  if (a.overdue) return <Badge tone="danger">Overdue</Badge>;
  return <Badge>{sub?.status === 'draft' ? 'Draft saved' : 'To do'}</Badge>;
}

export function StudentHomePage() {
  const { user } = useAuth();
  const hw = useMyHw();
  const q = useQuery({ queryKey: ['student-dashboard'], queryFn: async () => (await api.get<Dashboard>('/dashboard/student')).data });
  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-semibold">Hello, {user?.name.split(' ')[0]}</h1><p className="mt-0.5 text-sm text-neutral-500">Your exams and progress.</p></div>
      <Card className="p-4"><h2 className="text-sm font-semibold">Enter exam PIN</h2><p className="mt-0.5 text-xs text-neutral-500">Your teacher gives you a PIN for each exam.</p><div className="mt-3"><JoinForm /></div></Card>
      <Card><CardHeader title="My assignments" />
        {hw.isPending ? <div className="p-4"><Skeleton className="h-4 w-2/3" /></div> : !hw.data?.length ? <EmptyState title="No assignments yet" description="Homework from your teacher will show up here." />
          : <ul className="divide-y divide-neutral-100">{hw.data.map((a) => (<li key={a.id}><Link to={`/assignments/${a.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-neutral-50"><div className="min-w-0"><div className="truncate text-sm font-medium">{a.title}</div>
            <div className="text-xs text-neutral-500">{a.dueDate ? `Due ${formatDateTime(a.dueDate)}` : 'No deadline'} · {a.questionCount} {a.questionCount === 1 ? 'question' : 'questions'}</div></div>{hwBadge(a)}</Link></li>))}</ul>}</Card>
      {q.isError ? <Card><ErrorState message={q.error instanceof ApiError ? q.error.message : 'Something went wrong.'} onRetry={() => void q.refetch()} /></Card> : q.isPending ? <Skeleton className="h-64 w-full" /> : <>
        <Card><CardHeader title="My exams" />
          {q.data.myExams.length === 0 ? <EmptyState title="No exams assigned yet" description="When your teacher assigns you an exam, it will show up here." />
            : <ul className="divide-y divide-neutral-100">{q.data.myExams.map((e) => (
              <li key={e.accessId} className="flex items-center justify-between gap-3 px-4 py-3"><div className="min-w-0"><div className="truncate text-sm font-medium">{e.examTitle}</div>
                <div className="text-xs text-neutral-500">{e.durationMinutes ? `${e.durationMinutes} min` : 'Untimed'} · Attempts {e.attemptsUsed}/{e.maxAttempts}{e.closesAt ? ` · Closes ${formatDateTime(e.closesAt)}` : ''}</div></div>
                <Badge tone={STATE[e.state].tone}>{STATE[e.state].label}</Badge></li>))}</ul>}</Card>
        <PerformanceSections perf={q.data} student historyHref={(h) => `/exam/result/${h.attemptId}`} />
      </>}
    </div>
  );
}
