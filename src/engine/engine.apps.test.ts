/**
 * App-template suite — covers the six rebuilt application templates
 * (dashboard, todo, habit, kanban, notes, chat): compilation, signature
 * interactive hooks, topic-aware content, archetype chrome, determinism
 * and generated-JS hygiene.
 */
import { describe, expect, it } from 'vitest';
import { engine } from './index';
import { generateFiles } from './codegen';
import type { ProjectSpec, TemplateId, VirtualFileSystem } from './types';

const APP_TEMPLATES = ['dashboard', 'todo', 'habit', 'kanban', 'notes', 'chat'] as const;
type AppTemplate = (typeof APP_TEMPLATES)[number];

function makeSpec(template: TemplateId, overrides: Partial<ProjectSpec> = {}): ProjectSpec {
  return {
    template,
    name: 'Fieldbook',
    tagline: 'A calm little workspace for busy weeks.',
    palette: { primary: '#7A5AF8', accent: '#22D3EE', mode: 'light' },
    radius: 'rounded',
    font: 'sans',
    style: { archetype: 'minimal', hero: 'centered' },
    topic: 'tech',
    sections: [],
    features: [],
    seed: 'apps-test-seed',
    ...overrides,
  };
}

function fileContents(files: VirtualFileSystem, path: string): string {
  const file = files.find((candidate) => candidate.path === path);
  expect(file, `expected ${path} to exist`).toBeDefined();
  return file?.contents ?? '';
}

function htmlOf(spec: ProjectSpec): string {
  return fileContents(generateFiles(spec), 'index.html');
}
function cssOf(spec: ProjectSpec): string {
  return fileContents(generateFiles(spec), 'css/styles.css');
}
function jsOf(spec: ProjectSpec): string {
  return fileContents(generateFiles(spec), 'js/app.js');
}

/** One signature interactive hook the compiled preview must carry. */
const APP_HOOKS: Record<AppTemplate, string> = {
  dashboard: 'data-range="30d"',
  todo: 'data-group="today"',
  habit: 'heat-cell',
  kanban: 'id="card-modal"',
  notes: 'id="tag-row"',
  chat: 'id="thread-list"',
};

describe('app templates — shared invariants', () => {
  it.each(APP_TEMPLATES)('%s compiles a self-contained preview with its signature hook', (template) => {
    const compiled = engine.compilePreview(generateFiles(makeSpec(template)));
    expect(compiled).toContain('<style>');
    expect(compiled).toContain('<script>');
    expect(compiled).toContain(APP_HOOKS[template]);
  });

  it.each(APP_TEMPLATES)('%s is fully deterministic for identical specs', (template) => {
    const a = generateFiles(makeSpec(template));
    const b = generateFiles(makeSpec(template));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it.each(APP_TEMPLATES)('%s generated JS is defensive, silent and offline', (template) => {
    const js = jsOf(makeSpec(template));
    expect(js).toContain("'use strict'");
    expect(js).not.toContain('console.');
    expect(js).not.toContain('Math.random');
    expect(js).not.toContain('Date.now');
    expect(js).not.toContain('fetch(');
    expect(js).not.toContain('XMLHttpRequest');
  });

  it.each(APP_TEMPLATES)('%s guards any CSS animation behind reduced motion', (template) => {
    const css = cssOf(makeSpec(template));
    if (/@keyframes|animation:/.test(css)) {
      expect(css).toContain('prefers-reduced-motion');
    }
  });

  it('persisting templates use distinct storage keys', () => {
    const persisting: readonly AppTemplate[] = ['todo', 'habit', 'kanban', 'notes', 'chat'];
    const keys = persisting.map((template) => {
      const js = jsOf(makeSpec(template));
      const match = /var STORAGE_KEY = '([^']+)'/.exec(js);
      expect(match, `${template} storage key`).not.toBeNull();
      return match?.[1] ?? '';
    });
    expect(new Set(keys).size).toBe(persisting.length);
    for (const key of keys) expect(key).toMatch(/^promptly:/);
  });
});

describe('dashboard template', () => {
  const spec = makeSpec('dashboard');
  const html = htmlOf(spec);
  const js = jsOf(spec);

  it('renders KPI sparklines, delta pills, a conic donut and goal rings', () => {
    expect(html).toContain('class="spark"');
    expect(html).toContain('delta-pill');
    expect(html).toContain('conic-gradient');
    expect(html).toContain('donut-legend');
    expect(html).toContain('goal-ring');
    expect(html).toContain('status-pill');
  });

  it('ships three seeded datasets switched by date-range chips', () => {
    for (const range of ['7d', '30d', '90d']) {
      expect(html).toContain(`data-range="${range}"`);
      expect(js).toContain(`"${range}"`);
    }
    expect(js).toContain('var DATASETS =');
    expect(js).toContain('renderAll()');
  });

  it('activity table carries search, per-column sort and an empty state', () => {
    expect(html).toContain('id="activity-filter"');
    expect(html).toContain('data-sort="name"');
    expect(html).toContain('data-sort="status"');
    expect(html).toContain('id="activity-empty"');
    expect(js).toContain('sortKey');
  });

  it('sidebar navigation is topic-appropriate and icon-led', () => {
    expect(html).toContain('dash-nav-icon');
    const food = htmlOf(makeSpec('dashboard', { topic: 'food' }));
    expect(food).toContain('Orders');
    expect(food).toContain('Menu');
    const tech = htmlOf(makeSpec('dashboard', { topic: 'tech' }));
    expect(tech).toContain('Deploys');
  });

  it('brutalist dashboards wear brutalist chrome', () => {
    const css = cssOf(makeSpec('dashboard', { style: { archetype: 'brutalist', hero: 'centered' } }));
    expect(css).toContain('3px solid var(--text)');
  });
});

describe('todo template', () => {
  const spec = makeSpec('todo');
  const html = htmlOf(spec);
  const js = jsOf(spec);

  it('groups tasks into Today / Later / Done with a progress ring', () => {
    for (const group of ['today', 'later', 'done']) {
      expect(html).toContain(`data-group="${group}"`);
    }
    expect(html).toContain('id="todo-ring"');
    expect(js).toContain('groupOf');
  });

  it('seeds priorities and renders due offsets as relative text', () => {
    expect(js).toContain('"priority"');
    expect(js).toContain('pill pill-');
    expect(js).toContain('Due tomorrow');
    expect(js).toContain('Overdue');
    expect(html).toContain('id="task-priority"');
  });

  it('supports drag-to-reorder constrained to a task group', () => {
    expect(js).toContain('dragstart');
    expect(js).toContain('setData');
    expect(js).toContain('groupOf(dragged) !== groupOf(task)');
  });
});

describe('habit template', () => {
  const spec = makeSpec('habit');
  const html = htmlOf(spec);
  const css = cssOf(spec);
  const js = jsOf(spec);

  it('renders a month-style heatmap with five intensity tints', () => {
    expect(js).toContain('heat-cell h');
    for (const tint of ['h0', 'h1', 'h2', 'h3', 'h4']) {
      expect(css).toContain(`.heat-cell.${tint}`);
    }
    expect(js).toContain('GRID_DAYS = 35');
  });

  it('tracks current and best streaks with a flame glyph', () => {
    expect(js).toContain('currentStreak');
    expect(js).toContain('bestStreak');
    expect(js).toContain('var FLAME =');
    expect(css).toContain('.streak-chip .flame');
  });

  it('summarizes the week in bars and supports archive/restore', () => {
    expect(html).toContain('id="week-summary"');
    expect(html).toContain('id="archived-toggle"');
    expect(js).toContain('archived');
    expect(js).toContain('Restore');
  });
});

describe('kanban template', () => {
  const spec = makeSpec('kanban');
  const html = htmlOf(spec);
  const css = cssOf(spec);
  const js = jsOf(spec);

  it('opens a card edit modal with title, label and notes fields', () => {
    expect(html).toContain('id="card-modal"');
    expect(html).toContain('id="modal-title"');
    expect(html).toContain('id="modal-label"');
    expect(html).toContain('id="modal-notes"');
    expect(js).toContain('openModal');
  });

  it('wears colored label chips and WIP-aware column counts', () => {
    expect(js).toContain('label-chip');
    expect(css).toContain('.chip-0');
    expect(css).toContain('.chip-3');
    expect(js).toContain('is-over-wip');
  });

  it('keeps drag & drop and adds an add-column flow', () => {
    expect(js).toContain('dataTransfer');
    expect(js).toContain('dragover');
    expect(html).toContain('id="add-column-btn"');
    expect(js).toContain('add-column-form');
  });
});

describe('notes template', () => {
  const spec = makeSpec('notes');
  const html = htmlOf(spec);
  const js = jsOf(spec);

  it('renders the safe markdown subset in the preview pane', () => {
    expect(js).toContain('function renderMarkdown');
    expect(js).toContain('escapeHtml');
    expect(js).toContain('<strong>$1</strong>');
    expect(js).toContain('<em>$1</em>');
    expect(js).toContain('<ul>');
    expect(html).toContain('id="note-preview"');
  });

  it('ships a pinned section, tag chips and a tag filter', () => {
    expect(html).toContain('id="pinned-group"');
    expect(html).toContain('id="tag-row"');
    expect(js).toContain('"pinned"');
    expect(js).toContain('activeTag');
    expect(js).toContain('"ideas"');
  });

  it('highlights search matches without parsing note content as HTML', () => {
    expect(js).toContain("createElement('mark')");
    expect(js).toContain('appendHighlighted');
    expect(html).toContain('id="note-search"');
  });

  it('keeps the autosave indicator', () => {
    expect(js).toContain('Saving');
    expect(js).toContain('Saved');
  });
});

describe('chat template', () => {
  const spec = makeSpec('chat');
  const js = jsOf(spec);

  it('renders a conversations sidebar with unread badges and previews', () => {
    expect(js).toContain('unread-badge');
    expect(js).toContain('thread-preview');
    expect(js).toContain('thread-stamp');
  });

  it('inserts day dividers and per-message timestamps', () => {
    expect(js).toContain('day-divider');
    expect(js).toContain('msg-time');
  });

  it('replies arrive after a seeded 2–4 second typing delay', () => {
    const match = /var DELAYS = (\[[^\]]*\]);/.exec(js);
    expect(match).not.toBeNull();
    const delays = JSON.parse(match?.[1] ?? '[]') as number[];
    expect(delays.length).toBeGreaterThanOrEqual(3);
    for (const delay of delays) {
      expect(delay).toBeGreaterThanOrEqual(2000);
      expect(delay).toBeLessThanOrEqual(4000);
    }
    expect(js).toContain('typing');
  });

  it('draws contacts from the topic pool', () => {
    const foodJs = jsOf(makeSpec('chat', { topic: 'food' }));
    const present = ['Marta', 'Ben', 'Yuki', 'Dre'].filter((name) => foodJs.includes(`"${name}"`));
    expect(present.length).toBeGreaterThanOrEqual(3);
  });
});
