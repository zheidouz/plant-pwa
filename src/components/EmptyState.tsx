/**
 * Friendly onboarding empty state for zero plants.
 *
 * Shown when `plants.length === 0` on the Today screen. Points an arrow at
 * the FAB so the user knows what to tap.
 */
export default function EmptyState() {
  return (
    <div
      className="mt-8 flex flex-col items-center text-center"
      data-testid="empty-state"
    >
      <span aria-hidden className="text-6xl">
        🌿
      </span>
      <h3 className="mt-3 text-lg font-semibold text-stone-900">
        No plants yet
      </h3>
      <p className="mt-2 max-w-xs text-sm text-stone-600">
        Tap the camera to identify your first plant and start your collection.
      </p>
      {/* Visual arrow pointing at the bottom-right FAB. */}
      <div className="relative mt-6 h-12 w-full max-w-sm">
        <svg
          viewBox="0 0 200 48"
          className="absolute inset-0 h-full w-full"
          aria-hidden
        >
          <path
            d="M20 24 Q 110 8 180 32"
            fill="none"
            stroke="#16a34a"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="4 3"
          />
          <polygon points="180,32 170,28 172,36" fill="#16a34a" />
        </svg>
      </div>
    </div>
  );
}
