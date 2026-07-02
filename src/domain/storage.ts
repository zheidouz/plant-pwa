/**
 * Persistence layer for the plant-pwa domain module.
 *
 * Wraps `localStorage` with:
 *   - a versioned key (`STORAGE_KEY`) so we can hard-migrate if the shape
 *     ever changes incompatibly
 *   - a schema-version guard that returns an empty `AppState` on mismatch
 *     rather than crashing the app
 *   - a corruption fallback that swallows `JSON.parse` errors and logs a
 *     single warning, returning empty
 *   - a safe write that catches `QuotaExceededError` and security errors
 *     thrown by some private-browsing modes
 *
 * Pure TS: no React, no Firebase, no HTTP clients. Consumable from any slice.
 */

import {
  CURRENT_SCHEMA_VERSION,
  STORAGE_KEY,
  type AppState,
} from "./types";

/** Returns the canonical empty `AppState` for the current schema version. */
export function emptyAppState(): AppState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    plants: [],
  };
}

/**
 * Minimal shape we accept from `localStorage`. Anything else (extra fields,
 * wrong types) is treated as corruption and falls back to empty.
 */
interface PersistedShape {
  schemaVersion: number;
  plants: unknown[];
}

function isValidPersisted(value: unknown): value is PersistedShape {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.schemaVersion === "number" &&
    Array.isArray(v.plants)
  );
}

/**
 * Load the persisted `AppState`. Behaviour:
 *   - `localStorage` unavailable (SSR / Node test env) -> empty state
 *   - key missing -> empty state
 *   - JSON.parse throws -> warn + empty state
 *   - shape invalid -> warn + empty state
 *   - schemaVersion mismatch -> warn + empty state (NOT a throw; the app
 *     boots cleanly and the user can re-add plants)
 *   - schemaVersion matches -> cast + return
 */
export function loadAppState(): AppState {
  // Defensive: code paths that import this module from non-browser contexts
  // (unit tests in node, SSR pre-renders, etc.) should still get a sane value.
  if (typeof globalThis.localStorage === "undefined") {
    return emptyAppState();
  }

  let raw: string | null;
  try {
    raw = globalThis.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Some browsers throw on localStorage access (e.g. strict cookie policies).
    return emptyAppState();
  }

  if (raw === null) return emptyAppState();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    // Single warning, no throw — losing data is preferable to crashing the app.
    // eslint-disable-next-line no-console
    console.warn(
      "[plant-pwa] Corrupted JSON in localStorage; falling back to empty state.",
      err
    );
    return emptyAppState();
  }

  if (!isValidPersisted(parsed)) {
    // eslint-disable-next-line no-console
    console.warn(
      "[plant-pwa] Invalid AppState shape in localStorage; falling back to empty state."
    );
    return emptyAppState();
  }

  if (parsed.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    // eslint-disable-next-line no-console
    console.warn(
      `[plant-pwa] Schema version mismatch (got ${parsed.schemaVersion}, expected ${CURRENT_SCHEMA_VERSION}); falling back to empty state.`
    );
    return emptyAppState();
  }

  // Schema matches. We don't deeply validate plant contents here — that's the
  // job of the data-ingestion slice (issue #4 / #5). For now, cast through
  // `unknown` and trust the schema.
  return parsed as unknown as AppState;
}

/**
 * Persist `AppState` to `localStorage`. Writes safely:
 *   - serialises to JSON; on `JSON.stringify` failure (e.g. circular ref)
 *     we warn and silently return
 *   - `setItem` can throw `QuotaExceededError` or a security error in some
 *     private-browsing modes — we catch and warn
 *
 * "Atomic" here means best-effort: the write either completes fully or
 * leaves the previous valid state untouched (we never partially mutate).
 */
export function saveAppState(state: AppState): void {
  if (typeof globalThis.localStorage === "undefined") {
    return;
  }

  let serialised: string;
  try {
    serialised = JSON.stringify(state);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      "[plant-pwa] Failed to serialise AppState; skipping save.",
      err
    );
    return;
  }

  try {
    globalThis.localStorage.setItem(STORAGE_KEY, serialised);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      "[plant-pwa] Failed to write AppState to localStorage; the change was not persisted.",
      err
    );
  }
}