/**
 * `nextDueLabel` — pure helper that turns a `computeNextDue` ISO timestamp
 * (or `null`) into a short, human-readable relative-day label suitable for
 * the My Plants grid cards.
 *
 *   "in 3 days"          // due in the future
 *   "today"              // due today
 *   "tomorrow"           // due tomorrow
 *   "overdue by 5 days"  // due in the past
 *   "overdue by 1 day"   // due yesterday
 *
 * Returns `null` when the plant has no enabled rule for `careType`
 * (i.e. `computeNextDue` returned `null`) so callers can decide whether
 * to render a fallback line or skip the row.
 *
 * Pure function: takes `now` explicitly so tests can pin the clock.
 */

import { computeNextDue, daysSince, type CareType, type Plant } from "../domain";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type NextDueLabel =
  | "today"
  | "tomorrow"
  | `in ${number} days`
  | `overdue by ${number} day${number extends 1 ? "" : "s"}`;

export function nextDueLabel(
  plant: Plant,
  careType: CareType,
  now: Date
): string | null {
  const iso = computeNextDue(plant, careType, now);
  if (!iso) return null;

  // Compare on local calendar day boundaries (matches `relativeDay`).
  const due = new Date(iso);
  if (Number.isNaN(due.getTime())) return null;

  const startOfNow = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDue = new Date(
    due.getFullYear(),
    due.getMonth(),
    due.getDate()
  ).getTime();

  const diffDays = Math.round((startOfDue - startOfNow) / MS_PER_DAY);

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  if (diffDays > 1) return `in ${diffDays} days`;
  // diffDays < 0 — overdue
  const overdueBy = -diffDays;
  return overdueBy === 1 ? "overdue by 1 day" : `overdue by ${overdueBy} days`;
}

/**
 * Convenience: returns the "raw" days-until-due as a number (positive =
 * future, negative = overdue) for callers that need to choose what to
 * display (e.g. ranking). Returns `null` when no enabled rule exists.
 */
export function nextDueDays(
  plant: Plant,
  careType: CareType,
  now: Date
): number | null {
  const iso = computeNextDue(plant, careType, now);
  if (!iso) return null;
  const due = new Date(iso);
  if (Number.isNaN(due.getTime())) return null;
  // Re-use the existing daysSince helper but invert the sign.
  return -daysSince(iso, now);
}
