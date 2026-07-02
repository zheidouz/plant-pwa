import { test, expect } from "@playwright/test";
import { seedAppState } from "./helpers/seed";
import type { AppState } from "../src/domain/types";

/**
 * E2E #2: mark-done-clears-banner.
 *
 * Seeds an `AppState` with a single plant that's 8 days overdue on
 * water (cadence: 7 days) → it should render the DyingBanner. We tap
 * the dying plant to navigate to its detail page, mark water done,
 * come back to Today, and assert the banner is gone.
 */

const NOW_MS = Date.parse("2026-07-02T09:00:00.000Z");

function isoDaysAgo(days: number): string {
  return new Date(NOW_MS - days * 24 * 60 * 60 * 1000).toISOString();
}

const seedState: AppState = {
  schemaVersion: 1,
  plants: [
    {
      id: "plant-dying",
      commonName: "Thirsty Fern",
      scientificName: "Nephrolepis exaltata",
      // 1x1 green JPEG so the photoDataUrl parses as a real image.
      photoDataUrl:
        "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAEAAQADASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwBVAAH/2Q==",
      identificationSource: "manual",
      locale: "en-US",
      createdAt: isoDaysAgo(30),
      rules: [
        { careType: "water", cadenceDays: 7, enabled: true },
        { careType: "fertilize", cadenceDays: 30, enabled: true },
        { careType: "mist", cadenceDays: 3, enabled: false },
      ],
      // Last water completion was 8 days ago → 1 day overdue (>7 day threshold).
      completionLog: [{ careType: "water", completedAt: isoDaysAgo(8) }],
    },
  ],
};

test.describe("mark-done-clears-banner", () => {
  test("dying banner shows, mark water done, banner disappears", async ({
    page,
  }) => {
    // Mock Date.now? Playwright supports `page.clock` only on
    // Chromium 117+ — but we don't strictly need it because `useAppState`
    // computes `now` from `new Date()` once per render and the relative
    // day labels work fine for "8 days ago" regardless of wall clock.

    await seedAppState(page, seedState);
    await page.goto("/#/today");

    // 1. DyingBanner is visible with the seeded plant name.
    await expect(page.getByTestId("dying-banner")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByTestId("dying-plant-dying")).toContainText(
      "Thirsty Fern",
    );

    // 2. Tap the dying plant → /#/plant/:id.
    await page.getByTestId("dying-plant-dying").click();
    await page.waitForURL(/#\/plant\/plant-dying/);
    await expect(page.getByTestId("plant-name")).toContainText("Thirsty Fern");

    // 3. Tap "Mark as done" for water.
    await page.getByTestId("mark-done-water").click();

    // 4. Navigate back to Today.
    await page.goto("/#/today");

    // 5. DyingBanner is gone.
    await expect(page.getByTestId("dying-banner")).not.toBeVisible();
    // The Today section still shows the plant (it just isn't "dying"
    // anymore because water was logged moments ago).
    await expect(page.getByTestId("my-plants-pill")).toContainText(
      "My Plants (1)",
    );
  });
});