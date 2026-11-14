import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    // Allows the temporary localtunnel/ngrok-style public URLs used to share
    // a running local demo. Safe for local dev only -- never shipped to prod.
    allowedHosts: ['.loca.lt', '.ngrok-free.app', '.ngrok.io'],
  },
});
