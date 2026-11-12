import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-md border border-neutral-200 bg-white', className)} {...rest} />;
}

export function CardHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-4 py-3">
      <div><h2 className="text-sm font-semibold text-neutral-900">{title}</h2>{description && <p className="mt-0.5 text-xs text-neutral-500">{description}</p>}</div>
      {action}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-xl font-semibold text-neutral-900">{title}</h1>{description && <p className="mt-0.5 text-sm text-neutral-500">{description}</p>}</div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="px-4 py-3">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="tabular mt-0.5 text-xl font-semibold text-neutral-900">{value}</div>
      {hint && <div className="text-xs text-neutral-500">{hint}</div>}
    </div>
  );
}
