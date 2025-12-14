import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    allowedHosts: ['c70c974a5148.ngrok-free.app'],
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
    },
  },
  base: './',
});
