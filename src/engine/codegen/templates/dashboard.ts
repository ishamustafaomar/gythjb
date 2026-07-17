/**
 * Dashboard template — stat cards, seeded pure-SVG bar and line charts,
 * a filterable recent-activity table and sidebar navigation.
 */
import { createRng, type Rng } from '@/lib/seeded';
import type { ProjectSpec } from '../../types';
import {
  baseCss,
  cssVariables,
  esc,
  renderFooter,
  type TemplateOutput,
} from '../shared';

const PEOPLE: readonly string[] = [
  'Maya Linden', 'Tomas Reyes', 'Priya Nair', 'Jonah Beck',
  'Aiko Tanaka', 'Ruth Okafor', 'Leo Marchetti', 'Sofia Brandt',
];

const ACTIONS: readonly string[] = [
  'upgraded to the Growth plan',
  'invited a teammate',
  'exported the quarterly report',
  'created a new project',
  'commented on a task',
  'changed the billing email',
  'archived an old workspace',
  'connected a custom domain',
];

const TIMES: readonly string[] = [
  '2m ago', '18m ago', '44m ago', '1h ago', '3h ago', 'yesterday', '2 days ago',
];

function barChartSvg(rng: Rng): string {
  const bars: string[] = [];
  for (let i = 0; i < 7; i++) {
    const value = rng.int(24, 96);
    const height = Math.round((value / 100) * 118);
    const x = 12 + i * 43;
    const y = 140 - height;
    bars.push(
      `        <rect class="bar" x="${x}" y="${y}" width="30" height="${height}" rx="3"><title>Day ${i + 1}: ${value}</title></rect>`,
    );
  }
  return `      <svg viewBox="0 0 320 150" role="img" aria-label="Bar chart of weekly volume" preserveAspectRatio="none">
        <line class="grid-line" x1="0" y1="140" x2="320" y2="140" />
        <line class="grid-line" x1="0" y1="95" x2="320" y2="95" />
        <line class="grid-line" x1="0" y1="50" x2="320" y2="50" />
${bars.join('\n')}
      </svg>`;
}

function lineChartSvg(rng: Rng): string {
  const points: Array<[number, number]> = [];
  let value = rng.int(30, 55);
  for (let i = 0; i < 12; i++) {
    value = Math.max(15, Math.min(95, value + rng.int(-14, 18)));
    const x = Math.round((10 + (i * 300) / 11) * 10) / 10;
    const y = Math.round((140 - (value / 100) * 118) * 10) / 10;
    points.push([x, y]);
  }
  const polyline = points.map(([x, y]) => `${x},${y}`).join(' ');
  const first = points[0] ?? [10, 140];
  const last = points[points.length - 1] ?? [310, 140];
  const area = `M ${first[0]} 140 L ${polyline.replaceAll(' ', ' L ').replaceAll(',', ' ')} L ${last[0]} 140 Z`;
  return `      <svg viewBox="0 0 320 150" role="img" aria-label="Line chart of the yearly trend" preserveAspectRatio="none">
        <line class="grid-line" x1="0" y1="140" x2="320" y2="140" />
        <line class="grid-line" x1="0" y1="95" x2="320" y2="95" />
        <line class="grid-line" x1="0" y1="50" x2="320" y2="50" />
        <path class="area" d="${area}" />
        <polyline class="line" points="${polyline}" />
      </svg>`;
}

export function renderDashboard(spec: ProjectSpec): TemplateOutput {
  const rng = createRng(`${spec.seed}:dashboard`);

  const stats = [
    { label: 'Active users', value: `${(rng.int(12, 98) / 10).toFixed(1)}k`, delta: rng.int(2, 18) },
    { label: 'Sessions this week', value: `${rng.int(18, 64)}k`, delta: rng.int(-6, 22) },
    { label: 'Conversion', value: `${(rng.int(18, 52) / 10).toFixed(1)}%`, delta: rng.int(-4, 9) },
    { label: 'Monthly revenue', value: `$${rng.int(8, 40)}.${rng.int(1, 9)}k`, delta: rng.int(1, 14) },
  ];

  const statCards = stats
    .map((stat) => {
      const up = stat.delta >= 0;
      return `        <article class="card stat-card">
          <span class="stat-card-label">${esc(stat.label)}</span>
          <strong class="stat-card-value">${esc(stat.value)}</strong>
          <span class="delta ${up ? 'delta-up' : 'delta-down'}">${up ? '▲' : '▼'} ${Math.abs(stat.delta)}%</span>
        </article>`;
    })
    .join('\n');

  const rows: string[] = [];
  const personStart = rng.int(0, PEOPLE.length - 1);
  const actionStart = rng.int(0, ACTIONS.length - 1);
  for (let i = 0; i < 6; i++) {
    const person = PEOPLE[(personStart + i) % PEOPLE.length] ?? 'Team member';
    const action = ACTIONS[(actionStart + i) % ACTIONS.length] ?? 'updated a record';
    const time = TIMES[Math.min(i, TIMES.length - 1)] ?? 'earlier';
    rows.push(`            <tr>
              <td>${esc(person)}</td>
              <td>${esc(action)}</td>
              <td class="activity-time">${esc(time)}</td>
            </tr>`);
  }

  const navItems = ['Overview', 'Reports', 'Customers', 'Settings']
    .map(
      (item, index) =>
        `        <button class="dash-nav-item${index === 0 ? ' is-active' : ''}" type="button" data-view="${esc(item)}">${esc(item)}</button>`,
    )
    .join('\n');

  const body = `  <div class="dash-layout">
    <aside class="dash-sidebar" id="dash-sidebar">
      <a class="brand" href="#top">
        <span class="brand-mark" aria-hidden="true"></span>
        <span class="brand-name">${esc(spec.name)}</span>
      </a>
      <nav class="dash-nav" aria-label="Dashboard">
${navItems}
      </nav>
      <p class="dash-sidebar-note">${esc(spec.tagline)}</p>
    </aside>
    <div class="dash-body" id="top">
      <header class="dash-topbar">
        <button id="sidebar-toggle" class="btn btn-ghost" type="button" aria-label="Toggle navigation">☰</button>
        <h1 id="dash-title">Overview</h1>
      </header>
      <main class="app-main dash-main">
        <section class="stat-grid" aria-label="Key metrics">
${statCards}
        </section>
        <section class="grid cols-2 chart-row" aria-label="Charts">
          <article class="card chart-card">
            <h2>Weekly volume</h2>
${barChartSvg(rng)}
          </article>
          <article class="card chart-card">
            <h2>Yearly trend</h2>
${lineChartSvg(rng)}
          </article>
        </section>
        <section class="card activity" aria-label="Recent activity">
          <div class="activity-head">
            <h2>Recent activity</h2>
            <label class="sr-only" for="activity-filter">Filter activity</label>
            <input id="activity-filter" type="search" placeholder="Filter activity" />
          </div>
          <table id="activity-table">
            <thead>
              <tr><th>Member</th><th>Action</th><th>When</th></tr>
            </thead>
            <tbody>
${rows.join('\n')}
            </tbody>
          </table>
          <p id="activity-empty" hidden>Nothing matches that filter.</p>
        </section>
      </main>
${renderFooter(spec)}
    </div>
  </div>`;

  const css = `${cssVariables(spec)}

${baseCss(spec)}

/* Dashboard shell */
.dash-layout { display: grid; grid-template-columns: 230px 1fr; min-height: 100vh; }
.dash-sidebar {
  background: var(--surface-alt); border-right: 1px solid var(--border);
  padding: 1.25rem 1rem; display: flex; flex-direction: column; gap: 1.5rem;
}
.dash-nav { display: grid; gap: 0.25rem; }
.dash-nav-item {
  text-align: left; border: 0; background: transparent; color: var(--muted);
  padding: 0.55rem 0.75rem; border-radius: var(--radius-sm); cursor: pointer; font-weight: 600;
}
.dash-nav-item:hover { color: var(--primary); background: var(--surface); }
.dash-nav-item.is-active { background: var(--primary-soft); color: var(--primary-strong); }
.dash-sidebar-note { margin-top: auto; color: var(--muted); font-size: 0.8rem; }
.dash-body { display: flex; flex-direction: column; min-width: 0; }
.dash-topbar {
  display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1.5rem;
  border-bottom: 1px solid var(--border); background: var(--header-bg);
}
.dash-topbar h1 { font-size: 1.3rem; }
#sidebar-toggle { display: none; padding: 0.35rem 0.7rem; }
.dash-main { padding-inline: 1.5rem; display: grid; gap: var(--gap); width: 100%; }
.dash-body .site-footer { padding-inline: 1.5rem; }
.dash-body .footer-inner { width: 100%; }

/* Stat cards */
.stat-grid { display: grid; gap: var(--gap); grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
.stat-card { padding: 1.1rem 1.25rem; display: grid; gap: 0.25rem; }
.stat-card-label { color: var(--muted); font-size: 0.85rem; }
.stat-card-value { font-size: 1.7rem; letter-spacing: -0.02em; }
.delta { font-size: 0.8rem; font-weight: 700; }
.delta-up { color: var(--primary); }
.delta-down { color: #D64550; }

/* Charts */
.chart-card { padding: 1.25rem; display: grid; gap: 0.9rem; }
.chart-card h2 { font-size: 1rem; }
.chart-card svg { width: 100%; height: 170px; }
.bar { fill: var(--primary); }
.bar:hover { fill: var(--accent); }
.line { fill: none; stroke: var(--primary); stroke-width: 2.5; stroke-linejoin: round; }
.area { fill: var(--primary-soft); }
.grid-line { stroke: var(--border); stroke-width: 1; }

/* Activity table */
.activity { padding: 1.25rem; }
.activity-head { display: flex; justify-content: space-between; gap: 1rem; align-items: center; margin-bottom: 0.9rem; flex-wrap: wrap; }
.activity-head h2 { font-size: 1rem; }
.activity-head input { max-width: 15rem; }
#activity-table { width: 100%; border-collapse: collapse; font-size: 0.92rem; }
#activity-table th {
  text-align: left; color: var(--muted); font-size: 0.78rem; text-transform: uppercase;
  letter-spacing: 0.05em; padding: 0.5rem 0.6rem; border-bottom: 1px solid var(--border);
}
#activity-table td { padding: 0.6rem; border-bottom: 1px solid var(--border); }
#activity-table tbody tr:hover { background: var(--surface-alt); }
.activity-time { color: var(--muted); white-space: nowrap; }
#activity-empty { color: var(--muted); padding-top: 0.9rem; }

@media (max-width: 860px) {
  .dash-layout { grid-template-columns: 1fr; }
  .dash-sidebar { display: none; border-right: 0; border-bottom: 1px solid var(--border); }
  .dash-sidebar.is-open { display: flex; }
  #sidebar-toggle { display: inline-flex; }
}`;

  const js = `(function () {
  'use strict';

  // Sidebar navigation: swap the active item and page heading.
  var title = document.getElementById('dash-title');
  document.querySelectorAll('.dash-nav-item').forEach(function (item) {
    item.addEventListener('click', function () {
      document.querySelectorAll('.dash-nav-item').forEach(function (other) {
        other.classList.toggle('is-active', other === item);
      });
      if (title) title.textContent = item.getAttribute('data-view') || 'Overview';
    });
  });

  // Mobile sidebar toggle.
  var toggle = document.getElementById('sidebar-toggle');
  var sidebar = document.getElementById('dash-sidebar');
  if (toggle && sidebar) {
    toggle.addEventListener('click', function () {
      sidebar.classList.toggle('is-open');
    });
  }

  // Activity table filter.
  var filter = document.getElementById('activity-filter');
  var table = document.getElementById('activity-table');
  var emptyNote = document.getElementById('activity-empty');
  if (filter && table) {
    filter.addEventListener('input', function () {
      var query = filter.value.trim().toLowerCase();
      var visible = 0;
      table.querySelectorAll('tbody tr').forEach(function (row) {
        var match = row.textContent.toLowerCase().indexOf(query) !== -1;
        row.hidden = !match;
        if (match) visible += 1;
      });
      if (emptyNote) emptyNote.hidden = visible > 0;
    });
  }
})();`;

  return { body, css, js };
}
