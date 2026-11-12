// Sends requests the way Vercel's rewrite delivers them (/api/index?__p=...) to the REAL entry file, and also plain paths.
import http from 'http';
import handler from '../../../../api/index';
const server = http.createServer(handler);
server.listen(0, async () => {
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const out: Record<string, number> = {};
  for (const p of ['/api/health', '/api/index?__p=health', '/api/index?__p=auth/me', '/api/auth/me', '/api/index?__p=students&search=x', '/api/index?__p=nope/nothing']) out[p] = (await fetch(base + p)).status;
  console.log(JSON.stringify(out)); server.close(); process.exit(0);
});
