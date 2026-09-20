import { defineConfig } from '@playwright/test';

// Tests run against the production build, not the dev server,
// so they check exactly what gets deployed.
export default defineConfig({
  testDir: 'tests',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4321',
    // Optional: PW_CHANNEL=chrome uses an installed Chrome instead of downloading Chromium.
    channel: process.env.PW_CHANNEL,
  },
  webServer: {
    command: 'npm run build && npx astro preview --ignore-lock',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
