/**
 * Habit tracker template — a month-style heatmap grid per habit with five
 * intensity tints, current + best streak counters with a flame glyph, a
 * weekly bar summary across habits, add/archive flows and localStorage
 * persistence. Grids scale down instead of clipping on narrow screens.
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
  withAlpha,
  type TemplateOutput,
} from '../shared';

/** Days in the month-style grid: five 7-day rows. */
const GRID_DAYS = 35;

/** Hand-drawn flame glyph in the same stroke style as the icon set. */
const FLAME_SVG =
  '<svg class="flame" aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5c2.8 3 5.5 6 5.5 9.4a5.5 5.5 0 0 1-11 0c0-1.7.6-3.2 1.6-4.7.4 1.1 1 1.9 1.9 2.4C9.6 8 10.5 5.6 12 3.5z"/></svg>';

export function renderHabit(spec: ProjectSpec): TemplateOutput {
  const rng = createRng(`${spec.seed}:habit`);
  const content = contentFor(spec.topic, createRng(`${spec.seed}:content`));
  const theme = ((): { h1: string; h2: string; h3: string } => {
    const primary = spec.palette.primary;
    return {
      h1: withAlpha(primary, 0.28),
      h2: withAlpha(primary, 0.5),
      h3: withAlpha(primary, 0.74),
    };
  })();
  const { archetype } = spec.style;
  const isBrut = archetype === 'brutalist';

  const habitCount = Math.min(rng.int(3, 4), content.habitIdeas.length);
  const seedHabits: Array<{ id: string; name: string; days: number[]; archived: boolean }> = [];
  for (let i = 0; i < habitCount; i++) {
    const name = content.habitIdeas[i] ?? 'Take a breather';
    const days: number[] = [];
    for (let day = 0; day < GRID_DAYS; day++) {
      days.push(rng.chance(0.55) ? rng.int(1, 4) : 0);
    }
    // The first habit carries a live streak into "today" so the current
    // streak counter has something to show out of the box.
    if (i === 0) {
      for (let day = GRID_DAYS - 3; day < GRID_DAYS; day++) days[day] = rng.int(2, 4);
    }
    seedHabits.push({ id: `seed-${i + 1}`, name, days, archived: false });
  }
  const storageKey = `promptly:${slugify(spec.name)}:habits:v2`;

  const body = `${renderHeader(spec, [])}
  <main class="app-main container">
    <section class="card habit-card" aria-label="Habit tracker">
      <div class="habit-head">
        <div>
          <h1>${esc(spec.name)}</h1>
          <p class="app-tagline">${esc(spec.tagline)}</p>
        </div>
        <div class="week-summary" aria-label="This week across all habits">
          <span class="week-summary-label">This week</span>
          <div class="week-bars" id="week-summary" aria-hidden="true"></div>
          <div class="week-bar-labels" aria-hidden="true">
            <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
          </div>
        </div>
      </div>
      <form id="habit-form" autocomplete="off">
        <label class="sr-only" for="habit-input">New habit</label>
        <input id="habit-input" type="text" placeholder="Add a habit to track" maxlength="60" />
        <button class="btn btn-primary" type="submit">Track it</button>
      </form>
      <div id="habit-list"></div>
      <p id="habit-empty" hidden>No habits yet — add the first one above.</p>
      <div class="archived-block">
        <button id="archived-toggle" class="link-btn" type="button" aria-expanded="false">Archived (<span id="archived-count">0</span>)</button>
        <ul id="archived-list" hidden></ul>
      </div>
    </section>
  </main>
${renderFooter(spec)}`;

  const hairline = isBrut ? '2px solid var(--text)' : '1px solid var(--border)';

  const css = `${cssVariables(spec)}

${baseCss(spec)}

/* Habit tracker */
.habit-card { max-width: 46rem; margin-inline: auto; padding: clamp(1.25rem, 4vw, 2rem); }
.habit-head { display: flex; justify-content: space-between; gap: 1.25rem; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; }
.habit-head h1 { font-size: clamp(1.4rem, 3.5vw, 1.9rem); }
.app-tagline { color: var(--muted); margin-top: 0.25rem; font-size: 0.92rem; }

/* Weekly summary bars */
.week-summary { display: grid; gap: 0.3rem; justify-items: stretch; min-width: 9rem; }
.week-summary-label { font-size: 0.68rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.1em; }
.week-bars { display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.25rem; align-items: end; height: 2.6rem; }
.week-bars span { display: block; min-height: 12%; border-radius: var(--radius-sm); background: var(--primary);${isBrut ? ' border: 2px solid var(--text);' : ''} }
.week-bars span.is-zero { background: var(--surface-alt); }
.week-bar-labels { display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.25rem; font-size: 0.62rem; color: var(--muted); text-align: center; }

#habit-form { display: flex; gap: 0.6rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
#habit-form input { flex: 1; min-width: 12rem; }

/* Habit blocks */
#habit-list { display: grid; gap: 1.4rem; }
.habit-block { display: grid; gap: 0.6rem; padding-block: 0.85rem; border-bottom: ${hairline}; }
.habit-block:last-child { border-bottom: 0; }
.habit-top { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; min-width: 0; }
.habit-name { font-weight: 700; min-width: 0; flex: 1 1 9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;${isBrut ? ' text-transform: uppercase; letter-spacing: 0.03em;' : ''} }
.streak-chip {
  display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.12rem 0.55rem;
  border-radius: var(--radius-btn); font-size: 0.74rem; font-weight: 800; white-space: nowrap;
  background: var(--primary-soft); color: var(--primary-strong);${isBrut ? ' border: 2px solid var(--text);' : ''}
}
.streak-chip .flame { width: 0.85rem; height: 0.85rem; }
.streak-chip.streak-best { background: var(--accent-soft); color: var(--text); }
.habit-archive { border: 0; background: transparent; color: var(--muted); cursor: pointer; font-size: 0.78rem; font-weight: 600; padding: 0.15rem 0.35rem; }
.habit-archive:hover { color: var(--primary); text-decoration: underline; }

/* Heatmap */
.heat-labels, .heatmap { display: grid; grid-template-columns: repeat(7, minmax(1.1rem, 1.9rem)); gap: 0.28rem; justify-content: start; }
.heat-labels { font-size: 0.6rem; color: var(--muted); text-transform: uppercase; }
.heat-labels span { text-align: center; }
.heat-cell {
  width: 100%; aspect-ratio: 1; padding: 0; cursor: pointer;
  border: ${isBrut ? '2px solid var(--text)' : '1px solid var(--border)'}; border-radius: var(--radius-sm);
  background: var(--surface-alt);
}
.heat-cell:hover { border-color: var(--primary); }
.heat-cell.h0 { background: var(--surface-alt); }
.heat-cell.h1 { background: ${theme.h1}; }
.heat-cell.h2 { background: ${theme.h2}; }
.heat-cell.h3 { background: ${theme.h3}; }
.heat-cell.h4 { background: var(--primary); }
@media (prefers-reduced-motion: no-preference) {
  .heat-cell { transition: background 0.12s ease, border-color 0.12s ease, transform 0.12s ease; }
  .heat-cell:hover { transform: scale(1.12); }
}

#habit-empty { color: var(--muted); text-align: center; padding-block: 1.5rem; }

/* Archived */
.archived-block { margin-top: 1.25rem; padding-top: 0.9rem; border-top: ${hairline}; }
.link-btn { border: 0; background: transparent; color: var(--primary); cursor: pointer; font-weight: 600; padding: 0; }
.link-btn:hover { text-decoration: underline; }
#archived-list { list-style: none; margin: 0.75rem 0 0; padding: 0; display: grid; gap: 0.4rem; }
#archived-list li { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; color: var(--muted); font-size: 0.9rem; }
.restore-btn { border: ${isBrut ? '2px solid var(--text)' : '1px solid var(--border)'}; background: var(--surface); color: var(--text); border-radius: var(--radius-btn); padding: 0.15rem 0.6rem; font-size: 0.75rem; font-weight: 700; cursor: pointer; }
.restore-btn:hover { border-color: var(--primary); color: var(--primary); }

@media (max-width: 560px) {
  .habit-head { flex-direction: column; }
  .week-summary { width: 100%; }
}`;

  const js = `(function () {
  'use strict';

  var STORAGE_KEY = '${storageKey}';
  var SEED_HABITS = ${toJsLiteral(seedHabits)};
  var GRID_DAYS = ${GRID_DAYS};
  var DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  var FLAME = ${toJsLiteral(FLAME_SVG)};

  var form = document.getElementById('habit-form');
  var input = document.getElementById('habit-input');
  var list = document.getElementById('habit-list');
  var empty = document.getElementById('habit-empty');
  var weekSummary = document.getElementById('week-summary');
  var archivedToggle = document.getElementById('archived-toggle');
  var archivedList = document.getElementById('archived-list');
  var archivedCount = document.getElementById('archived-count');
  if (!form || !input || !list) return;

  var nextId = 1;
  var archivedOpen = false;

  function sanitize(parsed) {
    if (!Array.isArray(parsed)) return null;
    var clean = [];
    for (var i = 0; i < parsed.length; i++) {
      var habit = parsed[i];
      if (!habit || typeof habit.name !== 'string') continue;
      var days = Array.isArray(habit.days) ? habit.days.slice(0, GRID_DAYS) : [];
      while (days.length < GRID_DAYS) days.push(0);
      for (var d = 0; d < days.length; d++) {
        var v = Number(days[d]);
        days[d] = isFinite(v) ? Math.max(0, Math.min(4, Math.round(v))) : 0;
      }
      clean.push({
        id: typeof habit.id === 'string' ? habit.id : 'habit-x' + i,
        name: habit.name,
        days: days,
        archived: !!habit.archived
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

  // Current streak: consecutive non-zero days ending on the last cell.
  function currentStreak(days) {
    var streak = 0;
    for (var i = days.length - 1; i >= 0; i--) {
      if (days[i] > 0) streak += 1;
      else break;
    }
    return streak;
  }

  // Best streak: longest run of non-zero days anywhere in the grid.
  function bestStreak(days) {
    var best = 0;
    var current = 0;
    for (var i = 0; i < days.length; i++) {
      current = days[i] > 0 ? current + 1 : 0;
      if (current > best) best = current;
    }
    return best;
  }

  function renderWeekSummary() {
    if (!weekSummary) return;
    weekSummary.textContent = '';
    var totals = [0, 0, 0, 0, 0, 0, 0];
    var max = 1;
    habits.forEach(function (habit) {
      if (habit.archived) return;
      for (var i = 0; i < 7; i++) {
        totals[i] += habit.days[GRID_DAYS - 7 + i] || 0;
        if (totals[i] > max) max = totals[i];
      }
    });
    totals.forEach(function (total) {
      var bar = document.createElement('span');
      var pct = Math.round((total / max) * 100);
      bar.style.height = Math.max(12, pct) + '%';
      if (total === 0) bar.className = 'is-zero';
      weekSummary.appendChild(bar);
    });
  }

  function buildHeatmap(habit) {
    var wrap = document.createElement('div');
    var labels = document.createElement('div');
    labels.className = 'heat-labels';
    labels.setAttribute('aria-hidden', 'true');
    ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach(function (letter) {
      var span = document.createElement('span');
      span.textContent = letter;
      labels.appendChild(span);
    });
    wrap.appendChild(labels);

    var grid = document.createElement('div');
    grid.className = 'heatmap';
    habit.days.forEach(function (value, index) {
      var cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'heat-cell h' + value;
      var week = Math.floor(index / 7) + 1;
      var day = DAY_NAMES[index % 7];
      cell.setAttribute('aria-label', habit.name + ', week ' + week + ', ' + day + ': level ' + value);
      cell.addEventListener('click', function () {
        habit.days[index] = (habit.days[index] + 1) % 5;
        save();
        render();
      });
      grid.appendChild(cell);
    });
    wrap.appendChild(grid);
    return wrap;
  }

  function render() {
    list.textContent = '';
    var active = habits.filter(function (habit) { return !habit.archived; });
    var archived = habits.filter(function (habit) { return habit.archived; });

    active.forEach(function (habit) {
      var block = document.createElement('section');
      block.className = 'habit-block';

      var top = document.createElement('div');
      top.className = 'habit-top';

      var name = document.createElement('span');
      name.className = 'habit-name';
      name.textContent = habit.name;
      top.appendChild(name);

      var current = document.createElement('span');
      current.className = 'streak-chip';
      current.innerHTML = FLAME;
      current.appendChild(document.createTextNode(currentStreak(habit.days) + ' day streak'));
      top.appendChild(current);

      var best = document.createElement('span');
      best.className = 'streak-chip streak-best';
      best.textContent = 'Best ' + bestStreak(habit.days);
      top.appendChild(best);

      var archive = document.createElement('button');
      archive.className = 'habit-archive';
      archive.type = 'button';
      archive.textContent = 'Archive';
      archive.setAttribute('aria-label', 'Archive "' + habit.name + '"');
      archive.addEventListener('click', function () {
        habit.archived = true;
        save();
        render();
      });
      top.appendChild(archive);

      block.appendChild(top);
      block.appendChild(buildHeatmap(habit));
      list.appendChild(block);
    });

    if (empty) empty.hidden = active.length > 0;

    if (archivedCount) archivedCount.textContent = String(archived.length);
    if (archivedList) {
      archivedList.textContent = '';
      archived.forEach(function (habit) {
        var item = document.createElement('li');
        var name = document.createElement('span');
        name.textContent = habit.name;
        var restore = document.createElement('button');
        restore.className = 'restore-btn';
        restore.type = 'button';
        restore.textContent = 'Restore';
        restore.setAttribute('aria-label', 'Restore "' + habit.name + '"');
        restore.addEventListener('click', function () {
          habit.archived = false;
          save();
          render();
        });
        item.appendChild(name);
        item.appendChild(restore);
        archivedList.appendChild(item);
      });
      archivedList.hidden = !archivedOpen || archived.length === 0;
    }

    renderWeekSummary();
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var name = input.value.trim();
    if (!name) return;
    var days = [];
    for (var i = 0; i < GRID_DAYS; i++) days.push(0);
    habits.push({ id: 'habit-' + nextId++, name: name, days: days, archived: false });
    input.value = '';
    save();
    render();
  });

  if (archivedToggle) {
    archivedToggle.addEventListener('click', function () {
      archivedOpen = !archivedOpen;
      archivedToggle.setAttribute('aria-expanded', archivedOpen ? 'true' : 'false');
      render();
    });
  }

  render();
})();`;

  return { body, css, js };
}
