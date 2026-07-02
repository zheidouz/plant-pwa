## Parent

Issue #1 — Plant Identifier PWA v1 (PRD).

## What to build

The home screen as the canonical Today feed, with the "what's dying right now" urgent view at the top. Three sections render in order: 🚨 **Dying** (red banner with plant names + tap-to-open, only when `isDying` returns true for any plant), 📅 **Today** (grouped by care type, overdue items pulled to the top with a clear visual indicator), ⏭️ **Upcoming** (next 3 days, collapsed by default with an expand chevron). Camera FAB lives in the corner and opens the capture flow from issue #3.

The dying-detection predicate is called fresh on every render using the domain module from issue #2. Banner auto-clears when the underlying overdue action is marked done on the detail page (issue #4), with no manual dismiss button needed.

## Acceptance criteria

- [ ] Home screen renders the three sections in the order Dying → Today → Upcoming
- [ ] Dying banner only appears when at least one plant matches the `isDying` contract (>7d overdue water, >14d overdue fertilize, or 14d+ since creation with no water)
- [ ] Tapping a dying plant navigates to its detail page; banner refreshes from cache after the overdue action is marked done
- [ ] Today section groups items by care type (all waterings together, etc.), with overdue items at the top of each group with a visual indicator
- [ ] Upcoming section shows the next 3 days collapsed; tap-to-expand reveals individual plants per day
- [ ] Camera FAB present in the bottom-right corner on all sections; tapping opens the capture flow
- [ ] When a plant is overdue, completing the action on the detail page makes the dying banner disappear on next home render
- [ ] Empty state (zero plants) shows a friendly onboarding message pointing at the FAB
- [ ] Maps to user stories: #16, #17, #18, #19, #20, #21, #22, #23 from the PRD

## Blocked by

- Issue #3 (Domain model + localStorage + dying detection)
- Issue #5 (Schedule generation + plant detail page)