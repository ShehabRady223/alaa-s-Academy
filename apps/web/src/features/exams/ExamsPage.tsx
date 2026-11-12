import { FilePlus2, FileText, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { Badge } from '@/components/ui/Badge';
import { buttonClass } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/Card';
import { Column, DataTable } from '@/components/ui/DataTable';
import { Input, Select } from '@/components/ui/Field';
import { ConfirmDialog } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { RowMenu } from '@/components/ui/RowMenu';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { formatDate, timeAgo } from '@/lib/format';
import { EXAM_STATUS, ExamSummary, useArchiveExam, useDeleteExam, useDuplicateExam, useExams } from './api';

export function ExamsPage() {
  const toast = useToast(); const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const status = sp.get('status') ?? undefined; const page = Math.max(1, Number(sp.get('page')) || 1);
  const [text, setText] = useState(sp.get('q') ?? ''); const q = useDebouncedValue(text.trim(), 300);
  useEffect(() => { if ((sp.get('q') ?? '') !== q) setSp((p) => { q ? p.set('q', q) : p.delete('q'); p.delete('page'); return p; }, { replace: true }); }, [q, sp, setSp]);
  const update = (patch: Record<string, string | undefined>) => setSp((p) => { Object.entries(patch).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k))); return p; });

  const list = useExams({ page, limit: 20, search: sp.get('q') || undefined, status });
  const [archiveFor, setArchiveFor] = useState<ExamSummary | null>(null); const [deleteFor, setDeleteFor] = useState<ExamSummary | null>(null);
  const duplicate = useDuplicateExam(); const archive = useArchiveExam(); const del = useDeleteExam();
  const msg = (e: unknown) => (e instanceof ApiError ? e.message : 'Something went wrong.');
  const filtered = !!(sp.get('q') || status);

  const menu = (x: ExamSummary) => (
    <RowMenu label={`Actions for ${x.title}`} items={[
      { label: x.status === 'draft' ? 'Open builder' : 'View', onSelect: () => navigate(`/admin/exams/${x.id}`) },
      { label: 'Share with students', onSelect: () => navigate(`/admin/exam-access?exam=${x.id}`), hidden: x.status !== 'published' },
      { label: 'Duplicate', onSelect: () => duplicate.mutate(x.id, { onSuccess: (d) => { toast.success('Copy created as a draft'); navigate(`/admin/exams/${d.id}`); }, onError: (e) => toast.error(msg(e)) }) },
      { label: 'Archive', hidden: x.status === 'archived', onSelect: () => setArchiveFor(x) },
      { label: 'Delete', danger: true, onSelect: () => setDeleteFor(x) },
    ]} />
  );
  const columns: Column<ExamSummary>[] = [
    { key: 't', header: 'Exam', cell: (x) => <Link to={`/admin/exams/${x.id}`} className="font-medium text-neutral-900 hover:text-brand-700">{x.title}</Link> },
    { key: 's', header: 'Status', cell: (x) => <Badge tone={EXAM_STATUS[x.effectiveStatus].tone}>{EXAM_STATUS[x.effectiveStatus].label}</Badge> },
    { key: 'q', header: 'Questions', align: 'right', cell: (x) => `${x.questionCount} (${x.totalPoints} pts)` },
    { key: 'd', header: 'Duration', align: 'right', cell: (x) => (x.durationMinutes ? `${x.durationMinutes} min` : 'Untimed') },
    { key: 'w', header: 'Available', cell: (x) => (x.startDate || x.expiresAt ? <span className="text-neutral-600">{x.startDate ? formatDate(x.startDate) : 'Now'} to {x.expiresAt ? formatDate(x.expiresAt) : 'no end'}</span> : <span className="text-neutral-400">Always</span>) },
    { key: 'u', header: 'Updated', cell: (x) => <span className="text-neutral-600">{timeAgo(x.updatedAt)}</span> },
    { key: 'a', header: <span className="sr-only">Actions</span>, align: 'right', className: 'w-10', cell: menu },
  ];
  const create = <Link to="/admin/exams/new" className={buttonClass('primary')}><FilePlus2 className="size-4" aria-hidden />Create exam</Link>;

  return (
    <>
      <PageHeader title="Exams" description="Timed assessments students open with a PIN. Build one, publish it, then share it with students." actions={create} />
      <div className="mb-3 flex flex-wrap gap-2">
        <div className="relative w-full sm:w-72"><Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-neutral-400" aria-hidden />
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search by title" aria-label="Search exams" className="pl-8" /></div>
        <div className="w-full sm:w-40"><Select value={status ?? ''} onChange={(e) => update({ status: e.target.value || undefined, page: undefined })} aria-label="Filter by status">
          <option value="">All exams</option><option value="draft">Draft</option><option value="scheduled">Scheduled</option><option value="active">Active</option><option value="expired">Expired</option><option value="archived">Archived</option></Select></div>
      </div>
      <DataTable columns={columns} rows={list.data?.items} rowKey={(x) => x.id} loading={list.isPending} fetching={list.isFetching}
        error={list.isError ? <ErrorState message={msg(list.error)} onRetry={() => void list.refetch()} /> : undefined}
        empty={filtered ? <EmptyState title="No exams match" description="Try a different search or status." /> : <EmptyState icon={<FileText className="size-6" />} title="No exams yet" description="Create an exam, add questions from your bank, then publish it." action={create} />}
        renderMobile={(x) => (<div className="flex items-start gap-2"><div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><Link to={`/admin/exams/${x.id}`} className="truncate font-medium">{x.title}</Link><Badge tone={EXAM_STATUS[x.effectiveStatus].tone}>{EXAM_STATUS[x.effectiveStatus].label}</Badge></div>
          <div className="tabular mt-1 text-xs text-neutral-600">{x.questionCount} questions · {x.durationMinutes ? `${x.durationMinutes} min` : 'Untimed'} · {timeAgo(x.updatedAt)}</div></div>{menu(x)}</div>)} />
      {list.data && <Pagination page={list.data.page} limit={list.data.limit} total={list.data.total} totalPages={list.data.totalPages} onPage={(p) => update({ page: p > 1 ? String(p) : undefined })} />}

      <ConfirmDialog open={!!archiveFor} danger title="Archive exam?" confirmLabel="Archive exam" loading={archive.isPending} onClose={() => setArchiveFor(null)}
        message={<><strong>{archiveFor?.title}</strong> will be withdrawn: every student link stops working and attempts in progress are cancelled. Results already recorded are kept.</>}
        onConfirm={() => archiveFor && archive.mutate(archiveFor.id, { onSuccess: () => { toast.success('Exam archived'); setArchiveFor(null); }, onError: (e) => { toast.error(msg(e)); setArchiveFor(null); } })} />
      <ConfirmDialog open={!!deleteFor} danger title="Delete exam?" confirmLabel="Delete exam" loading={del.isPending} onClose={() => setDeleteFor(null)}
        message={<>This permanently deletes <strong>{deleteFor?.title}</strong> and the PINs shared for it. An exam that students have already taken can't be deleted. Archive it instead.</>}
        onConfirm={() => deleteFor && del.mutate(deleteFor.id, { onSuccess: () => { toast.success('Exam deleted'); setDeleteFor(null); }, onError: (e) => { toast.error(msg(e)); setDeleteFor(null); } })} />
    </>
  );
}
