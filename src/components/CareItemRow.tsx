import { useNavigate } from "react-router-dom";
import type { CareType, Plant } from "../domain";
import { dayDelta } from "../lib/relativeDay";

const CARE_EMOJI: Record<CareType, string> = {
  water: "💧",
  fertilize: "🌱",
  mist: "💦",
};
const CARE_LABEL: Record<CareType, string> = {
  water: "Water",
  fertilize: "Fertilize",
  mist: "Mist",
};

export interface CareItemRowProps {
  plant: Plant;
  careType: CareType;
  /** Date the action is due (or was due). */
  dueAt: Date;
  /** Reference clock. */
  now: Date;
  /** Section context — labels for "in 2 days" vs "today" differ slightly. */
  variant: "today" | "upcoming";
  /** Tap on the body navigates to the plant detail page. */
  onOpenPlant: (plantId: string) => void;
  /** Optional "Mark done" inline button (today + overdue only). */
  onMarkDone?: (plantId: string, careType: CareType) => void;
}

/**
 * A single row in the Today / Upcoming list.
 *
 * Layout: [thumb] [name + meta (care emoji + relative time)]
 *                            [optional Mark-done button when overdue]
 */
export default function CareItemRow({
  plant,
  careType,
  dueAt,
  now,
  variant,
  onOpenPlant,
  onMarkDone,
}: CareItemRowProps) {
  const navigate = useNavigate();
  const delta = dayDelta(dueAt, now); // positive = future, negative = past
  const isOverdue = delta < 0;
  const relative =
    variant === "today" ? relativeLabelForToday(delta) : relativeLabelForUpcoming(delta);

  const handleBodyTap = () => {
    onOpenPlant(plant.id);
    navigate(`/#/plant/${plant.id}`);
  };
  const handleMarkDone = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkDone?.(plant.id, careType);
  };

  return (
    <button
      type="button"
      onClick={handleBodyTap}
      className="flex w-full items-center gap-3 rounded-lg border border-stone-200 bg-white px-3 py-2 text-left transition active:scale-[0.99] hover:bg-stone-50"
      data-testid={`care-row-${plant.id}-${careType}`}
    >
      <img
        src={plant.photoDataUrl}
        alt=""
        aria-hidden
        className="h-12 w-12 flex-none rounded-md border border-stone-200 object-cover"
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-stone-900">
          {plant.commonName}
        </div>
        <div
          className={
            "mt-0.5 text-xs " +
            (isOverdue ? "font-semibold text-amber-700" : "text-stone-600")
          }
        >
          <span aria-hidden className="mr-1">
            {CARE_EMOJI[careType]}
          </span>
          {CARE_LABEL[careType]} · {relative}
          {isOverdue ? (
            <span
              className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800"
              data-testid="overdue-badge"
            >
              Overdue
            </span>
          ) : null}
        </div>
      </div>
      {isOverdue && onMarkDone ? (
        <button
          type="button"
          onClick={handleMarkDone}
          className="ml-2 flex-none rounded-md bg-leaf-600 px-2 py-1 text-xs font-medium text-white"
          data-testid={`mark-done-${plant.id}-${careType}`}
          aria-label={`Mark ${CARE_LABEL[careType]} done for ${plant.commonName}`}
        >
          Done
        </button>
      ) : null}
    </button>
  );
}

function relativeLabelForToday(delta: number): string {
  if (delta === 0) return "today";
  if (delta < 0) return `${Math.abs(delta)} ${Math.abs(delta) === 1 ? "day" : "days"} overdue`;
  return "later today";
}

function relativeLabelForUpcoming(delta: number): string {
  if (delta === 1) return "Tomorrow";
  return `in ${delta} days`;
}
