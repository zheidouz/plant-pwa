## Parent

Issue #1 — Plant Identifier PWA v1 (PRD).

## What to build

The schedule-generation function and the plant detail page. Add `generateSchedule` as a second Firebase HTTP function: takes `{ scientificName, commonName, locale, createdAt }`, derives hemisphere + current season from the locale at the function layer, calls MiMo v2.5 with a structured-output prompt to produce `ScheduleRule[]` for Water/Fertilize/Mist plus a 1–2 sentence `careTip`, caches results keyed by `(scientificName, locale, month)` for 30 days. Build the plant detail page: hero photo, common + scientific name, care-tip blurb with "AI suggestion" tag, current rules rendered with one-tap edit (cadence picker + on/off toggle), "Mark as done" buttons per care type, and the last 5 completions.

The "Mark as done" action must immediately update the next-due time on screen, push a completion into the plant's `completionLog`, and persist via the domain layer — no server round-trip needed for v1.

## Acceptance criteria

- [ ] `generateSchedule` HTTP function exists, returns `{ rules: ScheduleRule[], careTip: string }`
- [ ] Function caches results keyed by `(scientificName, locale, month)` with a 30-day TTL; second call for the same species in the same month returns from cache
- [ ] MiMo API key held server-side only; never shipped to the client
- [ ] When a plant is auto-added (issue #3), `generateSchedule` runs once and the resulting rules + tip appear on the detail page
- [ ] Plant detail page shows: hero photo, common + scientific name, care-tip blurb, rules (one per enabled care type), "Mark as done" button per enabled care type, last 5 completions
- [ ] Editing a rule (cadence days, on/off) updates the rule in `AppState` immediately and re-renders the next-due date
- [ ] Tapping "Mark as done" appends a `CompletionEntry` for that care type; next-due time updates on screen
- [ ] User can rename a plant (e.g. "Mr. Pothos") via a single-tap edit on the name field
- [ ] Maps to user stories: #11, #12, #13, #14, #15, #24, #25, #26, #27 from the PRD

## Blocked by

- Issue #2 (App shell + PWA boot)
- Issue #3 (Domain model + localStorage + dying detection)