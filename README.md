# AI Relay Hub — Frontend

Vue 3 frontend for the "AI 中转站" platform. A single-page application for browsing AI models, submitting generation tasks, and managing generated assets — all through one gateway.

## Quick Start

```bash
npm install
npm run dev
```

Dev server starts on `http://0.0.0.0:5173` (LAN-accessible).

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Vue 3 (Composition API) |
| Build | Vite |
| Styling | CSS (global stylesheet, no framework) |
| Routing | None (view switching via `activeView` ref) |
| i18n | Inline object (zh / en / ja) |

## Project Status

**Phase 1** (complete) — full UI prototype with mock data. All auth, model catalog, and generation flow is hardcoded.

Next phase will involve:
- Splitting `App.vue` into components
- Adding `vue-i18n` with locale files
- Replacing mock functions with real API calls to the backend

## Views

- `/` (home) — marketing landing page with dark theme
- `/console` (after login) — studio workspace with model picker + composer
- `/works` — asset library + user profile

## Related

- Backend: [ai-relay-hub-be](https://github.com/halflazy/ai-relay-hub-be)

## Development

```bash
npm run dev      # Dev server
npm run build    # Production build → dist/
npm run preview  # Preview built assets
```
