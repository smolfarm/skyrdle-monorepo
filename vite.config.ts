import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Allow non-VITE_ env vars (e.g., ATPROTO_CLIENT_ID) to be exposed to the client.
  envPrefix: ['VITE_', 'ATPROTO_CLIENT_'],
  server: {
    port: 3000,
    allowedHosts: ['atproto-monorepo.onrender.com', 'skyrdle.com'],
    proxy: {
      // Proxy AT Protocol XRPC requests to avoid CORS
      '/xrpc': {
        target: 'https://bsky.social',
        changeOrigin: true,
        secure: true,
        rewrite: path => path.replace(/^\/xrpc/, '/xrpc'),
      },
      // Proxy local game API
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
        rewrite: path => path.replace(/^\/api/, '/api'),
      },
      // Serve OAuth client metadata from backend (avoids dev server 404/HTML)
      '/.well-known': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  base: './',
});
