/**
 * buildIcs — project 30 days of plant-care events into an RFC 5545 .ics file.
 *
 * Pure: no I/O, no React, no `Date.now()` reads — the caller supplies `now`
 * so tests can drive a fixed clock. Walks every plant × every enabled rule,
 * asks `computeNextDue` for the next due date, and emits one VEVENT per
 * rule with a DAILY RRULE that matches the cadence.
 *
 * Maps to PRD user stories #35 (export), #36 (share with partner),
 * #37 (Apple/Google import), #38 (shared calendar).
 */
import { ALL_CARE_TYPES, computeNextDue, type AppState, type CareType, type Plant } from "../domain";

/** Human label used in the VEVENT SUMMARY: `<emoji> <verb> <PlantName>`. */
export interface CareLabel {
  emoji: string;
  verb: string;
}

/** Care-type → emoji + verb mapping (matches Today-row labels). */
export const CARE_LABELS: Readonly<Record<CareType, CareLabel>> = {
  water: { emoji: "\u{1F4A7}", verb: "Water" }, // 💧
  fertilize: { emoji: "\u{1F331}", verb: "Fertilize" }, // 🌱
  mist: { emoji: "\u{1F4A8}", verb: "Mist" }, // 💨
};

/** Number of days the export window covers (acceptance: 30 days of events). */
export const ICS_WINDOW_DAYS = 30;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
/** RFC 5545 §3.1 says lines SHOULD be folded at 75 octets; use 73 to leave
 *  room for the leading space + CRLF continuation. */
const FOLD_AT = 73;
const CRLF = "\r\n";

/* ──────────────────────────────  Helpers  ──────────────────────────────── */

/** Format a `Date` as UTC `YYYYMMDD` (all-day DTSTART/DTEND form). */
function utcDateStamp(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

/** Format a `Date` as UTC `YYYYMMDDTHHMMSSZ` (DTSTAMP form). */
function utcDateTimeStamp(d: Date): string {
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const h = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  const s = String(d.getUTCSeconds()).padStart(2, "0");
  return `${y}${mo}${day}T${h}${mi}${s}Z`;
}

/** Escape commas, semicolons, backslashes and newlines per RFC 5545 §3.3.11. */
function escapeIcsText(raw: string): string {
  return raw
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/**
 * Fold a single content line to RFC 5545 §3.1 — lines >75 octets get split
 * with a CRLF + single-space continuation. We measure UTF-8 octets (emoji
 * are 4 bytes) so Apple Mail / Outlook accept the result.
 */
function foldLine(line: string): string {
  // Encode to UTF-8 to count octets accurately.
  const enc = new TextEncoder();
  const bytes = enc.encode(line);
  if (bytes.length <= FOLD_AT) return line;

  const dec = new TextDecoder("utf-8");
  const out: string[] = [];
  let cursor = 0;
  let chunkOctets = FOLD_AT;
  while (cursor < bytes.length) {
    // Don't split inside a multi-byte UTF-8 sequence: back up until the next
    // byte is not a continuation byte (0b10xxxxxx).
    let end = Math.min(cursor + chunkOctets, bytes.length);
    while (end < bytes.length && (bytes[end]! & 0xc0) === 0x80) end--;
    const slice = bytes.slice(cursor, end);
    out.push(dec.decode(slice));
    cursor = end;
    // After the first chunk, every continuation line has 1 octet of leading
    // space "stolen" by the continuation marker, so chunks shrink by one.
    chunkOctets = FOLD_AT - 1;
  }
  return out.join(CRLF + " ");
}

/** Pad a content line into an ICS property line (`NAME:VALUE`). */
function prop(name: string, value: string): string {
  return foldLine(`${name}:${value}`);
}

/** Add `days` whole days to a `Date`, returning a NEW Date. */
function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * MS_PER_DAY);
}

/** Midnight UTC of the same calendar day as `d`. */
function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/* ──────────────────────────  Per-event builder  ───────────────────────── */

/** Build a single VEVENT block (without trailing CRLF). */
function buildVEvent(
  plant: Plant,
  careType: CareType,
  label: CareLabel,
  ruleStartUtcMidnight: Date,
  cadenceDays: number,
  dtstamp: string,
): string {
  const uid = `plant-pwa-${plant.id}-${careType}@plant-pwa.local`;
  const summary = `${label.emoji} ${label.verb} ${plant.commonName}`.trim();
  const description = plant.careTip ?? "";

  const dtstartUtc = ruleStartUtcMidnight;
  // DTEND for all-day events is exclusive (the day AFTER).
  const dtendUtc = addDays(dtstartUtc, 1);

  const lines = [
    "BEGIN:VEVENT",
    prop("UID", uid),
    prop("DTSTAMP", dtstamp),
    prop("DTSTART;VALUE=DATE", utcDateStamp(dtstartUtc)),
    prop("DTEND;VALUE=DATE", utcDateStamp(dtendUtc)),
    prop("RRULE", `FREQ=DAILY;INTERVAL=${cadenceDays}`),
    prop("SUMMARY", escapeIcsText(summary)),
    prop("DESCRIPTION", escapeIcsText(description)),
    "END:VEVENT",
  ];
  return lines.join(CRLF);
}

/* ────────────────────────────  Public API  ────────────────────────────── */

/**
 * Produce a valid RFC 5545 .ics string covering the next {@link ICS_WINDOW_DAYS}
 * days. Rules with no upcoming occurrence in the window are skipped; rules
 * that are overdue (next due is in the past) get a DTSTART of today, with
 * the RRULE filling subsequent recurrences.
 */
export function buildIcs(appState: AppState, now: Date): string {
  const dtstamp = utcDateTimeStamp(now);
  const todayMidnightUtc = startOfUtcDay(now);
  const windowEndMs = todayMidnightUtc.getTime() + ICS_WINDOW_DAYS * MS_PER_DAY;

  const events: string[] = [];

  for (const plant of appState.plants) {
    for (const careType of ALL_CARE_TYPES) {
      const nextIso = computeNextDue(plant, careType, now);
      if (nextIso === null) continue; // rule missing / disabled / degenerate

      const nextMs = new Date(nextIso).getTime();
      if (Number.isNaN(nextMs)) continue;

      // Find the rule to read cadenceDays. If we somehow lost the rule
      // between computeNextDue and here (shouldn't happen — computeNextDue
      // reads the same `rules` array) skip cleanly.
      const rule = plant.rules.find((r) => r.careType === careType);
      if (!rule || !rule.enabled) continue;

      // Anchor the event on the later of (nextDue, today) so an overdue
      // plant produces a DTSTART of today (still inside the window).
      const anchorMs = Math.max(nextMs, todayMidnightUtc.getTime());
      if (anchorMs >= windowEndMs) continue; // outside the 30-day window

      events.push(
        buildVEvent(
          plant,
          careType,
          CARE_LABELS[careType],
          new Date(anchorMs),
          rule.cadenceDays,
          dtstamp,
        ),
      );
    }
  }

  const header = [
    "BEGIN:VCALENDAR",
    prop("VERSION", "2.0"),
    prop("PRODID", "-//plant-pwa//EN"),
    prop("CALSCALE", "GREGORIAN"),
    prop("METHOD", "PUBLISH"),
    prop("X-WR-CALNAME", "Plant care"),
  ];
  const footer = ["END:VCALENDAR"];

  return [...header, ...events, ...footer].join(CRLF) + CRLF;
}