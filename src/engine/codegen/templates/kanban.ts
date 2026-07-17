/**
 * Kanban template — a full board product: WIP-limited column counts,
 * colored topic-label chips on cards, a card edit modal (title / label /
 * notes) opened on click, an add-column flow, HTML5 drag & drop between
 * and within columns, scrolling column overflow and localStorage
 * persistence.
 */
import { createRng } from '@/lib/seeded';
import type { ProjectSpec } from '../../types';
import { contentFor } from '../content';
import { icon } from '../icons';
import {
  baseCss,
  cssVariables,
  esc,
  renderFooter,
  renderHeader,
  slugify,
  toJsLiteral,
  withAlpha,
  type TemplateOutput,
} from '../shared';

const COLUMN_SETS: ReadonlyArray<readonly [string, string, string]> = [
  ['Backlog', 'In progress', 'Shipped'],
  ['To do', 'Doing', 'Done'],
  ['Ideas', 'Building', 'Launched'],
];

interface SeedCard {
  id: string;
  title: string;
  label: number;
  notes: string;
}

interface SeedColumn {
  id: string;
  title: string;
  wip: number | null;
  cards: SeedCard[];
}

export function renderKanban(spec: ProjectSpec): TemplateOutput {
  const rng = createRng(`${spec.seed}:kanban`);
  const content = contentFor(spec.topic, createRng(`${spec.seed}:content`));
  const { archetype } = spec.style;
  const isBrut = archetype === 'brutalist';
  const columnNames = rng.pick(COLUMN_SETS);

  // Topic-appropriate label chips: the domain's product categories.
  const labels: string[] = [];
  for (const product of content.products) {
    if (!labels.includes(product.category)) labels.push(product.category);
    if (labels.length === 4) break;
  }
  while (labels.length < 4) labels.push(['Planning', 'Build', 'Review', 'Urgent'][labels.length] ?? 'General');

  const noteLines = [
    'Blocked on a decision — chase it up.',
    'Half done; the tricky part is next.',
    'Waiting on feedback from the team.',
    '',
    '',
  ];

  const pickCard = (offset: number): string =>
    content.kanbanCards[offset % content.kanbanCards.length] ?? 'Untitled card';
  let cardSeq = 0;
  const makeCard = (offset: number): SeedCard => {
    cardSeq += 1;
    return {
      id: `seed-${cardSeq}`,
      title: pickCard(offset),
      label: rng.int(0, labels.length - 1),
      notes: rng.pick(noteLines),
    };
  };

  const seedColumns: SeedColumn[] = [
    { id: 'col-1', title: columnNames[0], wip: null, cards: [makeCard(0), makeCard(1), makeCard(2), makeCard(3)] },
    { id: 'col-2', title: columnNames[1], wip: 3, cards: [makeCard(4), makeCard(5)] },
    { id: 'col-3', title: columnNames[2], wip: null, cards: [makeCard(6)] },
  ];
  const storageKey = `promptly:${slugify(spec.name)}:board:v2`;

  const body = `${renderHeader(spec, [])}
  <main class="app-main board-main">
    <div class="container board-head">
      <div>
        <h1>${esc(spec.name)}</h1>
        <p class="app-tagline">${esc(spec.tagline)}</p>
      </div>
      <button id="add-column-btn" class="btn btn-ghost" type="button">+ Add column</button>
    </div>
    <div class="board-scroll">
      <div class="board" id="board"></div>
    </div>
  </main>
  <div class="modal-backdrop" id="card-modal" hidden>
    <div class="modal card" role="dialog" aria-modal="true" aria-labelledby="modal-heading">
      <div class="modal-head">
        <h2 id="modal-heading">Edit card</h2>
        <button id="modal-close" class="modal-x" type="button" aria-label="Close">${icon('close')}</button>
      </div>
      <div class="field">
        <label for="modal-title">Title</label>
        <input id="modal-title" type="text" maxlength="120" />
      </div>
      <div class="field">
        <label for="modal-label">Label</label>
        <select id="modal-label">
${labels.map((label, i) => `          <option value="${i}">${esc(label)}</option>`).join('\n')}
        </select>
      </div>
      <div class="field">
        <label for="modal-notes">Notes</label>
        <textarea id="modal-notes" rows="4" placeholder="Anything worth remembering…"></textarea>
      </div>
      <div class="modal-actions">
        <button id="modal-delete" class="btn btn-ghost" type="button">Delete</button>
        <button id="modal-save" class="btn btn-primary" type="button">Save</button>
      </div>
    </div>
  </div>
${renderFooter(spec)}`;

  const chipTints = [
    `background: var(--primary-soft); color: var(--primary-strong);`,
    `background: var(--accent-soft); color: var(--text);`,
    `background: ${withAlpha('#D64550', 0.14)}; color: #D64550;`,
    `background: var(--surface-alt); color: var(--muted);`,
  ];

  const css = `${cssVariables(spec)}

${baseCss(spec)}

/* Kanban board */
.board-main { display: grid; gap: 1.25rem; }
.board-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; }
.app-tagline { color: var(--muted); margin-top: 0.25rem; }
.board-scroll { overflow-x: auto; padding-inline: max(1.25rem, calc((100% - 68rem) / 2)); padding-bottom: 1rem; }
.board { display: flex; gap: var(--gap); align-items: flex-start; min-height: 18rem; }
.column {
  background: var(--surface-alt); border: ${isBrut ? '3px solid var(--text)' : '1px solid var(--border)'};
  border-radius: var(--radius-md); padding: 0.85rem; display: grid; gap: 0.75rem;
  flex: 0 0 17rem; max-width: 17rem;${isBrut ? ' box-shadow: var(--shadow);' : ''}
}
.column-head { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
.column-head h2 { font-size: 0.92rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.column-count {
  min-width: 1.7rem; text-align: center; padding: 0.05rem 0.45rem; flex: none;
  background: var(--surface); border: ${isBrut ? '2px solid var(--text)' : '1px solid var(--border)'};
  border-radius: var(--radius-btn); font-size: 0.76rem; font-weight: 700; color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.column-count.is-over-wip { background: ${withAlpha('#D64550', 0.14)}; color: #D64550; border-color: #D64550; }
.card-list { display: grid; gap: 0.5rem; min-height: 2.75rem; max-height: 55vh; overflow-y: auto; border-radius: var(--radius-sm); align-content: start; }
.card-list.is-over { outline: 2px dashed var(--primary); outline-offset: 3px; }
.kanban-card {
  background: var(--surface); border: ${isBrut ? '2px solid var(--text)' : '1px solid var(--border)'}; border-radius: var(--radius-sm);
  padding: 0.65rem 0.75rem; display: grid; gap: 0.45rem; cursor: pointer; text-align: left; width: 100%;
  ${archetype === 'minimal' ? '' : 'box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);'}
}
.kanban-card:hover { border-color: var(--primary); }
.kanban-card.is-dragging { opacity: 0.45; }
.kanban-card.is-drop-target { outline: 2px dashed var(--primary); outline-offset: 2px; }
.kanban-card-title { overflow-wrap: anywhere; font-size: 0.92rem; font-weight: 600; }
.kanban-card-meta { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }
.label-chip {
  padding: 0.06rem 0.5rem; border-radius: var(--radius-btn); font-size: 0.68rem;
  font-weight: 800; letter-spacing: 0.03em;${isBrut ? ' border: 2px solid var(--text);' : ''}
}
.chip-0 { ${chipTints[0]} }
.chip-1 { ${chipTints[1]} }
.chip-2 { ${chipTints[2]} }
.chip-3 { ${chipTints[3]} }
.note-flag { display: inline-flex; align-items: center; color: var(--muted); font-size: 0.7rem; gap: 0.25rem; }
.add-card { display: flex; gap: 0.4rem; }
.add-card input { flex: 1; background: var(--surface); min-width: 0; }
.add-card .btn { padding-inline: 0.8rem; }
.add-column-form { display: grid; gap: 0.5rem; flex: 0 0 15rem; padding: 0.85rem; border: 2px dashed var(--border); border-radius: var(--radius-md); }
.add-column-form[hidden] { display: none; }

/* Card modal */
.modal-backdrop {
  position: fixed; inset: 0; z-index: 60; display: grid; place-items: center;
  background: rgba(10, 12, 16, 0.55); padding: 1.25rem;
}
.modal-backdrop[hidden] { display: none; }
.modal { width: min(26rem, 100%); padding: 1.25rem; display: grid; gap: 0.9rem; background: var(--surface); }
.modal-head { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.modal-head h2 { font-size: 1.05rem; }
.modal-x { border: 0; background: transparent; color: var(--muted); cursor: pointer; padding: 0.2rem; }
.modal-x:hover { color: var(--text); }
.modal-x svg { width: 1.1rem; height: 1.1rem; }
.field { display: grid; gap: 0.35rem; }
.modal-actions { display: flex; justify-content: space-between; gap: 0.6rem; }

@media (max-width: 700px) {
  .board-scroll { padding-inline: 1.25rem; }
  .column { flex-basis: 15rem; }
}`;

  const js = `(function () {
  'use strict';

  var STORAGE_KEY = '${storageKey}';
  var SEED_COLUMNS = ${toJsLiteral(seedColumns)};
  var LABELS = ${toJsLiteral(labels)};

  var board = document.getElementById('board');
  var modal = document.getElementById('card-modal');
  var modalTitle = document.getElementById('modal-title');
  var modalLabel = document.getElementById('modal-label');
  var modalNotes = document.getElementById('modal-notes');
  var modalSave = document.getElementById('modal-save');
  var modalDelete = document.getElementById('modal-delete');
  var modalClose = document.getElementById('modal-close');
  var addColumnBtn = document.getElementById('add-column-btn');
  if (!board) return;

  var nextCardId = 1;
  var nextColId = 4;
  var draggedCardId = null;
  var editingCardId = null;
  var suppressClick = false;

  function sanitize(parsed) {
    if (!Array.isArray(parsed)) return null;
    var clean = [];
    for (var i = 0; i < parsed.length; i++) {
      var column = parsed[i];
      if (!column || typeof column.title !== 'string' || !Array.isArray(column.cards)) continue;
      var cards = [];
      for (var j = 0; j < column.cards.length; j++) {
        var card = column.cards[j];
        if (!card || typeof card.title !== 'string') continue;
        cards.push({
          id: typeof card.id === 'string' ? card.id : 'card-x' + i + '-' + j,
          title: card.title,
          label: typeof card.label === 'number' && LABELS[card.label] ? card.label : 0,
          notes: typeof card.notes === 'string' ? card.notes : ''
        });
      }
      clean.push({
        id: typeof column.id === 'string' ? column.id : 'col-x' + i,
        title: column.title,
        wip: typeof column.wip === 'number' ? column.wip : null,
        cards: cards
      });
    }
    return clean.length > 0 ? clean : null;
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = sanitize(JSON.parse(raw));
        if (parsed) return parsed;
      }
    } catch (error) { /* storage unavailable — run in memory */ }
    return SEED_COLUMNS.map(function (column) {
      return {
        id: column.id,
        title: column.title,
        wip: column.wip,
        cards: column.cards.map(function (card) {
          return { id: card.id, title: card.title, label: card.label, notes: card.notes };
        })
      };
    });
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(columns)); } catch (error) { /* ignore */ }
  }

  var columns = load();
  columns.forEach(function (column) {
    var colMatch = /^col-(\\d+)$/.exec(column.id);
    if (colMatch) nextColId = Math.max(nextColId, Number(colMatch[1]) + 1);
    column.cards.forEach(function (card) {
      var match = /^card-(\\d+)$/.exec(card.id);
      if (match) nextCardId = Math.max(nextCardId, Number(match[1]) + 1);
    });
  });

  function findCard(cardId) {
    if (!cardId) return null;
    for (var i = 0; i < columns.length; i++) {
      for (var j = 0; j < columns[i].cards.length; j++) {
        if (columns[i].cards[j].id === cardId) {
          return { column: columns[i], index: j, card: columns[i].cards[j] };
        }
      }
    }
    return null;
  }

  /* ---------------------------- modal ------------------------------ */

  function openModal(cardId) {
    var found = findCard(cardId);
    if (!found || !modal || !modalTitle || !modalLabel || !modalNotes) return;
    editingCardId = cardId;
    modalTitle.value = found.card.title;
    modalLabel.value = String(found.card.label);
    modalNotes.value = found.card.notes;
    modal.hidden = false;
    modalTitle.focus();
  }

  function closeModal() {
    if (modal) modal.hidden = true;
    editingCardId = null;
  }

  if (modalSave) {
    modalSave.addEventListener('click', function () {
      var found = findCard(editingCardId);
      if (found && modalTitle && modalLabel && modalNotes) {
        var title = modalTitle.value.trim();
        if (title) found.card.title = title;
        var label = parseInt(modalLabel.value, 10);
        found.card.label = isFinite(label) && LABELS[label] ? label : 0;
        found.card.notes = modalNotes.value;
        save();
        render();
      }
      closeModal();
    });
  }
  if (modalDelete) {
    modalDelete.addEventListener('click', function () {
      var found = findCard(editingCardId);
      if (found) {
        found.column.cards.splice(found.index, 1);
        save();
        render();
      }
      closeModal();
    });
  }
  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (modal) {
    modal.addEventListener('click', function (event) {
      if (event.target === modal) closeModal();
    });
  }
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && modal && !modal.hidden) closeModal();
  });

  /* --------------------------- rendering --------------------------- */

  function buildCard(card) {
    var el = document.createElement('article');
    el.className = 'kanban-card';
    el.draggable = true;
    el.tabIndex = 0;
    el.setAttribute('data-card', card.id);
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', 'Edit "' + card.title + '"');

    var title = document.createElement('span');
    title.className = 'kanban-card-title';
    title.textContent = card.title;
    el.appendChild(title);

    var meta = document.createElement('span');
    meta.className = 'kanban-card-meta';
    var chip = document.createElement('span');
    chip.className = 'label-chip chip-' + (card.label % 4);
    chip.textContent = LABELS[card.label] || LABELS[0];
    meta.appendChild(chip);
    if (card.notes) {
      var flag = document.createElement('span');
      flag.className = 'note-flag';
      flag.textContent = 'notes';
      meta.appendChild(flag);
    }
    el.appendChild(meta);

    el.addEventListener('click', function () {
      // A cancelled drag can still emit a click in some browsers.
      if (suppressClick) return;
      openModal(card.id);
    });
    el.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openModal(card.id);
      }
    });

    el.addEventListener('dragstart', function (event) {
      draggedCardId = card.id;
      suppressClick = true;
      el.classList.add('is-dragging');
      if (event.dataTransfer) {
        event.dataTransfer.setData('text/plain', card.id);
        event.dataTransfer.effectAllowed = 'move';
      }
    });
    el.addEventListener('dragend', function () {
      draggedCardId = null;
      el.classList.remove('is-dragging');
      setTimeout(function () { suppressClick = false; }, 0);
    });
    el.addEventListener('dragover', function (event) {
      if (!draggedCardId || draggedCardId === card.id) return;
      event.preventDefault();
      event.stopPropagation();
      el.classList.add('is-drop-target');
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    });
    el.addEventListener('dragleave', function () {
      el.classList.remove('is-drop-target');
    });
    el.addEventListener('drop', function (event) {
      event.preventDefault();
      event.stopPropagation();
      el.classList.remove('is-drop-target');
      var cardId = draggedCardId;
      if (!cardId && event.dataTransfer) cardId = event.dataTransfer.getData('text/plain');
      var found = findCard(cardId);
      var target = findCard(card.id);
      if (!found || !target || found.card.id === target.card.id) return;
      found.column.cards.splice(found.index, 1);
      // Recompute the target index — removal may have shifted it.
      var index = target.column.cards.indexOf(target.card);
      target.column.cards.splice(index, 0, found.card);
      save();
      render();
    });

    return el;
  }

  function buildColumn(column) {
    var section = document.createElement('section');
    section.className = 'column';
    section.setAttribute('data-column', column.id);

    var head = document.createElement('header');
    head.className = 'column-head';
    var heading = document.createElement('h2');
    heading.textContent = column.title;
    var count = document.createElement('span');
    var over = column.wip !== null && column.cards.length > column.wip;
    count.className = 'column-count' + (over ? ' is-over-wip' : '');
    count.textContent = column.wip === null
      ? String(column.cards.length)
      : column.cards.length + '/' + column.wip;
    count.setAttribute('aria-label', column.cards.length + ' cards' + (column.wip === null ? '' : ', limit ' + column.wip));
    head.appendChild(heading);
    head.appendChild(count);
    section.appendChild(head);

    var listEl = document.createElement('div');
    listEl.className = 'card-list';
    listEl.setAttribute('aria-label', column.title + ' cards');
    column.cards.forEach(function (card) {
      listEl.appendChild(buildCard(card));
    });
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
      var found = findCard(cardId);
      if (!found) return;
      found.column.cards.splice(found.index, 1);
      column.cards.push(found.card);
      save();
      render();
    });
    section.appendChild(listEl);

    var form = document.createElement('form');
    form.className = 'add-card';
    form.autocomplete = 'off';
    var label = document.createElement('label');
    label.className = 'sr-only';
    label.setAttribute('for', 'add-' + column.id);
    label.textContent = 'Add card to ' + column.title;
    var inputEl = document.createElement('input');
    inputEl.id = 'add-' + column.id;
    inputEl.type = 'text';
    inputEl.placeholder = 'Add a card';
    inputEl.maxLength = 120;
    var button = document.createElement('button');
    button.className = 'btn btn-ghost';
    button.type = 'submit';
    button.textContent = '+';
    form.appendChild(label);
    form.appendChild(inputEl);
    form.appendChild(button);
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var title = inputEl.value.trim();
      if (!title) return;
      column.cards.push({ id: 'card-' + nextCardId++, title: title, label: 0, notes: '' });
      inputEl.value = '';
      save();
      render();
    });
    section.appendChild(form);

    return section;
  }

  var addColumnForm = null;

  function buildAddColumnForm() {
    var form = document.createElement('form');
    form.className = 'add-column-form';
    form.hidden = true;
    var label = document.createElement('label');
    label.className = 'sr-only';
    label.setAttribute('for', 'new-column-name');
    label.textContent = 'New column name';
    var inputEl = document.createElement('input');
    inputEl.id = 'new-column-name';
    inputEl.type = 'text';
    inputEl.placeholder = 'Column name';
    inputEl.maxLength = 40;
    var button = document.createElement('button');
    button.className = 'btn btn-primary';
    button.type = 'submit';
    button.textContent = 'Add column';
    form.appendChild(label);
    form.appendChild(inputEl);
    form.appendChild(button);
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var title = inputEl.value.trim();
      if (!title) return;
      columns.push({ id: 'col-' + nextColId++, title: title, wip: null, cards: [] });
      inputEl.value = '';
      form.hidden = true;
      save();
      render();
    });
    return form;
  }

  function render() {
    var wasOpen = addColumnForm && !addColumnForm.hidden;
    board.textContent = '';
    columns.forEach(function (column) {
      board.appendChild(buildColumn(column));
    });
    addColumnForm = buildAddColumnForm();
    addColumnForm.hidden = !wasOpen;
    board.appendChild(addColumnForm);
  }

  if (addColumnBtn) {
    addColumnBtn.addEventListener('click', function () {
      if (!addColumnForm) return;
      addColumnForm.hidden = !addColumnForm.hidden;
      if (!addColumnForm.hidden) {
        var inputEl = addColumnForm.querySelector('input');
        if (inputEl) inputEl.focus();
      }
    });
  }

  render();
})();`;

  return { body, css, js };
}
