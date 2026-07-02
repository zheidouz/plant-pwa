/**
 * Shared clock helper for the domain unit tests.
 *
 * Every test in `schedule.test.ts` and `storage.test.ts` calls `fixedNow()`
 * to get a deterministic `Date` they can pass into the pure predicates.
 * This keeps `now` explicit (no global clock, no module-level mutable state)
 * while still being ergonomic to write.
 */

/**
 * A fixed reference instant for tests. Picked at midnight UTC to avoid
 * timezone edge cases in `daysSince` arithmetic.
 */
export const REFERENCE_NOW = new Date("2026-01-15T12:00:00.000Z");

/** Returns a fresh `Date` set to the test reference instant. */
export function fixedNow(): Date {
  return new Date(REFERENCE_NOW.getTime());
}

/**
 * Returns a Date `n` days after (or before, if negative) the reference instant.
 */
export function daysFromNow(n: number): Date {
  const ms = n * 24 * 60 * 60 * 1000;
  return new Date(REFERENCE_NOW.getTime() + ms);
}

/**
 * Returns an ISO timestamp `n` days before the reference instant.
 * Convenience for building `createdAt` / `completedAt` values.
 */
export function isoDaysAgo(n: number): string {
  return daysFromNow(-n).toISOString();
}