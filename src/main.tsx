import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerSW } from "virtual:pwa-register";

// Register the service worker (production only — the plugin's devOptions
// are disabled, so this is a no-op in `vite dev`). `autoUpdate` means the
// new SW takes over on next page load without prompting the user.
registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
