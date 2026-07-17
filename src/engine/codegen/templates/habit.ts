/**
 * Habit tracker template — weekly check-cell grid per habit, streak and
 * weekly-total counters, add/remove habits, localStorage persistence.
 */
import { createRng } from '@/lib/seeded';
import type { ProjectSpec } from '../../types';
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

const HABIT_POOL: readonly string[] = [
  'Morning stretch',
  'Read 20 pages',
  'Drink two liters of water',
  'Walk outside',
  'Practice an instrument',
  'Write three journal lines',
  'Lights out by eleven',
  'Tidy one surface',
];

export function renderHabit(spec: ProjectSpec): TemplateOutput {
  const rng = createRng(`${spec.seed}:habit`);
  const habitCount = rng.int(3, 4);
  const start = rng.int(0, HABIT_POOL.length - 1);
  const seedHabits: Array<{ id: string; name: string; week: boolean[] }> = [];
  for (let i = 0; i < habitCount; i++) {
    const name = HABIT_POOL[(start + i) % HABIT_POOL.length] ?? 'Take a breather';
    const week: boolean[] = [];
    for (let day = 0; day < 7; day++) {
      week.push(day < 4 ? rng.chance(0.6) : false);
    }
    seedHabits.push({ id: `seed-${i + 1}`, name, week });
  }
  const storageKey = `promptly:${slugify(spec.name)}:habits`;

  const body = `${renderHeader(spec, [])}
  <main class="app-main container">
    <section class="card habit-card" aria-label="Habit tracker">
      <div class="habit-head">
        <h1>${esc(spec.name)}</h1>
        <p class="app-tagline">${esc(spec.tagline)}</p>
      </div>
      <form id="habit-form" autocomplete="off">
        <label class="sr-only" for="habit-input">New habit</label>
        <input id="habit-input" type="text" placeholder="Add a habit to track" maxlength="60" />
        <button class="btn btn-primary" type="submit">Track it</button>
      </form>
      <div class="week-labels" aria-hidden="true">
        <span class="week-spacer"></span>
        <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span>
        <span>Fri</span><span>Sat</span><span>Sun</span>
        <span class="week-spacer-end"></span>
      </div>
      <ul id="habit-list"></ul>
      <p id="habit-empty" hidden>No habits yet — add the first one above.</p>
    </section>
  </main>
${renderFooter(spec)}`;

  const css = `${cssVariables(spec)}

${baseCss(spec)}

/* Habit tracker */
.habit-card { max-width: 44rem; margin-inline: auto; padding: clamp(1.25rem, 4vw, 2rem); }
.habit-head { margin-bottom: 1.5rem; }
.app-tagline { color: var(--muted); margin-top: 0.25rem; }
#habit-form { display: flex; gap: 0.6rem; margin-bottom: 1.5rem; }
#habit-form input { flex: 1; }
.week-labels, .habit-row {
  display: grid;
  grid-template-columns: minmax(7rem, 1fr) repeat(7, 2rem) minmax(4.5rem, auto);
  gap: 0.35rem; align-items: center;
}
.week-labels { color: var(--muted); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; }
.week-labels span:not(.week-spacer):not(.week-spacer-end) { text-align: center; }
#habit-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.5rem; }
.habit-row { padding: 0.45rem 0; border-bottom: 1px solid var(--border); }
.habit-name { display: flex; align-items: center; gap: 0.4rem; min-width: 0; }
.habit-name span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.habit-delete { border: 0; background: transparent; color: var(--muted); cursor: pointer; padding: 0 0.25rem; }
.habit-delete:hover { color: #D64550; }
.day-cell {
  width: 1.7rem; height: 1.7rem; margin-inline: auto; cursor: pointer;
  border: 1px solid var(--border); border-radius: var(--radius-sm);
  background: var(--surface); padding: 0;
  transition: background 0.12s ease, border-color 0.12s ease, transform 0.12s ease;
}
.day-cell:hover { border-color: var(--primary); transform: scale(1.08); }
.day-cell.is-checked { background: var(--primary); border-color: var(--primary); }
.habit-streak { text-align: right; font-size: 0.82rem; color: var(--muted); white-space: nowrap; }
.habit-streak strong { color: var(--primary); }
#habit-empty { color: var(--muted); text-align: center; padding-block: 1.5rem; }
@media (max-width: 560px) {
  .week-labels, .habit-row { grid-template-columns: minmax(5rem, 1fr) repeat(7, 1.6rem) auto; }
  .day-cell { width: 1.4rem; height: 1.4rem; }
}`;

  const js = `(function () {
  'use strict';

  var STORAGE_KEY = '${storageKey}';
  var SEED_HABITS = ${toJsLiteral(seedHabits)};
  var DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  var form = document.getElementById('habit-form');
  var input = document.getElementById('habit-input');
  var list = document.getElementById('habit-list');
  var empty = document.getElementById('habit-empty');
  if (!form || !input || !list) return;

  var nextId = 1;

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (error) { /* storage unavailable — run in memory */ }
    return SEED_HABITS.slice();
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(habits)); } catch (error) { /* ignore */ }
  }

  var habits = load();
  habits.forEach(function (habit) {
    var match = /^habit-(\\d+)$/.exec(habit.id);
    if (match) nextId = Math.max(nextId, Number(match[1]) + 1);
  });

  // Longest run of consecutive checked days in the current week.
  function bestRun(week) {
    var best = 0;
    var current = 0;
    for (var i = 0; i < week.length; i++) {
      current = week[i] ? current + 1 : 0;
      if (current > best) best = current;
    }
    return best;
  }

  function render() {
    list.textContent = '';
    habits.forEach(function (habit) {
      var row = document.createElement('li');
      row.className = 'habit-row';

      var name = document.createElement('span');
      name.className = 'habit-name';
      var label = document.createElement('span');
      label.textContent = habit.name;
      var remove = document.createElement('button');
      remove.className = 'habit-delete';
      remove.type = 'button';
      remove.textContent = '\\u00d7';
      remove.setAttribute('aria-label', 'Stop tracking "' + habit.name + '"');
      remove.addEventListener('click', function () {
        habits = habits.filter(function (candidate) { return candidate.id !== habit.id; });
        save();
        render();
      });
      name.appendChild(remove);
      name.appendChild(label);
      row.appendChild(name);

      habit.week.forEach(function (checked, dayIndex) {
        var cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'day-cell' + (checked ? ' is-checked' : '');
        cell.setAttribute('aria-pressed', checked ? 'true' : 'false');
        cell.setAttribute('aria-label', habit.name + ' on ' + DAYS[dayIndex]);
        cell.addEventListener('click', function () {
          habit.week[dayIndex] = !habit.week[dayIndex];
          save();
          render();
        });
        row.appendChild(cell);
      });

      var doneCount = habit.week.filter(Boolean).length;
      var streak = document.createElement('span');
      streak.className = 'habit-streak';
      streak.innerHTML = '<strong>' + bestRun(habit.week) + '</strong> streak \\u00b7 ' + doneCount + '/7';
      row.appendChild(streak);

      list.appendChild(row);
    });

    if (empty) empty.hidden = habits.length > 0;
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var name = input.value.trim();
    if (!name) return;
    habits.push({
      id: 'habit-' + nextId++,
      name: name,
      week: [false, false, false, false, false, false, false]
    });
    input.value = '';
    save();
    render();
  });

  render();
})();`;

  return { body, css, js };
}
