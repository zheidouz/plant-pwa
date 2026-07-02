// Settings — placeholder for slice #2. The notification toggle, digest time
// picker, and "Reset app" destructive action (user stories #41, #42) will
// be added by issue #9.
export default function Settings() {
  return (
    <section className="mx-auto max-w-screen-sm px-4 py-8">
      <h2 className="text-2xl font-bold tracking-tight text-stone-900">
        Settings
      </h2>
      <p className="mt-2 text-sm text-stone-600">
        Notification preferences, daily digest time, and "Reset app" will live
        here once the domain model lands.
      </p>

      <div className="mt-6 space-y-3">
        <Row label="Notifications" hint="Off — coming soon" />
        <Row label="Daily digest time" hint="08:00 (default) — coming soon" />
        <Row label="Reset app" hint="Wipes local data — coming soon" />
      </div>
    </section>
  );
}

function Row({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3">
      <span className="text-sm font-medium text-stone-800">{label}</span>
      <span className="text-xs text-stone-500">{hint}</span>
    </div>
  );
}
