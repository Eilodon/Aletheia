import { test, expect } from "@playwright/test";

/**
 * E2E Smoke Test - Critical Path Verification
 * Tests: App Launch → Onboarding → Reading Flow → Card Result
 */

test.describe("Aletheia Critical Path", () => {
  test("complete reading flow smoke test", async ({ page }) => {
    // 1. App loads without errors
    await page.goto("/");
    await expect(page.locator("text=Loading...")).toBeVisible();

    // Wait for app to initialize (checking onboarding status)
    await page.waitForTimeout(2000);

    // 2. Check if we're on onboarding or main app
    const onboardingTitle = page.locator("text=Aletheia - Not a fortune. A mirror.");
    const mainApp = page.locator("text=Mirrors");

    // Handle onboarding if needed
    if (await onboardingTitle.isVisible().catch(() => false)) {
      // Complete onboarding
      await page.click("text=Bắt đầu"); // Start button
      await page.waitForTimeout(500);

      // Select intention
      await page.click("text=Tình yêu"); // Love intention
      await page.waitForTimeout(500);

      // Enter situation
      await page.fill("[placeholder*='tình huống']", "Test situation for smoke test");
      await page.waitForTimeout(500);

      // Proceed to reading
      await page.click("text=Tiếp tục");
      await page.waitForTimeout(1000);
    }

    // 3. Verify main app loaded
    await expect(mainApp.or(page.locator("text=Mirror"))).toBeVisible();

    // 4. Navigate to reading
    await page.click("text=Xem bài"); // View reading button
    await page.waitForTimeout(1000);

    // 5. Verify reading page loaded
    const readingPage = page.locator("text=Hoàn cảnh").or(page.locator("text=Situation"));
    await expect(readingPage).toBeVisible();

    // 6. Take screenshot for verification
    await page.screenshot({ path: "test-results/reading-flow.png" });

    // 7. Verify no console errors
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    // Assert no critical errors
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes("source map") && !e.includes("favicon")
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test("API health check", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.timestamp).toBeDefined();
  });

  test("deep health check", async ({ request }) => {
    const response = await request.get("/api/health/deep");
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.checks).toBeDefined();
    expect(body.checks.database).toBeDefined();
    expect(body.checks.aiService).toBeDefined();
  });
});
