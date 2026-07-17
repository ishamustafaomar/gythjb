/**
 * Shared codegen helpers: theming, base CSS, chrome (header/footer) and the
 * section renderers used by page-like templates. Everything is a pure
 * function of the spec — variety comes from rngs derived from spec.seed.
 */
import { createRng, type Rng } from '@/lib/seeded';
import type {
  FontStyle,
  ProjectSpec,
  RadiusStyle,
  SectionId,
  TemplateId,
} from '../types';

export interface TemplateOutput {
  /** Everything between <body> and </body>. */
  body: string;
  /** Full contents of css/styles.css. */
  css: string;
  /** Full contents of js/app.js. */
  js: string;
}

export const TEMPLATE_LABELS: Record<TemplateId, string> = {
  landing: 'Landing page',
  dashboard: 'Analytics dashboard',
  todo: 'To-do list',
  habit: 'Habit tracker',
  portfolio: 'Portfolio site',
  blog: 'Blog',
  store: 'Online store',
  kanban: 'Kanban board',
  notes: 'Notes app',
  pricing: 'Pricing page',
  recipes: 'Recipe collection',
  chat: 'Chat app',
};

/* ------------------------------------------------------------------ */
/* Text utilities                                                      */
/* ------------------------------------------------------------------ */

export function esc(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug.length > 0 ? slug : 'project';
}

/** Serializes seeded data for embedding in generated JS. */
export function toJsLiteral(value: unknown): string {
  return JSON.stringify(value).replaceAll('</', '<\\/');
}

/* ------------------------------------------------------------------ */
/* Color utilities                                                     */
/* ------------------------------------------------------------------ */

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const value = Number.parseInt(clean, 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (channel: number): number => Math.max(0, Math.min(255, Math.round(channel)));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}

/** Blends `amount` of color `b` into color `a` (0 = a, 1 = b). */
export function mix(a: string, b: string, amount: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex(ar + (br - ar) * amount, ag + (bg - ag) * amount, ab + (bb - ab) * amount);
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  const channel = (value: number): number => {
    const scaled = value / 255;
    return scaled <= 0.03928 ? scaled / 12.92 : Math.pow((scaled + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** White or near-black, whichever reads better on the given color. */
export function contrastOn(hex: string): string {
  return luminance(hex) > 0.45 ? '#14161B' : '#FFFFFF';
}

/* ------------------------------------------------------------------ */
/* Theme derivation                                                    */
/* ------------------------------------------------------------------ */

export interface Theme {
  bg: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  muted: string;
  border: string;
  primary: string;
  primaryStrong: string;
  primarySoft: string;
  primaryContrast: string;
  accent: string;
  accentSoft: string;
  headerBg: string;
  shadow: string;
}

export function deriveTheme(spec: ProjectSpec): Theme {
  const { mode } = spec.palette;
  let primary = spec.palette.primary;
  const accent = spec.palette.accent;

  if (mode === 'dark' && luminance(primary) < 0.09) {
    primary = mix(primary, '#FFFFFF', 0.35);
  }
  if (mode === 'light' && luminance(primary) > 0.72) {
    primary = mix(primary, '#000000', 0.3);
  }

  if (mode === 'dark') {
    const surface = mix('#151A21', primary, 0.04);
    return {
      bg: mix('#0E1116', primary, 0.05),
      surface,
      surfaceAlt: mix('#1B212B', primary, 0.05),
      text: '#EDF0F7',
      muted: '#99A2B4',
      border: mix('#262D39', primary, 0.08),
      primary,
      primaryStrong: mix(primary, '#FFFFFF', 0.12),
      primarySoft: mix(surface, primary, 0.24),
      primaryContrast: contrastOn(primary),
      accent,
      accentSoft: mix(surface, accent, 0.28),
      headerBg: `${mix('#0E1116', primary, 0.05)}E6`,
      shadow: '0 14px 34px rgba(0, 0, 0, 0.42)',
    };
  }

  return {
    bg: mix('#F7F8FB', primary, 0.03),
    surface: '#FFFFFF',
    surfaceAlt: mix('#F1F3F8', primary, 0.05),
    text: '#171A21',
    muted: '#5B6472',
    border: mix('#E4E7EE', primary, 0.06),
    primary,
    primaryStrong: mix(primary, '#000000', 0.16),
    primarySoft: mix('#FFFFFF', primary, 0.12),
    primaryContrast: contrastOn(primary),
    accent,
    accentSoft: mix('#FFFFFF', accent, 0.18),
    headerBg: '#FFFFFFE6',
    shadow: '0 14px 34px rgba(21, 26, 36, 0.09)',
  };
}

const RADII: Record<RadiusStyle, { sm: string; md: string; lg: string; btn: string }> = {
  sharp: { sm: '0', md: '0', lg: '0', btn: '0' },
  rounded: { sm: '6px', md: '12px', lg: '20px', btn: '10px' },
  pill: { sm: '10px', md: '18px', lg: '28px', btn: '999px' },
};

const FONT_STACKS: Record<FontStyle, string> = {
  sans: "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  serif: "Georgia, 'Iowan Old Style', 'Palatino Linotype', 'Times New Roman', serif",
  mono: "ui-monospace, 'SF Mono', 'Cascadia Code', Menlo, Consolas, monospace",
};

export function cssVariables(spec: ProjectSpec): string {
  const theme = deriveTheme(spec);
  const radii = RADII[spec.radius];
  const compact = spec.features.includes('compact');
  const sectionPad = compact ? 'clamp(2.25rem, 5vw, 3.5rem)' : 'clamp(3.5rem, 8vw, 6.5rem)';
  const gap = compact ? '1rem' : '1.5rem';

  return `:root {
  color-scheme: ${spec.palette.mode};
  --primary: ${theme.primary};
  --primary-strong: ${theme.primaryStrong};
  --primary-soft: ${theme.primarySoft};
  --primary-contrast: ${theme.primaryContrast};
  --accent: ${theme.accent};
  --accent-soft: ${theme.accentSoft};
  --bg: ${theme.bg};
  --surface: ${theme.surface};
  --surface-alt: ${theme.surfaceAlt};
  --text: ${theme.text};
  --muted: ${theme.muted};
  --border: ${theme.border};
  --header-bg: ${theme.headerBg};
  --shadow: ${theme.shadow};
  --font-body: ${FONT_STACKS[spec.font]};
  --radius-sm: ${radii.sm};
  --radius-md: ${radii.md};
  --radius-lg: ${radii.lg};
  --radius-btn: ${radii.btn};
  --section-pad: ${sectionPad};
  --gap: ${gap};
}`;
}

export function baseCss(spec: ProjectSpec): string {
  const animations = spec.features.includes('animations');

  const animationBlock = animations
    ? `

/* Entry animations (opt-out honored via reduced motion). */
@media (prefers-reduced-motion: no-preference) {
  @keyframes rise {
    from { opacity: 0; transform: translateY(14px); }
    to { opacity: 1; transform: none; }
  }
  .hero-inner,
  .section > .container,
  .app-main > * {
    animation: rise 0.6s ease backwards;
  }
  .section:nth-of-type(2) > .container { animation-delay: 0.05s; }
  .section:nth-of-type(3) > .container { animation-delay: 0.1s; }
  .section:nth-of-type(4) > .container { animation-delay: 0.15s; }
}`
    : '';

  return `/* Reset + base */
*, *::before, *::after { box-sizing: border-box; }
* { margin: 0; }
html { scroll-behavior: smooth; }
body {
  font-family: var(--font-body);
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}
img, svg { display: block; max-width: 100%; }
input, button, textarea, select { font: inherit; color: inherit; }
a { color: var(--primary); text-decoration: none; }
a:hover { text-decoration: underline; }
h1, h2, h3, h4 { line-height: 1.15; font-weight: 700; letter-spacing: -0.015em; }
h1 { font-size: clamp(2.1rem, 5.5vw, 3.4rem); }
h2 { font-size: clamp(1.5rem, 3.2vw, 2.2rem); }
h3 { font-size: 1.125rem; }
p { max-width: 65ch; }

.container { width: min(100% - 2.5rem, 68rem); margin-inline: auto; }
.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}

/* Buttons */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
  padding: 0.65rem 1.25rem; border-radius: var(--radius-btn);
  border: 1px solid transparent; font-weight: 600; cursor: pointer;
  background: transparent;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease,
    border-color 0.15s ease, color 0.15s ease;
}
.btn:hover { text-decoration: none; transform: translateY(-1px); }
.btn:active { transform: translateY(0); }
.btn-primary { background: var(--primary); color: var(--primary-contrast); box-shadow: var(--shadow); }
.btn-primary:hover { background: var(--primary-strong); }
.btn-ghost { color: var(--text); border-color: var(--border); }
.btn-ghost:hover { border-color: var(--primary); color: var(--primary); }
.btn-lg { padding: 0.85rem 1.75rem; font-size: 1.05rem; }
.btn:focus-visible, a:focus-visible, input:focus-visible,
textarea:focus-visible, select:focus-visible, summary:focus-visible {
  outline: 2px solid var(--primary); outline-offset: 2px;
}

/* Forms */
input[type='text'], input[type='email'], input[type='search'], textarea, select {
  width: 100%; padding: 0.6rem 0.8rem; border-radius: var(--radius-sm);
  border: 1px solid var(--border); background: var(--surface); color: var(--text);
}
input:focus, textarea:focus, select:focus { border-color: var(--primary); }
input.invalid, textarea.invalid { border-color: #D64550; }
label { font-weight: 600; font-size: 0.9rem; }

/* Surfaces */
.card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-md);
}
.badge {
  display: inline-block; padding: 0.15rem 0.65rem; border-radius: var(--radius-btn);
  background: var(--primary-soft); color: var(--primary-strong);
  font-size: 0.78rem; font-weight: 700; letter-spacing: 0.02em;
}

/* Header / footer chrome */
.site-header {
  border-bottom: 1px solid var(--border);
  background: var(--header-bg);
}
.site-header.sticky {
  position: sticky; top: 0; z-index: 50;
  backdrop-filter: blur(10px);
}
.header-inner {
  display: flex; align-items: center; justify-content: space-between;
  gap: 1rem; padding-block: 0.85rem;
}
.brand { display: inline-flex; align-items: center; gap: 0.55rem; color: var(--text); font-weight: 700; }
.brand:hover { text-decoration: none; }
.brand-mark {
  width: 0.95rem; height: 0.95rem; border-radius: var(--radius-sm);
  background: linear-gradient(135deg, var(--primary), var(--accent));
}
.site-nav { display: flex; flex-wrap: wrap; gap: 1.1rem; }
.site-nav a { color: var(--muted); font-weight: 500; font-size: 0.95rem; }
.site-nav a:hover { color: var(--primary); text-decoration: none; }

.site-footer { border-top: 1px solid var(--border); margin-top: auto; }
.footer-inner {
  display: flex; flex-wrap: wrap; justify-content: space-between; gap: 0.75rem;
  padding-block: 1.5rem; color: var(--muted); font-size: 0.9rem;
}

/* Layout primitives */
.section { padding-block: var(--section-pad); }
.section-head { max-width: 38rem; margin-bottom: 2rem; }
.section-head p { color: var(--muted); margin-top: 0.5rem; }
.grid { display: grid; gap: var(--gap); }
.grid.cols-3 { grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
.grid.cols-2 { grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
.eyebrow {
  display: inline-block; margin-bottom: 1rem; padding: 0.2rem 0.75rem;
  border-radius: var(--radius-btn); border: 1px solid var(--border);
  background: var(--surface); color: var(--muted);
  font-size: 0.8rem; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase;
}
.app-main { padding-block: clamp(1.5rem, 4vw, 3rem); }${animationBlock}`;
}

/* ------------------------------------------------------------------ */
/* Chrome                                                              */
/* ------------------------------------------------------------------ */

export interface NavLink {
  href: string;
  label: string;
}

export function renderHeader(
  spec: ProjectSpec,
  links: readonly NavLink[],
  actions = '',
): string {
  const sticky = spec.features.includes('sticky-header') ? ' sticky' : '';
  const nav = links
    .map((link) => `        <a href="${esc(link.href)}">${esc(link.label)}</a>`)
    .join('\n');
  const navBlock = links.length > 0
    ? `      <nav class="site-nav" aria-label="Primary">\n${nav}\n      </nav>\n`
    : '';
  const actionBlock = actions.length > 0 ? `      ${actions}\n` : '';

  return `  <header class="site-header${sticky}" id="top">
    <div class="container header-inner">
      <a class="brand" href="#top">
        <span class="brand-mark" aria-hidden="true"></span>
        <span class="brand-name">${esc(spec.name)}</span>
      </a>
${navBlock}${actionBlock}    </div>
  </header>`;
}

export function renderFooter(spec: ProjectSpec): string {
  return `  <footer class="site-footer">
    <div class="container footer-inner">
      <span>&copy; ${esc(spec.name)} — ${esc(spec.tagline)}</span>
      <span class="footer-credit">Built with Promptly</span>
    </div>
  </footer>`;
}

/** Header nav links derived from the page's sections. */
export function sectionNavLinks(spec: ProjectSpec): NavLink[] {
  const labels: Partial<Record<SectionId, string>> = {
    features: 'Features',
    stats: 'Numbers',
    gallery: 'Work',
    about: 'About',
    testimonials: 'Stories',
    pricing: 'Pricing',
    faq: 'FAQ',
    contact: 'Contact',
  };
  const links: NavLink[] = [];
  for (const section of spec.sections) {
    const label = labels[section];
    if (label) links.push({ href: `#${section}`, label });
    if (links.length >= 5) break;
  }
  return links;
}

/* ------------------------------------------------------------------ */
/* Section renderers (page-like templates)                             */
/* ------------------------------------------------------------------ */

function sectionRng(spec: ProjectSpec, id: string): Rng {
  return createRng(`${spec.seed}:section:${id}`);
}

function primaryTargetHref(spec: ProjectSpec): string {
  for (const candidate of ['cta', 'contact', 'pricing', 'features'] as const) {
    if (spec.sections.includes(candidate)) return `#${candidate}`;
  }
  return '#top';
}

function renderHero(spec: ProjectSpec): string {
  const rng = sectionRng(spec, 'hero');
  const name = esc(spec.name);
  const tagline = esc(spec.tagline);

  let eyebrow: string;
  let headline: string;
  let lede: string;
  let primaryCta: string;
  let primaryHref: string;
  let ghostCta: string;
  let ghostHref: string;

  if (spec.template === 'portfolio') {
    eyebrow = rng.pick(['Portfolio', 'Selected work', 'Case studies']);
    headline = rng.pick([`${name} — selected work`, tagline]);
    lede = rng.pick([
      'A short collection of projects worth signing.',
      'Design, build, refine — the favorites live here.',
      'Fewer pieces, shown properly, with the thinking behind them.',
    ]);
    primaryCta = 'See the work';
    primaryHref = spec.sections.includes('gallery') ? '#gallery' : primaryTargetHref(spec);
    ghostCta = 'Get in touch';
    ghostHref = spec.sections.includes('contact') ? '#contact' : '#top';
  } else {
    eyebrow = rng.pick([
      'Now in early access',
      'Fresh from the studio',
      'New for this season',
      'Quietly launched',
    ]);
    if (rng.chance(0.5)) {
      headline = tagline;
      lede = rng.pick([
        `${name} keeps that promise without ceremony — no clutter, no learning curve.`,
        `That is the whole idea behind ${name}: thoughtfully small, deliberately fast.`,
        `${name} puts everything in its place from the first click.`,
      ]);
    } else {
      headline = rng.pick([`Meet ${name}.`, `${name}, at your service.`]);
      lede = tagline;
    }
    primaryCta = rng.pick(['Get started', 'Start free', 'Try it now', 'Get early access']);
    primaryHref = primaryTargetHref(spec);
    ghostCta = rng.pick(['See how it works', 'Take the tour', 'Learn more']);
    ghostHref = spec.sections.includes('features') ? '#features' : primaryHref;
  }

  return `  <section class="section hero" id="hero">
    <div class="container hero-inner">
      <span class="eyebrow">${esc(eyebrow)}</span>
      <h1>${headline}</h1>
      <p class="lede">${lede}</p>
      <div class="hero-actions">
        <a class="btn btn-primary btn-lg" href="${primaryHref}">${esc(primaryCta)}</a>
        <a class="btn btn-ghost btn-lg" href="${ghostHref}">${esc(ghostCta)}</a>
      </div>
    </div>
  </section>`;
}

const FEATURE_POOL: ReadonlyArray<{ title: string; body: string }> = [
  { title: 'Quick to start', body: 'Be productive before your coffee cools — there is nothing to install and nothing to configure.' },
  { title: 'Thoughtful defaults', body: 'Sensible settings out of the box, with room to tune everything later.' },
  { title: 'Works everywhere', body: 'A responsive layout that feels at home on phones, tablets and widescreens.' },
  { title: 'Private by design', body: 'Your data stays yours. No trackers, no surprise sharing, no fine print.' },
  { title: 'Keyboard friendly', body: 'Every common action has a shortcut, so your hands never leave the keys.' },
  { title: 'Plays well with others', body: 'Import and export in open formats whenever you need to move things around.' },
  { title: 'Built to last', body: 'Fast pages, honest engineering and updates that never break your flow.' },
  { title: 'Help that helps', body: 'Real documentation and a support inbox read by actual humans.' },
];

function renderFeatures(spec: ProjectSpec): string {
  const rng = sectionRng(spec, 'features');
  const heading = rng.pick([
    `Why people pick ${esc(spec.name)}`,
    "Everything you need, nothing you don't",
    'Built around your day',
  ]);
  const sub = rng.pick([
    'A short list of the things that matter.',
    'The essentials, done properly.',
    'Small features that add up to a calmer day.',
  ]);
  const count = rng.pick([3, 6] as const);
  const start = rng.int(0, FEATURE_POOL.length - 1);
  const cards: string[] = [];
  for (let i = 0; i < count; i++) {
    const feature = FEATURE_POOL[(start + i) % FEATURE_POOL.length];
    if (!feature) continue;
    cards.push(`        <article class="card feature">
          <div class="feature-glyph art-${(i % 6) + 1}" aria-hidden="true"></div>
          <h3>${esc(feature.title)}</h3>
          <p>${esc(feature.body)}</p>
        </article>`);
  }

  return `  <section class="section features" id="features">
    <div class="container">
      <div class="section-head">
        <h2>${heading}</h2>
        <p>${sub}</p>
      </div>
      <div class="grid cols-3 feature-grid">
${cards.join('\n')}
      </div>
    </div>
  </section>`;
}

function renderStats(spec: ProjectSpec): string {
  const rng = sectionRng(spec, 'stats');
  const heading = rng.pick([
    `The numbers behind ${esc(spec.name)}`,
    'Proof, in plain figures',
    'Quietly getting big',
  ]);
  const stats: Array<{ value: string; label: string }> = [
    { value: `${rng.int(8, 46)}k+`, label: 'people on board' },
    { value: `${rng.int(97, 99)}.${rng.int(2, 9)}%`, label: 'uptime last year' },
    { value: `4.${rng.int(6, 9)}/5`, label: 'average rating' },
    { value: `${rng.int(12, 48)}h`, label: 'saved per member, monthly' },
  ];
  const items = stats
    .map(
      (stat) => `        <div class="stat">
          <span class="stat-value">${esc(stat.value)}</span>
          <span class="stat-label">${esc(stat.label)}</span>
        </div>`,
    )
    .join('\n');

  return `  <section class="section stats" id="stats">
    <div class="container">
      <div class="section-head">
        <h2>${heading}</h2>
      </div>
      <div class="stat-band">
${items}
      </div>
    </div>
  </section>`;
}

const GALLERY_TITLES: readonly string[] = [
  'Wayfarer identity', 'Lumen app redesign', 'Harbor editorial', 'Atlas packaging',
  'Field-guide microsite', 'Studio reel', 'Cobalt exhibition', 'Paper goods series',
];
const GALLERY_KINDS: readonly string[] = [
  'Brand', 'Product', 'Editorial', 'Packaging', 'Web', 'Motion', 'Exhibition', 'Print',
];

function renderGallery(spec: ProjectSpec): string {
  const rng = sectionRng(spec, 'gallery');
  const heading = rng.pick(['Recent work', 'Selected projects', 'From the archive']);
  const start = rng.int(0, GALLERY_TITLES.length - 1);
  const tiles: string[] = [];
  for (let i = 0; i < 6; i++) {
    const title = GALLERY_TITLES[(start + i) % GALLERY_TITLES.length] ?? 'Untitled study';
    const kind = GALLERY_KINDS[(start + i) % GALLERY_KINDS.length] ?? 'Study';
    tiles.push(`        <figure class="tile">
          <div class="tile-art art-${(i % 6) + 1}" aria-hidden="true"></div>
          <figcaption>
            <strong>${esc(title)}</strong>
            <span>${esc(kind)}</span>
          </figcaption>
        </figure>`);
  }

  return `  <section class="section gallery" id="gallery">
    <div class="container">
      <div class="section-head">
        <h2>${esc(heading)}</h2>
      </div>
      <div class="grid cols-3 gallery-grid">
${tiles.join('\n')}
      </div>
    </div>
  </section>`;
}

function renderAbout(spec: ProjectSpec): string {
  const rng = sectionRng(spec, 'about');
  const name = esc(spec.name);
  const first = rng.pick([
    `${name} started as a side project and grew up on real feedback from people who used it every day.`,
    `${name} is small on purpose. We would rather do a handful of things properly than everything halfway.`,
    `Behind ${name} is a simple belief: good tools should feel quiet, quick and considered.`,
  ]);
  const second = rng.pick([
    'These days it helps a steadily growing crowd do better work with less fuss — and that is the whole ambition.',
    'What you see here is the result: careful defaults, honest materials and no filler.',
    'Every release is measured against one question — does this make the day simpler?',
  ]);

  return `  <section class="section about" id="about">
    <div class="container about-inner">
      <div class="about-art art-2" aria-hidden="true"></div>
      <div class="about-copy">
        <h2>About ${name}</h2>
        <p>${first}</p>
        <p>${second}</p>
      </div>
    </div>
  </section>`;
}

const TESTIMONIAL_PEOPLE: ReadonlyArray<{ name: string; role: string }> = [
  { name: 'Maya Linden', role: 'Founder, Fieldnote Labs' },
  { name: 'Tomas Reyes', role: 'Product designer' },
  { name: 'Priya Nair', role: 'Studio owner' },
  { name: 'Jonah Beck', role: 'Operations lead' },
  { name: 'Aiko Tanaka', role: 'Indie developer' },
  { name: 'Ruth Okafor', role: 'Marketing director' },
  { name: 'Leo Marchetti', role: 'Freelance photographer' },
  { name: 'Sofia Brandt', role: 'Community manager' },
];

function testimonialQuotes(name: string): readonly string[] {
  return [
    `We switched to ${name} on a Tuesday and nobody has mentioned the old way since.`,
    `${name} feels like it was designed by someone who actually does this work.`,
    `The rare tool that stays out of the way. I open ${name} and just get on with it.`,
    `Clean, quick and pleasantly boring in the best sense. ${name} simply works.`,
    `I recommended ${name} to three friends before the first week was out.`,
    `Every detail feels considered. ${name} raised the bar for our whole toolkit.`,
  ];
}

function renderTestimonials(spec: ProjectSpec): string {
  const rng = sectionRng(spec, 'testimonials');
  const heading = rng.pick(['Kind words', 'What people say', 'From the inbox']);
  const quotes = testimonialQuotes(spec.name);
  const quoteStart = rng.int(0, quotes.length - 1);
  const personStart = rng.int(0, TESTIMONIAL_PEOPLE.length - 1);
  const cards: string[] = [];
  for (let i = 0; i < 3; i++) {
    const quote = quotes[(quoteStart + i) % quotes.length] ?? '';
    const person = TESTIMONIAL_PEOPLE[(personStart + i) % TESTIMONIAL_PEOPLE.length];
    if (!person) continue;
    cards.push(`        <figure class="card testimonial">
          <blockquote>&ldquo;${esc(quote)}&rdquo;</blockquote>
          <figcaption>
            <span class="avatar art-${(i % 6) + 1}" aria-hidden="true"></span>
            <span>
              <strong>${esc(person.name)}</strong>
              <span class="testimonial-role">${esc(person.role)}</span>
            </span>
          </figcaption>
        </figure>`);
  }

  return `  <section class="section testimonials" id="testimonials">
    <div class="container">
      <div class="section-head">
        <h2>${esc(heading)}</h2>
      </div>
      <div class="grid cols-3 testimonial-grid">
${cards.join('\n')}
      </div>
    </div>
  </section>`;
}

function renderPricing(spec: ProjectSpec): string {
  const rng = sectionRng(spec, 'pricing');
  const heading = rng.pick(['Simple, honest pricing', 'Pick your pace', 'Plans for every stage']);
  const sub = rng.pick([
    'Every plan starts with a 14-day trial. No card required.',
    'Switch or cancel whenever — your work always stays exportable.',
  ]);
  const tierNames = rng.pick([
    ['Starter', 'Growth', 'Scale'],
    ['Basic', 'Plus', 'Pro'],
    ['Solo', 'Studio', 'Agency'],
  ] as const);
  const prices = rng.pick([
    [0, 19, 49],
    [9, 29, 79],
    [12, 32, 89],
  ] as const);
  const badge = rng.pick(['Most popular', 'Best value', 'Recommended']);
  const featureSets: readonly (readonly string[])[] = [
    ['Up to 3 active projects', 'All core features', 'Community support'],
    ['Unlimited projects', 'Advanced reporting', 'Priority email support', 'Custom domains'],
    ['Everything in the middle tier', 'Dedicated onboarding', 'Single sign-on', 'Quarterly reviews'],
  ];

  const cards: string[] = [];
  for (let i = 0; i < 3; i++) {
    const tierName = tierNames[i] ?? 'Plan';
    const price = prices[i] ?? 0;
    const featured = i === 1;
    const bullets = (featureSets[i] ?? [])
      .map((bullet) => `            <li>${esc(bullet)}</li>`)
      .join('\n');
    cards.push(`        <article class="card tier${featured ? ' tier-featured' : ''}">
${featured ? `          <span class="badge">${esc(badge)}</span>\n` : ''}          <h3>${esc(tierName)}</h3>
          <p class="tier-price"><strong>$${price}</strong><span>/mo</span></p>
          <ul class="tier-list">
${bullets}
          </ul>
          <a class="btn ${featured ? 'btn-primary' : 'btn-ghost'}" href="#cta">Choose ${esc(tierName)}</a>
        </article>`);
  }

  return `  <section class="section pricing" id="pricing">
    <div class="container">
      <div class="section-head">
        <h2>${esc(heading)}</h2>
        <p>${esc(sub)}</p>
      </div>
      <div class="grid cols-3 tier-grid">
${cards.join('\n')}
      </div>
    </div>
  </section>`;
}

function faqEntries(name: string): ReadonlyArray<{ q: string; a: string }> {
  return [
    {
      q: 'How long does setup take?',
      a: `Minutes. Create an account, pick your defaults and ${name} is ready — there is nothing to install.`,
    },
    {
      q: 'Can I change my plan later?',
      a: 'Any time. Upgrades apply immediately and downgrades take effect at the end of the billing cycle.',
    },
    {
      q: 'Is my data portable?',
      a: 'Yes. You can export everything in open formats from settings whenever you like.',
    },
    {
      q: 'Do you offer discounts?',
      a: 'Students, educators and non-profits get 40% off — write to us from your institution address.',
    },
    {
      q: 'What happens if I cancel?',
      a: 'Your work stays readable and exportable for 60 days, and billing stops the same day.',
    },
  ];
}

function renderFaq(spec: ProjectSpec): string {
  const rng = sectionRng(spec, 'faq');
  const heading = rng.pick(['Questions, answered', 'Frequently asked', 'Before you ask']);
  const entries = faqEntries(esc(spec.name));
  const count = rng.pick([4, 5] as const);
  const items = entries
    .slice(0, count)
    .map(
      (entry) => `        <details class="faq-item">
          <summary>${entry.q}</summary>
          <p>${entry.a}</p>
        </details>`,
    )
    .join('\n');

  return `  <section class="section faq" id="faq">
    <div class="container faq-inner">
      <div class="section-head">
        <h2>${esc(heading)}</h2>
      </div>
${items}
    </div>
  </section>`;
}

function renderContact(spec: ProjectSpec): string {
  const rng = sectionRng(spec, 'contact');
  const heading = rng.pick(['Say hello', 'Get in touch', 'Start a conversation']);
  const sub = rng.pick([
    'Questions, ideas or a project in mind — the inbox is open.',
    `A short note is plenty. The ${esc(spec.name)} inbox is read daily.`,
  ]);

  return `  <section class="section contact" id="contact">
    <div class="container contact-inner">
      <div class="section-head">
        <h2>${esc(heading)}</h2>
        <p>${sub}</p>
      </div>
      <form id="contact-form" novalidate>
        <div class="field">
          <label for="contact-name">Name</label>
          <input id="contact-name" name="name" type="text" autocomplete="name" />
          <p class="field-error" data-error-for="contact-name" role="alert"></p>
        </div>
        <div class="field">
          <label for="contact-email">Email</label>
          <input id="contact-email" name="email" type="email" autocomplete="email" />
          <p class="field-error" data-error-for="contact-email" role="alert"></p>
        </div>
        <div class="field">
          <label for="contact-message">Message</label>
          <textarea id="contact-message" name="message" rows="5"></textarea>
          <p class="field-error" data-error-for="contact-message" role="alert"></p>
        </div>
        <button class="btn btn-primary" type="submit">Send message</button>
        <p class="form-note" id="contact-status" role="status"></p>
      </form>
    </div>
  </section>`;
}

function renderNewsletter(spec: ProjectSpec): string {
  const rng = sectionRng(spec, 'newsletter');
  const heading = rng.pick([
    'Occasional letters, zero noise',
    'One good email a month',
    'Stay in the loop',
  ]);
  const sub = rng.pick([
    `News from ${esc(spec.name)}, only when there is something worth saying.`,
    'Unsubscribe in one click, keep your inbox calm.',
  ]);

  return `  <section class="section newsletter" id="newsletter">
    <div class="container newsletter-inner">
      <h2>${esc(heading)}</h2>
      <p>${sub}</p>
      <form id="newsletter-form" novalidate>
        <label class="sr-only" for="newsletter-email">Email address</label>
        <input id="newsletter-email" type="email" placeholder="you@example.com" />
        <button class="btn btn-primary" type="submit">Subscribe</button>
      </form>
      <p class="form-note" id="newsletter-status" role="status"></p>
    </div>
  </section>`;
}

function renderCta(spec: ProjectSpec): string {
  const rng = sectionRng(spec, 'cta');
  const name = esc(spec.name);
  const heading = rng.pick([`Ready to try ${name}?`, 'Ready when you are.', `Bring ${name} to your day.`]);
  const sub = rng.pick([
    "Setup takes about a minute. Leaving takes even less — but you won't want to.",
    'Free to start, easy to leave, hard to give up.',
  ]);
  const button = rng.pick(['Get started now', 'Create your space', 'Start today']);

  return `  <section class="section cta" id="cta">
    <div class="container cta-inner">
      <h2>${heading}</h2>
      <p>${sub}</p>
      <a class="btn btn-primary btn-lg" href="#top">${esc(button)}</a>
    </div>
  </section>`;
}

export function renderSection(id: SectionId, spec: ProjectSpec): string {
  switch (id) {
    case 'hero':
      return renderHero(spec);
    case 'features':
      return renderFeatures(spec);
    case 'stats':
      return renderStats(spec);
    case 'gallery':
      return renderGallery(spec);
    case 'about':
      return renderAbout(spec);
    case 'testimonials':
      return renderTestimonials(spec);
    case 'pricing':
      return renderPricing(spec);
    case 'faq':
      return renderFaq(spec);
    case 'contact':
      return renderContact(spec);
    case 'newsletter':
      return renderNewsletter(spec);
    case 'cta':
      return renderCta(spec);
  }
}

/* ------------------------------------------------------------------ */
/* Section CSS + JS                                                    */
/* ------------------------------------------------------------------ */

/** Gradient art swatch classes (.art-1 … .art-6), seeded per project. */
export function gradientArtCss(spec: ProjectSpec): string {
  const rng = createRng(`${spec.seed}:art`);
  const theme = deriveTheme(spec);
  const rules: string[] = [];
  for (let i = 1; i <= 6; i++) {
    const angle = rng.int(110, 160);
    const from = mix(theme.primary, theme.accent, rng.int(0, 30) / 100);
    const mid = mix(theme.accent, theme.primary, rng.int(20, 60) / 100);
    const to = mix(theme.accent, spec.palette.mode === 'dark' ? '#0E1116' : '#FFFFFF', rng.int(15, 45) / 100);
    rules.push(`.art-${i} { background: linear-gradient(${angle}deg, ${from}, ${mid} 55%, ${to}); }`);
  }
  return rules.join('\n');
}

export function pageSectionsCss(spec: ProjectSpec): string {
  return `/* Page sections */
.hero { text-align: center; padding-block: calc(var(--section-pad) * 1.2) var(--section-pad); }
.hero-inner { max-width: 46rem; margin-inline: auto; }
.hero .lede { margin: 1.25rem auto 2rem; color: var(--muted); font-size: 1.15rem; }
.hero-actions { display: flex; flex-wrap: wrap; gap: 0.75rem; justify-content: center; }

.feature { padding: 1.5rem; transition: transform 0.15s ease, box-shadow 0.15s ease; }
.feature:hover { transform: translateY(-3px); box-shadow: var(--shadow); }
.feature-glyph { width: 2.4rem; height: 2.4rem; border-radius: var(--radius-sm); margin-bottom: 1rem; }
.feature p { color: var(--muted); margin-top: 0.4rem; font-size: 0.95rem; }

.stats { background: var(--surface-alt); }
.stat-band { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: var(--gap); }
.stat { display: grid; gap: 0.15rem; }
.stat-value { font-size: clamp(1.8rem, 4vw, 2.6rem); font-weight: 800; color: var(--primary); }
.stat-label { color: var(--muted); font-size: 0.9rem; }

.tile { display: grid; gap: 0.6rem; }
.tile-art { aspect-ratio: 4 / 3; border-radius: var(--radius-md); transition: transform 0.2s ease; }
.tile:hover .tile-art { transform: scale(1.02); }
.tile figcaption { display: grid; }
.tile figcaption span { color: var(--muted); font-size: 0.85rem; }

.about-inner { display: grid; gap: 2rem; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); align-items: center; }
.about-art { aspect-ratio: 1; max-width: 22rem; border-radius: var(--radius-lg); }
.about-copy p { color: var(--muted); margin-top: 0.75rem; }

.testimonial { padding: 1.5rem; display: grid; gap: 1.25rem; align-content: space-between; }
.testimonial blockquote { color: var(--text); font-size: 0.98rem; }
.testimonial figcaption { display: flex; align-items: center; gap: 0.7rem; }
.testimonial figcaption > span:last-child { display: grid; line-height: 1.3; }
.testimonial-role { color: var(--muted); font-size: 0.82rem; }
.avatar { width: 2.4rem; height: 2.4rem; border-radius: 50%; flex: none; }

.tier { padding: 1.75rem; display: grid; gap: 1rem; align-content: start; position: relative; }
.tier-featured { border-color: var(--primary); box-shadow: var(--shadow); }
.tier-featured .badge { position: absolute; top: -0.8rem; left: 1.5rem; }
.tier-price strong { font-size: 2.2rem; letter-spacing: -0.02em; }
.tier-price span { color: var(--muted); }
.tier-list { margin: 0; padding: 0; list-style: none; display: grid; gap: 0.45rem; color: var(--muted); font-size: 0.95rem; }
.tier-list li::before { content: '✓  '; color: var(--primary); font-weight: 700; }

.faq-inner { max-width: 44rem; }
.faq-item { border-bottom: 1px solid var(--border); padding-block: 0.9rem; }
.faq-item summary { cursor: pointer; font-weight: 600; list-style-position: outside; }
.faq-item summary:hover { color: var(--primary); }
.faq-item p { color: var(--muted); margin-top: 0.6rem; }

.contact-inner { max-width: 36rem; }
#contact-form { display: grid; gap: 1rem; }
.field { display: grid; gap: 0.35rem; }
.field-error { color: #D64550; font-size: 0.85rem; min-height: 1.1em; margin: 0; }
.form-note { color: var(--primary); font-weight: 600; min-height: 1.4em; }

.newsletter { background: var(--surface-alt); text-align: center; }
.newsletter-inner { max-width: 34rem; margin-inline: auto; display: grid; gap: 0.75rem; justify-items: center; }
.newsletter-inner p { color: var(--muted); }
#newsletter-form { display: flex; gap: 0.6rem; width: 100%; max-width: 26rem; }
#newsletter-form input { flex: 1; }

.cta { text-align: center; }
.cta-inner {
  background: linear-gradient(135deg, var(--primary-soft), var(--accent-soft));
  border: 1px solid var(--border); border-radius: var(--radius-lg);
  padding: clamp(2rem, 6vw, 4rem); display: grid; gap: 1rem; justify-items: center;
}
.cta-inner p { color: var(--muted); }

@media (max-width: 640px) {
  #newsletter-form { flex-direction: column; }
  .hero-actions .btn { width: 100%; }
}

${gradientArtCss(spec)}`;
}

/** Client-side behavior for page templates: form validation + niceties. */
export function pageSectionsJs(spec: ProjectSpec): string {
  const name = spec.name.replaceAll("'", "\\'");
  return `(function () {
  'use strict';

  // Contact form: inline validation with friendly messages.
  var contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', function (event) {
      event.preventDefault();
      var fields = [
        { id: 'contact-name', message: 'Please tell us your name.' },
        { id: 'contact-email', message: 'That email does not look right.', email: true },
        { id: 'contact-message', message: 'A few words go a long way.' }
      ];
      var valid = true;
      fields.forEach(function (field) {
        var input = document.getElementById(field.id);
        var error = document.querySelector('[data-error-for="' + field.id + '"]');
        if (!input || !error) return;
        var value = input.value.trim();
        var ok = field.email
          ? /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value)
          : value.length > 1;
        error.textContent = ok ? '' : field.message;
        input.classList.toggle('invalid', !ok);
        if (!ok) valid = false;
      });
      var status = document.getElementById('contact-status');
      if (valid && status) {
        status.textContent = 'Thanks — your message is on its way to ${name}.';
        contactForm.reset();
      }
    });
  }

  // Newsletter form: validate the address, confirm inline.
  var newsletterForm = document.getElementById('newsletter-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', function (event) {
      event.preventDefault();
      var input = document.getElementById('newsletter-email');
      var status = document.getElementById('newsletter-status');
      if (!input || !status) return;
      var value = input.value.trim();
      var ok = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value);
      input.classList.toggle('invalid', !ok);
      status.textContent = ok
        ? 'Welcome aboard — the next letter is yours.'
        : 'Please enter a valid email address.';
      if (ok) newsletterForm.reset();
    });
  }
})();`;
}
