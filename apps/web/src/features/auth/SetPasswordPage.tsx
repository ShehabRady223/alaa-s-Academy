import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Circle } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { api, ApiError } from '@/api/client';
import type { User } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { Alert } from '@/components/ui/States';
import { AuthLayout } from '@/layouts/AuthLayout';
import { cn } from '@/lib/cn';
import { homeFor, useAuth } from '@/store/auth';

const rules = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'Contains a letter', test: (p: string) => /[A-Za-z]/.test(p) },
  { label: 'Contains a number', test: (p: string) => /\d/.test(p) },
];
const schema = z.object({ password: z.string().refine((p) => rules.every((r) => r.test(p)), 'Password does not meet the requirements').pipe(z.string().max(128)), confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' });
type Values = z.infer<typeof schema>;

/** Used for both the first-time invite link and "forgot password" links. */
export function SetPasswordPage() {
  const token = useSearchParams()[0].get('token');
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { password: '', confirm: '' } });
  const pwd = watch('password');

  if (!token) return <Navigate to="/login" replace />;

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      const { data } = await api.post<{ user: User }>('/auth/set-password', { token, password: v.password });
      setUser(data.user);
      navigate(homeFor(data.user.role), { replace: true });
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.'); }
  });

  return (
    <AuthLayout title="Choose your password" subtitle="You'll use this with your email to sign in from now on." footer={<Link to="/login" className="text-brand-700 hover:underline">Back to sign in</Link>}>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <Field label="New password" error={errors.password?.message}><Input type="password" autoComplete="new-password" autoFocus invalid={!!errors.password} {...register('password')} /></Field>
        <ul className="space-y-1" aria-label="Password requirements">
          {rules.map((r) => {
            const ok = r.test(pwd ?? '');
            return <li key={r.label} className={cn('flex items-center gap-1.5 text-xs', ok ? 'text-green-700' : 'text-neutral-500')}>{ok ? <Check className="size-3.5" aria-hidden /> : <Circle className="size-3.5" aria-hidden />}{r.label}</li>;
          })}
        </ul>
        <Field label="Confirm password" error={errors.confirm?.message}><Input type="password" autoComplete="new-password" invalid={!!errors.confirm} {...register('confirm')} /></Field>
        <Button type="submit" variant="primary" className="w-full" loading={isSubmitting}>Save password and continue</Button>
      </form>
    </AuthLayout>
  );
}
