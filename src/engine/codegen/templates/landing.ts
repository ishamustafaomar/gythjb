/**
 * Landing page template — the full marketing experience. A sticky anchor
 * nav with a hamburger, one of four hero layouts, then every section the
 * spec asks for: features with icons, split-row about, stats with animated
 * counters and a logo strip, testimonials, pricing, a click-to-zoom
 * lightbox gallery, FAQ, newsletter/contact and the dark-inverted CTA —
 * all reveal-choreographed and drawn from the topic content pools.
 */
import { createRng } from '@/lib/seeded';
import type { ProjectSpec } from '../../types';
import { productArt } from '../art';
import { contentFor, flavorFor, type TopicContent } from '../content';
import { icon } from '../icons';
import {
  baseCss,
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

const TILE_KINDS = ['Series', 'Case study', 'Commission', 'Study'] as const;

/**
 * Gallery with a lightbox: six seeded art tiles, each a button that opens
 * a full-screen figure with its caption. Escape or any click closes.
 */
function renderLightboxGallery(spec: ProjectSpec, content: TopicContent): string {
  const rng = createRng(`${spec.seed}:landing-gallery`);
  const eyebrow = rng.pick(['The archive', 'Selected pieces', 'On the wall', 'Recent output']);
  const heading = rng.pick(['Recent work', 'Selected projects', 'From the archive']);
  const lede = rng.pick([
    'Click any piece to see it at full size.',
    'A rotating wall of favorites — tap a tile to look closer.',
  ]);

  const tiles: string[] = [];
  for (let i = 0; i < 6; i++) {
    const title = content.galleryProjects[i % content.galleryProjects.length] ?? 'Untitled study';
    const kind = TILE_KINDS[i % TILE_KINDS.length] ?? 'Study';
    const art = productArt(createRng(`${spec.seed}:product-art:${i}`), spec.topic, i);
    tiles.push(`        <figure class="tile" data-reveal data-reveal-delay="${(i % 3) * 90}">
          <button class="tile-view" type="button" data-lightbox data-caption="${esc(title)}" data-kind="${esc(kind)}" aria-haspopup="dialog" aria-label="View ${esc(title)} full screen">
            <span class="tile-art" aria-hidden="true">${art.html}</span>
          </button>
          <figcaption>
            <strong>${esc(title)}</strong>
            <span>${esc(kind)}</span>
          </figcaption>
        </figure>`);
  }

  const tone = sectionTone(spec, 'gallery');
  const toneCls = tone === 'plain' ? '' : ` tone-${tone}`;
  return `  <section class="section${toneCls} gallery gallery-lightbox" id="gallery">
    <div class="container">
      <div class="section-head" data-reveal>
        <span class="eyebrow">${esc(eyebrow)}</span>
        <h2>${esc(heading)}</h2>
        <p class="lede">${esc(lede)}</p>
      </div>
      <div class="gallery-grid grid cols-3">
${tiles.join('\n')}
      </div>
    </div>
  </section>`;
}

export function lightboxHtml(): string {
  return `  <div class="lightbox" id="lightbox" role="dialog" aria-modal="true" aria-label="Full-screen preview" hidden>
    <button class="lightbox-close" type="button" data-lightbox-close aria-label="Close preview">${icon('close')}</button>
    <figure class="lightbox-figure">
      <span class="lightbox-art" id="lightbox-art" aria-hidden="true"></span>
      <figcaption><strong id="lightbox-caption"></strong><span id="lightbox-kind"></span></figcaption>
    </figure>
  </div>`;
}

export function lightboxCss(spec: ProjectSpec): string {
  const brutal = spec.style.archetype === 'brutalist';
  return `/* Gallery lightbox */
.tile-view { display: block; width: 100%; padding: 0; border: 0; background: transparent; cursor: zoom-in; text-align: inherit; color: inherit; }
.tile-view .tile-art { display: block; }
.lightbox { position: fixed; inset: 0; z-index: 140; display: grid; place-items: center; padding: clamp(1rem, 4vw, 3rem); background: rgba(9, 11, 16, 0.84); }
.lightbox[hidden] { display: none; }
.lightbox-figure { width: min(52rem, 100%); margin: 0; display: grid; gap: 0.9rem; }
.lightbox-art { display: grid; place-items: center; aspect-ratio: 4 / 3; border-radius: var(--radius-lg); overflow: hidden; background: var(--bg);${brutal ? ' border: 3px solid #FFFFFF;' : ''} }
.lightbox-art .product-art { width: 100%; height: 100%; }
.lightbox-art .hp { width: min(26rem, 86%); }
.lightbox-figure figcaption { display: flex; justify-content: space-between; align-items: baseline; gap: 1rem; color: #F2F4FA; font-weight: 600; }
.lightbox-figure figcaption span { color: #A9B1C3; font-weight: 400; font-size: 0.9rem; }
.lightbox-close { position: absolute; top: 1.1rem; right: 1.1rem; width: 2.75rem; height: 2.75rem; display: grid; place-items: center; border: 1px solid rgba(255, 255, 255, 0.4); border-radius: var(--radius-round); background: transparent; color: #FFFFFF; cursor: pointer; }
.lightbox-close svg { width: 1.2rem; height: 1.2rem; }
.lightbox-close:hover { background: rgba(255, 255, 255, 0.14); }
html.has-lightbox { overflow: hidden; }
@media (prefers-reduced-motion: no-preference) {
  @keyframes lightbox-in { from { opacity: 0; } to { opacity: 1; } }
  .lightbox { animation: lightbox-in 0.2s ease; }
}`;
}

/** Defensive, dependency-free lightbox behavior (clone art node, focus, Escape). */
export const LIGHTBOX_JS = `(function () {
  'use strict';

  // Lightbox: click a tile, see it full screen. Escape or any click closes.
  var lightbox = document.getElementById('lightbox');
  var artHost = document.getElementById('lightbox-art');
  var captionEl = document.getElementById('lightbox-caption');
  var kindEl = document.getElementById('lightbox-kind');
  if (!lightbox || !artHost) return;
  var lastTrigger = null;

  function openLightbox(trigger) {
    var art = trigger.querySelector('.tile-art');
    artHost.textContent = '';
    if (art) {
      Array.prototype.forEach.call(art.children, function (child) {
        artHost.appendChild(child.cloneNode(true));
      });
    }
    if (captionEl) captionEl.textContent = trigger.getAttribute('data-caption') || '';
    if (kindEl) kindEl.textContent = trigger.getAttribute('data-kind') || '';
    lightbox.hidden = false;
    document.documentElement.classList.add('has-lightbox');
    lastTrigger = trigger;
    var closeButton = lightbox.querySelector('[data-lightbox-close]');
    if (closeButton && typeof closeButton.focus === 'function') closeButton.focus();
  }

  function closeLightbox() {
    if (lightbox.hidden) return;
    lightbox.hidden = true;
    document.documentElement.classList.remove('has-lightbox');
    if (lastTrigger && typeof lastTrigger.focus === 'function') lastTrigger.focus();
    lastTrigger = null;
  }

  document.querySelectorAll('[data-lightbox]').forEach(function (trigger) {
    trigger.addEventListener('click', function () { openLightbox(trigger); });
  });
  lightbox.addEventListener('click', closeLightbox);
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeLightbox();
  });
})();`;

export function renderLanding(spec: ProjectSpec): TemplateOutput {
  // Flavor-aware pools: one sub-topic voice per project (see flavorFor),
  // recovered deterministically from the spec on every regeneration.
  const content = contentFor(spec.topic, createRng(`${spec.seed}:content`), flavorFor(spec));
  const hasGallery = spec.sections.includes('gallery');

  // The landing nav is the spine of the page: always sticky, even when the
  // prompt never says so, so section anchors stay reachable mid-scroll.
  const headerSpec: ProjectSpec = spec.features.includes('sticky-header')
    ? spec
    : { ...spec, features: [...spec.features, 'sticky-header'] };

  const action = spec.sections.includes('cta')
    ? '<a class="btn btn-primary" href="#cta">Get started</a>'
    : '';

  const sections = spec.sections.map((section) =>
    section === 'gallery'
      ? renderLightboxGallery(spec, content)
      : renderSection(section, spec, content),
  );

  const body = [
    renderHeader(headerSpec, sectionNavLinks(spec), action),
    '  <main id="main">',
    ...sections,
    '  </main>',
    ...(hasGallery ? [lightboxHtml()] : []),
    renderFooter(spec),
  ].join('\n');

  const css = [
    cssVariables(spec),
    baseCss(spec),
    pageSectionsCss(spec),
    ...(hasGallery ? [lightboxCss(spec)] : []),
  ].join('\n\n');

  const js = hasGallery ? `${pageSectionsJs(spec)}\n${LIGHTBOX_JS}` : pageSectionsJs(spec);

  return { body, css, js };
}
