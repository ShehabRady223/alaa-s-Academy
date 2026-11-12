import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { Role } from '@/api/types';
import { FullPageSpinner } from '@/components/ui/States';
import { homeFor, useAuth } from '@/store/auth';

/** Keeps the original destination (e.g. a link someone opened while signed out) so login can return to it. */
export function RequireRole({ role }: { role: Role }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (user.role !== role) return <Navigate to={homeFor(user.role)} replace />;
  return <Outlet />;
}

export function GuestOnly() {
  const { user, loading } = useAuth();
  const from = (useLocation().state as { from?: { pathname: string; search?: string } } | null)?.from;
  if (loading) return <FullPageSpinner />;
  if (user) return <Navigate to={from ? from.pathname + (from.search ?? '') : homeFor(user.role)} replace />;
  return <Outlet />;
}

export function RoleHome() {
  const { user, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  return <Navigate to={user ? homeFor(user.role) : '/login'} replace />;
}
