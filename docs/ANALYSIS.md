# Product Analysis & Implementation Plan

Clean-room recreation of a chat-driven AI app-builder (the Lovable.dev product category),
shipped under an original brand: **Promptly** — "Idea to app, in one conversation."

No proprietary code, assets, copy, or branding is reproduced. What we recreate is the
*experience*: the workflow, interaction patterns, layout system, motion, and polish.

---

## 1. Product model

The product is a single-page web application with two halves:

1. **Marketing surface** — landing, community gallery, pricing, legal.
2. **App surface** — auth, projects dashboard, and the core **editor**: a chat panel on
   the left that drives an AI build agent, and a live preview / code view on the right.

The central loop: *type a prompt → agent streams a plan → files are generated → preview
refreshes → iterate with follow-up messages → publish*.

### Clean-room boundary

- Original name, logo (spark glyph), color values, gradients, and all copy.
- Interaction patterns, layout archetypes, and workflow are functional/uncopyrightable
  and are recreated faithfully.
- Fonts: Inter (OFL). Icons: lucide (ISC). Primitives: Radix UI (MIT).

### The "AI" backend

There is no server. The build agent is a **real, deterministic local generation engine**:

- Prompts are parsed into a structured **ProjectSpec** (template family, theme, brand
  name, sections, features).
- A code generator compiles the spec into a virtual file system (HTML/CSS/JS) that runs
  in a sandboxed iframe. Generated apps are genuinely interactive (todos persist, kanban
  drags, forms validate).
- Follow-up messages are parsed into **edit operations** (recolor, add section, rename,
  dark mode, sticky header, etc.) applied to the spec, then recompiled. Every edit
  produces a version snapshot with a file-level diff summary.
- Assistant replies stream token-by-token with a thinking state, plan text, and an
  "edited files" card — matching the real product's rhythm.

All state persists in `localStorage` behind a small typed storage layer.

---

## 2. Route map

| Route | Page | Auth | Notes |
|---|---|---|---|
| `/` | Landing | public | hero composer, how-it-works, community teaser, stats, CTA, footer |
| `/login`, `/signup` | Auth | public | real local email auth + demo SSO buttons |
| `/dashboard` | Projects | required | greeting, composer, searchable project grid |
| `/p/:projectId` | Editor | required | chat + preview/code, history, publish |
| `/community` | Gallery | public | filterable grid of remixable showcase projects |
| `/pricing` | Pricing | public | 3 tiers + billing toggle + FAQ accordion |
| `/settings` | Settings | required | profile, appearance (theme), danger zone |
| `/privacy`, `/terms` | Legal | public | short original documents |
| `*` | 404 | public | styled not-found with CTA home |

Unauthenticated visits to protected routes redirect to `/login?next=…`.
Submitting the landing composer while logged out stores the pending prompt, routes
through auth, then creates the project — no work lost.

## 3. Design tokens

- **Type**: Inter Variable. UI base 14px; scale 12/13/14/16/18/24/32/40/56/72.
  Headings `tracking-tight`, weight 550–650. Mono: ui-monospace stack for code.
- **Neutrals**: warm stone scale. Light bg `#FAFAF9`, card `#FFFFFF`, border
  `~#E7E5E4`. Dark bg `#0C0A09`, surface `#1C1917`, border `#292524`.
- **Accent**: original gradient `#F97066 → #E478FA → #7A5AF8` (coral→orchid→violet);
  primary interactive = near-black in light / near-white in dark (monochrome primary
  buttons, gradient reserved for brand moments).
- **Radii**: 8 / 12 / 16 / 24 / full. Cards 16, composer 24, buttons 10–full.
- **Shadows**: layered soft (`0 1px 2px rgb(0 0 0/.05)`, `0 8px 30px rgb(0 0 0/.08)`).
- **Motion**: micro 150ms ease-out; panels 250ms `cubic-bezier(.32,.72,0,1)`;
  streaming caret blink; shimmer skeletons; `prefers-reduced-motion` disables all.
- **Dark mode**: class strategy, system-default, toggle in settings + user menu.

## 4. Component inventory

**Primitives** (`components/ui`): Button (primary/secondary/ghost/outline/destructive ×
sm/md/lg/icon), Input, Textarea (autosize), Label, Dialog, AlertDialog, DropdownMenu,
Popover, Tooltip, Tabs, Switch, Badge, Avatar, Skeleton, Spinner, Kbd, Toast system,
ScrollArea (styled native), Separator, EmptyState.

**Shared**: Logo, MarketingHeader (translucent, blur, mobile sheet menu), Footer,
PromptComposer (hero/compact variants: autosize textarea, attach image chip, suggestion
chips, visibility toggle, submit button with disabled/loading states, Enter/Shift+Enter),
ProjectCard (live mini-preview thumbnail via scaled iframe srcdoc, kebab menu),
ThemeProvider, AuthGate, CommandPalette (⌘K: navigation + project search + actions).

**Editor** (`features/editor`): EditorTopBar (logo, editable project name, autosave dot,
publish, user menu), ChatPanel (virtual-ish list, day dividers, user bubbles, assistant
messages with streaming markdown, EditsCard with file chips + version badge + restore),
ChatComposer (attach, element-selection context chips, stop-generation), PreviewPane
(URL pill, device toggles desktop/tablet/mobile with animated width, refresh, open in
new tab, select-element toggle), CodeView (FileTree + line-numbered highlighted source,
copy button, file size), HistoryPanel (version list, restore with confirm), PublishDialog
(progress → success URL → copy/open/unpublish), ProjectSettingsDialog (rename, knowledge
textarea, delete), ResizeHandle (drag 320–560px, double-click reset, keyboard accessible).

## 5. Interaction & state details

- **Streaming lifecycle**: `queued → thinking (shimmer) → streaming text → applying
  edits (file chips appear one by one) → done (version chip)`. Esc or Stop cancels
  cleanly at any phase; partial spec changes are rolled back.
- **Select-element**: toggle inspector → iframe children get hover outlines (injected
  script, postMessage bridge) → click captures `{tag, text}` → context chip in composer
  → next edit is scoped ("make *this heading* larger").
- **Versions**: every generation snapshot `{id, n, files, spec, summary, ts}`; restore
  copies an old snapshot to a new head version (never rewrites history).
- **Publish**: staged progress (build → upload → live), result `https://{slug}.promptly.app`
  rendered as copyable pill; "open" uses a blob URL of the compiled app; republish/unpublish.
- **Optimistic updates**: rename, delete, visibility apply instantly; toasts confirm.
- **Empty states**: dashboard (no projects), search (no matches), chat (fresh project),
  community filter (no results) — all designed, none blank.
- **Errors**: unknown route 404; missing project → friendly recovery screen; storage
  quota errors surface a toast; engine parse failures fall back to a clarifying
  assistant reply (never a crash).
- **Keyboard**: ⌘K palette; ⌘Enter / Enter send; Shift+Enter newline; Esc stop/close;
  ⌘/ shortcuts dialog; arrows in menus/palette (Radix); visible `:focus-visible` rings.

## 6. Generation engine

```
engine/
  types.ts        ProjectSpec, TemplateId, EditOp, GenerationResult, VersionSummary
  parse.ts        prompt → {templateId, brandName, palette hints, sections, features}
  edits.ts        follow-up → EditOp[] (recolor/theme/section/copy/layout/font/density)
  respond.ts      seeded, varied assistant prose (plan text, edit summaries)
  codegen/        spec → VFS {path → contents}; shared css reset + theme vars
  templates/      landing, dashboard, todo, habit, portfolio, blog, store, kanban,
                  notes, pricing, recipes, chat  (12 families, each light+dark aware)
  compile.ts      VFS → single self-contained HTML document for iframe/publish
  index.ts        public API: createProject(prompt), applyMessage(spec, msg)
```

Determinism: all variety comes from a seeded PRNG keyed on project id + message index —
same inputs, same outputs, testable. Vitest covers parse, edits, codegen invariants
(valid HTML, palette propagation, section add/remove idempotence).

## 7. Architecture & stack

Vite + React 18 + TypeScript (strict) + Tailwind + Radix primitives + Zustand
(persist middleware → localStorage) + React Router 6 + lucide-react + prismjs
(lazy-loaded with code view). No server, no fake network calls — realistic latency is
simulated only inside the engine's streaming iterator, where it is honest UX, not a mock.

- Route-level code splitting (`React.lazy`); editor and prism in separate chunks.
- Stores: `auth` (users, session), `projects` (projects, versions, messages),
  `ui` (theme, toasts, palette open).
- Storage schema versioned (`promptly.v1.*`) with migration guard.

## 8. Responsive strategy

- Breakpoints: 640 / 768 / 1024 / 1280.
- Landing/marketing: fluid type via clamp; gallery 4→3→2→1 columns.
- Dashboard: grid auto-fill minmax(280px); composer full-width < 640.
- Editor < 1024px: chat and preview become **tabbed** (segmented control) instead of
  side-by-side; top bar collapses secondary actions into a menu; composer stays fixed
  bottom with safe-area padding.
- No horizontal overflow anywhere; long project names truncate with tooltips.

## 9. Accessibility

Semantic landmarks; Radix-managed focus traps and menus; all icon buttons labelled;
chat is `aria-live="polite"`; skeletons `aria-hidden`; contrast AA on both themes;
`prefers-reduced-motion` honored globally; keyboard path through the entire core loop.

## 10. Build order

1. Scaffold + tokens + primitives (foundation everything shares)
2. Engine contract (`types.ts`) → engine implementation + tests (parallel track)
3. App shell, stores, auth, routing guards
4. Landing page
5. Dashboard
6. Editor (chat, preview, code, history, publish)
7. Secondary pages (community, pricing, settings, legal, 404)
8. Command palette, shortcuts, final polish pass
9. QA: typecheck, lint, unit tests, build, multi-viewport screenshot audit, a11y sweep
10. Multi-agent adversarial review → fix confirmed findings
