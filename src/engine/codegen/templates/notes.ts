/**
 * Notes template — a pinned + tagged notebook: sidebar with live search
 * (matches highlighted), tag chip filter, pinned section, an editor pane
 * with autosave indicator and a live preview that renders a safe,
 * lightweight markdown subset (**bold**, *italic*, "- " lists — everything
 * else escaped). Persists to localStorage.
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
  type TemplateOutput,
} from '../shared';

interface SeedNote {
  id: string;
  title: string;
  body: string;
  tags: string[];
  pinned: boolean;
}

export function renderNotes(spec: ProjectSpec): TemplateOutput {
  const rng = createRng(`${spec.seed}:notes`);
  const content = contentFor(spec.topic, createRng(`${spec.seed}:content`));
  const { archetype } = spec.style;
  const isBrut = archetype === 'brutalist';

  // Topic-appropriate tags: lowercased product categories plus one evergreen.
  const tagPool: string[] = [];
  for (const product of content.products) {
    const tag = product.category.toLowerCase();
    if (!tagPool.includes(tag)) tagPool.push(tag);
    if (tagPool.length === 3) break;
  }
  tagPool.push('ideas');

  const noteCount = Math.min(rng.int(4, 5), content.noteTitles.length);
  const seedNotes: SeedNote[] = [];
  for (let i = 0; i < noteCount; i++) {
    const title = content.noteTitles[i];
    if (!title) continue;
    const excerpt = content.posts[i % content.posts.length]?.excerpt ?? '';
    const todoA = content.todoIdeas[i % content.todoIdeas.length] ?? 'follow up';
    const todoB = content.todoIdeas[(i + 2) % content.todoIdeas.length] ?? 'review notes';
    const body = `${excerpt}\n\n**Next up**\n- ${todoA.toLowerCase()}\n- ${todoB.toLowerCase()}\n\n*Reviewed this week.*`;
    const tagA = tagPool[i % tagPool.length] ?? 'ideas';
    const tagB = tagPool[(i + 1) % tagPool.length] ?? 'ideas';
    seedNotes.push({
      id: `seed-${i + 1}`,
      title,
      body,
      tags: rng.chance(0.5) ? [tagA, tagB] : [tagA],
      pinned: i === 0,
    });
  }
  const storageKey = `promptly:${slugify(spec.name)}:notes:v2`;

  const body = `${renderHeader(spec, [])}
  <main class="app-main container">
    <div class="notes-head">
      <h1>${esc(spec.name)}</h1>
      <p class="app-tagline">${esc(spec.tagline)}</p>
    </div>
    <div class="notes-layout">
      <aside class="notes-sidebar card" aria-label="Notes">
        <div class="sidebar-tools">
          <label class="sr-only" for="note-search">Search notes</label>
          <input id="note-search" type="search" placeholder="Search notes" />
          <button id="note-new" class="btn btn-primary" type="button">New</button>
        </div>
        <div class="tag-row" id="tag-row" role="group" aria-label="Filter by tag"></div>
        <div class="note-groups">
          <div class="note-group" id="pinned-group" hidden>
            <h2 class="group-label">${icon('star', 'group-glyph')}Pinned</h2>
            <ul class="note-list" id="pinned-list"></ul>
          </div>
          <div class="note-group">
            <h2 class="group-label" id="notes-label">Notes</h2>
            <ul class="note-list" id="note-list"></ul>
          </div>
        </div>
        <p id="notes-empty" hidden>No notes match. Try another search or start a new one.</p>
      </aside>
      <section class="note-workspace" aria-label="Editor">
        <div class="note-editor card">
          <div class="editor-bar">
            <label class="sr-only" for="note-title">Note title</label>
            <input id="note-title" type="text" placeholder="Untitled note" maxlength="80" />
            <button id="note-pin" class="pin-btn" type="button" aria-pressed="false" aria-label="Pin note">${icon('star', 'pin-glyph')}</button>
            <button id="note-delete" class="btn btn-ghost" type="button">Delete</button>
          </div>
          <div class="editor-tags">
            <label for="note-tags">Tags</label>
            <input id="note-tags" type="text" placeholder="comma, separated" maxlength="80" />
          </div>
          <label class="sr-only" for="note-body">Note body</label>
          <textarea id="note-body" placeholder="Write with **bold**, *italic* and - lists…"></textarea>
          <p class="editor-status" id="note-status" role="status"></p>
        </div>
        <div class="note-preview card" aria-label="Preview">
          <h2 class="preview-label">Preview</h2>
          <div id="note-preview" class="preview-body"></div>
        </div>
      </section>
    </div>
  </main>
${renderFooter(spec)}`;

  const hairline = isBrut ? '2px solid var(--text)' : '1px solid var(--border)';

  const css = `${cssVariables(spec)}

${baseCss(spec)}

/* Notes app */
.notes-head { margin-bottom: 1.25rem; }
.notes-head h1 { font-size: clamp(1.4rem, 3.5vw, 1.9rem); }
.app-tagline { color: var(--muted); margin-top: 0.25rem; font-size: 0.92rem; }
.notes-layout { display: grid; gap: var(--gap); grid-template-columns: minmax(230px, 290px) 1fr; align-items: start; }
.notes-sidebar { padding: 0.85rem; display: grid; gap: 0.75rem; }
.sidebar-tools { display: flex; gap: 0.5rem; }
.sidebar-tools input { flex: 1; min-width: 0; }

/* Tag chips */
.tag-row { display: flex; flex-wrap: wrap; gap: 0.3rem; }
.tag-chip {
  border: ${isBrut ? '2px solid var(--text)' : '1px solid var(--border)'}; background: transparent; color: var(--muted);
  border-radius: var(--radius-btn); padding: 0.14rem 0.6rem; cursor: pointer;
  font-size: 0.74rem; font-weight: 700; letter-spacing: 0.03em;
}
.tag-chip:hover { color: var(--primary); border-color: var(--primary); }
.tag-chip.is-active { background: var(--primary-soft); color: var(--primary-strong); border-color: ${isBrut ? 'var(--text)' : 'transparent'}; }

/* Note list */
.note-groups { display: grid; gap: 0.75rem; }
.group-label {
  display: flex; align-items: center; gap: 0.35rem; font-size: 0.7rem; color: var(--muted);
  text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 0.35rem;
}
.group-glyph { width: 0.8rem; height: 0.8rem; }
.note-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.25rem; max-height: 26vh; overflow-y: auto; }
.note-item {
  width: 100%; text-align: left; border: 0; background: transparent; color: var(--text);
  padding: 0.55rem 0.65rem; border-radius: var(--radius-sm); cursor: pointer; display: grid; gap: 0.15rem;
}
.note-item:hover { background: var(--surface-alt); }
.note-item.is-active { background: var(--primary-soft); }
.note-item strong { font-size: 0.92rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.note-item .note-snippet { color: var(--muted); font-size: 0.8rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.note-item mark { background: var(--accent-soft); color: inherit; border-radius: 2px; padding: 0 1px; }
.note-item-tags { display: flex; gap: 0.25rem; flex-wrap: wrap; margin-top: 0.15rem; }
.note-item-tags span { font-size: 0.64rem; font-weight: 700; color: var(--primary-strong); background: var(--primary-soft); border-radius: var(--radius-btn); padding: 0.02rem 0.4rem; }
#notes-empty { color: var(--muted); font-size: 0.85rem; }

/* Editor + preview */
.note-workspace { display: grid; gap: var(--gap); grid-template-columns: 1fr 1fr; align-items: start; }
.note-editor { padding: 1rem; display: grid; gap: 0.75rem; }
.editor-bar { display: flex; gap: 0.5rem; align-items: center; }
.editor-bar input { flex: 1; font-weight: 700; font-size: 1.05rem; min-width: 0; }
.pin-btn {
  border: ${isBrut ? '2px solid var(--text)' : '1px solid var(--border)'}; background: var(--surface); color: var(--muted);
  border-radius: var(--radius-btn); width: 2.2rem; height: 2.2rem; display: grid; place-items: center;
  cursor: pointer; flex: none; padding: 0;
}
.pin-btn:hover { color: var(--primary); border-color: var(--primary); }
.pin-btn[aria-pressed='true'] { color: var(--primary-contrast); background: var(--primary); border-color: var(--primary); }
.pin-glyph { width: 1rem; height: 1rem; }
.editor-tags { display: flex; align-items: center; gap: 0.5rem; }
.editor-tags label { font-size: 0.72rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; }
.editor-tags input { flex: 1; font-size: 0.85rem; }
#note-body { min-height: 40vh; resize: vertical; line-height: 1.7; }
.editor-status { color: var(--muted); font-size: 0.8rem; min-height: 1.2em; margin: 0; }

.note-preview { padding: 1rem; display: grid; gap: 0.5rem; align-content: start; }
.preview-label { font-size: 0.7rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.12em; padding-bottom: 0.4rem; border-bottom: ${hairline}; }
.preview-body { font-size: 0.94rem; line-height: 1.7; display: grid; gap: 0.6rem; min-height: 8rem; }
.preview-body p { margin: 0; }
.preview-body ul { margin: 0; padding-left: 1.2rem; display: grid; gap: 0.25rem; }
.preview-body .preview-empty { color: var(--muted); }

@media (max-width: 940px) {
  .note-workspace { grid-template-columns: 1fr; }
}
@media (max-width: 720px) {
  .notes-layout { grid-template-columns: 1fr; }
  .note-list { max-height: 20vh; }
}`;

  const js = `(function () {
  'use strict';

  var STORAGE_KEY = '${storageKey}';
  var SEED_NOTES = ${toJsLiteral(seedNotes)};

  var searchInput = document.getElementById('note-search');
  var newButton = document.getElementById('note-new');
  var tagRow = document.getElementById('tag-row');
  var pinnedGroup = document.getElementById('pinned-group');
  var pinnedList = document.getElementById('pinned-list');
  var listEl = document.getElementById('note-list');
  var notesLabel = document.getElementById('notes-label');
  var emptyEl = document.getElementById('notes-empty');
  var titleInput = document.getElementById('note-title');
  var tagsInput = document.getElementById('note-tags');
  var pinButton = document.getElementById('note-pin');
  var bodyInput = document.getElementById('note-body');
  var deleteButton = document.getElementById('note-delete');
  var statusEl = document.getElementById('note-status');
  var previewEl = document.getElementById('note-preview');
  if (!listEl || !titleInput || !bodyInput) return;

  var nextId = 1;
  var saveTimer = null;
  var query = '';
  var activeTag = null;

  function sanitize(parsed) {
    if (!Array.isArray(parsed)) return null;
    var clean = [];
    for (var i = 0; i < parsed.length; i++) {
      var note = parsed[i];
      if (!note || typeof note.title !== 'string') continue;
      var tags = [];
      if (Array.isArray(note.tags)) {
        for (var j = 0; j < note.tags.length; j++) {
          if (typeof note.tags[j] === 'string' && note.tags[j]) tags.push(note.tags[j]);
        }
      }
      clean.push({
        id: typeof note.id === 'string' ? note.id : 'note-x' + i,
        title: note.title,
        body: typeof note.body === 'string' ? note.body : '',
        tags: tags,
        pinned: !!note.pinned
      });
    }
    return clean;
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = sanitize(JSON.parse(raw));
        if (parsed) return parsed;
      }
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

  function activeNote() {
    for (var i = 0; i < notes.length; i++) {
      if (notes[i].id === activeId) return notes[i];
    }
    return null;
  }

  /* --------------------- lightweight markdown ---------------------- */

  function escapeHtml(text) {
    return text
      .split('&').join('&amp;')
      .split('<').join('&lt;')
      .split('>').join('&gt;')
      .split('"').join('&quot;')
      .split("'").join('&#39;');
  }

  function inlineMarkdown(escaped) {
    // **bold** first so single stars cannot eat the doubles.
    return escaped
      .replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>')
      .replace(/\\*([^*]+)\\*/g, '<em>$1</em>');
  }

  // Renders the supported markdown subset; every character is escaped
  // before any tags are introduced, so arbitrary input stays inert.
  function renderMarkdown(text) {
    var lines = text.split('\\n');
    var html = [];
    var paragraph = [];
    var listItems = [];

    function flushParagraph() {
      if (paragraph.length === 0) return;
      html.push('<p>' + inlineMarkdown(escapeHtml(paragraph.join(' '))) + '</p>');
      paragraph = [];
    }
    function flushList() {
      if (listItems.length === 0) return;
      var items = listItems.map(function (item) {
        return '<li>' + inlineMarkdown(escapeHtml(item)) + '</li>';
      });
      html.push('<ul>' + items.join('') + '</ul>');
      listItems = [];
    }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (/^\\s*-\\s+/.test(line)) {
        flushParagraph();
        listItems.push(line.replace(/^\\s*-\\s+/, ''));
      } else if (line.trim() === '') {
        flushParagraph();
        flushList();
      } else {
        flushList();
        paragraph.push(line.trim());
      }
    }
    flushParagraph();
    flushList();
    return html.join('');
  }

  function renderPreview() {
    if (!previewEl) return;
    var note = activeNote();
    if (!note || !note.body.trim()) {
      previewEl.innerHTML = '<p class="preview-empty">Nothing to preview yet.</p>';
      return;
    }
    previewEl.innerHTML = renderMarkdown(note.body);
  }

  /* -------------------------- sidebar ------------------------------ */

  function matches(note) {
    if (activeTag && note.tags.indexOf(activeTag) === -1) return false;
    if (!query) return true;
    var haystack = (note.title + ' ' + note.body).toLowerCase();
    return haystack.indexOf(query) !== -1;
  }

  // Appends text with every query match wrapped in <mark>, using DOM
  // nodes so note content is never parsed as HTML.
  function appendHighlighted(host, text) {
    if (!query) {
      host.appendChild(document.createTextNode(text));
      return;
    }
    var lower = text.toLowerCase();
    var from = 0;
    var at = lower.indexOf(query, from);
    while (at !== -1) {
      if (at > from) host.appendChild(document.createTextNode(text.slice(from, at)));
      var mark = document.createElement('mark');
      mark.textContent = text.slice(at, at + query.length);
      host.appendChild(mark);
      from = at + query.length;
      at = lower.indexOf(query, from);
    }
    if (from < text.length) host.appendChild(document.createTextNode(text.slice(from)));
  }

  function buildItem(note) {
    var item = document.createElement('li');
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'note-item' + (note.id === activeId ? ' is-active' : '');

    var title = document.createElement('strong');
    appendHighlighted(title, note.title || 'Untitled note');
    var snippet = document.createElement('span');
    snippet.className = 'note-snippet';
    appendHighlighted(snippet, note.body.split('\\n')[0] || 'Empty note');

    button.appendChild(title);
    button.appendChild(snippet);

    if (note.tags.length > 0) {
      var tagsEl = document.createElement('span');
      tagsEl.className = 'note-item-tags';
      note.tags.forEach(function (tag) {
        var chip = document.createElement('span');
        chip.textContent = tag;
        tagsEl.appendChild(chip);
      });
      button.appendChild(tagsEl);
    }

    button.addEventListener('click', function () {
      activeId = note.id;
      renderEditor();
      renderList();
    });
    item.appendChild(button);
    return item;
  }

  function renderTagRow() {
    if (!tagRow) return;
    tagRow.textContent = '';
    var all = [];
    notes.forEach(function (note) {
      note.tags.forEach(function (tag) {
        if (all.indexOf(tag) === -1) all.push(tag);
      });
    });
    if (activeTag && all.indexOf(activeTag) === -1) activeTag = null;
    if (all.length === 0) return;
    var everything = document.createElement('button');
    everything.type = 'button';
    everything.className = 'tag-chip' + (activeTag === null ? ' is-active' : '');
    everything.textContent = 'All';
    everything.addEventListener('click', function () {
      activeTag = null;
      renderList();
    });
    tagRow.appendChild(everything);
    all.forEach(function (tag) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'tag-chip' + (activeTag === tag ? ' is-active' : '');
      chip.textContent = tag;
      chip.addEventListener('click', function () {
        activeTag = activeTag === tag ? null : tag;
        renderList();
      });
      tagRow.appendChild(chip);
    });
  }

  function renderList() {
    renderTagRow();
    if (pinnedList) pinnedList.textContent = '';
    listEl.textContent = '';
    var visible = notes.filter(matches);
    var pinned = visible.filter(function (note) { return note.pinned; });
    var rest = visible.filter(function (note) { return !note.pinned; });
    if (pinnedGroup) pinnedGroup.hidden = pinned.length === 0;
    if (pinnedList) {
      pinned.forEach(function (note) { pinnedList.appendChild(buildItem(note)); });
    }
    rest.forEach(function (note) { listEl.appendChild(buildItem(note)); });
    if (notesLabel) notesLabel.textContent = pinned.length > 0 ? 'Others' : 'Notes';
    if (emptyEl) emptyEl.hidden = visible.length > 0;
  }

  /* --------------------------- editor ------------------------------ */

  function renderEditor() {
    var note = activeNote();
    var enabled = note !== null;
    titleInput.disabled = !enabled;
    bodyInput.disabled = !enabled;
    if (tagsInput) tagsInput.disabled = !enabled;
    titleInput.value = note ? note.title : '';
    bodyInput.value = note ? note.body : '';
    if (tagsInput) tagsInput.value = note ? note.tags.join(', ') : '';
    if (pinButton) pinButton.setAttribute('aria-pressed', note && note.pinned ? 'true' : 'false');
    if (statusEl) statusEl.textContent = note ? 'Saved' : 'Select or create a note to begin.';
    renderPreview();
  }

  function parseTags(raw) {
    var tags = [];
    raw.split(',').forEach(function (piece) {
      var tag = piece.trim().toLowerCase();
      if (tag && tags.indexOf(tag) === -1) tags.push(tag);
    });
    return tags.slice(0, 6);
  }

  function scheduleSave() {
    var note = activeNote();
    if (!note) return;
    note.title = titleInput.value;
    note.body = bodyInput.value;
    if (tagsInput) note.tags = parseTags(tagsInput.value);
    if (statusEl) statusEl.textContent = 'Saving\\u2026';
    renderPreview();
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      persist();
      if (statusEl) statusEl.textContent = 'Saved';
      renderList();
    }, 300);
  }

  titleInput.addEventListener('input', scheduleSave);
  bodyInput.addEventListener('input', scheduleSave);
  if (tagsInput) tagsInput.addEventListener('input', scheduleSave);

  if (pinButton) {
    pinButton.addEventListener('click', function () {
      var note = activeNote();
      if (!note) return;
      note.pinned = !note.pinned;
      pinButton.setAttribute('aria-pressed', note.pinned ? 'true' : 'false');
      persist();
      renderList();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      query = searchInput.value.trim().toLowerCase();
      renderList();
    });
  }

  if (newButton) {
    newButton.addEventListener('click', function () {
      var note = { id: 'note-' + nextId++, title: 'Untitled note', body: '', tags: [], pinned: false };
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
