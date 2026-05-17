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
    baseURL: process.env.TEST_BASE_URL || "http://localhost:18081",
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
  webServer: [
    {
      command:
        "bash -lc 'pnpm exec cross-env ALLOW_PLACEHOLDER_ENV=1 JWT_SECRET=test-secret APP_ID=test-app OAUTH_SERVER_URL=https://placeholder.invalid OWNER_OPEN_ID=test-owner PORT=13000 OLLAMA_BASE_URL=http://127.0.0.1:11434 CORS_ALLOWED_ORIGINS=http://localhost:18081,http://127.0.0.1:18081 tsx server/_core/index.ts'",
      url: "http://127.0.0.1:13000/api/health",
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command:
        "bash -lc 'rm -rf dist && pnpm exec cross-env ALLOW_PLACEHOLDER_ENV=1 CI=1 NATIVEWIND_FORCE_WRITE_FILESYSTEM=0 EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:13000 npx expo export --platform web && python3 -m http.server 18081 -d dist'",
      url: "http://localhost:18081",
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
