/**
 * Notes template — sidebar list with live search, editor pane with
 * autosave, create/rename/delete, localStorage persistence.
 */
import { createRng } from '@/lib/seeded';
import type { ProjectSpec } from '../../types';
import {
  baseCss,
  cssVariables,
  renderFooter,
  renderHeader,
  slugify,
  toJsLiteral,
  type TemplateOutput,
} from '../shared';

const NOTE_POOL: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: 'Reading list',
    body: 'Books on the pile: a slim novel for evenings, one field guide, and that essay collection everyone keeps quoting.\n\nRule of the season: finish before buying.',
  },
  {
    title: 'Kickoff meeting notes',
    body: 'Scope is smaller than feared. Two milestones before the break.\n\nAction items:\n- circulate the summary\n- book the follow-up\n- ask about the budget line',
  },
  {
    title: 'Ideas parking lot',
    body: 'A weekly letter that is actually short. A shelf for unfinished projects. A timer that praises stopping on time.\n\nRevisit on the first of the month, delete freely.',
  },
  {
    title: 'Grocery staples',
    body: 'Oats, lemons, good bread, eggs, the decent olive oil, and whatever green thing looks freshest.\n\nDo not buy more jars. There are enough jars.',
  },
  {
    title: 'Trip sketch',
    body: 'Three days, one bag. Morning trains beat evening ones.\n\nMust do: the market, the long walk along the water, one aimless afternoon.',
  },
];

export function renderNotes(spec: ProjectSpec): TemplateOutput {
  const rng = createRng(`${spec.seed}:notes`);
  const noteCount = rng.int(3, 4);
  const start = rng.int(0, NOTE_POOL.length - 1);
  const seedNotes: Array<{ id: string; title: string; body: string }> = [];
  for (let i = 0; i < noteCount; i++) {
    const note = NOTE_POOL[(start + i) % NOTE_POOL.length];
    if (!note) continue;
    seedNotes.push({ id: `seed-${i + 1}`, title: note.title, body: note.body });
  }
  const storageKey = `promptly:${slugify(spec.name)}:notes`;

  const body = `${renderHeader(spec, [])}
  <main class="app-main container">
    <div class="notes-layout">
      <aside class="notes-sidebar card" aria-label="Notes">
        <div class="sidebar-tools">
          <label class="sr-only" for="note-search">Search notes</label>
          <input id="note-search" type="search" placeholder="Search notes" />
          <button id="note-new" class="btn btn-primary" type="button">New</button>
        </div>
        <ul id="note-list"></ul>
        <p id="notes-empty" hidden>No notes match. Try another search or start a new one.</p>
      </aside>
      <section class="note-editor card" aria-label="Editor">
        <div class="editor-bar">
          <label class="sr-only" for="note-title">Note title</label>
          <input id="note-title" type="text" placeholder="Untitled note" maxlength="80" />
          <button id="note-delete" class="btn btn-ghost" type="button">Delete</button>
        </div>
        <label class="sr-only" for="note-body">Note body</label>
        <textarea id="note-body" placeholder="Start writing…"></textarea>
        <p class="editor-status" id="note-status" role="status"></p>
      </section>
    </div>
  </main>
${renderFooter(spec)}`;

  const css = `${cssVariables(spec)}

${baseCss(spec)}

/* Notes app */
.notes-layout { display: grid; gap: var(--gap); grid-template-columns: minmax(220px, 280px) 1fr; align-items: start; }
.notes-sidebar { padding: 0.85rem; display: grid; gap: 0.75rem; }
.sidebar-tools { display: flex; gap: 0.5rem; }
.sidebar-tools input { flex: 1; min-width: 0; }
#note-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.25rem; max-height: 60vh; overflow-y: auto; }
.note-item {
  width: 100%; text-align: left; border: 0; background: transparent; color: var(--text);
  padding: 0.55rem 0.65rem; border-radius: var(--radius-sm); cursor: pointer; display: grid; gap: 0.1rem;
}
.note-item:hover { background: var(--surface-alt); }
.note-item.is-active { background: var(--primary-soft); }
.note-item strong { font-size: 0.92rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.note-item span { color: var(--muted); font-size: 0.8rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#notes-empty { color: var(--muted); font-size: 0.85rem; }
.note-editor { padding: 1rem; display: grid; gap: 0.75rem; }
.editor-bar { display: flex; gap: 0.5rem; }
.editor-bar input { flex: 1; font-weight: 700; font-size: 1.05rem; }
#note-body { min-height: 46vh; resize: vertical; line-height: 1.7; }
.editor-status { color: var(--muted); font-size: 0.8rem; min-height: 1.2em; margin: 0; }
@media (max-width: 720px) {
  .notes-layout { grid-template-columns: 1fr; }
  #note-list { max-height: 30vh; }
}`;

  const js = `(function () {
  'use strict';

  var STORAGE_KEY = '${storageKey}';
  var SEED_NOTES = ${toJsLiteral(seedNotes)};

  var searchInput = document.getElementById('note-search');
  var newButton = document.getElementById('note-new');
  var listEl = document.getElementById('note-list');
  var emptyEl = document.getElementById('notes-empty');
  var titleInput = document.getElementById('note-title');
  var bodyInput = document.getElementById('note-body');
  var deleteButton = document.getElementById('note-delete');
  var statusEl = document.getElementById('note-status');
  if (!listEl || !titleInput || !bodyInput) return;

  var nextId = 1;
  var saveTimer = null;

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (error) { /* storage unavailable — run in memory */ }
    return SEED_NOTES.slice();
  }

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(notes)); } catch (error) { /* ignore */ }
  }

  var notes = load();
  notes.forEach(function (note) {
    var match = /^note-(\\d+)$/.exec(note.id);
    if (match) nextId = Math.max(nextId, Number(match[1]) + 1);
  });
  var activeId = notes.length > 0 ? notes[0].id : null;
  var query = '';

  function activeNote() {
    for (var i = 0; i < notes.length; i++) {
      if (notes[i].id === activeId) return notes[i];
    }
    return null;
  }

  function matches(note) {
    if (!query) return true;
    var haystack = (note.title + ' ' + note.body).toLowerCase();
    return haystack.indexOf(query) !== -1;
  }

  function renderList() {
    listEl.textContent = '';
    var visible = notes.filter(matches);
    visible.forEach(function (note) {
      var item = document.createElement('li');
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'note-item' + (note.id === activeId ? ' is-active' : '');

      var title = document.createElement('strong');
      title.textContent = note.title || 'Untitled note';
      var preview = document.createElement('span');
      preview.textContent = note.body.split('\\n')[0] || 'Empty note';

      button.appendChild(title);
      button.appendChild(preview);
      button.addEventListener('click', function () {
        activeId = note.id;
        renderEditor();
        renderList();
      });
      item.appendChild(button);
      listEl.appendChild(item);
    });
    if (emptyEl) emptyEl.hidden = visible.length > 0;
  }

  function renderEditor() {
    var note = activeNote();
    var enabled = note !== null;
    titleInput.disabled = !enabled;
    bodyInput.disabled = !enabled;
    titleInput.value = note ? note.title : '';
    bodyInput.value = note ? note.body : '';
    if (statusEl) statusEl.textContent = note ? 'Saved' : 'Select or create a note to begin.';
  }

  function scheduleSave() {
    var note = activeNote();
    if (!note) return;
    note.title = titleInput.value;
    note.body = bodyInput.value;
    if (statusEl) statusEl.textContent = 'Saving\\u2026';
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      persist();
      if (statusEl) statusEl.textContent = 'Saved';
      renderList();
    }, 250);
  }

  titleInput.addEventListener('input', scheduleSave);
  bodyInput.addEventListener('input', scheduleSave);

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      query = searchInput.value.trim().toLowerCase();
      renderList();
    });
  }

  if (newButton) {
    newButton.addEventListener('click', function () {
      var note = { id: 'note-' + nextId++, title: 'Untitled note', body: '' };
      notes.unshift(note);
      activeId = note.id;
      persist();
      renderList();
      renderEditor();
      titleInput.focus();
      titleInput.select();
    });
  }

  if (deleteButton) {
    deleteButton.addEventListener('click', function () {
      if (!activeId) return;
      notes = notes.filter(function (note) { return note.id !== activeId; });
      activeId = notes.length > 0 ? notes[0].id : null;
      persist();
      renderList();
      renderEditor();
    });
  }

  renderList();
  renderEditor();
})();`;

  return { body, css, js };
}
