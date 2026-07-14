import { test, expect } from "@playwright/test";

/**
 * E2E #4: offline shell.
 *
 * With a clean network state we navigate to Today (proves the app
 * shell loads fine), then flip the context into offline mode and
 * reload — the app's `navigator.onLine` listener should swap the
 * screen for `<NoNetwork />` (the empty-state component rendered
 * when offline). Restoring the network restores Today.
 */

test.describe("offline-shell", () => {
  test("no-network state appears when context.setOffline(true)", async ({
    context,
    page,
  }) => {
    // Online baseline.
    await page.goto("/#/today");
    await expect(page.getByRole("heading", { name: /^today$/i })).toBeVisible(
      { timeout: 10_000 },
    );
    await expect(
      page.getByText(/you're offline|no network/i),
    ).not.toBeVisible();

    // Go offline and reload — `navigator.onLine` should now report
    // `false` and the Today screen's online-gate kicks in.
    await context.setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded" });

    // The NoNetwork copy is rendered (matches what we saw in
    // `src/components/NoNetwork.tsx`).
    await expect(page.getByText(/no network/i)).toBeVisible({
      timeout: 10_000,
    });

    // Restore online + reload — Today comes back.
    await context.setOffline(false);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /^today$/i })).toBeVisible();
  });
});