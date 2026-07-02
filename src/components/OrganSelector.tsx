/**
 * `OrganSelector` — row of 5 chips (🍃 Leaf / 🌸 Flower / 🌰 Fruit / 🌳 Bark /
 * 🌿 Whole). Required by Pl@ntNet before submission.
 *
 * The parent supplies an image element so we can compute the smart default
 * the first time the component mounts (Leaf if wider-than-tall, else Whole).
 */

import { useEffect, useState } from "react";
import {
  ORGANS,
  ORGAN_META,
  type Organ,
} from "../lib/identifyTypes";

export interface OrganSelectorProps {
  image: HTMLImageElement;
  value: Organ | null;
  onChange: (organ: Organ) => void;
}

function smartDefaultFor(img: HTMLImageElement): Organ {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  return w > h ? "leaf" : "whole";
}

export default function OrganSelector({
  image,
  value,
  onChange,
}: OrganSelectorProps) {
  // The "smart default" lives in component state until the user touches a
  // chip — once they pick explicitly, we don't second-guess them.
  const [defaulted, setDefaulted] = useState<Organ>(() => smartDefaultFor(image));
  useEffect(() => {
    if (value === null) onChange(defaulted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div role="radiogroup" aria-label="Which organ did you photograph?" className="flex flex-wrap justify-center gap-2">
      {ORGANS.map((o) => {
        const isSelected = (value ?? defaulted) === o;
        return (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => {
              if (value === null) setDefaulted(o);
              onChange(o);
            }}
            className={
              "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition " +
              (isSelected
                ? "border-leaf-600 bg-leaf-600 text-white shadow"
                : "border-stone-300 bg-white text-stone-700 hover:border-leaf-400")
            }
            data-organ={o}
          >
            <span aria-hidden>{ORGAN_META[o].emoji}</span>
            <span>{ORGAN_META[o].label}</span>
          </button>
        );
      })}
    </div>
  );
}
