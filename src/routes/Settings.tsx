// Settings — slice #8 daily digest + #9 app stats.
//
// Sections:
//   1. Notifications — toggle, time picker, permission controls, test
//      notification button (slice #8).
//   2. App stats — plants count + care-actions-this-month + Reset app
//      stub (issue #9 will own the destructive action + monthly counter).

import { useCallback, useMemo, useState } from "react";
import {
  DEFAULT_NOTIFICATION_PREFS,
  type NotificationPrefs,
} from "../domain";
import { useAppState } from "../hooks/useAppState";
import NotificationToggle from "../components/NotificationToggle";
import TimePicker from "../components/TimePicker";
import {
  digestBody,
  getNotificationPermission,
  hasAskedThisSession,
  requestNotificationPermission,
  sendLocalNotification,
} from "../lib/push";

/** Read prefs out of `AppState` with a defensive fallback to defaults. */
function readPrefs(state: { notificationPrefs?: NotificationPrefs }): NotificationPrefs {
  if (state.notificationPrefs) {
    const { enabled, hour, minute } = state.notificationPrefs;
    if (
      typeof enabled === "boolean" &&
      Number.isFinite(hour) &&
      Number.isFinite(minute) &&
      hour >= 0 && hour <= 23 &&
      minute >= 0 && minute <= 59
    ) {
      return { enabled, hour, minute };
    }
  }
  return DEFAULT_NOTIFICATION_PREFS;
}

export default function Settings() {
  const { state, setState } = useAppState();
  const prefs = useMemo(() => readPrefs(state), [state]);

  // The permission state lives in the browser, not in our state, so we
  // re-read it on every render. The "Enable notifications" button does a
  // hard `requestPermission()` which is the only way to flip a "default"
  // state to "granted".
  const [permission, setPermission] = useState<NotificationPermission>(
    () => getNotificationPermission(),
  );

  // Track whether we've already prompted in this session. We avoid
  // re-prompting on every render — once the user has seen the browser
  // dialog we leave the choice alone.
  const [askedThisSession, setAskedThisSession] = useState<boolean>(
    () => hasAskedThisSession(),
  );

  // Test-notification feedback (transient).
  const [testMsg, setTestMsg] = useState<string | null>(null);

  const updatePrefs = useCallback(
    (patch: Partial<NotificationPrefs>) => {
      const next: NotificationPrefs = { ...prefs, ...patch };
      setState((s) => ({ ...s, notificationPrefs: next }));
    },
    [prefs, setState],
  );

  const handleToggleEnabled = useCallback(
    (next: boolean) => {
      updatePrefs({ enabled: next });
    },
    [updatePrefs],
  );

  const handleTimeChange = useCallback(
    (next: { hour: number; minute: number }) => {
      updatePrefs(next);
    },
    [updatePrefs],
  );

  const handleEnableClick = useCallback(async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    setAskedThisSession(true);
    if (result === "granted" && !prefs.enabled) {
      // Auto-enable the toggle when the user grants permission.
      updatePrefs({ enabled: true });
    }
  }, [prefs.enabled, updatePrefs]);

  const handleTestNotification = useCallback(async () => {
    // Ensure permission first; this also covers the "default" path.
    let perm = getNotificationPermission();
    if (perm === "default" && !askedThisSession) {
      perm = await requestNotificationPermission();
      setPermission(perm);
      setAskedThisSession(true);
    }
    if (perm !== "granted") {
      setTestMsg(
        perm === "denied"
          ? "Notifications are blocked. Enable them in your browser settings."
          : "Permission not granted yet.",
      );
      return;
    }
    // Local-only "test" — uses the same body shape as the real digest,
    // with a stand-in count so the user can see what the production push
    // looks like. We don't read plant state here — that's the server's
    // job (see `sendDailyDigest`).
    const sampleCount = Math.max(1, state.plants.length);
    const body = digestBody(sampleCount);
    const fired = sendLocalNotification("Plant care", body, {
      url: "#/today",
      tag: "plant-pwa:test",
    });
    setTestMsg(
      fired
        ? `Test notification sent: "${body}"`
        : "Could not fire notification (permission changed).",
    );
  }, [askedThisSession, state.plants.length]);

  return (
    <section className="mx-auto max-w-screen-sm px-4 py-8">
      <h2 className="text-2xl font-bold tracking-tight text-stone-900">
        Settings
      </h2>
      <p className="mt-2 text-sm text-stone-600">
        Notification preferences, daily digest time, and app stats.
      </p>

      {/* ── Notifications (slice #8) ───────────────────────────────── */}
      <h3 className="mt-8 text-sm font-semibold uppercase tracking-wide text-stone-500">
        Notifications
      </h3>
      <div className="mt-3 space-y-3">
        <NotificationToggle
          label="Daily morning reminder"
          hint="One push per day with a summary of today's care."
          checked={prefs.enabled}
          onChange={handleToggleEnabled}
          testId="toggle-notifications"
        />

        <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-stone-800">
              Digest time
            </p>
            <p className="mt-0.5 text-xs text-stone-500">
              {prefs.enabled
                ? "Your local time. We send the push at this hour."
                : "Enable notifications to change the time."}
            </p>
          </div>
          <TimePicker
            hour={prefs.hour}
            minute={prefs.minute}
            onChange={handleTimeChange}
            disabled={!prefs.enabled}
          />
        </div>

        <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-stone-800">
              Browser permission
            </p>
            <p className="mt-0.5 text-xs text-stone-500" data-testid="permission-state">
              Permission: <span className="font-medium">{permission}</span>
            </p>
          </div>
          {permission === "default" ? (
            <button
              type="button"
              onClick={handleEnableClick}
              className="rounded-lg bg-leaf-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-leaf-700"
              data-testid="enable-notifications"
            >
              Enable notifications
            </button>
          ) : permission === "denied" ? (
            <span className="text-xs text-amber-700">
              Permission denied — enable in browser settings
            </span>
          ) : (
            <span className="text-xs text-stone-500">Granted</span>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-stone-800">
              Send test notification
            </p>
            <p className="mt-0.5 text-xs text-stone-500">
              Fires a local push with the same copy as the morning digest.
            </p>
          </div>
          <button
            type="button"
            onClick={handleTestNotification}
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
            data-testid="test-notification"
          >
            Send test
          </button>
        </div>
        {testMsg ? (
          <p className="px-1 text-xs text-stone-600" role="status">
            {testMsg}
          </p>
        ) : null}
      </div>

      {/* ── App stats (issue #9 stub) ──────────────────────────────── */}
      <h3 className="mt-10 text-sm font-semibold uppercase tracking-wide text-stone-500">
        App stats
      </h3>
      <div className="mt-3 space-y-3">
        <StatRow label="Plants" value={String(state.plants.length)} />
        <StatRow
          label="Care actions this month"
          value={String(
            state.plants.reduce((sum, p) => sum + p.completionLog.length, 0),
          )}
          hint="Detailed monthly breakdown arrives in the next update."
        />

        <button
          type="button"
          disabled
          className="w-full cursor-not-allowed rounded-lg border border-stone-200 bg-white px-4 py-3 text-left text-sm font-medium text-stone-400"
          title="Reset app arrives in the next update."
          data-testid="reset-app-stub"
        >
          Reset app <span className="ml-2 text-xs">(coming soon)</span>
        </button>
      </div>
    </section>
  );
}

function StatRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3">
      <span className="text-sm font-medium text-stone-800">{label}</span>
      <div className="text-right">
        <span className="text-sm font-semibold text-stone-900">{value}</span>
        {hint ? <p className="mt-0.5 text-xs text-stone-500">{hint}</p> : null}
      </div>
    </div>
  );
}