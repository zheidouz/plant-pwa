# PRD — Plant Identifier PWA v1

## Problem Statement

I keep buying (or being given) houseplants, intending to look after them properly, and I forget. By the time I notice the drooping leaves, the damage is done — and I don't know what the plant actually is, what it needs, or when it last got watered. General-purpose plant apps either require an account, want a subscription, or expect me to know the species before I open the app. None of them match the moment I'm standing in my living room holding my phone out at a sad-looking Calathea.

The problem is concrete: a single-device user with 5–15 houseplants who wants one tool that says *"this is a Pothos, water it every 7 days, and yes — the one in the corner is overdue."* No setup ceremony, no account, no subscription, no spreadsheet.

## Solution

A mobile-first PWA that turns the phone camera into a plant-care assistant:

1. **Point camera → identify.** A single tap to capture; the app calls Pl@ntNet (with MiMo vision as a fallback) to name the plant, and asks which organ was photographed (leaf/flower/fruit/bark/whole) only after the shot is taken, with a smart default.
2. **Auto-add to "My Plants."** Every successful scan is added to the collection. A 5-second "Undo" snackbar handles accidental scans (e.g., at a garden center) without interrupting the flow.
3. **Generate a care schedule.** MiMo v2.5 reads the species plus the device locale (season + hemisphere) and produces a cadence-only schedule for three care types: **Water**, **Fertilize**, **Mist**. The user can edit any cadence rule with one tap; no required setup ceremony.
4. **Show a "Today" screen as the home.** Three sections: 🚨 **Dying** (only if any plant is in distress), 📅 **Today** (grouped by care type, overdue items pulled to the top), ⏭️ **Upcoming** (next 3 days, collapsed). A camera FAB sits in the corner.
5. **Surface the "what's dying right now" view.** A plant is marked **dying** when it is more than 7 days overdue on water, more than 14 days overdue on fertilize, or has never been watered in 14+ days since creation. The dying plant is pinned in a persistent red banner at the top of the home screen until resolved.
6. **One calm push notification per morning.** "3 plants need you today 💧🌱" with a deep-link into the app. No per-plant spam.
7. **Export to calendar.** Generate an `.ics` file for the next 30 days so a partner, roommate, or external calendar app (Apple Calendar / Google Calendar) shares the workload.

All data lives on the device (localStorage + Service Worker). No account. No backend storage. The Firebase Functions layer exists only as a thin proxy to Pl@ntNet and MiMo (to hide API keys and manage CORS for the free PlantNet tier).

## User Stories

### Capture & Identify

1. As a plant owner, I want to point my phone camera at a plant and have the app name it for me, so that I don't have to search through identification guides manually.
2. As a plant owner, I want the app to ask which organ I'm photographing (leaf/flower/fruit/bark/whole) after the shot, so that I get accurate IDs without the question getting in the way of taking the photo.
3. As a plant owner, I want a sensible default selected on the organ picker, so that I can confirm with one tap on common cases.
4. As a plant owner, I want the app to fall back to an LLM vision guess when Pl@ntNet returns no match or very low confidence, so that I still get a best-effort ID on rare cultivars or weird angles.
5. As a plant owner, I want to see a PlantNet confidence score next to the plant name, so that I know how much to trust the identification.
6. As a plant owner, I want any AI guess (whether Pl@ntNet or MiMo vision) to be clearly labeled "AI suggestion — please confirm", so that I'm not misled by a wrong identification.

### Add to My Plants

7. As a plant owner, I want every successful scan to be added to "My Plants" automatically, so that I can keep identifying plants without interruption.
8. As a plant owner, I want a 5-second "Undo" snackbar to appear after each scan, so that I can quickly remove a plant I scanned by accident (e.g., at a garden center) without it polluting my collection.
9. As a plant owner, I want my plant list to be searchable and to show each plant's next-due care action, so that I can find a specific plant or see what's coming up.
10. As a plant owner, I want to swipe-to-delete any plant, so that I can prune my collection if it grows stale.

### Care Schedules

11. As a plant owner, I want the app to generate a watering, fertilizing, and misting schedule for each new plant based on its species, so that I don't have to research and configure each one manually.
12. As a plant owner, I want the generated schedule to consider my local season and hemisphere (derived from device locale), so that "every 7 days" becomes "every 10 days in winter" automatically.
13. As a plant owner, I want to edit any schedule rule with one tap (change cadence from 7 to 10 days, switch mist off, etc.), so that I can override the AI when I know better.
14. As a plant owner, I want a small care-tip blurb (1–2 sentences) on each plant's detail page, so that I can remember the "why" behind the cadence (e.g., "Pothos prefers to dry between waterings").
15. As a plant owner, I want the schedule rules to be cadence-only (no sensor triggers in v1), so that the mental model is predictable and works without hardware.

### Home Screen & Today View

16. As a plant owner, I want the app to open directly to a "Today" screen, so that I know what needs doing without navigating.
17. As a plant owner, I want today's care items to be grouped by care type (all waterings together, all fertilizings together, etc.), so that I can do all watering at once at the kitchen sink.
18. As a plant owner, I want overdue items to be pulled to the top of the Today section with a clear visual indicator, so that I can't miss them.
19. As a plant owner, I want an "Upcoming (next 3 days)" collapsed section at the bottom of Today, so that I can plan ahead without it competing for attention.
20. As a plant owner, I want a single camera FAB on the home screen, so that the path from "I see a plant" to "I scanned a plant" is always one tap away.

### The "What's Dying Right Now" View

21. As a plant owner, I want the app to flag any plant as "dying" when it's more than 7 days overdue on water, more than 14 days overdue on fertilize, or has never been watered in 14+ days since creation, so that I can rescue it.
22. As a plant owner, I want a persistent red banner at the top of the home screen listing all dying plants, so that I can't open the app without seeing the urgent work.
23. As a plant owner, I want the dying banner to clear automatically once I've completed the overdue action, so that I have a visible win when I act on it.

### Plant Detail & Completions

24. As a plant owner, I want each plant's detail page to show a hero photo, the species, a care tip, the active schedule rules, and "Mark as done" buttons for each care type, so that I can complete an action and update the schedule in one screen.
25. As a plant owner, I want the "Mark as done" buttons to update the next-due time immediately, so that I can water a plant and see it leave the Today list right away.
26. As a plant owner, I want the detail page to show the last 5 care actions for that plant, so that I can see history without leaving the page.
27. As a plant owner, I want to rename any plant (e.g., "Mr. Pothos"), so that the collection feels personal.

### Notifications

28. As a plant owner, I want to receive one daily morning push notification that summarizes today's care ("3 plants need you today 💧🌱"), so that I'm reminded without being nagged.
29. As a plant owner, I want the morning notification to deep-link into the Today screen, so that I can act immediately.
30. As a plant owner, I want to disable notifications entirely from settings, so that I can use the app fully offline-quiet.

### Offline & Reliability

31. As a plant owner, I want the app shell to load even without a network connection, so that I can check my schedule on the train or in a basement apartment.
32. As a plant owner, I want my entire plant collection and schedule history to live on my device, so that my data stays private and the app survives offline.
33. As a plant owner, I want to see a clear "no network" state if I try to scan a plant offline, so that I know why the camera isn't producing an ID.
34. As a plant owner, I want to mark care actions done while offline, so that I don't lose completion data when I water a plant on the porch.

### Calendar Export & Sharing

35. As a plant owner, I want to export the next 30 days of care events as an `.ics` file, so that I can add them to Apple Calendar or Google Calendar.
36. As a plant owner, I want each exported event to be named clearly ("💧 Water Pothos", "🌱 Fertilize Calathea"), so that I know what to do without opening the app.
37. As a plant owner, I want the exported calendar to update automatically when I edit a schedule, so that my partner and I don't get stale reminders.
38. As a plant owner, I want to share the `.ics` file via the OS share sheet (Messages, AirDrop, email), so that I can hand the schedule to a partner or roommate without forcing them to install the app.

### Trust & Disclaimers

39. As a plant owner, I want all AI-generated care tips to be labeled "AI suggestion — adjust if you've learned otherwise", so that I can trust my own experience when it differs.
40. As a plant owner, I want a small "Powered by Pl@ntNet + MiMo" footer on the home screen, so that I know what powers the tool.

### Settings

41. As a plant owner, I want to toggle push notifications on/off and pick the morning notification time, so that I'm not woken up at the wrong hour.
42. As a plant owner, I want to clear all local data ("Reset app") from settings, so that I can start fresh on a new device or share a device.
43. As a plant owner, I want to see a count of how many plants I have and how many care actions I've completed this month, so that I get a small sense of progress.

## Implementation Decisions

### Stack

- **Frontend framework:** Vite + React + TypeScript.
- **Styling:** Tailwind CSS.
- **PWA shell:** `vite-plugin-pwa` for service worker generation, manifest, and install prompt.
- **State management:** React local state + a small custom hook layer; no Redux/Zustand needed at this scale.
- **Persistence:** Browser `localStorage` keyed by versioned schema; all data lives on the device.
- **Backend proxy:** Firebase Functions (Node 20, HTTP triggers) to relay requests to Pl@ntNet and MiMo v2.5. This hides API keys, manages CORS for the Pl@ntNet anonymous tier, and lets us cache common species lookups.
- **Hosting:** Firebase Hosting with SPA rewrite + HTTPS. Single project, single config, integrates with Functions.
- **Camera:** `getUserMedia` for live preview, `<input type="file" accept="image/*" capture="environment">` as the iOS-friendly fallback path.

### Domain Model (informative shapes)

The shape below encodes the schedule-generation contract. Treat it as the contract between the AI layer and the rest of the app — it came out of the grilling decisions (cadence-only, three care types, locale-aware, user-editable).

```ts
type CareType = "water" | "fertilize" | "mist";

interface ScheduleRule {
  careType: CareType;
  cadenceDays: number;        // e.g. 7 = every 7 days
  enabled: boolean;
}

interface Plant {
  id: string;                 // uuid v4
  commonName: string;
  scientificName?: string;
  photoDataUrl: string;       // small JPEG stored as data URL in localStorage
  identificationSource: "plantnet" | "mimo-vision" | "manual";
  plantnetConfidence?: number; // 0..1
  locale: string;             // BCP-47, captured at scan time
  createdAt: string;          // ISO
  rules: ScheduleRule[];      // exactly one per enabled CareType
  completionLog: Array<{
    careType: CareType;
    completedAt: string;      // ISO
  }>;
}

interface AppState {
  schemaVersion: 1;
  plants: Plant[];
}
```

A plant is **dying** when any of these are true at evaluation time: (a) `now - last water completion > 7 days` and water is enabled, (b) `now - last fertilize completion > 14 days` and fertilize is enabled, (c) water is enabled, no completion exists, and `now - createdAt > 14 days`.

### Schedule Generation

- One LLM call per new plant, via Firebase Function `generateSchedule`.
- Input: `{ scientificName, commonName, locale, createdAt }`.
- Output: `ScheduleRule[]` for the three care types plus a `careTip` string (1–2 sentences).
- Hemisphere and current season are derived from locale at the Function layer (no client work).
- The Function caches results keyed by `(scientificName, locale, month)` for 30 days to avoid re-paying for repeat scans of common species.

### Identification Flow

- Client captures image (≤1MB JPEG resized via canvas).
- Client calls Firebase Function `identifyPlant` with `{ imageBase64, organ }`.
- Function calls Pl@ntNet v2 with the image and organ; if top score `< 0.30` or empty result, calls MiMo v2.5 vision with the same image and the species name as a soft prompt.
- Function returns `{ candidates: [{ source, name, confidence }], topCandidate }`.
- Client stores the top candidate and the source.

### Organ Selector

- Rendered as a single row of 5 chips (🍃 Leaf / 🌸 Flower / 🌰 Fruit / 🌳 Bark / 🌿 Whole).
- Default selection: **Leaf** when the captured image is wider than tall (typical top-down leaf shot); **Whole** otherwise. The default can be overridden with a single tap.
- Required by Pl@ntNet; not optional in v1.

### "What's Dying" View

- Evaluated client-side on every render of the home screen.
- A plant appearing in the banner offers one tap to open its detail page, where the user can complete the overdue action.
- Banner clears when the overdue action's "Mark as done" is tapped; no manual dismiss needed.

### Notifications

- One push per morning at the user-chosen time (default 08:00 local).
- Body is a generated summary: `"3 plants need you today 💧🌱"` (count + emoji mix).
- Tap deep-links to `/#/today`.
- Implemented via Web Push + the browser's `Notification` and `Push` APIs; the Firebase Function `sendDailyDigest` is triggered by Cloud Scheduler (Pub/Sub schedule).
- For users with zero plants, no notification is sent.

### ICS Export

- Implemented as a pure client function (no server) that walks the plant collection, projects 30 days of cadence-based events, and generates an `ics`-formatted string.
- The export button uses the Web Share API where available (`navigator.share` with `files`), and falls back to a download link.

### Trust & Disclaimers

- The home screen footer reads `Powered by Pl@ntNet + MiMo`.
- Each plant's care-tip blurb has a small `AI suggestion` tag with a one-line tooltip explaining that the user can edit the rule.

### Out-of-Storage Events

- "Mark as done" while offline queues the completion in localStorage and applies it locally; nothing needs to round-trip to the server.
- A future multi-device sync layer would replay this log, but v1 doesn't need one.

## Testing Decisions

**One seam: end-to-end via Playwright.** No unit tests in v1; the schedule math, dying-detection, and ICS generation are exercised through the full app.

### What makes a good e2e test for this app

- Drives the deployed PWA (or `vite preview` against the production build) using a real Chromium via Playwright.
- Uses fixture images (small JPEGs committed under `e2e/fixtures/`) uploaded via the file input — no real camera needed.
- Mocks network calls at the Playwright `page.route` level: Pl@ntNet and MiMo responses are scripted JSON so the tests don't depend on external quotas.
- Asserts only on **observable behavior**: the plant appears in My Plants, the Today list, the dying banner; ICS export contents; notification permission flow.

### Modules exercised by e2e

- The full capture → identify → add flow.
- Schedule rendering on Today and on the plant detail page.
- "Mark as done" updates the next-due time and clears the dying banner.
- ICS export generates a valid file with the expected event names.
- Offline mode: app shell loads, "no network" shown for scan attempts, completions queue locally.
- Notification preferences toggle.

### Prior art

- No existing prior art in this codebase — `E:\AI Agents\hermes\Researcher` is a research/scratch directory, not a project repo. The Playwright patterns will be standard (`@playwright/test`, fixture-based tests, `page.route` for network mocks).

### Why one seam

- The schedule logic, dying detection, and ICS generator are small enough that e2e covers them faster than a unit-test harness would.
- The free Pl@ntNet quota (500/day) makes any test that hits the real API fragile; mocking at the network boundary keeps the tests deterministic.
- If a future change introduces non-trivial branching in the schedule logic, unit tests can be added for that module without changing the seam structure.

## Out of Scope

- **User accounts and cross-device sync.** v1 is single-device, localStorage only. Auth and Firestore sync are deferred.
- **Sensor-based triggers** ("water when soil is dry 2cm deep"). v1 is cadence-only.
- **Custom care types beyond Water / Fertilize / Mist.** Rotate, Prune, Repot, Pest check are deferred.
- **Per-event push notifications.** One daily digest only.
- **Custom notification time per care type.** One morning time for the whole digest.
- **Sharing a read-only web view of the schedule.** ICS export only.
- **Vacation / snooze mode.** A user traveling can simply toggle push notifications off; explicit vacation mode is deferred.
- **iOS / Android native wrappers.** PWA only. No Capacitor, no React Native.
- **PlantNet paid tier and quota management.** Free anonymous tier only; if we hit 500/day in production, that's a v2 problem with its own PRD.
- **Care tip cross-referencing across multiple sources.** Single MiMo v2.5 call per plant.
- **Offline image-based identification.** No local species model; scans require network.
- **Bulk import / CSV plant lists.** Manual scan only.
- **Apple Health sync for completions.** Deferred.
- **In-app plant photos beyond the original scan.** v1 keeps the scan photo; gallery uploads of additional photos are deferred.

## Further Notes

- **Why Firebase over a Vercel/Netlify backend:** the user already runs Firebase (`ai-ni-paul` project) for other apps, so a single Firebase project keeps auth, hosting, and Functions under one config. The trade-off is a slightly slower local-dev story (`firebase emulators`), which is acceptable for v1.
- **Why MiMo v2.5 specifically:** it's already in the user's stack alongside DeepSeek, fast enough for sub-second schedule generation, and produces clean JSON under structured-output prompting.
- **Why Pl@ntNet over a paid ID API:** free tier (500/day) is generous for a single-user PWA; if v1 becomes multi-user, that's the trigger to revisit with a paid key.
- **Dying thresholds are placeholders for tuning.** The 7-day / 14-day / 14-day-since-creation numbers are educated guesses. After shipping, the home screen will be the source of truth for "is this threshold right?" — we can adjust in a single constants file and re-deploy without a data migration.
- **Calendar sharing nuance:** "shared calendar" in the original pitch is satisfied by ICS export — the partner doesn't need to install the app. If we later want true two-way sync, that's a Firestore + Auth effort.
- **The "PlantNet anonymous tier + Firebase proxy" combination is a known fragile spot.** If Pl@ntNet changes its anonymous-tier CORS policy or rate limit, the proxy layer is the place to absorb that change. Worth a short ADR before we start building.