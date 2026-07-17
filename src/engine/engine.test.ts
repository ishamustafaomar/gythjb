import { describe, expect, it } from 'vitest';
import { createRng } from '@/lib/seeded';
import { engine, normalizeSpec, templateLabel, type StoredProjectSpec } from './index';
import { parsePrompt } from './parse';
import { applyEdits, parseEdit } from './edits';
import { generateFiles } from './codegen';
import {
  contentFor,
  detectFlavor,
  detectTopic,
  DOMAIN_FLAVORS,
  flavorFor,
  UNIVERSAL_FAQ,
  type TopicFlavor,
} from './codegen/content';
import { icon, ICON_NAMES, topicIcon } from './codegen/icons';
import { heroProp, patternBg, productArt, type PatternKind } from './codegen/art';
import { buildRuntimeJs } from './codegen/runtime';
import { counterParts, sectionTone } from './codegen/shared';
import { diffFileSystems } from './diff';
import type {
  ProjectSpec,
  StyleArchetype,
  TemplateId,
  TopicDomain,
  VirtualFileSystem,
} from './types';

const SEED = 'test-seed';

function specFromPrompt(prompt: string): ProjectSpec {
  return parsePrompt(prompt, SEED);
}

function fileContents(files: VirtualFileSystem, path: string): string {
  const file = files.find((candidate) => candidate.path === path);
  expect(file, `expected ${path} to exist`).toBeDefined();
  return file?.contents ?? '';
}

/** One detection prompt per template, used across the codegen matrix. */
const TEMPLATE_PROMPTS: Record<TemplateId, string> = {
  landing: 'A landing page for a coffee subscription',
  dashboard: 'An analytics dashboard for the team',
  todo: 'A simple todo list app',
  habit: 'A habit tracker for daily routines',
  portfolio: 'A portfolio site to show my work',
  blog: 'A blog about slow travel',
  store: 'An online store to sell candles',
  kanban: 'A kanban board for the crew',
  notes: 'A notes app with quick search',
  pricing: 'A pricing page for a saas product',
  recipes: 'A recipe collection for weeknight cooking',
  chat: 'A chat app for study groups',
};

/** A string each compiled template must contain (its interactive hook). */
const TEMPLATE_HOOKS: Record<TemplateId, string> = {
  landing: 'id="features"',
  dashboard: '<svg',
  todo: 'id="task-input"',
  habit: 'id="habit-form"',
  portfolio: 'id="gallery"',
  blog: 'id="post-list"',
  store: 'id="cart-drawer"',
  kanban: 'draggable',
  notes: 'id="note-list"',
  pricing: 'id="pricing"',
  recipes: 'id="recipe-grid"',
  chat: 'id="chat-form"',
};

const ALL_TEMPLATES = Object.keys(TEMPLATE_PROMPTS) as TemplateId[];
const PAGE_TEMPLATES: readonly TemplateId[] = ['landing', 'pricing', 'portfolio'];

describe('parsePrompt — template detection', () => {
  it.each(ALL_TEMPLATES)('detects %s', (template) => {
    expect(specFromPrompt(TEMPLATE_PROMPTS[template]).template).toBe(template);
  });

  it('falls back to landing for vague prompts', () => {
    expect(specFromPrompt('something nice for me please').template).toBe('landing');
  });
});

describe('parsePrompt — explicit page types beat topic nouns', () => {
  // An explicit structural phrase ("landing page", "pricing page", "website
  // for") names what to build; commerce nouns like "shop" that merely name
  // the page's subject must not steal the routing.
  const ROUTES: ReadonlyArray<[string, TemplateId, TopicDomain]> = [
    ['a landing page for a coffee shop', 'landing', 'food'],
    ['a landing page for my plant shop', 'landing', 'plants'],
    ['an online store selling house plants', 'store', 'plants'],
    ['a pricing page for a barbershop', 'pricing', 'generic'],
    ['a website for a coffee shop', 'landing', 'food'],
  ];

  it.each(ROUTES)('"%s" → %s (%s)', (prompt, template, topic) => {
    const spec = specFromPrompt(prompt);
    expect(spec.template).toBe(template);
    expect(spec.topic).toBe(topic);
  });
});

describe('parsePrompt — spec details', () => {
  it('extracts "called X" names', () => {
    expect(specFromPrompt('a site called Bloom').name).toBe('Bloom');
  });

  it('extracts quoted names', () => {
    expect(specFromPrompt('a landing page for "Fern & Fog"').name).toBe('Fern & Fog');
  });

  it('extracts "for my X business" names', () => {
    expect(specFromPrompt('a website for my bakery business').name).toBe('Bakery');
  });

  it('generates a two-word title-cased name otherwise', () => {
    const name = specFromPrompt('a landing page').name;
    const words = name.split(' ');
    expect(words).toHaveLength(2);
    for (const word of words) expect(word).toMatch(/^[A-Z]/);
  });

  it('maps color words to curated palette pairs', () => {
    const spec = specFromPrompt('a blue landing page');
    expect(spec.palette.primary).toBe('#2563EB');
    expect(spec.palette.accent).toBe('#22D3EE');
  });

  it('parses dark mode, defaults to light', () => {
    expect(specFromPrompt('a dark landing page').palette.mode).toBe('dark');
    expect(specFromPrompt('a landing page').palette.mode).toBe('light');
  });

  it('parses font and radius hints', () => {
    expect(specFromPrompt('an elegant serif portfolio').font).toBe('serif');
    expect(specFromPrompt('a technical dashboard').font).toBe('mono');
    expect(specFromPrompt('a brutalist landing page').radius).toBe('sharp');
    expect(specFromPrompt('a soft bubbly landing page').radius).toBe('pill');
    expect(specFromPrompt('a landing page').radius).toBe('rounded');
  });

  it('uses dense per-template default sections', () => {
    const landing = specFromPrompt('a landing page').sections;
    expect(landing.length).toBeGreaterThanOrEqual(6);
    for (const id of ['hero', 'features', 'stats', 'about', 'testimonials', 'faq', 'cta'] as const) {
      expect(landing).toContain(id);
    }

    const pricing = specFromPrompt('a pricing page').sections;
    expect(pricing.length).toBeGreaterThanOrEqual(4);
    for (const id of ['hero', 'pricing', 'faq', 'cta'] as const) {
      expect(pricing).toContain(id);
    }

    const portfolio = specFromPrompt('a portfolio of my work').sections;
    expect(portfolio.length).toBeGreaterThanOrEqual(5);
    for (const id of ['hero', 'gallery', 'about', 'contact'] as const) {
      expect(portfolio).toContain(id);
    }

    expect(specFromPrompt('a simple todo list app').sections).toEqual([]);
  });

  it('adds mentioned sections in canonical order', () => {
    const spec = specFromPrompt('a landing page with pricing and a faq');
    expect(spec.sections).toContain('pricing');
    expect(spec.sections).toContain('faq');
    // Canonical top-to-bottom ordering is preserved.
    const order: readonly string[] = [
      'hero', 'features', 'stats', 'gallery', 'about',
      'testimonials', 'pricing', 'faq', 'contact', 'newsletter', 'cta',
    ];
    const positions = spec.sections.map((section) => order.indexOf(section));
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('parses feature flags', () => {
    expect(specFromPrompt('a landing page with a sticky header').features).toContain('sticky-header');
    expect(specFromPrompt('a landing page').features).toContain('animations');
    expect(specFromPrompt('a todo app').features).not.toContain('animations');
  });
});

describe('parseEdit / applyEdits', () => {
  const base = specFromPrompt('a landing page for a coffee subscription');

  it('recolors from a color word', () => {
    const ops = parseEdit('make it teal', base);
    expect(ops).toHaveLength(1);
    const next = applyEdits(base, ops);
    expect(next.palette.primary).toBe('#0D9488');
  });

  it('switches modes', () => {
    const dark = applyEdits(base, parseEdit('switch to dark mode', base));
    expect(dark.palette.mode).toBe('dark');
    const light = applyEdits(dark, parseEdit('back to light mode please', dark));
    expect(light.palette.mode).toBe('light');
  });

  it('applies multiple ops from one message', () => {
    const ops = parseEdit('make it dark and add a faq section', base);
    expect(ops.length).toBe(2);
    const next = applyEdits(base, ops);
    expect(next.palette.mode).toBe('dark');
    expect(next.sections).toContain('faq');
    expect(next.sections.indexOf('faq')).toBeLessThan(next.sections.indexOf('cta'));
  });

  it('adding a section twice is idempotent', () => {
    const once = applyEdits(base, parseEdit('add a faq section', base));
    const twice = applyEdits(once, parseEdit('add a faq section', once));
    expect(twice.sections.filter((section) => section === 'faq')).toHaveLength(1);
  });

  it('removes sections', () => {
    const next = applyEdits(base, parseEdit('remove the testimonials', base));
    expect(next.sections).not.toContain('testimonials');
  });

  it('renames without leaking color words into a recolor', () => {
    const ops = parseEdit('rename it to Blue Sky', base);
    expect(ops).toHaveLength(1);
    expect(ops[0]).toEqual({ kind: 'rename', name: 'Blue Sky' });
  });

  it('title-cases lowercase rename targets', () => {
    const next = applyEdits(base, parseEdit('call it aurora', base));
    expect(next.name).toBe('Aurora');
  });

  it('renames via an h1 selection', () => {
    const ops = parseEdit('change this to Nova', base, { tag: 'h1', text: 'old headline' });
    expect(ops).toEqual([{ kind: 'rename', name: 'Nova' }]);
  });

  it('retaglines via a p selection', () => {
    const ops = parseEdit('make this say Fresh bread daily', base, { tag: 'p', text: 'old' });
    expect(ops).toEqual([{ kind: 'retagline', tagline: 'Fresh bread daily' }]);
  });

  it('updates the tagline from a plain message', () => {
    const next = applyEdits(base, parseEdit('change the tagline to Ship it faster', base));
    expect(next.tagline).toBe('Ship it faster');
  });

  it('handles sticky header, radius steps and spacing', () => {
    const sticky = applyEdits(base, parseEdit('make the header sticky', base));
    expect(sticky.features).toContain('sticky-header');
    const sharp = applyEdits(base, parseEdit('make the corners sharper', base));
    expect(sharp.radius).toBe('sharp');
    const pill = applyEdits(base, parseEdit('use pill shaped buttons', base));
    expect(pill.radius).toBe('pill');
    const compact = applyEdits(base, parseEdit('tighter spacing please', base));
    expect(compact.features).toContain('compact');
  });

  it('returns no ops for unrelated questions', () => {
    expect(parseEdit('what is the weather like today?', base)).toEqual([]);
  });
});

describe('engine.createProject', () => {
  it('is fully deterministic', () => {
    const a = engine.createProject({ prompt: 'a purple habit tracker called Loop', seed: 'p1' });
    const b = engine.createProject({ prompt: 'a purple habit tracker called Loop', seed: 'p1' });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('returns a complete generation plan', () => {
    const plan = engine.createProject({ prompt: 'a blue landing page called Drift', seed: 'p2' });
    expect(plan.kind).toBe('generation');
    expect(plan.intro.length).toBeGreaterThan(0);
    expect(plan.outro.length).toBeGreaterThan(0);
    expect(plan.planItems.length).toBeGreaterThanOrEqual(4);
    expect(plan.planItems.length).toBeLessThanOrEqual(5);
    expect(plan.summary).toBe('Create Drift');
    expect(plan.changes).toHaveLength(4);
    for (const change of plan.changes) {
      expect(change.kind).toBe('created');
      expect(change.additions).toBeGreaterThan(0);
      expect(change.deletions).toBe(0);
    }
  });
});

describe('engine.applyMessage', () => {
  const project = engine.createProject({ prompt: 'a landing page called Drift', seed: 'p3' });

  it('applies an edit and keeps the project seed', () => {
    // The seeded base palette must differ from the requested color for the
    // diff assertions below to be meaningful.
    expect(project.spec.palette.primary).not.toBe('#DC2626');
    const reply = engine.applyMessage({ spec: project.spec, message: 'make it red', seed: 'p3:1' });
    expect(reply.kind).toBe('generation');
    if (reply.kind !== 'generation') return;
    expect(reply.spec.seed).toBe(project.spec.seed);
    expect(reply.spec.name).toBe('Drift');
    expect(reply.spec.palette.primary).toBe('#DC2626');
    expect(reply.summary).toMatch(/red/i);

    const cssChange = reply.changes.find((change) => change.path === 'css/styles.css');
    expect(cssChange?.kind).toBe('modified');
    expect(cssChange?.additions).toBeGreaterThan(0);
    // A pure recolor never touches the markup.
    expect(reply.changes.some((change) => change.path === 'index.html')).toBe(false);
  });

  it('clarifies when nothing maps to an edit', () => {
    const reply = engine.applyMessage({
      spec: project.spec,
      message: 'what is the weather today?',
      seed: 'p3:2',
    });
    expect(reply.kind).toBe('clarify');
    if (reply.kind !== 'clarify') return;
    expect(reply.text.length).toBeGreaterThan(20);
  });
});

describe('codegen invariants (all 12 templates)', () => {
  it.each(ALL_TEMPLATES)('%s produces a complete, valid project', (template) => {
    const spec = parsePrompt(TEMPLATE_PROMPTS[template], `seed-${template}`);
    expect(spec.template).toBe(template);
    const files = generateFiles(spec);

    expect(files.map((file) => file.path).sort()).toEqual([
      'README.md', 'css/styles.css', 'index.html', 'js/app.js',
    ]);

    const html = fileContents(files, 'index.html');
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('name="viewport"');
    expect(html).toContain(`<title>${spec.name}</title>`);
    expect(html).toContain('Built with Promptly');

    const css = fileContents(files, 'css/styles.css');
    expect(css.toUpperCase()).toContain(spec.palette.primary.toUpperCase());

    expect(fileContents(files, 'js/app.js')).toContain("'use strict'");
    expect(fileContents(files, 'README.md')).toContain('Promptly');
  });

  it.each(ALL_TEMPLATES)('%s compiles into a self-contained preview', (template) => {
    const spec = parsePrompt(TEMPLATE_PROMPTS[template], `seed-${template}`);
    const compiled = engine.compilePreview(generateFiles(spec));

    expect(compiled).not.toMatch(/<link\b[^>]*stylesheet/);
    expect(compiled).not.toContain('src="js/app.js"');
    expect(compiled).toContain('<style>');
    expect(compiled).toContain('<script>');
    expect(compiled).toContain(TEMPLATE_HOOKS[template]);
  });

  it.each(PAGE_TEMPLATES)('%s renders multiple sections', (template) => {
    const spec = parsePrompt(TEMPLATE_PROMPTS[template], `seed-${template}`);
    const html = fileContents(generateFiles(spec), 'index.html');
    const sectionCount = html.match(/<section\b/g)?.length ?? 0;
    expect(sectionCount).toBeGreaterThanOrEqual(3);
  });
});

describe('compilePreview inspector bridge', () => {
  const files = generateFiles(parsePrompt('a landing page', 'seed-inspect'));

  it('injects the bridge only when asked, disabled by default', () => {
    const withInspector = engine.compilePreview(files, { inspector: true });
    expect(withInspector).toContain('promptly:element-selected');
    expect(withInspector).toContain('promptly:set-inspector');
    expect(withInspector).toContain('var enabled = false');

    const without = engine.compilePreview(files);
    expect(without).not.toContain('promptly:element-selected');
    // The external-link guard is always present.
    expect(without).toContain("setAttribute('rel', 'noopener')");
  });
});

describe('diffFileSystems', () => {
  it('marks deletions when files disappear', () => {
    const before = generateFiles(parsePrompt('a landing page', 'seed-diff'));
    const after = before.filter((file) => file.path !== 'README.md');
    const changes = diffFileSystems(before, after);
    expect(changes).toEqual([
      expect.objectContaining({ path: 'README.md', kind: 'deleted', additions: 0 }),
    ]);
  });

  it('reports no changes for identical file systems', () => {
    const files = generateFiles(parsePrompt('a landing page', 'seed-diff'));
    expect(diffFileSystems(files, files)).toEqual([]);
  });
});

describe('detectTopic', () => {
  const MATRIX: ReadonlyArray<[string, TopicDomain]> = [
    ['a landing page for my coffee shop', 'food'],
    ['a recipe site for weeknight kitchens', 'food'],
    ['an online store for house plants', 'plants'],
    ['a succulent garden blog', 'plants'],
    ['a saas analytics dashboard', 'tech'],
    ['a startup landing page for an ai api', 'tech'],
    ['a yoga studio site', 'fitness'],
    ['a gym workout tracker', 'fitness'],
    ['a boutique clothing store', 'fashion'],
    ['a jewelry brand page', 'fashion'],
    ['a wedding photography portfolio', 'photography'],
    ['a travel blog about slow trips', 'travel'],
    ['a site for my band', 'music'],
    ['a podcast landing page', 'music'],
    ['a meditation and skincare spa page', 'wellness'],
    ['something nice for me please', 'generic'],
  ];

  it.each(MATRIX)('"%s" → %s', (prompt, topic) => {
    expect(detectTopic(prompt)).toBe(topic);
  });

  it('prefers the specific domain over a weak tech word', () => {
    // "app" alone is a weak tech signal; meditation should win.
    expect(detectTopic('a meditation app')).toBe('wellness');
    expect(detectTopic('a recipe app')).toBe('food');
  });
});

describe('parsePrompt — style archetypes and hero layouts', () => {
  const HINTS: ReadonlyArray<[string, StyleArchetype]> = [
    ['a minimal landing page', 'minimal'],
    ['a clean simple portfolio', 'minimal'],
    ['a bold vibrant glassy landing page', 'gradient'],
    ['an elegant magazine style blog', 'editorial'],
    ['a luxury boutique page', 'editorial'],
    ['a brutalist portfolio', 'brutalist'],
    ['a stark raw landing page', 'brutalist'],
    ['a playful pastel todo app', 'soft'],
  ];

  it.each(HINTS)('"%s" → %s archetype', (prompt, archetype) => {
    expect(specFromPrompt(prompt).style.archetype).toBe(archetype);
  });

  it('parses hero layout hints', () => {
    expect(specFromPrompt('a landing page with a split hero').style.hero).toBe('split');
    expect(specFromPrompt('a landing page with a full-bleed banner').style.hero).toBe('banner');
    expect(specFromPrompt('a landing page with a centered hero').style.hero).toBe('centered');
  });

  it('two seeds, same prompt → different archetypes for at least one pinned pair', () => {
    const pairs: ReadonlyArray<[string, string]> = [
      ['s1', 's2'],
      ['s3', 's4'],
      ['s5', 's6'],
    ];
    const differing = pairs.filter(([a, b]) => {
      const specA = parsePrompt('a landing page', a);
      const specB = parsePrompt('a landing page', b);
      return specA.style.archetype !== specB.style.archetype;
    });
    expect(differing.length).toBeGreaterThanOrEqual(1);
  });

  it('always produces a valid style, even without hints', () => {
    const spec = specFromPrompt('a landing page');
    expect(['minimal', 'gradient', 'editorial', 'brutalist', 'soft']).toContain(spec.style.archetype);
    expect(['centered', 'split', 'banner', 'editorial']).toContain(spec.style.hero);
  });
});

describe('archetype-driven codegen', () => {
  function cssFor(prompt: string, seed: string): string {
    return fileContents(generateFiles(parsePrompt(prompt, seed)), 'css/styles.css');
  }

  it('brutalist CSS uses hard offset shadows and zero radii', () => {
    const css = cssFor('a brutalist landing page', 'arch-b');
    expect(css).toContain('6px 6px 0');
    expect(css).toContain('--radius-md: 0');
    expect(css).toContain('--radius-btn: 0');
    expect(css).toMatch(/border:\s*3px solid/);
  });

  it('gradient CSS uses glass cards with backdrop-filter', () => {
    const css = cssFor('a glassy landing page', 'arch-g');
    expect(css).toContain('backdrop-filter');
    expect(css).toContain('radial-gradient');
  });

  it('minimal CSS paints no shadows at all', () => {
    const css = cssFor('a minimal landing page', 'arch-m');
    expect(css.match(/box-shadow/g)).toBeNull();
  });

  it('editorial CSS serves serif display headings and numbered sections', () => {
    const css = cssFor('an editorial landing page', 'arch-e');
    expect(css).toContain('Georgia');
    expect(css).toContain('decimal-leading-zero');
  });

  it('hero layout markup differs between two pinned specs', () => {
    const split = parsePrompt('a landing page with a split hero', 'hero-a');
    const banner = parsePrompt('a landing page with a full-bleed banner', 'hero-b');
    const splitHtml = fileContents(generateFiles(split), 'index.html');
    const bannerHtml = fileContents(generateFiles(banner), 'index.html');
    expect(splitHtml).toContain('hero-split');
    expect(splitHtml).toContain('hero-visual');
    expect(bannerHtml).toContain('hero-banner');
    expect(bannerHtml).not.toContain('hero-visual');
    expect(splitHtml).not.toBe(bannerHtml);
  });
});

describe('topic-driven content', () => {
  it('a house plants store sells only plant-pool products', () => {
    const spec = parsePrompt('an online store for house plants', 'plants-1');
    expect(spec.topic).toBe('plants');
    const html = fileContents(generateFiles(spec), 'index.html');
    const poolNames = contentFor('plants', createRng('any')).products.map((p) => p.name);
    const rendered = [...html.matchAll(/<h3>([^<]+)<\/h3>/g)].map((match) => match[1]);
    expect(rendered.length).toBeGreaterThanOrEqual(6);
    for (const name of rendered) {
      expect(poolNames).toContain(name?.replaceAll('&#39;', "'"));
    }
  });

  it('a gym habit tracker seeds habits from the fitness pool', () => {
    const spec = parsePrompt('a habit tracker for my gym routine', 'fit-1');
    expect(spec.topic).toBe('fitness');
    const js = fileContents(generateFiles(spec), 'js/app.js');
    const pool = contentFor('fitness', createRng('any')).habitIdeas;
    const seeded = /var SEED_HABITS = (\[.*?\]);/.exec(js)?.[1];
    expect(seeded).toBeDefined();
    const habits = JSON.parse(seeded ?? '[]') as Array<{ name: string }>;
    expect(habits.length).toBeGreaterThanOrEqual(3);
    for (const habit of habits) expect(pool).toContain(habit.name);
  });

  it('content pools meet their minimum sizes for every domain', () => {
    const domains: TopicDomain[] = [
      'food', 'plants', 'tech', 'fitness', 'fashion',
      'photography', 'travel', 'music', 'wellness', 'generic',
    ];
    for (const domain of domains) {
      const content = contentFor(domain, createRng(`sizes-${domain}`));
      expect(content.products.length, `${domain} products`).toBeGreaterThanOrEqual(8);
      expect(content.posts.length, `${domain} posts`).toBeGreaterThanOrEqual(5);
      expect(content.recipes.length, `${domain} recipes`).toBeGreaterThanOrEqual(6);
      expect(content.galleryProjects.length, `${domain} gallery`).toBeGreaterThanOrEqual(6);
      expect(content.personas.length, `${domain} personas`).toBeGreaterThanOrEqual(5);
      expect(content.stats.length, `${domain} stats`).toBeGreaterThanOrEqual(4);
      expect(content.featureIdeas.length, `${domain} features`).toBeGreaterThanOrEqual(6);
      expect(content.habitIdeas.length, `${domain} habits`).toBeGreaterThanOrEqual(6);
      expect(content.todoIdeas.length, `${domain} todos`).toBeGreaterThanOrEqual(7);
      expect(content.kanbanCards.length, `${domain} kanban`).toBeGreaterThanOrEqual(9);
      expect(content.noteTitles.length, `${domain} notes`).toBeGreaterThanOrEqual(6);
      expect(content.chatContacts.length, `${domain} contacts`).toBeGreaterThanOrEqual(4);
      expect(content.faq.length, `${domain} faq`).toBeGreaterThanOrEqual(6);
      expect(content.testimonials.length, `${domain} testimonials`).toBeGreaterThanOrEqual(6);
    }
  });
});

describe('style edit ops', () => {
  const base = specFromPrompt('a landing page for a coffee subscription');

  it('parses and applies setArchetype', () => {
    const ops = parseEdit('go brutalist', base);
    expect(ops).toEqual([{ kind: 'setArchetype', archetype: 'brutalist' }]);
    const next = applyEdits(base, ops);
    expect(next.style.archetype).toBe('brutalist');
    expect(next.style.hero).toBe(base.style.hero);
  });

  it('maps look phrasings to archetypes', () => {
    expect(parseEdit('make it minimal', base)).toEqual([
      { kind: 'setArchetype', archetype: 'minimal' },
    ]);
    expect(parseEdit('more editorial please', base)).toEqual([
      { kind: 'setArchetype', archetype: 'editorial' },
    ]);
    expect(parseEdit('give it a softer, playful look', base)).toEqual([
      { kind: 'setArchetype', archetype: 'soft' },
    ]);
    expect(parseEdit('try a glassy gradient look', base)).toEqual([
      { kind: 'setArchetype', archetype: 'gradient' },
    ]);
  });

  it('parses and applies setHero', () => {
    const split = applyEdits(base, parseEdit('make the hero a split layout', base));
    expect(split.style.hero).toBe('split');
    const banner = applyEdits(base, parseEdit('use a banner hero', base));
    expect(banner.style.hero).toBe('banner');
    const centered = applyEdits(base, parseEdit('center the hero', base));
    expect(centered.style.hero).toBe('centered');
  });

  it('combines style ops with other edits in one message', () => {
    const ops = parseEdit('go brutalist and make the hero a split layout', base);
    const next = applyEdits(base, ops);
    expect(next.style).toEqual({ archetype: 'brutalist', hero: 'split' });
  });

  it('round-trips through the engine with a look-aware summary', () => {
    const project = engine.createProject({ prompt: 'a landing page called Drift', seed: 'style-1' });
    const reply = engine.applyMessage({
      spec: project.spec,
      message: 'switch to a brutalist look',
      seed: 'style-1:1',
    });
    expect(reply.kind).toBe('generation');
    if (reply.kind !== 'generation') return;
    expect(reply.spec.style.archetype).toBe('brutalist');
    expect(reply.summary).toMatch(/brutalist/i);
    expect(fileContents(reply.files, 'css/styles.css')).toContain('6px 6px 0');
  });
});

describe('normalizeSpec', () => {
  function legacyOf(spec: ProjectSpec): StoredProjectSpec {
    const clone = JSON.parse(JSON.stringify(spec)) as Record<string, unknown>;
    delete clone['style'];
    delete clone['topic'];
    return clone as unknown as StoredProjectSpec;
  }

  it('fills missing style and topic deterministically', () => {
    const spec = parsePrompt('a landing page called Drift', 'norm-1');
    const legacy = legacyOf(spec);
    const a = normalizeSpec(legacy);
    const b = normalizeSpec(legacyOf(spec));
    expect(a.style).toBeDefined();
    expect(a.topic).toBeDefined();
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('normalized legacy specs regenerate without throwing', () => {
    const spec = parsePrompt('a habit tracker', 'norm-2');
    const files = generateFiles(normalizeSpec(legacyOf(spec)));
    expect(files).toHaveLength(4);
    expect(fileContents(files, 'index.html')).toContain('<!doctype html>');
  });

  it('best-efforts the topic from name and tagline', () => {
    const spec = parsePrompt('a store called "Coffee Corner"', 'norm-3');
    const legacy = legacyOf(spec);
    expect(normalizeSpec(legacy).topic).toBe('food');
  });

  it('leaves complete specs untouched', () => {
    const spec = parsePrompt('a brutalist landing page', 'norm-4');
    expect(normalizeSpec(spec)).toBe(spec);
  });

  it('applyMessage heals legacy specs before editing', () => {
    const spec = parsePrompt('a landing page called Drift', 'norm-5');
    const legacy = legacyOf(spec) as unknown as ProjectSpec;
    const reply = engine.applyMessage({ spec: legacy, message: 'make it teal', seed: 'norm-5:1' });
    expect(reply.kind).toBe('generation');
    if (reply.kind !== 'generation') return;
    expect(reply.spec.style).toBeDefined();
    expect(reply.spec.topic).toBeDefined();
  });
});

/* ------------------------------------------------------------------ */
/* Foundation layer: icons, art, runtime, density, tagline grammar     */
/* ------------------------------------------------------------------ */

const ALL_DOMAINS: readonly TopicDomain[] = [
  'food', 'plants', 'tech', 'fitness', 'fashion',
  'photography', 'travel', 'music', 'wellness', 'generic',
];

describe('foundation — icons', () => {
  it('renders every icon as a stroke-based currentColor svg', () => {
    expect(ICON_NAMES.length).toBeGreaterThanOrEqual(28);
    for (const name of ICON_NAMES) {
      const svg = icon(name);
      expect(svg, name).toContain('<svg');
      expect(svg, name).toContain('aria-hidden="true"');
      expect(svg, name).toContain('stroke="currentColor"');
      expect(svg, name).toContain('viewBox="0 0 24 24"');
      expect(svg, name).toContain('stroke-width="1.8"');
    }
  });

  it('applies an optional class to the svg element', () => {
    expect(icon('star', 'star-i')).toContain('class="star-i"');
    expect(icon('star')).not.toContain('class=');
  });

  it('topicIcon maps every domain to a real icon', () => {
    for (const domain of ALL_DOMAINS) {
      expect(ICON_NAMES).toContain(topicIcon(domain));
    }
  });
});

describe('foundation — art', () => {
  const PROP_MARKERS: Record<TopicDomain, string> = {
    tech: 'hp-browser',
    photography: 'hp-photos',
    food: 'hp-menu',
    plants: 'hp-arch',
    fitness: 'hp-ring',
    travel: 'hp-pass',
    music: 'hp-wave',
    fashion: 'hp-look',
    wellness: 'hp-breath',
    generic: 'hp-glass',
  };

  it.each(ALL_DOMAINS)('heroProp renders the %s signature prop', (domain) => {
    const spec: ProjectSpec = { ...parsePrompt('a landing page', 'art-seed'), topic: domain };
    const content = contentFor(domain, createRng('art-content'));
    const piece = heroProp(spec, createRng('art-rng'), content);
    expect(piece.html).toContain(PROP_MARKERS[domain]);
    expect(piece.css.length).toBeGreaterThan(100);
  });

  it('heroProp is deterministic for identical inputs', () => {
    const spec = parsePrompt('a landing page for my coffee shop', 'det-seed');
    const content = contentFor(spec.topic, createRng('det-content'));
    const a = heroProp(spec, createRng('det-rng'), content);
    const b = heroProp(spec, createRng('det-rng'), content);
    expect(a.html).toBe(b.html);
    expect(a.css).toBe(b.css);
  });

  it('animated props guard their animation behind reduced-motion', () => {
    for (const domain of ['music', 'wellness'] as const) {
      const spec: ProjectSpec = { ...parsePrompt('a landing page', 'anim-seed'), topic: domain };
      const piece = heroProp(spec, createRng('anim-rng'), contentFor(domain, createRng('c')));
      if (piece.css.includes('animation:')) {
        expect(piece.css).toContain('prefers-reduced-motion: no-preference');
      }
    }
  });

  it('patternBg produces four distinct texture recipes', () => {
    const kinds: readonly PatternKind[] = ['dotGrid', 'lineGrid', 'diagonalStripes', 'speckle'];
    const recipes = kinds.map((kind) => patternBg(kind, createRng(`pat-${kind}`)));
    for (const recipe of recipes) expect(recipe).toContain('background-image');
    expect(new Set(recipes).size).toBe(4);
  });

  it('productArt is deterministic per (seed, index) and mesh-layered', () => {
    const a = productArt(createRng('pa-seed:2'), 'plants', 2);
    const b = productArt(createRng('pa-seed:2'), 'plants', 2);
    expect(a.html).toBe(b.html);
    expect(a.css).toBe(b.css);
    expect(a.html).toContain('pa-2');
    expect(a.html).toContain('<svg');
    expect(a.css).toContain('conic-gradient');
    expect(a.css).toContain('radial-gradient');
  });
});

describe('foundation — runtime', () => {
  const js = buildRuntimeJs({ rotator: true });

  it('reveals via IntersectionObserver with a reduced-motion guard', () => {
    expect(js).toContain('IntersectionObserver');
    expect(js).toContain('prefers-reduced-motion: reduce');
    expect(js).toContain('[data-reveal]');
    expect(js).toContain('data-reveal-delay');
  });

  it('hooks up counters, nav toggle, anchors and the rotator', () => {
    expect(js).toContain('[data-count-to]');
    expect(js).toContain('[data-nav-toggle]');
    expect(js).toContain('aria-expanded');
    expect(js).toContain('scrollIntoView');
    expect(js).toContain('[data-rotator]');
    expect(buildRuntimeJs()).not.toContain('[data-rotator]');
  });

  it('never logs to the console', () => {
    expect(js).not.toContain('console.');
  });

  it('counterParts splits display values for the counter runtime', () => {
    expect(counterParts('4,200')).toEqual({
      target: 4200, decimals: 0, group: true, prefix: '', suffix: '',
    });
    expect(counterParts('99.99%')).toEqual({
      target: 99.99, decimals: 2, group: false, prefix: '', suffix: '%',
    });
    expect(counterParts('<50ms')).toEqual({
      target: 50, decimals: 0, group: false, prefix: '<', suffix: 'ms',
    });
    expect(counterParts('4.9/5')?.suffix).toBe('/5');
    // Clock-style values must not animate.
    expect(counterParts('5:45')).toBeNull();
  });
});

describe('foundation — page density and structure', () => {
  it.each(['d1', 'd2', 'd3', 'd4'])('landing seed %s renders ≥6 distinct sections', (seed) => {
    const spec = parsePrompt('a landing page for a coffee shop', seed);
    expect(spec.sections.length).toBeGreaterThanOrEqual(6);
    const html = fileContents(generateFiles(spec), 'index.html');
    const rendered = html.match(/<section\b/g)?.length ?? 0;
    expect(rendered).toBeGreaterThanOrEqual(6);
  });

  it('long prompts bias toward denser pages', () => {
    const long = parsePrompt(
      'a landing page for a specialty coffee subscription that roasts weekly, ' +
        'ships to your door, includes brew guides from real baristas and supports growers directly',
      'dense-1',
    );
    expect(long.sections.length).toBeGreaterThanOrEqual(9);
  });

  it('the landing page wires runtime hooks into markup and JS', () => {
    const spec = parsePrompt('a landing page for a coffee shop', 'hooks-1');
    const files = generateFiles(spec);
    const html = fileContents(files, 'index.html');
    const js = fileContents(files, 'js/app.js');

    expect(html).toContain('data-reveal');
    expect(html).toContain('data-count-to');
    expect(html).toContain('class="wordmark"');
    expect(js).toContain('IntersectionObserver');
    expect(js).toContain('prefers-reduced-motion');
  });

  it('the header carries a functional hamburger for page templates', () => {
    // Pin a seed whose header variant shows nav links.
    const seeds = ['ham-1', 'ham-2', 'ham-3', 'ham-4'];
    const withNav = seeds
      .map((seed) => fileContents(generateFiles(parsePrompt('a landing page', seed)), 'index.html'))
      .filter((html) => html.includes('data-nav-menu'));
    expect(withNav.length).toBeGreaterThanOrEqual(1);
    for (const html of withNav) {
      expect(html).toContain('data-nav-toggle');
      expect(html).toContain('aria-expanded="false"');
    }
  });

  it('the footer is multi-column with at least 6 real anchors', () => {
    const spec = parsePrompt('a landing page for a coffee shop', 'foot-1');
    const html = fileContents(generateFiles(spec), 'index.html');
    const footer = html.slice(html.indexOf('<footer'));
    expect(footer).toContain('footer-col');
    expect(footer).toContain('footer-fine');
    const anchors = footer.match(/href="#[a-z]/g)?.length ?? 0;
    expect(anchors).toBeGreaterThanOrEqual(6);
  });

  it('section rhythm inverts the CTA and keeps the hero plain', () => {
    const spec = parsePrompt('a landing page', 'tone-1');
    expect(sectionTone(spec, 'hero')).toBe('plain');
    expect(sectionTone(spec, 'cta')).toBe('invert');
    const html = fileContents(generateFiles(spec), 'index.html');
    expect(html).toContain('tone-invert');
  });

  it('brutalist reveals snap without translate; gradient reveals slide', () => {
    const brutal = fileContents(
      generateFiles(parsePrompt('a brutalist landing page', 'rev-b')),
      'css/styles.css',
    );
    const brutalRule = /html\.js-reveal \[data-reveal\] \{[^}]*\}/.exec(brutal)?.[0] ?? '';
    expect(brutalRule.length).toBeGreaterThan(0);
    expect(brutalRule).not.toContain('translate');

    const glassy = fileContents(
      generateFiles(parsePrompt('a glassy landing page', 'rev-g')),
      'css/styles.css',
    );
    const glassyRule = /html\.js-reveal \[data-reveal\] \{[^}]*\}/.exec(glassy)?.[0] ?? '';
    expect(glassyRule).toContain('translateY');
  });
});

describe('foundation — content depth and tagline grammar', () => {
  it('every domain ships logoNames, kickers, longAbout and grammar pools', () => {
    for (const domain of ALL_DOMAINS) {
      const content = contentFor(domain, createRng(`depth-${domain}`));
      expect(content.logoNames.length, `${domain} logoNames`).toBeGreaterThanOrEqual(6);
      expect(content.heroKickers.length, `${domain} heroKickers`).toBeGreaterThanOrEqual(4);
      expect(content.longAbout.length, `${domain} longAbout`).toBeGreaterThan(80);
      expect(content.contactLine.length, `${domain} contactLine`).toBeGreaterThan(5);
      expect(content.hoursLine.length, `${domain} hoursLine`).toBeGreaterThan(5);
      expect(content.taglineImagery.length, `${domain} imagery`).toBeGreaterThanOrEqual(8);
      expect(content.taglinePromises.length, `${domain} promises`).toBeGreaterThanOrEqual(6);
    }
  });

  it('feature copy runs two sentences with concrete detail', () => {
    for (const domain of ALL_DOMAINS) {
      const content = contentFor(domain, createRng(`feat-${domain}`));
      for (const idea of content.featureIdeas) {
        const sentences = idea.text.split(/[.!?]\s|[.!?]$/).filter((part) => part.trim().length > 0);
        expect(sentences.length, `${domain}: ${idea.title}`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('8 seeds × one prompt → at least 6 unique composed taglines', () => {
    const prompt = 'a landing page for a coffee shop';
    const taglines = new Set(
      ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8'].map(
        (seed) => parsePrompt(prompt, seed).tagline,
      ),
    );
    expect(taglines.size).toBeGreaterThanOrEqual(6);
    for (const tagline of taglines) {
      expect(tagline).not.toContain('A fresh take on');
    }
  });

  it('logo wordmarks land in the rendered stats section', () => {
    const spec = parsePrompt('a landing page for a coffee shop', 'logo-1');
    expect(spec.sections).toContain('stats');
    const html = fileContents(generateFiles(spec), 'index.html');
    const pool = contentFor('food', createRng('x')).logoNames;
    const rendered = [...html.matchAll(/<li class="wordmark">([^<]+)<\/li>/g)].map((m) => m[1]);
    expect(rendered.length).toBe(6);
    for (const mark of rendered) {
      expect(pool).toContain(mark?.replaceAll('&amp;', '&'));
    }
  });
});

/* ------------------------------------------------------------------ */
/* Sub-topic flavors: one voice per project                            */
/* ------------------------------------------------------------------ */

const COFFEE_PROMPT = 'a landing page for a specialty coffee roastery';
/** Pinned seeds whose taglines pairwise share no 4-word stem. */
const COFFEE_SEEDS = ['cf-1', 'cf-2', 'cf-4'] as const;
const BAKERY_MARKERS = /bread|bake|crust|crumb/i;
const COFFEE_MARKERS = /espresso|crema|barista|roaster/i;

/** All 4-word windows of a text, lowercased and stripped of punctuation. */
function shingles(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 0);
  const set = new Set<string>();
  for (let i = 0; i + 4 <= words.length; i++) {
    set.add(words.slice(i, i + 4).join(' '));
  }
  return set;
}

describe('sub-topic flavors — voice coherence', () => {
  it.each(COFFEE_SEEDS)('coffee roastery seed %s renders zero bakery voice', (seed) => {
    const spec = parsePrompt(COFFEE_PROMPT, seed);
    expect(spec.topic).toBe('food');
    // The flavor must be recoverable from the spec alone at regen time.
    expect(flavorFor(spec)).toBe('coffee');

    const html = fileContents(generateFiles(spec), 'index.html');
    const h1 = /<h1>([\s\S]*?)<\/h1>/.exec(html)?.[1] ?? '';
    const eyebrows = [...html.matchAll(/class="eyebrow">([^<]*)</g)].map((m) => m[1] ?? '');
    const stats = [...html.matchAll(/class="stat-(?:value|label)"[^>]*>([^<]*)</g)].map(
      (m) => m[1] ?? '',
    );
    expect(h1.length).toBeGreaterThan(0);
    expect(eyebrows.length).toBeGreaterThan(0);
    expect(stats.length).toBeGreaterThan(0);
    for (const text of [h1, ...eyebrows, ...stats]) {
      expect(text, `"${text}" leaked a bakery marker`).not.toMatch(BAKERY_MARKERS);
    }
    // The whole page speaks with one voice, not just the headline strings.
    expect(html).not.toMatch(BAKERY_MARKERS);
  });

  it('three coffee seeds share no 4-word tagline stem and never echo the prompt', () => {
    const taglines = COFFEE_SEEDS.map((seed) => parsePrompt(COFFEE_PROMPT, seed).tagline);
    for (const tagline of taglines) {
      expect(tagline.toLowerCase()).not.toContain('specialty coffee roastery');
      expect(tagline).not.toMatch(BAKERY_MARKERS);
    }
    for (let i = 0; i < taglines.length; i++) {
      for (let j = i + 1; j < taglines.length; j++) {
        const shared = [...shingles(taglines[i] ?? '')].filter((s) =>
          shingles(taglines[j] ?? '').has(s),
        );
        expect(shared, `"${taglines[i]}" vs "${taglines[j]}"`).toEqual([]);
      }
    }
  });

  it('a bakery prompt gets the bakery voice with no espresso markers', () => {
    const spec = parsePrompt('a landing page for a neighborhood bakery', 'bk-1');
    expect(spec.topic).toBe('food');
    expect(flavorFor(spec)).toBe('bakery');
    expect(`${spec.name} ${spec.tagline}`).toMatch(
      /bread|bake|crust|crumb|flour|croissant|sourdough|loaf|loaves|pastr|prov|laminat|oven/i,
    );
    const html = fileContents(generateFiles(spec), 'index.html');
    expect(html).not.toMatch(COFFEE_MARKERS);
  });

  it('food FAQ is concrete — no SaaS phrasing, at least one domain word', () => {
    for (const seed of COFFEE_SEEDS) {
      const html = fileContents(generateFiles(parsePrompt(COFFEE_PROMPT, seed)), 'index.html');
      const faq = /<section[^>]*id="faq"[\s\S]*?<\/section>/.exec(html)?.[0] ?? '';
      expect(faq.length).toBeGreaterThan(0);
      expect(faq).not.toMatch(/\bplans?\b|\bsetup\b|data portable/i);
      expect(faq).toMatch(/coffee|roast|bean|brew|grind|bag|farm|deliver|ingredient|cupping/i);
      // At most one universal Q&A rides along with the domain pool.
      const universalHits = UNIVERSAL_FAQ.filter((entry) => faq.includes(entry.q)).length;
      expect(universalHits).toBeLessThanOrEqual(1);
    }
  });

  it('food testimonials speak the domain and never say "toolkit"', () => {
    for (const seed of COFFEE_SEEDS) {
      const spec = parsePrompt(COFFEE_PROMPT, seed);
      const html = fileContents(generateFiles(spec), 'index.html');
      expect(html).not.toContain('toolkit');
      const section = /<section[^>]*id="testimonials"[\s\S]*?<\/section>/.exec(html)?.[0] ?? '';
      expect(section.length).toBeGreaterThan(0);
      // Quotes reference domain-concrete things and weave the brand name in.
      expect(section).toMatch(/coffee|roast|crema|espresso|pour-over|blend|bag|cups?/i);
      expect(section).toContain(spec.name);
    }
  });

  it('two menu props on one landing render different items', () => {
    const spec = parsePrompt(COFFEE_PROMPT, 'cf-1');
    expect(spec.sections).toContain('about');
    const html = fileContents(generateFiles(spec), 'index.html');
    const menus = [...html.matchAll(/<ul class="hp-menu-list">([\s\S]*?)<\/ul>/g)].map(
      (m) => m[1] ?? '',
    );
    expect(menus.length).toBeGreaterThanOrEqual(2);
    expect(menus[0]).not.toBe(menus[1]);
  });

  it('podcast and yoga prompts land their own voices, not a sibling voice', () => {
    const pod = parsePrompt('a landing page for my true crime podcast', 'pd-1');
    expect(pod.topic).toBe('music');
    expect(flavorFor(pod)).toBe('podcast');
    const podHtml = fileContents(generateFiles(pod), 'index.html');
    const podHero = /<section[^>]*id="hero"[\s\S]*?<\/section>/.exec(podHtml)?.[0] ?? '';
    expect(podHero.length).toBeGreaterThan(0);
    expect(podHero).not.toMatch(/vinyl|setlist|encore|\bamps?\b|mastering/i);

    const yoga = parsePrompt('a landing page for a yoga studio', 'yg-1');
    expect(yoga.topic).toBe('fitness');
    expect(flavorFor(yoga)).toBe('yoga');
    const yogaHtml = fileContents(generateFiles(yoga), 'index.html');
    const yogaHero = /<section[^>]*id="hero"[\s\S]*?<\/section>/.exec(yogaHtml)?.[0] ?? '';
    expect(yogaHero.length).toBeGreaterThan(0);
    expect(yogaHero).not.toMatch(/barbell|deadlift|squat|marathon|\breps?\b/i);
  });

  it('every flavored tagline stem recovers its own flavor at detection time', () => {
    // The determinism invariant: a tagline composed from a voice's pools
    // must always re-detect that voice from the spec alone.
    const domains = Object.entries(DOMAIN_FLAVORS) as Array<
      [TopicDomain, readonly TopicFlavor[] | undefined]
    >;
    expect(domains.length).toBeGreaterThanOrEqual(3);
    for (const [topic, flavors] of domains) {
      for (const flavor of flavors ?? []) {
        const pools = contentFor(topic, createRng(`stems-${topic}-${flavor}`), flavor);
        expect(pools.taglineImagery.length, `${topic}/${flavor} stems`).toBeGreaterThanOrEqual(8);
        expect(pools.taglinePromises.length, `${topic}/${flavor} promises`).toBeGreaterThanOrEqual(6);
        for (const imagery of pools.taglineImagery) {
          for (const promise of pools.taglinePromises) {
            expect(
              detectFlavor(topic, `${imagery}, ${promise}.`),
              `${topic}/${flavor}: "${imagery}" + "${promise}"`,
            ).toBe(flavor);
          }
        }
      }
    }
  });

  it('generation stays deterministic and flavor-stable across repeated regens', () => {
    const prompts = [
      COFFEE_PROMPT,
      'a landing page for a neighborhood bakery',
      'a landing page for my true crime podcast',
      'a landing page for a run club',
    ];
    for (const prompt of prompts) {
      const spec = parsePrompt(prompt, 'regen-1');
      const roundTripped = JSON.parse(JSON.stringify(spec)) as ProjectSpec;
      expect(flavorFor(roundTripped)).toBe(flavorFor(spec));
      expect(JSON.stringify(generateFiles(spec))).toBe(JSON.stringify(generateFiles(roundTripped)));
    }
  });
});

describe('templateLabel', () => {
  it('exposes human labels', () => {
    expect(templateLabel('habit')).toBe('Habit tracker');
    expect(engine.templateLabel('kanban')).toBe('Kanban board');
    for (const template of ALL_TEMPLATES) {
      expect(templateLabel(template)).toMatch(/^[A-Z]/);
    }
  });
});
