## Parent

Issue #1 — Plant Identifier PWA v1 (PRD).

## What to build

The foundation slice. Scaffold a Vite + React + TypeScript + Tailwind app with `vite-plugin-pwa`, install a router (e.g. React Router) with placeholder pages for `Today`, `Plant/:id`, `My Plants`, `Settings`, build the base layout (header + FAB slot + footer with "Powered by Pl@ntNet + MiMo"), wire the PWA manifest and service worker, and render a clear "no network" empty state when `navigator.onLine` is false. No domain logic, no Firebase — just a shell that boots offline and routes correctly.

This slice must be demoable on its own: opening the app shows a "Today" placeholder with an FAB; installing the PWA works; toggling network off shows the empty state.

## Acceptance criteria

- [ ] Vite + React + TypeScript + Tailwind scaffold builds with no errors
- [ ] `vite-plugin-pwa` produces a valid manifest and service worker; the app installs as a PWA on Chrome (Android) and registers a SW on desktop
- [ ] Four routes exist with placeholder pages: `Today`, `Plant/:id`, `My Plants`, `Settings`
- [ ] Base layout includes header, FAB slot (no functionality yet), and "Powered by Pl@ntNet + MiMo" footer
- [ ] When `navigator.onLine` is `false`, the home screen renders a "no network" empty state instead of the placeholder Today content
- [ ] `npm run build` succeeds and `npm run preview` boots the production build with the service worker active
- [ ] No domain code, no Firebase imports, no LLM calls

## Blocked by

None — can start immediately.