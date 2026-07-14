/**
 * Shared TypeScript types for the identify flow.
 *
 * These mirror the response contract implemented in `functions/src/identifyPlant.ts`.
 * Keeping them in a separate module lets the API wrapper, components, and
 * future tests share a single source of truth without forcing them all to
 * import from the same file.
 */

/** Organ the photographed part belongs to. Matches Pl@ntNet's vocabulary. */
export type Organ = "leaf" | "flower" | "fruit" | "bark" | "whole";

/** All possible organs, in the rendering order for the chip row. */
export const ORGANS: readonly Organ[] = [
  "leaf",
  "flower",
  "fruit",
  "bark",
  "whole",
] as const;

/** Label / emoji for each organ, used by OrganSelector and result UI. */
export const ORGAN_META: Record<Organ, { emoji: string; label: string }> = {
  leaf: { emoji: "🍃", label: "Leaf" },
  flower: { emoji: "🌸", label: "Flower" },
  fruit: { emoji: "🌰", label: "Fruit" },
  bark: { emoji: "🌳", label: "Bark" },
  whole: { emoji: "🌿", label: "Whole" },
};

export interface IdentifyCandidate {
  commonName: string;
  scientificName?: string;
  /** 0..1. */
  confidence: number;
  source: "plantnet" | "mimo-vision";
}

export interface IdentifyResult {
  candidates: IdentifyCandidate[];
  topCandidate: IdentifyCandidate;
  source: "plantnet" | "mimo-vision";
}

/** Request body sent by `identifyPlant()`. */
export interface IdentifyRequest {
  imageBase64: string;
  organ: Organ;
}
