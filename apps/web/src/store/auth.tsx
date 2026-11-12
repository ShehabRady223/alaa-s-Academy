import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo } from 'react';
import { api, ApiError, setUnauthorizedHandler } from '@/api/client';
import type { Role, User } from '@/api/types';

interface AuthValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  setUser: (u: User) => void;
}
const Ctx = createContext<AuthValue | null>(null);
export const homeFor = (role: Role) => (role === 'admin' ? '/admin' : '/me');

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const me = useQuery({
    queryKey: ['me'],
    staleTime: Infinity,
    retry: false,
    queryFn: async () => {
      try { return (await api.get<{ user: User }>('/auth/me')).data.user; }
      catch (e) { if (e instanceof ApiError && (e.status === 401 || e.status === 403)) return null; throw e; }
    },
  });

  /**
   * Forget everything cached for the previous account WITHOUT touching the session query.
   * qc.clear() would delete the ['me'] query object that this provider is subscribed to; the following setQueryData would
   * then create a different, unobserved query, so `user` would never change and login/logout would not navigate anywhere.
   */
  const resetUserData = useCallback(() => qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' }), [qc]);

  // The session really ended (refresh failed): back to the login screen.
  useEffect(() => setUnauthorizedHandler(() => { resetUserData(); qc.setQueryData(['me'], null); }), [qc, resetUserData]);

  const setUser = useCallback((u: User) => qc.setQueryData(['me'], u), [qc]);
  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<{ user: User }>('/auth/login', { email, password });
    resetUserData(); setUser(data.user);
    return data.user;
  }, [resetUserData, setUser]);
  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } finally { resetUserData(); qc.setQueryData(['me'], null); }
  }, [qc, resetUserData]);

  const value = useMemo<AuthValue>(() => ({ user: me.data ?? null, loading: me.isPending, login, logout, setUser }), [me.data, me.isPending, login, logout, setUser]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
