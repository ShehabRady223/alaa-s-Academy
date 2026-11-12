import { useRef, useState } from 'react';
import { ApiError } from '@/api/client';
import { Button } from './Button';
import { Field, Input } from './Field';
import { Modal } from './Modal';
import { Alert } from './States';

interface Props { open: boolean; title: string; label: string; initial?: string; submitLabel: string; onSubmit: (name: string) => Promise<unknown>; onClose: () => void }

export function NameDialog({ open, ...rest }: Props) {
  return <Modal open={open} onClose={rest.onClose} title={rest.title} size="sm"><NameForm {...rest} /></Modal>;
}

function NameForm({ label, initial = '', submitLabel, onSubmit, onClose }: Omit<Props, 'open' | 'title'>) {
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false); const inflight = useRef(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form noValidate className="space-y-4" onSubmit={async (e) => {
      e.preventDefault();
      if (!name.trim()) return setError('Enter a name');
      if (inflight.current) return; inflight.current = true;
      setBusy(true); setError(null);
      try { await onSubmit(name.trim()); onClose(); }
      catch (err) { setError(err instanceof ApiError ? err.message : 'Something went wrong.'); setBusy(false); inflight.current = false; }
    }}>
      {error && <Alert>{error}</Alert>}
      <Field label={label}><Input autoFocus value={name} maxLength={120} onChange={(e) => setName(e.target.value)} /></Field>
      <div className="flex justify-end gap-2"><Button onClick={onClose} disabled={busy}>Cancel</Button><Button type="submit" variant="primary" loading={busy}>{submitLabel}</Button></div>
    </form>
  );
}
