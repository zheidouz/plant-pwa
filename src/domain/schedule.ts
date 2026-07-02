/**
 * Schedule + dying-detection math for Plant Identifier PWA v1.
 *
 * Pure functions only — no `Date.now()` reads, no `localStorage` access,
 * no React, no Firebase. Every function takes an explicit `now: Date` so
 * unit tests can drive a fixed clock.
 *
 * The dying-detection contract below is the source of truth for the home
 * screen's red banner and MUST stay in lock-step with the PRD (lines 149
 * and 254-255 of `docs/prd/plant-identifier-pwa-v1.md`):
 *
 *   (a) now - last water completion > 7 days AND water is enabled
 *   (b) now - last fertilize completion > 14 days AND fertilize enabled
 *   (c) water is enabled, no completion exists, AND now - createdAt > 14 days
 *
 * The 7 / 14 / 14 thresholds are placeholders for tuning. They live as
 * named constants below so a future tuning pass is one-line.
 */

import type {
  CareType,
  CompletionEntry,
  Plant,
  ScheduleRule,
} from "./types";

/* ───────────────────────────  Tuning constants  ────────────────────────── */

/** Threshold for dying-clause (a): days since last water completion. */
export const DYING_WATER_DAYS = 7;
/** Threshold for dying-clause (b): days since last fertilize completion. */
export const DYING_FERTILIZE_DAYS = 14;
/** Threshold for dying-clause (c): days since plant creation with no water. */
export const DYING_NEVER_WATERED_DAYS = 14;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/* ──────────────────────────────  Helpers  ──────────────────────────────── */

/**
 * Whole days from `iso` (an ISO timestamp) to `now`. Negative values are
 * returned as-is (the caller can clamp if it cares).
 */
export function daysSince(iso: string, now: Date): number {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return Number.NaN;
  return (now.getTime() - then) / MS_PER_DAY;
}

/** Find the rule for `careType` on a plant, or `undefined` if absent. */
export function findRule(plant: Plant, careType: CareType): ScheduleRule | undefined {
  return plant.rules.find((r) => r.careType === careType);
}

/**
 * Returns the most-recent completion entry for `careType` on `plant`, or
 * `undefined` if the plant has never been logged for that care type.
 */
export function latestCompletion(
  plant: Plant,
  careType: CareType,
  now: Date
): CompletionEntry | undefined {
  const matches = plant.completionLog.filter((e) => e.careType === careType);
  if (matches.length === 0) return undefined;

  let latest: CompletionEntry = matches[0]!;
  let latestMs = new Date(latest.completedAt).getTime();
  for (let i = 1; i < matches.length; i++) {
    const entry = matches[i]!;
    const ms = new Date(entry.completedAt).getTime();
    if (ms > latestMs) {
      latest = entry;
      latestMs = ms;
    }
  }
  // Sanity: ignore entries dated in the future (clock skew, bad log).
  // Treat them as "never" so callers get deterministic behavior.
  if (latestMs > now.getTime()) return undefined;
  return latest;
}

/* ──────────────────────────  Next-due calculation  ─────────────────────── */

/**
 * Returns the ISO timestamp at which the next `careType` action is due for
 * `plant`, or `null` if:
 *   - the plant has no rule for that care type
 *   - the rule is disabled
 *   - the rule's `cadenceDays` is non-positive (degenerate)
 *
 * The calculation bases off the most-recent completion for that care type;
 * if none exists, it bases off `plant.createdAt`. Either way, the formula is
 * `base + cadenceDays * MS_PER_DAY`.
 */
export function computeNextDue(
  plant: Plant,
  careType: CareType,
  now: Date
): string | null {
  const rule = findRule(plant, careType);
  if (!rule || !rule.enabled) return null;
  if (!Number.isFinite(rule.cadenceDays) || rule.cadenceDays <= 0) return null;

  const completion = latestCompletion(plant, careType, now);
  const baseIso = completion ? completion.completedAt : plant.createdAt;
  const baseMs = new Date(baseIso).getTime();
  if (Number.isNaN(baseMs)) return null;

  const nextMs = baseMs + rule.cadenceDays * MS_PER_DAY;
  return new Date(nextMs).toISOString();
}

/* ───────────────────────────  Dying predicate  ────────────────────────── */

/**
 * Pure predicate matching the dying-detection contract (a/b/c). Returns
 * `true` when ANY of the three clauses is satisfied, `false` otherwise.
 *
 * Implementation note: the thresholds live as named constants at the top of
 * this file. Future tuning changes one line.
 */
export function isDying(plant: Plant, now: Date): boolean {
  // Clause (a): water is enabled AND last water completion > DYING_WATER_DAYS ago.
  const waterRule = findRule(plant, "water");
  if (waterRule && waterRule.enabled) {
    const lastWater = latestCompletion(plant, "water", now);
    if (lastWater) {
      const sinceWater = daysSince(lastWater.completedAt, now);
      if (sinceWater > DYING_WATER_DAYS) return true;
    }
  }

  // Clause (b): fertilize is enabled AND last fertilize completion > DYING_FERTILIZE_DAYS ago.
  const fertilizeRule = findRule(plant, "fertilize");
  if (fertilizeRule && fertilizeRule.enabled) {
    const lastFert = latestCompletion(plant, "fertilize", now);
    if (lastFert) {
      const sinceFert = daysSince(lastFert.completedAt, now);
      if (sinceFert > DYING_FERTILIZE_DAYS) return true;
    }
  }

  // Clause (c): water is enabled AND no water completion exists AND
  //             now - createdAt > DYING_NEVER_WATERED_DAYS.
  if (waterRule && waterRule.enabled) {
    const lastWater = latestCompletion(plant, "water", now);
    if (!lastWater) {
      const sinceCreated = daysSince(plant.createdAt, now);
      if (sinceCreated > DYING_NEVER_WATERED_DAYS) return true;
    }
  }

  return false;
}