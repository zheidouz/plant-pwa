// "My Plants" list — placeholder for slice #2. Issue #9 (My Plants +
// Settings) will replace this with the searchable, swipe-to-delete list
// from user story #9.
export default function MyPlants() {
  return (
    <section className="mx-auto max-w-screen-sm px-4 py-8">
      <h2 className="text-2xl font-bold tracking-tight text-stone-900">
        My Plants
      </h2>
      <p className="mt-2 text-sm text-stone-600">
        Your collection will live here once you start scanning. Each successful
        scan is added automatically with a 5-second Undo snackbar.
      </p>

      <div className="mt-6 rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center">
        <span aria-hidden className="text-3xl">🪴</span>
        <p className="mt-2 text-sm text-stone-500">No plants yet.</p>
      </div>
    </section>
  );
}
