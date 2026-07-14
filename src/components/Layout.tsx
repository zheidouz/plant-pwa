import { useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import Fab from "./Fab";
import CaptureModal from "./CaptureModal";

// App shell:
//   <Header />
//   <Outlet />            <- route content
//   <Footer />
//   <Fab />               <- opens the capture modal (slice #4)
//
// The capture modal is rendered here so any route that wants a FAB works
// without each route importing its own modal. Each route can also import
// `<CaptureModal>` independently if it needs a richer flow.

export default function Layout() {
  const [capturing, setCapturing] = useState(false);

  // The capture modal posts its result back to a window-scoped callback so
  // Today / Plant routes can own the identify pipeline. We expose a small
  // helper on `window` in development; in production the FAB's onClick is
  // already wired to a route-level handler via prop drilling from `Today`.
  // Because `Today` lives in `<Outlet />`, we have to lift the FAB's onClick
  // handler up to Layout and forward capture results back via a custom event.
  function openCapture() {
    window.dispatchEvent(new CustomEvent("plant-pwa:open-capture"));
    setCapturing(true);
  }

  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <Fab onClick={openCapture} />
      <CaptureModal
        open={capturing}
        onClose={() => setCapturing(false)}
        onCapture={(payload) => {
          window.dispatchEvent(
            new CustomEvent("plant-pwa:capture", { detail: payload }),
          );
          setCapturing(false);
        }}
      />
    </div>
  );
}
