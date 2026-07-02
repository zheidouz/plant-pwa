## Parent

Issue #1 — Plant Identifier PWA v1 (PRD).

## What to build

The end-to-end identification path. Wire the Firebase project (`ai-ni-paul`) for Hosting + Functions v2, scaffold the `identifyPlant` HTTP function (called from the client), build the camera-capture UI (live preview with `getUserMedia` + iOS-friendly `<input type="file" capture="environment">` fallback), image resize to ≤1MB JPEG client-side, the 5-chip organ selector with smart default (Leaf when wider-than-tall, Whole otherwise), confidence display, "AI suggestion" label, and the auto-add-with-5s-undo flow on success.

This slice proves the ADR 0001 proxy pattern: client never sees the Pl@ntNet or MiMo key; both calls go through `identifyPlant` which holds them server-side. The function calls Pl@ntNet v2 first, falls back to MiMo v2.5 vision when the top score is `< 0.30` or empty. No caching yet (slice 4 adds it for schedules).

## Acceptance criteria

- [ ] Firebase project initialized in `ai-ni-paul` for Functions v2 + Hosting; `firebase.json` committed
- [ ] `identifyPlant` HTTP function takes `{ imageBase64, organ }`, returns `{ candidates, topCandidate, source }` with `source` being either `"plantnet"` or `"mimo-vision"`
- [ ] Pl@ntNet and MiMo API keys read from Firebase secrets/env, never from client code
- [ ] Camera FAB on the home screen opens capture UI; capture produces a ≤1MB JPEG (downscaled via canvas)
- [ ] Organ selector shows 5 chips (🍃 Leaf / 🌸 Flower / 🌰 Fruit / 🌳 Bark / 🌿 Whole) with smart default; required before submission
- [ ] PlantNet confidence displayed next to plant name; "AI suggestion" label shown for all results (Pl@ntNet + MiMo)
- [ ] Successful ID auto-adds to "My Plants" via the domain layer; 5-second "Undo" snackbar with re-add on tap
- [ ] When offline, capture path shows a "no network" message (no partial auto-add)
- [ ] Pl@ntNet rate-limit / 500-error handled gracefully with a user-facing message
- [ ] Swipe-to-delete on a plant works via the domain layer
- [ ] Maps to user stories: #1, #2, #3, #4, #5, #6, #7, #8, #10 from the PRD

## Blocked by

- Issue #2 (App shell + PWA boot)
- Issue #3 (Domain model + localStorage + dying detection)