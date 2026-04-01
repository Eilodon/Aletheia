import { defineConfig, devices } from "@playwright/test";

/**
 * E2E Smoke Test Configuration
 * Tests critical user flow: app launch → onboarding → reading flow
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // E2E tests should run sequentially
  reporter: "html",
  use: {
    baseURL: process.env.TEST_BASE_URL || "http://localhost:8081",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:8081",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
