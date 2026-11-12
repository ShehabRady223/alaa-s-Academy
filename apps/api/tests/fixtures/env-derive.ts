import { env } from '../../src/config/env';
console.log(JSON.stringify({ client: env.CLIENT_URL, origins: env.ALLOWED_ORIGINS }));
