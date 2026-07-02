import { describe, it, expect } from "vitest";
import { nextDueLabel, nextDueDays } from "../nextDueLabel";
import type { Plant } from "../../domain";

/**
 * Build a minimal plant shape with a single `water` rule. The completion
 * log is empty so `computeNextDue` bases off `createdAt` — the test
 * controls the relative day distance by setting `createdAt` to the right
 * offset from `NOW`.
 */
function makePlant(createdAtIso: string, cadenceDays = 7): Plant {
  return {
    id: "test-plant",
    commonName: "Test Plant",
    photoDataUrl: "data:image/jpeg;base64,xxx",
    identificationSource: "manual",
    locale: "en-US",
    createdAt: createdAtIso,
    rules: [
      { careType: "water", cadenceDays, enabled: true },
    ],
    completionLog: [],
  };
}

// Anchor "now" — local-clock noon, far from any DST boundary.
const NOW = new Date(2025, 5, 15, 12, 0, 0, 0); // 2025-06-15 12:00 local
const NOON = (y: number, m: number, d: number) =>
  new Date(y, m, d, 12, 0, 0, 0).toISOString();

describe("nextDueLabel", () => {
  it("returns 'today' when next due is the current calendar day", () => {
    // Cadence 7 days, createdAt == NOW → due in 7 days (future).
    // Override: use cadence 0 would be degenerate. Instead test by
    // creating a plant whose createdAt is exactly NOW (cadence 0) — but
    // we need a positive cadence. Use a 1-day cadence with createdAt
    // 1 day ago so the due date is today.
    const plant = makePlant(NOON(2025, 5, 14), 1);
    expect(nextDueLabel(plant, "water", NOW)).toBe("today");
  });

  it("returns 'tomorrow' when next due is +1 calendar day", () => {
    // Created 2 days ago, cadence 3 → due 1 day from now.
    const plant = makePlant(NOON(2025, 5, 13), 3);
    expect(nextDueLabel(plant, "water", NOW)).toBe("tomorrow");
  });

  it("returns 'in N days' for the near future", () => {
    // Created exactly NOW, cadence 3 → due in 3 days.
    const plant = makePlant(NOON(2025, 5, 15), 3);
    expect(nextDueLabel(plant, "water", NOW)).toBe("in 3 days");
    // Created 2 days ago, cadence 5 → due in 3 days.
    const plant2 = makePlant(NOON(2025, 5, 13), 5);
    expect(nextDueLabel(plant2, "water", NOW)).toBe("in 3 days");
  });

  it("returns 'overdue by N days' for past due dates", () => {
    // Created 10 days ago, cadence 7 → due 3 days ago.
    const plant = makePlant(NOON(2025, 5, 5), 7);
    expect(nextDueLabel(plant, "water", NOW)).toBe("overdue by 3 days");
  });

  it("returns 'overdue by 1 day' for a single-day overdue", () => {
    // Created 8 days ago, cadence 7 → due yesterday.
    const plant = makePlant(NOON(2025, 5, 7), 7);
    expect(nextDueLabel(plant, "water", NOW)).toBe("overdue by 1 day");
  });

  it("returns null when the plant has no enabled rule for the care type", () => {
    const plant = makePlant(NOON(2025, 5, 15), 7);
    // No fertilize rule at all → null.
    expect(nextDueLabel(plant, "fertilize", NOW)).toBeNull();
    // Disabled water rule → null.
    const disabled: Plant = {
      ...plant,
      rules: [{ careType: "water", cadenceDays: 7, enabled: false }],
    };
    expect(nextDueLabel(disabled, "water", NOW)).toBeNull();
  });
});

describe("nextDueDays", () => {
  it("returns the signed day distance", () => {
    const plant = makePlant(NOON(2025, 5, 15), 5);
    expect(nextDueDays(plant, "water", NOW)).toBe(5);
  });

  it("returns negative values for overdue", () => {
    const plant = makePlant(NOON(2025, 5, 5), 7);
    expect(nextDueDays(plant, "water", NOW)).toBe(-3);
  });

  it("returns null when no enabled rule", () => {
    const plant = makePlant(NOON(2025, 5, 15), 7);
    expect(nextDueDays(plant, "fertilize", NOW)).toBeNull();
  });
});
