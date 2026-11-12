// Runs the REAL Vercel entry file in a fresh process and reports what a request to it returns.
import http from 'http';
import handler from '../../../../api/index';
const server = http.createServer(handler);
server.listen(0, async () => {
  const port = (server.address() as { port: number }).port;
  const r = await fetch(`http://127.0.0.1:${port}/api/health`);
  console.log(JSON.stringify({ status: r.status, body: await r.json() }));
  server.close(); process.exit(0);
});
