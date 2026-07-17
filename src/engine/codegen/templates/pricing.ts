/**
 * Pricing page template — hero, then a billing-toggle plan grid: three
 * tiers with icon feature lists and a highlighted middle plan, monthly and
 * yearly prices swapped in place by plain JS. The comparison stats band,
 * optional testimonials, FAQ and CTA come from the shared sections.
 */
import { createRng } from '@/lib/seeded';
import type { ProjectSpec } from '../../types';
import { contentFor, type TopicContent } from '../content';
import { icon, type IconName } from '../icons';
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

const TIER_GLYPHS: readonly IconName[] = ['leaf', 'zap', 'star'];
const BULLET_ICONS: readonly IconName[] = [
  'check', 'zap', 'shield', 'star', 'users', 'chart', 'clock', 'mail', 'sparkles', 'heart',
];

interface Tier {
  name: string;
  blurb: string;
  monthly: number;
  yearly: number;
  bullets: readonly string[];
  featured: boolean;
}

function buildTiers(spec: ProjectSpec, content: TopicContent): Tier[] {
  const rng = createRng(`${spec.seed}:pricing-tiers`);
  const names = rng.pick([
    ['Starter', 'Growth', 'Scale'],
    ['Basic', 'Plus', 'Pro'],
    ['Solo', 'Studio', 'Agency'],
  ] as const);
  const monthly = rng.pick([
    [0, 19, 49],
    [9, 29, 79],
    [12, 32, 89],
  ] as const);
  const blurbs = rng.pick([
    ['Kick the tires properly.', 'The plan most people land on.', 'For the whole crew.'],
    ['Start small, stay nimble.', 'Room to grow into.', 'Every lever unlocked.'],
    ['A gentle on-ramp.', 'Built for regulars.', 'For serious volume.'],
  ] as const);
  const flavor = content.featureIdeas;

  const bulletSets: readonly (readonly string[])[] = [
    [
      flavor[0]?.title ?? 'All the essentials',
      'Up to 3 active projects',
      'Community support',
    ],
    [
      `Everything in ${names[0]}`,
      flavor[1]?.title ?? 'Advanced reporting',
      flavor[2]?.title ?? 'Priority processing',
      'Unlimited projects',
      'Priority email support',
    ],
    [
      `Everything in ${names[1]}`,
      flavor[3]?.title ?? 'Dedicated onboarding',
      'Single sign-on',
      'Quarterly reviews',
      'Custom agreements',
    ],
  ];

  return names.map((name, i) => {
    const price = monthly[i] ?? 0;
    return {
      name,
      blurb: blurbs[i] ?? '',
      monthly: price,
      // Yearly billing knocks ~20% off the monthly rate.
      yearly: price === 0 ? 0 : Math.round(price * 0.8),
      bullets: bulletSets[i] ?? [],
      featured: i === 1,
    };
  });
}

/** The billing-toggle plan grid; keeps the shared .tier chrome. */
function renderPlanGrid(spec: ProjectSpec, content: TopicContent): string {
  const rng = createRng(`${spec.seed}:pricing-copy`);
  const eyebrow = rng.pick(['Pricing', 'Plans', 'Fair and square', 'Pick a lane']);
  const heading = rng.pick(['Simple, honest pricing', 'Pick your pace', 'Plans for every stage']);
  const sub = rng.pick([
    'Every plan starts with a 14-day trial. No card required.',
    'Switch or cancel whenever — your work always stays exportable.',
  ]);
  const badge = rng.pick(['Most popular', 'Best value', 'Recommended']);
  const fine = rng.pick([
    'Prices in USD. Yearly plans are billed once and pause-friendly.',
    'Nonprofits and classrooms get 40% off any plan — just write in.',
  ]);
  const iconOffset = createRng(`${spec.seed}:pricing-icons`).int(0, BULLET_ICONS.length - 1);
  const tiers = buildTiers(spec, content);

  const cards = tiers
    .map((tier, i) => {
      const bullets = tier.bullets
        .map((bullet, k) => {
          const glyph = BULLET_ICONS[(iconOffset + i * 3 + k) % BULLET_ICONS.length] ?? 'check';
          return `            <li>${icon(glyph, 'tick')}<span>${esc(bullet)}</span></li>`;
        })
        .join('\n');
      const badgeLine = tier.featured ? `          <span class="badge">${esc(badge)}</span>\n` : '';
      return `        <article class="card tier${tier.featured ? ' tier-featured' : ''}" data-reveal data-reveal-delay="${i * 90}">
${badgeLine}          <div class="tier-head">
            <span class="tier-glyph" aria-hidden="true">${icon(TIER_GLYPHS[i] ?? 'star')}</span>
            <h3>${esc(tier.name)}</h3>
          </div>
          <p class="tier-blurb">${esc(tier.blurb)}</p>
          <p class="tier-price"><strong data-price-monthly="$${tier.monthly}" data-price-yearly="$${tier.yearly}">$${tier.monthly}</strong><span>/mo</span></p>
          <p class="tier-cycle" data-cycle-note data-note-monthly="billed monthly" data-note-yearly="per month, billed yearly">billed monthly</p>
          <ul class="tier-list">
${bullets}
          </ul>
          <a class="btn ${tier.featured ? 'btn-primary' : 'btn-ghost'}" href="#cta">Choose ${esc(tier.name)}</a>
        </article>`;
    })
    .join('\n');

  const tone = sectionTone(spec, 'pricing');
  const toneCls = tone === 'plain' ? '' : ` tone-${tone}`;
  return `  <section class="section${toneCls} pricing pricing-billed" id="pricing">
    <div class="container">
      <div class="section-head" data-reveal>
        <span class="eyebrow">${esc(eyebrow)}</span>
        <h2>${esc(heading)}</h2>
        <p class="lede">${esc(sub)}</p>
      </div>
      <div class="billing-toggle" role="group" aria-label="Billing period" data-reveal>
        <button class="billing-option is-active" type="button" data-billing="monthly" aria-pressed="true">Monthly</button>
        <button class="billing-option" type="button" data-billing="yearly" aria-pressed="false">Yearly<span class="billing-save">save 20%</span></button>
      </div>
      <div class="grid cols-3 tier-grid">
${cards}
      </div>
      <p class="pricing-fine" data-reveal>${esc(fine)}</p>
    </div>
  </section>`;
}

function planGridCss(spec: ProjectSpec): string {
  const brutal = spec.style.archetype === 'brutalist';
  const chipBorder = brutal ? '2px solid var(--text)' : '1px solid var(--border)';
  return `/* Billing toggle */
.billing-toggle { display: inline-flex; gap: 0.25rem; margin-bottom: 2rem; padding: 0.3rem; border: ${chipBorder}; border-radius: var(--radius-btn); background: var(--surface); }
.billing-option { border: 0; background: transparent; color: var(--muted); font: inherit; font-weight: 600; padding: 0.4rem 1.1rem; border-radius: var(--radius-btn); cursor: pointer; display: inline-flex; align-items: center; gap: 0.5rem; }
.billing-option:hover { color: var(--text); }
.billing-option.is-active { background: var(--primary); color: var(--primary-contrast); }
.billing-save { font-size: 0.66rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; padding: 0.12rem 0.5rem; border-radius: 999px; background: var(--accent-soft); color: var(--text); }
.billing-option.is-active .billing-save { background: rgba(255, 255, 255, 0.22); color: inherit; }
.tier-head { display: flex; align-items: center; gap: 0.6rem; }
.tier-head h3 { margin: 0; }
.tier-glyph { width: 2.2rem; height: 2.2rem; display: grid; place-items: center; border-radius: var(--radius-sm); background: var(--primary-soft); color: var(--primary-strong);${brutal ? ' border: 2px solid var(--text); background: var(--accent-soft); color: var(--text);' : ''} }
.tier-glyph svg { width: 1.1rem; height: 1.1rem; }
.tier-blurb { color: var(--muted); font-size: 0.92rem; margin: 0; }
.tier-cycle { color: var(--muted); font-size: 0.8rem; margin-top: -0.6rem; }
.tier-price strong { font-variant-numeric: tabular-nums; }
.pricing-fine { color: var(--muted); font-size: 0.85rem; margin-top: 1.75rem; }`;
}

/** Swaps monthly/yearly price and note text in place; no reflow tricks. */
const BILLING_JS = `(function () {
  'use strict';

  // Billing toggle: swap each tier's price and cycle note in place.
  var options = Array.prototype.slice.call(document.querySelectorAll('[data-billing]'));
  if (options.length === 0) return;
  var prices = Array.prototype.slice.call(document.querySelectorAll('[data-price-monthly]'));
  var notes = Array.prototype.slice.call(document.querySelectorAll('[data-cycle-note]'));

  function setBilling(period) {
    var priceAttr = period === 'yearly' ? 'data-price-yearly' : 'data-price-monthly';
    var noteAttr = period === 'yearly' ? 'data-note-yearly' : 'data-note-monthly';
    options.forEach(function (option) {
      var active = option.getAttribute('data-billing') === period;
      option.classList.toggle('is-active', active);
      option.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    prices.forEach(function (price) {
      var next = price.getAttribute(priceAttr);
      if (next !== null) price.textContent = next;
    });
    notes.forEach(function (note) {
      var next = note.getAttribute(noteAttr);
      if (next !== null) note.textContent = next;
    });
  }

  options.forEach(function (option) {
    option.addEventListener('click', function () {
      setBilling(option.getAttribute('data-billing') || 'monthly');
    });
  });
})();`;

export function renderPricing(spec: ProjectSpec): TemplateOutput {
  const content = contentFor(spec.topic, createRng(`${spec.seed}:content`));
  const hasPlans = spec.sections.includes('pricing');
  const action = hasPlans ? '<a class="btn btn-primary" href="#pricing">Choose a plan</a>' : '';

  const sections = spec.sections.map((section) =>
    section === 'pricing' ? renderPlanGrid(spec, content) : renderSection(section, spec, content),
  );

  const body = [
    renderHeader(spec, sectionNavLinks(spec), action),
    '  <main id="main">',
    ...sections,
    '  </main>',
    renderFooter(spec),
  ].join('\n');

  const css = [
    cssVariables(spec),
    baseCss(spec),
    pageSectionsCss(spec),
    ...(hasPlans ? [planGridCss(spec)] : []),
  ].join('\n\n');

  const js = hasPlans ? `${pageSectionsJs(spec)}\n${BILLING_JS}` : pageSectionsJs(spec);

  return { body, css, js };
}
