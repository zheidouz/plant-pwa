/**
 * Firebase Functions entrypoint for the plant-pwa project.
 *
 * Slice #5 exports:
 *   - identifyPlant    (slice #4 — full Pl@ntNet + MiMo vision fallback)
 *   - generateSchedule (slice #5 — MiMo + 30-day Firestore cache)
 *
 * Deploy: `firebase deploy --only functions` (issue #10 owns the deploy).
 */

export { identifyPlant } from "./identifyPlant";
export { generateSchedule } from "./generateSchedule";
export { sendDailyDigest } from "./sendDailyDigest";
