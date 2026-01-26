import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Soul Canvas - 6分間日記',
        short_name: 'Soul Canvas',
        description: 'あなたの魂の色彩を記録する、瞑想的AI日記アプリ',
        theme_color: '#f43f5e',
        icons: [
          {
            src: 'https://cdn-icons-png.flaticon.com/512/5904/5904053.png',
            sizes: '512x512',
            type: 'image/png',
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});
