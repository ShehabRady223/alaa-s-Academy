import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { Badge } from '@/components/ui/Badge';
import { Button, buttonClass } from '@/components/ui/Button';
import { Card, CardHeader, Stat } from '@/components/ui/Card';
import { Column, DataTable } from '@/components/ui/DataTable';
import { ConfirmDialog } from '@/components/ui/Modal';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { formatDateTime } from '@/lib/format';
import { QuestionList } from '@/features/questions/QuestionList';
import { fromData } from '@/features/questions/types';
import { HW_STATUS, SubmissionRow, useCloseHw, useDeleteHw, useHw, useHwSubmissions, usePublishHw } from './api';

export function AssignmentDetailPage() {
  const id = useParams().id as string; const toast = useToast(); const navigate = useNavigate();
  const q = useHw(id); const subs = useHwSubmissions(id);
  const publish = usePublishHw(); const close = useCloseHw(); const del = useDeleteHw(); const [confirmDelete, setConfirmDelete] = useState(false);
  const msg = (e: unknown) => (e instanceof ApiError ? e.message : 'Something went wrong.');
  if (q.isPending) return <div className="space-y-4"><Skeleton className="h-8 w-1/3" /><Skeleton className="h-48 w-full" /></div>;
  if (q.isError) return <Card><ErrorState message={msg(q.error)} onRetry={() => void q.refetch()} /></Card>;
  const a = q.data;

  const columns: Column<SubmissionRow>[] = [
    { key: 's', header: 'Student', cell: (r) => <div className="leading-tight"><div className="font-medium">{r.student.name}</div><div className="text-xs text-neutral-500">{r.student.email}</div></div> },
    { key: 'st', header: 'Status', cell: (r) => (!r.submission ? <Badge>Not submitted</Badge> : r.submission.status === 'graded' ? <Badge tone="success">Graded</Badge> : <Badge tone="warning">Needs grading</Badge>) },
    { key: 'd', header: 'Submitted', cell: (r) => (r.submission?.submittedAt ? <span className="text-neutral-600">{formatDateTime(r.submission.submittedAt)}{r.submission.late && <> <Badge tone="danger">Late</Badge></>}</span> : '—') },
    { key: 'sc', header: 'Score', align: 'right', cell: (r) => (r.submission?.score != null ? `${r.submission.score}/${r.submission.maxScore}` : '—') },
    { key: 'a', header: <span className="sr-only">Open</span>, align: 'right', cell: (r) => (r.submission ? <Link className="text-[13px] font-medium text-brand-700 hover:underline" to={`/admin/assignments/${id}/submissions/${r.submission.id}`}>{r.submission.status === 'graded' ? 'View' : 'Grade'}</Link> : null) },
  ];
  return (
    <>
      <Link to="/admin/assignments" className="mb-3 inline-flex items-center gap-1 text-[13px] text-neutral-600 hover:text-neutral-900"><ArrowLeft className="size-3.5" aria-hidden />All assignments</Link>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div><div className="flex items-center gap-2"><h1 className="text-xl font-semibold">{a.title}</h1><Badge tone={HW_STATUS[a.status].tone}>{HW_STATUS[a.status].label}</Badge></div>
          {a.description && <p className="mt-0.5 text-sm text-neutral-500">{a.description}</p>}</div>
        <div className="flex flex-wrap gap-2">
          {a.status !== 'closed' && <Link to={`/admin/assignments/${id}/edit`} className={buttonClass('secondary')}>Edit</Link>}
          {a.status === 'draft' && <Button variant="primary" loading={publish.isPending} onClick={() => publish.mutate(id, { onSuccess: () => toast.success('Assignment published'), onError: (e) => toast.error(msg(e)) })}>Publish</Button>}
          {a.status === 'published' && <Button loading={close.isPending} onClick={() => close.mutate(id, { onSuccess: () => toast.success('Assignment closed'), onError: (e) => toast.error(msg(e)) })}>Close</Button>}
          {a.status === 'closed' && <Button variant="primary" loading={publish.isPending} onClick={() => publish.mutate(id, { onSuccess: () => toast.success('Assignment reopened'), onError: (e) => toast.error(msg(e)) })}>Reopen</Button>}
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>Delete</Button></div>
      </div>
      <Card className="mb-5 grid grid-cols-2 sm:grid-cols-4 [&>*]:border-neutral-200 sm:divide-x">
        <Stat label="Recipients" value={a.recipientCount} /><Stat label="Submitted" value={`${a.submittedCount}/${a.recipientCount}`} /><Stat label="Graded" value={a.gradedCount} /><Stat label="Due" value={a.dueDate ? formatDateTime(a.dueDate) : 'None'} hint={a.allowLate ? 'Late work accepted' : undefined} /></Card>
      <Card className="mb-5"><CardHeader title={`Questions (${a.questions.length})`} description={`${a.totalPoints} points`} /><QuestionList questions={a.questions.map(fromData)} onChange={() => undefined} onEdit={() => undefined} readOnly /></Card>
      <h2 className="mb-2 text-sm font-semibold">Submissions</h2>
      <DataTable columns={columns} rows={subs.data} rowKey={(r) => r.student.id} loading={subs.isPending}
        error={subs.isError ? <ErrorState message={msg(subs.error)} onRetry={() => void subs.refetch()} /> : undefined}
        empty={<EmptyState title="No recipients" description={a.status === 'draft' ? 'Edit the assignment to choose students.' : 'No students are assigned.'} />}
        renderMobile={(r) => (<div className="flex items-center justify-between gap-2"><div className="min-w-0"><div className="font-medium">{r.student.name}</div><div className="text-xs text-neutral-500">{r.submission ? (r.submission.status === 'graded' ? `Graded ${r.submission.score}/${r.submission.maxScore}` : 'Needs grading') : 'Not submitted'}</div></div>
          {r.submission && <Link className="text-[13px] font-medium text-brand-700" to={`/admin/assignments/${id}/submissions/${r.submission.id}`}>Open</Link>}</div>)} />
      <ConfirmDialog open={confirmDelete} danger title="Delete assignment?" confirmLabel="Delete assignment" loading={del.isPending} onClose={() => setConfirmDelete(false)}
        message={<>This permanently deletes <strong>{a.title}</strong> and every student's submission and grade for it.</>}
        onConfirm={() => del.mutate(id, { onSuccess: () => { toast.success('Assignment deleted'); navigate('/admin/assignments', { replace: true }); }, onError: (e) => { toast.error(msg(e)); setConfirmDelete(false); } })} />
    </>
  );
}
