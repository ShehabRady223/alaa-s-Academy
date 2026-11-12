import { Bell } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { timeAgo } from '@/lib/format';
import { Notice, useMarkAllRead, useMarkRead, useNotifications } from '@/features/insights/api';

const target = (n: Notice) => (n.entityType === 'ExamAttempt' && n.entityId ? `/admin/results/${n.entityId}` : n.entityType === 'Assignment' && n.entityId ? `/admin/assignments/${n.entityId}` : n.entityType === 'Exam' && n.entityId ? `/admin/exams/${n.entityId}` : null);

export function NotificationBell({ align = 'left' }: { align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false); const ref = useRef<HTMLDivElement>(null); const navigate = useNavigate();
  const q = useNotifications(); const markRead = useMarkRead(); const markAll = useMarkAllRead();
  const unread = q.data?.unreadCount ?? 0;
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', down); document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'} aria-expanded={open}
        className="relative rounded p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"><Bell className="size-[18px]" />
        {unread > 0 && <span className="tabular absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold leading-4 text-white">{unread > 9 ? '9+' : unread}</span>}</button>
      {open && (
        <div className={cn('fixed inset-x-3 top-14 z-40 rounded-md border border-neutral-200 bg-white sm:absolute sm:inset-x-auto sm:top-full sm:mt-2 sm:w-80', align === 'left' ? 'sm:left-0' : 'sm:right-0')}>
          <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2"><h2 className="text-sm font-semibold">Notifications</h2>
            <button type="button" disabled={!unread} onClick={() => markAll.mutate()} className="text-xs font-medium text-brand-700 hover:underline disabled:text-neutral-400 disabled:no-underline">Mark all read</button></div>
          <ul className="max-h-96 divide-y divide-neutral-100 overflow-y-auto">
            {q.data?.items.length === 0 && <li className="px-3 py-8 text-center text-[13px] text-neutral-500">You're all caught up.</li>}
            {q.data?.items.map((n) => (
              <li key={n.id}><button type="button" className={cn('flex w-full gap-2 px-3 py-2.5 text-left hover:bg-neutral-50', !n.read && 'bg-brand-50/50')}
                onClick={() => { if (!n.read) markRead.mutate(n.id); const to = target(n); setOpen(false); if (to) navigate(to); }}>
                <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-brand-600')} aria-hidden />
                <span className="min-w-0"><span className="block text-[13px] font-medium text-neutral-900">{n.title}</span>{n.body && <span className="block truncate text-xs text-neutral-600">{n.body}</span>}<span className="text-[11px] text-neutral-500">{timeAgo(n.createdAt)}</span></span>
              </button></li>))}
          </ul>
        </div>)}
    </div>
  );
}
