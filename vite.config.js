import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      // Proxy semua request /api/* ke backend server
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        // Khusus SSE, matikan buffering
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            if (proxyRes.headers['content-type']?.includes('text/event-stream')) {
              // Pastikan SSE tidak di-buffer
              proxyRes.headers['X-Accel-Buffering'] = 'no';
              proxyRes.headers['Cache-Control'] = 'no-cache';
            }
          });
        },
      },
    },
  },
});
