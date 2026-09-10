import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: { __APP_PREVIEW__: true },
  resolve: { alias: { '@core': fileURLToPath(new URL('./packages/core', import.meta.url)) } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['benchmarks/**/*.performance.ts'],
    fileParallelism: false,
  },
});
