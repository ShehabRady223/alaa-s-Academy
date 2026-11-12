import { Check, Copy, Printer } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/States';
import { AccessRow, usePin } from './api';

export function PinDialog({ row, onClose }: { row: AccessRow | null; onClose: () => void }) {
  return <Modal open={!!row} onClose={onClose} title="Exam PIN" size="sm">{row && <Body row={row} />}</Modal>;
}

function Body({ row }: { row: AccessRow }) {
  const navigate = useNavigate();
  const pin = usePin(row.id, true); // fetched fresh every time, so a just-regenerated PIN is never shown stale
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-4">
      <div><p className="text-sm font-medium">{row.student.name}</p><p className="text-[13px] text-neutral-500">{row.exam.title}</p></div>
      <div className="flex flex-col items-center rounded-md border border-neutral-200 bg-neutral-50 px-4 py-6">
        {pin.data ? <code aria-label="PIN" className="font-mono text-3xl font-semibold tracking-[0.25em] text-neutral-900">{pin.data}</code> : <Skeleton className="h-9 w-48" />}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button disabled={!pin.data} onClick={async () => { try { await navigator.clipboard.writeText(pin.data!); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* the PIN is on screen to read out */ } }}>
          {copied ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}{copied ? 'Copied' : 'Copy PIN'}</Button>
        <Button variant="primary" onClick={() => navigate(`/admin/exam-access/print?ids=${row.id}`)}><Printer className="size-4" aria-hidden />Print card</Button>
      </div>
      <p className="text-xs text-neutral-500">{row.student.name.split(' ')[0]} types this PIN after signing in to their own account. It does not work for anyone else, even if they see it.</p>
    </div>
  );
}
