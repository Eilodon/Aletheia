import { test, expect } from "@playwright/test";

/**
 * E2E Smoke Test - Critical Path Verification
 * Tests: App Launch → Onboarding → Reading Flow → Card Result
 */

test.describe("Aletheia Critical Path", () => {
  test("complete reading flow smoke test", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const onboardingAction = page.getByTestId("onboarding-primary-action");
    const homeStartReading = page.getByTestId("home-start-reading");

    if (await onboardingAction.isVisible().catch(() => false)) {
      await onboardingAction.click();
      await page.getByTestId("intent-card-clarity").click();
      await onboardingAction.click();
      await expect(onboardingAction).toContainText("Bắt đầu lần đọc đầu tiên");
      await onboardingAction.click();
    }

    await expect(homeStartReading).toBeVisible();
    await homeStartReading.click();

    await expect(page.getByTestId("reading-situation-title")).toBeVisible();
    await page.getByTestId("reading-situation-input").fill("Đây là tình huống smoke test");
    await page.getByTestId("reading-situation-continue").click();

    await expect(page.getByTestId("reading-wildcard-title")).toBeVisible();
    await page.getByTestId("reading-wildcard-auto").click();

    await expect(page.getByTestId("reading-ritual-title")).toBeVisible();
    await expect(page.getByTestId("reading-passage-card")).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: "test-results/reading-flow.png" });

    const criticalErrors = consoleErrors.filter(
      (e) =>
        !e.includes("source map") &&
        !e.includes("favicon") &&
        !e.includes("Failed to load resource")
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
