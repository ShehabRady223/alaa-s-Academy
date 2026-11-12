import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { BarChart3, ClipboardCheck, ClipboardList, FileText, LayoutDashboard, KeyRound, LogOut, Menu, Settings, Users, X } from 'lucide-react';
import { Avatar } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { useAuth } from '@/store/auth';
import { NotificationBell } from '@/features/admin/NotificationBell';
import { Wordmark } from './Wordmark';

// Nav grows as screens are built. Only real routes are listed.
const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/students', label: 'Students', icon: Users },
  { to: '/admin/exams', label: 'Exams', icon: FileText },
  { to: '/admin/exam-access', label: 'Exam access', icon: KeyRound },
  { to: '/admin/assignments', label: 'Assignments', icon: ClipboardList },
  { to: '/admin/results', label: 'Results', icon: ClipboardCheck },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center justify-between border-b border-neutral-200 pl-4 pr-2"><Wordmark /><NotificationBell /></div>
      <nav className="flex-1 space-y-0.5 p-2" aria-label="Main">
        {NAV.map(({ to, label, icon: Icon, ...r }) => (
          <NavLink key={to} to={to} end={'end' in r} className={({ isActive }) => cn('flex h-9 items-center gap-2.5 rounded-md px-3 text-sm', isActive ? 'bg-brand-50 font-medium text-brand-700' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900')}>
            <Icon className="size-4" aria-hidden />{label}
          </NavLink>
        ))}
      </nav>
      <div className="flex items-center gap-2 border-t border-neutral-200 p-3">
        <Avatar name={user?.name ?? ''} />
        <div className="min-w-0 flex-1"><div className="truncate text-[13px] font-medium">{user?.name}</div><div className="truncate text-xs text-neutral-500">{user?.email}</div></div>
        <button type="button" onClick={() => void logout()} aria-label="Sign out" title="Sign out" className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"><LogOut className="size-4" /></button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:flex">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 border-r border-neutral-200 bg-white lg:block">{sidebar}</aside>
      <header className="sticky top-0 z-20 flex h-12 items-center gap-3 border-b border-neutral-200 bg-white px-3 lg:hidden">
        <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" className="rounded p-1.5 hover:bg-neutral-100"><Menu className="size-5" /></button>
        <Wordmark /><div className="ml-auto"><NotificationBell align="right" /></div>
      </header>
      {open && (
        <div className="fixed inset-0 z-30 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-neutral-900/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64 bg-white">
            <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="absolute right-2 top-3 rounded p-1.5 hover:bg-neutral-100"><X className="size-4" /></button>
            {sidebar}
          </div>
        </div>
      )}
      <main className="min-w-0 flex-1 lg:pl-60"><div className="mx-auto max-w-6xl px-4 py-6 sm:px-6"><Outlet /></div></main>
    </div>
  );
}
