import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/screenshots',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    viewport: { width: 480, height: 854 }, // Explicitly set viewport to match game
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium'
        // Do not use devices['Desktop Chrome'] as per AGENTS.md, it overrides viewport
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
