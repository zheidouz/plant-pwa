// Settings — slice #8 daily digest + #9 app stats + Reset app.
//
// Sections:
//   1. Notifications — toggle, time picker, permission controls, test
//      notification button (slice #8). Unchanged by #9.
//   2. App stats — plants count + care-actions-this-month (issue #9).
//   3. Reset app — destructive button with confirmation dialog (issue #9).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_NOTIFICATION_PREFS,
  emptyAppState,
  saveAppState,
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

/** Count `CompletionEntry`s completed in the current calendar month. */
function careActionsThisMonth(state: { plants: { completionLog: { completedAt: string }[] }[] }, now: Date): number {
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  let count = 0;
  for (const plant of state.plants) {
    for (const entry of plant.completionLog) {
      const t = new Date(entry.completedAt).getTime();
      if (Number.isFinite(t) && t >= startOfMonth) count += 1;
    }
  }
  return count;
}

export default function Settings() {
  const { state, setState } = useAppState();
  const prefs = useMemo(() => readPrefs(state), [state]);

  const [permission, setPermission] = useState<NotificationPermission>(
    () => getNotificationPermission(),
  );

  const [askedThisSession, setAskedThisSession] = useState<boolean>(
    () => hasAskedThisSession(),
  );

  const [testMsg, setTestMsg] = useState<string | null>(null);

  // "now" for the monthly counter — a render-time snapshot is good enough.
  const now = useMemo(() => new Date(), []);
  const careCount = useMemo(
    () => careActionsThisMonth(state, now),
    [state, now],
  );

  // Reset-app confirmation dialog.
  const resetDialogRef = useRef<HTMLDialogElement | null>(null);
  const openResetDialog = useCallback(() => {
    resetDialogRef.current?.showModal();
  }, []);
  const closeResetDialog = useCallback(() => {
    resetDialogRef.current?.close();
  }, []);
  const handleResetConfirm = useCallback(() => {
    // Persist an empty state, then reload. A full reload guarantees every
    // mounted component re-reads the cleared localStorage on next mount.
    saveAppState(emptyAppState());
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }, []);

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
      updatePrefs({ enabled: true });
    }
  }, [prefs.enabled, updatePrefs]);

  const handleTestNotification = useCallback(async () => {
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

  // Close the dialog when Escape is pressed — the native <dialog> handles
  // this for us, but we listen to make sure local state stays consistent.
  useEffect(() => {
    const node = resetDialogRef.current;
    if (!node) return;
    const onClose = () => {
      /* no-op; dialog is closed */
    };
    node.addEventListener("close", onClose);
    return () => node.removeEventListener("close", onClose);
  }, []);

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

      {/* ── App stats (issue #9) ──────────────────────────────────── */}
      <h3 className="mt-10 text-sm font-semibold uppercase tracking-wide text-stone-500">
        App stats
      </h3>
      <div className="mt-3 space-y-3">
        <StatRow
          label="Plants"
          value={String(state.plants.length)}
          testId="stat-plants"
        />
        <StatRow
          label="Care actions this month"
          value={String(careCount)}
          testId="stat-care-this-month"
        />

        <button
          type="button"
          onClick={openResetDialog}
          className="w-full rounded-lg border border-red-200 bg-white px-4 py-3 text-left text-sm font-medium text-red-700 transition hover:border-red-400 hover:bg-red-50"
          data-testid="reset-app"
        >
          Reset app
        </button>
        <p className="px-1 text-xs text-stone-500">
          Clears every plant and the entire care history. This cannot be undone.
        </p>
      </div>

      {/* ── Reset-app confirmation dialog (HTML5 <dialog>) ─────────── */}
      <dialog
        ref={resetDialogRef}
        className="rounded-2xl border border-stone-200 bg-white p-0 shadow-xl backdrop:bg-black/40"
        data-testid="reset-confirm-dialog"
      >
        <div className="p-5">
          <h4 className="text-base font-semibold text-stone-900">
            Reset app?
          </h4>
          <p className="mt-2 text-sm text-stone-700">
            This will delete all your plants and care history. This cannot be
            undone.
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t border-stone-200 bg-stone-50 px-5 py-3">
          <button
            type="button"
            onClick={closeResetDialog}
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100"
            data-testid="reset-cancel"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleResetConfirm}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
            data-testid="reset-confirm"
          >
            Reset
          </button>
        </div>
      </dialog>
    </section>
  );
}

function StatRow({
  label,
  value,
  hint,
  testId,
}: {
  label: string;
  value: string;
  hint?: string;
  testId?: string;
}) {
  return (
    <div
      className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3"
      data-testid={testId}
    >
      <span className="text-sm font-medium text-stone-800">{label}</span>
      <div className="text-right">
        <span className="text-sm font-semibold text-stone-900">{value}</span>
        {hint ? <p className="mt-0.5 text-xs text-stone-500">{hint}</p> : null}
      </div>
    </div>
  );
}
