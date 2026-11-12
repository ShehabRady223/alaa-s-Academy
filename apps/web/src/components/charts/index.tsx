import { ComponentProps, lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/States';
import { cn } from '@/lib/cn';

// recharts is large: load it only on screens that draw a chart.
const Line = lazy(() => import('./Charts').then((m) => ({ default: m.ProgressLine })));
const Bars = lazy(() => import('./Charts').then((m) => ({ default: m.CountBars })));
export const ProgressLine = (p: ComponentProps<typeof Line>) => <Suspense fallback={<Skeleton className="h-[220px] w-full" />}><Line {...p} /></Suspense>;
export const CountBars = (p: ComponentProps<typeof Bars>) => <Suspense fallback={<Skeleton className="h-[200px] w-full" />}><Bars {...p} /></Suspense>;

export const barColor = (pct: number) => (pct >= 80 ? 'bg-green-600' : pct >= 60 ? 'bg-brand-600' : 'bg-amber-600');

export function Meter({ value, className }: { value: number; className?: string }) {
  return <div className={cn('h-2 overflow-hidden rounded-full bg-neutral-200', className)} role="img" aria-label={`${value}%`}><div className={cn('h-full', barColor(value))} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>;
}

export function TopicBars({ subjects }: { subjects: { subject: string; percentage: number; topics: { topic: string; percentage: number; questions: number }[] }[] }) {
  return (
    <div className="space-y-5">{subjects.map((s) => (
      <div key={s.subject}>
        <div className="mb-2 flex items-baseline justify-between"><h3 className="text-sm font-semibold">{s.subject}</h3><span className="tabular text-sm text-neutral-600">{s.percentage}%</span></div>
        <ul className="space-y-2">{s.topics.map((t) => (
          <li key={t.topic} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-[13px] sm:grid-cols-[11rem_1fr_6.5rem]">
            <span className="truncate text-neutral-700">{t.topic}</span><Meter value={t.percentage} /><span className="tabular text-right text-neutral-600">{t.percentage}% <span className="text-neutral-400">({t.questions} q)</span></span>
          </li>))}</ul>
      </div>))}</div>
  );
}
