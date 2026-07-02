// Floating action button — placeholder. v1 slice deliberately has no onClick;
// later slices (issue #4 / #5) will wire this to the camera capture flow.
export default function Fab() {
  return (
    <button
      type="button"
      aria-label="Add a plant"
      // Render inert — at this slice the FAB has no functionality. Keeping the
      // element in the DOM preserves the visual layout and the click target,
      // so we can attach a handler in a later issue without disturbing callers.
      onClick={(e) => e.preventDefault()}
      className="pointer-events-auto fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-leaf-600 text-2xl text-white shadow-lg shadow-leaf-600/30 transition-transform active:scale-95"
      data-testid="fab"
    >
      <span aria-hidden>📷</span>
    </button>
  );
}
