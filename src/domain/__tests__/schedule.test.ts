/**
 * Unit tests for the schedule + dying-detection math.
 *
 * Every test passes an explicit `now` (from `_helpers/clock.ts`) so the
 * suite is deterministic and clock-independent.
 */

import { describe, expect, it } from "vitest";

import {
  DYING_FERTILIZE_DAYS,
  DYING_NEVER_WATERED_DAYS,
  DYING_WATER_DAYS,
  computeNextDue,
  daysSince,
  isDying,
  latestCompletion,
} from "../schedule";
import type { Plant, ScheduleRule } from "../types";

import { fixedNow, isoDaysAgo } from "./_helpers/clock";

/* ──────────────────────────────  Fixtures  ─────────────────────────────── */

const DEFAULT_RULES: ScheduleRule[] = [
  { careType: "water", cadenceDays: 7, enabled: true },
  { careType: "fertilize", cadenceDays: 30, enabled: true },
  { careType: "mist", cadenceDays: 2, enabled: true },
];

function makePlant(overrides: Partial<Plant> = {}): Plant {
  return {
    id: "test-plant-1",
    commonName: "Test Pothos",
    photoDataUrl: "data:image/jpeg;base64,ZmFrZQ==",
    identificationSource: "manual",
    locale: "en-US",
    createdAt: isoDaysAgo(10),
    rules: DEFAULT_RULES,
    completionLog: [],
    ...overrides,
  };
}

/* ─────────────────────────────  daysSince  ─────────────────────────────── */

describe("daysSince", () => {
  it("returns ~7 when the ISO is exactly 7 days before now", () => {
    expect(daysSince(isoDaysAgo(7), fixedNow())).toBeCloseTo(7, 5);
  });

  it("returns a negative value for a future timestamp", () => {
    const futureIso = new Date(fixedNow().getTime() + 3 * 86_400_000).toISOString();
    expect(daysSince(futureIso, fixedNow())).toBeCloseTo(-3, 5);
  });

  it("returns NaN for a malformed ISO", () => {
    expect(Number.isNaN(daysSince("not-a-date", fixedNow()))).toBe(true);
  });
});

/* ──────────────────────────  latestCompletion  ─────────────────────────── */

describe("latestCompletion", () => {
  it("returns undefined when there are no completions for that care type", () => {
    const plant = makePlant();
    expect(latestCompletion(plant, "water", fixedNow())).toBeUndefined();
  });

  it("returns the most-recent completion when there are multiple", () => {
    const plant = makePlant({
      completionLog: [
        { careType: "water", completedAt: isoDaysAgo(20) },
        { careType: "water", completedAt: isoDaysAgo(5) },
        { careType: "water", completedAt: isoDaysAgo(12) },
        { careType: "fertilize", completedAt: isoDaysAgo(3) }, // different type
      ],
    });
    const latest = latestCompletion(plant, "water", fixedNow());
    expect(latest?.completedAt).toBe(isoDaysAgo(5));
  });

  it("ignores future-dated completions (treats them as never)", () => {
    const futureIso = new Date(fixedNow().getTime() + 86_400_000).toISOString();
    const plant = makePlant({
      completionLog: [{ careType: "water", completedAt: futureIso }],
    });
    expect(latestCompletion(plant, "water", fixedNow())).toBeUndefined();
  });
});

/* ───────────────────────────  computeNextDue  ──────────────────────────── */

describe("computeNextDue", () => {
  it("returns ISO based on createdAt when there are no completions", () => {
    const plant = makePlant({ createdAt: isoDaysAgo(10) });
    const next = computeNextDue(plant, "water", fixedNow());
    expect(next).not.toBeNull();
    // 10 days since creation + 7 day cadence = 17 days ago (still in past,
    // meaning "overdue"). Just verify it's a valid ISO and the math is right.
    const createdMs = new Date(plant.createdAt).getTime();
    expect(new Date(next!).getTime()).toBe(createdMs + 7 * 86_400_000);
  });

  it("returns ISO based on the most-recent completion when one exists", () => {
    const plant = makePlant({
      createdAt: isoDaysAgo(30),
      completionLog: [{ careType: "water", completedAt: isoDaysAgo(3) }],
    });
    const next = computeNextDue(plant, "water", fixedNow());
    expect(next).not.toBeNull();
    // Most recent completion was 3 days ago; cadence is 7 days -> next due in 4 days.
    const expected = fixedNow().getTime() + 4 * 86_400_000;
    expect(new Date(next!).getTime()).toBe(expected);
  });

  it("uses the MOST-recent completion when there are several", () => {
    const plant = makePlant({
      createdAt: isoDaysAgo(60),
      completionLog: [
        { careType: "water", completedAt: isoDaysAgo(15) },
        { careType: "water", completedAt: isoDaysAgo(2) },
        { careType: "water", completedAt: isoDaysAgo(20) },
      ],
    });
    const next = computeNextDue(plant, "water", fixedNow());
    // Most recent = 2 days ago; cadence 7 -> next due in 5 days.
    const expected = fixedNow().getTime() + 5 * 86_400_000;
    expect(new Date(next!).getTime()).toBe(expected);
  });

  it("returns null when the rule is disabled", () => {
    const plant = makePlant({
      rules: [
        { careType: "water", cadenceDays: 7, enabled: false },
        { careType: "fertilize", cadenceDays: 30, enabled: true },
        { careType: "mist", cadenceDays: 2, enabled: true },
      ],
    });
    expect(computeNextDue(plant, "water", fixedNow())).toBeNull();
  });

  it("returns null when the care type has no rule on the plant", () => {
    const plant = makePlant({ rules: [] });
    expect(computeNextDue(plant, "water", fixedNow())).toBeNull();
  });

  it("returns null when cadenceDays is zero or negative", () => {
    const plant = makePlant({
      rules: [{ careType: "water", cadenceDays: 0, enabled: true }],
    });
    expect(computeNextDue(plant, "water", fixedNow())).toBeNull();
  });
});

/* ─────────────────────────────  isDying  ──────────────────────────────── */

describe("isDying", () => {
  // Clause (a) — water overdue
  it("flags clause (a): water enabled, last water > 7 days ago", () => {
    const plant = makePlant({
      completionLog: [{ careType: "water", completedAt: isoDaysAgo(8) }],
    });
    expect(isDying(plant, fixedNow())).toBe(true);
  });

  it("does NOT flag (a) at exactly 7 days (strict inequality)", () => {
    const plant = makePlant({
      completionLog: [{ careType: "water", completedAt: isoDaysAgo(DYING_WATER_DAYS) }],
    });
    expect(isDying(plant, fixedNow())).toBe(false);
  });

  it("does NOT flag (a) when water rule is disabled even if overdue", () => {
    const plant = makePlant({
      rules: [
        { careType: "water", cadenceDays: 7, enabled: false },
        { careType: "fertilize", cadenceDays: 30, enabled: true },
      ],
      completionLog: [{ careType: "water", completedAt: isoDaysAgo(30) }],
    });
    // No (a) (water disabled). No (b) (no fertilize completion, and rule
    // is for "fertilize" not "water" so the never-watered clause doesn't
    // trigger fertilize). (c) doesn't apply — water is disabled.
    expect(isDying(plant, fixedNow())).toBe(false);
  });

  it("does NOT flag (a) when water was completed 1 day ago", () => {
    const plant = makePlant({
      completionLog: [{ careType: "water", completedAt: isoDaysAgo(1) }],
    });
    expect(isDying(plant, fixedNow())).toBe(false);
  });

  // Clause (b) — fertilize overdue
  it("flags clause (b): fertilize enabled, last fertilize > 14 days ago", () => {
    const plant = makePlant({
      completionLog: [{ careType: "fertilize", completedAt: isoDaysAgo(20) }],
    });
    expect(isDying(plant, fixedNow())).toBe(true);
  });

  it("does NOT flag (b) at exactly 14 days", () => {
    const plant = makePlant({
      completionLog: [{ careType: "fertilize", completedAt: isoDaysAgo(DYING_FERTILIZE_DAYS) }],
    });
    expect(isDying(plant, fixedNow())).toBe(false);
  });

  // Clause (c) — never watered + old plant
  it("flags clause (c): water enabled, no completion, createdAt > 14 days ago", () => {
    const plant = makePlant({
      createdAt: isoDaysAgo(20),
      completionLog: [],
    });
    expect(isDying(plant, fixedNow())).toBe(true);
  });

  it("does NOT flag (c) when the plant was created just 1 day ago", () => {
    const plant = makePlant({
      createdAt: isoDaysAgo(1),
      completionLog: [],
    });
    expect(isDying(plant, fixedNow())).toBe(false);
  });

  it("does NOT flag (c) when the plant was created exactly 14 days ago", () => {
    const plant = makePlant({
      createdAt: isoDaysAgo(DYING_NEVER_WATERED_DAYS),
      completionLog: [],
    });
    expect(isDying(plant, fixedNow())).toBe(false);
  });

  // Combined clauses
  it("flags combined: both (a) water overdue AND (b) fertilize overdue", () => {
    const plant = makePlant({
      completionLog: [
        { careType: "water", completedAt: isoDaysAgo(10) },
        { careType: "fertilize", completedAt: isoDaysAgo(20) },
      ],
    });
    expect(isDying(plant, fixedNow())).toBe(true);
  });

  it("flags combined: (a) and (c) overlap is fine — short-circuits on (a)", () => {
    const plant = makePlant({
      createdAt: isoDaysAgo(30),
      completionLog: [{ careType: "water", completedAt: isoDaysAgo(10) }],
    });
    // (a) true: water 10 days ago > 7. (c) is also "true" but we only need one.
    expect(isDying(plant, fixedNow())).toBe(true);
  });

  // Negative / non-dying cases
  it("does not flag a brand-new plant with empty completion log", () => {
    const plant = makePlant({
      createdAt: isoDaysAgo(0),
      completionLog: [],
    });
    expect(isDying(plant, fixedNow())).toBe(false);
  });

  it("does not flag a healthy plant (water + fertilize both recent)", () => {
    const plant = makePlant({
      createdAt: isoDaysAgo(60),
      completionLog: [
        { careType: "water", completedAt: isoDaysAgo(2) },
        { careType: "fertilize", completedAt: isoDaysAgo(5) },
      ],
    });
    expect(isDying(plant, fixedNow())).toBe(false);
  });

  it("does not flag (b) when fertilize rule is disabled even if overdue", () => {
    const plant = makePlant({
      rules: [
        { careType: "water", cadenceDays: 7, enabled: true },
        { careType: "fertilize", cadenceDays: 30, enabled: false },
      ],
      completionLog: [{ careType: "fertilize", completedAt: isoDaysAgo(60) }],
    });
    // Water rule: no completion, createdAt = 10 days ago -> not (c).
    // Fertilize rule disabled -> not (b).
    expect(isDying(plant, fixedNow())).toBe(false);
  });
});