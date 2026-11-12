import { ArrowLeft, Printer } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { ErrorState, FullPageSpinner } from '@/components/ui/States';
import { formatDateTime } from '@/lib/format';
import { useExamAccess } from './api';

/** Printable sheet: two PIN cards per row, to cut out and hand over. Screen chrome is hidden when printing. */
export function PrintPinsPage() {
  const ids = useSearchParams()[0].get('ids') ?? '';
  const q = useExamAccess({ page: 1, limit: 100, ids });
  if (q.isPending) return <FullPageSpinner />;
  if (q.isError) return <div className="p-6"><ErrorState message="Couldn't load the PINs." onRetry={() => void q.refetch()} /></div>;
  const items = q.data.items.filter((a) => a.status !== 'revoked' && a.pin);
  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <div className="no-print mb-5 flex items-center justify-between gap-3">
        <Link to="/admin/exam-access" className="inline-flex items-center gap-1 text-[13px] text-neutral-600 hover:text-neutral-900"><ArrowLeft className="size-3.5" aria-hidden />Back to exam access</Link>
        <div className="flex items-center gap-3"><span className="text-[13px] text-neutral-600">{items.length} PIN {items.length === 1 ? 'card' : 'cards'}</span>
          <Button variant="primary" onClick={() => window.print()}><Printer className="size-4" aria-hidden />Print</Button></div>
      </div>
      {items.length === 0 ? <p className="text-sm text-neutral-500">There are no active PINs to print.</p> : (
        <div className="grid gap-4 sm:grid-cols-2 print:grid-cols-2">
          {items.map((a) => (
            <section key={a.id} className="break-inside-avoid rounded-md border border-neutral-300 bg-white p-5 text-center">
              <p className="text-xs text-neutral-500">Alaa's Academy</p>
              <h2 className="mt-1 text-base font-semibold text-neutral-900">{a.exam.title}</h2>
              <p className="text-sm text-neutral-700">{a.student.name}</p>
              <p className="mt-4 text-xs text-neutral-500">Your exam PIN</p>
              <p className="font-mono text-3xl font-semibold tracking-[0.25em] text-neutral-900">{a.pin}</p>
              <p className="mt-4 text-xs text-neutral-700">Sign in to your account, choose <strong>Enter exam PIN</strong> and type this PIN.</p>
              <p className="mt-1 text-[11px] text-neutral-500">{a.expiresAt ? `Valid until ${formatDateTime(a.expiresAt)}. ` : ''}Personal to you. Do not share it.</p>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
