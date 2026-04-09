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
    command:
      "bash -lc 'rm -rf dist && pnpm exec cross-env ALLOW_PLACEHOLDER_ENV=1 CI=1 EXPO_PUBLIC_API_BASE_URL=http://localhost:3000 npx expo export --platform web && python3 -m http.server 8081 -d dist'",
    url: "http://localhost:8081",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
