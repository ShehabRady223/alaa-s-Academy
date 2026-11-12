import { ReactNode } from 'react';
import { Wordmark } from './Wordmark';

export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Wordmark className="mb-6" />
      <div className="w-full max-w-[380px] rounded-md border border-neutral-200 bg-white p-6">
        <h1 className="text-lg font-semibold text-neutral-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>}
        <div className="mt-5">{children}</div>
      </div>
      {footer && <div className="mt-4 text-[13px] text-neutral-500">{footer}</div>}
    </div>
  );
}
