// Plant detail page (`/plant/:id`).
//
// Slice #4 acceptance criteria:
//   - Read `:id` URL parameter, look up the plant in AppState
//   - Render photo + name
//   - Swipe-to-delete via pointer events; v1 also exposes a "Delete" button
//     so the action is one tap away even if the swipe is misinterpreted
//     under the 50-call subagent budget

import { useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAppState } from "../hooks/useAppState";

const SWIPE_THRESHOLD = 100; // px of horizontal travel to trigger delete

export default function Plant() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state, removePlant } = useAppState();
  const plant = state.plants.find((p) => p.id === id);

  // Pointer-based drag state for swipe-to-delete.
  const startX = useRef<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [armed, setArmed] = useState(false);

  if (!plant) {
    return (
      <section className="mx-auto max-w-screen-sm px-4 py-8">
        <Link to="/my-plants" className="text-sm text-leaf-700 hover:underline">
          ← Back to My Plants
        </Link>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-stone-900">
          Not found
        </h2>
        <p className="mt-2 text-sm text-stone-600">
          That plant isn't in your collection anymore.
        </p>
      </section>
    );
  }

  function handlePointerDown(e: React.PointerEvent) {
    startX.current = e.clientX;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function handlePointerMove(e: React.PointerEvent) {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    // Only horizontal drags, only leftward (negative dx) reveals delete.
    if (dx < 0) setOffset(Math.max(dx, -160));
    else setOffset(0);
  }
  function handlePointerEnd() {
    if (offset < -SWIPE_THRESHOLD) {
      setArmed(true);
    } else {
      setOffset(0);
    }
    startX.current = null;
  }
  function commitDelete() {
    removePlant(plant!.id);
    navigate("/my-plants", { replace: true });
  }
  function cancelSwipe() {
    setOffset(0);
    setArmed(false);
  }

  return (
    <section className="mx-auto max-w-screen-sm px-4 py-8">
      <Link to="/my-plants" className="text-sm text-leaf-700 hover:underline">
        ← Back to My Plants
      </Link>

      <div
        className="relative mt-4 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
        style={{ transform: `translateX(${offset}px)`, transition: offset === 0 ? "transform 120ms ease" : "none" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        <img
          src={plant.photoDataUrl}
          alt={plant.commonName}
          className="h-64 w-full object-cover"
          draggable={false}
        />
        <div className="space-y-1 p-4">
          <h2 className="text-xl font-bold tracking-tight text-stone-900">
            {plant.commonName}
          </h2>
          {plant.scientificName ? (
            <p className="text-sm italic text-stone-500">{plant.scientificName}</p>
          ) : null}
          <p className="text-xs uppercase tracking-wide text-amber-700">
            ⚠️ AI suggestion — please confirm
          </p>
          {typeof plant.plantnetConfidence === "number" ? (
            <p className="text-xs text-stone-500">
              Confidence: {Math.round(plant.plantnetConfidence * 100)}%
            </p>
          ) : null}
        </div>
        {/* Revealable delete affordance shown when the user swipes left. */}
        {offset < -20 ? (
          <div
            aria-hidden
            className="absolute inset-y-0 right-0 flex w-40 items-center justify-center bg-red-500 text-sm font-semibold text-white"
          >
            Release to delete
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex gap-2">
        {armed ? (
          <>
            <button
              type="button"
              onClick={commitDelete}
              className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white"
              data-testid="confirm-delete"
            >
              Confirm delete
            </button>
            <button
              type="button"
              onClick={cancelSwipe}
              className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setArmed(true)}
            className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            data-testid="delete-button"
          >
            Delete plant
          </button>
        )}
      </div>

      <p className="mt-4 text-xs text-stone-500">
        Care schedule and "Mark as done" controls land in slice #5.
      </p>
    </section>
  );
}
