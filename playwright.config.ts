import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e', timeout: 30_000, forbidOnly: !!process.env.CI,
  workers: process.env.CI ? 2 : undefined,
  use: { colorScheme: 'dark', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'line',
  projects: [
    { name: 'desktop', testMatch: '**/*.e2e.ts', testIgnore: ['**/android*.e2e.ts', '**/responsive.e2e.ts'], use: { baseURL: 'http://127.0.0.1:4173' } },
    { name: 'android', testMatch: ['**/android*.e2e.ts', '**/responsive.e2e.ts', '**/platformSeparation.e2e.ts'], use: { baseURL: 'http://127.0.0.1:4174' } },
  ],
  webServer: ['desktop', 'android'].map((platform, i) => ({
    command: `node node_modules/vite/bin/vite.js preview --mode ${platform}-preview --strictPort --host 127.0.0.1 --port ${4173 + i}`,
    url: `http://127.0.0.1:${4173 + i}`, reuseExistingServer: false, timeout: 30_000,
  })),
});
