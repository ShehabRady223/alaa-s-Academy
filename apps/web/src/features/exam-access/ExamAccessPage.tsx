import { ClipboardList, Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { Badge, Tone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/Card';
import { Column, DataTable } from '@/components/ui/DataTable';
import { Select } from '@/components/ui/Field';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { RowMenu } from '@/components/ui/RowMenu';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { useExams } from '@/features/exams/api';
import { formatDateTime, formatPercent } from '@/lib/format';
import { AccessRow, AccessStatus, CreateResult, useExamAccess, useRegeneratePin, useRevoke } from './api';
import { ShareExamModal } from './ShareExamModal';
import { PinDialog } from './PinDialog';

const STATUS: Record<AccessStatus, { label: string; tone: Tone }> = { active: { label: 'Active', tone: 'success' }, completed: { label: 'Attempts used', tone: 'brand' }, revoked: { label: 'Revoked', tone: 'neutral' } };

export function ExamAccessPage() {
  const toast = useToast(); const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const examId = sp.get('exam') ?? undefined; const page = Math.max(1, Number(sp.get('page')) || 1);
  const status = (['active', 'completed', 'revoked'].includes(sp.get('status') ?? '') ? sp.get('status') : undefined) as AccessStatus | undefined;
  const update = (patch: Record<string, string | undefined>) => setSp((p) => { Object.entries(patch).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k))); return p; });

  const list = useExamAccess({ page, limit: 20, examId, status });
  const exams = useExams({ page: 1, limit: 100, status: 'published' });
  const [shareOpen, setShareOpen] = useState(false); const [result, setResult] = useState<{ r: CreateResult; names: Map<string, string> } | null>(null);
  const [pinFor, setPinFor] = useState<AccessRow | null>(null); const [regenFor, setRegenFor] = useState<AccessRow | null>(null); const [revokeFor, setRevokeFor] = useState<AccessRow | null>(null);
  const revoke = useRevoke(); const regen = useRegeneratePin();
  const msg = (e: unknown) => (e instanceof ApiError ? e.message : 'Something went wrong.');
  const filtered = !!(examId || status);

  const menu = (a: AccessRow) => (
    <RowMenu label={`Actions for ${a.student.name}`} items={[
      { label: 'Show PIN', onSelect: () => setPinFor(a), hidden: a.status === 'revoked' },
      { label: 'Print PIN card', onSelect: () => navigate(`/admin/exam-access/print?ids=${a.id}`), hidden: a.status === 'revoked' },
      { label: 'Generate new PIN', onSelect: () => setRegenFor(a), hidden: a.status !== 'active' },
      { label: 'Revoke access', danger: true, onSelect: () => setRevokeFor(a), hidden: a.status === 'revoked' },
    ]} />
  );
  const columns: Column<AccessRow>[] = [
    { key: 's', header: 'Student', cell: (a) => <div className="leading-tight"><div className="font-medium text-neutral-900">{a.student.name}</div><div className="text-xs text-neutral-500">{a.student.email}</div></div> },
    { key: 'e', header: 'Exam', cell: (a) => a.exam.title },
    { key: 'pin', header: 'PIN', cell: (a) => (a.pin ? <code className="font-mono text-[13px] tracking-wider text-neutral-900">{a.pin}</code> : <span className="text-neutral-400">—</span>) },
    { key: 'st', header: 'Status', cell: (a) => <Badge tone={STATUS[a.status].tone}>{STATUS[a.status].label}</Badge> },
    { key: 'at', header: 'Attempts', align: 'right', cell: (a) => `${a.attemptsUsed} / ${a.maxAttempts}` },
    { key: 'b', header: 'Best score', align: 'right', cell: (a) => formatPercent(a.bestPercentage) },
    { key: 'x', header: 'Link expires', cell: (a) => <span className="text-neutral-600">{a.expiresAt ? formatDateTime(a.expiresAt) : 'No expiry'}</span> },
    { key: 'a', header: <span className="sr-only">Actions</span>, align: 'right', className: 'w-10', cell: menu },
  ];

  return (
    <>
      <PageHeader title="Exam access" description="Share a published exam with specific students. Each gets their own PIN."
        actions={<Button variant="primary" onClick={() => setShareOpen(true)}><Plus className="size-4" aria-hidden />Share exam</Button>} />
      <div className="mb-3 flex flex-wrap gap-2">
        <div className="w-full sm:w-64"><Select value={examId ?? ''} onChange={(e) => update({ exam: e.target.value || undefined, page: undefined })} aria-label="Filter by exam"><option value="">All exams</option>{exams.data?.items.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}</Select></div>
        <div className="w-full sm:w-44"><Select value={status ?? ''} onChange={(e) => update({ status: e.target.value || undefined, page: undefined })} aria-label="Filter by status"><option value="">All statuses</option><option value="active">Active</option><option value="completed">Attempts used</option><option value="revoked">Revoked</option></Select></div>
      </div>
      <DataTable columns={columns} rows={list.data?.items} rowKey={(a) => a.id} loading={list.isPending} fetching={list.isFetching}
        error={list.isError ? <ErrorState message={msg(list.error)} onRetry={() => void list.refetch()} /> : undefined}
        empty={filtered ? <EmptyState title="No results match" description="Try different filters." />
          : <EmptyState icon={<ClipboardList className="size-6" />} title="No exams shared yet" description="Share a published exam with students and give them their PINs." action={<Button variant="primary" onClick={() => setShareOpen(true)}>Share exam</Button>} />}
        renderMobile={(a) => (
          <div className="flex items-start gap-2"><div className="min-w-0 flex-1">
            <div className="flex items-center gap-2"><span className="truncate font-medium">{a.student.name}</span><Badge tone={STATUS[a.status].tone}>{STATUS[a.status].label}</Badge></div>
            <div className="truncate text-xs text-neutral-500">{a.exam.title}</div>
            <div className="tabular mt-1 text-xs text-neutral-600">Attempts {a.attemptsUsed}/{a.maxAttempts} · Best {formatPercent(a.bestPercentage)}</div></div>{menu(a)}</div>
        )} />
      {list.data && <Pagination page={list.data.page} limit={list.data.limit} total={list.data.total} totalPages={list.data.totalPages} onPage={(p) => update({ page: p > 1 ? String(p) : undefined })} />}

      <ShareExamModal open={shareOpen} onClose={() => setShareOpen(false)} onDone={(r, names) => { setShareOpen(false); setResult({ r, names }); }} />
      <Modal open={!!result} onClose={() => setResult(null)} title="Exam shared" size="sm" footer={<>
        {!!result?.r.created.length && <Button variant="primary" onClick={() => navigate(`/admin/exam-access/print?ids=${result.r.created.map((c) => c.id).join(',')}`)}>Print PIN cards</Button>}
        <Button onClick={() => setResult(null)}>Done</Button></>}>
        {result && <div className="space-y-3 text-sm">
          {result.r.created.length > 0 && <ul className="divide-y divide-neutral-100 rounded-md border border-neutral-200">{result.r.created.map((c) => <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2"><span className="truncate">{c.student.name}</span><code className="font-mono text-[13px] tracking-wider">{c.pin}</code></li>)}</ul>}
          <p><strong>{result.r.created.length}</strong> {result.r.created.length === 1 ? 'student was' : 'students were'} given access to the exam.</p>
          {result.r.skipped.length > 0 && <div><p className="mb-1 font-medium text-amber-800">{result.r.skipped.length} skipped</p>
            <ul className="space-y-0.5 text-[13px] text-neutral-600">{result.r.skipped.map((s) => <li key={s.studentId}>{result.names.get(s.studentId) ?? 'Student'}: {s.reason}</li>)}</ul></div>}
        </div>}
      </Modal>
      <PinDialog row={pinFor} onClose={() => setPinFor(null)} />
      <ConfirmDialog open={!!regenFor} title="Generate a new PIN?" confirmLabel="Generate new PIN" loading={regen.isPending} onClose={() => setRegenFor(null)}
        message={<>The current PIN for <strong>{regenFor?.student.name}</strong> stops working immediately. Give them the new one.</>}
        onConfirm={() => regenFor && regen.mutate(regenFor.id, { onSuccess: () => { toast.success('New PIN created'); const row = regenFor; setRegenFor(null); setPinFor(row); }, onError: (e) => { toast.error(msg(e)); setRegenFor(null); } })} />
      <ConfirmDialog open={!!revokeFor} danger title="Revoke access?" confirmLabel="Revoke access" loading={revoke.isPending} onClose={() => setRevokeFor(null)}
        message={<><strong>{revokeFor?.student.name}</strong> will no longer be able to open <strong>{revokeFor?.exam.title}</strong>. If they are in the middle of it, that attempt is cancelled. This can't be undone, but you can share the exam again.</>}
        onConfirm={() => revokeFor && revoke.mutate(revokeFor.id, { onSuccess: () => { toast.success('Access revoked'); setRevokeFor(null); }, onError: (e) => { toast.error(msg(e)); setRevokeFor(null); } })} />
    </>
  );
}
