import { useNavigate } from "react-router-dom";

export interface MyPlantsPillProps {
  count: number;
}

/**
 * Small pill pinned to the top of the Today screen.
 *
 * Tapping navigates to /#/my-plants. Issue #9 will fill the screen with
 * the full collection; this is just the entry-point / UX anchor.
 */
export default function MyPlantsPill({ count }: MyPlantsPillProps) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate("/#/my-plants")}
      className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700 ring-1 ring-stone-200 transition hover:bg-stone-200"
      data-testid="my-plants-pill"
    >
      <span aria-hidden>🌿</span>
      <span>My Plants ({count})</span>
    </button>
  );
}
