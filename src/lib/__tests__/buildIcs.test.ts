/**
 * Unit tests for `buildIcs` — pure RFC 5545 generator.
 *
 * The clock is always a fixed `now` so cadence math is deterministic.
 */
import { describe, expect, it } from "vitest";
import type { AppState, Plant, ScheduleRule } from "../../domain";
import { buildIcs, CARE_LABELS, ICS_WINDOW_DAYS } from "../buildIcs";

/** Fixed clock: 2026-01-15T12:00:00Z. */
const NOW = new Date("2026-01-15T12:00:00.000Z");
/** 30 days from now in ISO form, for boundary checks. */
const WINDOW_END_ISO = new Date(NOW.getTime() + ICS_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

/** Build a Plant with optional rule overrides. */
function makePlant(overrides: Partial<Plant> & { rules?: ScheduleRule[] }): Plant {
  return {
    id: overrides.id ?? "p-1",
    commonName: overrides.commonName ?? "Pothos",
    scientificName: "Epipremnum aureum",
    photoDataUrl: "data:image/jpeg;base64,AAA",
    identificationSource: "manual",
    locale: "en-US",
    createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z",
    rules: overrides.rules ?? [],
    completionLog: overrides.completionLog ?? [],
    careTip: overrides.careTip ?? "Water when top inch of soil is dry.",
    ...overrides,
  } as Plant;
}

describe("buildIcs", () => {
  it("empty state → valid VCALENDAR shell with no VEVENTs", () => {
    const state: AppState = { schemaVersion: 1, plants: [] };
    const out = buildIcs(state, NOW);

    expect(out.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(out.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(out).toContain("VERSION:2.0");
    expect(out).toContain("PRODID:-//plant-pwa//EN");
    expect(out).toContain("CALSCALE:GREGORIAN");
    expect(out).not.toContain("BEGIN:VEVENT");
    expect(out).not.toContain("END:VEVENT");
  });

  it("single plant, one enabled water rule → one VEVENT with right SUMMARY", () => {
    const plant = makePlant({
      rules: [{ careType: "water", cadenceDays: 7, enabled: true }],
    });
    const out = buildIcs({ schemaVersion: 1, plants: [plant] }, NOW);

    // Exactly one VEVENT.
    const beginCount = (out.match(/BEGIN:VEVENT/g) ?? []).length;
    expect(beginCount).toBe(1);

    // Required fields are present.
    expect(out).toMatch(/UID:plant-pwa-p-1-water@plant-pwa\.local/);
    expect(out).toMatch(/DTSTAMP:\d{8}T\d{6}Z/);
    expect(out).toMatch(/DTSTART;VALUE=DATE:\d{8}/);
    expect(out).toMatch(/DTEND;VALUE=DATE:\d{8}/);
    expect(out).toMatch(/RRULE:FREQ=DAILY;INTERVAL=7/);
    expect(out).toMatch(/SUMMARY:💧 Water Pothos/u);
    expect(out).toMatch(/DESCRIPTION:Water when top inch of soil is dry\./);
  });

  it("DTSTART lands within the next 30 days", () => {
    const plant = makePlant({
      rules: [{ careType: "fertilize", cadenceDays: 14, enabled: true }],
    });
    const out = buildIcs({ schemaVersion: 1, plants: [plant] }, NOW);

    // DTSTART is 2026-01-15 (today) — cadence base is 2026-01-01, +14 days.
    expect(out).toMatch(/DTSTART;VALUE=DATE:20260115/);
    // DTEND is exclusive next day.
    expect(out).toMatch(/DTEND;VALUE=DATE:20260116/);
  });

  it("disabled rule is excluded — no VEVENT for that care type", () => {
    const plant = makePlant({
      rules: [
        { careType: "water", cadenceDays: 7, enabled: true },
        { careType: "mist", cadenceDays: 3, enabled: false },
      ],
    });
    const out = buildIcs({ schemaVersion: 1, plants: [plant] }, NOW);

    expect(out).toMatch(/SUMMARY:💧 Water Pothos/u);
    // No VEVENT references the mist UID.
    expect(out).not.toContain("UID:plant-pwa-p-1-mist@plant-pwa.local");
    expect(out).not.toContain("SUMMARY:💨 Mist");
    // And no mist RRULE.
    expect(out).not.toMatch(/RRULE:FREQ=DAILY;INTERVAL=3/);
  });

  it("past-due plant → DTSTART is today (anchored to now), not in the past", () => {
    // Created 60 days ago, water cadence 7 → 53 days overdue.
    const sixtyDaysAgo = new Date(NOW.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const plant = makePlant({
      createdAt: sixtyDaysAgo,
      rules: [{ careType: "water", cadenceDays: 7, enabled: true }],
    });
    const out = buildIcs({ schemaVersion: 1, plants: [plant] }, NOW);

    expect(out).toMatch(/DTSTART;VALUE=DATE:20260115/);
  });

  it("plant with cadenceDays=60 → no VEVENT in the 30-day window", () => {
    const plant = makePlant({
      // First due 60 days from creation → 45 days from now. Outside window.
      createdAt: NOW.toISOString(),
      rules: [{ careType: "water", cadenceDays: 60, enabled: true }],
    });
    const out = buildIcs({ schemaVersion: 1, plants: [plant] }, NOW);

    expect(out).not.toContain("BEGIN:VEVENT");
    expect(out).not.toMatch(/RRULE:FREQ=DAILY;INTERVAL=60/);
  });

  it("VEVENT has UID, DTSTAMP, DTSTART, SUMMARY, DESCRIPTION fields", () => {
    const plant = makePlant({
      rules: [{ careType: "fertilize", cadenceDays: 30, enabled: true }],
    });
    const out = buildIcs({ schemaVersion: 1, plants: [plant] }, NOW);

    const vevent = out.split("BEGIN:VEVENT")[1]!.split("END:VEVENT")[0]!;
    expect(vevent).toMatch(/UID:/);
    expect(vevent).toMatch(/DTSTAMP:\d{8}T\d{6}Z/);
    expect(vevent).toMatch(/DTSTART;VALUE=DATE:\d{8}/);
    expect(vevent).toMatch(/SUMMARY:/);
    expect(vevent).toMatch(/DESCRIPTION:/);
  });

  it("SUMMARY format is exactly `<emoji> <verb> <PlantName>` for all care types", () => {
    const plant = makePlant({
      rules: [
        { careType: "water", cadenceDays: 7, enabled: true },
        { careType: "fertilize", cadenceDays: 14, enabled: true },
        { careType: "mist", cadenceDays: 3, enabled: true },
      ],
    });
    const out = buildIcs({ schemaVersion: 1, plants: [plant] }, NOW);

    expect(out).toMatch(/SUMMARY:💧 Water Pothos/u);
    expect(out).toMatch(/SUMMARY:🌱 Fertilize Pothos/u);
    expect(out).toMatch(/SUMMARY:💨 Mist Pothos/u);
  });

  it("UID is stable per (plant, careType) so re-exports update the same event", () => {
    const plant = makePlant({
      id: "stable-id-123",
      rules: [{ careType: "water", cadenceDays: 7, enabled: true }],
    });
    const a = buildIcs({ schemaVersion: 1, plants: [plant] }, NOW);
    const b = buildIcs({ schemaVersion: 1, plants: [plant] }, NOW);
    expect(a).toContain("UID:plant-pwa-stable-id-123-water@plant-pwa.local");
    expect(b).toContain("UID:plant-pwa-stable-id-123-water@plant-pwa.local");
  });

  it("RRULE carries the cadence in days via INTERVAL (not WEEKLY)", () => {
    const plant = makePlant({
      rules: [{ careType: "water", cadenceDays: 7, enabled: true }],
    });
    const out = buildIcs({ schemaVersion: 1, plants: [plant] }, NOW);

    expect(out).toMatch(/RRULE:FREQ=DAILY;INTERVAL=7/);
    expect(out).not.toContain("FREQ=WEEKLY");
  });

  it("escapes commas, semicolons, backslashes and newlines in DESCRIPTION", () => {
    const plant = makePlant({
      rules: [{ careType: "water", cadenceDays: 7, enabled: true }],
      // Raw input contains a literal newline plus the 3 ICS-significant
      // characters: comma, semicolon, backslash.
      careTip: "Line one,\nLine two;with;semicolons\\and\\backslashes",
    });
    const out = buildIcs({ schemaVersion: 1, plants: [plant] }, NOW);

    // Unfold any line continuations (CRLF + leading space) so the
    // assertion targets the logical content of one line.
    const unfolded = out.replace(/\r\n /g, "");
    // Build the expected literal substring in code (not a source-literal
    // soup) so the escapes are unambiguous:
    //   comma       -> \,   (2 chars)
    //   semicolon   -> \;   (2 chars)
    //   newline     -> \n   (2 chars)
    //   backslash   -> \\   (2 chars per input backslash)
    const expected =
      "DESCRIPTION:Line one" +
      "\\" + "," +        // escaped comma
      "\\" + "n" +        // escaped newline
      "Line two" +
      "\\" + ";" + "with" + // escaped semicolon
      "\\" + ";" + "semicolons" +
      "\\" + "\\" + "and" +   // escaped backslash (2 chars in source)
      "\\" + "\\" + "backslashes";
    expect(unfolded).toContain(expected);
  });

  it("two plants → two VEVENTs (one per plant)", () => {
    const p1 = makePlant({
      id: "p-1",
      rules: [{ careType: "water", cadenceDays: 7, enabled: true }],
    });
    const p2 = makePlant({
      id: "p-2",
      commonName: "Calathea",
      rules: [{ careType: "fertilize", cadenceDays: 14, enabled: true }],
    });
    const out = buildIcs({ schemaVersion: 1, plants: [p1, p2] }, NOW);

    const beginCount = (out.match(/BEGIN:VEVENT/g) ?? []).length;
    expect(beginCount).toBe(2);
    expect(out).toContain("UID:plant-pwa-p-1-water@plant-pwa.local");
    expect(out).toContain("UID:plant-pwa-p-2-fertilize@plant-pwa.local");
  });

  it("CARE_LABELS has entries for every CareType", () => {
    expect(CARE_LABELS.water.verb).toBe("Water");
    expect(CARE_LABELS.fertilize.verb).toBe("Fertilize");
    expect(CARE_LABELS.mist.verb).toBe("Mist");
  });

  it("export window is exactly 30 days (sanity on ICS_WINDOW_DAYS)", () => {
    expect(ICS_WINDOW_DAYS).toBe(30);
    // Smoke: the window-end date string for our fixed now.
    expect(WINDOW_END_ISO.startsWith("2026-02-14")).toBe(true);
  });
});