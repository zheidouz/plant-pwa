import { defineConfig } from "vitest/config";

// Minimal Vitest config for the plant-pwa domain module.
//
// Kept as a separate file (NOT a vite.config.ts extension) so it doesn't
// fight `vite-plugin-pwa` — the SW manifest should not be generated or
// verified during unit-test runs.
//
// `jsdom` is used because `storage.ts` touches `globalThis.localStorage`,
// which isn't available in bare Node. We default every test to jsdom so the
// storage tests don't need per-file environment hints.
export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/__tests__/**/*.test.ts"],
    globals: false,
  },
});