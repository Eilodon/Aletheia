import { test, expect } from "@playwright/test";

/**
 * E2E Smoke Test - Critical Path Verification
 * Tests: App Launch → Onboarding → Reading Flow → AI Interpretation
 */

test.describe("Aletheia Critical Path", () => {
  test("complete reading flow smoke test", async ({ page }) => {
    test.setTimeout(180_000);

    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (msg) => {
      const text = msg.text();
      if (msg.type() === "error") {
        consoleErrors.push(text);
      }
    });
    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
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
    await page.waitForTimeout(7000);
    const requestAiButton = page.getByTestId("reading-passage-request-ai");
    await expect(requestAiButton).toBeVisible();
    await expect(requestAiButton).toBeEnabled({ timeout: 15000 });
    const interpretationRequest = page.waitForRequest((request) =>
      request.url().includes("/api/interpret/stream") && request.method() === "POST",
    );
    const interpretationResponse = page.waitForResponse((response) =>
      response.url().includes("/api/interpret/stream") && response.request().method() === "POST",
    );

    await requestAiButton.click({ force: true });

    await interpretationRequest;
    const aiResponseStream = await interpretationResponse;
    expect(aiResponseStream.ok()).toBe(true);
    await expect(page.getByTestId("reading-passage-ai-card")).toBeVisible({ timeout: 120000 });

    const aiLabel = page.getByTestId("reading-passage-ai-label");
    await expect(aiLabel).toHaveText(/DIỄN GIẢI/);

    const aiBody = page.getByTestId("reading-passage-ai-body");
    await expect(aiBody).not.toHaveText("");
    await expect
      .poll(async () => ((await aiBody.textContent())?.trim() ?? "").length, {
        timeout: 120000,
      })
      .toBeGreaterThan(40);
    await expect
      .poll(async () => ((await aiBody.textContent())?.trim() ?? "").includes("?"), {
        timeout: 120000,
      })
      .toBe(true);
    const finalAiText = (await aiBody.textContent())?.trim() ?? "";
    expect(finalAiText.length).toBeGreaterThan(40);
    expect(finalAiText.includes("?")).toBe(true);

    await page.screenshot({ path: "test-results/reading-flow.png" });

    const criticalErrors = consoleErrors.filter(
      (e) =>
        !e.includes("source map") &&
        !e.includes("favicon") &&
        !e.includes("Failed to load resource")
    );
    expect(criticalErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });
});
