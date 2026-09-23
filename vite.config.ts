import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    base: '/LifeDesk/',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['lifedesk-icon.svg', 'lifedesk-pwa-192.png', 'lifedesk-pwa-512.png'],
        manifest: {
          id: '/LifeDesk/',
          name: 'LifeDesk - Student Command Center',
          short_name: 'LifeDesk',
          description: 'Your Life, Organized. Personal student command center.',
          start_url: '/LifeDesk/',
          scope: '/LifeDesk/',
          display: 'standalone',
          orientation: 'portrait-primary',
          theme_color: '#f8f7f4',
          background_color: '#f8f7f4',
          prefer_related_applications: false,
          icons: [
            {
              src: '/LifeDesk/lifedesk-pwa-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable',
            },
            {
              src: '/LifeDesk/lifedesk-pwa-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
          ],
        },
        workbox: {
          navigateFallback: '/LifeDesk/index.html',
          globPatterns: ['**/*.{js,css,html,svg,ico,png,webp}'],
          runtimeCaching: [],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
