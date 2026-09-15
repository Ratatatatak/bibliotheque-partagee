import { defineConfig } from 'vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@/': resolve(__dirname, 'src/')
    }
  },
  server: {
    port: 5199,
    strictPort: false,
    proxy: {
      '/api/bgg': {
        target: 'https://boardgamegeek.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/bgg/, ''),
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq) => {
            const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
            proxyReq.setHeader('User-Agent', userAgent);
            proxyReq.setHeader('Accept', 'application/xml, text/xml, */*');
            proxyReq.setHeader('Referer', 'https://boardgamegeek.com/');
            proxyReq.setHeader('Origin', 'https://boardgamegeek.com');
            console.log(`[vite-proxy] Setting headers: UA=${userAgent}`);
          });
        }
      }
    }
  }
})