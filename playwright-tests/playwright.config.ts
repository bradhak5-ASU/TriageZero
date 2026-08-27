import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 0,
  reporter: [['list']],
  testIgnore: process.env.RUN_CONTROLLED_DEFECTS === 'true' ? undefined : /scenario-probes\.spec\.ts/,
  use: {
    baseURL: process.env.NOVACART_BASE_URL || 'http://localhost:5173',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
