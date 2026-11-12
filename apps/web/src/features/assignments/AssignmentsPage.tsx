import { ClipboardList, Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { Badge } from '@/components/ui/Badge';
import { buttonClass } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/Card';
import { Column, DataTable } from '@/components/ui/DataTable';
import { Input, Select } from '@/components/ui/Field';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { formatDateTime, timeAgo } from '@/lib/format';
import { HW_STATUS, HwStatus, HwSummary, useHwList } from './api';

export function AssignmentsPage() {
  const [sp, setSp] = useSearchParams();
  const status = (['draft', 'published', 'closed'].includes(sp.get('status') ?? '') ? sp.get('status') : undefined) as HwStatus | undefined; const page = Math.max(1, Number(sp.get('page')) || 1);
  const [text, setText] = useState(sp.get('q') ?? ''); const q = useDebouncedValue(text.trim(), 300);
  useEffect(() => { if ((sp.get('q') ?? '') !== q) setSp((p) => { q ? p.set('q', q) : p.delete('q'); p.delete('page'); return p; }, { replace: true }); }, [q, sp, setSp]);
  const update = (patch: Record<string, string | undefined>) => setSp((p) => { Object.entries(patch).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k))); return p; });
  const list = useHwList({ page, limit: 20, status, search: sp.get('q') || undefined });
  const filtered = !!(sp.get('q') || status);
  const create = <Link to="/admin/assignments/new" className={buttonClass('primary')}><Plus className="size-4" aria-hidden />Create assignment</Link>;

  const columns: Column<HwSummary>[] = [
    { key: 't', header: 'Assignment', cell: (a) => <Link to={`/admin/assignments/${a.id}`} className="font-medium text-neutral-900 hover:text-brand-700">{a.title}</Link> },
    { key: 's', header: 'Status', cell: (a) => <Badge tone={HW_STATUS[a.status].tone}>{HW_STATUS[a.status].label}</Badge> },
    { key: 'd', header: 'Due', cell: (a) => <span className="text-neutral-600">{a.dueDate ? formatDateTime(a.dueDate) : 'No deadline'}</span> },
    { key: 'r', header: 'Submitted', align: 'right', cell: (a) => `${a.submittedCount} / ${a.recipientCount}` },
    { key: 'g', header: 'Graded', align: 'right', cell: (a) => a.gradedCount },
    { key: 'u', header: 'Updated', cell: (a) => <span className="text-neutral-600">{timeAgo(a.updatedAt)}</span> },
  ];
  return (
    <>
      <PageHeader title="Assignments" description="Homework you send to your students. Separate from exams." actions={create} />
      <div className="mb-3 flex flex-wrap gap-2">
        <div className="relative w-full sm:w-72"><Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-neutral-400" aria-hidden />
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search by title" aria-label="Search assignments" className="pl-8" /></div>
        <div className="w-full sm:w-40"><Select value={status ?? ''} onChange={(e) => update({ status: e.target.value || undefined, page: undefined })} aria-label="Filter by status"><option value="">All</option><option value="draft">Draft</option><option value="published">Published</option><option value="closed">Closed</option></Select></div>
      </div>
      <DataTable columns={columns} rows={list.data?.items} rowKey={(a) => a.id} loading={list.isPending} fetching={list.isFetching}
        error={list.isError ? <ErrorState message={list.error instanceof ApiError ? list.error.message : 'Something went wrong.'} onRetry={() => void list.refetch()} /> : undefined}
        empty={filtered ? <EmptyState title="No assignments match" description="Try different filters." /> : <EmptyState icon={<ClipboardList className="size-6" />} title="No assignments yet" description="Create an assignment with tasks and send it to your students." action={create} />}
        renderMobile={(a) => (<Link to={`/admin/assignments/${a.id}`} className="block"><div className="flex items-center justify-between gap-2"><span className="truncate font-medium">{a.title}</span><Badge tone={HW_STATUS[a.status].tone}>{HW_STATUS[a.status].label}</Badge></div>
          <div className="tabular mt-1 text-xs text-neutral-600">{a.submittedCount}/{a.recipientCount} submitted · {a.dueDate ? `Due ${formatDateTime(a.dueDate)}` : 'No deadline'}</div></Link>)} />
      {list.data && <Pagination page={list.data.page} limit={list.data.limit} total={list.data.total} totalPages={list.data.totalPages} onPage={(p) => update({ page: p > 1 ? String(p) : undefined })} />}
    </>
  );
}
