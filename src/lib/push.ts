/**
 * Web Push / local-notification helpers (slice #8).
 *
 * v1 scope (slice #8) — shipped in this slice:
 *   - `requestNotificationPermission()` — wraps `Notification.requestPermission`
 *     with a sessionStorage "asked" flag so we don't re-prompt on every render.
 *   - `getNotificationPermission()` — synchronous accessor for the current
 *     permission state; safe to call from React effects / Settings page.
 *   - `sendLocalNotification(title, body, url?)` — fires a `new Notification(...)`
 *     with a click handler that focuses the window and deep-links to
 *     `/#/today` (or the supplied `url`). Used by the "Send test
 *     notification" button and as the local-fallback path during development.
 *
 * Real Web Push delivery (server → user's browser while the app is closed)
 * requires:
 *   - a VAPID keypair
 *   - `serviceWorker.pushManager.subscribe({ userVisibleOnly: true,
 *     applicationServerKey: <VAPID public key> })`
 *   - the subscription.endpoint POSTed to a Firestore collection
 *   - server-side `web-push` send from the `sendDailyDigest` function
 *
 * That full pipeline is deferred to issue #10 (deploy + VAPID wiring).
 * For slice #8 we ship the client permission flow, the Settings UI, a
 * "send test" button, and a Cloud-Scheduled function stub. Real push
 * delivery is acknowledged in the issue as a #10 gap.
 */

const ASKED_KEY = "plant-pwa:notif-asked";

/**
 * Returns the current `Notification.permission` state. Falls back to
 * `"default"` when `Notification` is unavailable (SSR / Node tests).
 */
export function getNotificationPermission(): NotificationPermission {
  if (typeof globalThis.Notification === "undefined") return "default";
  return globalThis.Notification.permission;
}

/**
 * Whether `Notification.requestPermission` is callable. Returns false in
 * non-browser environments and in private-browsing modes that block it.
 */
export function canRequestPermission(): boolean {
  return (
    typeof globalThis !== "undefined" &&
    typeof globalThis.Notification !== "undefined" &&
    typeof globalThis.Notification.requestPermission === "function"
  );
}

/**
 * Returns true when we've already prompted the user this session. The
 * sessionStorage flag is set the first time we call
 * `requestNotificationPermission`, even if the user dismissed the prompt,
 * so we don't re-ask.
 */
export function hasAskedThisSession(): boolean {
  try {
    return globalThis.sessionStorage?.getItem(ASKED_KEY) === "1";
  } catch {
    return false;
  }
}

function markAsked(): void {
  try {
    globalThis.sessionStorage?.setItem(ASKED_KEY, "1");
  } catch {
    // Some private-browsing modes throw on sessionStorage access — ignore.
  }
}

/**
 * Prompt the user for notification permission once per session. Returns
 * the resulting `NotificationPermission` (`"default" | "granted" |
 * "denied"`).
 *
 * Behaviour:
 *   - when `Notification` is unavailable → resolves `"default"`
 *   - when permission is already non-`"default"` → resolves immediately
 *   - when we've already prompted this session → resolves `"default"`
 *     (no re-prompt; the user can change their mind via browser settings)
 *   - otherwise calls `Notification.requestPermission()` and persists
 *     the asked-flag
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!canRequestPermission()) return "default";
  const current = globalThis.Notification.permission;
  if (current !== "default") return current;
  if (hasAskedThisSession()) return "default";

  try {
    const result = await globalThis.Notification.requestPermission();
    markAsked();
    return result;
  } catch {
    markAsked();
    return "default";
  }
}

export interface LocalNotificationOptions {
  /** ISO/url the click handler should navigate to. Defaults to "#/today". */
  url?: string;
  /** Replaces existing notifications with the same tag (browser dedupe). */
  tag?: string;
  /** Optional icon URL. */
  icon?: string;
}

/**
 * Fire a local `new Notification(...)` immediately. Returns the
 * `Notification` instance when fired, or `null` when permission is not
 * granted (caller should `requestNotificationPermission()` first).
 *
 * The click handler focuses the window and navigates to `url` (defaults
 * to `/#/today`), then closes the notification.
 */
export function sendLocalNotification(
  title: string,
  body: string,
  options: LocalNotificationOptions = {},
): Notification | null {
  if (typeof globalThis.Notification === "undefined") return null;
  if (globalThis.Notification.permission !== "granted") return null;

  const targetUrl = options.url ?? "#/today";
  const notification = new globalThis.Notification(title, {
    body,
    icon: options.icon,
    tag: options.tag,
  });

  notification.onclick = () => {
    try {
      window.focus();
    } catch {
      // Some browsers throw if window.focus is called outside a user gesture;
      // it's safe to ignore — the navigation below still runs.
    }
    window.location.hash = targetUrl.replace(/^#/, "");
    notification.close();
  };

  return notification;
}

/**
 * Compose the digest body in one place so the local test button and the
 * (future) server-side function emit identical copy.
 */
export function digestBody(plantsNeedingCareToday: number): string {
  if (plantsNeedingCareToday <= 0) return "";
  // The PRD's exact wording is: "<N> plants need you today 💧🌱".
  return `${plantsNeedingCareToday} plants need you today 💧🌱`;
}

/**
 * Default morning digest time — `08:00` local. Used as the initial
 * Settings value AND the Cloud Scheduler fallback (function-side default
 * lives in `sendDailyDigest.ts`).
 */
export const DEFAULT_DIGEST_HOUR = 8;
export const DEFAULT_DIGEST_MINUTE = 0;