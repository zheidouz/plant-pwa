## Parent

Issue #1 — Plant Identifier PWA v1 (PRD).

## What to build

The My Plants list page and the remaining Settings screen content. My Plants is a searchable grid of cards showing photo + name + next-due action; "My Plants" pill at the top of the home screen opens it (per PRD Q15). Settings gets the non-notification entries: app stats (plant count, actions completed this month) and a "Reset app" button that clears `localStorage` after a confirmation prompt.

This is the smallest pure-UI slice in the project — both screens render off the domain layer (issue #3) with no server dependencies. Independently demoable with an empty state and a 3-plant state.

## Acceptance criteria

- [ ] "My Plants" pill at the top of the home screen opens a full-screen list page
- [ ] List page renders a card per plant with photo, name, and next-due action (care type + days-until)
- [ ] Search input filters the list by name (case-insensitive substring)
- [ ] Tap a card to navigate to the plant detail page (issue #4)
- [ ] Settings page shows: plant count, care actions completed this month, "Reset app" button
- [ ] "Reset app" shows a confirmation prompt; on confirm, clears `localStorage` and reloads to the empty state
- [ ] Empty state for both screens is friendly and points to the FAB or relevant action
- [ ] Maps to user stories: #9, #41, #42, #43 from the PRD

## Blocked by

- Issue #6 (Today screen with dying banner) — needs slice 6 so the FAB and pill navigation patterns are consistent