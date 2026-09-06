import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Chazarat Hashas',
        short_name: 'Chazarat Hashas',
        description: "Track your daily Talmud and Mishnah review across all of Shas.",
        theme_color: '#16233f',
        background_color: '#f5f0e4',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        runtimeCaching: [
          {
            // Mishnah text never changes, so once fetched it's a safe
            // offline fallback — try the network first (so a connected
            // user always sees the canonical response), fall back to
            // whatever was cached on a previous visit when offline.
            urlPattern: /^https:\/\/www\.sefaria\.org\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'sefaria-api-cache',
              networkTimeoutSeconds: 4,
              expiration: {
                maxEntries: 5000,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
