import { ArrowLeft, Download, FileText } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { Avatar, Badge, Tone } from '@/components/ui/Badge';
import { buttonClass } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { PerformanceSections } from '@/features/insights/PerformanceSections';
import { useStudentProfile } from '@/features/insights/api';
import { formatDate, timeAgo } from '@/lib/format';

const STATUS: Record<string, { label: string; tone: Tone }> = { active: { label: 'Active', tone: 'success' }, invited: { label: 'Invited', tone: 'warning' }, disabled: { label: 'Disabled', tone: 'neutral' } };

export function StudentProfilePage() {
  const id = useParams().id as string; const q = useStudentProfile(id);
  if (q.isPending) return <div className="space-y-4"><Skeleton className="h-16 w-1/2" /><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>;
  if (q.isError) return <Card><ErrorState message={q.error instanceof ApiError ? q.error.message : 'Something went wrong.'} onRetry={() => void q.refetch()} /></Card>;
  const d = q.data; const s = d.student; const p = s.profile; const st = STATUS[p?.status ?? 'active'] ?? STATUS.active!;
  return (
    <>
      <Link to="/admin/students" className="mb-3 inline-flex items-center gap-1 text-[13px] text-neutral-600 hover:text-neutral-900"><ArrowLeft className="size-3.5" aria-hidden />All students</Link>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3"><span className="[&>span]:size-12 [&>span]:text-base"><Avatar name={s.name} /></span>
          <div><div className="flex items-center gap-2"><h1 className="text-xl font-semibold">{s.name}</h1><Badge tone={st.tone}>{st.label}</Badge></div>
            <p className="text-sm text-neutral-500">{s.email}{p?.phone ? ` · ${p.phone}` : ''}{p?.level ? ` · ${p.level}` : ''}</p>
            <p className="text-xs text-neutral-500">Joined {formatDate(s.createdAt)} · Last active {timeAgo(p?.lastActiveAt)}</p></div></div>
        <div className="flex gap-2">
          <a className={buttonClass('secondary')} href={`/api/reports/students/${s.id}/pdf`} download><FileText className="size-4" aria-hidden />Performance report</a>
          <a className={buttonClass('secondary')} href={`/api/reports/results.csv?studentId=${s.id}`} download><Download className="size-4" aria-hidden />Results CSV</a></div>
      </div>
      {p?.notes && <Card className="mb-5 px-4 py-3 text-sm"><span className="text-xs font-medium text-neutral-500">Teacher notes</span><p className="mt-0.5 whitespace-pre-line text-neutral-800">{p.notes}</p></Card>}
      <PerformanceSections perf={d} historyHref={(h) => `/admin/results/${h.attemptId}`} />
      <div className="mt-5">
        <Card><CardHeader title="Assigned exams" />{d.assignedExams.length === 0 ? <p className="px-4 py-6 text-sm text-neutral-500">Nothing assigned.</p>
          : <ul className="divide-y divide-neutral-100">{d.assignedExams.map((a) => <li key={a.accessId} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"><span className="truncate">{a.examTitle}</span><Badge tone={a.status === 'active' ? 'success' : 'brand'}>{a.status === 'active' ? 'Active' : 'Attempts used'}</Badge></li>)}</ul>}</Card>
      </div>
    </>
  );
}
