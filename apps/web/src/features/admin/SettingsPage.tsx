import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { api, ApiError } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, PageHeader } from '@/components/ui/Card';
import { Field, Input } from '@/components/ui/Field';
import { Alert, Skeleton } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { useSaveSettings, useSettings } from '@/features/insights/api';

const sSchema = z.object({
  academyName: z.string().trim().min(1, 'Enter a name').max(120), contactEmail: z.string().trim().email('Enter a valid email').or(z.literal('')),
  defaultPassingScore: z.number({ invalid_type_error: 'Enter a number' }).min(0).max(100), defaultMaxAttempts: z.number({ invalid_type_error: 'Enter a number' }).int().min(1).max(10),
});
const pSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password'),
  newPassword: z.string().min(8, 'At least 8 characters').regex(/[A-Za-z]/, 'Needs a letter').regex(/\d/, 'Needs a number'), confirm: z.string(),
}).refine((v) => v.newPassword === v.confirm, { path: ['confirm'], message: 'Passwords do not match' });

export function SettingsPage() {
  const toast = useToast(); const q = useSettings(); const save = useSaveSettings();
  const s = useForm<z.infer<typeof sSchema>>({ resolver: zodResolver(sSchema) });
  useEffect(() => { if (q.data) s.reset({ academyName: q.data.academyName, contactEmail: q.data.contactEmail ?? '', defaultPassingScore: q.data.defaultPassingScore, defaultMaxAttempts: q.data.defaultMaxAttempts }); }, [q.data, s]);
  const p = useForm<z.infer<typeof pSchema>>({ resolver: zodResolver(pSchema), defaultValues: { currentPassword: '', newPassword: '', confirm: '' } });
  const [pwError, setPwError] = useState<string | null>(null);
  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid max-w-3xl gap-5">
        <Card><CardHeader title="Academy" description="Used on reports and as defaults for new exams." />
          {q.isPending ? <div className="p-4"><Skeleton className="h-32 w-full" /></div> :
            <form className="space-y-4 p-4" noValidate onSubmit={s.handleSubmit((v) => save.mutate(v, { onSuccess: () => { toast.success('Settings saved'); s.reset(v); }, onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Something went wrong.') }))}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Academy name" error={s.formState.errors.academyName?.message}><Input invalid={!!s.formState.errors.academyName} {...s.register('academyName')} /></Field>
                <Field label="Contact email" error={s.formState.errors.contactEmail?.message}><Input type="email" invalid={!!s.formState.errors.contactEmail} {...s.register('contactEmail')} /></Field>
                <Field label="Default passing score (%)" error={s.formState.errors.defaultPassingScore?.message}><Input type="number" {...s.register('defaultPassingScore', { valueAsNumber: true })} /></Field>
                <Field label="Default attempts allowed" error={s.formState.errors.defaultMaxAttempts?.message}><Input type="number" {...s.register('defaultMaxAttempts', { valueAsNumber: true })} /></Field>
              </div>
              <div className="flex justify-end"><Button type="submit" variant="primary" disabled={!s.formState.isDirty} loading={save.isPending}>Save settings</Button></div>
            </form>}</Card>
        <Card><CardHeader title="Change password" />
          <form className="space-y-4 p-4" noValidate onSubmit={p.handleSubmit(async (v) => {
            setPwError(null);
            try { await api.post('/auth/change-password', { currentPassword: v.currentPassword, newPassword: v.newPassword }); toast.success('Password changed'); p.reset(); }
            catch (e) { setPwError(e instanceof ApiError ? e.message : 'Something went wrong.'); }
          })}>
            {pwError && <Alert>{pwError}</Alert>}
            <Field label="Current password" error={p.formState.errors.currentPassword?.message}><Input type="password" autoComplete="current-password" {...p.register('currentPassword')} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="New password" hint="8+ characters with a letter and a number" error={p.formState.errors.newPassword?.message}><Input type="password" autoComplete="new-password" {...p.register('newPassword')} /></Field>
              <Field label="Confirm new password" error={p.formState.errors.confirm?.message}><Input type="password" autoComplete="new-password" {...p.register('confirm')} /></Field></div>
            <div className="flex justify-end"><Button type="submit" variant="primary" loading={p.formState.isSubmitting}>Change password</Button></div>
          </form></Card>
      </div>
    </>
  );
}
