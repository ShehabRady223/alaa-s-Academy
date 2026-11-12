import { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'brand';
const tones: Record<Tone, string> = {
  neutral: 'bg-neutral-100 text-neutral-700 ring-neutral-200',
  success: 'bg-green-50 text-green-800 ring-green-200',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200',
  danger: 'bg-red-50 text-red-800 ring-red-200',
  brand: 'bg-brand-50 text-brand-700 ring-brand-200',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cn('inline-flex items-center whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset', tones[tone])}>{children}</span>;
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const t = name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
  return <span aria-hidden className={cn('inline-flex shrink-0 items-center justify-center rounded-full bg-neutral-200 font-medium text-neutral-700', size === 'sm' ? 'size-7 text-[11px]' : 'size-8 text-xs')}>{t}</span>;
}
