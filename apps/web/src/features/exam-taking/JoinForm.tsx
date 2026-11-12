import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/States';
import { useSingleFlight } from '@/hooks/useSingleFlight';
import type { AccessInfo } from './types';

/** Shows what the student typed as XXXX-XXXX in capitals, ignoring anything that cannot be part of a PIN. */
const format = (v: string) => { const s = v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8); return s.length > 4 ? `${s.slice(0, 4)}-${s.slice(4)}` : s; };

/** "Enter exam PIN": checks the PIN with the server, then opens the exam's start screen. Used on the home page and on /exam/join. */
export function JoinForm({ autoFocus }: { autoFocus?: boolean }) {
  const navigate = useNavigate(); const once = useSingleFlight();
  const [pin, setPin] = useState(''); const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const ready = pin.replace('-', '').length === 8;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return setError('A PIN has 8 characters, for example K7MQ-4X2R.');
    void once(async () => {
      setError(null); setBusy(true);
      try { const { data } = await api.post<AccessInfo>('/exam-access/enter', { pin }); navigate('/exam/start', { state: { pin, info: data } }); }
      catch (err) { setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'); setBusy(false); }
    });
  };
  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      {error && <Alert>{error}</Alert>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <input aria-label="Exam PIN" value={pin} onChange={(e) => { setPin(format(e.target.value)); setError(null); }} autoFocus={autoFocus} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="XXXX-XXXX"
          className="h-11 w-full rounded-md border border-neutral-300 px-3 text-center font-mono text-lg font-semibold tracking-[0.2em] placeholder:font-normal placeholder:tracking-normal focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600 sm:max-w-[240px]" />
        <Button type="submit" variant="primary" className="h-11 sm:px-6" loading={busy} disabled={!ready}>Continue</Button>
      </div>
    </form>
  );
}
