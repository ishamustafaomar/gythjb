/**
 * Recipes template — topic-driven cards (seeded art, time and tag badges,
 * search plus tag chips) and a detail view with a persistent ingredients
 * checklist, numbered check-off steps, and — for food domains — a servings
 * stepper that rescales every numeric quantity in place. Checklist state
 * and chosen servings persist to localStorage.
 */
import { createRng } from '@/lib/seeded';
import type { ProjectSpec } from '../../types';
import { PRODUCT_ART_BASE_CSS, productArt } from '../art';
import { contentFor } from '../content';
import { icon } from '../icons';
import { buildRuntimeJs } from '../runtime';
import {
  baseCss,
  cssVariables,
  esc,
  renderFooter,
  renderHeader,
  slugify,
  type TemplateOutput,
} from '../shared';

interface ParsedItem {
  /** Leading numeric quantity, when the line starts with one. */
  amount: number | null;
  rest: string;
}

/** "2 tins chickpeas" → amount 2 + "tins chickpeas"; prose lines pass through. */
function splitQuantity(item: string): ParsedItem {
  const match = /^([0-9]+(?:\.[0-9]+)?)\s+(.+)$/.exec(item);
  const amount = match ? Number.parseFloat(match[1] ?? '') : Number.NaN;
  if (!match || !Number.isFinite(amount)) return { amount: null, rest: item };
  return { amount, rest: match[2] ?? item };
}

export function renderRecipes(spec: ProjectSpec): TemplateOutput {
  const rng = createRng(`${spec.seed}:recipes`);
  const content = contentFor(spec.topic, createRng(`${spec.seed}:content`));
  const isFood = spec.topic === 'food' || spec.topic === 'generic';
  const listLabel = isFood ? 'Ingredients' : "What you'll need";
  const storageKey = `promptly:${slugify(spec.name)}:kitchen`;

  // Each entry ships with its own coherent checklist and method, so a
  // banana bread never lists another recipe's onions.
  const recipes = content.recipes.map((recipe, i) => ({
    id: `recipe-${i + 1}`,
    name: recipe.name,
    tag: recipe.tags[0] ?? 'General',
    tags: recipe.tags,
    minutes: recipe.minutes,
    serves: rng.int(1, 3) * 2,
    items: recipe.items.map(splitQuantity),
    steps: recipe.steps,
  }));
  const tags = [...new Set(recipes.map((recipe) => recipe.tag))];
  const arts = recipes.map((_, i) =>
    productArt(createRng(`${spec.seed}:recipe-art:${i}`), spec.topic, i),
  );

  const chips = ['All', ...tags]
    .map(
      (tag, index) =>
        `          <button class="chip${index === 0 ? ' is-active' : ''}" type="button" data-tag="${esc(tag)}" aria-pressed="${index === 0 ? 'true' : 'false'}">${esc(tag)}</button>`,
    )
    .join('\n');

  const metaFor = (recipe: (typeof recipes)[number]): string =>
    isFood
      ? `${recipe.minutes} min · serves ${recipe.serves}`
      : `${recipe.minutes} min · ${recipe.tags.join(' · ')}`;

  const cards = recipes
    .map(
      (recipe, index) => `          <article class="card recipe-card" data-recipe-card data-recipe-tag="${esc(recipe.tag)}" data-name="${esc(recipe.name.toLowerCase())}" data-reveal data-reveal-delay="${(index % 3) * 80}">
            <button class="recipe-open" type="button" data-open="${recipe.id}" aria-label="Open ${esc(recipe.name)}">
              <span class="recipe-art" aria-hidden="true">${arts[index]?.html ?? ''}</span>
              <span class="time-badge">${icon('clock')}${recipe.minutes} min</span>
            </button>
            <div class="recipe-info">
              <div class="recipe-tags">${recipe.tags.map((tag) => `<span class="badge">${esc(tag)}</span>`).join(' ')}</div>
              <h3>${esc(recipe.name)}</h3>
              <p class="recipe-meta">${esc(metaFor(recipe))}</p>
            </div>
          </article>`,
    )
    .join('\n');

  const details = recipes
    .map((recipe) => {
      const items = recipe.items
        .map((item, index) => {
          const amountSpan =
            item.amount !== null
              ? `<span class="ing-amount" data-amount="${item.amount}">${item.amount}</span> `
              : '';
          return `            <li>
              <label class="ingredient">
                <input type="checkbox" data-check="${recipe.id}:ing-${index}" />
                <span class="ing-text">${amountSpan}${esc(item.rest)}</span>
              </label>
            </li>`;
        })
        .join('\n');
      const steps = recipe.steps
        .map(
          (step, index) => `            <li class="step">
              <label class="step-label">
                <input type="checkbox" data-check="${recipe.id}:step-${index}" />
                <span class="step-num" aria-hidden="true">${index + 1}</span>
                <span class="step-text">${esc(step)}</span>
              </label>
            </li>`,
        )
        .join('\n');
      const servesRow = isFood
        ? `          <div class="serves-row">
            <span class="serves-label">Servings</span>
            <div class="qty-stepper" role="group" aria-label="Servings" data-serves="${recipe.id}" data-base="${recipe.serves}">
              <button class="qty-btn" type="button" data-serves-step="-1" aria-label="Fewer servings">&minus;</button>
              <span class="qty-value" data-serves-value>${recipe.serves}</span>
              <button class="qty-btn" type="button" data-serves-step="1" aria-label="More servings">+</button>
            </div>
            <span class="serves-note">quantities scale with you</span>
          </div>\n`
        : '';
      return `        <article class="recipe-detail" id="${recipe.id}" hidden>
          <button class="btn btn-ghost detail-back" type="button" data-back-to-recipes>Back to all</button>
          <div class="post-meta">
            ${recipe.tags.map((tag) => `<span class="badge">${esc(tag)}</span>`).join(' ')}
            <span class="recipe-meta">${esc(metaFor(recipe))}</span>
          </div>
          <h1>${esc(recipe.name)}</h1>
${servesRow}          <h2 class="detail-sub">${esc(listLabel)}</h2>
          <ul class="ingredient-list">
${items}
          </ul>
          <h2 class="detail-sub">Method</h2>
          <ol class="step-list">
${steps}
          </ol>
          <p class="detail-note">${icon('check')} <span>Ticks and servings are remembered on this device.</span></p>
        </article>`;
    })
    .join('\n');

  const kicker = createRng(`${spec.seed}:recipes-kicker`).pick(content.heroKickers);

  const body = `${renderHeader(spec, [], '')}
  <main class="recipes-main" id="main">
    <section id="recipe-list" class="section recipes-home" aria-label="Recipes">
      <div class="container">
        <header class="recipes-head" data-reveal>
          <span class="eyebrow">${esc(kicker)}</span>
          <h1>${esc(spec.name)}</h1>
          <p class="app-tagline">${esc(spec.tagline)}</p>
        </header>
        <div class="recipes-controls" data-reveal>
          <div class="chip-row" role="group" aria-label="Filter by tag">
${chips}
          </div>
          <div class="recipes-search">
            <label class="sr-only" for="recipe-search">Search</label>
            <input id="recipe-search" type="search" placeholder="Search by name&hellip;" autocomplete="off" />
          </div>
        </div>
        <div class="grid cols-3" id="recipe-grid">
${cards}
        </div>
        <p id="recipes-empty" hidden>Nothing matches that — clear the search or pick another tag.</p>
      </div>
    </section>
    <section id="recipe-view" class="section recipes-read" hidden aria-label="Recipe detail">
      <div class="container">
${details}
      </div>
    </section>
  </main>
${renderFooter(spec)}`;

  const css = [
    cssVariables(spec),
    baseCss(spec),
    recipesCss(spec),
    `/* Recipe art */\n${PRODUCT_ART_BASE_CSS}\n${arts.map((art) => art.css).join('\n')}`,
  ].join('\n\n');

  const js = `${buildRuntimeJs()}\n${recipesJs(storageKey)}`;

  return { body, css, js };
}

function recipesCss(spec: ProjectSpec): string {
  const { archetype } = spec.style;
  const brutal = archetype === 'brutalist';
  const chipBorder = brutal ? '2px solid var(--text)' : '1px solid var(--border)';

  return `/* Recipes — home */
.recipes-home { padding-block: calc(var(--section-pad) * 0.7) var(--section-pad); }
.recipes-head { margin-bottom: 1.75rem; max-width: 40rem; }
.app-tagline { color: var(--muted); margin-top: 0.5rem; font-size: 1.08rem; }
.recipes-controls { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.9rem 1.5rem; margin-bottom: 1.5rem; }
.chip-row { display: flex; flex-wrap: wrap; gap: 0.45rem; }
.chip { border: ${chipBorder}; background: var(--surface); color: var(--muted); border-radius: var(--radius-btn); padding: 0.3rem 0.9rem; cursor: pointer; font: inherit; font-size: 0.88rem; font-weight: 600; }
.chip:hover { border-color: var(--primary); color: var(--primary); }
.chip.is-active { background: var(--primary); border-color: var(--primary); color: var(--primary-contrast); }
.recipes-search input[type='search'] { width: 13rem; }
.recipe-card { overflow: hidden; display: grid; grid-template-rows: auto 1fr; transition: transform 0.15s ease, box-shadow 0.15s ease; }
.recipe-card:hover { transform: translateY(-3px);${archetype === 'minimal' ? ' border-color: var(--text);' : ' box-shadow: var(--shadow);'} }
.recipe-open { position: relative; display: block; padding: 0; border: 0; background: transparent; cursor: pointer; }
.recipe-art { display: block; }
.recipe-art .product-art { width: 100%; aspect-ratio: 5 / 3; }
.time-badge { position: absolute; top: 0.7rem; left: 0.7rem; display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.2rem 0.6rem; border-radius: var(--radius-btn); background: var(--surface); color: var(--text); font-size: 0.75rem; font-weight: 700;${brutal ? ' border: 2px solid var(--text);' : ' box-shadow: var(--shadow); border: 1px solid var(--border);'} }
.time-badge svg { width: 0.85rem; height: 0.85rem; color: var(--primary); }
.recipe-info { padding: 1rem 1.1rem 1.2rem; display: grid; gap: 0.5rem; justify-items: start; align-content: start; }
.recipe-tags { display: flex; flex-wrap: wrap; gap: 0.3rem; }
.recipe-info h3 { font-size: 1.05rem; }
.recipe-meta { color: var(--muted); font-size: 0.85rem; }
#recipes-empty { color: var(--muted); padding-block: 2.5rem; text-align: center; }

/* Recipes — detail */
.recipes-read .container { max-width: 42rem; }
.detail-back { margin-bottom: 1.5rem; }
.post-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 0.6rem; }
.recipe-detail h1 { margin-block: 0.75rem 1rem; }
.detail-sub { font-size: 1.15rem; margin-block: 1.75rem 0.85rem; }
.serves-row { display: flex; align-items: center; flex-wrap: wrap; gap: 0.9rem; padding: 0.9rem 1rem; border: ${chipBorder}; border-radius: var(--radius-md); background: var(--surface); margin-top: 0.5rem; }
.serves-label { font-weight: 700; font-size: 0.9rem; }
.serves-note { color: var(--muted); font-size: 0.82rem; }
.qty-stepper { display: inline-flex; align-items: center; gap: 0.15rem; border: ${chipBorder}; border-radius: var(--radius-btn); padding: 0.15rem; background: var(--surface); }
.qty-btn { width: 1.9rem; height: 1.9rem; border: 0; background: transparent; color: var(--text); border-radius: var(--radius-btn); cursor: pointer; font: inherit; font-weight: 700; line-height: 1; }
.qty-btn:hover { background: var(--primary-soft); color: var(--primary-strong); }
.qty-value { min-width: 2rem; text-align: center; font-weight: 700; font-variant-numeric: tabular-nums; }
.ingredient-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.45rem; }
.ingredient { display: flex; align-items: baseline; gap: 0.6rem; cursor: pointer; font-weight: 400; }
.ingredient input { width: 1rem; height: 1rem; accent-color: var(--primary); translate: 0 0.12rem; }
.ingredient input:checked ~ .ing-text { text-decoration: line-through; color: var(--muted); }
.ing-amount { font-weight: 700; font-variant-numeric: tabular-nums; color: var(--primary); }
.step-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.7rem; }
.step-label { display: flex; align-items: baseline; gap: 0.65rem; cursor: pointer; }
.step-label input { width: 1rem; height: 1rem; accent-color: var(--primary); translate: 0 0.12rem; flex: none; }
.step-num { flex: none; width: 1.5rem; height: 1.5rem; display: grid; place-items: center; border-radius: var(--radius-round); background: var(--primary-soft); color: var(--primary-strong); font-size: 0.78rem; font-weight: 800; translate: 0 0.3rem;${brutal ? ' border: 2px solid var(--text); color: var(--text); background: var(--accent-soft);' : ''} }
.step-label input:checked ~ .step-text { text-decoration: line-through; color: var(--muted); }
.step-label input:checked ~ .step-num { opacity: 0.55; }
.detail-note { display: flex; align-items: center; gap: 0.5rem; margin-top: 2rem; color: var(--muted); font-size: 0.85rem; }
.detail-note svg { width: 0.95rem; height: 0.95rem; flex: none; color: var(--primary); }

/* Scroll reveal (armed by the runtime; nothing hides without JS) */
@media (prefers-reduced-motion: no-preference) {
  html.js-reveal [data-reveal] { ${archetype === 'brutalist' || archetype === 'editorial' ? 'opacity: 0;' : 'opacity: 0; transform: translateY(14px);'} ${
    archetype === 'brutalist'
      ? 'transition: opacity 0.18s steps(2, jump-end);'
      : archetype === 'editorial'
        ? 'transition: opacity 0.7s ease;'
        : 'transition: opacity 0.55s ease, transform 0.55s ease;'
  } }
  html.js-reveal [data-reveal].is-revealed { opacity: 1; transform: none; }
}`;
}

function recipesJs(storageKey: string): string {
  return `(function () {
  'use strict';

  var STORAGE_KEY = '${storageKey}';
  var listView = document.getElementById('recipe-list');
  var detailView = document.getElementById('recipe-view');
  var emptyNote = document.getElementById('recipes-empty');
  var searchInput = document.getElementById('recipe-search');
  if (!listView || !detailView) return;

  /* ---------------- persisted kitchen state ---------------- */

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return { checks: parsed.checks || {}, serves: parsed.serves || {} };
        }
      }
    } catch (error) { /* storage unavailable — run in memory */ }
    return { checks: {}, serves: {} };
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (error) { /* ignore */ }
  }

  var state = load();

  // Restore ticked ingredients and steps.
  document.querySelectorAll('[data-check]').forEach(function (input) {
    var key = input.getAttribute('data-check');
    if (key && state.checks[key]) input.checked = true;
  });

  document.addEventListener('change', function (event) {
    var input = event.target;
    if (!input || !input.getAttribute) return;
    var key = input.getAttribute('data-check');
    if (!key) return;
    if (input.checked) state.checks[key] = 1;
    else delete state.checks[key];
    save();
  });

  /* ---------------- servings scaling ---------------- */

  function formatAmount(value) {
    var rounded = Math.round(value * 10) / 10;
    return Math.abs(rounded - Math.round(rounded)) < 0.05
      ? String(Math.round(rounded))
      : rounded.toFixed(1);
  }

  function applyServes(detail) {
    var stepper = detail.querySelector('[data-serves]');
    if (!stepper) return;
    var base = parseInt(stepper.getAttribute('data-base') || '0', 10) || 1;
    var valueEl = stepper.querySelector('[data-serves-value]');
    var value = valueEl ? parseInt(valueEl.textContent || '', 10) || base : base;
    detail.querySelectorAll('.ing-amount').forEach(function (amountEl) {
      var baseAmount = parseFloat(amountEl.getAttribute('data-amount') || '');
      if (!isFinite(baseAmount)) return;
      amountEl.textContent = formatAmount((baseAmount * value) / base);
    });
  }

  // Restore remembered servings per recipe.
  document.querySelectorAll('[data-serves]').forEach(function (stepper) {
    var recipeId = stepper.getAttribute('data-serves');
    var remembered = recipeId ? state.serves[recipeId] : null;
    var valueEl = stepper.querySelector('[data-serves-value]');
    if (remembered && valueEl) valueEl.textContent = String(remembered);
    var detail = stepper.closest('.recipe-detail');
    if (detail) applyServes(detail);
  });

  /* ---------------- filter + search ---------------- */

  var chips = Array.prototype.slice.call(document.querySelectorAll('[data-tag]'));
  var cards = Array.prototype.slice.call(document.querySelectorAll('[data-recipe-card]'));
  var activeTag = 'All';

  function applyFilters() {
    var query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    var visible = 0;
    cards.forEach(function (card) {
      var matchesTag = activeTag === 'All' || card.getAttribute('data-recipe-tag') === activeTag;
      var matchesQuery = query.length === 0 || (card.getAttribute('data-name') || '').indexOf(query) !== -1;
      var show = matchesTag && matchesQuery;
      card.hidden = !show;
      if (show) visible += 1;
    });
    if (emptyNote) emptyNote.hidden = visible > 0;
  }

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      activeTag = chip.getAttribute('data-tag') || 'All';
      chips.forEach(function (other) {
        var active = other === chip;
        other.classList.toggle('is-active', active);
        other.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      applyFilters();
    });
  });
  if (searchInput) searchInput.addEventListener('input', applyFilters);

  /* ---------------- view switching + steppers ---------------- */

  function openRecipe(recipeId) {
    var target = document.getElementById(recipeId);
    if (!target || !target.classList.contains('recipe-detail')) return;
    detailView.querySelectorAll('.recipe-detail').forEach(function (article) {
      article.hidden = article !== target;
    });
    listView.hidden = true;
    detailView.hidden = false;
    window.scrollTo(0, 0);
  }

  function showList() {
    detailView.hidden = true;
    listView.hidden = false;
    window.scrollTo(0, 0);
  }

  document.addEventListener('click', function (event) {
    var origin = event.target;
    if (!origin || !origin.closest) return;

    var opener = origin.closest('[data-open]');
    if (opener) {
      var recipeId = opener.getAttribute('data-open');
      if (recipeId) openRecipe(recipeId);
      return;
    }
    if (origin.closest('[data-back-to-recipes]')) {
      showList();
      return;
    }
    var step = origin.closest('[data-serves-step]');
    if (step) {
      var stepper = step.closest('[data-serves]');
      var detail = step.closest('.recipe-detail');
      if (!stepper || !detail) return;
      var valueEl = stepper.querySelector('[data-serves-value]');
      if (!valueEl) return;
      var current = parseInt(valueEl.textContent || '1', 10) || 1;
      var delta = parseInt(step.getAttribute('data-serves-step') || '0', 10) || 0;
      var next = Math.min(12, Math.max(1, current + delta));
      valueEl.textContent = String(next);
      var recipeKey = stepper.getAttribute('data-serves');
      if (recipeKey) {
        state.serves[recipeKey] = next;
        save();
      }
      applyServes(detail);
    }
  });
})();`;
}
