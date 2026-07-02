// My Plants — slice #9. Searchable grid of every plant in the user's
// collection, each card showing a photo, the common name, and the
// soonest-due care action. Tapping a card opens the plant detail page.

import { useMemo, useState } from "react";
import { useAppState } from "../hooks/useAppState";
import PlantCard from "../components/PlantCard";

export default function MyPlants() {
  const { state } = useAppState();
  const [query, setQuery] = useState<string>("");

  // `now` is a render-time snapshot. We don't need millisecond accuracy
  // for a human-readable relative-day label, and re-evaluating on each
  // render keeps the data fresh without an effect.
  const now = useMemo(() => new Date(), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return state.plants;
    return state.plants.filter((p) =>
      p.commonName.toLowerCase().includes(q),
    );
  }, [state.plants, query]);

  return (
    <section className="mx-auto max-w-screen-sm px-4 py-8">
      <h2 className="text-2xl font-bold tracking-tight text-stone-900">
        My Plants
      </h2>
      <p className="mt-2 text-sm text-stone-600">
        {state.plants.length === 0
          ? "Your collection will appear here once you start scanning."
          : `${state.plants.length} plant${state.plants.length === 1 ? "" : "s"} in your collection.`}
      </p>

      {/* ── Search input ──────────────────────────────────────────────── */}
      <div className="relative mt-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name…"
          aria-label="Search plants by name"
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 pr-9 text-sm text-stone-900 placeholder:text-stone-400 focus:border-leaf-500 focus:outline-none focus:ring-2 focus:ring-leaf-200"
          data-testid="my-plants-search"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-stone-500 hover:bg-stone-100 hover:text-stone-700"
            data-testid="my-plants-search-clear"
          >
            <span aria-hidden>✕</span>
          </button>
        ) : null}
      </div>

      {/* ── Body — empty state OR grid ────────────────────────────────── */}
      {state.plants.length === 0 ? (
        <div
          className="mt-6 rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center"
          data-testid="my-plants-empty"
        >
          <span aria-hidden className="text-3xl">🌱</span>
          <p className="mt-2 text-sm text-stone-700">
            No plants yet — tap the camera to identify your first.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="mt-6 rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center"
          data-testid="my-plants-no-matches"
        >
          <span aria-hidden className="text-3xl">🔍</span>
          <p className="mt-2 text-sm text-stone-700">
            No matches for “{query}”.
          </p>
        </div>
      ) : (
        <div
          className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3"
          data-testid="my-plants-grid"
        >
          {filtered.map((plant) => (
            <PlantCard key={plant.id} plant={plant} now={now} />
          ))}
        </div>
      )}
    </section>
  );
}
