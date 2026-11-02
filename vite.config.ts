import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      proxy: {
        '/api/gstatic-models': {
          target: 'https://www.gstatic.com',
          changeOrigin: true,
          rewrite: (reqPath: string) =>
            reqPath.replace(/^\/api\/gstatic-models/, '/aistudio/starter-apps/desk-racer/models'),
        },
        '/assets/models': {
          target: 'https://www.gstatic.com',
          changeOrigin: true,
          rewrite: (reqPath: string) =>
            reqPath.replace(/^\/assets\/models/, '/aistudio/starter-apps/desk-racer/models'),
        },
        '/deskracer/assets/models': {
          target: 'https://www.gstatic.com',
          changeOrigin: true,
          rewrite: (reqPath: string) =>
            reqPath.replace(/^\/deskracer\/assets\/models/, '/aistudio/starter-apps/desk-racer/models'),
        },
      },
    },
  };
});
