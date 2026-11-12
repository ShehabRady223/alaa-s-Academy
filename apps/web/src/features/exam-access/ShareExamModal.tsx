import { Search } from 'lucide-react';
import { useState } from 'react';
import { ApiError } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Field, Input, Select } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Alert, Skeleton } from '@/components/ui/States';
import { useExams } from '@/features/exams/api';
import { StudentRow, useStudents } from '@/features/students/api';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useSingleFlight } from '@/hooks/useSingleFlight';
import { fromLocalInput } from '@/lib/format';
import { CreateResult, useShareExam } from './api';

interface Props { open: boolean; onClose: () => void; onDone: (r: CreateResult, names: Map<string, string>) => void }

export function ShareExamModal({ open, ...rest }: Props) {
  return <Modal open={open} onClose={rest.onClose} title="Share an exam" size="lg"><ShareForm {...rest} /></Modal>;
}

function ShareForm({ onClose, onDone }: Omit<Props, 'open'>) {
  const exams = useExams({ page: 1, limit: 100, status: 'published' });
  const create = useShareExam();
  const [examId, setExamId] = useState(''); const [search, setSearch] = useState(''); const s = useDebouncedValue(search.trim(), 300);
  const [picked, setPicked] = useState<Map<string, StudentRow>>(new Map());
  const [expiresAt, setExpiresAt] = useState(''); const [attempts, setAttempts] = useState('');
  const [error, setError] = useState<string | null>(null);
  const students = useStudents({ page: 1, limit: 100, search: s || undefined, sortBy: 'name', order: 'asc' });
  const eligible = students.data?.items.filter((x) => x.profile.status !== 'disabled') ?? [];
  const openExams = exams.data?.items.filter((e) => e.effectiveStatus === 'active' || e.effectiveStatus === 'scheduled') ?? [];
  const toggle = (x: StudentRow) => setPicked((m) => { const n = new Map(m); n.has(x.id) ? n.delete(x.id) : n.set(x.id, x); return n; });
  const allShown = eligible.length > 0 && eligible.every((x) => picked.has(x.id));

  const once = useSingleFlight();
  const submit = () => once(submitImpl);
  const submitImpl = async () => {
    if (!examId) return setError('Choose an exam');
    if (!picked.size) return setError('Choose at least one student');
    setError(null);
    try {
      const r = await create.mutateAsync({ examId, studentIds: [...picked.keys()], ...(expiresAt && { expiresAt: fromLocalInput(expiresAt)! }), ...(attempts && { maxAttempts: Number(attempts) }) });
      onDone(r, new Map([...picked].map(([id, x]) => [id, x.name])));
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Something went wrong.'); }
  };

  return (
    <div className="space-y-4">
      {error && <Alert>{error}</Alert>}
      <Field label="Exam" hint={!exams.isPending && openExams.length === 0 ? 'No published exams yet. Publish an exam first.' : 'Only published exams can be assigned.'}>
        <Select value={examId} onChange={(e) => setExamId(e.target.value)}><option value="">Choose an exam…</option>{openExams.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}</Select>
      </Field>

      <fieldset>
        <legend className="mb-1 flex w-full items-center justify-between text-[13px] font-medium text-neutral-700"><span>Students</span><span className="font-normal text-neutral-500">{picked.size} selected</span></legend>
        <div className="relative mb-2"><Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-neutral-400" aria-hidden />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search students" aria-label="Search students" className="pl-8" /></div>
        <div className="max-h-56 overflow-y-auto rounded-md border border-neutral-200">
          {students.isPending ? <div className="space-y-2 p-3"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-2/3" /></div>
            : eligible.length === 0 ? <p className="p-4 text-center text-[13px] text-neutral-500">No students found.</p>
            : <>
              <label className="flex items-center gap-3 border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-[13px]">
                <input type="checkbox" className="size-4 accent-brand-600" checked={allShown} onChange={() => setPicked((m) => { const n = new Map(m); eligible.forEach((x) => (allShown ? n.delete(x.id) : n.set(x.id, x))); return n; })} />Select all shown</label>
              <ul className="divide-y divide-neutral-100">{eligible.map((x) => (
                <li key={x.id}><label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-neutral-50">
                  <input type="checkbox" className="size-4 accent-brand-600" checked={picked.has(x.id)} onChange={() => toggle(x)} />
                  <span className="min-w-0"><span className="block truncate text-sm">{x.name}</span><span className="block truncate text-xs text-neutral-500">{x.email}{x.profile.level ? ` · ${x.profile.level}` : ''}</span></span></label></li>))}</ul>
            </>}
        </div>
        {students.data && students.data.total > 100 && <p className="mt-1 text-xs text-neutral-500">Showing the first 100. Search to narrow the list.</p>}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Link expires" hint="Optional. After this the PIN stops working."><Input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} /></Field>
        <Field label="Attempts allowed" hint="Optional. Defaults to the exam's setting."><Input type="number" min={1} max={10} value={attempts} onChange={(e) => setAttempts(e.target.value)} /></Field>
      </div>
      <Checkbox label="Each student gets their own PIN" hint="A PIN only works when that student is signed in to their own account." checked disabled readOnly />
      <div className="sticky -bottom-4 -mx-5 -mb-4 flex justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-5 py-3">
        <Button onClick={onClose} disabled={create.isPending}>Cancel</Button>
        <Button variant="primary" loading={create.isPending} onClick={() => void submit()}>Share with {picked.size || ''} {picked.size === 1 ? 'student' : 'students'}</Button>
      </div>
    </div>
  );
}
