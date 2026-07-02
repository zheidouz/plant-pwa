/**
 * ExportIcsButton — runs `buildIcs` on the current AppState and hands the
 * resulting `.ics` file to the user via Web Share API (when `files` are
 * shareable) or via a hidden-anchor download as a fallback.
 *
 * Pure-client; never touches the network.
 */
import { useCallback, useState } from "react";
import type { AppState } from "../domain";
import { buildIcs } from "../lib/buildIcs";

interface ExportIcsButtonProps {
  appState: AppState;
  /** Optional className passthrough so callers can position the button. */
  className?: string;
}

const ICS_MIME = "text/calendar;charset=utf-8";
const ICS_FILENAME = "plant-care.ics";

/** Type guard — `navigator.share` + `navigator.canShare` may both exist
 *  but only the file-aware variant is useful here. */
function canShareFiles(): boolean {
  if (typeof navigator === "undefined") return false;
  if (typeof navigator.canShare !== "function") return false;
  // Build a probe file; canShare is feature-detect only and doesn't
  // actually share it.
  const probe = new File(["probe"], ICS_FILENAME, { type: ICS_MIME });
  try {
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

export default function ExportIcsButton({ appState, className }: ExportIcsButtonProps) {
  const [busy, setBusy] = useState(false);

  const handleClick = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const ics = buildIcs(appState, new Date());
      const blob = new Blob([ics], { type: ICS_MIME });
      const file = new File([blob], ICS_FILENAME, { type: ICS_MIME });

      if (canShareFiles() && typeof navigator.share === "function") {
        try {
          await navigator.share({ files: [file], title: "Plant care calendar" });
          return; // shared successfully
        } catch (err) {
          // User cancellation (AbortError) is fine — fall through to the
          // download fallback so the data isn't lost. Any other share
          // failure also falls through.
          if (err instanceof DOMException && err.name === "AbortError") return;
        }
      }

      // Download fallback — desktop browsers, Firefox, etc.
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = ICS_FILENAME;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Give the browser a tick to start the download before revoking.
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } finally {
      setBusy(false);
    }
  }, [appState, busy]);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      data-testid="export-ics"
      className={
        className ??
        "inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 shadow-sm hover:bg-stone-50 disabled:opacity-50"
      }
    >
      <span aria-hidden>📅</span>
      <span>Export to calendar</span>
    </button>
  );
}