import { ensureReady } from '../serverless';

// Optional: prepare the database (indexes + first teacher) without starting the app. The app also does this by itself on first request.
ensureReady().then(() => { console.log('Database ready.'); process.exit(0); }).catch((e) => { console.error(e); process.exit(1); });
