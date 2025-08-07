import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  envDir: '../', // Read .env files from root directory
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared/src'),
    },
  },
  server: {
    host: '0.0.0.0', // Allow external connections (required for Docker)
    port: 3000,
    watch: {
      usePolling: true, // Enable polling for Docker file watching
      interval: 1000,
    },
    proxy: {
      '/api': {
        target: 'http://backend-dev:3001', // Use Docker service name
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://backend-dev:3001', // Use Docker service name
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
