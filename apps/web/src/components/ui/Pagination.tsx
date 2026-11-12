import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export function Pagination({ page, limit, total, totalPages, onPage }: { page: number; limit: number; total: number; totalPages: number; onPage: (p: number) => void }) {
  if (total === 0) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  return (
    <div className="mt-3 flex items-center justify-between gap-3 text-[13px] text-neutral-600">
      <span className="tabular">{from}–{to} of {total}</span>
      <div className="flex items-center gap-2">
        <span className="tabular hidden sm:inline">Page {page} of {totalPages}</span>
        <Button size="sm" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page"><ChevronLeft className="size-4" /></Button>
        <Button size="sm" onClick={() => onPage(page + 1)} disabled={page >= totalPages} aria-label="Next page"><ChevronRight className="size-4" /></Button>
      </div>
    </div>
  );
}
