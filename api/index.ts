import type { IncomingMessage, ServerResponse } from 'http';

type Handler = (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;
let loaded: Promise<Handler> | undefined;

/**
 * vercel.json rewrites every /api/* request to this function as /api/index?__p=<original path>. Put the original path back, so the
 * Express routes see /api/auth/login whatever way Vercel presents the URL (and a request that already has the right path is left alone).
 */
export function restoreUrl(req: IncomingMessage) {
  const url = new URL(req.url ?? '/', 'http://local');
  const original = url.searchParams.get('__p');
  if (original === null) return;
  url.searchParams.delete('__p');
  req.url = `/api/${original.replace(/^\/+/, '')}${url.search}`;
}

/** Vercel entry point: every /api/* request is served by the Express app in apps/api. */
async function load(): Promise<Handler> {
  try {
    return (await import('../apps/api/src/serverless')).createHandler();
  } catch (e) {
    console.error('[startup] the API failed to start:', e);
    const missing = (e as { missing?: string[] }).missing; // names only, never values
    return (_req, res) => {
      res.statusCode = 500; res.setHeader('content-type', 'application/json'); res.setHeader('cache-control', 'no-store');
      res.end(JSON.stringify({ error: { code: 'MISCONFIGURED', message: missing
        ? `The server is not configured. Missing or invalid environment variables: ${missing.join(', ')}. Add them in Vercel (Project Settings, Environment Variables) and redeploy.`
        : 'The server failed to start. See the function logs in the Vercel dashboard.' } }));
    };
  }
}

export default function handler(req: IncomingMessage, res: ServerResponse) {
  restoreUrl(req);
  loaded ??= load();
  return loaded.then((h) => h(req, res));
}
