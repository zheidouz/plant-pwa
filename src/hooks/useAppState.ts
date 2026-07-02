/**
 * `useAppState` — small custom hook that owns the `AppState` shape across
 * the app. Wraps the versioned `loadAppState` / `saveAppState` pair from
 * `src/domain` so route components don't have to repeat the load+persist
 * dance.
 *
 * Returns:
 *   - state:        current `AppState`
 *   - setState:     merge / replace (the underlying setState)
 *   - addPlant:     append a single plant
 *   - removePlant:  remove a plant by id (used by Undo + swipe-to-delete)
 */

import { useCallback, useEffect, useState } from "react";
import {
  emptyAppState,
  loadAppState,
  saveAppState,
  type AppState,
  type Plant,
} from "../domain";

export interface UseAppStateApi {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  addPlant: (plant: Plant) => void;
  removePlant: (id: string) => void;
}

export function useAppState(): UseAppStateApi {
  const [state, setState] = useState<AppState>(() => {
    // Lazy init keeps SSR / unit-test friendly. `loadAppState` is itself
    // corruption-safe (returns empty on any parse error).
    return loadAppState() ?? emptyAppState();
  });

  // Persist on every state change. We persist eagerly (not debounced) because
  // the state is tiny (a few KB at most) and React 18 batching keeps it cheap.
  useEffect(() => {
    saveAppState(state);
  }, [state]);

  const addPlant = useCallback((plant: Plant) => {
    setState((s) => ({ ...s, plants: [...s.plants, plant] }));
  }, []);

  const removePlant = useCallback((id: string) => {
    setState((s) => ({ ...s, plants: s.plants.filter((p) => p.id !== id) }));
  }, []);

  return { state, setState, addPlant, removePlant };
}
