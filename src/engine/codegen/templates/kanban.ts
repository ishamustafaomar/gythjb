/**
 * Kanban template — three lanes with HTML5 drag & drop, quick-add forms
 * per column and localStorage persistence.
 */
import { createRng } from '@/lib/seeded';
import type { ProjectSpec } from '../../types';
import { contentFor } from '../content';
import {
  baseCss,
  cssVariables,
  esc,
  renderFooter,
  renderHeader,
  slugify,
  toJsLiteral,
  type TemplateOutput,
} from '../shared';

const COLUMN_SETS: ReadonlyArray<readonly [string, string, string]> = [
  ['Backlog', 'In progress', 'Shipped'],
  ['To do', 'Doing', 'Done'],
  ['Ideas', 'Building', 'Launched'],
];

export function renderKanban(spec: ProjectSpec): TemplateOutput {
  const rng = createRng(`${spec.seed}:kanban`);
  const content = contentFor(spec.topic, createRng(`${spec.seed}:content`));
  const columnNames = rng.pick(COLUMN_SETS);
  const pick = (offset: number): string =>
    content.kanbanCards[offset % content.kanbanCards.length] ?? 'Untitled card';
  const seedColumns = [
    { id: 'col-1', title: columnNames[0], cards: [pick(0), pick(1), pick(2)] },
    { id: 'col-2', title: columnNames[1], cards: [pick(3), pick(4)] },
    { id: 'col-3', title: columnNames[2], cards: [pick(5)] },
  ];
  const storageKey = `promptly:${slugify(spec.name)}:board`;

  const columnsHtml = seedColumns
    .map(
      (column) => `      <section class="column" data-column="${column.id}">
        <header class="column-head">
          <h2>${esc(column.title)}</h2>
          <span class="column-count" data-count-for="${column.id}">0</span>
        </header>
        <div class="card-list" data-list="${column.id}" aria-label="${esc(column.title)} cards"></div>
        <form class="add-card" data-add-for="${column.id}" autocomplete="off">
          <label class="sr-only" for="add-${column.id}">Add card to ${esc(column.title)}</label>
          <input id="add-${column.id}" type="text" placeholder="Add a card" maxlength="120" />
          <button class="btn btn-ghost" type="submit">+</button>
        </form>
      </section>`,
    )
    .join('\n');

  const body = `${renderHeader(spec, [])}
  <main class="app-main container">
    <div class="board-head">
      <h1>${esc(spec.name)}</h1>
      <p class="app-tagline">${esc(spec.tagline)}</p>
    </div>
    <div class="board" id="board">
${columnsHtml}
    </div>
  </main>
${renderFooter(spec)}`;

  const css = `${cssVariables(spec)}

${baseCss(spec)}

/* Kanban board */
.board-head { margin-bottom: 1.5rem; }
.app-tagline { color: var(--muted); margin-top: 0.25rem; }
.board { display: grid; gap: var(--gap); grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); align-items: start; }
.column {
  background: var(--surface-alt); border: 1px solid var(--border);
  border-radius: var(--radius-md); padding: 0.85rem; display: grid; gap: 0.75rem;
}
.column-head { display: flex; align-items: center; justify-content: space-between; }
.column-head h2 { font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); }
.column-count {
  min-width: 1.5rem; text-align: center; padding: 0.05rem 0.45rem;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-btn); font-size: 0.8rem; color: var(--muted);
}
.card-list { display: grid; gap: 0.5rem; min-height: 2.75rem; border-radius: var(--radius-sm); }
.card-list.is-over { outline: 2px dashed var(--primary); outline-offset: 3px; }
.kanban-card {
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm);
  padding: 0.65rem 0.75rem; display: flex; justify-content: space-between; gap: 0.5rem;
  cursor: grab; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}
.kanban-card:active { cursor: grabbing; }
.kanban-card.is-dragging { opacity: 0.45; }
.kanban-card span { overflow-wrap: anywhere; }
.card-remove { border: 0; background: transparent; color: var(--muted); cursor: pointer; align-self: start; }
.card-remove:hover { color: #D64550; }
.add-card { display: flex; gap: 0.4rem; }
.add-card input { flex: 1; background: var(--surface); }
.add-card .btn { padding-inline: 0.8rem; }`;

  const js = `(function () {
  'use strict';

  var STORAGE_KEY = '${storageKey}';
  var SEED_COLUMNS = ${toJsLiteral(seedColumns)};

  var board = document.getElementById('board');
  if (!board) return;

  var nextId = 1;

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (error) { /* storage unavailable — run in memory */ }
    return SEED_COLUMNS.map(function (column, index) {
      return {
        id: column.id,
        cards: column.cards.map(function (title, cardIndex) {
          return { id: 'seed-' + index + '-' + cardIndex, title: title };
        })
      };
    });
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(columns)); } catch (error) { /* ignore */ }
  }

  var columns = load();
  columns.forEach(function (column) {
    column.cards.forEach(function (card) {
      var match = /^card-(\\d+)$/.exec(card.id);
      if (match) nextId = Math.max(nextId, Number(match[1]) + 1);
    });
  });
  var draggedCardId = null;

  function findCard(cardId) {
    for (var i = 0; i < columns.length; i++) {
      for (var j = 0; j < columns[i].cards.length; j++) {
        if (columns[i].cards[j].id === cardId) {
          return { column: columns[i], index: j, card: columns[i].cards[j] };
        }
      }
    }
    return null;
  }

  function render() {
    columns.forEach(function (column) {
      var listEl = board.querySelector('[data-list="' + column.id + '"]');
      var countEl = board.querySelector('[data-count-for="' + column.id + '"]');
      if (!listEl) return;
      listEl.textContent = '';
      column.cards.forEach(function (card) {
        var el = document.createElement('article');
        el.className = 'kanban-card';
        el.draggable = true;
        el.setAttribute('data-card', card.id);

        var text = document.createElement('span');
        text.textContent = card.title;

        var remove = document.createElement('button');
        remove.className = 'card-remove';
        remove.type = 'button';
        remove.textContent = '\\u00d7';
        remove.setAttribute('aria-label', 'Remove "' + card.title + '"');
        remove.addEventListener('click', function () {
          var found = findCard(card.id);
          if (!found) return;
          found.column.cards.splice(found.index, 1);
          save();
          render();
        });

        el.addEventListener('dragstart', function (event) {
          draggedCardId = card.id;
          el.classList.add('is-dragging');
          if (event.dataTransfer) {
            event.dataTransfer.setData('text/plain', card.id);
            event.dataTransfer.effectAllowed = 'move';
          }
        });
        el.addEventListener('dragend', function () {
          draggedCardId = null;
          el.classList.remove('is-dragging');
        });

        el.appendChild(text);
        el.appendChild(remove);
        listEl.appendChild(el);
      });
      if (countEl) countEl.textContent = String(column.cards.length);
    });
  }

  columns.forEach(function (column) {
    var listEl = board.querySelector('[data-list="' + column.id + '"]');
    if (listEl) {
      listEl.addEventListener('dragover', function (event) {
        event.preventDefault();
        listEl.classList.add('is-over');
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
      });
      listEl.addEventListener('dragleave', function () {
        listEl.classList.remove('is-over');
      });
      listEl.addEventListener('drop', function (event) {
        event.preventDefault();
        listEl.classList.remove('is-over');
        var cardId = draggedCardId;
        if (!cardId && event.dataTransfer) cardId = event.dataTransfer.getData('text/plain');
        if (!cardId) return;
        var found = findCard(cardId);
        if (!found || found.column.id === column.id) return;
        found.column.cards.splice(found.index, 1);
        column.cards.push(found.card);
        save();
        render();
      });
    }

    var form = board.querySelector('[data-add-for="' + column.id + '"]');
    if (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        var input = form.querySelector('input');
        if (!input) return;
        var title = input.value.trim();
        if (!title) return;
        column.cards.push({ id: 'card-' + nextId++, title: title });
        input.value = '';
        save();
        render();
      });
    }
  });

  render();
})();`;

  return { body, css, js };
}
