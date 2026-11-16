import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  publicDir: 'assets',
  build: { outDir: 'dist', assetsInlineLimit: 0 },
  test: { globals: true, environment: 'node' },
} as any);
