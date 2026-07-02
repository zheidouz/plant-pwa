import type { Page, Route } from "@playwright/test";

/**
 * Pl@ntNet-via-Firebase-Function mock.
 *
 * The client calls `POST /api/identifyPlant` (or
 * `${VITE_FIREBASE_FUNCTIONS_URL}/identifyPlant`); we intercept every
 * matching request and return a scripted JSON payload so tests don't
 * depend on the external PlantNet quota.
 */
export async function mockPlantnet(
  page: Page,
  opts: {
    commonName?: string;
    scientificName?: string;
    confidence?: number;
    delayMs?: number;
  } = {},
): Promise<void> {
  const common = opts.commonName ?? "Pothos";
  const sci = opts.scientificName ?? "Epipremnum aureum";
  const conf = opts.confidence ?? 0.92;
  const delay = opts.delayMs ?? 0;

  await page.route("**/identifyPlant", async (route: Route) => {
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        candidates: [
          {
            commonName: common,
            scientificName: sci,
            confidence: conf,
            source: "plantnet",
          },
        ],
        topCandidate: {
          commonName: common,
          scientificName: sci,
          confidence: conf,
          source: "plantnet",
        },
        source: "plantnet",
      }),
    });
  });
}

/**
 * MiMo-via-Firebase-Function mock for `generateSchedule`.
 *
 * Returns the smallest valid `ScheduleGenerateResponse` so the detail
 * page can render without a real LLM call. The rules picked here match
 * the slice #5 test seeds so the Today section has predictable due dates.
 */
export async function mockMimo(
  page: Page,
  opts: {
    careTip?: string;
    water?: number;
    fertilize?: number;
    mist?: number;
    mistEnabled?: boolean;
  } = {},
): Promise<void> {
  await page.route("**/generateSchedule", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        rules: [
          { careType: "water", cadenceDays: opts.water ?? 7, enabled: true },
          {
            careType: "fertilize",
            cadenceDays: opts.fertilize ?? 30,
            enabled: true,
          },
          {
            careType: "mist",
            cadenceDays: opts.mist ?? 3,
            enabled: opts.mistEnabled ?? false,
          },
        ],
        careTip: opts.careTip ?? "Water when the top inch of soil is dry.",
      }),
    });
  });
}