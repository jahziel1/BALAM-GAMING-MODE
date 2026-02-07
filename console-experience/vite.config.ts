/* eslint-disable */
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [
    react(),
    // Bundle analyzer (only in analyze mode)
    // @ts-expect-error process is a nodejs global
    process.env.ANALYZE &&
      (await import('rollup-plugin-visualizer')).visualizer({
        open: true,
        filename: 'dist/stats.html',
        gzipSize: true,
      }),
  ].filter(Boolean),

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ['**/src-tauri/**'],
    },
  },

  // Path aliases
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@domain': path.resolve(__dirname, './src/domain'),
      '@application': path.resolve(__dirname, './src/application'),
      '@infrastructure': path.resolve(__dirname, './src/infrastructure'),
    },
  },

  // Build optimizations
  build: {
    // Code splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom'],
          'tauri-vendor': ['@tauri-apps/api'],
          // UI library chunks
          icons: ['lucide-react'],
        },
      },
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 500, // Warn if chunk > 500KB
    // Minification
    minify: 'esbuild',
    target: 'esnext',
  },

  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', '@tauri-apps/api'],
  },
}));
