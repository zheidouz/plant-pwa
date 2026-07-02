import type { Page } from "@playwright/test";
import { STORAGE_KEY } from "../../src/domain/types";
import type { AppState } from "../../src/domain/types";

/**
 * Inject an `AppState` directly into the app's localStorage so each test
 * boots from a known seed. Use this BEFORE the first navigation so the
 * app's initial `loadAppState()` picks the seed up.
 *
 * Navigates to the origin (about:blank) first so `localStorage` is
 * reachable for the target host.
 */
export async function seedAppState(
  page: Page,
  state: AppState,
  baseURL = "http://localhost:4173",
): Promise<void> {
  // Ensure same-origin localStorage is writable.
  if (!page.url().startsWith(baseURL)) {
    await page.goto(baseURL, { waitUntil: "domcontentloaded" });
  }
  await page.evaluate(
    ([key, value]) => {
      window.localStorage.setItem(key, value);
    },
    [STORAGE_KEY, JSON.stringify(state)] as const,
  );
}