import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Allows the temporary localtunnel/ngrok-style public URLs used to share
    // a running local demo. Safe for local dev only -- never shipped to prod.
    allowedHosts: ['.loca.lt', '.ngrok-free.app', '.ngrok.io'],
  },
});
