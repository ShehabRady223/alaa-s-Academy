import { forwardRef, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

/** The wrapping <label> ties text and control together without ids. */
export function Field({ label, error, hint, children, className }: { label: string; error?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1 block text-[13px] font-medium text-neutral-700">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-neutral-500">{hint}</span>}
      {error && <span role="alert" className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

const control = 'w-full rounded-md border bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors focus:outline-none focus:ring-1 disabled:bg-neutral-100 disabled:text-neutral-500';
const tone = (invalid?: boolean) => invalid ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-neutral-300 hover:border-neutral-400 focus:border-brand-600 focus:ring-brand-600';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ invalid, className, ...rest }, ref) { return <input ref={ref} className={cn(control, 'h-9', tone(invalid), className)} {...rest} />; },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function Textarea({ invalid, className, ...rest }, ref) { return <textarea ref={ref} className={cn(control, 'py-2', tone(invalid), className)} {...rest} />; },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(
  function Select({ invalid, className, children, ...rest }, ref) {
    return (
      <span className="relative block">
        <select ref={ref} className={cn(control, 'h-9 appearance-none pr-8', tone(invalid), className)} {...rest}>{children}</select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-neutral-500" aria-hidden />
      </span>
    );
  },
);
