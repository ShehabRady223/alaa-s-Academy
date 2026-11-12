import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { ApiError } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { Alert } from '@/components/ui/States';
import { AuthLayout } from '@/layouts/AuthLayout';
import { useAuth } from '@/store/auth';

const schema = z.object({ email: z.string().trim().email('Enter a valid email address'), password: z.string().min(1, 'Enter your password') });
type Values = z.infer<typeof schema>;

export function LoginPage() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) });

  // On success the GuestOnly guard redirects to the original destination (or the role's home).
  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try { await login(v.email, v.password); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Could not sign in. Please try again.'); }
  });

  return (
    <AuthLayout title="Sign in" subtitle="Use the email your teacher registered for you." footer={<Link to="/forgot-password" className="text-brand-700 hover:underline">Forgot your password?</Link>}>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <Field label="Email" error={errors.email?.message}><Input type="email" autoComplete="username" autoFocus invalid={!!errors.email} {...register('email')} /></Field>
        <Field label="Password" error={errors.password?.message}><Input type="password" autoComplete="current-password" invalid={!!errors.password} {...register('password')} /></Field>
        <Button type="submit" variant="primary" className="w-full" loading={isSubmitting}>Sign in</Button>
      </form>
    </AuthLayout>
  );
}
