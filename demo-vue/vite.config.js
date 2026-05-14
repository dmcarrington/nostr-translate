import { defineConfig } from 'vite';

export default defineConfig({
  base: '/nostr-translate-demo/',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  server: {
    port: 5173
  }
});
