/**
 * Shared TypeScript types for the schedule-generation flow.
 *
 * These mirror the response contract implemented in
 * `functions/src/generateSchedule.ts`. Keeping them in a separate
 * module lets the API wrapper, plant detail page, and future tests
 * share a single source of truth.
 */

import type { ScheduleRule } from "../domain";

/** Request body sent by `generateSchedule()`. */
export interface ScheduleGenerateRequest {
  scientificName?: string;
  commonName: string;
  locale: string;
  /** ISO timestamp. */
  createdAt: string;
}

/** Response returned by `generateSchedule()`. */
export interface ScheduleGenerateResponse {
  rules: ScheduleRule[];
  careTip: string;
}
