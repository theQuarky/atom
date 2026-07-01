import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: 'docs/index.html'
    }
  },
  server: {
    port: 5173,
    open: '/docs/'
  }
});
