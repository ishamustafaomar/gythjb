/**
 * Page-template quality suite — the six PAGE templates (landing, pricing,
 * portfolio, blog, store, recipes) rebuilt to frontier quality: dense
 * art-directed markup, seeded inline SVG art, reveal choreography, working
 * view switching, and topic-true copy with zero cross-domain leaks.
 */
import { describe, expect, it } from 'vitest';
import { createRng } from '@/lib/seeded';
import { engine } from './index';
import { parsePrompt } from './parse';
import { generateFiles } from './codegen';
import { contentFor } from './codegen/content';
import type { ProjectSpec, TemplateId, VirtualFileSystem } from './types';

type PageTemplate = 'landing' | 'pricing' | 'portfolio' | 'blog' | 'store' | 'recipes';

const PAGE_PROMPTS: Record<PageTemplate, string> = {
  landing: 'a landing page for a coffee shop with a gallery and pricing',
  pricing: 'a pricing page for a saas product',
  portfolio: 'a wedding photography portfolio',
  blog: 'a blog about slow travel',
  store: 'an online store for house plants',
  recipes: 'a recipe collection for weeknight cooking',
};

const PAGE_TEMPLATES = Object.keys(PAGE_PROMPTS) as PageTemplate[];

/** Minimum <section> count per template (views count as sections). */
const MIN_SECTIONS: Record<PageTemplate, number> = {
  landing: 6,
  pricing: 4,
  portfolio: 5,
  blog: 2,
  store: 3,
  recipes: 2,
};

interface Page {
  spec: ProjectSpec;
  files: VirtualFileSystem;
  html: string;
  css: string;
  js: string;
  compiled: string;
}

function buildPage(template: PageTemplate, seed = `pages-${template}`): Page {
  const spec = parsePrompt(PAGE_PROMPTS[template], seed);
  expect(spec.template).toBe(template as TemplateId);
  const files = generateFiles(spec);
  const contents = (path: string): string =>
    files.find((file) => file.path === path)?.contents ?? '';
  return {
    spec,
    files,
    html: contents('index.html'),
    css: contents('css/styles.css'),
    js: contents('js/app.js'),
    compiled: engine.compilePreview(files),
  };
}

/* ------------------------------------------------------------------ */
/* Shared invariants across all six page templates                     */
/* ------------------------------------------------------------------ */

describe('page templates — shared invariants', () => {
  it.each(PAGE_TEMPLATES)(
    '%s compiles self-contained with inline svg, reveal hooks and the IO runtime',
    (template) => {
      const page = buildPage(template);
      expect(page.compiled).toContain('<style>');
      expect(page.compiled).not.toMatch(/<link\b[^>]*stylesheet/);
      expect(page.compiled).toContain('<svg');
      expect(page.compiled).toContain('data-reveal');
      expect(page.compiled).toContain('IntersectionObserver');
      expect(page.compiled).toContain('prefers-reduced-motion');
    },
  );

  it.each(PAGE_TEMPLATES)('%s renders its minimum section/view count', (template) => {
    const page = buildPage(template);
    const sections = page.html.match(/<section\b/g)?.length ?? 0;
    expect(sections).toBeGreaterThanOrEqual(MIN_SECTIONS[template]);
  });

  it.each(PAGE_TEMPLATES)('%s is deterministic for a fixed seed', (template) => {
    const a = generateFiles(parsePrompt(PAGE_PROMPTS[template], 'det-seed'));
    const b = generateFiles(parsePrompt(PAGE_PROMPTS[template], 'det-seed'));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  // Footer columns derive from the rendered sections; page templates with
  // fewer sections (pricing, portfolio) still link every one of them.
  const MIN_FOOTER_LINKS: Record<PageTemplate, number> = {
    landing: 6,
    pricing: 4,
    portfolio: 4,
    blog: 6,
    store: 6,
    recipes: 6,
  };

  it.each(PAGE_TEMPLATES)('%s footer carries nav columns with real anchors', (template) => {
    const page = buildPage(template);
    const footer = page.html.slice(page.html.indexOf('<footer'));
    expect(footer).toContain('footer-col');
    const anchors = footer.match(/href="#[a-z]/g)?.length ?? 0;
    expect(anchors).toBeGreaterThanOrEqual(MIN_FOOTER_LINKS[template]);
  });

  it.each(PAGE_TEMPLATES)('%s generated JS never logs to the console', (template) => {
    expect(buildPage(template).js).not.toContain('console.');
  });
});

/* ------------------------------------------------------------------ */
/* Landing                                                              */
/* ------------------------------------------------------------------ */

describe('landing template — full experience', () => {
  const page = buildPage('landing');

  it('renders the dense section flow with counters, wordmarks and the inverted CTA', () => {
    expect(page.html).toContain('id="features"');
    expect(page.html).toContain('id="stats"');
    expect(page.html).toContain('data-count-to');
    expect(page.html).toContain('class="wordmark"');
    expect(page.html).toContain('tone-invert');
    expect(page.html).toContain('id="cta"');
  });

  it('always ships a sticky header, with a hamburger whenever nav links show', () => {
    const seeds = ['nav-1', 'nav-2', 'nav-3', 'nav-4'];
    const pages = seeds.map((seed) => buildPage('landing', seed));
    for (const candidate of pages) {
      expect(candidate.html).toMatch(/class="site-header[^"]*sticky/);
    }
    const withNav = pages.filter((candidate) => candidate.html.includes('data-nav-menu'));
    expect(withNav.length).toBeGreaterThanOrEqual(1);
    for (const candidate of withNav) {
      expect(candidate.html).toContain('data-nav-toggle');
      expect(candidate.html).toContain('aria-expanded="false"');
    }
  });

  it('gallery tiles open a lightbox that closes on Escape or click', () => {
    expect(page.html).toContain('data-lightbox');
    expect(page.html).toContain('data-caption');
    expect(page.html).toContain('id="lightbox"');
    expect(page.html).toContain('data-lightbox-close');
    expect(page.js).toContain('cloneNode');
    expect(page.js).toContain("'Escape'");
    expect(page.css).toContain('.lightbox');
  });
});

/* ------------------------------------------------------------------ */
/* Pricing                                                              */
/* ------------------------------------------------------------------ */

describe('pricing template — billing toggle plans', () => {
  const page = buildPage('pricing');

  it('renders three tiers with monthly/yearly prices and a highlighted plan', () => {
    expect(page.html).toContain('data-billing="monthly"');
    expect(page.html).toContain('data-billing="yearly"');
    expect(page.html.match(/data-price-monthly=/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(page.html.match(/data-price-yearly=/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(page.html).toContain('tier-featured');
    expect(page.js).toContain('data-price-yearly');
    expect(page.js).toContain('aria-pressed');
  });

  it('yearly prices are genuinely discounted against monthly', () => {
    const pairs = [
      ...page.html.matchAll(/data-price-monthly="\$(\d+)" data-price-yearly="\$(\d+)"/g),
    ];
    expect(pairs.length).toBe(3);
    for (const [, monthly, yearly] of pairs) {
      const m = Number.parseInt(monthly ?? '0', 10);
      const y = Number.parseInt(yearly ?? '0', 10);
      expect(y).toBeLessThanOrEqual(m);
      if (m > 0) expect(y).toBeLessThan(m);
    }
  });

  it('tiers carry icon feature lists beside the comparison stats band and FAQ', () => {
    const tierList = /<ul class="tier-list">[\s\S]*?<\/ul>/.exec(page.html)?.[0] ?? '';
    expect(tierList).toContain('<svg');
    expect(tierList.match(/<li>/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(page.html).toContain('id="stats"');
    expect(page.html).toContain('id="faq"');
    expect(page.html).toContain('id="pricing"');
  });
});

/* ------------------------------------------------------------------ */
/* Portfolio                                                            */
/* ------------------------------------------------------------------ */

describe('portfolio template — filterable studio site', () => {
  const page = buildPage('portfolio');

  it('gallery mixes art tiles with a wide prop tile behind category chips and a lightbox', () => {
    expect(page.html.match(/data-filter=/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
    expect(page.html).toContain('data-filter="all"');
    expect(page.html.match(/data-category=/g)?.length ?? 0).toBeGreaterThanOrEqual(7);
    expect(page.html).toContain('tile-wide');
    expect(page.html).toContain('data-lightbox');
    expect(page.html).toContain('id="lightbox"');
    expect(page.js).toContain('data-category');
  });

  it('about section pairs the domain longAbout with animated stat counters', () => {
    expect(page.spec.topic).toBe('photography');
    expect(page.html).toContain('about-studio');
    expect(page.html).toContain('A quarter of a million frames');
    const about = page.html.slice(page.html.indexOf('about-studio'));
    expect(about).toContain('data-count-to');
  });

  it('contact block ships a client-side validated form with a success state', () => {
    expect(page.html).toContain('id="contact-form"');
    expect(page.html).toContain('data-error-for="contact-email"');
    expect(page.js).toContain("classList.toggle('invalid'");
    expect(page.js).toContain('contact-status');
  });
});

/* ------------------------------------------------------------------ */
/* Blog                                                                 */
/* ------------------------------------------------------------------ */

describe('blog template — magazine home and reading view', () => {
  const page = buildPage('blog');

  it('home shows a featured story plus an art-thumbed grid with tag filtering', () => {
    expect(page.html).toContain('id="post-list"');
    expect(page.html).toContain('feature-post');
    expect(page.html.match(/product-art/g)?.length ?? 0).toBeGreaterThanOrEqual(5);
    expect(page.html.match(/data-tag-filter=/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(page.html).toContain('min read');
    expect(page.js).toContain('data-tag-filter');
  });

  it('reading view has a progress bar, byline, prev/next links and view switching', () => {
    expect(page.html).toContain('id="post-view"');
    expect(page.html).toContain('id="read-progress-bar"');
    expect(page.html).toContain('post-nav');
    expect(page.html).toContain('id="back-to-list"');
    expect(page.html).toContain('post-byline');
    expect(page.js).toContain('scrollHeight');
    expect(page.js).toContain('openPost');
  });

  it('every story body composes 4–6 real paragraphs', () => {
    const bodies = [...page.html.matchAll(/<div class="post-body">([\s\S]*?)<\/div>/g)];
    expect(bodies.length).toBeGreaterThanOrEqual(5);
    for (const [, body] of bodies) {
      const paragraphs = body?.match(/<p>/g)?.length ?? 0;
      expect(paragraphs).toBeGreaterThanOrEqual(4);
      expect(paragraphs).toBeLessThanOrEqual(6);
    }
  });

  it('editorial archetype gets a drop cap; others do not', () => {
    const editorial = parsePrompt('an elegant magazine style blog about slow travel', 'cap-1');
    expect(editorial.style.archetype).toBe('editorial');
    const editorialCss =
      generateFiles(editorial).find((file) => file.path === 'css/styles.css')?.contents ?? '';
    expect(editorialCss).toContain('::first-letter');

    const soft = parsePrompt('a playful pastel blog about slow travel', 'cap-2');
    expect(soft.style.archetype).toBe('soft');
    const softCss =
      generateFiles(soft).find((file) => file.path === 'css/styles.css')?.contents ?? '';
    expect(softCss).not.toContain('::first-letter');
  });

  it('travel body copy never leaks other domains', () => {
    expect(page.spec.topic).toBe('travel');
    const lower = page.html.toLowerCase();
    for (const leak of ['sourdough', 'monstera', 'chickpea', 'deadlift', 'espresso']) {
      expect(lower).not.toContain(leak);
    }
  });
});

/* ------------------------------------------------------------------ */
/* Store                                                                */
/* ------------------------------------------------------------------ */

describe('store template — shop, detail view and cart', () => {
  const page = buildPage('store');

  it('shop grid has category chips, a search box and a sort select under a topic hero', () => {
    expect(page.html).toContain('id="shop-search"');
    expect(page.html).toContain('id="shop-sort"');
    expect(page.html).toContain('value="price-asc"');
    expect(page.html.match(/data-filter=/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(page.html.match(/data-product-card/g)?.length ?? 0).toBeGreaterThanOrEqual(6);

    // The hero eyebrow comes straight from the plants kicker pool.
    const kickers = contentFor('plants', createRng('any')).heroKickers;
    expect(kickers.some((kicker) => page.html.includes(kicker))).toBe(true);
  });

  it('clicking through reaches a detail view with stepper, description and related items', () => {
    expect(page.html).toContain('id="product-view"');
    expect(page.html.match(/data-open=/g)?.length ?? 0).toBeGreaterThanOrEqual(6);
    expect(page.html).toContain('data-step="-1"');
    expect(page.html).toContain('data-step="1"');
    expect(page.html).toContain('data-qty');
    expect(page.html).toContain('detail-desc');
    expect(page.html).toContain('related-row');
    expect(page.html).toContain('data-back-to-shop');
    expect(page.js).toContain('openDetail');
  });

  it('cart drawer persists to localStorage and toasts on add', () => {
    expect(page.html).toContain('id="cart-drawer"');
    expect(page.html).toContain('id="toast"');
    expect(page.js).toContain('localStorage.setItem');
    expect(page.js).toContain("promptly:");
    expect(page.js).toContain('Added ');
    expect(page.js).toContain('data-add');
    expect(page.js).toContain("'Escape'");
  });

  it('detail descriptions are two sentences composed from the topic pools', () => {
    const descriptions = [...page.html.matchAll(/<p class="detail-desc">([^<]+)<\/p>/g)];
    expect(descriptions.length).toBeGreaterThanOrEqual(6);
    for (const [, text] of descriptions) {
      const sentences = (text ?? '').split(/\.\s|\.$/).filter((part) => part.trim().length > 0);
      expect(sentences.length).toBeGreaterThanOrEqual(2);
    }
  });
});

/* ------------------------------------------------------------------ */
/* Recipes                                                              */
/* ------------------------------------------------------------------ */

describe('recipes template — cards, checklist and scaling', () => {
  const page = buildPage('recipes');

  it('cards carry seeded art with time badges behind chips and search', () => {
    expect(page.html).toContain('id="recipe-grid"');
    expect(page.html).toContain('id="recipe-search"');
    expect(page.html).toContain('time-badge');
    expect(page.html.match(/data-tag=/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(page.html.match(/product-art/g)?.length ?? 0).toBeGreaterThanOrEqual(6);
  });

  it('detail view has a persistent checklist, numbered check-off steps and a servings stepper', () => {
    expect(page.html).toContain('id="recipe-view"');
    expect(page.html.match(/data-check="recipe-\d+:ing-\d+"/g)?.length ?? 0).toBeGreaterThanOrEqual(12);
    expect(page.html.match(/data-check="recipe-\d+:step-\d+"/g)?.length ?? 0).toBeGreaterThanOrEqual(12);
    expect(page.html).toContain('step-num');
    expect(page.html).toContain('data-serves-step="1"');
    expect(page.html).toContain('data-serves-value');
    expect(page.html).toContain('data-back-to-recipes');
  });

  it('numeric ingredient quantities are wired for scaling and persistence', () => {
    expect(page.spec.topic).toBe('food');
    expect(page.html.match(/class="ing-amount" data-amount=/g)?.length ?? 0).toBeGreaterThanOrEqual(6);
    expect(page.js).toContain('localStorage.setItem');
    expect(page.js).toContain(':kitchen');
    expect(page.js).toContain('data-amount');
    expect(page.js).toContain('applyServes');
    expect(page.js).toContain('data-check');
  });
});
