import { useNavigate } from "react-router-dom";
import type { Plant } from "../domain";

export interface DyingBannerProps {
  /** Plants currently matching `isDying`. Render is no-op when empty. */
  dying: Plant[];
  /** Tap handler — used for navigation. Banner also navigates via useNavigate. */
  onTap: (plantId: string) => void;
}

/**
 * Red urgent banner pinned at the top of the Today screen.
 *
 * Only renders when `dying.length > 0`. Each plant name is a tappable
 * button that navigates to that plant's detail page.
 */
export default function DyingBanner({ dying, onTap }: DyingBannerProps) {
  const navigate = useNavigate();

  if (dying.length === 0) return null;

  const handleTap = (plantId: string) => {
    onTap(plantId);
    navigate(`/#/plant/${plantId}`);
  };

  return (
    <section
      role="alert"
      aria-label="Plants that need urgent attention"
      className="rounded-xl border border-red-300 bg-red-50 p-3 shadow-sm"
      data-testid="dying-banner"
    >
      <div className="flex items-center gap-2">
        <span aria-hidden className="text-lg">
          🚨
        </span>
        <h3 className="text-sm font-semibold text-red-900">
          {dying.length === 1
            ? "1 plant needs urgent attention"
            : `${dying.length} plants need urgent attention`}
        </h3>
      </div>
      <p className="mt-1 text-xs text-red-800">
        Tap a plant below to open it and mark the overdue care as done. The banner disappears on your next visit.
      </p>
      <ul className="mt-2 space-y-1">
        {dying.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => handleTap(p.id)}
              className="w-full rounded-md bg-white px-3 py-2 text-left text-sm font-medium text-red-900 ring-1 ring-red-200 transition active:scale-[0.99] hover:bg-red-100"
              data-testid={`dying-${p.id}`}
            >
              {p.commonName}
              {p.scientificName ? (
                <span className="ml-1 text-xs italic text-red-700">
                  ({p.scientificName})
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
