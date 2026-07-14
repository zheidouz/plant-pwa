/**
 * Public surface of the plant-pwa domain module.
 *
 * Slice consumers should import from `"../domain"` (or the appropriate
 * relative path) and never reach into the individual files. This keeps
 * the public contract narrow and lets us reorganise internals without
 * breaking downstream slices.
 */

export type {
  AppState,
  CareType,
  CompletionEntry,
  NotificationPrefs,
  Plant,
  ScheduleRule,
} from "./types";

export {
  ALL_CARE_TYPES,
  CURRENT_SCHEMA_VERSION,
  DEFAULT_NOTIFICATION_PREFS,
  STORAGE_KEY,
} from "./types";

export {
  emptyAppState,
  loadAppState,
  saveAppState,
} from "./storage";

export {
  DYING_FERTILIZE_DAYS,
  DYING_NEVER_WATERED_DAYS,
  DYING_WATER_DAYS,
  computeNextDue,
  daysSince,
  findRule,
  isDying,
  latestCompletion,
} from "./schedule";