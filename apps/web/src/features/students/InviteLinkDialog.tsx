import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/States';

export interface InviteInfo { link: string; emailed: boolean; name: string; email: string }

export function InviteLinkDialog({ invite, onClose }: { invite: InviteInfo | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!invite) return;
    try { await navigator.clipboard.writeText(invite.link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* user can still select the text */ }
  };
  return (
    <Modal open={!!invite} onClose={onClose} title="Invitation ready" footer={<Button variant="primary" onClick={onClose}>Done</Button>}>
      {invite && (
        <div className="space-y-3">
          {invite.emailed
            ? <Alert tone="success">We emailed {invite.email} a link to choose a password. It is valid for 72 hours.</Alert>
            : <Alert tone="info">Email isn't configured on this server, so nothing was sent. Share this link with {invite.name} yourself. It is valid for 72 hours.</Alert>}
          <div className="flex gap-2">
            <Input readOnly value={invite.link} onFocus={(e) => e.currentTarget.select()} aria-label="Invitation link" />
            <Button onClick={() => void copy()} aria-label="Copy link">{copied ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}{copied ? 'Copied' : 'Copy'}</Button>
          </div>
          <p className="text-xs text-neutral-500">Anyone with this link can set the account's password, so send it only to the student.</p>
        </div>
      )}
    </Modal>
  );
}
