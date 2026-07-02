/**
 * Human-friendly relative-day label for the Today screen.
 *
 *   today              -> "Today"
 *   tomorrow           -> "Tomorrow"
 *   yesterday          -> "Yesterday"
 *   N calendar days    -> "in N days"   (N >= 2, target strictly in the future)
 *                       "N days ago"   (N >= 2, target strictly in the past)
 *
 * "Calendar days" means we compare the local-time Y/M/D triplet, not raw
 * hours. This matches the UX on the Today screen where "tomorrow at 1am"
 * still reads as "Tomorrow".
 *
 * Pure — no `Date.now()` reads. Pass an explicit `now`.
 */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function relativeDay(target: Date, now: Date): string {
  // Compare on local-day boundaries by clearing time-of-day.
  const startOfDay = (d: Date): number => {
    const c = new Date(d);
    c.setHours(0, 0, 0, 0);
    return c.getTime();
  };
  const a = startOfDay(target);
  const b = startOfDay(now);
  const diffDays = Math.round((a - b) / MS_PER_DAY);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 1) return `in ${diffDays} days`;
  return `${Math.abs(diffDays)} days ago`;
}

/**
 * Convenience: returns the absolute calendar-day distance between two
 * dates, ignoring time-of-day. Positive = target is in the future.
 */
export function dayDelta(target: Date, now: Date): number {
  const startOfDay = (d: Date): number => {
    const c = new Date(d);
    c.setHours(0, 0, 0, 0);
    return c.getTime();
  };
  const a = startOfDay(target);
  const b = startOfDay(now);
  return Math.round((a - b) / MS_PER_DAY);
}
