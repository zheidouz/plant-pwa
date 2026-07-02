// Today route — home screen.
// Slice #2 acceptance criterion: when navigator.onLine is false, render the
// NoNetwork empty state instead of the placeholder body.
//
// We listen to the `online`/`offline` window events so the state flips in
// the UI when the device's network drops or comes back, without requiring a
// route re-mount.
import { useEffect, useState } from "react";
import NoNetwork from "../components/NoNetwork";

export default function Today() {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (!online) {
    return <NoNetwork />;
  }

  return (
    <section className="mx-auto max-w-screen-sm px-4 py-8">
      <h2 className="text-2xl font-bold tracking-tight text-stone-900">Today</h2>
      <p className="mt-2 text-sm text-stone-600">
        Nothing to care for yet. Tap the camera button to identify a plant and
        add it to your collection.
      </p>

      <div className="mt-6 space-y-3">
        <PlaceholderGroup label="🚨 Dying" hint="plants in distress" />
        <PlaceholderGroup label="📅 Today" hint="grouped by care type" />
        <PlaceholderGroup label="⏭️ Upcoming" hint="next 3 days" />
      </div>
    </section>
  );
}

function PlaceholderGroup({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="rounded-xl border border-dashed border-stone-300 bg-white p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-stone-800">{label}</h3>
        <span className="text-xs text-stone-500">{hint}</span>
      </div>
      <p className="mt-2 text-sm text-stone-500">No items.</p>
    </div>
  );
}
