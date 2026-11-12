import { Search, UserPlus, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { Avatar, Badge, Tone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/Card';
import { Column, DataTable } from '@/components/ui/DataTable';
import { Input, Select } from '@/components/ui/Field';
import { ConfirmDialog } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { RowMenu } from '@/components/ui/RowMenu';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { formatPercent, timeAgo } from '@/lib/format';
import { StudentListParams, StudentRow, StudentStatus, useDeleteStudent, useResendInvite, useStudents, useUpdateStudent } from './api';
import { InviteInfo, InviteLinkDialog } from './InviteLinkDialog';
import { StudentFormModal } from './StudentFormModal';

const STATUS: Record<StudentStatus, { label: string; tone: Tone }> = { active: { label: 'Active', tone: 'success' }, invited: { label: 'Invited', tone: 'warning' }, disabled: { label: 'Disabled', tone: 'neutral' } };
const LIMIT = 20;

export function StudentsPage() {
  const toast = useToast(); const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const sortBy = (['name', 'email', 'createdAt'].includes(sp.get('sort') ?? '') ? sp.get('sort') : 'name') as StudentListParams['sortBy'];
  const order = sp.get('dir') === 'desc' ? 'desc' : 'asc';
  const status = (['active', 'invited', 'disabled'].includes(sp.get('status') ?? '') ? sp.get('status') : undefined) as StudentStatus | undefined;
  const page = Math.max(1, Number(sp.get('page')) || 1);

  // Search box is local state; the URL (and the query) follows after a short pause.
  const [text, setText] = useState(sp.get('q') ?? '');
  const q = useDebouncedValue(text.trim(), 300);
  useEffect(() => {
    if ((sp.get('q') ?? '') === q) return;
    setSp((p) => { q ? p.set('q', q) : p.delete('q'); p.delete('page'); return p; }, { replace: true });
  }, [q, sp, setSp]);

  const update = (patch: Record<string, string | undefined>) => setSp((p) => { Object.entries(patch).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k))); return p; });
  const list = useStudents({ page, limit: LIMIT, search: sp.get('q') || undefined, status, sortBy, order });

  const [editing, setEditing] = useState<StudentRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [toDelete, setToDelete] = useState<StudentRow | null>(null);
  const updateM = useUpdateStudent(); const resendM = useResendInvite(); const deleteM = useDeleteStudent();
  const msg = (e: unknown) => (e instanceof ApiError ? e.message : 'Something went wrong.');

  const toggleSort = (key: string) => update({ sort: key, dir: sortBy === key && order === 'asc' ? 'desc' : 'asc', page: undefined });
  const setDisabled = (s: StudentRow, disabled: boolean) => updateM.mutate({ id: s.id, status: disabled ? 'disabled' : 'active' }, {
    onSuccess: () => toast.success(disabled ? `${s.name} was disabled` : `${s.name} was re-enabled`), onError: (e) => toast.error(msg(e)),
  });
  const resend = (s: StudentRow) => resendM.mutate(s.id, {
    onSuccess: (r) => setInvite({ link: r.inviteLink, emailed: r.emailed, name: s.name, email: s.email }), onError: (e) => toast.error(msg(e)),
  });

  const menu = (s: StudentRow) => (
    <RowMenu label={`Actions for ${s.name}`} items={[
      { label: 'View profile', onSelect: () => navigate(`/admin/students/${s.id}`) },
      { label: 'Edit details', onSelect: () => { setEditing(s); setFormOpen(true); } },
      { label: 'Send invite again', onSelect: () => resend(s), hidden: s.profile.status !== 'invited' },
      { label: 'Disable account', onSelect: () => setDisabled(s, true), hidden: s.profile.status === 'disabled' },
      { label: 'Re-enable account', onSelect: () => setDisabled(s, false), hidden: s.profile.status !== 'disabled' },
      { label: 'Delete', onSelect: () => setToDelete(s), danger: true },
    ]} />
  );

  const columns: Column<StudentRow>[] = [
    { key: 'name', header: 'Student', sortKey: 'name', cell: (s) => (
      <div className="flex items-center gap-2.5"><Avatar name={s.name} /><div className="min-w-0"><Link to={`/admin/students/${s.id}`} className="block truncate font-medium text-neutral-900 hover:text-brand-700">{s.name}</Link><div className="truncate text-xs text-neutral-500">{s.email}</div></div></div>
    ) },
    { key: 'phone', header: 'Phone', cell: (s) => s.profile.phone || <span className="text-neutral-400">—</span> },
    { key: 'level', header: 'Level', cell: (s) => s.profile.level || <span className="text-neutral-400">—</span> },
    { key: 'exams', header: 'Exams', align: 'right', cell: (s) => s.examsTaken },
    { key: 'avg', header: 'Avg. score', align: 'right', cell: (s) => formatPercent(s.averageScore) },
    { key: 'last', header: 'Last activity', cell: (s) => <span className="text-neutral-600">{timeAgo(s.profile.lastActiveAt)}</span> },
    { key: 'status', header: 'Status', cell: (s) => <Badge tone={STATUS[s.profile.status].tone}>{STATUS[s.profile.status].label}</Badge> },
    { key: 'actions', header: <span className="sr-only">Actions</span>, align: 'right', className: 'w-10', cell: menu },
  ];

  const filtered = !!(sp.get('q') || status);
  const total = list.data?.total;

  return (
    <>
      <PageHeader title="Students" description={total == null ? undefined : `${total} ${total === 1 ? 'student' : 'students'}${filtered ? ' match your filters' : ''}`}
        actions={<Button variant="primary" onClick={() => { setEditing(null); setFormOpen(true); }}><UserPlus className="size-4" aria-hidden />Add student</Button>} />

      <div className="mb-3 flex flex-wrap gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-neutral-400" aria-hidden />
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search by name or email" aria-label="Search students" className="pl-8" />
        </div>
        <div className="w-full sm:w-40"><Select value={status ?? ''} onChange={(e) => update({ status: e.target.value || undefined, page: undefined })} aria-label="Filter by status">
          <option value="">All statuses</option><option value="active">Active</option><option value="invited">Invited</option><option value="disabled">Disabled</option>
        </Select></div>
        {filtered && <Button variant="ghost" onClick={() => { setText(''); setSp({}, { replace: true }); }}>Clear filters</Button>}
      </div>

      <DataTable columns={columns} rows={list.data?.items} rowKey={(s) => s.id} loading={list.isPending} fetching={list.isFetching}
        sort={{ key: sortBy, dir: order }} onSort={toggleSort}
        error={list.isError ? <ErrorState message={msg(list.error)} onRetry={() => void list.refetch()} /> : undefined}
        empty={filtered
          ? <EmptyState title="No students match" description="Try a different search or clear the filters." />
          : <EmptyState icon={<Users className="size-6" />} title="No students yet" description="Add your first student. They'll get a link to set their own password." action={<Button variant="primary" onClick={() => { setEditing(null); setFormOpen(true); }}>Add student</Button>} />}
        renderMobile={(s) => (
          <div className="flex items-start gap-3">
            <Avatar name={s.name} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2"><span className="truncate font-medium">{s.name}</span><Badge tone={STATUS[s.profile.status].tone}>{STATUS[s.profile.status].label}</Badge></div>
              <div className="truncate text-xs text-neutral-500">{s.email}</div>
              <div className="tabular mt-1 text-xs text-neutral-600">{s.examsTaken} exams · avg {formatPercent(s.averageScore)} · {timeAgo(s.profile.lastActiveAt)}</div>
            </div>
            {menu(s)}
          </div>
        )} />

      {list.data && <Pagination page={list.data.page} limit={list.data.limit} total={list.data.total} totalPages={list.data.totalPages} onPage={(p) => update({ page: p > 1 ? String(p) : undefined })} />}

      <StudentFormModal open={formOpen} student={editing} onClose={() => setFormOpen(false)}
        onSaved={() => { setFormOpen(false); toast.success('Student updated'); }}
        onCreated={(r, name, email) => { setFormOpen(false); setInvite({ link: r.inviteLink, emailed: r.emailed, name, email }); toast.success(`${name} was added`); }} />
      <InviteLinkDialog invite={invite} onClose={() => setInvite(null)} />
      <ConfirmDialog open={!!toDelete} danger title="Delete student?" confirmLabel="Delete student" loading={deleteM.isPending} onClose={() => setToDelete(null)}
        message={<>This permanently removes <strong>{toDelete?.name}</strong> and their assignments. Students who have taken exams can't be deleted. Disable them instead.</>}
        onConfirm={() => toDelete && deleteM.mutate(toDelete.id, {
          onSuccess: () => { toast.success(`${toDelete.name} was deleted`); setToDelete(null); },
          onError: (e) => { toast.error(msg(e)); setToDelete(null); },
        })} />
    </>
  );
}
