## Parent

Issue #1 — Plant Identifier PWA v1 (PRD).

## What to build

The daily morning push notification. Subscribe the user to Web Push on first visit, add a `sendDailyDigest` Firebase Function triggered by Cloud Scheduler (Pub/Sub) at the user's chosen time (default 08:00 local), generate the body text ("3 plants need you today 💧🌱") by counting today's care items across all plants, and deep-link taps into the Today screen. The Settings page needs the toggle and time picker, so this slice also adds the Settings route content for notifications specifically.

This slice is the loudest user-facing feature — it has to be calm (one push per day, never per-plant), opt-in (default off until the user grants permission), and respectful (no push when zero plants exist).

## Acceptance criteria

- [ ] User is prompted for notification permission on first adding a plant; default state is "denied" otherwise
- [ ] `sendDailyDigest` Firebase Function runs on Cloud Scheduler at the user-configured time (default 08:00 local)
- [ ] Push body is a generated summary: `"N plants need you today 💧🌱"` (count + emoji mix); no push when N == 0
- [ ] Tapping a push deep-links to `/#/today` and opens the app even when closed
- [ ] Settings page shows: notification on/off toggle, time picker (hour + minute, local time)
- [ ] When notifications are disabled, no push is sent even if the function runs
- [ ] Maps to user stories: #28, #29, #30 from the PRD

## Blocked by

- Issue #6 (Today screen with dying banner) — needs the Today screen as the deep-link target