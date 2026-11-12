import { ClipboardCheck } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/Card';
import { Column, DataTable } from '@/components/ui/DataTable';
import { Select } from '@/components/ui/Field';
import { ConfirmDialog } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { useExams } from '@/features/exams/api';
import { ResultRow, useReleaseExam, useResults } from '@/features/insights/api';
import { formatDateTime, formatPercent } from '@/lib/format';

const state = (r: ResultRow) => r.status === 'pending_review' ? <Badge tone="warning">Needs grading</Badge> : r.released ? <Badge tone="success">Released</Badge> : <Badge tone="brand">Not released</Badge>;

export function ResultsPage() {
  const toast = useToast(); const [sp, setSp] = useSearchParams();
  const examId = sp.get('exam') ?? undefined; const status = (['pending_review', 'graded'].includes(sp.get('status') ?? '') ? sp.get('status') : undefined) as string | undefined;
  const page = Math.max(1, Number(sp.get('page')) || 1);
  const update = (patch: Record<string, string | undefined>) => setSp((p) => { Object.entries(patch).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k))); return p; });
  const list = useResults({ page, limit: 20, examId, status }); const exams = useExams({ page: 1, limit: 100, status: 'published' });
  const releaseAll = useReleaseExam(); const [confirm, setConfirm] = useState(false);
  const msg = (e: unknown) => (e instanceof ApiError ? e.message : 'Something went wrong.');

  const columns: Column<ResultRow>[] = [
    { key: 's', header: 'Student', cell: (r) => <div className="leading-tight"><Link to={`/admin/results/${r.id}`} className="font-medium text-neutral-900 hover:text-brand-700">{r.student?.name ?? 'Deleted student'}</Link><div className="text-xs text-neutral-500">{r.student?.email}</div></div> },
    { key: 'e', header: 'Exam', cell: (r) => <>{r.exam?.title ?? '—'}{r.attemptNumber > 1 && <span className="text-neutral-500"> (attempt {r.attemptNumber})</span>}</> },
    { key: 'st', header: 'Status', cell: state },
    { key: 'sc', header: 'Score', align: 'right', cell: (r) => (r.status === 'pending_review' ? <span className="text-neutral-500">{r.score}/{r.maxScore} so far</span> : `${r.score}/${r.maxScore}`) },
    { key: 'p', header: '%', align: 'right', cell: (r) => formatPercent(r.percentage) },
    { key: 'r', header: 'Result', cell: (r) => (r.passed == null ? <span className="text-neutral-400">—</span> : <Badge tone={r.passed ? 'success' : 'danger'}>{r.passed ? 'Passed' : 'Not passed'}</Badge>) },
    { key: 'd', header: 'Submitted', cell: (r) => <span className="whitespace-nowrap text-neutral-600">{formatDateTime(r.submittedAt)}</span> },
  ];
  return (
    <>
      <PageHeader title="Results" description="Review submissions, grade essays and release results to students."
        actions={examId ? <Button onClick={() => setConfirm(true)}>Release all graded for this exam</Button> : undefined} />
      <div className="mb-3 flex flex-wrap gap-2">
        <div className="w-full sm:w-64"><Select value={examId ?? ''} onChange={(e) => update({ exam: e.target.value || undefined, page: undefined })} aria-label="Filter by exam"><option value="">All exams</option>{exams.data?.items.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}</Select></div>
        <div className="w-full sm:w-44"><Select value={status ?? ''} onChange={(e) => update({ status: e.target.value || undefined, page: undefined })} aria-label="Filter by status"><option value="">All results</option><option value="pending_review">Needs grading</option><option value="graded">Graded</option></Select></div>
      </div>
      <DataTable columns={columns} rows={list.data?.items} rowKey={(r) => r.id} loading={list.isPending} fetching={list.isFetching}
        error={list.isError ? <ErrorState message={msg(list.error)} onRetry={() => void list.refetch()} /> : undefined}
        empty={status === 'pending_review' ? <EmptyState icon={<ClipboardCheck className="size-6" />} title="Nothing to grade" description="Essays that need your review will appear here." /> : <EmptyState title="No results yet" description="Results appear when students submit their exams." />}
        renderMobile={(r) => (<Link to={`/admin/results/${r.id}`} className="block"><div className="flex items-start justify-between gap-2"><span className="font-medium">{r.student?.name}</span>{state(r)}</div>
          <div className="text-xs text-neutral-500">{r.exam?.title}</div><div className="tabular mt-1 text-xs text-neutral-600">{r.score}/{r.maxScore} · {formatPercent(r.percentage)} · {formatDateTime(r.submittedAt)}</div></Link>)} />
      {list.data && <Pagination page={list.data.page} limit={list.data.limit} total={list.data.total} totalPages={list.data.totalPages} onPage={(p) => update({ page: p > 1 ? String(p) : undefined })} />}
      <ConfirmDialog open={confirm} title="Release results?" confirmLabel="Release" loading={releaseAll.isPending} onClose={() => setConfirm(false)}
        message="Every graded result for this exam becomes visible to its student. Results that still need grading are not affected."
        onConfirm={() => examId && releaseAll.mutate(examId, { onSuccess: (r) => { toast.success(`${r.released} ${r.released === 1 ? 'result' : 'results'} released`); setConfirm(false); }, onError: (e) => { toast.error(msg(e)); setConfirm(false); } })} />
    </>
  );
}
