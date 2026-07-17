/**
 * Recipes template — card grid with tag filters and a detail view with an
 * interactive ingredients checklist. Details are pre-rendered and toggled.
 */
import { createRng } from '@/lib/seeded';
import type { ProjectSpec } from '../../types';
import {
  baseCss,
  cssVariables,
  esc,
  gradientArtCss,
  renderFooter,
  renderHeader,
  type TemplateOutput,
} from '../shared';

interface Recipe {
  title: string;
  tag: string;
  minutes: number;
  serves: number;
  ingredients: readonly string[];
  steps: readonly string[];
}

const RECIPE_POOL: readonly Recipe[] = [
  {
    title: 'Smoky chickpea skillet',
    tag: 'Dinner',
    minutes: 25,
    serves: 2,
    ingredients: ['1 can chickpeas, drained', '1 onion, sliced', '2 tsp smoked paprika', '1 can chopped tomatoes', 'Handful of spinach', 'Yogurt, to serve'],
    steps: [
      'Soften the onion in olive oil over medium heat, about five minutes.',
      'Stir in the paprika, then the chickpeas and tomatoes. Simmer ten minutes.',
      'Fold in the spinach until it wilts, season well.',
      'Serve with a spoonful of yogurt and warm bread.',
    ],
  },
  {
    title: 'Overnight oats, three ways',
    tag: 'Breakfast',
    minutes: 10,
    serves: 1,
    ingredients: ['50 g rolled oats', '120 ml milk of choice', '1 tbsp chia seeds', 'Pinch of salt', 'Fruit, nuts or cocoa to finish'],
    steps: [
      'Stir the oats, milk, chia and salt in a jar.',
      'Refrigerate overnight — no peeking required.',
      'Top in the morning: grated apple and cinnamon, berries and almonds, or cocoa and banana.',
    ],
  },
  {
    title: 'Lemon-herb sheet-pan chicken',
    tag: 'Dinner',
    minutes: 40,
    serves: 4,
    ingredients: ['8 chicken thighs', '2 lemons', '500 g baby potatoes, halved', '4 garlic cloves', 'Fresh thyme and rosemary', 'Olive oil'],
    steps: [
      'Heat the oven to 210°C and toss everything on one tray with oil, salt and pepper.',
      'Squeeze one lemon over, tuck the spent halves between the potatoes.',
      'Roast 35 minutes until the skin crisps and the potatoes give easily.',
      'Finish with the second lemon and the herb leaves.',
    ],
  },
  {
    title: 'Midweek miso noodle soup',
    tag: 'Soup',
    minutes: 20,
    serves: 2,
    ingredients: ['2 tbsp white miso', '200 g udon noodles', '1 carrot, ribboned', '2 spring onions', 'Soft-boiled egg, optional', '750 ml water'],
    steps: [
      'Simmer the water, whisk a ladleful into the miso, then return it to the pot off the boil.',
      'Cook the noodles separately and divide between bowls.',
      'Pour over the broth, pile on carrot and spring onion, crown with the egg.',
    ],
  },
  {
    title: 'Charred corn and feta salad',
    tag: 'Salad',
    minutes: 15,
    serves: 4,
    ingredients: ['4 corn cobs', '100 g feta, crumbled', '1 lime', 'Small bunch coriander', '1 red chilli, sliced', 'Olive oil'],
    steps: [
      'Char the corn in a dry, screaming-hot pan, turning until spotted all over.',
      'Slice the kernels off and toss with lime juice, oil, chilli and coriander.',
      'Scatter the feta over just before serving.',
    ],
  },
  {
    title: 'One-bowl banana bread',
    tag: 'Baking',
    minutes: 60,
    serves: 8,
    ingredients: ['3 very ripe bananas', '2 eggs', '80 ml neutral oil', '90 g sugar', '190 g flour', '1 tsp baking soda', 'Pinch of salt'],
    steps: [
      'Mash the bananas in a big bowl, then whisk in eggs, oil and sugar.',
      'Fold in the flour, baking soda and salt — stop at "just combined".',
      'Bake in a lined loaf tin at 175°C for 50 minutes.',
      'Cool before slicing, if you can manage it.',
    ],
  },
  {
    title: 'Crispy gnocchi with sage butter',
    tag: 'Dinner',
    minutes: 20,
    serves: 2,
    ingredients: ['500 g shelf gnocchi', '60 g butter', '10 sage leaves', 'Parmesan, grated', 'Black pepper'],
    steps: [
      'Fry the gnocchi straight from the packet in half the butter until golden and crackly.',
      'Add the rest of the butter with the sage and let it foam until nutty.',
      'Serve under a snowfall of parmesan and plenty of pepper.',
    ],
  },
  {
    title: 'Iced ginger-peach tea',
    tag: 'Drinks',
    minutes: 10,
    serves: 4,
    ingredients: ['4 black tea bags', '2 ripe peaches, sliced', 'Thumb of ginger, sliced', '2 tbsp honey', '1 liter water', 'Ice'],
    steps: [
      'Steep the tea, ginger and honey in just-boiled water for five minutes.',
      'Remove the bags, add the peaches, and chill completely.',
      'Serve over ice with a peach slice in every glass.',
    ],
  },
];

export function renderRecipes(spec: ProjectSpec): TemplateOutput {
  const rng = createRng(`${spec.seed}:recipes`);
  const recipeCount = rng.int(6, 8);
  const start = rng.int(0, RECIPE_POOL.length - 1);
  const recipes: Array<Recipe & { id: string }> = [];
  for (let i = 0; i < recipeCount; i++) {
    const recipe = RECIPE_POOL[(start + i) % RECIPE_POOL.length];
    if (!recipe) continue;
    if (recipes.some((existing) => existing.title === recipe.title)) continue;
    recipes.push({ ...recipe, id: `recipe-${i + 1}` });
  }
  const tags = [...new Set(recipes.map((recipe) => recipe.tag))];

  const chips = ['All', ...tags]
    .map(
      (tag, index) =>
        `        <button class="chip${index === 0 ? ' is-active' : ''}" type="button" data-tag="${esc(tag)}">${esc(tag)}</button>`,
    )
    .join('\n');

  const cards = recipes
    .map(
      (recipe, index) => `        <article class="card recipe-card" data-recipe-tag="${esc(recipe.tag)}">
          <div class="recipe-art art-${(index % 6) + 1}" aria-hidden="true"></div>
          <div class="recipe-info">
            <span class="badge">${esc(recipe.tag)}</span>
            <h3>${esc(recipe.title)}</h3>
            <p class="recipe-meta">${recipe.minutes} min · serves ${recipe.serves}</p>
            <button class="btn btn-ghost" type="button" data-open="${recipe.id}">View recipe</button>
          </div>
        </article>`,
    )
    .join('\n');

  const details = recipes
    .map((recipe) => {
      const ingredients = recipe.ingredients
        .map(
          (ingredient, index) => `          <li>
            <label class="ingredient">
              <input type="checkbox" id="${recipe.id}-ing-${index}" />
              <span>${esc(ingredient)}</span>
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
          <span class="recipe-meta">${recipe.minutes} min · serves ${recipe.serves}</span>
        </div>
        <h1>${esc(recipe.title)}</h1>
        <h2>Ingredients</h2>
        <ul class="ingredient-list">
${ingredients}
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
      <p id="recipes-empty" hidden>No recipes under that tag yet.</p>
    </section>
    <section id="recipe-view" hidden aria-label="Recipe detail">
      <button id="back-to-recipes" class="btn btn-ghost" type="button">← All recipes</button>
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
.recipe-card { overflow: hidden; display: grid; transition: transform 0.15s ease, box-shadow 0.15s ease; }
.recipe-card:hover { transform: translateY(-3px); box-shadow: var(--shadow); }
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
