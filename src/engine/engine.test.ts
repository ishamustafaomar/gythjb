import { describe, expect, it } from 'vitest';
import { engine, templateLabel } from './index';
import { parsePrompt } from './parse';
import { applyEdits, parseEdit } from './edits';
import { generateFiles } from './codegen';
import { diffFileSystems } from './diff';
import type { ProjectSpec, TemplateId, VirtualFileSystem } from './types';

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

  it('uses per-template default sections', () => {
    expect(specFromPrompt('a landing page').sections).toEqual([
      'hero', 'features', 'testimonials', 'cta',
    ]);
    expect(specFromPrompt('a pricing page').sections).toEqual([
      'hero', 'pricing', 'faq', 'cta',
    ]);
    expect(specFromPrompt('a portfolio of my work').sections).toEqual([
      'hero', 'gallery', 'about', 'contact',
    ]);
    expect(specFromPrompt('a simple todo list app').sections).toEqual([]);
  });

  it('adds mentioned sections in canonical order', () => {
    const spec = specFromPrompt('a landing page with pricing and a faq');
    expect(spec.sections).toEqual([
      'hero', 'features', 'testimonials', 'pricing', 'faq', 'cta',
    ]);
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
    const reply = engine.applyMessage({ spec: project.spec, message: 'make it teal', seed: 'p3:1' });
    expect(reply.kind).toBe('generation');
    if (reply.kind !== 'generation') return;
    expect(reply.spec.seed).toBe(project.spec.seed);
    expect(reply.spec.name).toBe('Drift');
    expect(reply.spec.palette.primary).toBe('#0D9488');
    expect(reply.summary).toMatch(/teal/i);

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

describe('templateLabel', () => {
  it('exposes human labels', () => {
    expect(templateLabel('habit')).toBe('Habit tracker');
    expect(engine.templateLabel('kanban')).toBe('Kanban board');
    for (const template of ALL_TEMPLATES) {
      expect(templateLabel(template)).toMatch(/^[A-Z]/);
    }
  });
});
