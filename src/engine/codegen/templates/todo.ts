/**
 * To-do template — a grouped task manager: Today / Later / Done sections,
 * priority pills, relative due-date labels from seeded offsets, a progress
 * ring in the header, filters, Enter-to-add, drag-to-reorder within a
 * group (HTML5 DnD) and localStorage persistence.
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

const EMPTY_MESSAGES: readonly string[] = [
  'Nothing here — enjoy the quiet or add a task above.',
  'All clear. Add something when inspiration strikes.',
  'An empty list is a finished list. Nicely done.',
];

type Priority = 'low' | 'med' | 'high';
const PRIORITIES: readonly Priority[] = ['low', 'med', 'high'];

interface SeedTask {
  id: string;
  title: string;
  done: boolean;
  priority: Priority;
  /** Days from "today"; negative = overdue, null = unscheduled. */
  due: number | null;
}

export function renderTodo(spec: ProjectSpec): TemplateOutput {
  const rng = createRng(`${spec.seed}:todo`);
  const content = contentFor(spec.topic, createRng(`${spec.seed}:content`));
  const { archetype } = spec.style;
  const isBrut = archetype === 'brutalist';

  const taskCount = Math.min(rng.int(5, 6), content.todoIdeas.length);
  const seedTasks: SeedTask[] = [];
  for (let i = 0; i < taskCount; i++) {
    const title = content.todoIdeas[i] ?? 'Take a short walk';
    const due = rng.chance(0.8) ? rng.int(-1, 8) : null;
    seedTasks.push({
      id: `seed-${i + 1}`,
      title,
      done: i >= taskCount - 2 && rng.chance(0.7),
      priority: PRIORITIES[rng.int(0, PRIORITIES.length - 1)] ?? 'med',
      due,
    });
  }
  // Guarantee at least one task lands in "Today" so the grouping shows.
  const firstOpen = seedTasks.find((task) => !task.done);
  if (firstOpen) firstOpen.due = 0;

  const emptyMessage = rng.pick(EMPTY_MESSAGES);
  const storageKey = `promptly:${slugify(spec.name)}:tasks:v2`;

  const body = `${renderHeader(spec, [])}
  <main class="app-main container">
    <section class="card todo-card" aria-label="Task list">
      <div class="todo-head">
        <div class="todo-ring" id="todo-ring" style="--pct:0" role="img" aria-label="Completion progress">
          <span class="todo-ring-center"><strong id="todo-ring-count">0/0</strong></span>
        </div>
        <div>
          <h1>${esc(spec.name)}</h1>
          <p class="app-tagline">${esc(spec.tagline)}</p>
        </div>
      </div>
      <form id="task-form" autocomplete="off">
        <label class="sr-only" for="task-input">New task</label>
        <input id="task-input" type="text" placeholder="Add a task and press Enter" maxlength="120" />
        <label class="sr-only" for="task-priority">Priority</label>
        <select id="task-priority">
          <option value="low">Low</option>
          <option value="med" selected>Med</option>
          <option value="high">High</option>
        </select>
        <button class="btn btn-primary" type="submit">Add</button>
      </form>
      <div class="filters" role="group" aria-label="Filter tasks">
        <button class="filter-btn is-active" data-filter="all" type="button">All</button>
        <button class="filter-btn" data-filter="active" type="button">Active</button>
        <button class="filter-btn" data-filter="done" type="button">Done</button>
      </div>
      <div class="task-groups">
        <section class="task-group" data-group="today">
          <h2 class="group-title">${icon('sun', 'group-icon')}Today</h2>
          <ul class="task-list" data-list="today"></ul>
        </section>
        <section class="task-group" data-group="later">
          <h2 class="group-title">${icon('clock', 'group-icon')}Later</h2>
          <ul class="task-list" data-list="later"></ul>
        </section>
        <section class="task-group" data-group="done">
          <h2 class="group-title">${icon('check', 'group-icon')}Done</h2>
          <ul class="task-list" data-list="done"></ul>
        </section>
      </div>
      <p id="empty-state" hidden>${esc(emptyMessage)}</p>
      <div class="todo-foot">
        <span id="task-count" role="status"></span>
        <button id="clear-done" class="link-btn" type="button">Clear completed</button>
      </div>
    </section>
  </main>
${renderFooter(spec)}`;

  const groupRule = isBrut ? '2px solid var(--text)' : '1px solid var(--border)';

  const css = `${cssVariables(spec)}

${baseCss(spec)}

/* To-do app */
.todo-card { max-width: 38rem; margin-inline: auto; padding: clamp(1.25rem, 4vw, 2rem); }
.todo-head { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
.todo-head h1 { font-size: clamp(1.4rem, 3.5vw, 1.9rem); }
.app-tagline { color: var(--muted); margin-top: 0.25rem; font-size: 0.92rem; }
.todo-ring {
  width: 3.9rem; aspect-ratio: 1; border-radius: 50%; flex: none; display: grid; place-items: center;
  background: conic-gradient(var(--primary) calc(var(--pct) * 1%), var(--surface-alt) 0);${isBrut ? ' border: 3px solid var(--text);' : ''}
}
.todo-ring-center {
  width: 72%; aspect-ratio: 1; border-radius: 50%; background: var(--surface);
  display: grid; place-items: center;${isBrut ? ' border: 2px solid var(--text);' : ''}
}
.todo-ring-center strong { font-size: 0.78rem; font-variant-numeric: tabular-nums; }
#task-form { display: flex; gap: 0.6rem; margin-bottom: 1rem; flex-wrap: wrap; }
#task-form input { flex: 1; min-width: 10rem; }
#task-form select { width: auto; }
.filters { display: flex; gap: 0.4rem; margin-bottom: 1rem; }
.filter-btn {
  border: ${isBrut ? '2px solid var(--text)' : '1px solid var(--border)'}; background: transparent; color: var(--muted);
  border-radius: var(--radius-btn); padding: 0.25rem 0.8rem; cursor: pointer;
  font-size: 0.85rem; font-weight: 600;
}
.filter-btn:hover { color: var(--primary); border-color: var(--primary); }
.filter-btn.is-active { background: var(--primary-soft); color: var(--primary-strong); border-color: ${isBrut ? 'var(--text)' : 'transparent'}; }
.task-groups { display: grid; gap: 1.1rem; }
.task-group[hidden] { display: none; }
.group-title {
  display: flex; align-items: center; gap: 0.45rem; font-size: 0.78rem; color: var(--muted);
  text-transform: uppercase; letter-spacing: 0.1em; padding-bottom: 0.4rem; margin-bottom: 0.5rem;
  border-bottom: ${groupRule};
}
.group-icon { width: 0.9rem; height: 0.9rem; }
.task-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.4rem; min-height: 0.5rem; }
.task {
  display: flex; align-items: center; gap: 0.65rem; padding: 0.6rem 0.75rem;
  border: ${isBrut ? '2px solid var(--text)' : '1px solid var(--border)'}; border-radius: var(--radius-sm); background: var(--surface);
  cursor: grab;
}
.task:active { cursor: grabbing; }
.task.is-dragging { opacity: 0.45; }
.task.is-drop-target { outline: 2px dashed var(--primary); outline-offset: 2px; }
.task input[type='checkbox'] { width: 1.05rem; height: 1.05rem; accent-color: var(--primary); flex: none; }
.task-title { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.task.is-done .task-title { text-decoration: line-through; color: var(--muted); }
.task-meta { display: inline-flex; align-items: center; gap: 0.35rem; flex: none; }
.pill {
  padding: 0.08rem 0.5rem; border-radius: var(--radius-btn); font-size: 0.68rem;
  font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;${isBrut ? ' border: 2px solid var(--text);' : ''}
}
.pill-low { background: var(--surface-alt); color: var(--muted); }
.pill-med { background: var(--accent-soft); color: var(--text); }
.pill-high { background: ${withAlpha('#D64550', 0.14)}; color: #D64550; }
.due-label { font-size: 0.72rem; color: var(--muted); white-space: nowrap; }
.due-label.is-overdue { color: #D64550; font-weight: 700; }
.task-delete {
  border: 0; background: transparent; color: var(--muted); cursor: pointer;
  font-size: 1.1rem; line-height: 1; padding: 0.2rem 0.4rem; border-radius: var(--radius-sm); flex: none;
}
.task-delete:hover { color: #D64550; background: var(--surface-alt); }
#empty-state { color: var(--muted); text-align: center; padding-block: 1.5rem; }
.todo-foot {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 1.25rem; padding-top: 1rem; border-top: ${groupRule};
  color: var(--muted); font-size: 0.9rem;
}
.link-btn { border: 0; background: transparent; color: var(--primary); cursor: pointer; font-weight: 600; }
.link-btn:hover { text-decoration: underline; }`;

  const js = `(function () {
  'use strict';

  var STORAGE_KEY = '${storageKey}';
  var SEED_TASKS = ${toJsLiteral(seedTasks)};
  var PRIORITY_LABELS = { low: 'Low', med: 'Med', high: 'High' };

  var form = document.getElementById('task-form');
  var input = document.getElementById('task-input');
  var prioritySelect = document.getElementById('task-priority');
  var emptyState = document.getElementById('empty-state');
  var countLabel = document.getElementById('task-count');
  var clearDone = document.getElementById('clear-done');
  var ring = document.getElementById('todo-ring');
  var ringCount = document.getElementById('todo-ring-count');
  if (!form || !input) return;

  var filter = 'all';
  var nextId = 1;
  var draggedId = null;

  function sanitize(list) {
    if (!Array.isArray(list)) return null;
    var clean = [];
    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      if (!item || typeof item.title !== 'string') continue;
      clean.push({
        id: typeof item.id === 'string' ? item.id : 'task-x' + i,
        title: item.title,
        done: !!item.done,
        priority: PRIORITY_LABELS[item.priority] ? item.priority : 'med',
        due: typeof item.due === 'number' ? item.due : null
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
    } catch (error) { /* private mode or blocked storage — fall back */ }
    return SEED_TASKS.slice();
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); } catch (error) { /* ignore */ }
  }

  var tasks = load();
  tasks.forEach(function (task) {
    var match = /^task-(\\d+)$/.exec(task.id);
    if (match) nextId = Math.max(nextId, Number(match[1]) + 1);
  });

  function groupOf(task) {
    if (task.done) return 'done';
    if (task.due !== null && task.due <= 0) return 'today';
    return 'later';
  }

  function dueText(due) {
    if (due === null) return '';
    if (due < 0) return 'Overdue';
    if (due === 0) return 'Due today';
    if (due === 1) return 'Due tomorrow';
    if (due < 7) return 'Due in ' + due + ' days';
    return 'Due next week';
  }

  function buildTask(task) {
    var item = document.createElement('li');
    item.className = 'task' + (task.done ? ' is-done' : '');
    item.draggable = true;
    item.setAttribute('data-task', task.id);
    item.setAttribute('data-priority', task.priority);

    var checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.done;
    checkbox.setAttribute('aria-label', 'Mark "' + task.title + '" as done');
    checkbox.addEventListener('change', function () {
      task.done = checkbox.checked;
      save();
      render();
    });

    var title = document.createElement('span');
    title.className = 'task-title';
    title.textContent = task.title;

    var meta = document.createElement('span');
    meta.className = 'task-meta';
    var pill = document.createElement('span');
    pill.className = 'pill pill-' + task.priority;
    pill.textContent = PRIORITY_LABELS[task.priority] || 'Med';
    meta.appendChild(pill);
    var due = dueText(task.due);
    if (due && !task.done) {
      var dueEl = document.createElement('span');
      dueEl.className = 'due-label' + (task.due < 0 ? ' is-overdue' : '');
      dueEl.textContent = due;
      meta.appendChild(dueEl);
    }

    var remove = document.createElement('button');
    remove.className = 'task-delete';
    remove.type = 'button';
    remove.textContent = '\\u00d7';
    remove.setAttribute('aria-label', 'Delete "' + task.title + '"');
    remove.addEventListener('click', function () {
      tasks = tasks.filter(function (candidate) { return candidate.id !== task.id; });
      save();
      render();
    });

    item.addEventListener('dragstart', function (event) {
      draggedId = task.id;
      item.classList.add('is-dragging');
      if (event.dataTransfer) {
        event.dataTransfer.setData('text/plain', task.id);
        event.dataTransfer.effectAllowed = 'move';
      }
    });
    item.addEventListener('dragend', function () {
      draggedId = null;
      item.classList.remove('is-dragging');
      document.querySelectorAll('.task.is-drop-target').forEach(function (el) {
        el.classList.remove('is-drop-target');
      });
    });
    item.addEventListener('dragover', function (event) {
      var dragged = findTask(draggedId);
      if (!dragged || dragged.id === task.id) return;
      // Reorder is only allowed within the same group.
      if (groupOf(dragged) !== groupOf(task)) return;
      event.preventDefault();
      item.classList.add('is-drop-target');
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    });
    item.addEventListener('dragleave', function () {
      item.classList.remove('is-drop-target');
    });
    item.addEventListener('drop', function (event) {
      event.preventDefault();
      item.classList.remove('is-drop-target');
      var dragged = findTask(draggedId);
      if (!dragged || dragged.id === task.id) return;
      if (groupOf(dragged) !== groupOf(task)) return;
      var fromIndex = tasks.indexOf(dragged);
      tasks.splice(fromIndex, 1);
      var toIndex = tasks.indexOf(task);
      tasks.splice(toIndex, 0, dragged);
      save();
      render();
    });

    item.appendChild(checkbox);
    item.appendChild(title);
    item.appendChild(meta);
    item.appendChild(remove);
    return item;
  }

  function findTask(id) {
    if (!id) return null;
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i].id === id) return tasks[i];
    }
    return null;
  }

  function render() {
    var groups = { today: [], later: [], done: [] };
    tasks.forEach(function (task) {
      groups[groupOf(task)].push(task);
    });

    var anyVisible = false;
    ['today', 'later', 'done'].forEach(function (name) {
      var section = document.querySelector('[data-group="' + name + '"]');
      var list = document.querySelector('[data-list="' + name + '"]');
      if (!section || !list) return;
      var groupVisible =
        filter === 'all' ||
        (filter === 'active' && name !== 'done') ||
        (filter === 'done' && name === 'done');
      var items = groups[name];
      section.hidden = !groupVisible || items.length === 0;
      list.textContent = '';
      if (!groupVisible) return;
      items.forEach(function (task) {
        list.appendChild(buildTask(task));
      });
      if (items.length > 0) anyVisible = true;
    });

    if (emptyState) emptyState.hidden = anyVisible;

    var doneCount = tasks.filter(function (task) { return task.done; }).length;
    var remaining = tasks.length - doneCount;
    if (countLabel) {
      countLabel.textContent = remaining === 1 ? '1 task left' : remaining + ' tasks left';
    }
    if (ring) {
      var pct = tasks.length === 0 ? 0 : Math.round((doneCount / tasks.length) * 100);
      ring.style.setProperty('--pct', String(pct));
      ring.setAttribute('aria-label', pct + '% of tasks complete');
    }
    if (ringCount) ringCount.textContent = doneCount + '/' + tasks.length;
  }

  // Enter in the input submits the form — Enter-to-add for free.
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var title = input.value.trim();
    if (!title) return;
    var priority = prioritySelect && PRIORITY_LABELS[prioritySelect.value]
      ? prioritySelect.value
      : 'med';
    tasks.push({ id: 'task-' + nextId++, title: title, done: false, priority: priority, due: null });
    input.value = '';
    save();
    render();
  });

  document.querySelectorAll('.filter-btn').forEach(function (button) {
    button.addEventListener('click', function () {
      filter = button.getAttribute('data-filter') || 'all';
      document.querySelectorAll('.filter-btn').forEach(function (other) {
        other.classList.toggle('is-active', other === button);
      });
      render();
    });
  });

  if (clearDone) {
    clearDone.addEventListener('click', function () {
      tasks = tasks.filter(function (task) { return !task.done; });
      save();
      render();
    });
  }

  render();
})();`;

  return { body, css, js };
}
