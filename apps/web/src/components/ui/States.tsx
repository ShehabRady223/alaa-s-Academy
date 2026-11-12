import { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from './Button';

export const Skeleton = ({ className }: { className?: string }) => <div aria-hidden className={cn('animate-pulse rounded bg-neutral-200', className)} />;

export function EmptyState({ title, description, action, icon }: { title: string; description?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-4 py-12 text-center">
      {icon && <div className="mb-3 text-neutral-400">{icon}</div>}
      <p className="text-sm font-medium text-neutral-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-neutral-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center px-4 py-12 text-center">
      <AlertCircle className="mb-3 size-6 text-red-500" aria-hidden />
      <p className="text-sm font-medium text-neutral-900">Couldn't load this</p>
      <p className="mt-1 max-w-sm text-sm text-neutral-500">{message}</p>
      {onRetry && <Button className="mt-4" size="sm" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function Alert({ tone = 'danger', children }: { tone?: 'danger' | 'success' | 'info'; children: ReactNode }) {
  const t = { danger: 'border-red-200 bg-red-50 text-red-800', success: 'border-green-200 bg-green-50 text-green-800', info: 'border-neutral-200 bg-neutral-50 text-neutral-700' }[tone];
  return <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('rounded-md border px-3 py-2 text-[13px]', t)}>{children}</div>;
}

export const FullPageSpinner = () => (
  <div className="flex min-h-screen items-center justify-center" role="status" aria-label="Loading">
    <div className="size-6 animate-spin rounded-full border-2 border-neutral-300 border-t-brand-600" />
  </div>
);
