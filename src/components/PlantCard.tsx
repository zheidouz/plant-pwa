import { useNavigate } from "react-router-dom";
import { ALL_CARE_TYPES, type Plant } from "../domain";
import { nextDueLabel, nextDueDays } from "../lib/nextDueLabel";

/**
 * `PlantCard` — single tile for the My Plants grid.
 *
 * Shows a photo thumbnail, the common name, and the soonest-due care
 * action (care-type emoji + relative-day label). Tapping the card
 * navigates to `/#/plant/:id`.
 */
export interface PlantCardProps {
  plant: Plant;
  now: Date;
}

const CARE_EMOJI: Record<string, string> = {
  water: "💧",
  fertilize: "🌱",
  mist: "🌫️",
};

const CARE_LABEL: Record<string, string> = {
  water: "Water",
  fertilize: "Fertilize",
  mist: "Mist",
};

export default function PlantCard({ plant, now }: PlantCardProps) {
  const navigate = useNavigate();

  // Find the soonest-due care action across all enabled rules.
  // `nextDueDays` is null when the rule is disabled / missing.
  let best: {
    careType: typeof ALL_CARE_TYPES[number];
    days: number;
  } | null = null;

  for (const careType of ALL_CARE_TYPES) {
    const days = nextDueDays(plant, careType, now);
    if (days === null) continue;
    if (best === null || days < best.days) {
      best = { careType, days };
    }
  }

  const label =
    best === null
      ? "No active care schedule"
      : `${CARE_EMOJI[best.careType] ?? "•"} ${CARE_LABEL[best.careType] ?? best.careType} ${nextDueLabel(
          plant,
          best.careType,
          now,
        )}`;

  const isOverdue = best !== null && best.days < 0;

  return (
    <button
      type="button"
      onClick={() => navigate(`/#/plant/${plant.id}`)}
      className="group flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white text-left shadow-sm transition hover:border-leaf-300 hover:shadow"
      data-testid={`plant-card-${plant.id}`}
    >
      <div className="aspect-square w-full overflow-hidden bg-stone-100">
        {plant.photoDataUrl ? (
          <img
            src={plant.photoDataUrl}
            alt={plant.commonName}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl text-stone-400">
            🪴
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="truncate text-sm font-semibold text-stone-900">
          {plant.commonName}
        </p>
        {plant.scientificName ? (
          <p className="truncate text-xs italic text-stone-500">
            {plant.scientificName}
          </p>
        ) : null}
        <p
          className={
            "mt-1 text-xs " +
            (isOverdue ? "font-medium text-red-600" : "text-stone-600")
          }
        >
          {label}
        </p>
      </div>
    </button>
  );
}
