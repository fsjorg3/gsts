import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// En dev el proxy evita CORS por completo: /api/v1 se sirve desde el mismo
// origen que la página, sea cual sea el host usado para abrirla (localhost o
// una IP de LAN registrada en Keycloak como redirect URI).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true, // escuchar en todas las interfaces, no solo localhost
    port: 5173,
    strictPort: true,
    proxy: {
      '/api/v1': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      // GAF (sistema de Finanzas): repo y backend aparte, puerto distinto. El
      // navegador de ventanilla le manda los datos fiscales directo, con el
      // mismo token de sesión; el proxy evita CORS en dev igual que /api/v1.
      '/api/gaf': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/gaf/, '/api/v1'),
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: false,
    // En la app VITE_API_BASE_URL es relativa (/api/v1) para pasar por el proxy
    // de arriba; el fetch de jsdom no resuelve rutas relativas sin origen, así
    // que en pruebas se le da uno absoluto. No afecta al build.
    env: { VITE_API_BASE_URL: 'http://localhost:3000/api/v1' },
  },
});
