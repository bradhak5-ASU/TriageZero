import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './safeguards',
  reporter: [['list']],
});
