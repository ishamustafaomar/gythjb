/**
 * Shared codegen helpers: theming, archetype-driven base CSS, chrome
 * (header/hero/footer variants) and the section renderers used by
 * page-like templates. Everything is a pure function of the spec —
 * variety comes from rngs derived from spec.seed, copy comes from the
 * topic content pools.
 */
import { createRng, type Rng } from '@/lib/seeded';
import type {
  FontStyle,
  ProjectSpec,
  SectionId,
  StyleArchetype,
  TemplateId,
} from '../types';
import type { TopicContent } from './content';

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

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
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

/** `#RRGGBB` + alpha → `rgba()` string usable in CSS. */
export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
  const archetype = spec.style.archetype;
  let primary = spec.palette.primary;
  const accent = spec.palette.accent;

  if (mode === 'dark' && luminance(primary) < 0.09) {
    primary = mix(primary, '#FFFFFF', 0.35);
  }
  if (mode === 'light' && luminance(primary) > 0.72) {
    primary = mix(primary, '#000000', 0.3);
  }

  if (mode === 'dark') {
    let bg = mix('#0E1116', primary, 0.05);
    let text = '#EDF0F7';
    let border = mix('#262D39', primary, 0.08);
    if (archetype === 'soft') bg = mix('#12151C', primary, 0.1);
    if (archetype === 'editorial') bg = mix('#14120E', primary, 0.04);
    if (archetype === 'brutalist') {
      bg = '#0B0C0E';
      text = '#F5F6F8';
      border = text;
    }
    const surface = mix('#151A21', primary, 0.04);
    const theme: Theme = {
      bg,
      surface,
      surfaceAlt: mix('#1B212B', primary, 0.05),
      text,
      muted: archetype === 'brutalist' ? '#B9BEC8' : '#99A2B4',
      border,
      primary,
      primaryStrong: mix(primary, '#FFFFFF', 0.12),
      primarySoft: mix(surface, primary, 0.24),
      primaryContrast: contrastOn(primary),
      accent,
      accentSoft: mix(surface, accent, 0.28),
      headerBg: `${bg}E6`,
      shadow: shadowFor(archetype, primary, text, mode),
    };
    return theme;
  }

  let bg = mix('#F7F8FB', primary, 0.03);
  let text = '#171A21';
  let border = mix('#E4E7EE', primary, 0.06);
  if (archetype === 'soft') bg = mix('#FCFCFD', primary, 0.08);
  if (archetype === 'editorial') bg = mix('#F7F3EC', primary, 0.02);
  if (archetype === 'brutalist') {
    bg = '#FBFAF7';
    text = '#101114';
    border = text;
  }
  if (archetype === 'minimal') border = mix('#DDE0E8', primary, 0.04);
  return {
    bg,
    surface: '#FFFFFF',
    surfaceAlt: mix('#F1F3F8', primary, 0.05),
    text,
    muted: archetype === 'brutalist' ? '#40434B' : '#5B6472',
    border,
    primary,
    primaryStrong: mix(primary, '#000000', 0.16),
    primarySoft: mix('#FFFFFF', primary, 0.12),
    primaryContrast: contrastOn(primary),
    accent,
    accentSoft: mix('#FFFFFF', accent, 0.18),
    headerBg: archetype === 'brutalist' ? bg : '#FFFFFFE6',
    shadow: shadowFor(archetype, primary, text, mode),
  };
}

function shadowFor(
  archetype: StyleArchetype,
  primary: string,
  text: string,
  mode: 'light' | 'dark',
): string {
  switch (archetype) {
    case 'minimal':
      return 'none';
    case 'brutalist':
      return `6px 6px 0 ${text}`;
    case 'gradient':
      return mode === 'dark'
        ? `0 24px 60px ${withAlpha('#000000', 0.5)}`
        : `0 24px 60px ${withAlpha(primary, 0.22)}`;
    case 'soft':
      return mode === 'dark'
        ? `0 18px 44px ${withAlpha('#000000', 0.45)}`
        : `0 18px 44px ${withAlpha(primary, 0.16)}`;
    case 'editorial':
      return mode === 'dark'
        ? '0 10px 26px rgba(0, 0, 0, 0.35)'
        : '0 10px 26px rgba(28, 24, 16, 0.08)';
  }
}

interface RadiusSet {
  sm: string;
  md: string;
  lg: string;
  btn: string;
  round: string;
}

function archetypeRadii(spec: ProjectSpec): RadiusSet {
  const { archetype } = spec.style;
  if (archetype === 'brutalist') return { sm: '0', md: '0', lg: '0', btn: '0', round: '0' };
  if (spec.radius === 'sharp') return { sm: '0', md: '0', lg: '0', btn: '0', round: '50%' };
  switch (archetype) {
    case 'minimal':
      return spec.radius === 'pill'
        ? { sm: '4px', md: '8px', lg: '12px', btn: '999px', round: '50%' }
        : { sm: '2px', md: '4px', lg: '8px', btn: '4px', round: '50%' };
    case 'editorial':
      return spec.radius === 'pill'
        ? { sm: '3px', md: '6px', lg: '10px', btn: '999px', round: '50%' }
        : { sm: '0', md: '2px', lg: '4px', btn: '2px', round: '50%' };
    case 'gradient':
      return { sm: '14px', md: '22px', lg: '30px', btn: '999px', round: '50%' };
    case 'soft':
      return { sm: '14px', md: '20px', lg: '28px', btn: '999px', round: '50%' };
  }
}

const FONT_STACKS: Record<FontStyle, string> = {
  sans: "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  serif: "Georgia, 'Iowan Old Style', 'Palatino Linotype', 'Times New Roman', serif",
  mono: "ui-monospace, 'SF Mono', 'Cascadia Code', Menlo, Consolas, monospace",
};

/** Serif display stack used for editorial headings regardless of body font. */
const EDITORIAL_DISPLAY_STACK = "Georgia, 'Times New Roman', 'Iowan Old Style', serif";

export function cssVariables(spec: ProjectSpec): string {
  const theme = deriveTheme(spec);
  const radii = archetypeRadii(spec);
  const { archetype } = spec.style;
  const compact = spec.features.includes('compact');

  let sectionPad = compact ? 'clamp(2.25rem, 5vw, 3.5rem)' : 'clamp(3.5rem, 8vw, 6.5rem)';
  if (!compact && archetype === 'soft') sectionPad = 'clamp(4rem, 9vw, 7.5rem)';
  if (!compact && archetype === 'minimal') sectionPad = 'clamp(3rem, 7vw, 5.5rem)';
  const gap = compact ? '1rem' : archetype === 'soft' ? '1.75rem' : '1.5rem';
  const display = archetype === 'editorial' ? EDITORIAL_DISPLAY_STACK : FONT_STACKS[spec.font];

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
  --font-display: ${display};
  --radius-sm: ${radii.sm};
  --radius-md: ${radii.md};
  --radius-lg: ${radii.lg};
  --radius-btn: ${radii.btn};
  --radius-round: ${radii.round};
  --section-pad: ${sectionPad};
  --gap: ${gap};
}`;
}

/* ------------------------------------------------------------------ */
/* Archetype-driven base CSS                                           */
/* ------------------------------------------------------------------ */

/** True when the archetype paints shadows at all (minimal never does). */
function hasShadows(spec: ProjectSpec): boolean {
  return spec.style.archetype !== 'minimal';
}

function bodyBackgroundCss(spec: ProjectSpec): string {
  if (spec.style.archetype !== 'gradient') return '';
  const theme = deriveTheme(spec);
  const glowA = withAlpha(theme.primary, spec.palette.mode === 'dark' ? 0.32 : 0.24);
  const glowB = withAlpha(theme.accent, spec.palette.mode === 'dark' ? 0.24 : 0.18);
  return `
body {
  background:
    radial-gradient(52rem 36rem at 12% -8%, ${glowA}, transparent 60%),
    radial-gradient(46rem 34rem at 105% 12%, ${glowB}, transparent 55%),
    var(--bg);
  background-attachment: fixed;
}`;
}

function headingCss(spec: ProjectSpec): string {
  switch (spec.style.archetype) {
    case 'minimal':
      return `h1, h2, h3, h4 { line-height: 1.18; font-weight: 600; letter-spacing: -0.03em; }
h1 { font-size: clamp(1.9rem, 4.5vw, 2.9rem); }
h2 { font-size: clamp(1.35rem, 2.8vw, 1.9rem); }
h3 { font-size: 1.05rem; }`;
    case 'gradient':
      return `h1, h2, h3, h4 { line-height: 1.08; font-weight: 800; letter-spacing: -0.02em; }
h1 { font-size: clamp(2.8rem, 7vw, 4.5rem); }
h2 { font-size: clamp(1.7rem, 3.6vw, 2.5rem); }
h3 { font-size: 1.15rem; }`;
    case 'editorial':
      return `h1, h2, h3, h4 { font-family: var(--font-display); line-height: 1.1; font-weight: 700; letter-spacing: -0.01em; }
h1 { font-size: clamp(2.6rem, 6.5vw, 4.2rem); }
h2 { font-size: clamp(1.6rem, 3.4vw, 2.4rem); }
h3 { font-size: 1.2rem; }`;
    case 'brutalist':
      return `h1, h2, h3, h4 { line-height: 1.05; font-weight: 800; letter-spacing: -0.01em; }
h1, h2 { text-transform: uppercase; }
h1 { font-size: clamp(2.2rem, 6vw, 3.6rem); }
h2 { font-size: clamp(1.4rem, 3.2vw, 2rem); }
h3 { font-size: 1.05rem; text-transform: uppercase; letter-spacing: 0.03em; }`;
    case 'soft':
      return `h1, h2, h3, h4 { line-height: 1.15; font-weight: 700; letter-spacing: -0.015em; }
h1 { font-size: clamp(2.2rem, 5.5vw, 3.4rem); }
h2 { font-size: clamp(1.5rem, 3.2vw, 2.2rem); }
h3 { font-size: 1.125rem; }`;
  }
}

function linkCss(spec: ProjectSpec): string {
  if (spec.style.archetype === 'minimal') {
    return `a { color: var(--text); text-decoration: underline; text-underline-offset: 3px; text-decoration-color: var(--border); }
a:hover { text-decoration-color: var(--primary); color: var(--primary); }`;
  }
  return `a { color: var(--primary); text-decoration: none; }
a:hover { text-decoration: underline; }`;
}

function buttonCss(spec: ProjectSpec): string {
  const base = `.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
  border-radius: var(--radius-btn); font-weight: 600; cursor: pointer;
  background: transparent; border: 1px solid transparent; text-decoration: none;
}
.btn:hover { text-decoration: none; }
.btn:focus-visible, a:focus-visible, input:focus-visible,
textarea:focus-visible, select:focus-visible, summary:focus-visible {
  outline: 2px solid var(--primary); outline-offset: 2px;
}`;

  switch (spec.style.archetype) {
    case 'minimal':
      return `${base}
.btn { padding: 0.55rem 1.15rem; font-weight: 500; letter-spacing: 0.01em; transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease; }
.btn-primary { background: var(--text); color: var(--bg); border-color: var(--text); }
.btn-primary:hover { background: var(--primary); border-color: var(--primary); color: var(--primary-contrast); }
.btn-ghost { color: var(--text); border-color: var(--border); }
.btn-ghost:hover { border-color: var(--text); }
.btn-lg { padding: 0.7rem 1.5rem; font-size: 1rem; }`;
    case 'gradient':
      return `${base}
.btn { padding: 0.7rem 1.5rem; font-weight: 700; transition: transform 0.15s ease, filter 0.15s ease; }
.btn:hover { transform: translateY(-2px); }
.btn:active { transform: translateY(0); }
.btn-primary { background: linear-gradient(120deg, var(--primary), var(--accent)); color: var(--primary-contrast); box-shadow: var(--shadow); border: 0; }
.btn-primary:hover { filter: saturate(1.15); }
.btn-ghost { color: var(--text); border: 1px solid var(--border); backdrop-filter: blur(8px); }
.btn-ghost:hover { border-color: var(--primary); color: var(--primary); }
.btn-lg { padding: 0.9rem 2rem; font-size: 1.08rem; }`;
    case 'editorial':
      return `${base}
.btn { padding: 0.6rem 1.4rem; text-transform: uppercase; letter-spacing: 0.14em; font-size: 0.8rem; font-weight: 600; transition: background 0.15s ease, color 0.15s ease; }
.btn-primary { background: var(--text); color: var(--bg); border-color: var(--text); }
.btn-primary:hover { background: var(--primary); border-color: var(--primary); color: var(--primary-contrast); }
.btn-ghost { color: var(--text); border-color: var(--text); }
.btn-ghost:hover { background: var(--text); color: var(--bg); }
.btn-lg { padding: 0.8rem 1.9rem; }`;
    case 'brutalist':
      return `${base}
.btn { padding: 0.6rem 1.3rem; border: 3px solid var(--text); text-transform: uppercase; font-weight: 800; letter-spacing: 0.04em; box-shadow: 4px 4px 0 var(--text); transition: transform 0.1s ease, box-shadow 0.1s ease; color: var(--text); }
.btn:hover { transform: translate(-2px, -2px); box-shadow: 6px 6px 0 var(--text); }
.btn:active { transform: translate(2px, 2px); box-shadow: 1px 1px 0 var(--text); }
.btn-primary { background: var(--primary); color: var(--primary-contrast); }
.btn-ghost { background: var(--surface); }
.btn-lg { padding: 0.8rem 1.7rem; font-size: 1rem; }`;
    case 'soft':
      return `${base}
.btn { padding: 0.7rem 1.5rem; transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease; }
.btn:hover { transform: translateY(-2px); }
.btn-primary { background: var(--primary); color: var(--primary-contrast); box-shadow: var(--shadow); }
.btn-primary:hover { background: var(--primary-strong); }
.btn-ghost { color: var(--primary-strong); background: var(--primary-soft); }
.btn-ghost:hover { background: var(--accent-soft); }
.btn-lg { padding: 0.9rem 2rem; font-size: 1.05rem; }`;
  }
}

function formCss(spec: ProjectSpec): string {
  switch (spec.style.archetype) {
    case 'minimal':
      return `input[type='text'], input[type='email'], input[type='search'], textarea, select {
  width: 100%; padding: 0.55rem 0.2rem; border: 0; border-bottom: 1px solid var(--border);
  border-radius: 0; background: transparent; color: var(--text);
}
input:focus, textarea:focus, select:focus { border-color: var(--text); outline: none; }
input.invalid, textarea.invalid { border-color: #D64550; }
label { font-weight: 500; font-size: 0.85rem; letter-spacing: 0.02em; }`;
    case 'brutalist':
      return `input[type='text'], input[type='email'], input[type='search'], textarea, select {
  width: 100%; padding: 0.6rem 0.8rem; border: 3px solid var(--text);
  border-radius: 0; background: var(--surface); color: var(--text);
}
input:focus, textarea:focus, select:focus { background: var(--accent-soft); }
input.invalid, textarea.invalid { border-color: #D64550; }
label { font-weight: 800; font-size: 0.85rem; text-transform: uppercase; }`;
    case 'gradient':
      return `input[type='text'], input[type='email'], input[type='search'], textarea, select {
  width: 100%; padding: 0.7rem 1rem; border-radius: var(--radius-btn);
  border: 1px solid var(--border); background: ${withAlpha(deriveTheme(spec).surface, 0.6)};
  color: var(--text); backdrop-filter: blur(8px);
}
input:focus, textarea:focus, select:focus { border-color: var(--primary); }
input.invalid, textarea.invalid { border-color: #D64550; }
textarea { border-radius: var(--radius-md); }
label { font-weight: 600; font-size: 0.9rem; }`;
    case 'soft':
      return `input[type='text'], input[type='email'], input[type='search'], textarea, select {
  width: 100%; padding: 0.7rem 1rem; border-radius: var(--radius-btn);
  border: 1px solid transparent; background: var(--surface-alt); color: var(--text);
}
input:focus, textarea:focus, select:focus { border-color: var(--primary); background: var(--surface); }
input.invalid, textarea.invalid { border-color: #D64550; }
textarea { border-radius: var(--radius-md); }
label { font-weight: 600; font-size: 0.9rem; }`;
    case 'editorial':
      return `input[type='text'], input[type='email'], input[type='search'], textarea, select {
  width: 100%; padding: 0.6rem 0.8rem; border-radius: var(--radius-sm);
  border: 1px solid var(--text); background: var(--surface); color: var(--text);
}
input:focus, textarea:focus, select:focus { border-color: var(--primary); }
input.invalid, textarea.invalid { border-color: #D64550; }
label { font-weight: 600; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.12em; }`;
  }
}

function surfaceCss(spec: ProjectSpec): string {
  const theme = deriveTheme(spec);
  switch (spec.style.archetype) {
    case 'minimal':
      return `.card { background: transparent; border: 1px solid var(--border); border-radius: var(--radius-md); }
.badge {
  display: inline-block; padding: 0.1rem 0.5rem; border: 1px solid var(--border);
  border-radius: var(--radius-btn); color: var(--muted);
  font-size: 0.72rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
}`;
    case 'gradient':
      return `.card {
  background: ${withAlpha(theme.surface, spec.palette.mode === 'dark' ? 0.5 : 0.55)};
  border: 1px solid ${withAlpha('#FFFFFF', spec.palette.mode === 'dark' ? 0.12 : 0.55)};
  border-radius: var(--radius-lg);
  backdrop-filter: blur(14px) saturate(1.2); -webkit-backdrop-filter: blur(14px) saturate(1.2);
  box-shadow: var(--shadow);
}
.badge {
  display: inline-block; padding: 0.2rem 0.8rem; border-radius: 999px;
  background: linear-gradient(120deg, var(--primary-soft), var(--accent-soft));
  color: var(--primary-strong); font-size: 0.78rem; font-weight: 700;
}`;
    case 'editorial':
      return `.card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); }
.badge {
  display: inline-block; padding: 0.15rem 0; color: var(--muted); border-radius: 0;
  font-size: 0.72rem; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase;
  border-bottom: 1px solid var(--text);
}`;
    case 'brutalist':
      return `.card { background: var(--surface); border: 3px solid var(--text); border-radius: 0; box-shadow: var(--shadow); }
.badge {
  display: inline-block; padding: 0.15rem 0.6rem; border: 2px solid var(--text); border-radius: 0;
  background: var(--accent); color: ${contrastOn(spec.palette.accent)};
  font-size: 0.75rem; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase;
}`;
    case 'soft':
      return `.card { background: var(--surface); border: 0; border-radius: var(--radius-lg); box-shadow: var(--shadow); }
.badge {
  display: inline-block; padding: 0.2rem 0.75rem; border-radius: 999px;
  background: var(--primary-soft); color: var(--primary-strong);
  font-size: 0.78rem; font-weight: 700;
}`;
  }
}

function headerCss(spec: ProjectSpec): string {
  const { archetype } = spec.style;
  const variant = headerVariant(spec);

  let navLook: string;
  switch (archetype) {
    case 'minimal':
      navLook = `.site-nav a {
  color: var(--muted); font-weight: 500; font-size: 0.92rem; text-decoration: none;
  font-variant-caps: all-small-caps; letter-spacing: 0.12em;
}
.site-nav a:hover { color: var(--text); text-decoration: underline; text-underline-offset: 3px; }`;
      break;
    case 'brutalist':
      navLook = `.site-nav { gap: 0.5rem; }
.site-nav a {
  border: 2px solid var(--text); padding: 0.3rem 0.75rem; color: var(--text);
  font-weight: 800; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;
}
.site-nav a:hover { background: var(--text); color: var(--bg); text-decoration: none; }`;
      break;
    case 'editorial':
      navLook = `.site-nav a {
  color: var(--text); font-weight: 600; font-size: 0.72rem;
  text-transform: uppercase; letter-spacing: 0.18em;
}
.site-nav a:hover { color: var(--primary); text-decoration: none; }`;
      break;
    case 'soft':
      navLook = `.site-nav { background: var(--surface); border-radius: 999px; padding: 0.3rem; box-shadow: var(--shadow); }
.site-nav a { color: var(--muted); font-weight: 600; font-size: 0.9rem; padding: 0.35rem 0.95rem; border-radius: 999px; }
.site-nav a:hover { background: var(--primary-soft); color: var(--primary-strong); text-decoration: none; }`;
      break;
    case 'gradient':
      navLook = `.site-nav a { color: var(--muted); font-weight: 600; font-size: 0.95rem; padding: 0.3rem 0.8rem; border-radius: 999px; }
.site-nav a:hover { color: var(--text); background: ${withAlpha(deriveTheme(spec).surface, 0.6)}; text-decoration: none; }`;
      break;
  }

  const borderRule =
    archetype === 'brutalist'
      ? 'border-bottom: 3px solid var(--text);'
      : archetype === 'soft'
        ? 'border-bottom: 0;'
        : 'border-bottom: 1px solid var(--border);';

  const layout =
    variant === 'center'
      ? `.header-inner { display: grid; justify-items: center; gap: 0.75rem; padding-block: 1.1rem; text-align: center; }
.header-inner .site-nav { justify-content: center; }`
      : `.header-inner {
  display: flex; align-items: center; justify-content: space-between;
  gap: 1rem; padding-block: ${archetype === 'soft' ? '1.1rem' : '0.85rem'}; flex-wrap: wrap;
}`;

  return `.site-header { ${borderRule} background: var(--header-bg); }
.site-header.sticky { position: sticky; top: 0; z-index: 50; backdrop-filter: blur(10px); }
${layout}
.brand { display: inline-flex; align-items: center; gap: 0.55rem; color: var(--text); font-weight: 700; text-decoration: none; ${archetype === 'editorial' ? 'font-family: var(--font-display); font-size: 1.15rem;' : ''}${archetype === 'brutalist' ? 'text-transform: uppercase; letter-spacing: 0.03em;' : ''} }
.brand:hover { text-decoration: none; }
.brand-mark { width: 0.95rem; height: 0.95rem; border-radius: var(--radius-sm); background: linear-gradient(135deg, var(--primary), var(--accent)); ${archetype === 'brutalist' ? 'border: 2px solid var(--text);' : ''} }
.site-nav { display: flex; flex-wrap: wrap; gap: ${archetype === 'brutalist' || archetype === 'soft' ? '0.25rem' : '1.1rem'}; align-items: center; }
${navLook}`;
}

function footerCss(spec: ProjectSpec): string {
  const { archetype } = spec.style;
  const variant = footerVariant(spec);
  const topRule =
    archetype === 'brutalist'
      ? 'border-top: 3px solid var(--text);'
      : archetype === 'editorial'
        ? 'border-top: 2px solid var(--text);'
        : 'border-top: 1px solid var(--border);';

  if (variant === 'stacked') {
    return `.site-footer { ${topRule} margin-top: auto; }
.footer-inner { display: grid; gap: 0.6rem; justify-items: center; text-align: center; padding-block: 2.25rem; color: var(--muted); font-size: 0.9rem; }
.footer-brand { font-weight: 700; color: var(--text); ${archetype === 'brutalist' ? 'text-transform: uppercase;' : ''} }`;
  }
  if (variant === 'columns') {
    return `.site-footer { ${topRule} margin-top: auto; }
.footer-inner { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 1rem; padding-block: 2rem 1rem; color: var(--muted); font-size: 0.9rem; }
.footer-brand { font-weight: 700; color: var(--text); ${archetype === 'editorial' ? 'font-family: var(--font-display); font-size: 1.05rem;' : ''} }
.footer-meta { text-transform: uppercase; letter-spacing: 0.14em; font-size: 0.72rem; }
.footer-credit-row { border-top: 1px solid var(--border); padding-block: 0.9rem 1.4rem; color: var(--muted); font-size: 0.8rem; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; }`;
  }
  return `.site-footer { ${topRule} margin-top: auto; }
.footer-inner { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 0.75rem; padding-block: 1.5rem; color: var(--muted); font-size: 0.9rem; }`;
}

export function baseCss(spec: ProjectSpec): string {
  const animations = spec.features.includes('animations');
  const { archetype } = spec.style;

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

  const sectionDividers =
    archetype === 'minimal'
      ? '\nmain .section + .section { border-top: 1px solid var(--border); }'
      : archetype === 'editorial'
        ? '\nmain .section + .section { border-top: 1px solid var(--text); }'
        : '';

  const sectionNumbers =
    archetype === 'editorial'
      ? `
main { counter-reset: section; }
main .section { counter-increment: section; }
main .section .section-head h2::before {
  content: counter(section, decimal-leading-zero);
  display: block; font-family: var(--font-body); font-size: 0.78rem; font-weight: 600;
  letter-spacing: 0.22em; color: var(--muted); margin-bottom: 0.6rem;
}`
      : '';

  const eyebrowCss =
    archetype === 'editorial' || archetype === 'minimal'
      ? `.eyebrow {
  display: inline-block; margin-bottom: 1rem; padding: 0;
  color: var(--muted); font-size: 0.75rem; font-weight: 600;
  letter-spacing: 0.22em; text-transform: uppercase; border-bottom: 1px solid var(--border);
}`
      : archetype === 'brutalist'
        ? `.eyebrow {
  display: inline-block; margin-bottom: 1rem; padding: 0.2rem 0.7rem;
  border: 2px solid var(--text); background: var(--accent); color: ${contrastOn(spec.palette.accent)};
  font-size: 0.75rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
}`
        : `.eyebrow {
  display: inline-block; margin-bottom: 1rem; padding: 0.2rem 0.75rem;
  border-radius: var(--radius-btn); border: 1px solid var(--border);
  background: var(--surface); color: var(--muted);
  font-size: 0.8rem; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase;
}`;

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
}${bodyBackgroundCss(spec)}
img, svg { display: block; max-width: 100%; }
input, button, textarea, select { font: inherit; color: inherit; }
${linkCss(spec)}
${headingCss(spec)}
p { max-width: 65ch; }

.container { width: min(100% - 2.5rem, 68rem); margin-inline: auto; }
.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}

/* Buttons */
${buttonCss(spec)}

/* Forms */
${formCss(spec)}

/* Surfaces */
${surfaceCss(spec)}

/* Header chrome */
${headerCss(spec)}

/* Footer chrome */
${footerCss(spec)}

/* Layout primitives */
.section { padding-block: var(--section-pad); }${sectionDividers}${sectionNumbers}
.section-head { max-width: 38rem; margin-bottom: 2rem; }
.section-head p { color: var(--muted); margin-top: 0.5rem; }
.grid { display: grid; gap: var(--gap); }
.grid.cols-3 { grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
.grid.cols-2 { grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
${eyebrowCss}
.app-main { padding-block: clamp(1.5rem, 4vw, 3rem); }${animationBlock}`;
}

/* ------------------------------------------------------------------ */
/* Chrome                                                              */
/* ------------------------------------------------------------------ */

export interface NavLink {
  href: string;
  label: string;
}

export type HeaderVariant = 'inline' | 'center' | 'cta' | 'boxed';
export type FooterVariant = 'simple' | 'stacked' | 'columns';

/** Header layout for this project — fixed per archetype or seeded. */
export function headerVariant(spec: ProjectSpec): HeaderVariant {
  const rng = createRng(`${spec.seed}:header-variant`);
  switch (spec.style.archetype) {
    case 'brutalist':
      return 'boxed';
    case 'minimal':
      return rng.pick(['cta', 'inline'] as const);
    case 'editorial':
      return rng.pick(['center', 'inline'] as const);
    case 'gradient':
      return rng.pick(['inline', 'center'] as const);
    case 'soft':
      return rng.pick(['inline', 'center', 'cta'] as const);
  }
}

export function footerVariant(spec: ProjectSpec): FooterVariant {
  const rng = createRng(`${spec.seed}:footer-variant`);
  switch (spec.style.archetype) {
    case 'minimal':
      return 'simple';
    case 'editorial':
      return 'columns';
    case 'brutalist':
      return 'stacked';
    default:
      return rng.pick(['simple', 'stacked', 'columns'] as const);
  }
}

export function renderHeader(
  spec: ProjectSpec,
  links: readonly NavLink[],
  actions = '',
): string {
  const sticky = spec.features.includes('sticky-header') ? ' sticky' : '';
  const variant = headerVariant(spec);
  const shownLinks = variant === 'cta' ? [] : links;
  const nav = shownLinks
    .map((link) => `        <a href="${esc(link.href)}">${esc(link.label)}</a>`)
    .join('\n');
  const navBlock =
    shownLinks.length > 0
      ? `      <nav class="site-nav" aria-label="Primary">\n${nav}\n      </nav>\n`
      : '';
  const actionBlock = actions.length > 0 ? `      ${actions}\n` : '';

  const brand = `      <a class="brand" href="#top">
        <span class="brand-mark" aria-hidden="true"></span>
        <span class="brand-name">${esc(spec.name)}</span>
      </a>`;

  return `  <header class="site-header header-${variant}${sticky}" id="top">
    <div class="container header-inner">
${brand}
${navBlock}${actionBlock}    </div>
  </header>`;
}

export function renderFooter(spec: ProjectSpec): string {
  const variant = footerVariant(spec);
  if (variant === 'stacked') {
    return `  <footer class="site-footer footer-stacked">
    <div class="container footer-inner">
      <span class="footer-brand">${esc(spec.name)}</span>
      <span>${esc(spec.tagline)}</span>
      <span class="footer-credit">Built with Promptly</span>
    </div>
  </footer>`;
  }
  if (variant === 'columns') {
    return `  <footer class="site-footer footer-columns">
    <div class="container footer-inner">
      <span class="footer-brand">${esc(spec.name)}</span>
      <span>${esc(spec.tagline)}</span>
      <span class="footer-meta">Est. in the browser</span>
    </div>
    <div class="container footer-credit-row">
      <span>&copy; ${esc(spec.name)}</span>
      <span class="footer-credit">Built with Promptly</span>
    </div>
  </footer>`;
  }
  return `  <footer class="site-footer footer-simple">
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

/** Picks one of a section's structural variants, filtered by archetype. */
function pickVariant<T extends string>(
  spec: ProjectSpec,
  id: string,
  byArchetype: Record<StyleArchetype, readonly T[]>,
): T {
  const rng = createRng(`${spec.seed}:variant:${id}`);
  return rng.pick(byArchetype[spec.style.archetype]);
}

function primaryTargetHref(spec: ProjectSpec): string {
  for (const candidate of ['cta', 'contact', 'pricing', 'features'] as const) {
    if (spec.sections.includes(candidate)) return `#${candidate}`;
  }
  return '#top';
}

interface HeroCopy {
  eyebrow: string;
  headline: string;
  lede: string;
  primaryCta: string;
  primaryHref: string;
  ghostCta: string;
  ghostHref: string;
}

function heroCopy(spec: ProjectSpec, content: TopicContent, rng: Rng): HeroCopy {
  const name = esc(spec.name);
  const tagline = esc(spec.tagline);

  if (spec.template === 'portfolio') {
    return {
      eyebrow: rng.pick(['Portfolio', 'Selected work', 'Case studies']),
      headline: rng.pick([`${name} — selected work`, tagline]),
      lede: rng.pick([
        'A short collection of projects worth signing.',
        'Design, build, refine — the favorites live here.',
        'Fewer pieces, shown properly, with the thinking behind them.',
      ]),
      primaryCta: 'See the work',
      primaryHref: spec.sections.includes('gallery') ? '#gallery' : primaryTargetHref(spec),
      ghostCta: 'Get in touch',
      ghostHref: spec.sections.includes('contact') ? '#contact' : '#top',
    };
  }

  const eyebrow = rng.pick([
    'Now in early access',
    'Fresh from the studio',
    'New for this season',
    `All things ${esc(content.label)}`,
  ]);
  let headline: string;
  let lede: string;
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
  const primaryHref = primaryTargetHref(spec);
  return {
    eyebrow,
    headline,
    lede,
    primaryCta: rng.pick(['Get started', 'Start free', 'Try it now', 'Get early access']),
    primaryHref,
    ghostCta: rng.pick(['See how it works', 'Take the tour', 'Learn more']),
    ghostHref: spec.sections.includes('features') ? '#features' : primaryHref,
  };
}

/** Seeded mosaic panel used by the split hero: gradient art + topic glyphs. */
function heroMosaic(spec: ProjectSpec, content: TopicContent): string {
  const rng = createRng(`${spec.seed}:hero-mosaic`);
  const tiles: string[] = [];
  for (let i = 0; i < 9; i++) {
    if (rng.chance(0.3)) {
      tiles.push(
        `          <div class="mosaic-tile mosaic-glyph" aria-hidden="true">${esc(content.glyph)}</div>`,
      );
    } else {
      tiles.push(
        `          <div class="mosaic-tile art-${rng.int(1, 6)}" aria-hidden="true"></div>`,
      );
    }
  }
  return `        <div class="hero-visual" aria-hidden="true">\n${tiles.join('\n')}\n        </div>`;
}

function renderHero(spec: ProjectSpec, content: TopicContent): string {
  const rng = sectionRng(spec, 'hero');
  const copy = heroCopy(spec, content, rng);
  const actions = `          <div class="hero-actions">
            <a class="btn btn-primary btn-lg" href="${copy.primaryHref}">${esc(copy.primaryCta)}</a>
            <a class="btn btn-ghost btn-lg" href="${copy.ghostHref}">${esc(copy.ghostCta)}</a>
          </div>`;

  switch (spec.style.hero) {
    case 'split':
      return `  <section class="section hero hero-split" id="hero">
    <div class="container hero-inner">
      <div class="hero-copy">
        <span class="eyebrow">${esc(copy.eyebrow)}</span>
        <h1>${copy.headline}</h1>
        <p class="lede">${copy.lede}</p>
${actions}
      </div>
${heroMosaic(spec, content)}
    </div>
  </section>`;
    case 'banner':
      return `  <section class="section hero hero-banner" id="hero">
    <div class="container hero-inner">
      <span class="eyebrow">${esc(copy.eyebrow)}</span>
      <h1>${copy.headline}</h1>
      <p class="lede">${copy.lede}</p>
${actions}
    </div>
  </section>`;
    case 'editorial': {
      const stat = content.stats[0];
      return `  <section class="section hero hero-editorial" id="hero">
    <div class="container hero-inner">
      <div class="hero-copy">
        <span class="eyebrow">${esc(copy.eyebrow)}</span>
        <h1>${copy.headline}</h1>
${actions}
      </div>
      <aside class="hero-meta">
        <div class="hero-meta-item">
          <span class="hero-meta-label">About</span>
          <p>${copy.lede}</p>
        </div>
        <div class="hero-meta-item">
          <span class="hero-meta-label">Focus</span>
          <p>${esc(capitalize(content.label))}</p>
        </div>${
          stat
            ? `
        <div class="hero-meta-item">
          <span class="hero-meta-label">In numbers</span>
          <p><strong>${esc(stat.value)}</strong> ${esc(stat.label)}</p>
        </div>`
            : ''
        }
      </aside>
    </div>
  </section>`;
    }
    case 'centered':
      return `  <section class="section hero hero-centered" id="hero">
    <div class="container hero-inner">
      <span class="eyebrow">${esc(copy.eyebrow)}</span>
      <h1>${copy.headline}</h1>
      <p class="lede">${copy.lede}</p>
${actions}
    </div>
  </section>`;
  }
}

/* ---------------------------- features ---------------------------- */

type FeaturesVariant = 'grid' | 'rows' | 'split';
const FEATURES_VARIANTS: Record<StyleArchetype, readonly FeaturesVariant[]> = {
  minimal: ['rows', 'split'],
  editorial: ['split', 'rows'],
  brutalist: ['grid', 'rows'],
  gradient: ['grid', 'split'],
  soft: ['grid', 'rows'],
};

function renderFeatures(spec: ProjectSpec, content: TopicContent): string {
  const rng = sectionRng(spec, 'features');
  const variant = pickVariant(spec, 'features', FEATURES_VARIANTS);
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

  const count = variant === 'grid' ? rng.pick([3, 6] as const) : rng.pick([4, 5] as const);
  const ideas = content.featureIdeas.slice(0, count);

  let inner: string;
  if (variant === 'grid') {
    const cards = ideas
      .map(
        (idea, i) => `        <article class="card feature">
          <div class="feature-glyph art-${(i % 6) + 1}" aria-hidden="true"></div>
          <h3>${esc(idea.title)}</h3>
          <p>${esc(idea.text)}</p>
        </article>`,
      )
      .join('\n');
    inner = `      <div class="section-head">
        <h2>${heading}</h2>
        <p>${sub}</p>
      </div>
      <div class="grid cols-3 feature-grid">
${cards}
      </div>`;
  } else if (variant === 'rows') {
    const rows = ideas
      .map(
        (idea, i) => `        <div class="feature-row">
          <span class="feature-index">${String(i + 1).padStart(2, '0')}</span>
          <h3>${esc(idea.title)}</h3>
          <p>${esc(idea.text)}</p>
        </div>`,
      )
      .join('\n');
    inner = `      <div class="section-head">
        <h2>${heading}</h2>
        <p>${sub}</p>
      </div>
      <div class="feature-rows">
${rows}
      </div>`;
  } else {
    const items = ideas
      .map(
        (idea) => `          <div class="feature-item">
            <h3>${esc(idea.title)}</h3>
            <p>${esc(idea.text)}</p>
          </div>`,
      )
      .join('\n');
    inner = `      <div class="feature-split">
        <div class="section-head">
          <h2>${heading}</h2>
          <p>${sub}</p>
        </div>
        <div class="feature-list">
${items}
        </div>
      </div>`;
  }

  return `  <section class="section features features-${variant}" id="features">
    <div class="container">
${inner}
    </div>
  </section>`;
}

/* ------------------------------ stats ----------------------------- */

type StatsVariant = 'band' | 'inline';
const STATS_VARIANTS: Record<StyleArchetype, readonly StatsVariant[]> = {
  minimal: ['inline'],
  editorial: ['inline', 'band'],
  brutalist: ['band', 'inline'],
  gradient: ['band', 'inline'],
  soft: ['band'],
};

function renderStats(spec: ProjectSpec, content: TopicContent): string {
  const rng = sectionRng(spec, 'stats');
  const variant = pickVariant(spec, 'stats', STATS_VARIANTS);
  const heading = rng.pick([
    `The numbers behind ${esc(spec.name)}`,
    'Proof, in plain figures',
    'Quietly getting big',
  ]);
  const stats = content.stats.slice(0, 4);

  const items = stats
    .map(
      (stat) => `        <div class="stat">
          <span class="stat-value">${esc(stat.value)}</span>
          <span class="stat-label">${esc(stat.label)}</span>
        </div>`,
    )
    .join('\n');

  const body =
    variant === 'band'
      ? `      <div class="section-head">
        <h2>${heading}</h2>
      </div>
      <div class="stat-band">
${items}
      </div>`
      : `      <div class="section-head">
        <h2>${heading}</h2>
      </div>
      <div class="stat-inline">
${items}
      </div>`;

  return `  <section class="section stats stats-${variant}" id="stats">
    <div class="container">
${body}
    </div>
  </section>`;
}

/* ----------------------------- gallery ---------------------------- */

const GALLERY_KINDS: readonly string[] = ['Series', 'Case study', 'Commission', 'Study'];

type GalleryVariant = 'uniform' | 'mosaic';
const GALLERY_VARIANTS: Record<StyleArchetype, readonly GalleryVariant[]> = {
  minimal: ['uniform', 'mosaic'],
  editorial: ['mosaic', 'uniform'],
  brutalist: ['uniform', 'mosaic'],
  gradient: ['mosaic', 'uniform'],
  soft: ['uniform'],
};

function renderGallery(spec: ProjectSpec, content: TopicContent): string {
  const rng = sectionRng(spec, 'gallery');
  const variant = pickVariant(spec, 'gallery', GALLERY_VARIANTS);
  const heading = rng.pick(['Recent work', 'Selected projects', 'From the archive']);
  const tiles: string[] = [];
  for (let i = 0; i < 6; i++) {
    const title = content.galleryProjects[i % content.galleryProjects.length] ?? 'Untitled study';
    const kind = GALLERY_KINDS[i % GALLERY_KINDS.length] ?? 'Study';
    tiles.push(`        <figure class="tile">
          <div class="tile-art art-${(i % 6) + 1}" aria-hidden="true"></div>
          <figcaption>
            <strong>${esc(title)}</strong>
            <span>${esc(kind)}</span>
          </figcaption>
        </figure>`);
  }

  return `  <section class="section gallery gallery-${variant}" id="gallery">
    <div class="container">
      <div class="section-head">
        <h2>${esc(heading)}</h2>
      </div>
      <div class="gallery-grid ${variant === 'mosaic' ? 'gallery-grid-mosaic' : 'grid cols-3'}">
${tiles.join('\n')}
      </div>
    </div>
  </section>`;
}

/* ------------------------------ about ----------------------------- */

type AboutVariant = 'side' | 'prose';
const ABOUT_VARIANTS: Record<StyleArchetype, readonly AboutVariant[]> = {
  minimal: ['prose'],
  editorial: ['prose', 'side'],
  brutalist: ['side', 'prose'],
  gradient: ['side'],
  soft: ['side', 'prose'],
};

function renderAbout(spec: ProjectSpec, content: TopicContent): string {
  const rng = sectionRng(spec, 'about');
  const variant = pickVariant(spec, 'about', ABOUT_VARIANTS);
  const name = esc(spec.name);
  const first = rng.pick([
    `${name} started as a side project and grew up on real feedback from people who used it every day.`,
    `${name} is small on purpose. We would rather do a handful of things properly than everything halfway.`,
    `Behind ${name} is a simple belief: good tools should feel quiet, quick and considered.`,
  ]);
  const second = rng.pick([
    `These days it is a steady home for ${esc(content.label)} — and that is the whole ambition.`,
    'What you see here is the result: careful defaults, honest materials and no filler.',
    'Every release is measured against one question — does this make the day simpler?',
  ]);

  if (variant === 'prose') {
    return `  <section class="section about about-prose" id="about">
    <div class="container about-inner-prose">
      <div class="section-head">
        <h2>About ${name}</h2>
      </div>
      <div class="about-columns">
        <p>${first}</p>
        <p>${second}</p>
      </div>
    </div>
  </section>`;
  }

  return `  <section class="section about about-side" id="about">
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

/* --------------------------- testimonials ------------------------- */

function testimonialQuotes(name: string): readonly string[] {
  return [
    `We switched to ${name} on a Tuesday and nobody has mentioned the old way since.`,
    `${name} feels like it was designed by someone who actually does this work.`,
    `The rare find that stays out of the way. I open ${name} and just get on with it.`,
    `Clean, quick and pleasantly boring in the best sense. ${name} simply works.`,
    `I recommended ${name} to three friends before the first week was out.`,
    `Every detail feels considered. ${name} raised the bar for our whole toolkit.`,
  ];
}

type TestimonialsVariant = 'grid' | 'spotlight';
const TESTIMONIALS_VARIANTS: Record<StyleArchetype, readonly TestimonialsVariant[]> = {
  minimal: ['spotlight'],
  editorial: ['spotlight', 'grid'],
  brutalist: ['grid'],
  gradient: ['grid', 'spotlight'],
  soft: ['grid', 'spotlight'],
};

function renderTestimonials(spec: ProjectSpec, content: TopicContent): string {
  const rng = sectionRng(spec, 'testimonials');
  const variant = pickVariant(spec, 'testimonials', TESTIMONIALS_VARIANTS);
  const heading = rng.pick(['Kind words', 'What people say', 'From the inbox']);
  const quotes = testimonialQuotes(esc(spec.name));
  const quoteStart = rng.int(0, quotes.length - 1);
  const people = content.personas;

  if (variant === 'spotlight') {
    const mainQuote = quotes[quoteStart % quotes.length] ?? '';
    const mainPerson = people[0];
    const rest: string[] = [];
    for (let i = 1; i < 3; i++) {
      const quote = quotes[(quoteStart + i) % quotes.length] ?? '';
      const person = people[i % people.length];
      if (!person) continue;
      rest.push(`          <figure class="testimonial-small">
            <blockquote>&ldquo;${quote}&rdquo;</blockquote>
            <figcaption><strong>${esc(person.name)}</strong> · <span>${esc(person.role)}</span></figcaption>
          </figure>`);
    }
    return `  <section class="section testimonials testimonials-spotlight" id="testimonials">
    <div class="container">
      <div class="section-head">
        <h2>${esc(heading)}</h2>
      </div>
      <div class="testimonial-stage">
        <figure class="testimonial-hero">
          <blockquote>&ldquo;${mainQuote}&rdquo;</blockquote>
          <figcaption>
            <span class="avatar art-1" aria-hidden="true"></span>
            <span><strong>${esc(mainPerson?.name ?? 'A happy customer')}</strong>
            <span class="testimonial-role">${esc(mainPerson?.role ?? '')}</span></span>
          </figcaption>
        </figure>
        <div class="testimonial-side">
${rest.join('\n')}
        </div>
      </div>
    </div>
  </section>`;
  }

  const cards: string[] = [];
  for (let i = 0; i < 3; i++) {
    const quote = quotes[(quoteStart + i) % quotes.length] ?? '';
    const person = people[i % people.length];
    if (!person) continue;
    cards.push(`        <figure class="card testimonial">
          <blockquote>&ldquo;${quote}&rdquo;</blockquote>
          <figcaption>
            <span class="avatar art-${(i % 6) + 1}" aria-hidden="true"></span>
            <span>
              <strong>${esc(person.name)}</strong>
              <span class="testimonial-role">${esc(person.role)}</span>
            </span>
          </figcaption>
        </figure>`);
  }

  return `  <section class="section testimonials testimonials-grid" id="testimonials">
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

/* ----------------------------- pricing ---------------------------- */

type PricingVariant = 'cards' | 'rows';
const PRICING_VARIANTS: Record<StyleArchetype, readonly PricingVariant[]> = {
  minimal: ['rows', 'cards'],
  editorial: ['rows', 'cards'],
  brutalist: ['cards'],
  gradient: ['cards'],
  soft: ['cards', 'rows'],
};

function renderPricing(spec: ProjectSpec, content: TopicContent): string {
  const rng = sectionRng(spec, 'pricing');
  const variant = pickVariant(spec, 'pricing', PRICING_VARIANTS);
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
  const flavor = content.featureIdeas;
  const featureSets: readonly (readonly string[])[] = [
    [flavor[0]?.title ?? 'All core features', 'Up to 3 active projects', 'Community support'],
    [flavor[1]?.title ?? 'Advanced reporting', 'Unlimited projects', 'Priority email support', 'Custom domains'],
    [flavor[2]?.title ?? 'Dedicated onboarding', 'Everything in the middle tier', 'Single sign-on', 'Quarterly reviews'],
  ];

  if (variant === 'rows') {
    const rows: string[] = [];
    for (let i = 0; i < 3; i++) {
      const tierName = tierNames[i] ?? 'Plan';
      const price = prices[i] ?? 0;
      const featured = i === 1;
      const summary = (featureSets[i] ?? []).slice(0, 2).join(' · ');
      rows.push(`        <div class="tier-row${featured ? ' tier-row-featured' : ''}">
          <div class="tier-row-name">
            <h3>${esc(tierName)}</h3>${featured ? `\n            <span class="badge">${esc(badge)}</span>` : ''}
          </div>
          <p class="tier-row-summary">${esc(summary)}</p>
          <p class="tier-price"><strong>$${price}</strong><span>/mo</span></p>
          <a class="btn ${featured ? 'btn-primary' : 'btn-ghost'}" href="#cta">Choose</a>
        </div>`);
    }
    return `  <section class="section pricing pricing-rows" id="pricing">
    <div class="container">
      <div class="section-head">
        <h2>${esc(heading)}</h2>
        <p>${esc(sub)}</p>
      </div>
      <div class="tier-rows">
${rows.join('\n')}
      </div>
    </div>
  </section>`;
  }

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

  return `  <section class="section pricing pricing-cards" id="pricing">
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

/* ------------------------------- faq ------------------------------ */

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

type FaqVariant = 'accordion' | 'columns';
const FAQ_VARIANTS: Record<StyleArchetype, readonly FaqVariant[]> = {
  minimal: ['accordion'],
  editorial: ['columns', 'accordion'],
  brutalist: ['accordion', 'columns'],
  gradient: ['accordion'],
  soft: ['accordion', 'columns'],
};

function renderFaq(spec: ProjectSpec, _content: TopicContent): string {
  const rng = sectionRng(spec, 'faq');
  const variant = pickVariant(spec, 'faq', FAQ_VARIANTS);
  const heading = rng.pick(['Questions, answered', 'Frequently asked', 'Before you ask']);
  const entries = faqEntries(esc(spec.name));
  const count = rng.pick([4, 5] as const);

  if (variant === 'columns') {
    const items = entries
      .slice(0, 4)
      .map(
        (entry) => `        <div class="faq-cell">
          <h3>${entry.q}</h3>
          <p>${entry.a}</p>
        </div>`,
      )
      .join('\n');
    return `  <section class="section faq faq-columns" id="faq">
    <div class="container">
      <div class="section-head">
        <h2>${esc(heading)}</h2>
      </div>
      <div class="grid cols-2 faq-grid">
${items}
      </div>
    </div>
  </section>`;
  }

  const items = entries
    .slice(0, count)
    .map(
      (entry) => `        <details class="faq-item">
          <summary>${entry.q}</summary>
          <p>${entry.a}</p>
        </details>`,
    )
    .join('\n');

  return `  <section class="section faq faq-accordion" id="faq">
    <div class="container faq-inner">
      <div class="section-head">
        <h2>${esc(heading)}</h2>
      </div>
${items}
    </div>
  </section>`;
}

/* ----------------------------- contact ---------------------------- */

type ContactVariant = 'stacked' | 'panel';
const CONTACT_VARIANTS: Record<StyleArchetype, readonly ContactVariant[]> = {
  minimal: ['stacked'],
  editorial: ['panel', 'stacked'],
  brutalist: ['panel', 'stacked'],
  gradient: ['panel'],
  soft: ['panel', 'stacked'],
};

function renderContact(spec: ProjectSpec, content: TopicContent): string {
  const rng = sectionRng(spec, 'contact');
  const variant = pickVariant(spec, 'contact', CONTACT_VARIANTS);
  const heading = rng.pick(['Say hello', 'Get in touch', 'Start a conversation']);
  const sub = rng.pick([
    'Questions, ideas or a project in mind — the inbox is open.',
    `A short note is plenty. The ${esc(spec.name)} inbox is read daily.`,
  ]);

  const form = `      <form id="contact-form" novalidate>
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
      </form>`;

  if (variant === 'panel') {
    const persona = content.personas[0];
    return `  <section class="section contact contact-panel" id="contact">
    <div class="container contact-split">
      <div class="contact-aside">
        <h2>${esc(heading)}</h2>
        <p>${sub}</p>${
          persona
            ? `
        <p class="contact-person"><strong>${esc(persona.name)}</strong><br />${esc(persona.role)} — replies within a day</p>`
            : ''
        }
      </div>
${form}
    </div>
  </section>`;
  }

  return `  <section class="section contact contact-stacked" id="contact">
    <div class="container contact-inner">
      <div class="section-head">
        <h2>${esc(heading)}</h2>
        <p>${sub}</p>
      </div>
${form}
    </div>
  </section>`;
}

/* ---------------------------- newsletter -------------------------- */

type NewsletterVariant = 'center' | 'inline';
const NEWSLETTER_VARIANTS: Record<StyleArchetype, readonly NewsletterVariant[]> = {
  minimal: ['inline'],
  editorial: ['inline', 'center'],
  brutalist: ['center', 'inline'],
  gradient: ['center'],
  soft: ['center', 'inline'],
};

function renderNewsletter(spec: ProjectSpec, _content: TopicContent): string {
  const rng = sectionRng(spec, 'newsletter');
  const variant = pickVariant(spec, 'newsletter', NEWSLETTER_VARIANTS);
  const heading = rng.pick([
    'Occasional letters, zero noise',
    'One good email a month',
    'Stay in the loop',
  ]);
  const sub = rng.pick([
    `News from ${esc(spec.name)}, only when there is something worth saying.`,
    'Unsubscribe in one click, keep your inbox calm.',
  ]);
  const form = `      <form id="newsletter-form" novalidate>
        <label class="sr-only" for="newsletter-email">Email address</label>
        <input id="newsletter-email" type="email" placeholder="you@example.com" />
        <button class="btn btn-primary" type="submit">Subscribe</button>
      </form>
      <p class="form-note" id="newsletter-status" role="status"></p>`;

  if (variant === 'inline') {
    return `  <section class="section newsletter newsletter-inline" id="newsletter">
    <div class="container newsletter-row">
      <div>
        <h2>${esc(heading)}</h2>
        <p>${sub}</p>
      </div>
${form}
    </div>
  </section>`;
  }

  return `  <section class="section newsletter newsletter-center" id="newsletter">
    <div class="container newsletter-inner">
      <h2>${esc(heading)}</h2>
      <p>${sub}</p>
${form}
    </div>
  </section>`;
}

/* ------------------------------- cta ------------------------------ */

type CtaVariant = 'panel' | 'stripe';
const CTA_VARIANTS: Record<StyleArchetype, readonly CtaVariant[]> = {
  minimal: ['stripe'],
  editorial: ['stripe', 'panel'],
  brutalist: ['panel', 'stripe'],
  gradient: ['panel'],
  soft: ['panel', 'stripe'],
};

function renderCta(spec: ProjectSpec, _content: TopicContent): string {
  const rng = sectionRng(spec, 'cta');
  const variant = pickVariant(spec, 'cta', CTA_VARIANTS);
  const name = esc(spec.name);
  const heading = rng.pick([`Ready to try ${name}?`, 'Ready when you are.', `Bring ${name} to your day.`]);
  const sub = rng.pick([
    "Setup takes about a minute. Leaving takes even less — but you won't want to.",
    'Free to start, easy to leave, hard to give up.',
  ]);
  const button = rng.pick(['Get started now', 'Create your space', 'Start today']);

  if (variant === 'stripe') {
    return `  <section class="section cta cta-stripe" id="cta">
    <div class="container cta-row">
      <div>
        <h2>${heading}</h2>
        <p>${sub}</p>
      </div>
      <a class="btn btn-primary btn-lg" href="#top">${esc(button)}</a>
    </div>
  </section>`;
  }

  return `  <section class="section cta cta-panel" id="cta">
    <div class="container cta-inner">
      <h2>${heading}</h2>
      <p>${sub}</p>
      <a class="btn btn-primary btn-lg" href="#top">${esc(button)}</a>
    </div>
  </section>`;
}

export function renderSection(id: SectionId, spec: ProjectSpec, content: TopicContent): string {
  switch (id) {
    case 'hero':
      return renderHero(spec, content);
    case 'features':
      return renderFeatures(spec, content);
    case 'stats':
      return renderStats(spec, content);
    case 'gallery':
      return renderGallery(spec, content);
    case 'about':
      return renderAbout(spec, content);
    case 'testimonials':
      return renderTestimonials(spec, content);
    case 'pricing':
      return renderPricing(spec, content);
    case 'faq':
      return renderFaq(spec, content);
    case 'contact':
      return renderContact(spec, content);
    case 'newsletter':
      return renderNewsletter(spec, content);
    case 'cta':
      return renderCta(spec, content);
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

function heroCss(spec: ProjectSpec): string {
  const { archetype } = spec.style;
  const shadow = hasShadows(spec) ? ' box-shadow: var(--shadow);' : '';
  const bannerBg =
    archetype === 'gradient'
      ? 'linear-gradient(120deg, var(--primary), var(--accent))'
      : 'linear-gradient(135deg, var(--primary), var(--primary-strong))';

  switch (spec.style.hero) {
    case 'split':
      return `/* Hero — split */
.hero-split { padding-block: calc(var(--section-pad) * 1.1) var(--section-pad); }
.hero-split .hero-inner { display: grid; gap: 3rem; grid-template-columns: 1.1fr 0.9fr; align-items: center; }
.hero-split .lede { margin: 1.25rem 0 2rem; color: var(--muted); font-size: 1.15rem; }
.hero-actions { display: flex; flex-wrap: wrap; gap: 0.75rem; }
.hero-visual { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.6rem; }
.mosaic-tile { aspect-ratio: 1; border-radius: var(--radius-md);${archetype === 'brutalist' ? ' border: 3px solid var(--text);' : ''}${shadow} }
.mosaic-glyph { display: grid; place-items: center; font-size: 1.8rem; background: var(--surface-alt); color: var(--primary); }
@media (max-width: 760px) {
  .hero-split .hero-inner { grid-template-columns: 1fr; }
  .hero-actions .btn { flex: 1; }
}`;
    case 'banner':
      return `/* Hero — full-bleed banner */
.hero-banner { background: ${bannerBg}; color: var(--primary-contrast); padding-block: calc(var(--section-pad) * 1.15);${archetype === 'brutalist' ? ' border-block: 3px solid var(--text);' : ''} }
.hero-banner .hero-inner { max-width: 46rem; }
.hero-banner h1 { color: var(--primary-contrast); }
.hero-banner .lede { margin: 1.25rem 0 2rem; color: var(--primary-contrast); opacity: 0.85; font-size: 1.15rem; }
.hero-banner .eyebrow { border-color: currentColor; background: transparent; color: var(--primary-contrast); }
.hero-banner .btn-primary { background: var(--primary-contrast); color: var(--primary); border-color: var(--primary-contrast); }
.hero-banner .btn-ghost { color: var(--primary-contrast); border: 1px solid currentColor; background: transparent; }
.hero-actions { display: flex; flex-wrap: wrap; gap: 0.75rem; }
@media (max-width: 640px) { .hero-actions .btn { width: 100%; } }`;
    case 'editorial':
      return `/* Hero — editorial spread */
.hero-editorial { padding-block: calc(var(--section-pad) * 1.1) var(--section-pad); }
.hero-editorial .hero-inner { display: grid; gap: 3rem; grid-template-columns: 2fr 1fr; align-items: start; }
.hero-editorial h1 { margin-block: 0.5rem 1.75rem; }
.hero-meta { border-left: 1px solid var(--border); padding-left: 1.5rem; display: grid; gap: 1.25rem; align-content: start; }
.hero-meta-label { display: block; text-transform: uppercase; letter-spacing: 0.18em; font-size: 0.7rem; color: var(--muted); margin-bottom: 0.25rem; }
.hero-meta p { color: var(--text); font-size: 0.95rem; }
.hero-actions { display: flex; flex-wrap: wrap; gap: 0.75rem; }
@media (max-width: 760px) {
  .hero-editorial .hero-inner { grid-template-columns: 1fr; }
  .hero-meta { border-left: 0; border-top: 1px solid var(--border); padding: 1.25rem 0 0; }
}`;
    case 'centered':
      return `/* Hero — centered */
.hero-centered { text-align: center; padding-block: calc(var(--section-pad) * 1.2) var(--section-pad); }
.hero-centered .hero-inner { max-width: 46rem; margin-inline: auto; }
.hero-centered .lede { margin: 1.25rem auto 2rem; color: var(--muted); font-size: 1.15rem; }
.hero-actions { display: flex; flex-wrap: wrap; gap: 0.75rem; justify-content: center; }
@media (max-width: 640px) { .hero-actions .btn { width: 100%; } }`;
  }
}

export function pageSectionsCss(spec: ProjectSpec): string {
  const { archetype } = spec.style;
  const shadows = hasShadows(spec);
  const hoverLift = shadows
    ? `.feature:hover { transform: translateY(-3px); box-shadow: var(--shadow); }`
    : `.feature:hover { border-color: var(--text); }`;
  const surfaceBand = archetype === 'gradient' ? 'transparent' : 'var(--surface-alt)';

  return `/* Page sections */
${heroCss(spec)}

/* Features */
.feature { padding: 1.5rem; transition: transform 0.15s ease, border-color 0.15s ease; }
${hoverLift}
.feature-glyph { width: 2.4rem; height: 2.4rem; border-radius: var(--radius-sm); margin-bottom: 1rem;${archetype === 'brutalist' ? ' border: 2px solid var(--text);' : ''} }
.feature p { color: var(--muted); margin-top: 0.4rem; font-size: 0.95rem; }
.feature-rows { display: grid; }
.feature-row {
  display: grid; grid-template-columns: 3rem 14rem 1fr; gap: 1.25rem; align-items: baseline;
  padding-block: 1.15rem; border-top: 1px solid ${archetype === 'brutalist' ? 'var(--text)' : 'var(--border)'};
}
.feature-row:last-child { border-bottom: 1px solid ${archetype === 'brutalist' ? 'var(--text)' : 'var(--border)'}; }
.feature-index { font-size: 0.8rem; font-weight: 600; letter-spacing: 0.14em; color: var(--muted); }
.feature-row p { color: var(--muted); font-size: 0.95rem; }
.feature-split { display: grid; gap: 2.5rem; grid-template-columns: 1fr 2fr; align-items: start; }
.feature-split .section-head { margin-bottom: 0; }
.feature-list { display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
.feature-item p { color: var(--muted); margin-top: 0.35rem; font-size: 0.95rem; }
@media (max-width: 760px) {
  .feature-row { grid-template-columns: 2.5rem 1fr; }
  .feature-row p { grid-column: 2; }
  .feature-split { grid-template-columns: 1fr; }
}

/* Stats */
.stats-band { background: ${surfaceBand}; }
.stat-band { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: var(--gap); }
.stat-band .stat { display: grid; gap: 0.15rem;${archetype === 'brutalist' ? ' border: 3px solid var(--text); padding: 1rem; background: var(--surface);' : ''} }
.stat-inline { display: flex; flex-wrap: wrap; gap: 2.5rem; }
.stat-inline .stat { display: grid; gap: 0.15rem; padding-left: 1.25rem; border-left: ${archetype === 'brutalist' ? '3px solid var(--text)' : '1px solid var(--border)'}; }
.stat-value { font-size: clamp(1.8rem, 4vw, 2.6rem); font-weight: 800; color: var(--primary);${archetype === 'editorial' ? ' font-family: var(--font-display);' : ''} }
.stat-label { color: var(--muted); font-size: 0.9rem; }

/* Gallery */
.tile { display: grid; gap: 0.6rem; }
.tile-art { aspect-ratio: 4 / 3; border-radius: var(--radius-md); transition: transform 0.2s ease;${archetype === 'brutalist' ? ' border: 3px solid var(--text);' : ''} }
.tile:hover .tile-art { transform: scale(1.02); }
.tile figcaption { display: grid; }
.tile figcaption span { color: var(--muted); font-size: 0.85rem;${archetype === 'editorial' ? ' text-transform: uppercase; letter-spacing: 0.14em; font-size: 0.72rem;' : ''} }
.gallery-grid-mosaic { display: grid; gap: var(--gap); grid-template-columns: repeat(3, 1fr); }
.gallery-grid-mosaic .tile:nth-child(4n + 1) { grid-column: span 2; }
.gallery-grid-mosaic .tile:nth-child(4n + 1) .tile-art { aspect-ratio: 8 / 3; }
@media (max-width: 700px) {
  .gallery-grid-mosaic { grid-template-columns: 1fr; }
  .gallery-grid-mosaic .tile:nth-child(4n + 1) { grid-column: auto; }
}

/* About */
.about-inner { display: grid; gap: 2rem; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); align-items: center; }
.about-art { aspect-ratio: 1; max-width: 22rem; border-radius: var(--radius-lg);${archetype === 'brutalist' ? ' border: 3px solid var(--text);' : ''} }
.about-copy p { color: var(--muted); margin-top: 0.75rem; }
.about-inner-prose .about-columns { display: grid; gap: 2rem; grid-template-columns: 1fr 1fr; }
.about-columns p { color: var(--muted); }
@media (max-width: 700px) { .about-inner-prose .about-columns { grid-template-columns: 1fr; } }

/* Testimonials */
.testimonial { padding: 1.5rem; display: grid; gap: 1.25rem; align-content: space-between; }
.testimonial blockquote { color: var(--text); font-size: 0.98rem;${archetype === 'editorial' ? ' font-family: var(--font-display); font-size: 1.05rem;' : ''} }
.testimonial figcaption { display: flex; align-items: center; gap: 0.7rem; }
.testimonial figcaption > span:last-child { display: grid; line-height: 1.3; }
.testimonial-role { color: var(--muted); font-size: 0.82rem; }
.avatar { width: 2.4rem; height: 2.4rem; border-radius: var(--radius-round); flex: none;${archetype === 'brutalist' ? ' border: 2px solid var(--text);' : ''} }
.testimonial-stage { display: grid; gap: var(--gap); grid-template-columns: 3fr 2fr; align-items: start; }
.testimonial-hero blockquote { font-size: clamp(1.2rem, 2.4vw, 1.6rem); line-height: 1.45;${archetype === 'editorial' ? ' font-family: var(--font-display);' : ''} }
.testimonial-hero figcaption { display: flex; align-items: center; gap: 0.7rem; margin-top: 1.25rem; }
.testimonial-hero figcaption > span:last-child { display: grid; line-height: 1.3; }
.testimonial-side { display: grid; gap: 1.25rem; }
.testimonial-small { border-left: ${archetype === 'brutalist' ? '3px solid var(--text)' : '1px solid var(--border)'}; padding-left: 1.1rem; }
.testimonial-small blockquote { color: var(--muted); font-size: 0.92rem; }
.testimonial-small figcaption { margin-top: 0.5rem; font-size: 0.85rem; color: var(--muted); }
@media (max-width: 760px) { .testimonial-stage { grid-template-columns: 1fr; } }

/* Pricing */
.tier { padding: 1.75rem; display: grid; gap: 1rem; align-content: start; position: relative; }
.tier-featured { border-color: var(--primary);${shadows ? ' box-shadow: var(--shadow);' : ''} }
.tier-featured .badge { position: absolute; top: -0.8rem; left: 1.5rem; }
.tier-price strong { font-size: 2.2rem; letter-spacing: -0.02em;${archetype === 'editorial' ? ' font-family: var(--font-display);' : ''} }
.tier-price span { color: var(--muted); }
.tier-list { margin: 0; padding: 0; list-style: none; display: grid; gap: 0.45rem; color: var(--muted); font-size: 0.95rem; }
.tier-list li::before { content: '✓  '; color: var(--primary); font-weight: 700; }
.tier-rows { display: grid; }
.tier-row {
  display: grid; grid-template-columns: 10rem 1fr auto auto; gap: 1.25rem; align-items: center;
  padding-block: 1.25rem; border-top: 1px solid ${archetype === 'brutalist' ? 'var(--text)' : 'var(--border)'};
}
.tier-row:last-child { border-bottom: 1px solid ${archetype === 'brutalist' ? 'var(--text)' : 'var(--border)'}; }
.tier-row-featured h3 { color: var(--primary); }
.tier-row-name { display: grid; gap: 0.35rem; justify-items: start; }
.tier-row-summary { color: var(--muted); font-size: 0.92rem; }
@media (max-width: 760px) {
  .tier-row { grid-template-columns: 1fr auto; }
  .tier-row-summary { grid-column: 1 / -1; }
}

/* FAQ */
.faq-inner { max-width: 44rem; }
.faq-item { border-bottom: 1px solid var(--border); padding-block: 0.9rem; }
.faq-item summary { cursor: pointer; font-weight: 600; list-style-position: outside; }
.faq-item summary:hover { color: var(--primary); }
.faq-item p { color: var(--muted); margin-top: 0.6rem; }
.faq-cell h3 { margin-bottom: 0.45rem; }
.faq-cell p { color: var(--muted); font-size: 0.95rem; }

/* Contact */
.contact-inner { max-width: 36rem; }
.contact-split { display: grid; gap: 2.5rem; grid-template-columns: 1fr 1.4fr; align-items: start; }
.contact-aside p { color: var(--muted); margin-top: 0.75rem; }
.contact-person { border-left: ${archetype === 'brutalist' ? '3px solid var(--text)' : '1px solid var(--border)'}; padding-left: 1rem; }
@media (max-width: 700px) { .contact-split { grid-template-columns: 1fr; } }
#contact-form { display: grid; gap: 1rem; }
.field { display: grid; gap: 0.35rem; }
.field-error { color: #D64550; font-size: 0.85rem; min-height: 1.1em; margin: 0; }
.form-note { color: var(--primary); font-weight: 600; min-height: 1.4em; }

/* Newsletter */
.newsletter-center { background: ${surfaceBand}; text-align: center; }
.newsletter-inner { max-width: 34rem; margin-inline: auto; display: grid; gap: 0.75rem; justify-items: center; }
.newsletter-inner p, .newsletter-row p { color: var(--muted); }
.newsletter-row { display: grid; gap: 1.5rem; grid-template-columns: 1fr auto; align-items: center; border-block: 1px solid ${archetype === 'brutalist' ? 'var(--text)' : 'var(--border)'}; padding-block: 2rem; }
#newsletter-form { display: flex; gap: 0.6rem; width: 100%; max-width: 26rem; }
#newsletter-form input { flex: 1; }
@media (max-width: 700px) { .newsletter-row { grid-template-columns: 1fr; } }

/* CTA */
.cta-panel { text-align: center; }
.cta-inner {
  background: ${archetype === 'brutalist' ? 'var(--accent-soft)' : 'linear-gradient(135deg, var(--primary-soft), var(--accent-soft))'};
  border: ${archetype === 'brutalist' ? '3px solid var(--text)' : '1px solid var(--border)'}; border-radius: var(--radius-lg);
  padding: clamp(2rem, 6vw, 4rem); display: grid; gap: 1rem; justify-items: center;${shadows ? ' box-shadow: var(--shadow);' : ''}
}
.cta-inner p, .cta-row p { color: var(--muted); }
.cta-row { display: grid; gap: 1.5rem; grid-template-columns: 1fr auto; align-items: center; border-top: 1px solid ${archetype === 'brutalist' ? 'var(--text)' : 'var(--border)'}; padding-top: 2.5rem; }
.cta-row h2 { margin-bottom: 0.5rem; }
@media (max-width: 700px) { .cta-row { grid-template-columns: 1fr; } }

@media (max-width: 640px) {
  #newsletter-form { flex-direction: column; }
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
