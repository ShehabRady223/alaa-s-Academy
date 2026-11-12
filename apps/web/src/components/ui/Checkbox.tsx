import { forwardRef, InputHTMLAttributes, ReactNode } from 'react';

export const Checkbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; hint?: string }>(
  function Checkbox({ label, hint, ...rest }, ref) {
    return (
      <label className="flex items-start gap-2.5 text-sm text-neutral-800">
        <input ref={ref} type="checkbox" className="mt-0.5 size-4 shrink-0 accent-brand-600" {...rest} />
        <span>{label}{hint && <span className="block text-xs text-neutral-500">{hint}</span>}</span>
      </label>
    );
  },
);
