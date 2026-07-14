// Floating action button. Slice #4 wires it to the camera-capture flow via
// the `onClick` prop supplied by `Layout`. Before this slice it was an inert
// placeholder; we keep the same markup so Layout consumers don't need to
// change their imports.
export interface FabProps {
  onClick?: () => void;
}

export default function Fab({ onClick }: FabProps) {
  return (
    <button
      type="button"
      aria-label="Add a plant"
      onClick={onClick}
      className="pointer-events-auto fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-leaf-600 text-2xl text-white shadow-lg shadow-leaf-600/30 transition-transform active:scale-95"
      data-testid="fab"
    >
      <span aria-hidden>📷</span>
    </button>
  );
}
