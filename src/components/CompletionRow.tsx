/**
 * CompletionRow — one entry in the "last 5 completions" list.
 */
import type { CareType, CompletionEntry } from "../domain";

interface CompletionRowProps {
  entry: CompletionEntry;
  now: Date;
}

const CARE_TYPE_META: Record<CareType, { emoji: string; label: string }> = {
  water: { emoji: "💧", label: "Water" },
  fertilize: { emoji: "🌱", label: "Fertilize" },
  mist: { emoji: "💨", label: "Mist" },
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function relativeTime(iso: string, now: Date): string {
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "";
  const diffDays = Math.max(0, Math.round((now.getTime() - ms) / MS_PER_DAY));
  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 30) return `${diffDays} days ago`;
  const months = Math.round(diffDays / 30);
  if (months === 1) return "a month ago";
  return `${months} months ago`;
}

export default function CompletionRow({ entry, now }: CompletionRowProps) {
  const meta = CARE_TYPE_META[entry.careType];
  return (
    <li className="flex items-center justify-between gap-3 rounded-md border border-stone-200 bg-white px-3 py-2 text-sm">
      <span className="flex items-center gap-2">
        <span aria-hidden>{meta.emoji}</span>
        <span className="font-medium text-stone-800">{meta.label}</span>
        <span className="text-stone-500">{relativeTime(entry.completedAt, now)}</span>
      </span>
    </li>
  );
}
