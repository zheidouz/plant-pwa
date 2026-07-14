/**
 * Locale helpers for plant-pwa schedule generation.
 *
 * Pure functions only — no I/O, no `Date.now()` reads. The date is
 * always passed in so the caller (and unit tests) control the clock.
 *
 * Hemispheres:
 *   - "north": locales that are reliably in the Northern Hemisphere
 *   - "south": locales that are reliably in the Southern Hemisphere
 *   - "unknown": anything we can't tell (default fallback)
 *
 * The map is intentionally simple — we only resolve the hemisphere when
 * the BCP-47 tag has a region subtag (`xx-YY`). For the bulk of users
 * (en-US, fr-FR, etc.) the region is a strong north/south signal. For
 * regionless tags (`en`, `es`, etc.) we fall back to "unknown" rather
 * than guess.
 */

/** Locale → hemisphere. Regionless tags return "unknown". */
export type Hemisphere = "north" | "south" | "unknown";

/** Stable set of BCP-47 region subtags we treat as "north". */
const NORTH_REGIONS = new Set([
  "US", "CA", "GB", "IE", "DE", "FR", "IT", "ES", "NL", "BE",
  "JP", "CN", "KR", "TW", "RU", "SE", "NO", "FI", "DK", "PL",
  "CZ", "AT", "CH", "PT", "GR", "HU", "RO", "TR", "MX", "IN",
]);
/** Stable set of BCP-47 region subtags we treat as "south". */
const SOUTH_REGIONS = new Set([
  "AU", "NZ", "AR", "BR", "CL", "ZA", "PE", "UY", "PY", "BO",
]);

const UNKNOWN: Hemisphere = "unknown";

/**
 * Map a BCP-47 locale to a hemisphere. Returns "unknown" when the tag
 * is missing a region subtag or the region is not in our table.
 */
export function hemisphereFromLocale(locale: string): Hemisphere {
  const region = locale.split("-")[1]?.toUpperCase();
  if (!region) return UNKNOWN;
  if (NORTH_REGIONS.has(region)) return "north";
  if (SOUTH_REGIONS.has(region)) return "south";
  return UNKNOWN;
}

/** Northern-meteorological seasons (winter = Dec/Jan/Feb). */
export type Season = "winter" | "spring" | "summer" | "fall";

/**
 * Map a date + hemisphere to a meteorological season.
 *
 * Northern hemisphere uses the conventional Dec/Jan/Feb = winter,
 * Mar/Apr/May = spring, etc. Southern hemisphere flips the seasons by
 * 6 months (per PRD § "Schedule Generation": "hemisphere + current
 * season from the locale").
 *
 * Unknown hemisphere → northern mapping (best-guess for the common case).
 */
export function seasonFromDate(date: Date, hemisphere: Hemisphere): Season {
  const m = date.getUTCMonth(); // 0-indexed Jan=0
  const northern: Season[] = [
    "winter", "winter", "spring", "spring", "spring", "summer",
    "summer", "summer", "fall",   "fall",   "fall",   "winter",
  ];
  const southern: Season[] = [
    "summer", "summer", "fall",   "fall",   "fall",   "winter",
    "winter", "winter", "spring", "spring", "spring", "summer",
  ];
  if (hemisphere === "south") return southern[m]!;
  return northern[m]!;
}
