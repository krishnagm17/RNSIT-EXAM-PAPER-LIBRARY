import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: path.resolve(__dirname, 'frontend'),
  publicDir: path.resolve(__dirname, 'public'),
  plugins: [react()],
  resolve: {
    alias: {
      '@app': path.resolve(__dirname, 'frontend'),
      '@components': path.resolve(__dirname, 'components')
    }
  },
  server: {
    port: 5173,
    strictPort: true,
    fs: {
      allow: [
        path.resolve(__dirname, 'frontend'),
        path.resolve(__dirname, 'components')
      ]
    }
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true
  }
});