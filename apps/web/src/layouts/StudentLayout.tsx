import { Outlet } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/store/auth';
import { Wordmark } from './Wordmark';

export function StudentLayout() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Wordmark />
          <div className="flex items-center gap-3">
            <span className="hidden text-[13px] text-neutral-600 sm:inline">{user?.name}</span>
            <button type="button" onClick={() => void logout()} className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] text-neutral-700 hover:bg-neutral-100"><LogOut className="size-4" aria-hidden />Sign out</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6"><Outlet /></main>
    </div>
  );
}
