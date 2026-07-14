import { test, expect } from "@playwright/test";
import { seedAppState } from "./helpers/seed";
import type { AppState } from "../src/domain/types";

/**
 * E2E #3: ICS export contents.
 *
 * Seeds two plants, clicks the ExportIcsButton, intercepts the
 * download, and asserts the .ics body contains the expected VEVENTs
 * (SUMMARY:💧 Water + RRULE:FREQ=DAILY;INTERVAL=7).
 */

const NOW_MS = Date.parse("2026-07-02T09:00:00.000Z");

function isoDaysAgo(days: number): string {
  return new Date(NOW_MS - days * 24 * 60 * 60 * 1000).toISOString();
}

const seedState: AppState = {
  schemaVersion: 1,
  plants: [
    {
      id: "plant-pothos",
      commonName: "Pothos",
      scientificName: "Epipremnum aureum",
      photoDataUrl:
        "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAEAAQADASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwBVAAH/2Q==",
      identificationSource: "plantnet",
      plantnetConfidence: 0.92,
      locale: "en-US",
      createdAt: isoDaysAgo(20),
      rules: [
        { careType: "water", cadenceDays: 7, enabled: true },
        { careType: "fertilize", cadenceDays: 30, enabled: true },
        { careType: "mist", cadenceDays: 3, enabled: false },
      ],
      completionLog: [{ careType: "water", completedAt: isoDaysAgo(2) }],
    },
    {
      id: "plant-calathea",
      commonName: "Calathea",
      scientificName: "Calathea orbifolia",
      photoDataUrl:
        "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAEAAQADASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwBVAAH/2Q==",
      identificationSource: "plantnet",
      plantnetConfidence: 0.88,
      locale: "en-US",
      createdAt: isoDaysAgo(60),
      rules: [
        { careType: "water", cadenceDays: 5, enabled: true },
        { careType: "mist", cadenceDays: 2, enabled: true },
      ],
      completionLog: [{ careType: "water", completedAt: isoDaysAgo(4) }],
    },
  ],
};

test.describe("ics-export", () => {
  test("export button produces a downloadable .ics with expected VEVENTs", async ({
    page,
  }) => {
    await seedAppState(page, seedState);
    await page.goto("/#/today");

    // Wait for the export button to render (only shown when plants exist).
    const exportButton = page.getByTestId("export-ics");
    await expect(exportButton).toBeVisible({ timeout: 10_000 });

    // Trigger the download — ExportIcsButton uses an `<a download>` so
    // Playwright captures the file via `waitForEvent("download")`.
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 10_000 }),
      exportButton.click(),
    ]);

    // Filename assertion.
    expect(download.suggestedFilename()).toBe("plant-care.ics");

    // Read the contents and assert key RFC 5545 markers.
    const path = await download.path();
    expect(path).toBeTruthy();
    const fs = await import("fs/promises");
    const text = await fs.readFile(path as string, "utf8");

    expect(text).toContain("BEGIN:VCALENDAR");
    expect(text).toContain("END:VCALENDAR");
    expect(text).toContain("SUMMARY:💧 Water");
    expect(text).toContain("RRULE:FREQ=DAILY;INTERVAL=7");
    expect(text).toContain("SUMMARY:🌱 Fertilize");
    expect(text).toContain("SUMMARY:🌫️ Mist");
    // Both plant names should appear somewhere in the calendar.
    expect(text).toContain("Pothos");
    expect(text).toContain("Calathea");
  });
});