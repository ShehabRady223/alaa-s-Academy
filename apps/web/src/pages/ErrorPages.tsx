import { Link, useRouteError } from 'react-router-dom';
import { AuthLayout } from '@/layouts/AuthLayout';

export function NotFoundPage() {
  return <AuthLayout title="Page not found" subtitle="The page you're looking for doesn't exist or has moved."><Link to="/" className="text-sm font-medium text-brand-700 hover:underline">Go to the home page</Link></AuthLayout>;
}

export function ErrorPage() {
  const err = useRouteError();
  if (import.meta.env.DEV) console.error(err);
  return <AuthLayout title="Something went wrong" subtitle="An unexpected error occurred. Reloading usually fixes it."><button type="button" onClick={() => location.reload()} className="text-sm font-medium text-brand-700 hover:underline">Reload the page</button></AuthLayout>;
}
