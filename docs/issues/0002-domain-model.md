## Parent

Issue #1 — Plant Identifier PWA v1 (PRD).

## What to build

A pure (no-UI) domain module exposing the `Plant`, `ScheduleRule`, `CareType`, and `AppState` shapes from the PRD, with versioned localStorage persistence and the dying-detection predicate. This slice is a library, not a feature — it exists so every later slice that touches data can build on a single source of truth.

The dying-detection contract encodes the decision-rich part of the slice and should be preserved verbatim:

```ts
// A plant is "dying" when any of these are true:
// (a) `now - last water completion > 7 days` AND water is enabled
// (b) `now - last fertilize completion > 14 days` AND fertilize is enabled
// (c) water is enabled, no completion exists, AND `now - createdAt > 14 days`
```

A "next due" calculation per care type (find the most recent completion for that care type, add the rule's `cadenceDays`) also belongs here so later slices don't reinvent it.

## Acceptance criteria

- [ ] `Plant`, `ScheduleRule`, `CareType`, `AppState`, and `CompletionEntry` types are exported from a single module
- [ ] `loadAppState()` reads from `localStorage` under a versioned key, returning an empty `{ schemaVersion: 1, plants: [] }` when missing
- [ ] `saveAppState(state)` writes atomically; corrupted JSON falls back to empty without throwing
- [ ] `computeNextDue(plant, careType, now)` returns an ISO timestamp or `null` when the rule is disabled
- [ ] `isDying(plant, now)` matches the contract above (a/b/c), unit-testable with fixed-clock helpers
- [ ] A schema-migration path exists: if `schemaVersion` doesn't match 1, fall back to empty rather than crash
- [ ] No React, no Firebase, no LLM imports — pure TS module consumable from any slice

## Blocked by

None — can start immediately.