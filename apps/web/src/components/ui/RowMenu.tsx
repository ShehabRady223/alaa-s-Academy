import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface MenuItem { label: string; onSelect: () => void; danger?: boolean; hidden?: boolean }

/** Fixed-position popover so it is never clipped by a scrolling table container. */
export function RowMenu({ items, label }: { items: MenuItem[]; label: string }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const visible = items.filter((i) => !i.hidden);

  useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    const onDown = (e: MouseEvent) => { if (!menu.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) close(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { close(); btn.current?.focus(); } };
    document.addEventListener('mousedown', onDown); document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true); window.addEventListener('resize', close);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close); };
  }, [pos]);

  const toggle = () => {
    if (pos) return setPos(null);
    const r = btn.current!.getBoundingClientRect();
    const h = visible.length * 32 + 8;
    setPos({ top: r.bottom + h > window.innerHeight ? r.top - h - 4 : r.bottom + 4, left: Math.max(8, r.right - 176) });
  };

  return (
    <>
      <button ref={btn} type="button" onClick={toggle} aria-label={label} aria-haspopup="menu" aria-expanded={!!pos}
        className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"><MoreHorizontal className="size-4" /></button>
      {pos && (
        <div ref={menu} role="menu" style={{ top: pos.top, left: pos.left }} className="fixed z-40 w-44 rounded-md border border-neutral-200 bg-white py-1">
          {visible.map((i) => (
            <button key={i.label} role="menuitem" type="button" onClick={() => { setPos(null); i.onSelect(); }}
              className={cn('block h-8 w-full px-3 text-left text-[13px] hover:bg-neutral-100', i.danger ? 'text-red-700' : 'text-neutral-800')}>{i.label}</button>
          ))}
        </div>
      )}
    </>
  );
}
