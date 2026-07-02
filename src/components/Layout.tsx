import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import Fab from "./Fab";

// App shell:
//   <Header />
//   <Outlet />            <- route content
//   <Footer />
//   <Fab />               <- fixed-position FAB slot (no onClick yet)
//
// The "no network" empty state is owned by individual route components
// (Today renders <NoNetwork /> when navigator.onLine is false) — see
// `src/routes/Today.tsx`.
export default function Layout() {
  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <Fab />
    </div>
  );
}
