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

The build is broken into 9 vertical slices — see [`docs/issues/`](./docs/issues/index.md) for the dependency-ordered list (also published as issues #2–#10 on the [GitHub tracker](https://github.com/zheidouz/plant-pwa/issues)).

Implement one slice per fresh `/implement` session, starting with either unblocked slice (#2 App shell or #3 Domain model).