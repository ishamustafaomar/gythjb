/**
 * Portfolio template — a filterable lightbox gallery (category chips over
 * seeded art tiles, one wide hero-prop tile mixed in), an about section
 * pairing the domain's longAbout with animated stat counters, shared
 * testimonials, and a client-side-validated contact form.
 */
import { createRng } from '@/lib/seeded';
import type { ProjectSpec } from '../../types';
import { heroProp, productArt } from '../art';
import { contentFor, type TopicContent } from '../content';
import {
  baseCss,
  counterParts,
  cssVariables,
  esc,
  pageSectionsCss,
  pageSectionsJs,
  renderFooter,
  renderHeader,
  renderSection,
  sectionNavLinks,
  sectionTone,
  type TemplateOutput,
} from '../shared';
import { LIGHTBOX_JS, lightboxCss, lightboxHtml } from './landing';

const WORK_KINDS = ['Series', 'Case study', 'Commission', 'Study'] as const;

/** Data attributes wiring one stat value into the runtime counter. */
function countAttrs(value: string): string {
  const parts = counterParts(value);
  if (parts === null) return '';
  const bits = [`data-count-to="${parts.target}"`];
  if (parts.decimals > 0) bits.push(`data-count-decimals="${parts.decimals}"`);
  if (parts.group) bits.push('data-count-group="1"');
  if (parts.prefix.length > 0) bits.push(`data-count-prefix="${esc(parts.prefix)}"`);
  if (parts.suffix.length > 0) bits.push(`data-count-suffix="${esc(parts.suffix)}"`);
  return ` ${bits.join(' ')}`;
}

interface GalleryTile {
  html: string;
  category: string;
}

function artTile(spec: ProjectSpec, content: TopicContent, i: number): GalleryTile {
  const title = content.galleryProjects[i % content.galleryProjects.length] ?? 'Untitled study';
  const category = WORK_KINDS[i % WORK_KINDS.length] ?? 'Study';
  const art = productArt(createRng(`${spec.seed}:product-art:${i}`), spec.topic, i);
  return {
    category,
    html: `        <figure class="tile" data-category="${esc(category)}" data-reveal data-reveal-delay="${(i % 3) * 90}">
          <button class="tile-view" type="button" data-lightbox data-caption="${esc(title)}" data-kind="${esc(category)}" aria-haspopup="dialog" aria-label="View ${esc(title)} full screen">
            <span class="tile-art" aria-hidden="true">${art.html}</span>
          </button>
          <figcaption>
            <strong>${esc(title)}</strong>
            <span>${esc(category)}</span>
          </figcaption>
        </figure>`,
  };
}

/** One wide tile carrying the topic's hero prop, mixed into the grid. */
function propTile(spec: ProjectSpec, content: TopicContent): GalleryTile {
  const rng = createRng(`${spec.seed}:portfolio-prop-copy`);
  const title = rng.pick(['On the bench right now', 'Work in progress', 'From the studio table']);
  const category = 'In progress';
  const prop = heroProp(spec, createRng(`${spec.seed}:hero-prop`), content);
  return {
    category,
    html: `        <figure class="tile tile-wide" data-category="${esc(category)}" data-reveal>
          <button class="tile-view" type="button" data-lightbox data-caption="${esc(title)}" data-kind="${esc(category)}" aria-haspopup="dialog" aria-label="View ${esc(title)} full screen">
            <span class="tile-art tile-art-prop" aria-hidden="true">${prop.html}</span>
          </button>
          <figcaption>
            <strong>${esc(title)}</strong>
            <span>${esc(category)}</span>
          </figcaption>
        </figure>`,
  };
}

function renderFilterGallery(spec: ProjectSpec, content: TopicContent): string {
  const rng = createRng(`${spec.seed}:portfolio-gallery`);
  const eyebrow = rng.pick(['Selected work', 'The archive', 'Portfolio']);
  const heading = rng.pick(['Work worth signing', 'Selected projects', 'The last few seasons']);
  const lede = rng.pick([
    'Filter by kind, or click any piece to see it big.',
    'Six projects and one bench shot — tap a tile to zoom.',
  ]);

  const tiles: GalleryTile[] = [];
  for (let i = 0; i < 6; i++) tiles.push(artTile(spec, content, i));
  tiles.splice(rng.int(1, 5), 0, propTile(spec, content));

  const categories = [...new Set(tiles.map((tile) => tile.category))];
  const chips = ['All work', ...categories]
    .map((label, index) => {
      const value = index === 0 ? 'all' : label;
      return `        <button class="chip${index === 0 ? ' is-active' : ''}" type="button" data-filter="${esc(value)}" aria-pressed="${index === 0 ? 'true' : 'false'}">${esc(label)}</button>`;
    })
    .join('\n');

  const tone = sectionTone(spec, 'gallery');
  const toneCls = tone === 'plain' ? '' : ` tone-${tone}`;
  return `  <section class="section${toneCls} gallery gallery-filter" id="gallery">
    <div class="container">
      <div class="section-head" data-reveal>
        <span class="eyebrow">${esc(eyebrow)}</span>
        <h2>${esc(heading)}</h2>
        <p class="lede">${esc(lede)}</p>
      </div>
      <div class="chip-row" role="group" aria-label="Filter the gallery">
${chips}
      </div>
      <div class="gallery-grid grid cols-3" id="work-grid">
${tiles.map((tile) => tile.html).join('\n')}
      </div>
    </div>
  </section>`;
}

/** About: longAbout prose beside a column of animated stat counters. */
function renderStudioAbout(spec: ProjectSpec, content: TopicContent): string {
  const rng = createRng(`${spec.seed}:portfolio-about`);
  const eyebrow = rng.pick(['About the studio', 'Behind the work', 'The long version']);
  const heading = rng.pick(['A little background', 'How this studio works', 'The story so far']);
  const second = rng.pick([
    'Most engagements start small — one brief, honestly scoped — and grow from there.',
    'The habit that holds it all together: show the work early, edit hard, ship proud.',
    'New commissions open a few times a year; the waitlist is short but real.',
  ]);
  const stats = content.stats
    .slice(0, 3)
    .map(
      (stat, i) => `          <div class="studio-stat" data-reveal data-reveal-delay="${i * 80}">
            <span class="stat-value"${countAttrs(stat.value)}>${esc(stat.value)}</span>
            <span class="stat-label">${esc(stat.label)}</span>
          </div>`,
    )
    .join('\n');

  const tone = sectionTone(spec, 'about');
  const toneCls = tone === 'plain' ? '' : ` tone-${tone}`;
  return `  <section class="section${toneCls} about about-studio" id="about">
    <div class="container about-studio-grid">
      <div class="about-studio-copy" data-reveal>
        <span class="eyebrow">${esc(eyebrow)}</span>
        <h2>${esc(heading)}</h2>
        <p>${esc(content.longAbout)}</p>
        <p>${esc(second)}</p>
      </div>
      <div class="about-studio-stats" aria-label="Studio in numbers">
${stats}
      </div>
    </div>
  </section>`;
}

function portfolioCss(spec: ProjectSpec): string {
  const brutal = spec.style.archetype === 'brutalist';
  const chipBorder = brutal ? '2px solid var(--text)' : '1px solid var(--border)';
  return `/* Portfolio extras */
.chip-row { display: flex; flex-wrap: wrap; gap: 0.45rem; margin-bottom: 1.5rem; }
.chip { border: ${chipBorder}; background: var(--surface); color: var(--muted); border-radius: var(--radius-btn); padding: 0.3rem 0.9rem; cursor: pointer; font: inherit; font-size: 0.88rem; font-weight: 600; }
.chip:hover { border-color: var(--primary); color: var(--primary); }
.chip.is-active { background: var(--primary); border-color: var(--primary); color: var(--primary-contrast); }
.tile-wide { grid-column: span 2; }
.tile-art-prop { display: grid; place-items: center; aspect-ratio: auto; min-height: 15rem; background: var(--surface-alt); padding: 1.5rem; }
.tile-art-prop .hp { width: min(24rem, 100%); }
@media (max-width: 700px) { .tile-wide { grid-column: auto; } }
.about-studio-grid { display: grid; gap: 3rem; grid-template-columns: 1.5fr 1fr; align-items: start; }
.about-studio-copy p { color: var(--muted); margin-top: 0.85rem; }
.about-studio-stats { display: grid; gap: 1.25rem; align-content: start; }
.studio-stat { display: grid; gap: 0.15rem; padding-left: 1.25rem; border-left: ${brutal ? '3px solid var(--text)' : '1px solid var(--border)'}; }
@media (max-width: 760px) { .about-studio-grid { grid-template-columns: 1fr; } }`;
}

const FILTER_JS = `(function () {
  'use strict';

  // Category chips: show only the tiles whose kind matches.
  var chips = Array.prototype.slice.call(document.querySelectorAll('[data-filter]'));
  var tiles = Array.prototype.slice.call(document.querySelectorAll('#work-grid .tile'));
  if (chips.length === 0 || tiles.length === 0) return;

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var value = chip.getAttribute('data-filter') || 'all';
      chips.forEach(function (other) {
        var active = other === chip;
        other.classList.toggle('is-active', active);
        other.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      tiles.forEach(function (tile) {
        tile.hidden = value !== 'all' && tile.getAttribute('data-category') !== value;
      });
    });
  });
})();`;

export function renderPortfolio(spec: ProjectSpec): TemplateOutput {
  const content = contentFor(spec.topic, createRng(`${spec.seed}:content`));
  const hasGallery = spec.sections.includes('gallery');

  const sections = spec.sections.map((section) => {
    if (section === 'gallery') return renderFilterGallery(spec, content);
    if (section === 'about') return renderStudioAbout(spec, content);
    return renderSection(section, spec, content);
  });

  const body = [
    renderHeader(spec, sectionNavLinks(spec)),
    '  <main id="main">',
    ...sections,
    '  </main>',
    ...(hasGallery ? [lightboxHtml()] : []),
    renderFooter(spec),
  ].join('\n');

  // pageSectionsCss already emits the gallery product-art swatches; the
  // hero prop's CSS ships with it only for split heroes, so add it here
  // whenever the wide tile needs it.
  const propCss =
    hasGallery && spec.style.hero !== 'split'
      ? heroProp(spec, createRng(`${spec.seed}:hero-prop`), content).css
      : '';

  const css = [
    cssVariables(spec),
    baseCss(spec),
    pageSectionsCss(spec),
    portfolioCss(spec),
    ...(hasGallery ? [lightboxCss(spec)] : []),
    ...(propCss.length > 0 ? [`/* Wide-tile prop */\n${propCss}`] : []),
  ].join('\n\n');

  const js = [
    pageSectionsJs(spec),
    ...(hasGallery ? [FILTER_JS, LIGHTBOX_JS] : []),
  ].join('\n');

  return { body, css, js };
}
