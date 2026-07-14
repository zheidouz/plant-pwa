import { test, expect } from "@playwright/test";
import { mockPlantnet, mockMimo } from "./helpers/mocks";

/**
 * E2E #1: scan → identify → add.
 *
 * Acceptance (issue #10, slice 1):
 *   1. Navigate to Today
 *   2. Mock Pl@ntNet at `page.route`
 *   3. Tap FAB → CaptureModal opens
 *   4. Upload a fixture JPEG via the hidden `<input type="file">`
 *   5. Organ selector appears; tap "Leaf"; tap "Identify plant"
 *   6. Wait for the IdentifyResultModal
 *   7. Tap "Add to My Plants"
 *   8. Assert the plant appears in Today + the MyPlantsPill count bumps
 */

test.describe("scan-and-add", () => {
  test("happy path: FAB → upload → identify → add → appears on Today", async ({
    page,
  }) => {
    // Pre-mock before navigation so route handlers are installed when
    // the SPA boots and makes its first request.
    await mockPlantnet(page, {
      commonName: "Pothos",
      scientificName: "Epipremnum aureum",
      confidence: 0.92,
    });
    await mockMimo(page);

    await page.goto("/#/today");

    // Pill shows zero before scan.
    await expect(page.getByTestId("my-plants-pill")).toContainText(
      "My Plants (0)",
    );

    // Open the CaptureModal via the FAB.
    await page.getByTestId("fab").click();

    // The hidden `<input type="file">` lives in CaptureModal. We grab
    // the visible "Upload from gallery" label which contains the input.
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles("e2e/fixtures/pothos-small.jpg");

    // CaptureModal resolves into the OrganSelector (Today handles the
    // `plant-pwa:capture` event and switches stage → "organ").
    await expect(
      page.getByRole("button", { name: /identify plant/i }),
    ).toBeVisible();

    // Tap "Leaf" chip then "Identify plant".
    await page.getByRole("button", { name: /^🍃 leaf$/i }).click();
    await page.getByTestId("confirm-organ").click();

    // IdentifyResultModal appears with the mocked PlantNet candidate.
    await expect(
      page.getByRole("dialog", { name: /plant identification result/i }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("confidence")).toContainText("92%");

    // Add to My Plants — Today re-renders with a PlantCard.
    await page.getByTestId("confirm-add").click();

    // MyPlantsPill count goes from (0) → (1).
    await expect(page.getByTestId("my-plants-pill")).toContainText(
      "My Plants (1)",
      { timeout: 10_000 },
    );

    // The new plant name appears somewhere on the Today screen.
    await expect(page.getByText("Pothos").first()).toBeVisible();
  });
});