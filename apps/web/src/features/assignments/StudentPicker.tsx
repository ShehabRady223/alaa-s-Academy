import { Search } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/Field';
import { Skeleton } from '@/components/ui/States';
import { useStudents } from '@/features/students/api';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

export function StudentPicker({ value, onChange, names }: { value: string[]; onChange: (ids: string[]) => void; names: Map<string, string> }) {
  const [search, setSearch] = useState(''); const s = useDebouncedValue(search.trim(), 300);
  const q = useStudents({ page: 1, limit: 100, search: s || undefined, sortBy: 'name', order: 'asc' });
  const list = q.data?.items.filter((x) => x.profile.status !== 'disabled') ?? [];
  const set = new Set(value); list.forEach((x) => names.set(x.id, x.name));
  const toggle = (id: string) => onChange(set.has(id) ? value.filter((v) => v !== id) : [...value, id]);
  const all = list.length > 0 && list.every((x) => set.has(x.id));
  return (
    <div>
      <div className="relative mb-2"><Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-neutral-400" aria-hidden />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search students" aria-label="Search students" className="pl-8" /></div>
      <div className="max-h-56 overflow-y-auto rounded-md border border-neutral-200">
        {q.isPending ? <div className="space-y-2 p-3"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-2/3" /></div>
          : list.length === 0 ? <p className="p-4 text-center text-[13px] text-neutral-500">No students found. Add students first.</p> : <>
            <label className="flex items-center gap-3 border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-[13px]"><input type="checkbox" className="size-4 accent-brand-600" checked={all}
              onChange={() => onChange(all ? value.filter((v) => !list.some((x) => x.id === v)) : [...new Set([...value, ...list.map((x) => x.id)])])} />Select all shown</label>
            <ul className="divide-y divide-neutral-100">{list.map((x) => (<li key={x.id}><label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-neutral-50">
              <input type="checkbox" className="size-4 accent-brand-600" checked={set.has(x.id)} onChange={() => toggle(x.id)} />
              <span className="min-w-0"><span className="block truncate text-sm">{x.name}</span><span className="block truncate text-xs text-neutral-500">{x.email}{x.profile.level ? ` · ${x.profile.level}` : ''}</span></span></label></li>))}</ul></>}
      </div>
      <p className="mt-1 text-xs text-neutral-500">{value.length} selected</p>
    </div>
  );
}
