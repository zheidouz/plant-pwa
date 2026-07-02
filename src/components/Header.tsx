import { NavLink, useLocation } from "react-router-dom";

// Maps each top-level route to a label. Kept here so the Layout component
// stays small and the route-to-title mapping is easy to extend later.
const ROUTE_TITLES: Record<string, string> = {
  "/today": "Today",
  "/my-plants": "My Plants",
  "/settings": "Settings",
};

function titleForPath(pathname: string): string {
  if (pathname.startsWith("/plant/")) return "Plant";
  return ROUTE_TITLES[pathname] ?? "Plant Identifier";
}

export default function Header() {
  const { pathname } = useLocation();
  const title = titleForPath(pathname);

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-screen-sm items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <span aria-hidden className="text-xl">🌿</span>
          <h1 className="text-base font-semibold tracking-tight">{title}</h1>
        </div>
        <nav aria-label="Primary" className="flex items-center gap-3 text-sm">
          <NavLink
            to="/today"
            className={({ isActive }) =>
              isActive ? "font-semibold text-leaf-700" : "text-stone-500 hover:text-stone-800"
            }
          >
            Today
          </NavLink>
          <NavLink
            to="/my-plants"
            className={({ isActive }) =>
              isActive ? "font-semibold text-leaf-700" : "text-stone-500 hover:text-stone-800"
            }
          >
            Plants
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              isActive ? "font-semibold text-leaf-700" : "text-stone-500 hover:text-stone-800"
            }
          >
            Settings
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
