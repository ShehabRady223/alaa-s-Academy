import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/States';
import { useSingleFlight } from '@/hooks/useSingleFlight';
import { applyServerErrors } from '@/lib/forms';
import { InviteResult, StudentInput, StudentRow, useCreateStudent, useUpdateStudent } from './api';

const schema = z.object({
  name: z.string().trim().min(2, 'Enter the full name').max(120),
  email: z.string().trim().email('Enter a valid email address'),
  phone: z.string().trim().max(30, 'Too long'),
  level: z.string().trim().max(60, 'Too long'),
  dateOfBirth: z.string(),
  notes: z.string().max(2000, 'Too long'),
});
type Values = z.infer<typeof schema>;
const FIELDS = ['name', 'email', 'phone', 'level', 'dateOfBirth', 'notes'];

/** Empty optional fields are omitted: the API treats "" as invalid for dates. */
const clean = (v: Values): StudentInput => ({
  name: v.name, email: v.email,
  ...(v.phone && { phone: v.phone }), ...(v.level && { level: v.level }),
  ...(v.dateOfBirth && { dateOfBirth: v.dateOfBirth }), ...(v.notes && { notes: v.notes }),
});

interface Props { open: boolean; student: StudentRow | null; onClose: () => void; onCreated: (r: InviteResult, name: string, email: string) => void; onSaved: () => void }

export function StudentFormModal({ open, student, onClose, onCreated, onSaved }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={student ? 'Edit student' : 'Add student'}>
      <StudentForm key={student?.id ?? 'new'} student={student} onClose={onClose} onCreated={onCreated} onSaved={onSaved} />
    </Modal>
  );
}

function StudentForm({ student, onClose, onCreated, onSaved }: Omit<Props, 'open'>) {
  const create = useCreateStudent();
  const update = useUpdateStudent();
  const [error, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: student?.name ?? '', email: student?.email ?? '', phone: student?.profile.phone ?? '', level: student?.profile.level ?? '',
      dateOfBirth: student?.profile.dateOfBirth?.slice(0, 10) ?? '', notes: student?.profile.notes ?? '',
    },
  });

  const once = useSingleFlight();
  const onSubmit = handleSubmit((v) => once(async () => {
    setFormError(null);
    try {
      if (student) { await update.mutateAsync({ id: student.id, ...clean(v) }); onSaved(); }
      else { const r = await create.mutateAsync(clean(v)); onCreated({ inviteLink: r.inviteLink, emailed: r.emailed }, v.name, v.email); }
    } catch (e) { setFormError(applyServerErrors(e, setError, FIELDS)); }
  }));

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {error && <Alert>{error}</Alert>}
      {!student && <Alert tone="info">The student gets an email with a link to choose their own password. You never see or set it.</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" error={errors.name?.message} className="sm:col-span-2"><Input autoFocus invalid={!!errors.name} {...register('name')} /></Field>
        <Field label="Email" error={errors.email?.message} className="sm:col-span-2"><Input type="email" invalid={!!errors.email} {...register('email')} /></Field>
        <Field label="Phone" error={errors.phone?.message}><Input type="tel" invalid={!!errors.phone} {...register('phone')} /></Field>
        <Field label="Level" error={errors.level?.message} hint="e.g. Level 2"><Input invalid={!!errors.level} {...register('level')} /></Field>
        <Field label="Date of birth" error={errors.dateOfBirth?.message}><Input type="date" {...register('dateOfBirth')} /></Field>
        <Field label="Notes" error={errors.notes?.message} className="sm:col-span-2" hint="Only visible to teachers."><Textarea rows={3} invalid={!!errors.notes} {...register('notes')} /></Field>
      </div>
      <div className="sticky -bottom-4 -mx-5 -mb-4 flex justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-5 py-3">
        <Button onClick={onClose} disabled={isSubmitting}>Cancel</Button>
        <Button type="submit" variant="primary" loading={isSubmitting}>{student ? 'Save changes' : 'Add student'}</Button>
      </div>
    </form>
  );
}
