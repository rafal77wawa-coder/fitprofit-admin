import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Panel dev-server proxuje /api do backendu (port 4000).
export default defineConfig({
  plugins: [react()],
  server: { port: 5174, proxy: { '/api': 'http://localhost:4000' } },
});
