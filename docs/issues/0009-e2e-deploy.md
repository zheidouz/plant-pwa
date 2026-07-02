## Parent

Issue #1 — Plant Identifier PWA v1 (PRD).

## What to build

End-to-end verification + production deployment. Add Playwright with fixture JPEGs under `e2e/fixtures/` and `page.route` mocks for Pl@ntNet + MiMo responses so tests are deterministic (no external quota dependency). Cover the four critical-path scenarios:
1. Scan-and-add: capture fixture → organ selector → mock Pl@ntNet response → plant appears in My Plants + Today
2. Mark-done-clears-banner: simulate a dying plant → mark water done on detail page → banner disappears on home
3. ICS export contents: with 2 plants, trigger export → assert .ics text contains expected VEVENTs with right names
4. Offline shell: kill network → app shell still loads → "no network" state shown for scan attempts

Then build production bundle, deploy Functions v2 + Hosting to `ai-ni-paul`, smoke-test the live URL with `curl` against `/api/setup` and a real scan against the deployed proxy.

## Acceptance criteria

- [ ] Playwright test suite runs four scenarios green against `vite preview`
- [ ] Pl@ntNet + MiMo calls are intercepted at `page.route`; no real network calls during tests
- [ ] Fixture JPEGs committed under `e2e/fixtures/` (no real camera needed)
- [ ] `npm run build` produces a deployable bundle with no errors
- [ ] Firebase Hosting serves the PWA at the production URL; HTTPS works
- [ ] Functions v2 `identifyPlant` and `generateSchedule` deployed; `curl` against them returns valid responses
- [ ] One full end-to-end scan-and-add exercised against the deployed URL (not just locally)
- [ ] Post-build verification recipe from the engineering skills is run; any bugs found are filed as fresh issues rather than fixed inline

## Blocked by

- Issue #2 (App shell + PWA boot)
- Issue #3 (Domain model + localStorage + dying detection)
- Issue #4 (Firebase project + identify flow end-to-end)
- Issue #5 (Schedule generation + plant detail page)
- Issue #6 (Today screen with dying banner)
- Issue #7 (ICS export)
- Issue #8 (Daily digest notification)
- Issue #9 (My Plants list + Settings)