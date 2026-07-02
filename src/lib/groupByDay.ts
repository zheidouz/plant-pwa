/**
 * Group items by their local-time day. Day key is `YYYY-MM-DD` in local
 * time (so a single key covers the entire calendar day from 00:00 to
 * 23:59:59.999 in the user's timezone, regardless of UTC offset).
 *
 * Pure helper — no `Date.now()` reads. Pass an explicit `now` only so the
 * helper can be called the same way as `relativeDay`; the items' `at`
 * field is what determines their bucket.
 */
export function groupByDay<T extends { at: Date }>(
  items: T[],
  _now: Date,
): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const item of items) {
    const key = dayKey(item.at);
    const bucket = out.get(key);
    if (bucket) {
      bucket.push(item);
    } else {
      out.set(key, [item]);
    }
  }
  return out;
}

/** Format a Date as `YYYY-MM-DD` in local time. Zero-padded. */
export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
