import { useMemo, useState } from "react";
import type { CareType, Plant } from "../domain";
import { ALL_CARE_TYPES, computeNextDue } from "../domain";
import CareItemRow from "./CareItemRow";
import { groupByDay } from "../lib/groupByDay";
import { dayDelta, relativeDay } from "../lib/relativeDay";

export interface UpcomingSectionProps {
  plants: Plant[];
  now: Date;
  onOpenPlant: (plantId: string) => void;
}

interface UpcomingItem {
  plantId: string;
  plant: Plant;
  careType: CareType;
  dueAt: Date;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Collect care items due in the next 3 calendar days (tomorrow + day
 * after + 2 days from now = 3 days). Strictly excludes "today" — those
 * belong in the Today section.
 */
function buildUpcomingItems(plants: Plant[], now: Date): UpcomingItem[] {
  const out: UpcomingItem[] = [];
  const startOfTomorrow = (() => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 1);
    return d.getTime();
  })();
  // End of the third upcoming day (i.e. 3 full days from now, inclusive).
  const endOfWindow = startOfTomorrow + 3 * MS_PER_DAY - 1;

  for (const plant of plants) {
    for (const careType of ALL_CARE_TYPES) {
      const iso = computeNextDue(plant, careType, now);
      if (iso == null) continue;
      const dueAt = new Date(iso);
      if (Number.isNaN(dueAt.getTime())) continue;
      const t = dueAt.getTime();
      if (t < startOfTomorrow) continue;
      if (t > endOfWindow) continue;
      out.push({ plantId: plant.id, plant, careType, dueAt });
    }
  }
  return out;
}

/**
 * "⏭️ Upcoming (next 3 days)" section.
 *
 * Collapsed by default. When expanded, items are grouped by day using
 * `groupByDay`, with day buckets sorted chronologically. Within a day,
 * items sort by care type (water/fertilize/mist) then plant name.
 */
export default function UpcomingSection({
  plants,
  now,
  onOpenPlant,
}: UpcomingSectionProps) {
  const [open, setOpen] = useState(false);
  const items = useMemo(() => buildUpcomingItems(plants, now), [plants, now]);

  const grouped = useMemo(() => {
    const map = groupByDay(
      items.map((it) => ({ ...it, at: it.dueAt })),
      now,
    );
    // Sort each bucket by care type order then plant name.
    const order: Record<CareType, number> = { water: 0, fertilize: 1, mist: 2 };
    for (const [, list] of map) {
      list.sort((a, b) => {
        const ao = order[(a as unknown as UpcomingItem).careType];
        const bo = order[(b as unknown as UpcomingItem).careType];
        if (ao !== bo) return ao - bo;
        const ap = (a as unknown as UpcomingItem).plant.commonName;
        const bp = (b as unknown as UpcomingItem).plant.commonName;
        return ap.localeCompare(bp);
      });
    }
    // Return days in chronological order.
    const sortedEntries = Array.from(map.entries()).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    return sortedEntries;
  }, [items, now]);

  if (items.length === 0) return null;

  return (
    <section className="mt-6" aria-label="Upcoming" data-testid="upcoming-section">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg bg-stone-100 px-3 py-2 text-left"
        aria-expanded={open}
        data-testid="upcoming-toggle"
      >
        <span className="text-sm font-semibold text-stone-800">
          ⏭️ Upcoming · next 3 days ({items.length})
        </span>
        <span
          aria-hidden
          className={
            "text-stone-500 transition-transform " +
            (open ? "rotate-90" : "rotate-0")
          }
        >
          ▶
        </span>
      </button>
      {open ? (
        <div className="mt-3 space-y-4">
          {grouped.map(([key, list]) => {
            const sample = (list[0] as unknown as UpcomingItem).dueAt;
            const headerLabel = upcomingHeaderLabel(sample, now);
            return (
              <div key={key} data-testid={`upcoming-day-${key}`}>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                  {headerLabel}
                </h4>
                <ul className="mt-2 space-y-2">
                  {list.map((it) => {
                    const u = it as unknown as UpcomingItem;
                    return (
                      <li key={`${u.plantId}-${u.careType}`}>
                        <CareItemRow
                          plant={u.plant}
                          careType={u.careType}
                          dueAt={u.dueAt}
                          now={now}
                          variant="upcoming"
                          onOpenPlant={onOpenPlant}
                        />
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function upcomingHeaderLabel(sample: Date, now: Date): string {
  const d = dayDelta(sample, now);
  if (d === 1) return "Tomorrow";
  if (d > 1) return `In ${d} days`;
  return relativeDay(sample, now);
}
