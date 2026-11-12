import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { api, ApiError } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { Alert } from '@/components/ui/States';
import { AuthLayout } from '@/layouts/AuthLayout';

const schema = z.object({ email: z.string().trim().email('Enter a valid email address') });

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try { await api.post('/auth/forgot-password', v); setSent(true); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Something went wrong.'); }
  });

  return (
    <AuthLayout title="Reset your password" subtitle="Enter your email and we'll send you a link to choose a new password." footer={<Link to="/login" className="text-brand-700 hover:underline">Back to sign in</Link>}>
      {sent ? (
        <Alert tone="success">If an account exists for that email, a reset link is on its way. It stays valid for 1 hour.</Alert>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {error && <Alert>{error}</Alert>}
          <Field label="Email" error={errors.email?.message}><Input type="email" autoComplete="email" autoFocus invalid={!!errors.email} {...register('email')} /></Field>
          <Button type="submit" variant="primary" className="w-full" loading={isSubmitting}>Send reset link</Button>
        </form>
      )}
    </AuthLayout>
  );
}
