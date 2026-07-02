# Plant Identifier PWA

A mobile-first PWA that turns the phone camera into a plant-care assistant: point → identify → auto-add to "My Plants" → generate a care schedule → show a shared "Today" feed with a "what's dying right now" urgent view.

## Status

PRD + ADR written. Implementation not started.

- 📄 [PRD v1](./docs/prd/plant-identifier-pwa-v1.md)
- 🏛️ [ADRs](./docs/adr/)

## Quick orientation

- **Stack:** Vite + React + TypeScript + Tailwind + vite-plugin-pwa; Firebase Functions as a thin proxy; Firebase Hosting.
- **Storage:** localStorage only (single-device, no auth in v1).
- **External services:** Pl@ntNet (identification), MiMo v2.5 (schedule generation + vision fallback).
- **Care types:** Water, Fertilize, Mist (cadence-only in v1).
- **Testing:** Playwright e2e only — one seam.

## Next steps

1. Initialize the Vite + React + TypeScript scaffold with vite-plugin-pwa.
2. Wire the Firebase project (`ai-ni-paul`) for Functions + Hosting.
3. Build the proxy functions: `identifyPlant`, `generateSchedule`.
4. Implement capture → identify → add flow.
5. Implement home screen (Today), plant detail, schedule editing.
6. ICS export.
7. Push notification pipeline (Cloud Scheduler → Function).
8. Playwright e2e suite with mocked Pl@ntNet + MiMo responses.
9. Deploy to Firebase Hosting.