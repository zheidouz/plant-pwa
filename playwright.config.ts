import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for the plant-pwa e2e harness (issue #10).
 *
 * Drives the production build via `vite preview` so the test surface
 * matches what Firebase Hosting will serve. All network calls to the
 * Firebase Functions are intercepted with `page.route` mocks (see
 * `e2e/helpers/mocks.ts`) so the suite is deterministic and free of
 * PlantNet/MiMo quota dependence.
 */
export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 0 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run preview",
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});