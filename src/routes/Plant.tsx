// Plant detail — placeholder for slice #2. The `id` URL parameter is
// captured here so later slices can wire it to a real lookup against the
// domain model.
import { Link, useParams } from "react-router-dom";

export default function Plant() {
  const { id } = useParams<{ id: string }>();

  return (
    <section className="mx-auto max-w-screen-sm px-4 py-8">
      <Link to="/my-plants" className="text-sm text-leaf-700 hover:underline">
        ← Back to My Plants
      </Link>
      <h2 className="mt-4 text-2xl font-bold tracking-tight text-stone-900">
        Plant detail
      </h2>
      <p className="mt-2 text-sm text-stone-600">
        Detail view for plant <code className="rounded bg-stone-100 px-1 py-0.5">{id}</code>.
        Will render hero photo, species, care tip, schedule rules, and "Mark
        as done" buttons once the domain model lands.
      </p>
    </section>
  );
}
