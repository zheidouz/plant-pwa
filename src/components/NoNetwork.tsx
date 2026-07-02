// Empty-state component shown when `navigator.onLine` is false. Per user
// story #33: "I want to see a clear 'no network' state" — the icon and copy
// here describe the *what* (network is down) without committing to the
// later-slice action (e.g. retry-the-scan CTA). That's slice #5's call.
export default function NoNetwork() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto flex max-w-screen-sm flex-col items-center justify-center px-6 py-16 text-center"
    >
      <span aria-hidden className="text-5xl">📵</span>
      <h2 className="mt-4 text-lg font-semibold text-stone-800">No network</h2>
      <p className="mt-2 max-w-sm text-sm text-stone-600">
        You're offline. Your plants and schedule are still on this device, but
        scans and AI suggestions need a connection. Reconnect to add new
        plants.
      </p>
    </div>
  );
}
