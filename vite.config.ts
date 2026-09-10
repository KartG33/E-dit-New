import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const repository = fileURLToPath(new URL('.', import.meta.url));
export default defineConfig(({ mode, command }) => {
  const android = mode.startsWith('android');
  const platform = android ? 'android' : 'desktop';
  const preview = mode.endsWith('-preview');
  return {
    root: path.join(repository, 'apps', platform),
    publicDir: path.join(repository, 'public'),
    clearScreen: false,
    define: mode === 'test' ? {} : { __APP_PREVIEW__: JSON.stringify(command === 'serve' || preview) },
    plugins: [react(), tailwindcss()],
    resolve: { alias: {
      '@core': path.join(repository, 'packages/core'),
      '@app': path.join(repository, 'apps', platform, 'src'),
    } },
    build: {
      outDir: path.join(repository, 'dist', platform + (preview ? '-preview' : '')),
      emptyOutDir: true,
      target: 'es2022',
    },
    server: {
      port: android ? 5174 : 5173, strictPort: true,
      watch: { ignored: ['**/src-tauri/**', '**/android/app/**', '**/android/build/**', '**/android/.gradle/**'] },
    },
    test: {
      root: repository,
      include: ['tests/**/*.test.{ts,tsx}'],
      environment: 'jsdom',
      setupFiles: [path.join(repository, 'tests/setup.ts')],
    },
  };
});
