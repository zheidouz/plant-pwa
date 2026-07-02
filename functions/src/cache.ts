/**
 * Firestore-backed cache for the `generateSchedule` results.
 *
 * Collection: `schedule_cache`
 * Document ID: lowercased key with non-alphanumerics → `_`
 * Document shape: { result: { rules, careTip }, expiresAt: Timestamp }
 *
 * Per the issue acceptance criteria:
 *   - Key: `${scientificName}|${locale}|${month}` (lowercased, slugified)
 *   - TTL: 30 days
 *   - On read: if `now > expiresAt`, treat as a miss (do not return stale data)
 *
 * We rely on Firebase Functions v2's automatic `firebase-admin`
 * initialisation (already done inside the Functions runtime). The first
 * `admin.firestore()` call lazily initialises the default app, so we
 * can skip the explicit `initializeApp()` ceremony.
 */

import * as admin from "firebase-admin";
import { logger } from "firebase-functions";

/** Collection name. Centralised so the call site doesn't string-literal it. */
export const SCHEDULE_CACHE_COLLECTION = "schedule_cache";

/** Default TTL = 30 days, in milliseconds. */
export const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface CacheDocument<T> {
  result: T;
  /** Firestore `Timestamp` — proto is `toMillis()`. */
  expiresAt: { toMillis: () => number } | Date | string | number;
}

/**
 * Normalise the cache key — lowercased, non-alphanumerics collapsed to `_`.
 *
 * Examples:
 *   "Pothos Aureus|en-US|2026-07" → "pothos_aureus_en_us_2026_07"
 *   "Rosa rubra|fr-FR|2026-12" →  "rosa_rubra_fr_fr_2026_12"
 */
export function normalizeCacheKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

/**
 * Read a cached value. Returns `null` on miss, expired, parse failure,
 * or any error (logged but non-fatal — callers fall back to the model).
 */
export async function getCachedSchedule<T>(
  key: string,
  now: Date = new Date(),
): Promise<T | null> {
  try {
    const db = admin.firestore();
    const docId = normalizeCacheKey(key);
    const snap = await db.collection(SCHEDULE_CACHE_COLLECTION).doc(docId).get();
    if (!snap.exists) return null;
    const data = snap.data() as CacheDocument<T> | undefined;
    if (!data || !data.result) return null;
    const expiryMs = readExpiresAt(data.expiresAt);
    if (expiryMs === null) return null;
    if (now.getTime() > expiryMs) return null;
    return data.result;
  } catch (err) {
    logger.warn("schedule cache read failed", { key, err: String(err) });
    return null;
  }
}

/**
 * Write a value to the cache with an explicit TTL. Failures are logged
 * but non-fatal — caching is an optimisation, not a correctness
 * requirement.
 */
export async function setCachedSchedule<T>(
  key: string,
  value: T,
  ttlMs: number = DEFAULT_TTL_MS,
  now: Date = new Date(),
): Promise<void> {
  try {
    const db = admin.firestore();
    const docId = normalizeCacheKey(key);
    const expiresAt = admin.firestore.Timestamp.fromMillis(now.getTime() + ttlMs);
    await db
      .collection(SCHEDULE_CACHE_COLLECTION)
      .doc(docId)
      .set({ result: value, expiresAt });
  } catch (err) {
    logger.warn("schedule cache write failed", { key, err: String(err) });
  }
}

/**
 * Best-effort conversion for `expiresAt`, which we accept in three forms
 * because Firestore serialises differently depending on the SDK path:
 *   - `Timestamp` instance (admin runtime, normal case)
 *   - `Date` (defensive)
 *   - ISO string / epoch ms (cross-runtime safety)
 */
function readExpiresAt(
  v: CacheDocument<unknown>["expiresAt"],
): number | null {
  if (!v) return null;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const ms = new Date(v).getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  if (v instanceof Date) {
    const ms = v.getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  if (typeof v === "object" && typeof (v as { toMillis?: unknown }).toMillis === "function") {
    try {
      return (v as { toMillis: () => number }).toMillis();
    } catch {
      return null;
    }
  }
  return null;
}
