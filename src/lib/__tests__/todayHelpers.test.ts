import { describe, it, expect } from "vitest";
import { groupByDay, dayKey } from "../groupByDay";
import { relativeDay, dayDelta } from "../relativeDay";

// Anchor "now" with an explicit local-clock date. Construct with
// `new Date(y, m, d, h)` so the test is timezone-agnostic.
const NOW = new Date(2025, 5, 15, 12, 0, 0, 0); // 2025-06-15 12:00 local

function dLocal(y: number, m: number, day: number, h = 12): Date {
  return new Date(y, m, day, h, 0, 0, 0);
}

describe("relativeDay", () => {
  it("returns 'Today' for same calendar day", () => {
    expect(relativeDay(dLocal(2025, 5, 15, 8), NOW)).toBe("Today");
    expect(relativeDay(dLocal(2025, 5, 15, 23), NOW)).toBe("Today");
  });

  it("returns 'Tomorrow' for +1 calendar day", () => {
    expect(relativeDay(dLocal(2025, 5, 16, 8), NOW)).toBe("Tomorrow");
  });

  it("returns 'Yesterday' for -1 calendar day", () => {
    expect(relativeDay(dLocal(2025, 5, 14, 20), NOW)).toBe("Yesterday");
  });

  it("returns 'in N days' for the near future", () => {
    expect(relativeDay(dLocal(2025, 5, 17), NOW)).toBe("in 2 days");
    expect(relativeDay(dLocal(2025, 5, 18), NOW)).toBe("in 3 days");
  });

  it("returns 'N days ago' for the past", () => {
    expect(relativeDay(dLocal(2025, 5, 13), NOW)).toBe("2 days ago");
    expect(relativeDay(dLocal(2025, 5, 12), NOW)).toBe("3 days ago");
  });
});

describe("dayDelta", () => {
  it("ignores time-of-day", () => {
    expect(dayDelta(dLocal(2025, 5, 15, 0), NOW)).toBe(0);
    expect(dayDelta(dLocal(2025, 5, 15, 23), NOW)).toBe(0);
  });

  it("computes signed integer day distance", () => {
    expect(dayDelta(dLocal(2025, 5, 16), NOW)).toBe(1);
    expect(dayDelta(dLocal(2025, 5, 14), NOW)).toBe(-1);
    expect(dayDelta(dLocal(2025, 5, 20), NOW)).toBe(5);
  });
});

describe("groupByDay", () => {
  it("returns an empty map for empty input", () => {
    const out = groupByDay<{ at: Date; id: string }>([], NOW);
    expect(out.size).toBe(0);
  });

  it("groups items by local YYYY-MM-DD bucket", () => {
    const items = [
      { at: dLocal(2025, 5, 15, 1), id: "a" }, // 15th
      { at: dLocal(2025, 5, 15, 22), id: "b" }, // 15th
      { at: dLocal(2025, 5, 16, 3), id: "c" }, // 16th
      { at: dLocal(2025, 5, 16, 23), id: "d" }, // 16th
      { at: dLocal(2025, 5, 17, 9), id: "e" }, // 17th
    ];
    const out = groupByDay(items, NOW);
    expect(out.size).toBe(3);

    const key15 = "2025-06-15";
    const key16 = "2025-06-16";
    const key17 = "2025-06-17";
    expect(out.get(key15)?.length).toBe(2);
    expect(out.get(key16)?.length).toBe(2);
    expect(out.get(key17)?.length).toBe(1);
    expect(out.get(key15)?.map((it) => it.id).sort()).toEqual(["a", "b"]);
  });

  it("dayKey pads single-digit month and day", () => {
    const local = new Date(2025, 0, 5, 12, 0, 0, 0); // 2025-01-05 local
    expect(dayKey(local)).toBe("2025-01-05");
  });
});
