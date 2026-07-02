/**
 * Unit tests for the localStorage persistence layer.
 *
 * Runs under jsdom (set in `vitest.config.ts`) so `globalThis.localStorage`
 * is available. Each test starts with a cleared storage to keep state
 * isolated.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  CURRENT_SCHEMA_VERSION,
  STORAGE_KEY,
  type AppState,
  type Plant,
} from "../types";
import { emptyAppState, loadAppState, saveAppState } from "../storage";

/* ──────────────────────────────  Fixtures  ─────────────────────────────── */

function makePlant(overrides: Partial<Plant> = {}): Plant {
  return {
    id: "p-1",
    commonName: "Test Pothos",
    photoDataUrl: "data:image/jpeg;base64,ZmFrZQ==",
    identificationSource: "manual",
    locale: "en-US",
    createdAt: "2026-01-01T12:00:00.000Z",
    rules: [
      { careType: "water", cadenceDays: 7, enabled: true },
      { careType: "fertilize", cadenceDays: 30, enabled: true },
      { careType: "mist", cadenceDays: 2, enabled: false }, // disabled to test persistence
    ],
    completionLog: [
      { careType: "water", completedAt: "2026-01-10T12:00:00.000Z" },
    ],
    ...overrides,
  };
}

function sampleState(): AppState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    plants: [makePlant()],
  };
}

/* ───────────────────────────────  Setup  ──────────────────────────────── */

beforeEach(() => {
  globalThis.localStorage.clear();
});

/* ───────────────────────────────  Tests  ──────────────────────────────── */

describe("emptyAppState", () => {
  it("returns the canonical empty AppState", () => {
    const state = emptyAppState();
    expect(state.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(state.plants).toEqual([]);
  });
});

describe("loadAppState", () => {
  it("returns empty when localStorage has nothing under the versioned key", () => {
    // Confirms we're using the versioned key, not some other slot.
    expect(globalThis.localStorage.getItem(STORAGE_KEY)).toBeNull();
    const state = loadAppState();
    expect(state).toEqual(emptyAppState());
  });

  it("round-trips: save then load returns the same shape", () => {
    const original = sampleState();
    saveAppState(original);
    const loaded = loadAppState();
    expect(loaded).toEqual(original);
  });

  it("persists a disabled rule verbatim (enabled: false is round-tripped)", () => {
    const original = sampleState();
    const mistRule = original.plants[0]!.rules.find((r) => r.careType === "mist");
    expect(mistRule?.enabled).toBe(false);

    saveAppState(original);
    const loaded = loadAppState();
    const loadedMist = loaded.plants[0]!.rules.find((r) => r.careType === "mist");
    expect(loadedMist?.enabled).toBe(false);
  });

  it("returns empty (no throw) when the stored JSON is corrupted", () => {
    globalThis.localStorage.setItem(STORAGE_KEY, "{not valid json");
    expect(() => loadAppState()).not.toThrow();
    const loaded = loadAppState();
    expect(loaded).toEqual(emptyAppState());
  });

  it("returns empty (no throw) when the stored JSON is valid but the wrong shape", () => {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: "bar" }));
    expect(() => loadAppState()).not.toThrow();
    const loaded = loadAppState();
    expect(loaded).toEqual(emptyAppState());
  });

  it("returns empty (no throw) on schema-version mismatch", () => {
    // Persist with schemaVersion 2 (future).
    globalThis.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ schemaVersion: 2, plants: [] })
    );
    expect(() => loadAppState()).not.toThrow();
    const loaded = loadAppState();
    expect(loaded).toEqual(emptyAppState());
  });

  it("returns empty (no throw) when schemaVersion is missing entirely", () => {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify({ plants: [] }));
    expect(() => loadAppState()).not.toThrow();
    const loaded = loadAppState();
    expect(loaded).toEqual(emptyAppState());
  });
});

describe("saveAppState", () => {
  it("writes a string under the versioned key", () => {
    const original = sampleState();
    saveAppState(original);
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    // It should be parseable JSON.
    expect(JSON.parse(raw!)).toEqual(original);
  });

  it("silently swallows errors when localStorage.setItem throws (QuotaExceeded)", () => {
    const setItemSpy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });
    try {
      expect(() => saveAppState(sampleState())).not.toThrow();
    } finally {
      setItemSpy.mockRestore();
    }
  });

  it("handles multiple plants in the collection", () => {
    const state: AppState = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      plants: [makePlant({ id: "a" }), makePlant({ id: "b" }), makePlant({ id: "c" })],
    };
    saveAppState(state);
    const loaded = loadAppState();
    expect(loaded.plants).toHaveLength(3);
    expect(loaded.plants.map((p) => p.id).sort()).toEqual(["a", "b", "c"]);
  });
});