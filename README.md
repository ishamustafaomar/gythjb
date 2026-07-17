# Promptly

**Idea to app, in one conversation.**

Promptly is a production-grade, clean-room recreation of the chat-driven AI
app-builder experience (the Lovable.dev product category): describe what you
want to build, watch an agent generate it file by file with a live preview,
iterate through chat, and publish with one click.

Everything here — code, copy, branding, and design values — is original.
What's recreated is the *experience*: the workflow, interaction patterns,
layout system, motion, and polish of the category-defining product.

## How it works

There is no server. The "AI agent" is a real, deterministic, local
generation engine:

- Prompts are parsed into a structured **ProjectSpec** (template family,
  brand name, palette, sections, features).
- A code generator compiles the spec into a real multi-file web project
  (HTML/CSS/JS) that runs sandboxed in the preview iframe — the generated
  apps are genuinely interactive (todos persist, kanban drags, carts total).
- Follow-up messages are parsed into edit operations (recolor, dark mode,
  add/remove sections, rename, typography, …) and applied to the spec.
- Every turn produces a restorable version with a file-level diff summary.
- All variety is seeded — identical inputs always generate identical apps,
  which is what makes the engine testable.

State persists in `localStorage` behind a versioned, typed storage layer.

## Feature tour

- **Landing** — hero prompt composer with suggestion chips; the community
  showcase renders *live* miniature apps (real engine output in scaled,
  sandboxed iframes), each remixable into your own project.
- **Auth** — local email accounts plus one-click demo sign-in. A prompt
  submitted while signed out survives the auth redirect and becomes your
  first project.
- **Dashboard** — time-aware greeting, composer, searchable/sortable grid
  of projects with live thumbnails, rename/duplicate/delete.
- **Editor** — resizable chat panel with streamed responses, plan bullets,
  file-change cards and version chips; live preview with desktop/tablet/
  mobile widths; an element inspector (click anything in the preview to
  scope your next edit); a code view with file tree and syntax
  highlighting; version history with restore; a staged publish flow.
- **Model picker** — choose a model per task or leave it on Auto, which
  analyzes each prompt (UI tweak vs. debugging vs. large build) and routes
  it accordingly; every assistant turn shows which model handled it and
  why. Routing is real; generation stays on the local engine.
- **⌘K** command palette, keyboard shortcuts throughout, full dark mode,
  reduced-motion support, WCAG-minded semantics and focus management.

## Stack

React 18 · TypeScript (strict) · Vite · Tailwind CSS · Radix UI primitives ·
Zustand · React Router · Prism (lazy-loaded) · Vitest

## Development

```bash
npm install
npm run dev        # start the dev server
npm run test       # engine unit tests
npm run typecheck  # strict TS across app + node configs
npm run lint       # eslint
npm run build      # production build (tsc + vite)
```

## Architecture

```
src/
  engine/       pure, deterministic generation engine (no I/O, no DOM)
  stores/       zustand stores backed by versioned localStorage
  components/   ui primitives · shared components · layout
  features/     editor (chat, preview, code, history, publish, streaming)
  pages/        landing, auth, dashboard, community, pricing, settings, legal
  lib/          utilities (seeded PRNG, storage, formatting, media queries)
```

The engine is synchronous and pure; all pacing (thinking states, token
streaming, file-chip reveals) lives in a UI-side controller, so generation
logic stays timing-free and unit-testable.
