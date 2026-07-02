// Today route — home screen.
//
// Slice #4 acceptance criteria:
//   - Camera FAB opens the capture UI (owned by `Layout`, dispatched here)
//   - Successful ID auto-adds to "My Plants" via the domain layer
//   - 5-second Undo snackbar with re-add on tap
//   - Offline: capture path shows the existing NoNetwork state
//   - Pl@ntNet rate-limit / 500 handled gracefully with a user message
//
// We listen to the FAB's "open-capture" / "capture" custom events because the
// FAB lives in `Layout` (so it's available on every route) and the identify
// pipeline is keyed off the Today screen.

import { useCallback, useEffect, useState } from "react";
import NoNetwork from "../components/NoNetwork";
import OrganSelector from "../components/OrganSelector";
import IdentifyResultModal from "../components/IdentifyResultModal";
import UndoSnackbar from "../components/UndoSnackbar";
import { identifyPlant, IdentifyError } from "../lib/api";
import { blobToDataUrl } from "../components/CaptureModal";
import {
  type IdentifyResult,
  type Organ,
} from "../lib/identifyTypes";
import { useAppState } from "../hooks/useAppState";
import type { Plant } from "../domain";

interface CapturedShot {
  image: HTMLImageElement;
  blob: Blob;
  dataUrl: string;
}

export default function Today() {
  const { addPlant, removePlant } = useAppState();
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

  // Online detection — same shape as the previous slice, kept verbatim.
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
      // The user tapped the FAB while offline — surface the same offline
      // message the rest of the screen shows.
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
      // Schedule rules are filled in by issue #5 (generateSchedule).
      // For the "no schedule yet" render path, we leave an empty array.
      rules: [],
      completionLog: [],
    };
    addPlant(plant);
    setAddedPlantId(plant.id);
    setStage("idle");
    setShot(null);
    setOrgan(null);
    setResult(null);
  }, [result, shot, addPlant]);

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

  if (!online) return <NoNetwork />;

  return (
    <section className="mx-auto max-w-screen-sm px-4 py-8">
      <h2 className="text-2xl font-bold tracking-tight text-stone-900">Today</h2>
      <p className="mt-2 text-sm text-stone-600">
        Nothing to care for yet. Tap the camera button to identify a plant and
        add it to your collection.
      </p>

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

      <UndoSnackbar
        visible={addedPlantId !== null}
        onUndo={handleUndo}
        onExpire={handleSnackbarExpire}
      />
    </section>
  );
}
