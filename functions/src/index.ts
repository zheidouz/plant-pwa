/**
 * Firebase Functions entrypoint for the plant-pwa project.
 *
 * Slice #4 exports:
 *   - identifyPlant   (full implementation — Pl@ntNet + MiMo vision fallback)
 *   - generateSchedule (stub returning 501; slice #5 / #6 will fill it in)
 *
 * Deploy: `firebase deploy --only functions` (issue #10 owns the deploy).
 */

import { onRequest } from "firebase-functions/v2/https";

export { identifyPlant } from "./identifyPlant";

/**
 * Stub for the schedule-generation function. Slice #5 ("Schedule & Detail")
 * implements the full MiMo v2.5 schedule generator. Per the issue
 * acceptance criteria, we surface 501 here so clients that hit it get a
 * clear "not implemented yet" response rather than a silent failure.
 */
export const generateSchedule = onRequest(
  {
    region: "us-central1",
    cors: true,
    memory: "512MiB",
    timeoutSeconds: 30,
  },
  (_req, res) => {
    res.status(501).json({
      error: "not_implemented",
      message: "generateSchedule is owned by issue #5 — coming soon.",
    });
  },
);
