import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: '.',
  testMatch: ['tests/**/*.spec.ts', 'smoke/**/*.spec.ts'],
  globalSetup: path.join(__dirname, 'global-setup.ts'),
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer:
    process.env.E2E_SKIP_WEBSERVER === '1' || process.env.E2E_SKIP_WEBSERVER === 'true'
      ? undefined
      : {
        command: 'npm run dev',
        cwd: path.join(__dirname, '../nutrican-fe'),
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
