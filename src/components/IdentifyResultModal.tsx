/**
 * `IdentifyResultModal` — shows the top candidate with confidence and an
 * "AI suggestion — please confirm" label (per PRD user story #6). Provides
 * "Add to My Plants" and "Try again" actions.
 */

import type { IdentifyCandidate, IdentifyResult } from "../lib/identifyTypes";

export interface IdentifyResultModalProps {
  result: IdentifyResult;
  photoDataUrl: string;
  onAdd: () => void;
  onRetry: () => void;
}

function fmtConfidence(c: number): string {
  if (!isFinite(c)) return "—";
  return `${Math.round(c * 100)}%`;
}

export default function IdentifyResultModal({
  result,
  photoDataUrl,
  onAdd,
  onRetry,
}: IdentifyResultModalProps) {
  const top: IdentifyCandidate = result.topCandidate;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Plant identification result"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
    >
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl">
        <img
          src={photoDataUrl}
          alt={top.commonName}
          className="h-48 w-full object-cover"
        />
        <div className="space-y-2 p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-lg font-semibold text-stone-900">
              {top.commonName}
              {top.scientificName ? (
                <span className="ml-2 text-sm font-normal italic text-stone-500">
                  {top.scientificName}
                </span>
              ) : null}
            </h3>
            <span
              className="rounded-full bg-leaf-50 px-2 py-0.5 text-xs font-medium text-leaf-700"
              data-testid="confidence"
              title={`${result.source} confidence`}
            >
              {fmtConfidence(top.confidence)}
            </span>
          </div>
          <p className="text-xs uppercase tracking-wide text-amber-700">
            ⚠️ AI suggestion — please confirm
          </p>
          {result.candidates.length > 1 ? (
            <details className="text-xs text-stone-600">
              <summary className="cursor-pointer">Other candidates ({result.candidates.length - 1})</summary>
              <ul className="mt-1 space-y-0.5">
                {result.candidates.slice(1).map((c, i) => (
                  <li key={`${c.scientificName ?? c.commonName}-${i}`}>
                    {c.commonName} — {fmtConfidence(c.confidence)}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
        <div className="flex gap-2 border-t border-stone-100 p-3">
          <button
            type="button"
            onClick={onRetry}
            className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={onAdd}
            className="flex-1 rounded-lg bg-leaf-600 px-3 py-2 text-sm font-medium text-white hover:bg-leaf-700"
            data-testid="confirm-add"
          >
            Add to My Plants
          </button>
        </div>
      </div>
    </div>
  );
}
