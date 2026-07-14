/**
 * `UndoSnackbar` — 5-second snackbar that lets the user remove a plant they
 * just auto-added. Per PRD user story #8.
 *
 * Parent owns the `visible` flag + the timeout lifecycle; we just render and
 * fire `onUndo` when the user taps Undo (parent cancels the timer) or
 * `onExpire` when the time runs out (parent can forget about the toast).
 */

import { useEffect } from "react";

export interface UndoSnackbarProps {
  visible: boolean;
  /** Default 5_000 ms. */
  durationMs?: number;
  message?: string;
  onUndo: () => void;
  onExpire: () => void;
}

export default function UndoSnackbar({
  visible,
  durationMs = 5_000,
  message = "Plant added",
  onUndo,
  onExpire,
}: UndoSnackbarProps) {
  useEffect(() => {
    if (!visible) return;
    const t = window.setTimeout(onExpire, durationMs);
    return () => window.clearTimeout(t);
  }, [visible, durationMs, onExpire]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-20 z-40 mx-auto flex max-w-sm items-center justify-between gap-3 rounded-full bg-stone-900/95 px-4 py-2 text-sm text-white shadow-lg"
      data-testid="undo-snackbar"
    >
      <span className="truncate">{message}</span>
      <button
        type="button"
        onClick={onUndo}
        className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide hover:bg-white/20"
        data-testid="undo-button"
      >
        Undo
      </button>
    </div>
  );
}
