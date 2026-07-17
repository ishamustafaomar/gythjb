/**
 * To-do template — add/complete/delete/filter with counts, an empty state
 * and localStorage persistence keyed by the project slug.
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

const EMPTY_MESSAGES: readonly string[] = [
  'Nothing here — enjoy the quiet or add a task above.',
  'All clear. Add something when inspiration strikes.',
  'An empty list is a finished list. Nicely done.',
];

export function renderTodo(spec: ProjectSpec): TemplateOutput {
  const rng = createRng(`${spec.seed}:todo`);
  const content = contentFor(spec.topic, createRng(`${spec.seed}:content`));
  const taskCount = Math.min(rng.int(3, 5), content.todoIdeas.length);
  const seedTasks: Array<{ id: string; title: string; done: boolean }> = [];
  for (let i = 0; i < taskCount; i++) {
    const title = content.todoIdeas[i] ?? 'Take a short walk';
    seedTasks.push({ id: `seed-${i + 1}`, title, done: i === taskCount - 1 });
  }
  const emptyMessage = rng.pick(EMPTY_MESSAGES);
  const storageKey = `promptly:${slugify(spec.name)}:tasks`;

  const body = `${renderHeader(spec, [])}
  <main class="app-main container">
    <section class="card todo-card" aria-label="Task list">
      <div class="todo-head">
        <h1>${esc(spec.name)}</h1>
        <p class="app-tagline">${esc(spec.tagline)}</p>
      </div>
      <form id="task-form" autocomplete="off">
        <label class="sr-only" for="task-input">New task</label>
        <input id="task-input" type="text" placeholder="Add a task and press Enter" maxlength="120" />
        <button class="btn btn-primary" type="submit">Add</button>
      </form>
      <div class="filters" role="group" aria-label="Filter tasks">
        <button class="filter-btn is-active" data-filter="all" type="button">All</button>
        <button class="filter-btn" data-filter="active" type="button">Active</button>
        <button class="filter-btn" data-filter="done" type="button">Done</button>
      </div>
      <ul id="task-list"></ul>
      <p id="empty-state" hidden>${esc(emptyMessage)}</p>
      <div class="todo-foot">
        <span id="task-count" role="status"></span>
        <button id="clear-done" class="link-btn" type="button">Clear completed</button>
      </div>
    </section>
  </main>
${renderFooter(spec)}`;

  const css = `${cssVariables(spec)}

${baseCss(spec)}

/* To-do app */
.todo-card { max-width: 36rem; margin-inline: auto; padding: clamp(1.25rem, 4vw, 2rem); }
.todo-head { margin-bottom: 1.5rem; }
.app-tagline { color: var(--muted); margin-top: 0.25rem; }
#task-form { display: flex; gap: 0.6rem; margin-bottom: 1rem; }
#task-form input { flex: 1; }
.filters { display: flex; gap: 0.4rem; margin-bottom: 0.75rem; }
.filter-btn {
  border: 1px solid var(--border); background: transparent; color: var(--muted);
  border-radius: var(--radius-btn); padding: 0.25rem 0.8rem; cursor: pointer;
  font-size: 0.85rem; font-weight: 600;
}
.filter-btn:hover { color: var(--primary); border-color: var(--primary); }
.filter-btn.is-active { background: var(--primary-soft); color: var(--primary-strong); border-color: transparent; }
#task-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.4rem; }
.task {
  display: flex; align-items: center; gap: 0.7rem; padding: 0.6rem 0.75rem;
  border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface);
}
.task input[type='checkbox'] { width: 1.05rem; height: 1.05rem; accent-color: var(--primary); }
.task-title { flex: 1; }
.task.is-done .task-title { text-decoration: line-through; color: var(--muted); }
.task-delete {
  border: 0; background: transparent; color: var(--muted); cursor: pointer;
  font-size: 1.1rem; line-height: 1; padding: 0.2rem 0.4rem; border-radius: var(--radius-sm);
}
.task-delete:hover { color: #D64550; background: var(--surface-alt); }
#empty-state { color: var(--muted); text-align: center; padding-block: 1.5rem; }
.todo-foot {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border);
  color: var(--muted); font-size: 0.9rem;
}
.link-btn { border: 0; background: transparent; color: var(--primary); cursor: pointer; font-weight: 600; }
.link-btn:hover { text-decoration: underline; }`;

  const js = `(function () {
  'use strict';

  var STORAGE_KEY = '${storageKey}';
  var SEED_TASKS = ${toJsLiteral(seedTasks)};

  var form = document.getElementById('task-form');
  var input = document.getElementById('task-input');
  var list = document.getElementById('task-list');
  var emptyState = document.getElementById('empty-state');
  var countLabel = document.getElementById('task-count');
  var clearDone = document.getElementById('clear-done');
  if (!form || !input || !list) return;

  var filter = 'all';
  var nextId = 1;

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
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

  function visibleTasks() {
    if (filter === 'active') return tasks.filter(function (task) { return !task.done; });
    if (filter === 'done') return tasks.filter(function (task) { return task.done; });
    return tasks;
  }

  function render() {
    list.textContent = '';
    var visible = visibleTasks();
    visible.forEach(function (task) {
      var item = document.createElement('li');
      item.className = 'task' + (task.done ? ' is-done' : '');

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

      item.appendChild(checkbox);
      item.appendChild(title);
      item.appendChild(remove);
      list.appendChild(item);
    });

    if (emptyState) emptyState.hidden = visible.length > 0;
    if (countLabel) {
      var remaining = tasks.filter(function (task) { return !task.done; }).length;
      countLabel.textContent = remaining === 1 ? '1 task left' : remaining + ' tasks left';
    }
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var title = input.value.trim();
    if (!title) return;
    tasks.push({ id: 'task-' + nextId++, title: title, done: false });
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
