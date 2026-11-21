import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.OCTOPUS_E2E_PORT ?? 5174);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  workers: process.env.CI ? 2 : 4,
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    {
      command: `pnpm --filter @octopus/web exec vite build --outDir node_modules/.cache/e2e-offline && pnpm preview --outDir node_modules/.cache/e2e-offline --port ${port}`,
      env: { VITE_APPWRITE_ENDPOINT: '', VITE_APPWRITE_PROJECT_ID: '' },
      url: baseURL,
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: `pnpm dev --port ${port + 1} --strictPort`,
      url: `http://127.0.0.1:${port + 1}`,
      env: {
        VITE_APPWRITE_ENDPOINT: `http://127.0.0.1:${port + 1}/v1`,
        VITE_APPWRITE_PROJECT_ID: 'e2e',
      },
      reuseExistingServer: false,
    },
  ],
});
