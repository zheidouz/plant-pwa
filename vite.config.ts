import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Plant Identifier PWA — Vite config.
// PWA notes:
//   - registerType: "autoUpdate" — the new SW replaces the old one in the
//     background; reload-upgrade happens on next navigation.
//   - manifest — full standalone install metadata for Chrome (Android) + iOS.
//   - Workbox generates /sw.js (precaches the built shell so the app boots
//     fully offline, which is required by issue #2's no-network empty state).
//   - devOptions.enabled: false — service worker only applies in build/preview,
//     so dev HMR is unaffected.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png", "robots.txt"],
      manifest: {
        name: "Plant Identifier",
        short_name: "Plants",
        description:
          "Point the camera at a plant to identify it, auto-add it to your collection, and get a care schedule.",
        theme_color: "#16a34a",
        background_color: "#fafaf9",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,webmanifest}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/sw\.js$/],
      },
      devOptions: {
        enabled: false,
        type: "module",
      },
    }),
  ],
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
  },
});
