# ADR 0001 — PlantNet Proxy & API Key Boundary

- Status: Accepted
- Date: 2026-07-02
- Deciders: project owner

## Context

Pl@ntNet's free anonymous tier has three properties that constrain how we call it from a browser-based PWA:

1. **CORS** — the free endpoint behavior with browser requests is not contractually guaranteed; depending on origin and rate-limit state it can return errors that are easier to handle server-side.
2. **Per-IP quota of 500 requests/day** — measured against whatever IP makes the request, which for a deployed static site is shared across all users.
3. **No API key on the anonymous tier**, but the alternative (registered key) lives in the Pl@ntNet developer console.

MiMo v2.5 calls face a parallel concern: the API key must never appear in client code shipped to browsers.

The PRD chose Firebase Functions as the proxy layer, but the *responsibilities* of that proxy were not pinned down. This ADR locks them in.

## Decision

The Firebase Functions proxy is the **single boundary** for both external AI/identification calls. It owns:

1. **All calls to Pl@ntNet** — `identifyPlant` invokes Pl@ntNet server-side and returns only the normalized candidate list to the client. The proxy can be swapped between the anonymous tier and a registered key without client changes.
2. **All calls to MiMo v2.5** — both for schedule generation (`generateSchedule`) and for vision fallback (`identifyPlant` second pass). The client never sees the MiMo API key.
3. **Per-species caching** — results keyed by `(scientificName, locale, month)` for 30 days, backed by a Firestore collection or a Redis emulator. This keeps the PlantNet quota from being burned by repeat scans of the same common houseplant.
4. **Quota accounting** — a Cloud Function counter (Firestore doc or simple log) tracks daily Pl@ntNet requests against the 500/day cap and short-circuits to the MiMo vision path when the cap is hit.
5. **Request normalization** — the proxy returns a stable contract to the client (`{ candidates, topCandidate, source }`) so a future swap from Pl@ntNet to iNaturalist or Plant.id changes only the function, not the UI.

The client never sees API keys, never makes raw external calls, and never has to know which provider actually answered.

## Consequences

**Positive**

- The free Pl@ntNet quota is shareable across all users of the deployed PWA, since the proxy can fan out from a single source IP.
- Future swap to a paid Pl@ntNet key, or to a different provider entirely, is a server-only change.
- The proxy is the natural choke point for caching, rate limiting, and abuse prevention.

**Negative**

- Adds a Firebase Functions dependency that didn't exist in a pure-static PWA. Local dev needs `firebase emulators:start` for the proxy to work.
- One extra network hop per scan (client → function → Pl@ntNet). Latency budget is roughly +150ms; acceptable for a non-real-time scan.
- If Firebase Functions has a cold start when the user opens the app, the first scan can be slow. We mitigate by adding a one-time warm-up call on app load.

**Reversibility**

- The proxy is a thin function — replacing the body is straightforward. If we ever move off Firebase, the same contract moves with us. The hard-to-reverse decision is "all external AI calls go through a proxy"; that decision is what's locked in here.

## Alternatives considered

- **Call Pl@ntNet directly from the browser.** CORS and quota attribution make this fragile. Rejected.
- **Have each user paste their own Pl@ntNet key into settings.** Massive UX cliff; only sensible as a power-user escape hatch in v2+. Rejected for v1.
- **Replace Pl@ntNet with a local model.** Coverage is shallow for uncommon species; defer until the on-device model ecosystem matures.