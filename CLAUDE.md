# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`ai-relay-hub-fe` is the frontend for an "AI 中转站" — a single gateway that aggregates third-party AI generation models (video, image, audio, chat). It is currently a Vue 3 + Vite SPA, mocked end-to-end (no backend wired up).

## Commands

```bash
npm run dev      # Vite dev server on 0.0.0.0 (LAN-accessible)
npm run build    # Production build to dist/
npm run preview  # Preview built dist/ on 0.0.0.0
```

There is no test runner, linter, or formatter configured. Don't add `npm test` / `npm run lint` to suggestions — they will fail.

`vite.config.js` sets `base: './'`, so the build is meant to be served from any subpath as static files. Don't change `base` to `/` without understanding the deploy target.

## Architecture

**One file does almost everything: `src/App.vue` (~1080 lines).** Before adding logic, check whether it already lives there. The mental model:

- **Three views in one component**, switched by the `activeView` ref:
  - `'home'` — public marketing landing page (`page-shell`)
  - `'console'` — authenticated studio with sidebar model picker + bottom composer (`studio-shell`)
  - `'works'` — authenticated asset library + profile panel (`assets-shell`)
  Navigation is conditional rendering (`v-if` / `v-else-if` / `v-else`) on a single `<main>` — there is **no vue-router**.

- **Auth is fully mocked.** `isAuthenticated` flips to `true` when the verification-code form is submitted; `sendCode()` only runs a 60s countdown. No network calls. When wiring real auth, replace `submitAuth()` and `sendCode()` — don't introduce a router just for the gate.

- **i18n is an inline object, not a library.** All strings live in the `translations` object keyed by `zh` / `en` / `ja`, exposed through the `t` computed. Per-model copy lives on each model entry under `desc[locale]`. Adding a new string means adding it to all three locales **and** referencing `t.value.<path>` in template/script. Don't introduce vue-i18n unless asked.

- **Model catalog is hardcoded** in the `studioModels` array (id, name, vendor, score, category, accent color, multilingual desc). Category filtering uses `activeStudioCategory`; `'all'` and `'mine'` both return the full list (intentional placeholder for "mine").

- **Styling is one global stylesheet: `src/styles.css`** (~2000 lines). No scoped styles, no CSS modules, no Tailwind. The landing page uses a dark palette (CSS vars on `:root`: `--bg`, `--gold`, `--green`, `--clay`, `--ink`); the studio/assets views use a light palette defined inside their own selectors. Layout is CSS Grid with two responsive breakpoints (`980px`, `640px`).

- **Sidebar collapse** uses CSS custom properties on `.studio-shell` (`--sidebar-width`, `--composer-left`) so the fixed-position composer follows the sidebar — keep both vars in sync if you adjust widths.

## Conventions

- Vue 3 `<script setup>` with `ref` / `computed` / `watch` — no Pinia, no Composition API extraction into `composables/`.
- Template uses Unicode glyphs (`›`, `‹`, `⚡`, `◇`, `▧`, `♪`, etc.) as icons instead of an icon library. Preserve them when editing.
- Chinese is the primary development language for UI copy and the README; comments and identifiers stay in English.
