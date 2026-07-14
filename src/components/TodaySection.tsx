import { useMemo } from "react";
import type { CareType, CompletionEntry, Plant } from "../domain";
import { ALL_CARE_TYPES, computeNextDue } from "../domain";
import CareItemRow from "./CareItemRow";

export interface TodaySectionProps {
  plants: Plant[];
  now: Date;
  onMarkDone: (plantId: string, careType: CareType) => void;
  onOpenPlant: (plantId: string) => void;
}

interface CareItem {
  plantId: string;
  plant: Plant;
  careType: CareType;
  dueAt: Date;
}

/** End-of-day on the `now` date — used to bucket "today" items. */
function endOfToday(now: Date): Date {
  const e = new Date(now);
  e.setHours(23, 59, 59, 999);
  return e;
}

/**
 * Build the list of "today" care items:
 *   - For each plant
 *   - For each enabled rule (water / fertilize / mist)
 *   - If computeNextDue(...) falls on today's calendar date OR is in the past,
 *     include it. Overdue flag = strictly in the past.
 */
function buildTodayItems(plants: Plant[], now: Date): CareItem[] {
  const cutoff = endOfToday(now).getTime();
  const items: CareItem[] = [];
  for (const plant of plants) {
    for (const careType of ALL_CARE_TYPES) {
      const iso = computeNextDue(plant, careType, now);
      if (iso == null) continue;
      const dueAt = new Date(iso);
      if (Number.isNaN(dueAt.getTime())) continue;
      if (dueAt.getTime() > cutoff) continue; // future beyond today
      items.push({ plantId: plant.id, plant, careType, dueAt });
    }
  }
  return items;
}

/**
 * The "📅 Today" section.
 *
 * Groups items by care type (water / fertilize / mist). Within each group,
 * overdue items come first (most-overdue first), then today's items sorted
 * by plant name.
 */
export default function TodaySection({
  plants,
  now,
  onMarkDone,
  onOpenPlant,
}: TodaySectionProps) {
  const items = useMemo(() => buildTodayItems(plants, now), [plants, now]);

  // Group by careType, preserving ALL_CARE_TYPES order.
  const grouped = useMemo(() => {
    const map = new Map<CareType, CareItem[]>();
    for (const careType of ALL_CARE_TYPES) {
      map.set(careType, []);
    }
    for (const it of items) {
      map.get(it.careType)!.push(it);
    }
    // Sort each group: overdue first by most-overdue, then by plant name.
    for (const [, list] of map) {
      list.sort((a, b) => {
        const aOverdue = a.dueAt.getTime() < now.getTime();
        const bOverdue = b.dueAt.getTime() < now.getTime();
        if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
        if (aOverdue && bOverdue) return a.dueAt.getTime() - b.dueAt.getTime(); // oldest first
        return a.plant.commonName.localeCompare(b.plant.commonName);
      });
    }
    return map;
  }, [items, now]);

  // Hide empty groups entirely.
  const visibleGroups = ALL_CARE_TYPES.filter((c) => (grouped.get(c)?.length ?? 0) > 0);
  if (visibleGroups.length === 0) return null;

  return (
    <section className="mt-6" aria-label="Today" data-testid="today-section">
      <h3 className="text-lg font-semibold text-stone-900">📅 Today</h3>

      <div className="mt-3 space-y-5">
        {visibleGroups.map((careType) => (
          <CareGroup
            key={careType}
            careType={careType}
            items={grouped.get(careType)!}
            now={now}
            onMarkDone={onMarkDone}
            onOpenPlant={onOpenPlant}
          />
        ))}
      </div>
    </section>
  );
}

const GROUP_EMOJI: Record<CareType, string> = {
  water: "💧",
  fertilize: "🌱",
  mist: "💦",
};
const GROUP_LABEL: Record<CareType, string> = {
  water: "Watering",
  fertilize: "Fertilizing",
  mist: "Misting",
};

function CareGroup({
  careType,
  items,
  now,
  onMarkDone,
  onOpenPlant,
}: {
  careType: CareType;
  items: CareItem[];
  now: Date;
  onMarkDone: (plantId: string, careType: CareType) => void;
  onOpenPlant: (plantId: string) => void;
}) {
  return (
    <div data-testid={`today-group-${careType}`}>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
        <span aria-hidden className="mr-1">
          {GROUP_EMOJI[careType]}
        </span>
        {GROUP_LABEL[careType]}
      </h4>
      <ul className="mt-2 space-y-2">
        {items.map((it) => (
          <li key={`${it.plantId}-${careType}`}>
            <CareItemRow
              plant={it.plant}
              careType={careType}
              dueAt={it.dueAt}
              now={now}
              variant="today"
              onOpenPlant={onOpenPlant}
              onMarkDone={onMarkDone}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Build a "Mark as done" entry — exported so the route can re-use the shape. */
export function makeCompletionEntry(careType: CareType): CompletionEntry {
  return { careType, completedAt: new Date().toISOString() };
}
