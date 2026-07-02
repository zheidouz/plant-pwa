## Parent

Issue #1 — Plant Identifier PWA v1 (PRD).

## What to build

ICS calendar export as a pure client function. Walks the plant collection from `AppState`, projects 30 days of cadence-based events using `computeNextDue` from the domain layer, generates a valid `.ics` file (RFC 5545) with each event named clearly ("💧 Water Pothos", "🌱 Fertilize Calathea", "💨 Mist Fern"). On export, use the Web Share API with `files` where available; fall back to a download link otherwise.

The "shared calendar" promise from the PRD is satisfied here: the user hands the .ics file to a partner via Messages/AirDrop/email, who can import it into Apple Calendar or Google Calendar without installing the app. No server work needed.

## Acceptance criteria

- [ ] `buildIcs(appState, now)` pure function produces a valid RFC 5545 string for 30 days of events
- [ ] Each VEVENT has a SUMMARY in the format `<emoji> <verb> <PlantName>` (e.g. "💧 Water Pothos")
- [ ] Export button on the home screen opens Web Share API with `files` when `navigator.canShare({ files })` is true
- [ ] Falls back to a download link (`Blob` + `URL.createObjectURL`) when Web Share isn't available
- [ ] Imported into Apple Calendar / Google Calendar, events appear with correct names and dates
- [ ] Maps to user stories: #35, #36, #37, #38 from the PRD

## Blocked by

- Issue #3 (Domain model + localStorage + dying detection)