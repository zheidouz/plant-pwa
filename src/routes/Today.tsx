// Today route — home screen.
//
// Slice #6 acceptance criteria (issue #6 — Today screen with dying banner):
//   - Three sections, in order: Dying → Today → Upcoming
//   - Dying banner auto-renders when ANY plant matches the `isDying`
//     contract; auto-disappears on next render when the overdue care is
//     marked done on the detail page (no manual dismiss).
//   - Today section groups by care type, overdue items pulled to the top
//     with a clear visual indicator.
//   - Upcoming shows the next 3 days, collapsed by default with a chevron.
//   - FAB lives in `Layout` and dispatches `plant-pwa:open-capture` /
//     `plant-pwa:capture` custom events here.
//   - Empty state when there are zero plants; MyPlantsPill is always shown
//     as a UX anchor (issue #9 will own the /#/my-plants screen).
//
// We preserve the slice #4 5-state identify machine (idle → organ →
// identifying → result → error), the identify-result modal, the
// NoNetwork guard, and the auto-add + Undo-snackbar flow on success.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import NoNetwork from "../components/NoNetwork";
import OrganSelector from "../components/OrganSelector";
import IdentifyResultModal from "../components/IdentifyResultModal";
import UndoSnackbar from "../components/UndoSnackbar";
import DyingBanner from "../components/DyingBanner";
import TodaySection from "../components/TodaySection";
import UpcomingSection from "../components/UpcomingSection";
import EmptyState from "../components/EmptyState";
import MyPlantsPill from "../components/MyPlantsPill";
import { identifyPlant, IdentifyError, generateSchedule } from "../lib/api";
import { blobToDataUrl } from "../components/CaptureModal";
import {
  type IdentifyResult,
  type Organ,
} from "../lib/identifyTypes";
import { useAppState } from "../hooks/useAppState";
import {
  isDying,
  type CareType,
  type Plant,
} from "../domain";

interface CapturedShot {
  image: HTMLImageElement;
  blob: Blob;
  dataUrl: string;
}

export default function Today() {
  const navigate = useNavigate();
  const { state, addPlant, removePlant, updatePlant } = useAppState();
  const plants = state.plants;

  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [stage, setStage] = useState<"idle" | "organ" | "identifying" | "result" | "error">(
    "idle",
  );
  const [shot, setShot] = useState<CapturedShot | null>(null);
  const [organ, setOrgan] = useState<Organ | null>(null);
  const [result, setResult] = useState<IdentifyResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [addedPlantId, setAddedPlantId] = useState<string | null>(null);

  // `now` is captured once per render. Section reads (Dying / Today /
  // Upcoming) all use the same clock so a render is internally consistent.
  const now = useMemo(() => new Date(), []);

  // Online detection — unchanged from the previous slice.
  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Listen for the Layout-owned FAB / capture events.
  useEffect(() => {
    function onOpen() {
      if (!navigator.onLine) return;
      setStage("idle");
    }
    async function onCapture(ev: Event) {
      const detail = (ev as CustomEvent<CapturedShot>).detail;
      setShot(detail);
      setOrgan(null);
      setErrorMsg(null);
      setStage("organ");
    }
    window.addEventListener("plant-pwa:open-capture", onOpen);
    window.addEventListener("plant-pwa:capture", onCapture as EventListener);
    return () => {
      window.removeEventListener("plant-pwa:open-capture", onOpen);
      window.removeEventListener("plant-pwa:capture", onCapture as EventListener);
    };
  }, []);

  const handleConfirmOrgan = useCallback(async () => {
    if (!shot || !organ) return;
    setStage("identifying");
    setErrorMsg(null);
    try {
      const dataUrl = await blobToDataUrl(shot.blob);
      const imageBase64 = dataUrl.replace(/^data:[^;]+;base64,/, "");
      const r = await identifyPlant(imageBase64, organ);
      setResult(r);
      setStage("result");
    } catch (err) {
      const msg =
        err instanceof IdentifyError
          ? err.message
          : "Identification failed. Please try again.";
      setErrorMsg(msg);
      setStage("error");
    }
  }, [shot, organ]);

  const handleAdd = useCallback(() => {
    if (!result || !shot) return;
    const top = result.topCandidate;
    const plant: Plant = {
      id: crypto.randomUUID(),
      commonName: top.commonName,
      scientificName: top.scientificName,
      photoDataUrl: shot.dataUrl,
      identificationSource: result.source,
      plantnetConfidence: result.source === "plantnet" ? top.confidence : undefined,
      locale:
        typeof navigator !== "undefined" && "language" in navigator
          ? navigator.language
          : "en-US",
      createdAt: new Date().toISOString(),
      rules: [],
      completionLog: [],
    };
    addPlant(plant);
    setAddedPlantId(plant.id);
    setStage("idle");
    setShot(null);
    setOrgan(null);
    setResult(null);

    // Fire-and-forget schedule generation. Errors are swallowed — the
    // detail page will retry on mount.
    void (async () => {
      try {
        const r = await generateSchedule({
          scientificName: top.scientificName,
          commonName: top.commonName,
          locale: plant.locale,
          createdAt: plant.createdAt,
        });
        updatePlant(plant.id, { rules: r.rules, careTip: r.careTip });
      } catch {
        // Silent — the user lands on the detail page and the page itself
        // will retry.
      }
    })();
  }, [result, shot, addPlant, updatePlant]);

  const handleRetry = useCallback(() => {
    setStage("organ");
    setResult(null);
  }, []);

  const handleUndo = useCallback(() => {
    if (addedPlantId) removePlant(addedPlantId);
    setAddedPlantId(null);
  }, [addedPlantId, removePlant]);

  const handleSnackbarExpire = useCallback(() => {
    setAddedPlantId(null);
  }, []);

  // ── Home-screen wiring (issue #6) ────────────────────────────────────

  /** Dying plants — recomputed every render. Cheap predicate on a few items. */
  const dying = useMemo(() => plants.filter((p) => isDying(p, now)), [plants, now]);

  /** Open the plant detail page. */
  const openPlant = useCallback(
    (plantId: string) => {
      navigate(`/#/plant/${plantId}`);
    },
    [navigate],
  );

  /**
   * Mark a care action as done from the Today row. Appends to the
   * completion log; next render of the section will re-evaluate
   * `isDying` and `computeNextDue`, causing the plant to drop out of
   * Today / Dying automatically.
   */
  const markDone = useCallback(
    (plantId: string, careType: CareType) => {
      const target = plants.find((p) => p.id === plantId);
      if (!target) return;
      const entry = { careType, completedAt: new Date().toISOString() };
      updatePlant(plantId, {
        completionLog: [...target.completionLog, entry],
      });
    },
    [plants, updatePlant],
  );

  // ── Render ───────────────────────────────────────────────────────────

  if (!online) return <NoNetwork />;

  return (
    <section className="mx-auto max-w-screen-sm px-4 py-6">
      {/* Header strip: title + MyPlantsPill, side-by-side on small screens. */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-tight text-stone-900">Today</h2>
        <MyPlantsPill count={plants.length} />
      </div>

      {/* Identify-flow panels — only render when not idle, so the home
          sections don't compete with the capture UI. */}
      {stage === "organ" && shot ? (
        <div className="mt-6 space-y-4">
          <img
            src={shot.dataUrl}
            alt="Captured plant"
            className="mx-auto max-h-64 rounded-xl border border-stone-200 object-contain"
          />
          <p className="text-sm text-stone-700">Which organ did you photograph?</p>
          <OrganSelector
            image={shot.image}
            value={organ}
            onChange={setOrgan}
          />
          <button
            type="button"
            onClick={handleConfirmOrgan}
            disabled={!organ}
            className="w-full rounded-lg bg-leaf-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            data-testid="confirm-organ"
          >
            Identify plant
          </button>
        </div>
      ) : null}

      {stage === "identifying" ? (
        <p className="mt-6 text-sm text-stone-500" role="status">
          Identifying… this can take a moment.
        </p>
      ) : null}

      {stage === "result" && result && shot ? (
        <IdentifyResultModal
          result={result}
          photoDataUrl={shot.dataUrl}
          onAdd={handleAdd}
          onRetry={handleRetry}
        />
      ) : null}

      {stage === "error" ? (
        <div
          role="alert"
          className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
        >
          {errorMsg ?? "Something went wrong."}
          <button
            type="button"
            onClick={handleRetry}
            className="ml-2 font-medium underline"
          >
            Try again
          </button>
        </div>
      ) : null}

      {/* Home-screen sections — only when the identify flow is idle. */}
      {stage === "idle" ? (
        <div className="mt-6 space-y-6">
          {/* 1. Dying banner — auto-shown when at least one plant matches isDying. */}
          <DyingBanner dying={dying} onTap={openPlant} />

          {/* 2. Empty state OR Today + Upcoming. */}
          {plants.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <TodaySection
                plants={plants}
                now={now}
                onMarkDone={markDone}
                onOpenPlant={openPlant}
              />
              <UpcomingSection
                plants={plants}
                now={now}
                onOpenPlant={openPlant}
              />
            </>
          )}
        </div>
      ) : null}

      <UndoSnackbar
        visible={addedPlantId !== null}
        onUndo={handleUndo}
        onExpire={handleSnackbarExpire}
      />
    </section>
  );
}
