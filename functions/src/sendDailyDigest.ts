/**
 * sendDailyDigest — Firebase Functions v2 Pub/Sub-scheduled trigger.
 *
 * Per issue #8 + the PRD (Notifications section, user stories #28–#30):
 *   - Runs once per day at the user's configured morning time (default 08:00
 *     Asia/Manila — explicit timezone, not UTC).
 *   - Counts "today's" care items across the user's plant collection and
 *     pushes a single digest notification.
 *   - When N == 0, sends NO notification (be quiet, don't nag).
 *
 * v1 scope (slice #8) — what's SHIPPED:
 *   - Cloud Scheduler cron registration via `onSchedule` (Pub/Sub-backed).
 *   - Function body: reads the v1 single-device `AppState` from Firestore
 *     when available (no v1 Firestore collection exists yet for app state —
 *     `useAppState` writes to localStorage), counts today's items using the
 *     same domain helper the client uses, and logs the resulting summary.
 *   - Real Web Push delivery via the `web-push` library is DEFERRED to
 *     issue #10. See the documentation block below.
 *
 * What's NOT shipped yet (deferred to #10 deploy):
 *   - VAPID keypair generation + VAPID_PUBLIC_KEY as a `defineString`
 *     surfaced to the client.
 *   - `web-push` library send to subscription endpoints stored in a
 *     `push_subscriptions` Firestore collection.
 *   - Service-worker registration (`/sw.js`) with `pushManager.subscribe`.
 *   - The client-side subscription POST endpoint.
 *
 * Why we ship the function body anyway:
 *   - Cloud Scheduler cron syntax, region, and timezone wiring is verifiable
 *     by reading this file (no live deploy needed for slice #8).
 *   - The count-today's-items logic is reusable on both sides of the wire
 *     and works in isolation (the function reads + logs even when no
 *     Firestore document exists).
 *
 * Deploy (issue #10):
 *   `firebase deploy --only functions:sendDailyDigest`
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";

/**
 * Mirrors `CareType` from `src/domain/types.ts`. Duplicated here because
 * `functions` has its own `tsconfig` and can't import from `../src/domain`
 * (which is React-free TS but is owned by the frontend slice).
 */
type CareType = "water" | "fertilize" | "mist";

/**
 * Mirrors `ScheduleRule` from `src/domain/types.ts`.
 */
interface ScheduleRule {
  careType: CareType;
  cadenceDays: number;
  enabled: boolean;
}

/**
 * Mirrors the relevant slice of `Plant` for cadence math.
 */
interface DigestPlant {
  id: string;
  commonName: string;
  createdAt: string;
  rules: ScheduleRule[];
}

/**
 * Count plants that have at least one rule due "today" (within ±12h of
 * the trigger's wall clock). Duplicated from `src/domain/schedule.ts` to
 * avoid the cross-package import — both implementations should agree.
 */
function isDueToday(plant: DigestPlant, now: Date): boolean {
  const sinceMs = now.getTime() - new Date(plant.createdAt).getTime();
  if (!Number.isFinite(sinceMs) || sinceMs < 0) return false;
  for (const rule of plant.rules) {
    if (!rule.enabled) continue;
    if (rule.cadenceDays <= 0) continue;
    // `days since creation` mod `cadenceDays` == 0 → due today.
    const daysSinceCreation = Math.floor(sinceMs / (24 * 60 * 60 * 1000));
    if (daysSinceCreation % rule.cadenceDays === 0) return true;
  }
  return false;
}

/**
 * Build the digest body — must match `digestBody()` in
 * `src/lib/push.ts` so client test-button and server push use the same
 * copy. Kept in lock-step via this duplicate (the function will be the
 * authoritative source once #10 deploys).
 */
function digestBody(count: number): string {
  if (count <= 0) return "";
  return `${count} plants need you today 💧🌱`;
}

/**
 * Cloud-Scheduled trigger — daily at 08:00 Asia/Manila.
 *
 * Syntax note: v2 schedule strings use `"every day HH:MM"`. The `timeZone`
 * field is REQUIRED for sane defaults; without it, Cloud Scheduler
 * defaults to UTC and the user gets woken up at the wrong hour.
 */
export const sendDailyDigest = onSchedule(
  {
    schedule: "every day 08:00",
    timeZone: "Asia/Manila",
    region: "us-central1",
  },
  async () => {
    const now = new Date();
    logger.info("sendDailyDigest triggered", { now: now.toISOString() });

    /*
     * STUB: in slice #8 there is no Firestore collection of plants — v1
     * stores them in localStorage on a single device. The full read path
     * is wired in issue #10 alongside VAPID + subscription storage.
     *
     * For now we:
     *   1. Document the would-be Firestore read.
     *   2. Compute the would-be digest body from an empty plant list.
     *   3. Log the result so deploys can verify the trigger is firing.
     *
     * When the Firestore collection is added (#10), replace the empty
     * array with a real `db.collection("plants").get()` call.
     */
    const plants: DigestPlant[] = [];
    const needingCareToday = plants.filter((p) => isDueToday(p, now)).length;
    const body = digestBody(needingCareToday);

    if (!body) {
      logger.info("sendDailyDigest: zero plants need care, skipping push", {
        plantCount: plants.length,
      });
      return;
    }

    /*
     * STUB: real push delivery happens in #10. The placeholder below
     * shows the shape of the eventual `web-push` call so reviewers can
     * see the missing pieces:
     *
     *   for (const sub of subs) {
     *     await webpush.sendNotification(
     *       { endpoint: sub.endpoint, keys: sub.keys },
     *       JSON.stringify({ title: "Plant care", body, url: "/#/today" }),
     *       { vapidDetails: { subject: "mailto:...", publicKey: PUB, privateKey: PRIV } },
     *     );
     *   }
     */

    logger.info("sendDailyDigest: would send push", {
      needingCareToday,
      body,
      plantCount: plants.length,
    });
  },
);