import { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Skeleton } from './States';

export interface Column<T> {
  key: string; header: ReactNode; cell: (row: T) => ReactNode;
  sortKey?: string; align?: 'left' | 'right'; className?: string;
}
export interface SortState { key: string; dir: 'asc' | 'desc' }

interface Props<T> {
  columns: Column<T>[]; rows: T[] | undefined; rowKey: (r: T) => string;
  loading?: boolean; fetching?: boolean; empty: ReactNode; error?: ReactNode;
  sort?: SortState; onSort?: (key: string) => void;
  /** Below `md` the table becomes a list of these cards instead of a squeezed grid. */
  renderMobile?: (r: T) => ReactNode;
}

export function DataTable<T>({ columns, rows, rowKey, loading, fetching, empty, error, sort, onSort, renderMobile }: Props<T>) {
  const body = error ? error : loading ? null : rows && rows.length === 0 ? empty : null;
  return (
    <div className={cn('overflow-hidden rounded-md border border-neutral-200 bg-white transition-opacity', fetching && !loading && 'opacity-70')} aria-busy={loading || fetching}>
      <div className={cn(renderMobile && 'hidden md:block', 'overflow-x-auto')}>
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50">
              {columns.map((c) => {
                const active = !!c.sortKey && sort?.key === c.sortKey;
                return (
                  <th key={c.key} scope="col" aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={cn('whitespace-nowrap px-3 py-2 text-xs font-medium text-neutral-600', c.align === 'right' && 'text-right', c.className)}>
                    {c.sortKey && onSort ? (
                      <button type="button" onClick={() => onSort(c.sortKey!)} className="inline-flex items-center gap-1 hover:text-neutral-900">
                        {c.header}
                        {active ? (sort!.dir === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />) : <ChevronsUpDown className="size-3 text-neutral-400" />}
                      </button>
                    ) : c.header}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {loading && Array.from({ length: 6 }, (_, i) => (
              <tr key={i}>{columns.map((c) => <td key={c.key} className="px-3 py-3"><Skeleton className="h-4 w-full max-w-[140px]" /></td>)}</tr>
            ))}
            {!loading && !error && rows?.map((r) => (
              <tr key={rowKey(r)} className="hover:bg-neutral-50/70">
                {columns.map((c) => <td key={c.key} className={cn('px-3 py-2.5 align-middle text-sm text-neutral-800', c.align === 'right' && 'text-right', c.className)}>{c.cell(r)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {renderMobile && (
        <ul className="divide-y divide-neutral-100 md:hidden">
          {loading && Array.from({ length: 4 }, (_, i) => <li key={i} className="space-y-2 p-3"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-3 w-2/3" /></li>)}
          {!loading && !error && rows?.map((r) => <li key={rowKey(r)} className="p-3">{renderMobile(r)}</li>)}
        </ul>
      )}
      {body}
    </div>
  );
}
