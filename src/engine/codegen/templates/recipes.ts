/**
 * Recipes template — topic-driven card grid with tag filters and a detail
 * view with an interactive checklist. Food domains get true recipes; other
 * domains get how-to/guide entries with a "what you'll need" list.
 */
import { createRng } from '@/lib/seeded';
import type { ProjectSpec } from '../../types';
import { contentFor } from '../content';
import {
  baseCss,
  cssVariables,
  esc,
  gradientArtCss,
  renderFooter,
  renderHeader,
  type TemplateOutput,
} from '../shared';

export function renderRecipes(spec: ProjectSpec): TemplateOutput {
  const rng = createRng(`${spec.seed}:recipes`);
  const content = contentFor(spec.topic, createRng(`${spec.seed}:content`));
  const isFood = spec.topic === 'food' || spec.topic === 'generic';
  const listLabel = isFood ? 'Ingredients' : "What you'll need";

  // Each entry ships with its own coherent checklist and method, so a
  // banana bread never lists another recipe's onions.
  const recipes = content.recipes.map((recipe, i) => ({
    id: `recipe-${i + 1}`,
    name: recipe.name,
    tag: recipe.tags[0] ?? 'General',
    tags: recipe.tags,
    minutes: recipe.minutes,
    serves: rng.int(1, 4) * 2,
    items: recipe.items,
    steps: recipe.steps,
  }));
  const tags = [...new Set(recipes.map((recipe) => recipe.tag))];

  const chips = ['All', ...tags]
    .map(
      (tag, index) =>
        `        <button class="chip${index === 0 ? ' is-active' : ''}" type="button" data-tag="${esc(tag)}">${esc(tag)}</button>`,
    )
    .join('\n');

  const metaFor = (recipe: (typeof recipes)[number]): string =>
    isFood
      ? `${recipe.minutes} min · serves ${recipe.serves}`
      : `${recipe.minutes} min · ${recipe.tags.join(' · ')}`;

  const cards = recipes
    .map(
      (recipe, index) => `        <article class="card recipe-card" data-recipe-tag="${esc(recipe.tag)}">
          <div class="recipe-art art-${(index % 6) + 1}" aria-hidden="true"></div>
          <div class="recipe-info">
            <span class="badge">${esc(recipe.tag)}</span>
            <h3>${esc(recipe.name)}</h3>
            <p class="recipe-meta">${esc(metaFor(recipe))}</p>
            <button class="btn btn-ghost" type="button" data-open="${recipe.id}">${isFood ? 'View recipe' : 'Open guide'}</button>
          </div>
        </article>`,
    )
    .join('\n');

  const details = recipes
    .map((recipe) => {
      const items = recipe.items
        .map(
          (item, index) => `          <li>
            <label class="ingredient">
              <input type="checkbox" id="${recipe.id}-ing-${index}" />
              <span>${esc(item)}</span>
            </label>
          </li>`,
        )
        .join('\n');
      const steps = recipe.steps
        .map((step) => `          <li>${esc(step)}</li>`)
        .join('\n');
      return `      <article class="recipe-detail" id="${recipe.id}" hidden>
        <div class="post-meta">
          <span class="badge">${esc(recipe.tag)}</span>
          <span class="recipe-meta">${esc(metaFor(recipe))}</span>
        </div>
        <h1>${esc(recipe.name)}</h1>
        <h2>${esc(listLabel)}</h2>
        <ul class="ingredient-list">
${items}
        </ul>
        <h2>Method</h2>
        <ol class="step-list">
${steps}
        </ol>
      </article>`;
    })
    .join('\n');

  const body = `${renderHeader(spec, [])}
  <main class="app-main container">
    <section id="recipe-list" aria-label="Recipes">
      <div class="recipes-head">
        <h1>${esc(spec.name)}</h1>
        <p class="app-tagline">${esc(spec.tagline)}</p>
      </div>
      <div class="chip-row" role="group" aria-label="Filter by tag">
${chips}
      </div>
      <div class="grid cols-3" id="recipe-grid">
${cards}
      </div>
      <p id="recipes-empty" hidden>Nothing under that tag yet.</p>
    </section>
    <section id="recipe-view" hidden aria-label="Recipe detail">
      <button id="back-to-recipes" class="btn btn-ghost" type="button">← Back to all</button>
${details}
    </section>
  </main>
${renderFooter(spec)}`;

  const css = `${cssVariables(spec)}

${baseCss(spec)}

/* Recipes */
.recipes-head { margin-bottom: 1.5rem; }
.app-tagline { color: var(--muted); margin-top: 0.25rem; }
.chip-row { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 1.25rem; }
.chip {
  border: 1px solid var(--border); background: var(--surface); color: var(--muted);
  border-radius: var(--radius-btn); padding: 0.3rem 0.9rem; cursor: pointer;
  font-size: 0.88rem; font-weight: 600;
}
.chip:hover { border-color: var(--primary); color: var(--primary); }
.chip.is-active { background: var(--primary); border-color: var(--primary); color: var(--primary-contrast); }
.recipe-card { overflow: hidden; display: grid; transition: transform 0.15s ease; }
.recipe-card:hover { transform: translateY(-3px); }
.recipe-art { aspect-ratio: 5 / 3; }
.recipe-info { padding: 1rem; display: grid; gap: 0.45rem; justify-items: start; }
.recipe-meta { color: var(--muted); font-size: 0.85rem; }
#recipes-empty { color: var(--muted); padding-block: 2rem; text-align: center; }
.post-meta { display: flex; align-items: center; gap: 0.75rem; }
.recipe-detail { max-width: 40rem; padding-block: 1rem; }
.recipe-detail h1 { margin-block: 0.75rem 1rem; }
.recipe-detail h2 { font-size: 1.1rem; margin-block: 1.5rem 0.75rem; }
.ingredient-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.4rem; }
.ingredient { display: flex; align-items: center; gap: 0.6rem; cursor: pointer; font-weight: 400; }
.ingredient input { width: 1rem; height: 1rem; accent-color: var(--primary); }
.ingredient input:checked + span { text-decoration: line-through; color: var(--muted); }
.step-list { display: grid; gap: 0.6rem; padding-left: 1.25rem; }
#back-to-recipes { margin-bottom: 1rem; }

${gradientArtCss(spec)}`;

  const js = `(function () {
  'use strict';

  var listView = document.getElementById('recipe-list');
  var detailView = document.getElementById('recipe-view');
  var backButton = document.getElementById('back-to-recipes');
  var emptyNote = document.getElementById('recipes-empty');
  if (!listView || !detailView) return;

  // Tag filter chips.
  document.querySelectorAll('.chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      var tag = chip.getAttribute('data-tag') || 'All';
      document.querySelectorAll('.chip').forEach(function (other) {
        other.classList.toggle('is-active', other === chip);
      });
      var visible = 0;
      document.querySelectorAll('.recipe-card').forEach(function (card) {
        var match = tag === 'All' || card.getAttribute('data-recipe-tag') === tag;
        card.hidden = !match;
        if (match) visible += 1;
      });
      if (emptyNote) emptyNote.hidden = visible > 0;
    });
  });

  // Detail view toggling.
  document.querySelectorAll('[data-open]').forEach(function (button) {
    button.addEventListener('click', function () {
      var recipeId = button.getAttribute('data-open');
      var target = recipeId ? document.getElementById(recipeId) : null;
      if (!target) return;
      detailView.querySelectorAll('.recipe-detail').forEach(function (article) {
        article.hidden = article !== target;
      });
      listView.hidden = true;
      detailView.hidden = false;
      window.scrollTo(0, 0);
    });
  });

  if (backButton) {
    backButton.addEventListener('click', function () {
      detailView.hidden = true;
      listView.hidden = false;
      window.scrollTo(0, 0);
    });
  }
})();`;

  return { body, css, js };
}
