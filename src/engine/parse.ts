/**
 * parsePrompt — turns a free-form creation prompt into a ProjectSpec.
 *
 * Detection is keyword scoring (never ML, never async), and every gap the
 * prompt leaves open is filled deterministically from the project seed.
 */
import { createRng, type Rng } from '@/lib/seeded';
import type {
  ColorMode,
  FeatureFlag,
  FontStyle,
  HeroLayout,
  ProjectSpec,
  RadiusStyle,
  SectionId,
  StyleArchetype,
  TemplateId,
  TopicDomain,
} from './types';
import {
  composeTagline,
  detectTopic,
  flavorNameNouns,
  resolveFlavor,
  TOPIC_NAME_NOUNS,
  type TopicFlavor,
} from './codegen/content';

/* ------------------------------------------------------------------ */
/* Template detection                                                  */
/* ------------------------------------------------------------------ */

interface TemplateMatcher {
  template: TemplateId;
  pattern: RegExp;
  weight: number;
}

/**
 * Weight for explicit page-type phrases ("landing page", "pricing page",
 * "portfolio", …). High enough that a structural request decisively beats
 * incidental commerce/topic nouns that only name the page's *subject* —
 * "a landing page for a coffee shop" is a landing page, not a store.
 */
const EXPLICIT_PAGE_WEIGHT = 10;

const TEMPLATE_MATCHERS: readonly TemplateMatcher[] = [
  // Explicit page-type tier — these phrases state what to build outright.
  { template: 'landing', pattern: /\blanding\s+pages?\b/, weight: EXPLICIT_PAGE_WEIGHT },
  { template: 'landing', pattern: /\bhome\s?pages?\b/, weight: EXPLICIT_PAGE_WEIGHT },
  { template: 'landing', pattern: /\b(?:web\s*)?sites?\s+for\b/, weight: EXPLICIT_PAGE_WEIGHT },
  { template: 'landing', pattern: /\bweb\s+pages?\b/, weight: EXPLICIT_PAGE_WEIGHT },
  { template: 'landing', pattern: /\bone[-\s]pagers?\b/, weight: EXPLICIT_PAGE_WEIGHT },
  { template: 'pricing', pattern: /\bpricing\s+pages?\b/, weight: EXPLICIT_PAGE_WEIGHT },
  { template: 'portfolio', pattern: /\bportfolio\b/, weight: EXPLICIT_PAGE_WEIGHT },
  { template: 'blog', pattern: /\bblog\b/, weight: EXPLICIT_PAGE_WEIGHT },
  { template: 'store', pattern: /\be-?commerce\b|\bonline\s+(?:store|shop)\b/, weight: EXPLICIT_PAGE_WEIGHT },
  // Supporting-signal tiers.
  { template: 'landing', pattern: /\b(?:web\s?site|marketing\s+(?:site|page)|splash\s+page)\b/, weight: 3 },
  { template: 'landing', pattern: /\b(?:launch|waitlist|startup|saas)\b/, weight: 1 },
  { template: 'pricing', pattern: /\bpricing\s+(?:table|site)\b/, weight: 6 },
  { template: 'pricing', pattern: /\b(?:plan\s+comparison|compare\s+plans|tiered\s+plans)\b/, weight: 3 },
  { template: 'todo', pattern: /\bto-?\s?dos?\b/, weight: 4 },
  { template: 'todo', pattern: /\btask\s+(?:list|manager|tracker|app)\b/, weight: 4 },
  { template: 'todo', pattern: /\bchecklist\b/, weight: 2 },
  { template: 'todo', pattern: /\btasks\b/, weight: 1 },
  { template: 'habit', pattern: /\bhabits?\b/, weight: 5 },
  { template: 'habit', pattern: /\bstreaks?\b|\bdaily\s+tracker\b/, weight: 2 },
  { template: 'portfolio', pattern: /\bmy\s+work\b|\bcase\s+stud(?:y|ies)\b/, weight: 2 },
  { template: 'blog', pattern: /\bmagazine\b|\bjournal\b/, weight: 2 },
  { template: 'blog', pattern: /\barticles?\b|\bposts?\b/, weight: 1 },
  { template: 'store', pattern: /\bstore\b|\bshop\b|\bboutique\b|\bmarketplace\b/, weight: 4 },
  { template: 'store', pattern: /\bsell(?:ing)?\b/, weight: 2 },
  { template: 'store', pattern: /\bproducts?\b|\bcart\b/, weight: 1 },
  { template: 'kanban', pattern: /\bkanban\b/, weight: 6 },
  { template: 'kanban', pattern: /\b(?:task|project|sprint)\s+board\b/, weight: 4 },
  { template: 'kanban', pattern: /\bboards?\b/, weight: 1 },
  { template: 'notes', pattern: /\bnote[-\s]?taking\b|\bnotes\s+app\b|\bnotebook\b/, weight: 5 },
  { template: 'notes', pattern: /\bnotes?\b/, weight: 2 },
  { template: 'recipes', pattern: /\brecipes?\b/, weight: 5 },
  { template: 'recipes', pattern: /\bcook(?:ing|book)?\b/, weight: 3 },
  { template: 'recipes', pattern: /\bfood\b|\bmeals?\b|\bmeal\s+plan(?:ner)?\b|\bkitchen\b|\bbaking\b/, weight: 2 },
  { template: 'chat', pattern: /\bchat(?:ting)?\b/, weight: 5 },
  { template: 'chat', pattern: /\bmessag(?:ing|es|er)\b/, weight: 4 },
  { template: 'chat', pattern: /\bconversations?\b|\bdms?\b/, weight: 1 },
  { template: 'dashboard', pattern: /\bdashboards?\b/, weight: 5 },
  { template: 'dashboard', pattern: /\badmin\s+(?:panel|area|tool)\b/, weight: 4 },
  { template: 'dashboard', pattern: /\banalytics\b/, weight: 3 },
  { template: 'dashboard', pattern: /\bmetrics\b|\bkpis?\b/, weight: 2 },
];

/** Tie-break order — most specific templates win a draw. */
const TEMPLATE_PRIORITY: readonly TemplateId[] = [
  'habit',
  'kanban',
  'recipes',
  'store',
  'todo',
  'chat',
  'notes',
  'dashboard',
  'pricing',
  'blog',
  'portfolio',
  'landing',
];

export function detectTemplate(lowerPrompt: string): TemplateId {
  const scores = new Map<TemplateId, number>();
  for (const matcher of TEMPLATE_MATCHERS) {
    if (matcher.pattern.test(lowerPrompt)) {
      scores.set(matcher.template, (scores.get(matcher.template) ?? 0) + matcher.weight);
    }
  }
  let best: TemplateId = 'landing';
  let bestScore = 0;
  for (const template of TEMPLATE_PRIORITY) {
    const score = scores.get(template) ?? 0;
    if (score > bestScore) {
      best = template;
      bestScore = score;
    }
  }
  return bestScore > 0 ? best : 'landing';
}

/* ------------------------------------------------------------------ */
/* Palette                                                             */
/* ------------------------------------------------------------------ */

export interface ColorPair {
  primary: string;
  accent: string;
}

export const COLOR_PAIRS: Record<string, ColorPair> = {
  blue: { primary: '#2563EB', accent: '#22D3EE' },
  green: { primary: '#16A34A', accent: '#A3E635' },
  purple: { primary: '#7C3AED', accent: '#F472B6' },
  red: { primary: '#DC2626', accent: '#FB923C' },
  pink: { primary: '#DB2777', accent: '#A78BFA' },
  orange: { primary: '#EA580C', accent: '#FACC15' },
  teal: { primary: '#0D9488', accent: '#38BDF8' },
  indigo: { primary: '#4F46E5', accent: '#2DD4BF' },
  amber: { primary: '#D97706', accent: '#F43F5E' },
  emerald: { primary: '#059669', accent: '#818CF8' },
  rose: { primary: '#E11D48', accent: '#FDBA74' },
  slate: { primary: '#475569', accent: '#38BDF8' },
  navy: { primary: '#1E3A8A', accent: '#60A5FA' },
  monochrome: { primary: '#1F2328', accent: '#8B939E' },
};

const COLOR_ALIASES: Record<string, string> = {
  violet: 'purple',
  lavender: 'purple',
  magenta: 'pink',
  fuchsia: 'pink',
  grey: 'slate',
  gray: 'slate',
  black: 'monochrome',
  cyan: 'teal',
  turquoise: 'teal',
  aqua: 'teal',
  lime: 'green',
  mint: 'emerald',
  yellow: 'amber',
  gold: 'amber',
  crimson: 'red',
  scarlet: 'red',
};

const COLOR_WORDS: readonly string[] = [
  ...Object.keys(COLOR_PAIRS),
  ...Object.keys(COLOR_ALIASES),
];

export interface ColorMatch {
  name: string;
  pair: ColorPair;
}

/** Finds the first recognized color word in `text` (case-insensitive). */
export function findColorWord(text: string): ColorMatch | null {
  const normalized = text
    .toLowerCase()
    .replace(/black\s*(?:and|&|\/|-)\s*white/g, 'monochrome');
  for (const word of COLOR_WORDS) {
    if (new RegExp(`\\b${word}\\b`).test(normalized)) {
      const canonical = COLOR_ALIASES[word] ?? word;
      const pair = COLOR_PAIRS[canonical];
      if (pair) return { name: canonical, pair };
    }
  }
  return null;
}

/** Keys into COLOR_PAIRS used when the prompt names no color. */
const DEFAULT_PALETTES: Record<TemplateId, readonly string[]> = {
  landing: ['indigo', 'blue', 'purple', 'teal', 'emerald'],
  dashboard: ['indigo', 'blue', 'slate', 'teal', 'purple'],
  todo: ['blue', 'emerald', 'purple', 'amber', 'teal'],
  habit: ['emerald', 'teal', 'orange', 'purple', 'blue'],
  portfolio: ['slate', 'indigo', 'rose', 'amber', 'monochrome'],
  blog: ['slate', 'indigo', 'emerald', 'rose', 'amber'],
  store: ['emerald', 'orange', 'rose', 'indigo', 'teal'],
  kanban: ['indigo', 'blue', 'purple', 'teal', 'amber'],
  notes: ['amber', 'indigo', 'emerald', 'slate', 'teal'],
  pricing: ['indigo', 'blue', 'purple', 'emerald', 'teal'],
  recipes: ['orange', 'amber', 'emerald', 'rose', 'red'],
  chat: ['purple', 'blue', 'teal', 'indigo', 'rose'],
};

/* ------------------------------------------------------------------ */
/* Style: archetype + hero layout                                      */
/* ------------------------------------------------------------------ */

export const ARCHETYPES: readonly StyleArchetype[] = [
  'minimal', 'gradient', 'editorial', 'brutalist', 'soft',
];

export const HERO_LAYOUTS: readonly HeroLayout[] = [
  'centered', 'split', 'banner', 'editorial',
];

const ARCHETYPE_HINTS: ReadonlyArray<{ archetype: StyleArchetype; pattern: RegExp }> = [
  { archetype: 'brutalist', pattern: /\bbrutalis\w*\b|\bstark\b|\braw\s+(?:look|style|design|aesthetic)\b/ },
  { archetype: 'editorial', pattern: /\beditorial\b(?!\s+hero)|\bmagazine\b|\bluxur\w*\b|\belegant\b/ },
  { archetype: 'gradient', pattern: /\bglass(?:y|morphism)?\b|\bgradients?\b|\bvibrant\b|\bbold\b|\bmodern\b/ },
  { archetype: 'soft', pattern: /\bpastel\b|\bplayful\b|\bfriendly\b|\bcute\b|\bsoft\b/ },
  { archetype: 'minimal', pattern: /\bminimal(?:ist)?\b|\bclean\b|\bsimple\b/ },
];

/** Explicit look hints; null when the prompt names no visual language. */
export function detectArchetype(lowerPrompt: string): StyleArchetype | null {
  for (const hint of ARCHETYPE_HINTS) {
    if (hint.pattern.test(lowerPrompt)) return hint.archetype;
  }
  return null;
}

const HERO_HINTS: ReadonlyArray<{ hero: HeroLayout; pattern: RegExp }> = [
  { hero: 'split', pattern: /\bsplit\s+(?:hero|layout)\b|\bhero\s+split\b/ },
  { hero: 'banner', pattern: /\bbanner\s+hero\b|\bhero\s+banner\b|\bfull[-\s]?bleed\b/ },
  { hero: 'editorial', pattern: /\beditorial\s+hero\b/ },
  { hero: 'centered', pattern: /\bcenter(?:ed)?\s+hero\b|\bhero\s+center(?:ed)?\b/ },
];

/** Explicit hero-layout hints; null when unspecified. */
export function detectHero(lowerPrompt: string): HeroLayout | null {
  for (const hint of HERO_HINTS) {
    if (hint.pattern.test(lowerPrompt)) return hint.hero;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Names                                                               */
/* ------------------------------------------------------------------ */

const NAME_ADJECTIVES: readonly string[] = [
  'Bright', 'Clear', 'Golden', 'Quiet', 'Swift', 'Little',
  'Prime', 'North', 'Ever', 'Solid', 'Fresh', 'Amber',
];

const NAME_NOUNS: Record<TemplateId, readonly string[]> = {
  landing: ['Launch', 'Signal', 'Orbit', 'Current', 'Beacon', 'Slope'],
  dashboard: ['Metrics', 'Pulse', 'Panel', 'Insight', 'Ledger', 'Compass'],
  todo: ['Tasks', 'List', 'Check', 'Steps', 'Focus', 'Day'],
  habit: ['Habits', 'Streak', 'Ritual', 'Rhythm', 'Loop', 'Momentum'],
  portfolio: ['Studio', 'Works', 'Frame', 'Craft', 'Atelier', 'Folio'],
  blog: ['Journal', 'Dispatch', 'Column', 'Pages', 'Chronicle', 'Margin'],
  store: ['Goods', 'Market', 'Supply', 'Wares', 'Shelf', 'Trade'],
  kanban: ['Board', 'Flow', 'Lanes', 'Sprint', 'Track', 'Queue'],
  notes: ['Notes', 'Margin', 'Scratch', 'Memo', 'Draft', 'Ink'],
  pricing: ['Plans', 'Tiers', 'Rates', 'Value', 'Ladder', 'Scale'],
  recipes: ['Kitchen', 'Table', 'Pantry', 'Spoon', 'Harvest', 'Stove'],
  chat: ['Chat', 'Threads', 'Ping', 'Relay', 'Echo', 'Parlor'],
};

/** Words that end a captured name when they appear lowercase in the prompt. */
const NAME_STOP_WORDS = new Set([
  'with', 'and', 'that', 'which', 'for', 'in', 'using', 'then',
  'also', 'plus', 'featuring', 'where', 'so', 'to',
]);

/**
 * Splits a raw capture like "Bloom with a dark theme" into the leading
 * name ("Bloom") and the untouched remainder (" with a dark theme").
 * Capitalized stop words are kept so "North For Nothing" survives.
 */
export function splitLeadingName(raw: string): { name: string; rest: string } {
  const wordRe = /\S+/g;
  let match: RegExpExecArray | null;
  let end = 0;
  let count = 0;
  while ((match = wordRe.exec(raw)) !== null) {
    const word = match[0];
    const isLowercaseStop = NAME_STOP_WORDS.has(word) && word === word.toLowerCase();
    if (count > 0 && isLowercaseStop) break;
    end = match.index + word.length;
    count += 1;
    if (count >= 4) break;
  }
  return { name: raw.slice(0, end).trim(), rest: raw.slice(end) };
}

/** Title-cases fully-lowercase words, leaving stylized casing alone. */
export function smartTitle(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (word === word.toLowerCase() && /^[a-z]/.test(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word;
    })
    .join(' ');
}

function extractName(prompt: string): string | null {
  const quoted = /["“]([^"”“]{2,40})["”]/.exec(prompt);
  const quotedName = quoted?.[1]?.trim();
  if (quotedName) return smartTitle(quotedName);

  const called = /\b(?:called|named)\s+["'“]?([^"'“”.!?\n,]+)/i.exec(prompt);
  const calledRaw = called?.[1];
  if (calledRaw) {
    const { name } = splitLeadingName(calledRaw);
    if (name) return smartTitle(name);
  }

  const business =
    /\bfor\s+(?:my|our)\s+([A-Za-z][A-Za-z' -]{1,30}?)\s+(?:business|company|shop|store|studio|agency|brand|startup|practice|restaurant|cafe|café|bakery)\b/i.exec(
      prompt,
    );
  const businessRaw = business?.[1];
  if (businessRaw) return smartTitle(businessRaw);

  return null;
}

function generateName(
  template: TemplateId,
  topic: TopicDomain,
  flavor: TopicFlavor,
  rng: Rng,
): string {
  const voiceNouns = flavorNameNouns(topic, flavor);
  const topicNouns = TOPIC_NAME_NOUNS[topic];
  const nouns =
    voiceNouns.length > 0 ? voiceNouns : topicNouns.length > 0 ? topicNouns : NAME_NOUNS[template];
  return `${rng.pick(NAME_ADJECTIVES)} ${rng.pick(nouns)}`;
}

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

/** Canonical top-to-bottom ordering for page sections. */
export const SECTION_ORDER: readonly SectionId[] = [
  'hero', 'features', 'stats', 'gallery', 'about',
  'testimonials', 'pricing', 'faq', 'contact', 'newsletter', 'cta',
];

/**
 * Dense-by-default page structures: a landing page always flows through at
 * least hero → features → stats → about → testimonials → faq → cta, with
 * seeded extras on top. Portfolio ≥5 and pricing ≥4 rendered sections.
 */
const DEFAULT_SECTIONS: Record<TemplateId, readonly SectionId[]> = {
  landing: ['hero', 'features', 'stats', 'about', 'testimonials', 'faq', 'cta'],
  pricing: ['hero', 'pricing', 'stats', 'faq', 'cta'],
  portfolio: ['hero', 'gallery', 'about', 'testimonials', 'contact'],
  dashboard: [],
  todo: [],
  habit: [],
  blog: [],
  store: [],
  kanban: [],
  notes: [],
  recipes: [],
  chat: [],
};

/** Seeded optional extras layered onto the defaults per template. */
const SECTION_EXTRAS: Record<TemplateId, readonly SectionId[]> = {
  landing: ['gallery', 'pricing', 'newsletter', 'contact'],
  pricing: ['testimonials', 'newsletter'],
  portfolio: ['stats', 'newsletter'],
  dashboard: [],
  todo: [],
  habit: [],
  blog: [],
  store: [],
  kanban: [],
  notes: [],
  recipes: [],
  chat: [],
};

const SECTION_HINTS: ReadonlyArray<{ id: SectionId; pattern: RegExp }> = [
  { id: 'faq', pattern: /\bfaqs?\b|frequently\s+asked/ },
  { id: 'pricing', pattern: /\bpricing\b/ },
  { id: 'testimonials', pattern: /\btestimonials?\b|\breviews\b|social\s+proof/ },
  { id: 'contact', pattern: /\bcontact\b/ },
  { id: 'gallery', pattern: /\bgallery\b/ },
  { id: 'newsletter', pattern: /\bnewsletter\b|mailing\s+list|email\s+signup/ },
  { id: 'stats', pattern: /\bstats\b|\bstatistics\b|\bnumbers\s+section\b/ },
  { id: 'about', pattern: /\babout\s+(?:section|page|us|me)\b/ },
  { id: 'features', pattern: /\bfeatures?\s+(?:section|grid|list)\b/ },
  { id: 'hero', pattern: /\bhero\b/ },
  { id: 'cta', pattern: /\bcall[-\s]to[-\s]action\b|\bcta\b/ },
];

const PAGE_TEMPLATES: ReadonlySet<TemplateId> = new Set(['landing', 'pricing', 'portfolio']);

function resolveSections(
  template: TemplateId,
  lowerPrompt: string,
  rng: Rng,
  promptLength: number,
): SectionId[] {
  if (!PAGE_TEMPLATES.has(template)) return [];
  const wanted = new Set<SectionId>(DEFAULT_SECTIONS[template]);

  // Seeded extras — long, detailed prompts bias toward denser pages.
  const extras = [...SECTION_EXTRAS[template]];
  const extraCount = promptLength > 120 ? 2 : rng.chance(0.6) ? 1 : 0;
  for (let i = 0; i < extraCount && extras.length > 0; i++) {
    const index = rng.int(0, extras.length - 1);
    const extra = extras[index];
    if (extra !== undefined) wanted.add(extra);
    extras.splice(index, 1);
  }

  for (const hint of SECTION_HINTS) {
    if (hint.pattern.test(lowerPrompt)) wanted.add(hint.id);
  }
  return SECTION_ORDER.filter((section) => wanted.has(section));
}

/* ------------------------------------------------------------------ */
/* parsePrompt                                                         */
/* ------------------------------------------------------------------ */

export function parsePrompt(prompt: string, seed: string): ProjectSpec {
  const rng = createRng(`${seed}:parse`);
  const lower = prompt.toLowerCase();

  const template = detectTemplate(lower);
  const topic = detectTopic(lower);
  const extracted = extractName(prompt);
  // Sub-topic voice: keyword-derived from the prompt (plus any explicit
  // name), seeded fallback otherwise. The same resolution runs again at
  // regeneration time against name + tagline (see flavorFor), and the
  // composed tagline always carries a recoverable flavor keyword.
  const flavor = resolveFlavor(topic, lower, extracted?.toLowerCase() ?? '', seed);
  const name = extracted ?? generateName(template, topic, flavor, rng);
  // Taglines never echo the raw prompt — they are composed from the
  // voice's stem pools so sibling seeds vary in structure, not just suffix.
  const tagline = composeTagline(topic, rng, flavor);

  const mode: ColorMode =
    /\bdark\b|\bnight\s*mode\b/.test(lower) && !/\blight\s*mode\b/.test(lower)
      ? 'dark'
      : 'light';
  const colorMatch = findColorWord(lower);
  const paletteKeys = DEFAULT_PALETTES[template];
  const fallbackPair = COLOR_PAIRS[rng.pick(paletteKeys)] ?? COLOR_PAIRS['indigo']!;
  const pair = colorMatch?.pair ?? fallbackPair;

  let font: FontStyle = 'sans';
  if (/\bmono(?:space[d]?)?\b|\bterminal\b|\btechnical\b|\btypewriter\b/.test(lower)) {
    font = 'mono';
  } else if (
    !/\bsans(?:[-\s]serif)?\b/.test(lower) &&
    /\bserif\b|\belegant\b|\beditorial\b|\bluxur\w*\b/.test(lower)
  ) {
    font = 'serif';
  }

  let radius: RadiusStyle = 'rounded';
  if (/\bsharp\b|\bbrutalis\w+\b|\bsquare\b|\bangular\b/.test(lower)) {
    radius = 'sharp';
  } else if (/\bpill\b|\bsoft\b|\bbubbly\b/.test(lower)) {
    radius = 'pill';
  }

  const features: FeatureFlag[] = [];
  // Page templates always get a sticky translucent header; other templates
  // opt in via the prompt.
  if (
    PAGE_TEMPLATES.has(template) ||
    /sticky\s+(?:header|nav)|fixed\s+(?:header|nav)/.test(lower)
  ) {
    features.push('sticky-header');
  }
  if (/\bcompact\b|\bdense\b|tight\s+spacing/.test(lower)) {
    features.push('compact');
  }
  const animationsOff = /no\s+animations?|without\s+animations?|\bstatic\b/.test(lower);
  if ((PAGE_TEMPLATES.has(template) && !animationsOff) || /\banimat(?:ed|ions?)\b/.test(lower)) {
    if (!animationsOff) features.push('animations');
  }

  // Style: explicit hints win; otherwise a uniform seeded pick, so two
  // different seeds routinely land on genuinely different looks.
  const archetype = detectArchetype(lower) ?? rng.pick(ARCHETYPES);
  const hero = detectHero(lower) ?? rng.pick(HERO_LAYOUTS);

  return {
    template,
    name,
    tagline,
    palette: { primary: pair.primary, accent: pair.accent, mode },
    radius,
    font,
    style: { archetype, hero },
    topic,
    sections: resolveSections(template, lower, rng, prompt.trim().length),
    features,
    seed,
  };
}
