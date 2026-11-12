import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

export interface FieldIssue { path: string; message: string }
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: FieldIssue[]) { super(message); }
}

type Body = { error?: { code?: string; message?: string; details?: FieldIssue[] } };
const toApiError = (err: AxiosError<Body>) => {
  const e = err.response?.data?.error;
  return new ApiError(err.response?.status ?? 0, e?.code ?? (err.response ? 'ERROR' : 'NETWORK'),
    e?.message ?? (err.response ? 'Something went wrong.' : 'Cannot reach the server. Check your connection and try again.'), e?.details);
};

let onSessionEnded: (() => void) | undefined;
/** Called only when the session is really over (refresh failed), never for an ordinary expired access token. */
export const setUnauthorizedHandler = (fn: () => void) => { onSessionEnded = fn; };

// Endpoints where a 401 is a normal answer (wrong password, bad link, anonymous visitor), not an expired session.
const NO_REFRESH = ['/auth/login', '/auth/refresh', '/auth/logout', '/auth/set-password', '/auth/forgot-password'];
const opts = { baseURL: '/api', withCredentials: true, timeout: 20_000 } as const;
export const api = axios.create(opts);
const bare = axios.create(opts); // no interceptors: the refresh call must never trigger a refresh
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Single flight: however many requests hit an expired token at once, only ONE refresh is sent (rotation makes extra ones harmful). */
let refreshing: Promise<void> | null = null;
function refreshSession() {
  refreshing ??= (async () => {
    const attempt = () => bare.post('/auth/refresh').then(() => undefined);
    try { await attempt(); }
    catch (e) {
      const err = toApiError(e as AxiosError<Body>);
      if (err.code !== 'REFRESH_RACE') throw err;
      await sleep(400); // another tab is rotating the cookie right now; retry once with the cookie it sets
      try { await attempt(); } catch (e2) { throw toApiError(e2 as AxiosError<Body>); }
    }
  })().finally(() => { refreshing = null; });
  return refreshing;
}

type Retryable = InternalAxiosRequestConfig & { _retried?: boolean };
api.interceptors.response.use(
  (r) => r,
  async (err: AxiosError<Body>) => {
    const apiErr = toApiError(err);
    const cfg = err.config as Retryable | undefined;
    const quiet = NO_REFRESH.some((p) => cfg?.url?.startsWith(p));
    if (apiErr.status === 401 && cfg && !quiet) {
      if (apiErr.code === 'TOKEN_EXPIRED' && !cfg._retried) {
        cfg._retried = true;
        try { await refreshSession(); return await api(cfg); } // transparent to the caller
        catch (e) {
          if (e instanceof ApiError && e.status === 401) onSessionEnded?.();
          throw e instanceof ApiError && e.status !== 401 ? e : apiErr;
        }
      }
      if (apiErr.code !== 'NO_TOKEN' || cfg.url !== '/auth/me') onSessionEnded?.();
    }
    return Promise.reject(apiErr);
  },
);
