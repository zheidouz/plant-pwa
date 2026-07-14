// Plant detail page (`/plant/:id`).
//
// Slice #5 acceptance criteria:
//   - Render: hero photo, common + scientific name (inline rename), care-tip
//     blurb with "AI suggestion" tag, rules (one row per enabled care type)
//     with edit, "Mark as done" button per enabled care type, last 5 completions
//   - When a plant has no rules, fire `generateSchedule` once on mount and
//     persist the result via `updatePlant`
//   - Renaming, editing a rule, and "Mark as done" all re-render immediately
//     because they read off `useAppState`
//
// We deliberately removed the slice #4 swipe-to-delete affordance for
// budget reasons. A small "Back" link remains; the un-rename / remove
// action can come back in a later polish slice.

import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAppState } from "../hooks/useAppState";
import { generateSchedule } from "../lib/api";
import type { CareType, CompletionEntry, Plant, ScheduleRule } from "../domain";
import {
  computeNextDue,
} from "../domain";
import CareTip from "../components/CareTip";
import RuleEditor from "../components/RuleEditor";
import CompletionRow from "../components/CompletionRow";

const CARE_TYPE_META: Record<CareType, { emoji: string; label: string }> = {
  water: { emoji: "💧", label: "Water" },
  fertilize: { emoji: "🌱", label: "Fertilize" },
  mist: { emoji: "💨", label: "Mist" },
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function nextDueLabel(plant: Plant, careType: CareType, now: Date): string {
  const iso = computeNextDue(plant, careType, now);
  if (!iso) return "—";
  const ms = new Date(iso).getTime();
  const days = Math.round((ms - now.getTime()) / MS_PER_DAY);
  if (days <= 0) return "Due now";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

export default function PlantRoute() {
  const { id } = useParams<{ id: string }>();
  const { state, updatePlant } = useAppState();
  const plant = state.plants.find((p) => p.id === id);
  const now = new Date();

  // Track which plant we auto-loaded a schedule for so we never fire twice.
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(plant?.commonName ?? "");

  // Fire generateSchedule on mount if the plant has no rules yet.
  useEffect(() => {
    if (!plant) return;
    if (plant.rules.length > 0) return;
    if (loadingSchedule) return;
    let cancelled = false;
    setLoadingSchedule(true);
    (async () => {
      try {
        const r = await generateSchedule({
          scientificName: plant.scientificName,
          commonName: plant.commonName,
          locale: plant.locale || "en-US",
          createdAt: plant.createdAt,
        });
        if (cancelled) return;
        updatePlant(plant.id, { rules: r.rules, careTip: r.careTip });
      } catch {
        // Silent fallback — the page shows the CareTip generic copy.
        if (!cancelled) {
          updatePlant(plant.id, {
            careTip: "Water when the top inch of soil is dry.",
            rules: [
              { careType: "water", cadenceDays: 7, enabled: true },
              { careType: "fertilize", cadenceDays: 30, enabled: true },
              { careType: "mist", cadenceDays: 3, enabled: false },
            ],
          });
        }
      } finally {
        if (!cancelled) setLoadingSchedule(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // We intentionally only run this on first mount per plant. `plant.id`
    // is stable in v1 (no routing-driven remount).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plant?.id]);

  const handleRuleSave = useCallback(
    (next: ScheduleRule) => {
      if (!plant) return;
      const existing = plant.rules.find((r) => r.careType === next.careType);
      const rules = existing
        ? plant.rules.map((r) => (r.careType === next.careType ? next : r))
        : [...plant.rules, next];
      updatePlant(plant.id, { rules });
    },
    [plant, updatePlant],
  );

  const handleMarkDone = useCallback(
    (careType: CareType) => {
      if (!plant) return;
      const entry: CompletionEntry = {
        careType,
        completedAt: new Date().toISOString(),
      };
      updatePlant(plant.id, {
        completionLog: [...plant.completionLog, entry],
      });
    },
    [plant, updatePlant],
  );

  const commitRename = useCallback(() => {
    if (!plant) return;
    const v = draftName.trim();
    if (!v) {
      setDraftName(plant.commonName);
      setRenaming(false);
      return;
    }
    if (v !== plant.commonName) updatePlant(plant.id, { commonName: v });
    setRenaming(false);
  }, [plant, draftName, updatePlant]);

  if (!plant) {
    return (
      <section className="mx-auto max-w-screen-sm px-4 py-8">
        <Link to="/" className="text-sm text-leaf-700 hover:underline">
          ← Back to Today
        </Link>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-stone-900">
          Plant not found
        </h2>
        <p className="mt-2 text-sm text-stone-600">
          This plant isn't in your collection anymore.
        </p>
        <Link
          to="/"
          className="mt-4 inline-block rounded-lg bg-leaf-600 px-3 py-2 text-sm font-medium text-white"
        >
          Go to Today
        </Link>
      </section>
    );
  }

  const sortedCompletions = [...plant.completionLog].sort((a, b) =>
    a.completedAt < b.completedAt ? 1 : -1,
  );
  const lastFive = sortedCompletions.slice(0, 5);
  const enabledRules = plant.rules.filter((r) => r.enabled);

  return (
    <section className="mx-auto max-w-screen-sm px-4 py-8">
      <Link to="/my-plants" className="text-sm text-leaf-700 hover:underline">
        ← Back to My Plants
      </Link>

      {/* Hero */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <img
          src={plant.photoDataUrl}
          alt={plant.commonName}
          className="h-64 w-full object-cover"
        />
        <div className="space-y-1 p-4">
          {renaming ? (
            <input
              type="text"
              autoFocus
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") {
                  setDraftName(plant.commonName);
                  setRenaming(false);
                }
              }}
              className="w-full rounded border border-leaf-400 px-2 py-1 text-xl font-bold tracking-tight text-stone-900"
              data-testid="rename-input"
            />
          ) : (
            <h2
              role="button"
              tabIndex={0}
              onClick={() => {
                setDraftName(plant.commonName);
                setRenaming(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  setDraftName(plant.commonName);
                  setRenaming(true);
                }
              }}
              className="cursor-pointer text-xl font-bold tracking-tight text-stone-900"
              data-testid="plant-name"
            >
              {plant.commonName}
            </h2>
          )}
          {plant.scientificName ? (
            <p className="text-sm italic text-stone-500">{plant.scientificName}</p>
          ) : null}
        </div>
      </div>

      {/* Care tip */}
      <div className="mt-4">
        <CareTip
          careTip={plant.careTip ?? null}
          status={loadingSchedule && plant.rules.length === 0 ? "generating" : "ready"}
        />
      </div>

      {/* Rules */}
      <div className="mt-6 space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          Care rules
        </h3>
        {loadingSchedule && plant.rules.length === 0 ? (
          <p className="rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm text-stone-500">
            Generating schedule…
          </p>
        ) : plant.rules.length === 0 ? (
          <p className="rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm text-stone-500">
            No rules yet. Edit a rule above to add one.
          </p>
        ) : (
          plant.rules.map((rule) => (
            <RuleEditor
              key={rule.careType}
              rule={rule}
              onSave={(next) => handleRuleSave(next)}
            />
          ))
        )}
      </div>

      {/* Mark as done (enabled rules only) */}
      {enabledRules.length > 0 ? (
        <div className="mt-6 space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            Mark as done
          </h3>
          {enabledRules.map((rule) => {
            const meta = CARE_TYPE_META[rule.careType];
            return (
              <div
                key={rule.careType}
                className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white p-3 text-sm"
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden>{meta.emoji}</span>
                  <span className="font-medium text-stone-800">{meta.label}</span>
                  <span className="text-xs text-stone-500">
                    {nextDueLabel(plant, rule.careType, now)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => handleMarkDone(rule.careType)}
                  className="rounded-md bg-leaf-600 px-3 py-1 text-xs font-medium text-white hover:bg-leaf-700"
                  data-testid={`mark-done-${rule.careType}`}
                >
                  Mark as done
                </button>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Last 5 completions */}
      {lastFive.length > 0 ? (
        <div className="mt-6 space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            Recent care
          </h3>
          <ul className="space-y-1">
            {lastFive.map((entry, i) => (
              <CompletionRow key={`${entry.completedAt}-${i}`} entry={entry} now={now} />
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-6 text-xs text-stone-500">
        Plant removal is owned by issue #6.
      </p>
    </section>
  );
}
