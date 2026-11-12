import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  server: {
    port: 5173,
    // Same-origin in dev, so the httpOnly session cookie just works.
    proxy: { '/api': { target: process.env.API_URL ?? 'http://localhost:4000', changeOrigin: true } },
  },
});
