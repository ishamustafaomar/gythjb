/**
 * parseEdit / applyEdits — turns a follow-up chat message into a list of
 * structured edit operations, then applies them to a ProjectSpec.
 *
 * Parsing works clause-by-clause ("make it dark and add a FAQ" is two
 * clauses), after first consuming rename/tagline captures so a name like
 * "Blue Sky" never triggers a recolor.
 */
import type {
  ColorMode,
  ElementSelection,
  FontStyle,
  HeroLayout,
  ProjectSpec,
  RadiusStyle,
  SectionId,
  StyleArchetype,
} from './types';
import { COLOR_PAIRS, SECTION_ORDER, findColorWord, smartTitle, splitLeadingName } from './parse';

/* ------------------------------------------------------------------ */
/* Operation model                                                     */
/* ------------------------------------------------------------------ */

export type EditOp =
  | { kind: 'recolor'; primary: string; accent: string; colorName: string }
  | { kind: 'mode'; mode: ColorMode }
  | { kind: 'rename'; name: string }
  | { kind: 'retagline'; tagline: string }
  | { kind: 'addSection'; section: SectionId }
  | { kind: 'removeSection'; section: SectionId }
  | { kind: 'radius'; radius: RadiusStyle }
  | { kind: 'font'; font: FontStyle }
  | { kind: 'stickyHeader'; enabled: boolean }
  | { kind: 'compact'; enabled: boolean }
  | { kind: 'animations'; enabled: boolean }
  | { kind: 'setArchetype'; archetype: StyleArchetype }
  | { kind: 'setHero'; hero: HeroLayout };

/* ------------------------------------------------------------------ */
/* Section vocabulary                                                  */
/* ------------------------------------------------------------------ */

const SECTION_WORDS: ReadonlyArray<{ id: SectionId; pattern: RegExp }> = [
  { id: 'faq', pattern: /\bfaqs?\b|frequently\s+asked/ },
  { id: 'pricing', pattern: /\bpricing\b|\bplans\s+section\b/ },
  { id: 'testimonials', pattern: /\btestimonials?\b|\breviews?\b|social\s+proof/ },
  { id: 'contact', pattern: /\bcontact\b/ },
  { id: 'gallery', pattern: /\bgallery\b|\bshowcase\b/ },
  { id: 'newsletter', pattern: /\bnewsletter\b|mailing\s+list|email\s+signup/ },
  { id: 'stats', pattern: /\bstats?\b|\bstatistics\b|\bnumbers\s+section\b/ },
  { id: 'about', pattern: /\babout\b/ },
  { id: 'features', pattern: /\bfeatures?\b/ },
  { id: 'hero', pattern: /\bhero\b/ },
  { id: 'cta', pattern: /\bcall[-\s]to[-\s]action\b|\bcta\b/ },
];

const ADD_VERBS = /\b(?:add|include|insert|put|create|show|give|need|want|bring)\b/;
const REMOVE_VERBS = /\b(?:remove|delete|drop|hide|kill|lose|ditch|get\s+rid\s+of|take\s+(?:out|away))\b/;

const RADIUS_STEPS: readonly RadiusStyle[] = ['sharp', 'rounded', 'pill'];

function stepRadius(current: RadiusStyle, delta: 1 | -1): RadiusStyle {
  const index = RADIUS_STEPS.indexOf(current);
  const next = Math.min(RADIUS_STEPS.length - 1, Math.max(0, index + delta));
  return RADIUS_STEPS[next] ?? current;
}

/* ------------------------------------------------------------------ */
/* Whole-message captures (consume before clause parsing)              */
/* ------------------------------------------------------------------ */

const RENAME_RE =
  /\b(?:rename\s+(?:it|this|the\s+(?:app|site|project|product|page))\s+to|rename\s+to|call\s+it|name\s+it|change\s+(?:the|its)\s+name\s+to)\s+["'“]?([^"'“”.!?\n]+)/i;

const TAGLINE_RE =
  /\b(?:change|set|update|make|rewrite)\s+the\s+(?:tagline|subtitle|sub-?heading|subheadline|strapline)\s+(?:to\s+(?:say\s+|read\s+)?|say\s+|into\s+)["'“]?(.+?)["'”]?\s*(?=$|[.!?\n])/i;

function stripQuotes(text: string): string {
  return text.replace(/^["'“”]+|["'“”]+$/g, '').trim();
}

/* ------------------------------------------------------------------ */
/* parseEdit                                                           */
/* ------------------------------------------------------------------ */

export function parseEdit(
  message: string,
  spec: ProjectSpec,
  selection?: ElementSelection,
): EditOp[] {
  const ops: EditOp[] = [];

  // Selection-scoped copy edit: "change this to X" / "make this say X".
  if (selection) {
    const copyMatch =
      /\b(?:change|update|set|make)\s+(?:this|it|that)\s+(?:to\s+say|to\s+read|say|to)\s+["'“]?(.+?)["'”]?\s*[.!]?$/i.exec(
        message.trim(),
      );
    const replacement = copyMatch?.[1]?.trim();
    if (replacement) {
      const tag = selection.tag.toLowerCase();
      if (tag === 'h1') return [{ kind: 'rename', name: smartTitle(replacement) }];
      if (tag === 'p' || tag === 'h2' || tag === 'h3') {
        return [{ kind: 'retagline', tagline: replacement }];
      }
    }
  }

  let working = message;

  const renameMatch = RENAME_RE.exec(working);
  const renameRaw = renameMatch?.[1];
  if (renameMatch && renameRaw) {
    const { name, rest } = splitLeadingName(stripQuotes(renameRaw));
    if (name) {
      ops.push({ kind: 'rename', name: smartTitle(stripQuotes(name)) });
      const start = renameMatch.index;
      const end = renameMatch.index + renameMatch[0].length;
      working = `${working.slice(0, start)} ${rest} ${working.slice(end)}`;
    }
  }

  const taglineMatch = TAGLINE_RE.exec(working);
  const taglineRaw = taglineMatch?.[1];
  if (taglineMatch && taglineRaw) {
    const tagline = stripQuotes(taglineRaw);
    if (tagline) {
      ops.push({ kind: 'retagline', tagline });
      const start = taglineMatch.index;
      const end = taglineMatch.index + taglineMatch[0].length;
      working = `${working.slice(0, start)} ${working.slice(end)}`;
    }
  }

  const normalized = working
    .toLowerCase()
    .replace(/black\s*(?:and|&|\/|-)\s*white/g, 'monochrome');

  const clauses = normalized
    .split(/[.,;!?\n]+|\band\b|\bthen\b|\balso\b|\bplus\b/)
    .map((clause) => clause.trim())
    .filter((clause) => clause.length > 0);

  for (const clause of clauses) {
    parseClause(clause, spec, ops);
  }

  // Adjacent clauses often restate the same intent ("softer, playful look")
  // — collapse exact duplicate ops while keeping first-seen order.
  const seen = new Set<string>();
  return ops.filter((op) => {
    const key = JSON.stringify(op);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Look/archetype hints. Ordered most-specific first; every pattern needs a
 * style-ish trigger so "a simple question" never restyles the project.
 */
const ARCHETYPE_EDIT_HINTS: ReadonlyArray<{ archetype: StyleArchetype; pattern: RegExp }> = [
  { archetype: 'brutalist', pattern: /\bbrutalis\w*\b|\bstark(?:er)?\s*(?:look|style|design)?\b|\braw\s+(?:look|style|design)\b/ },
  { archetype: 'editorial', pattern: /\beditorial\b(?!\s+hero)|\bmagazine\b|\bluxur\w*\b/ },
  { archetype: 'gradient', pattern: /\bglass(?:y|morphism)?\b|\bgradients?\b|\bvibrant\b/ },
  { archetype: 'soft', pattern: /\bpastel\b|\bplayful\b|\bfriendl(?:y|ier)\b|\bcuter?\b|\bsofter\b(?!\s+corners)|\bsoft\s+(?:look|style|design|vibe)\b/ },
  { archetype: 'minimal', pattern: /\bminimal(?:ist)?\b|\bcleaner\s+(?:look|style|design)?\b|\bsimpler\s+(?:look|style|design)\b|\bclean\s+(?:look|style|design)\b/ },
];

const HERO_EDIT_HINTS: ReadonlyArray<{ hero: HeroLayout; pattern: RegExp }> = [
  { hero: 'split', pattern: /\bhero\b.*\bsplit\b|\bsplit\b.*\bhero\b/ },
  { hero: 'banner', pattern: /\bhero\b.*\bbanner\b|\bbanner\b.*\bhero\b|\bfull[-\s]?bleed\s+(?:banner|hero)\b/ },
  { hero: 'editorial', pattern: /\bhero\b.*\beditorial\b|\beditorial\s+hero\b/ },
  { hero: 'centered', pattern: /\bcenter(?:ed)?\b.*\bhero\b|\bhero\b.*\bcenter(?:ed)?\b/ },
];

function parseClause(clause: string, spec: ProjectSpec, ops: EditOp[]): void {
  // Hero layout first — "editorial hero" is a layout, not an archetype.
  let heroMatched = false;
  for (const hint of HERO_EDIT_HINTS) {
    if (hint.pattern.test(clause)) {
      ops.push({ kind: 'setHero', hero: hint.hero });
      heroMatched = true;
      break;
    }
  }

  // Visual archetype ("go brutalist", "softer look", "make it minimal").
  if (!heroMatched) {
    for (const hint of ARCHETYPE_EDIT_HINTS) {
      if (hint.pattern.test(clause)) {
        ops.push({ kind: 'setArchetype', archetype: hint.archetype });
        break;
      }
    }
  }

  // Color mode.
  if (/\bdark(?:er)?\b|\bnight\s*mode\b/.test(clause) && !/\blight\b/.test(clause)) {
    ops.push({ kind: 'mode', mode: 'dark' });
  }
  if (/\blight(?:er)?\s*(?:mode|theme|version|background|look)\b|\bmake\s+(?:it|this|everything)\s+light(?:er)?\b|\bswitch\s+to\s+light\b|\bgo\s+light\b/.test(clause)) {
    ops.push({ kind: 'mode', mode: 'light' });
  }

  // Sections (verb required, so "change the pricing copy" stays inert).
  const hasAdd = ADD_VERBS.test(clause);
  const hasRemove = REMOVE_VERBS.test(clause);
  if (hasAdd || hasRemove) {
    for (const entry of SECTION_WORDS) {
      if (entry.pattern.test(clause)) {
        ops.push(
          hasRemove
            ? { kind: 'removeSection', section: entry.id }
            : { kind: 'addSection', section: entry.id },
        );
      }
    }
  }

  // Sticky header.
  const mentionsHeader = /\bheader\b|\bnav(?:bar|igation)?\b|\btop\s+bar\b/.test(clause);
  const mentionsSticky = /\bsticky\b|\bfixed\b|\bpinned?\b|\bpin\b|\bstick\b/.test(clause);
  if (mentionsHeader && mentionsSticky) {
    const negated = /\bun-?(?:stick|pin)\b|\bnot\b|\bno\s+longer\b|\bremove\b|\bdisable\b|\bstop\b/.test(clause);
    ops.push({ kind: 'stickyHeader', enabled: !negated });
  } else if (/\bunstick\s+the\s+(?:header|nav)\b/.test(clause)) {
    ops.push({ kind: 'stickyHeader', enabled: false });
  }

  // Spacing.
  if (/\btighter\b|\bmore\s+compact\b|\bdenser\b|\bless\s+spacing\b|\bcompact\s+spacing\b|\breduce\s+(?:the\s+)?spacing\b/.test(clause)) {
    ops.push({ kind: 'compact', enabled: true });
  } else if (/\bmore\s+spacious\b|\bairy\b|\bairier\b|\bbreathing\s+room\b|\bmore\s+whitespace\b|\bless\s+compact\b|\blooser\b/.test(clause)) {
    ops.push({ kind: 'compact', enabled: false });
  }

  // Animations.
  if (/\banimations?\b|\banimate\b|\bmotion\b/.test(clause)) {
    const off = /\b(?:disable|remove|turn\s+off|stop|drop|no|without|kill)\b/.test(clause);
    ops.push({ kind: 'animations', enabled: !off });
  }

  // Corner radius.
  if (/\bpill\b|\bbubbly\b/.test(clause)) {
    ops.push({ kind: 'radius', radius: 'pill' });
  } else if (/\brounder\b|\bmore\s+rounded\b|\bsofter\s+corners\b|\bround\s+(?:it|the\s+corners)\b/.test(clause)) {
    ops.push({ kind: 'radius', radius: stepRadius(spec.radius, 1) });
  } else if (/\bsharper\b|\bless\s+rounded\b|\bsquarer\b/.test(clause)) {
    ops.push({ kind: 'radius', radius: stepRadius(spec.radius, -1) });
  } else if (/\bsharp\s+corners\b|\bsquare\s+corners\b|\bmake\s+(?:it|everything)\s+sharp\b/.test(clause)) {
    ops.push({ kind: 'radius', radius: 'sharp' });
  }

  // Fonts.
  if (/\bsans(?:[-\s]serif)?\b/.test(clause)) {
    ops.push({ kind: 'font', font: 'sans' });
  } else if (/\bmono(?:space[d]?)?\b|\bterminal\b|\btypewriter\b/.test(clause)) {
    ops.push({ kind: 'font', font: 'mono' });
  } else if (/\bserif\b|\belegant\s+(?:font|type|typeface)\b/.test(clause)) {
    ops.push({ kind: 'font', font: 'serif' });
  }

  // Palette recolor — last, so "add a pricing section" never reads "add" as color.
  const color = findColorWord(clause);
  if (color) {
    ops.push({
      kind: 'recolor',
      primary: color.pair.primary,
      accent: color.pair.accent,
      colorName: color.name,
    });
  } else if (/\bmonochrome\b/.test(clause)) {
    const mono = COLOR_PAIRS['monochrome'];
    if (mono) {
      ops.push({ kind: 'recolor', primary: mono.primary, accent: mono.accent, colorName: 'monochrome' });
    }
  }
}

/* ------------------------------------------------------------------ */
/* applyEdits                                                          */
/* ------------------------------------------------------------------ */

function insertSection(sections: readonly SectionId[], section: SectionId): SectionId[] {
  if (sections.includes(section)) return [...sections];
  const rank = SECTION_ORDER.indexOf(section);
  const next = [...sections];
  const insertAt = next.findIndex((existing) => SECTION_ORDER.indexOf(existing) > rank);
  if (insertAt === -1) next.push(section);
  else next.splice(insertAt, 0, section);
  return next;
}

function toggleFeature(
  features: readonly ProjectSpec['features'][number][],
  flag: ProjectSpec['features'][number],
  enabled: boolean,
): ProjectSpec['features'][number][] {
  const without = features.filter((existing) => existing !== flag);
  return enabled ? [...without, flag] : without;
}

/** Pure — returns a new spec with all ops applied in order. */
export function applyEdits(spec: ProjectSpec, ops: readonly EditOp[]): ProjectSpec {
  let next: ProjectSpec = {
    ...spec,
    palette: { ...spec.palette },
    style: { ...spec.style },
    sections: [...spec.sections],
    features: [...spec.features],
  };

  for (const op of ops) {
    switch (op.kind) {
      case 'recolor':
        next = { ...next, palette: { ...next.palette, primary: op.primary, accent: op.accent } };
        break;
      case 'mode':
        next = { ...next, palette: { ...next.palette, mode: op.mode } };
        break;
      case 'rename':
        next = { ...next, name: op.name };
        break;
      case 'retagline':
        next = { ...next, tagline: op.tagline };
        break;
      case 'addSection':
        next = { ...next, sections: insertSection(next.sections, op.section) };
        break;
      case 'removeSection':
        next = { ...next, sections: next.sections.filter((section) => section !== op.section) };
        break;
      case 'radius':
        next = { ...next, radius: op.radius };
        break;
      case 'font':
        next = { ...next, font: op.font };
        break;
      case 'stickyHeader':
        next = { ...next, features: toggleFeature(next.features, 'sticky-header', op.enabled) };
        break;
      case 'compact':
        next = { ...next, features: toggleFeature(next.features, 'compact', op.enabled) };
        break;
      case 'animations':
        next = { ...next, features: toggleFeature(next.features, 'animations', op.enabled) };
        break;
      case 'setArchetype':
        next = { ...next, style: { ...next.style, archetype: op.archetype } };
        break;
      case 'setHero':
        next = { ...next, style: { ...next.style, hero: op.hero } };
        break;
    }
  }

  // Dedupe while keeping first-seen order stable.
  next = {
    ...next,
    sections: next.sections.filter((section, index, all) => all.indexOf(section) === index),
    features: next.features.filter((flag, index, all) => all.indexOf(flag) === index),
  };
  return next;
}
