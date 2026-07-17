/**
 * Deterministic assistant prose: creation narratives, edit narratives and
 * clarify fallbacks. All variety flows from the caller-provided Rng so the
 * same turn always reads the same way.
 */
import type { Rng } from '@/lib/seeded';
import type { ProjectSpec, SectionId, TemplateId } from './types';
import type { EditOp } from './edits';
import { TEMPLATE_LABELS } from './codegen/shared';

export interface CreationNarrative {
  intro: string;
  planItems: string[];
  outro: string;
}

export interface EditNarrative {
  intro: string;
  outro: string;
  summary: string;
}

/** Picks `count` distinct items without disturbing the source array. */
function pickMany<T>(rng: Rng, items: readonly T[], count: number): T[] {
  const pool = [...items];
  const chosen: T[] = [];
  while (chosen.length < count && pool.length > 0) {
    const index = rng.int(0, pool.length - 1);
    const item = pool[index];
    if (item !== undefined) chosen.push(item);
    pool.splice(index, 1);
  }
  return chosen;
}

const SECTION_LABELS: Record<SectionId, string> = {
  hero: 'hero',
  features: 'features',
  stats: 'stats',
  gallery: 'gallery',
  about: 'about',
  testimonials: 'testimonials',
  pricing: 'pricing',
  faq: 'FAQ',
  contact: 'contact',
  newsletter: 'newsletter',
  cta: 'call-to-action',
};

function lowerLabel(template: TemplateId): string {
  return TEMPLATE_LABELS[template].toLowerCase();
}

/* ------------------------------------------------------------------ */
/* Creation                                                            */
/* ------------------------------------------------------------------ */

const TEMPLATE_PLAN_ITEMS: Record<TemplateId, readonly string[]> = {
  landing: [
    'A headline hero with primary and secondary calls to action',
    'Responsive marketing sections that reflow cleanly on small screens',
    'A contact-ready footer and consistent typography throughout',
  ],
  dashboard: [
    'Stat cards with trend deltas across the top row',
    'Hand-drawn SVG bar and line charts fed by seeded data',
    'A recent-activity table with quick filtering and sidebar navigation',
  ],
  todo: [
    'Add, complete and delete tasks with filters for active and done',
    'A live remaining-count plus a clear-completed action',
    'Local storage persistence so the list survives a refresh',
  ],
  habit: [
    'A weekly grid of check cells for every habit',
    'Streak and weekly-total counters that update as you tick days',
    'An add-habit form with local storage persistence',
  ],
  portfolio: [
    'A gallery of project tiles with gradient cover art',
    'An about section that frames the work in context',
    'A validated contact form so visitors can reach out',
  ],
  blog: [
    'A home feed of posts with excerpts and reading-time labels',
    'A single-post view with an easy path back to the feed',
    'Typography tuned for long-form reading',
  ],
  store: [
    'A product grid with gradient art thumbnails and prices',
    'A slide-in cart with quantities, removal and a running total',
    'Cart persistence in local storage between visits',
  ],
  kanban: [
    'Three lanes with drag-and-drop between columns',
    'Quick-add forms for new cards in any lane',
    'Board state saved to local storage automatically',
  ],
  notes: [
    'A sidebar list with instant search across every note',
    'An editor pane that autosaves as you type',
    'Create, rename and delete flows with local persistence',
  ],
  pricing: [
    'Three plan cards with a highlighted recommended tier',
    'An FAQ that answers billing questions up front',
    'A closing call-to-action that keeps momentum',
  ],
  recipes: [
    'A recipe card grid with one-tap tag filters',
    'Detail views with an interactive ingredients checklist',
    'Step-by-step method lists that are easy to follow mid-cook',
  ],
  chat: [
    'A message thread with sent and received bubbles',
    'A composer that posts instantly, with a typing indicator for replies',
    'Varied canned responses so the room never feels empty',
  ],
};

export function buildCreationNarrative(spec: ProjectSpec, rng: Rng): CreationNarrative {
  const label = lowerLabel(spec.template);

  const intro = rng.pick([
    `Nice brief — I'll put together a ${label} called ${spec.name}.`,
    `Love it. Building ${spec.name}, a ${label}, right now.`,
    `Great starting point. Here's my plan for ${spec.name}, your new ${label}.`,
    `On it — ${spec.name} is going to be a tidy little ${label}.`,
  ]);

  const layoutItem =
    spec.sections.length > 0
      ? `A responsive page flowing through ${spec.sections
          .map((section) => SECTION_LABELS[section])
          .join(', ')} sections`
      : `A responsive ${label} layout with a branded header and footer`;

  const styleItem = rng.pick([
    `A ${spec.palette.mode} theme built around ${spec.palette.primary}, with ${spec.font} type and ${spec.radius} corners`,
    `${spec.palette.mode === 'dark' ? 'Dark' : 'Light'}-mode styling on ${spec.palette.primary}, ${spec.font} typography, ${spec.radius} corner radius`,
  ]);

  const specifics = [...TEMPLATE_PLAN_ITEMS[spec.template]];
  const specificCount = rng.chance(0.5) ? 3 : 2;
  const planItems = [layoutItem, ...specifics.slice(0, specificCount), styleItem];

  const suggestions = buildSuggestions(spec);
  const picked = pickMany(rng, suggestions, 2);
  const first = picked[0] ?? 'switch to dark mode';
  const second = picked[1] ?? 'rename it';

  const outro = rng.pick([
    `Done — ${spec.name} is live in the preview. If you want to push it further, ask me to ${first} or ${second}.`,
    `That's the first cut of ${spec.name}. Try "${first}" next, or tell me to ${second}.`,
    `${spec.name} is ready to explore. Natural next steps: ${first}, or ${second}.`,
    `All set. Poke around the preview, then ask me to ${first} — or ${second} — whenever you like.`,
  ]);

  return { intro, planItems, outro };
}

function buildSuggestions(spec: ProjectSpec): string[] {
  const suggestions: string[] = [];
  if (spec.palette.mode === 'light') suggestions.push('switch to dark mode');
  else suggestions.push('switch back to light mode');
  const pageLike = spec.sections.length > 0;
  if (pageLike) {
    const missing: SectionId[] = ['faq', 'stats', 'newsletter', 'testimonials'];
    for (const section of missing) {
      if (!spec.sections.includes(section)) {
        suggestions.push(`add a ${SECTION_LABELS[section]} section`);
        break;
      }
    }
  }
  suggestions.push('try a different color palette');
  if (spec.radius !== 'pill') suggestions.push('make the corners rounder');
  else suggestions.push('sharpen the corners');
  if (!spec.features.includes('sticky-header')) suggestions.push('pin the header');
  suggestions.push(`rename it to something of your own`);
  return suggestions;
}

/* ------------------------------------------------------------------ */
/* Edits                                                               */
/* ------------------------------------------------------------------ */

function opLabel(op: EditOp): string {
  switch (op.kind) {
    case 'recolor':
      return `Switch to a ${op.colorName} palette`;
    case 'mode':
      return `Switch to ${op.mode} mode`;
    case 'rename':
      return `Rename to ${op.name}`;
    case 'retagline':
      return 'Update the tagline';
    case 'addSection':
      return `Add ${SECTION_LABELS[op.section]} section`;
    case 'removeSection':
      return `Remove ${SECTION_LABELS[op.section]} section`;
    case 'radius':
      return `Use ${op.radius} corners`;
    case 'font':
      return `Switch to ${op.font} type`;
    case 'stickyHeader':
      return op.enabled ? 'Pin the header' : 'Unpin the header';
    case 'compact':
      return op.enabled ? 'Tighten the spacing' : 'Open up the spacing';
    case 'animations':
      return op.enabled ? 'Enable animations' : 'Disable animations';
  }
}

export function buildEditNarrative(
  ops: readonly EditOp[],
  spec: ProjectSpec,
  rng: Rng,
): EditNarrative {
  const firstOp = ops[0];
  const summary =
    firstOp === undefined
      ? 'Refine the project'
      : ops.length > 1
        ? `${opLabel(firstOp)} +${ops.length - 1} more`
        : opLabel(firstOp);

  const described = ops.slice(0, 3).map((op) => {
    const label = opLabel(op);
    return label.charAt(0).toLowerCase() + label.slice(1);
  });
  const changeList = described.join(', ') + (ops.length > 3 ? `, and ${ops.length - 3} more` : '');

  const intro = rng.pick([
    `Sure — I'll ${changeList} now.`,
    `Good call. Applying this to ${spec.name}: ${changeList}.`,
    `On it — ${changeList}.`,
    `Easy enough. Updating ${spec.name} to ${changeList}.`,
  ]);

  const outro = rng.pick([
    'Done — the preview reflects the change. Anything else you want to adjust?',
    `That's in. ${spec.name} has been regenerated with your update.`,
    'All applied. Take a look and tell me what to tweak next.',
    'Finished — the files above show exactly what moved.',
  ]);

  return { intro, outro, summary };
}

/* ------------------------------------------------------------------ */
/* Clarify                                                             */
/* ------------------------------------------------------------------ */

const CLARIFY_EXAMPLES: readonly string[] = [
  'make it dark mode',
  'add a FAQ section',
  'switch to a teal palette',
  'rename it to Fieldnotes',
  'make the corners sharper',
  'change the tagline to something bolder',
  'pin the header to the top',
  'tighten the spacing',
];

export function buildClarify(message: string, rng: Rng): string {
  const examples = pickMany(rng, CLARIFY_EXAMPLES, 3);
  const first = examples[0] ?? 'make it dark mode';
  const second = examples[1] ?? 'add a FAQ section';
  const third = examples[2] ?? 'switch to a teal palette';
  const trimmed = message.trim();
  const shortEcho = trimmed.length > 60 ? `${trimmed.slice(0, 57)}...` : trimmed;

  return rng.pick([
    `I couldn't map "${shortEcho}" to a design change. I'm best at concrete edits — try "${first}", "${second}" or "${third}".`,
    `Hmm, that one's outside what I can build from. Ask me for things like "${first}", "${second}" or "${third}" and I'll get right to it.`,
    `I only speak in app changes, so "${shortEcho}" stumped me. Some things that work well: "${first}", "${second}", "${third}".`,
    `Not sure how to turn that into an edit. I can restyle, rename, or restructure — for example "${first}", "${second}" or "${third}".`,
  ]);
}
