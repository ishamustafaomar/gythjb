/**
 * Dashboard template — a real product shell: icon sidebar with
 * topic-appropriate sections, KPI cards with inline SVG sparklines and
 * delta pills, a conic-gradient donut with legend, archetype-styled bar
 * and line charts, progress-ring goal cards and a searchable, sortable
 * activity table with status pills. Date-range chips (7d/30d/90d) switch
 * between three fully seeded datasets and re-render charts and KPIs.
 */
import { createRng, type Rng } from '@/lib/seeded';
import type { ProjectSpec, TopicDomain } from '../../types';
import { contentFor, type TopicContent } from '../content';
import { icon, type IconName } from '../icons';
import { buildRuntimeJs } from '../runtime';
import {
  baseCss,
  cssVariables,
  deriveTheme,
  esc,
  mix,
  renderFooter,
  toJsLiteral,
  withAlpha,
  type TemplateOutput,
} from '../shared';

/* ------------------------------------------------------------------ */
/* Topic-aware chrome                                                  */
/* ------------------------------------------------------------------ */

const NAV_POOLS: Record<TopicDomain, ReadonlyArray<readonly [string, IconName]>> = {
  food: [['Overview', 'chart'], ['Orders', 'cart'], ['Menu', 'coffee'], ['Regulars', 'users'], ['Deliveries', 'truck']],
  plants: [['Overview', 'chart'], ['Greenhouse', 'leaf'], ['Orders', 'cart'], ['Care queue', 'heart'], ['Deliveries', 'truck']],
  tech: [['Overview', 'chart'], ['Deploys', 'zap'], ['Incidents', 'shield'], ['Teams', 'users'], ['Usage', 'code']],
  fitness: [['Overview', 'chart'], ['Sessions', 'dumbbell'], ['Members', 'users'], ['Timetable', 'clock'], ['Records', 'star']],
  fashion: [['Overview', 'chart'], ['Orders', 'cart'], ['Collections', 'shirt'], ['Clients', 'users'], ['Fittings', 'clock']],
  photography: [['Overview', 'chart'], ['Shoots', 'camera'], ['Clients', 'users'], ['Galleries', 'star'], ['Bookings', 'clock']],
  travel: [['Overview', 'chart'], ['Bookings', 'plane'], ['Routes', 'mapPin'], ['Travelers', 'users'], ['Reviews', 'star']],
  music: [['Overview', 'chart'], ['Releases', 'music'], ['Shows', 'play'], ['Listeners', 'users'], ['Royalties', 'star']],
  wellness: [['Overview', 'chart'], ['Bookings', 'clock'], ['Treatments', 'sun'], ['Clients', 'users'], ['Feedback', 'heart']],
  generic: [['Overview', 'chart'], ['Projects', 'sparkles'], ['Team', 'users'], ['Activity', 'zap'], ['Reports', 'search']],
};

interface StatusMeta {
  key: string;
  label: string;
  iconName: IconName;
}

const STATUSES: readonly StatusMeta[] = [
  { key: 'done', label: 'Complete', iconName: 'check' },
  { key: 'active', label: 'In progress', iconName: 'clock' },
  { key: 'review', label: 'In review', iconName: 'search' },
  { key: 'blocked', label: 'Blocked', iconName: 'close' },
];

const VERBS: readonly string[] = [
  'completed', 'picked up', 'commented on', 'reopened', 'shipped', 'flagged',
];

const RANGES = ['7d', '30d', '90d'] as const;
type RangeKey = (typeof RANGES)[number];

const RANGE_LABELS: Record<RangeKey, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
};

const RANGE_TIMES: Record<RangeKey, readonly string[]> = {
  '7d': ['12m ago', '1h ago', '4h ago', 'yesterday', '2 days ago', '4 days ago', '6 days ago'],
  '30d': ['2 days ago', '5 days ago', '1 wk ago', '2 wks ago', '3 wks ago', '3 wks ago', '4 wks ago'],
  '90d': ['1 wk ago', '3 wks ago', '1 mo ago', '6 wks ago', '2 mos ago', '10 wks ago', '3 mos ago'],
};

/* ------------------------------------------------------------------ */
/* Seeded datasets                                                     */
/* ------------------------------------------------------------------ */

interface DashKpi {
  label: string;
  value: string;
  delta: number;
  spark: number[];
}

interface DashRow {
  name: string;
  action: string;
  status: string;
  time: string;
  ts: number;
}

interface DashDataset {
  kpis: DashKpi[];
  bars: number[];
  line: number[];
  donut: number[];
  rows: DashRow[];
}

function groupDigits(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function walk(rng: Rng, count: number): number[] {
  const points: number[] = [];
  let value = rng.int(30, 60);
  for (let i = 0; i < count; i++) {
    value = Math.max(10, Math.min(95, value + rng.int(-14, 16)));
    points.push(value);
  }
  return points;
}

function buildDataset(rng: Rng, content: TopicContent, range: RangeKey): DashDataset {
  const mult = range === '7d' ? 1 : range === '30d' ? 4.2 : 12.5;
  const kpis: DashKpi[] = [];
  const statLabels = content.stats.slice(0, 4).map((stat) => stat.label);
  for (let i = 0; i < 4; i++) {
    const label = statLabels[i] ?? 'activity this period';
    const value = i === 3
      ? `${rng.int(72, 97)}%`
      : groupDigits(Math.round(rng.int(120, 4200) * mult));
    kpis.push({ label, value, delta: rng.int(-9, 24), spark: walk(rng, 12) });
  }

  const barCount = range === '7d' ? 7 : range === '30d' ? 10 : 12;
  const bars = Array.from({ length: barCount }, () => rng.int(18, 96));
  const line = walk(rng, 12);

  const a = rng.int(28, 40);
  const b = rng.int(20, 30);
  const c = rng.int(12, 20);
  const donut = [a, b, c, 100 - a - b - c];

  const times = RANGE_TIMES[range];
  const rows: DashRow[] = [];
  for (let i = 0; i < 7; i++) {
    const persona = content.personas[i % content.personas.length];
    const card = content.kanbanCards[(i * 2) % content.kanbanCards.length] ?? 'a task';
    const verb = VERBS[rng.int(0, VERBS.length - 1)] ?? 'updated';
    const status = STATUSES[rng.int(0, STATUSES.length - 1)]?.key ?? 'active';
    rows.push({
      name: persona?.name ?? 'Team member',
      action: `${verb} “${card}”`,
      status,
      time: times[i] ?? 'earlier',
      ts: i,
    });
  }

  return { kpis, bars, line, donut, rows };
}

/* ------------------------------------------------------------------ */
/* Server-side chart rendering (initial 7d state)                      */
/* ------------------------------------------------------------------ */

function sparkSvg(values: number[]): string {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values
    .map((value, i) => {
      const x = Math.round((i * (100 / (values.length - 1))) * 10) / 10;
      const y = Math.round((26 - ((value - min) / span) * 20) * 10) / 10;
      return `${x},${y}`;
    })
    .join(' ');
  const first = points.split(' ')[0] ?? '0,26';
  const last = points.split(' ').pop() ?? '100,26';
  const area = `M ${first.replace(',', ' ')} L ${points.replaceAll(' ', ' L ').replaceAll(',', ' ')} L ${last.split(',')[0]} 30 L ${first.split(',')[0]} 30 Z`;
  return `<svg class="spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><path class="spark-fill" d="${area}"></path><polyline class="spark-line" points="${points}"></polyline></svg>`;
}

function barRadius(spec: ProjectSpec): number {
  switch (spec.style.archetype) {
    case 'brutalist': return 0;
    case 'minimal': return 1;
    case 'editorial': return 1;
    default: return 4;
  }
}

function barChartSvg(values: number[], rx: number): string {
  const count = values.length;
  const slot = 320 / count;
  const width = Math.round(slot * 0.62);
  const bars = values
    .map((value, i) => {
      const height = Math.round((value / 100) * 118);
      const x = Math.round(i * slot + (slot - width) / 2);
      const y = 140 - height;
      return `<rect class="bar" x="${x}" y="${y}" width="${width}" height="${height}" rx="${rx}"><title>Period ${i + 1}: ${value}</title></rect>`;
    })
    .join('');
  return `<svg viewBox="0 0 320 150" role="img" aria-label="Bar chart" preserveAspectRatio="none"><line class="grid-line" x1="0" y1="140" x2="320" y2="140"></line><line class="grid-line" x1="0" y1="95" x2="320" y2="95"></line><line class="grid-line" x1="0" y1="50" x2="320" y2="50"></line>${bars}</svg>`;
}

function lineChartSvg(values: number[]): string {
  const points = values
    .map((value, i) => {
      const x = Math.round((10 + (i * 300) / (values.length - 1)) * 10) / 10;
      const y = Math.round((140 - (value / 100) * 118) * 10) / 10;
      return `${x},${y}`;
    })
    .join(' ');
  const first = points.split(' ')[0] ?? '10,140';
  const last = points.split(' ').pop() ?? '310,140';
  const area = `M ${first.split(',')[0]} 140 L ${points.replaceAll(' ', ' L ').replaceAll(',', ' ')} L ${last.split(',')[0]} 140 Z`;
  return `<svg viewBox="0 0 320 150" role="img" aria-label="Line chart" preserveAspectRatio="none"><line class="grid-line" x1="0" y1="140" x2="320" y2="140"></line><line class="grid-line" x1="0" y1="95" x2="320" y2="95"></line><line class="grid-line" x1="0" y1="50" x2="320" y2="50"></line><path class="area" d="${area}"></path><polyline class="line" points="${points}"></polyline></svg>`;
}

function donutGradient(values: number[], colors: readonly string[]): string {
  const stops: string[] = [];
  let acc = 0;
  values.forEach((value, i) => {
    const from = acc;
    acc += value;
    stops.push(`${colors[i % colors.length] ?? '#888888'} ${from}% ${acc}%`);
  });
  return `conic-gradient(${stops.join(', ')})`;
}

/* ------------------------------------------------------------------ */
/* Template                                                            */
/* ------------------------------------------------------------------ */

export function renderDashboard(spec: ProjectSpec): TemplateOutput {
  const rng = createRng(`${spec.seed}:dashboard`);
  const content = contentFor(spec.topic, createRng(`${spec.seed}:content`));
  const theme = deriveTheme(spec);
  const { archetype } = spec.style;
  const isBrut = archetype === 'brutalist';
  const hairline = isBrut ? '3px solid var(--text)' : '1px solid var(--border)';

  const datasets: Record<RangeKey, DashDataset> = {
    '7d': buildDataset(createRng(`${spec.seed}:dash:7d`), content, '7d'),
    '30d': buildDataset(createRng(`${spec.seed}:dash:30d`), content, '30d'),
    '90d': buildDataset(createRng(`${spec.seed}:dash:90d`), content, '90d'),
  };
  const initial = datasets['7d'];

  const donutColors: readonly string[] = [
    theme.primary,
    theme.accent,
    mix(theme.primary, theme.accent, 0.5),
    spec.palette.mode === 'dark'
      ? mix(theme.primary, '#FFFFFF', 0.45)
      : mix(theme.primary, '#000000', 0.35),
  ];

  const categories: string[] = [];
  for (const product of content.products) {
    if (!categories.includes(product.category)) categories.push(product.category);
    if (categories.length === 4) break;
  }
  while (categories.length < 4) categories.push('Other');

  const navItems = NAV_POOLS[spec.topic]
    .map(
      ([label, glyph], index) =>
        `        <button class="dash-nav-item${index === 0 ? ' is-active' : ''}" type="button" data-view="${esc(label)}">${icon(glyph, 'dash-nav-icon')}<span>${esc(label)}</span></button>`,
    )
    .join('\n');

  const kpiCards = initial.kpis
    .map((kpi, i) => {
      const up = kpi.delta >= 0;
      return `        <article class="card kpi-card" data-reveal data-reveal-delay="${i * 70}">
          <div class="kpi-top">
            <span class="kpi-label" data-kpi-label="${i}">${esc(kpi.label)}</span>
            <span class="delta-pill ${up ? 'delta-up' : 'delta-down'}" data-kpi-delta="${i}">${up ? '▲' : '▼'} ${Math.abs(kpi.delta)}%</span>
          </div>
          <strong class="kpi-value" data-kpi-value="${i}">${esc(kpi.value)}</strong>
          <div class="kpi-spark" data-kpi-spark="${i}">${sparkSvg(kpi.spark)}</div>
        </article>`;
    })
    .join('\n');

  const rangeChips = RANGES
    .map(
      (range, i) =>
        `          <button class="range-chip${i === 0 ? ' is-active' : ''}" type="button" data-range="${range}" aria-pressed="${i === 0 ? 'true' : 'false'}">${range}</button>`,
    )
    .join('\n');

  const donutLegend = categories
    .map(
      (category, i) => `            <li><span class="legend-swatch" style="background:${donutColors[i % donutColors.length] ?? theme.primary}"></span><span class="legend-label">${esc(category)}</span><strong class="legend-value" data-donut-value="${i}">${initial.donut[i] ?? 0}%</strong></li>`,
    )
    .join('\n');

  const goals = [0, 1].map((i) => {
    const idea = content.featureIdeas[i];
    return {
      title: idea?.title ?? 'Quarter goal',
      pct: rng.int(46, 92),
      note: rng.pick(['On track', 'Ahead of plan', 'Needs a push']),
    };
  });
  const goalCards = goals
    .map(
      (goal, i) => `        <article class="card goal-card" data-reveal data-reveal-delay="${i * 90}">
          <div class="goal-ring" style="--pct:${goal.pct}" role="img" aria-label="${goal.pct}% of goal">
            <span class="goal-ring-center"><strong>${goal.pct}%</strong></span>
          </div>
          <div class="goal-copy">
            <h3>${esc(goal.title)}</h3>
            <p>${esc(goal.note)} · ${esc(RANGE_LABELS['90d'].toLowerCase())}</p>
          </div>
        </article>`,
    )
    .join('\n');

  const statusMetaFor = (key: string): StatusMeta =>
    STATUSES.find((status) => status.key === key) ?? { key: 'active', label: 'In progress', iconName: 'clock' };

  const initialRows = initial.rows
    .map((row) => {
      const meta = statusMetaFor(row.status);
      return `              <tr>
                <td>${esc(row.name)}</td>
                <td>${esc(row.action)}</td>
                <td><span class="status-pill pill-${meta.key}">${icon(meta.iconName, 'pill-icon')}${esc(meta.label)}</span></td>
                <td class="activity-time">${esc(row.time)}</td>
              </tr>`;
    })
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
        <button id="sidebar-toggle" class="btn btn-ghost" type="button" aria-label="Toggle navigation">${icon('menu')}</button>
        <h1 id="dash-title">Overview</h1>
        <div class="range-chips" role="group" aria-label="Date range">
${rangeChips}
        </div>
      </header>
      <main class="app-main dash-main">
        <section class="kpi-grid" aria-label="Key metrics">
${kpiCards}
        </section>
        <section class="chart-row" aria-label="Charts">
          <article class="card chart-card" data-reveal>
            <div class="chart-card-head"><h2>Volume</h2><span class="chart-sub" data-range-label>${RANGE_LABELS['7d']}</span></div>
            <div id="bar-chart">${barChartSvg(initial.bars, barRadius(spec))}</div>
          </article>
          <article class="card chart-card" data-reveal data-reveal-delay="80">
            <div class="chart-card-head"><h2>Trend</h2><span class="chart-sub" data-range-label>${RANGE_LABELS['7d']}</span></div>
            <div id="line-chart">${lineChartSvg(initial.line)}</div>
          </article>
          <article class="card chart-card donut-card" data-reveal data-reveal-delay="160">
            <div class="chart-card-head"><h2>Mix</h2><span class="chart-sub" data-range-label>${RANGE_LABELS['7d']}</span></div>
            <div class="donut-wrap">
              <div class="donut" id="donut" style="background:${donutGradient(initial.donut, donutColors)}" role="img" aria-label="Share by category">
                <span class="donut-hole"><strong data-donut-lead>${initial.donut[0] ?? 0}%</strong><span>${esc(categories[0] ?? 'Top')}</span></span>
              </div>
              <ul class="donut-legend">
${donutLegend}
              </ul>
            </div>
          </article>
        </section>
        <section class="goal-row" aria-label="Goals">
${goalCards}
        </section>
        <section class="card activity" aria-label="Recent activity">
          <div class="activity-head">
            <h2>Recent activity</h2>
            <label class="sr-only" for="activity-filter">Filter activity</label>
            <input id="activity-filter" type="search" placeholder="Filter activity" />
          </div>
          <div class="activity-scroll">
            <table id="activity-table">
              <thead>
                <tr>
                  <th><button class="th-sort" type="button" data-sort="name">Member<span class="sort-ind" aria-hidden="true"></span></button></th>
                  <th><button class="th-sort" type="button" data-sort="action">Action<span class="sort-ind" aria-hidden="true"></span></button></th>
                  <th><button class="th-sort" type="button" data-sort="status">Status<span class="sort-ind" aria-hidden="true"></span></button></th>
                  <th><button class="th-sort" type="button" data-sort="ts">When<span class="sort-ind" aria-hidden="true"></span></button></th>
                </tr>
              </thead>
              <tbody id="activity-body">
${initialRows}
              </tbody>
            </table>
          </div>
          <p id="activity-empty" hidden>Nothing matches that filter.</p>
        </section>
      </main>
${renderFooter(spec)}
    </div>
  </div>`;

  /* ---------------------------- CSS -------------------------------- */

  const sidebarChrome = (() => {
    switch (archetype) {
      case 'brutalist':
        return `background: var(--surface); border-right: 3px solid var(--text);`;
      case 'gradient':
        return `background: ${withAlpha(theme.surface, 0.55)}; border-right: 1px solid var(--border); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);`;
      case 'soft':
        return `background: var(--surface); border-right: 0; box-shadow: var(--shadow);`;
      case 'editorial':
        return `background: var(--surface); border-right: 1px solid var(--border);`;
      case 'minimal':
        return `background: var(--bg); border-right: 1px solid var(--border);`;
    }
  })();

  const navItemLook = isBrut
    ? `.dash-nav-item { border: 2px solid transparent; text-transform: uppercase; font-size: 0.78rem; letter-spacing: 0.04em; }
.dash-nav-item.is-active { border-color: var(--text); background: var(--accent-soft); color: var(--text); }`
    : `.dash-nav-item.is-active { background: var(--primary-soft); color: var(--primary-strong); }`;

  const pillBorder = isBrut ? 'border: 2px solid var(--text);' : 'border: 0;';

  const css = `${cssVariables(spec)}

${baseCss(spec)}

/* Dashboard shell */
.dash-layout { display: grid; grid-template-columns: 240px 1fr; min-height: 100vh; }
.dash-sidebar { ${sidebarChrome} padding: 1.25rem 1rem; display: flex; flex-direction: column; gap: 1.5rem; }
.dash-nav { display: grid; gap: 0.25rem; }
.dash-nav-item {
  display: flex; align-items: center; gap: 0.6rem; text-align: left; border: 0;
  background: transparent; color: var(--muted); padding: 0.55rem 0.75rem;
  border-radius: var(--radius-sm); cursor: pointer; font-weight: 600;
}
.dash-nav-item:hover { color: var(--primary); background: var(--surface-alt); }
.dash-nav-icon { width: 1.05rem; height: 1.05rem; flex: none; }
${navItemLook}
.dash-sidebar-note { margin-top: auto; color: var(--muted); font-size: 0.8rem; }
.dash-body { display: flex; flex-direction: column; min-width: 0; }
.dash-topbar {
  display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1.5rem;
  border-bottom: ${hairline}; background: var(--header-bg); flex-wrap: wrap;
}
.dash-topbar h1 { font-size: 1.25rem; margin-right: auto; }
#sidebar-toggle { display: none; padding: 0.35rem 0.55rem; }
#sidebar-toggle svg { width: 1.1rem; height: 1.1rem; }
.dash-main { padding-inline: 1.5rem; display: grid; gap: var(--gap); width: 100%; }
.dash-body .site-footer { padding-inline: 1.5rem; }
.dash-body .footer-inner { width: 100%; }

/* Date-range chips */
.range-chips { display: inline-flex; gap: 0.3rem; }
.range-chip {
  border: ${isBrut ? '2px solid var(--text)' : '1px solid var(--border)'}; background: var(--surface);
  color: var(--muted); border-radius: var(--radius-btn); padding: 0.25rem 0.7rem;
  font-size: 0.78rem; font-weight: 700; cursor: pointer; text-transform: uppercase; letter-spacing: 0.04em;
}
.range-chip:hover { color: var(--primary); border-color: var(--primary); }
.range-chip.is-active { background: var(--primary); color: var(--primary-contrast); border-color: var(--primary); }

/* KPI cards */
.kpi-grid { display: grid; gap: var(--gap); grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); }
.kpi-card { padding: 1.1rem 1.2rem 0.9rem; display: grid; gap: 0.4rem; align-content: start; }
.kpi-top { display: flex; align-items: baseline; justify-content: space-between; gap: 0.5rem; }
.kpi-label { color: var(--muted); font-size: 0.8rem; line-height: 1.3; }
.kpi-value { font-size: 1.65rem; letter-spacing: -0.02em; font-variant-numeric: tabular-nums;${archetype === 'editorial' ? ' font-family: var(--font-display);' : ''} }
.delta-pill {
  ${pillBorder} border-radius: var(--radius-btn); padding: 0.1rem 0.5rem; flex: none;
  font-size: 0.72rem; font-weight: 800; font-variant-numeric: tabular-nums; white-space: nowrap;
}
.delta-up { background: var(--primary-soft); color: var(--primary-strong); }
.delta-down { background: ${withAlpha('#D64550', 0.14)}; color: #D64550; }
.kpi-spark { height: 2.1rem; }
.spark { width: 100%; height: 100%; display: block; }
.spark-line { fill: none; stroke: var(--primary); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
.spark-fill { fill: var(--primary-soft); opacity: 0.7; }

/* Charts */
.chart-row { display: grid; gap: var(--gap); grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); }
.chart-card { padding: 1.2rem; display: grid; gap: 0.8rem; align-content: start; }
.chart-card-head { display: flex; align-items: baseline; justify-content: space-between; gap: 0.75rem; }
.chart-card h2 { font-size: 1rem; }
.chart-sub { color: var(--muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; }
.chart-card svg { width: 100%; height: 165px; }
.bar { fill: var(--primary);${isBrut ? ' stroke: var(--text); stroke-width: 2;' : ''} }
.bar:hover { fill: var(--accent); }
.line { fill: none; stroke: var(--primary); stroke-width: ${isBrut ? '3' : '2.5'}; stroke-linejoin: round;${isBrut ? '' : ' stroke-linecap: round;'} }
.area { fill: var(--primary-soft); opacity: 0.8; }
.grid-line { stroke: var(--border); stroke-width: 1; }

/* Donut */
.donut-wrap { display: flex; gap: 1.2rem; align-items: center; flex-wrap: wrap; }
.donut {
  width: 9.5rem; aspect-ratio: 1; border-radius: 50%; flex: none;
  display: grid; place-items: center;${isBrut ? ' border: 3px solid var(--text);' : ''}
}
.donut-hole {
  width: 62%; aspect-ratio: 1; border-radius: 50%; background: var(--surface);
  display: grid; place-items: center; align-content: center; text-align: center; gap: 0;${isBrut ? ' border: 3px solid var(--text);' : ''}
}
.donut-hole strong { font-size: 1.25rem; font-variant-numeric: tabular-nums; }
.donut-hole > span { font-size: 0.66rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; }
.donut-legend { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.45rem; flex: 1; min-width: 8rem; }
.donut-legend li { display: flex; align-items: center; gap: 0.5rem; font-size: 0.84rem; }
.legend-swatch { width: 0.7rem; height: 0.7rem; border-radius: var(--radius-sm); flex: none;${isBrut ? ' border: 2px solid var(--text);' : ''} }
.legend-label { color: var(--muted); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.legend-value { font-variant-numeric: tabular-nums; }

/* Goal rings */
.goal-row { display: grid; gap: var(--gap); grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); }
.goal-card { padding: 1.1rem 1.2rem; display: flex; gap: 1rem; align-items: center; }
.goal-ring {
  width: 4.4rem; aspect-ratio: 1; border-radius: 50%; flex: none; display: grid; place-items: center;
  background: conic-gradient(var(--primary) calc(var(--pct) * 1%), var(--surface-alt) 0);${isBrut ? ' border: 3px solid var(--text);' : ''}
}
.goal-ring-center {
  width: 72%; aspect-ratio: 1; border-radius: 50%; background: var(--surface);
  display: grid; place-items: center;${isBrut ? ' border: 2px solid var(--text);' : ''}
}
.goal-ring-center strong { font-size: 0.86rem; font-variant-numeric: tabular-nums; }
.goal-copy h3 { font-size: 0.95rem; }
.goal-copy p { color: var(--muted); font-size: 0.8rem; margin-top: 0.2rem; }

/* Activity table */
.activity { padding: 1.25rem; }
.activity-head { display: flex; justify-content: space-between; gap: 1rem; align-items: center; margin-bottom: 0.9rem; flex-wrap: wrap; }
.activity-head h2 { font-size: 1rem; }
.activity-head input { max-width: 15rem; }
.activity-scroll { overflow-x: auto; }
#activity-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; min-width: 34rem; }
#activity-table th { text-align: left; padding: 0; border-bottom: ${hairline}; }
.th-sort {
  border: 0; background: transparent; cursor: pointer; width: 100%; text-align: left;
  color: var(--muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em;
  font-weight: 700; padding: 0.5rem 0.6rem; display: inline-flex; align-items: center; gap: 0.3rem;
}
.th-sort:hover { color: var(--primary); }
.sort-ind { font-size: 0.7rem; }
#activity-table td { padding: 0.6rem; border-bottom: 1px solid var(--border); }
#activity-table tbody tr:hover { background: var(--surface-alt); }
.activity-time { color: var(--muted); white-space: nowrap; font-variant-numeric: tabular-nums; }
.status-pill {
  display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.14rem 0.6rem;
  border-radius: var(--radius-btn); font-size: 0.76rem; font-weight: 700; white-space: nowrap;
  ${isBrut ? 'border: 2px solid var(--text);' : ''}
}
.pill-icon { width: 0.8rem; height: 0.8rem; flex: none; }
.pill-done { background: var(--primary-soft); color: var(--primary-strong); }
.pill-active { background: var(--accent-soft); color: var(--text); }
.pill-review { background: var(--surface-alt); color: var(--muted); }
.pill-blocked { background: ${withAlpha('#D64550', 0.14)}; color: #D64550; }
#activity-empty { color: var(--muted); padding-top: 0.9rem; }

/* Reveal states (armed by runtime; nothing hides without JS + motion) */
@media (prefers-reduced-motion: no-preference) {
  html.js-reveal [data-reveal] { opacity: 0; transform: translateY(12px); transition: opacity 0.5s ease, transform 0.5s ease; }
  html.js-reveal [data-reveal].is-revealed { opacity: 1; transform: none; }
}

@media (max-width: 900px) {
  .dash-layout { grid-template-columns: 1fr; }
  .dash-sidebar { display: none; border-right: 0; border-bottom: ${hairline}; }
  .dash-sidebar.is-open { display: flex; }
  #sidebar-toggle { display: inline-flex; }
  .donut-wrap { justify-content: center; }
}`;

  /* ----------------------------- JS -------------------------------- */

  const statusMetaJs: Record<string, { label: string; cls: string; svg: string }> = {};
  for (const status of STATUSES) {
    statusMetaJs[status.key] = {
      label: status.label,
      cls: `pill-${status.key}`,
      svg: icon(status.iconName, 'pill-icon'),
    };
  }

  const js = `${buildRuntimeJs()}
(function () {
  'use strict';

  var DATASETS = ${toJsLiteral(datasets)};
  var RANGE_LABELS = ${toJsLiteral(RANGE_LABELS)};
  var STATUS_META = ${toJsLiteral(statusMetaJs)};
  var DONUT_COLORS = ${toJsLiteral(donutColors)};
  var BAR_RX = ${barRadius(spec)};

  var state = { range: '7d', query: '', sortKey: null, sortDir: 1 };

  /* ------------------------- chart builders ------------------------ */

  function sparkSvg(values) {
    var min = Math.min.apply(null, values);
    var max = Math.max.apply(null, values);
    var span = max - min || 1;
    var pts = [];
    for (var i = 0; i < values.length; i++) {
      var x = Math.round(i * (100 / (values.length - 1)) * 10) / 10;
      var y = Math.round((26 - ((values[i] - min) / span) * 20) * 10) / 10;
      pts.push(x + ',' + y);
    }
    var points = pts.join(' ');
    var area = 'M ' + pts[0].replace(',', ' ') +
      ' L ' + points.split(' ').join(' L ').split(',').join(' ') +
      ' L ' + pts[pts.length - 1].split(',')[0] + ' 30 L ' + pts[0].split(',')[0] + ' 30 Z';
    return '<svg class="spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">' +
      '<path class="spark-fill" d="' + area + '"></path>' +
      '<polyline class="spark-line" points="' + points + '"></polyline></svg>';
  }

  function barChartSvg(values) {
    var slot = 320 / values.length;
    var width = Math.round(slot * 0.62);
    var bars = '';
    for (var i = 0; i < values.length; i++) {
      var height = Math.round((values[i] / 100) * 118);
      var x = Math.round(i * slot + (slot - width) / 2);
      bars += '<rect class="bar" x="' + x + '" y="' + (140 - height) + '" width="' + width +
        '" height="' + height + '" rx="' + BAR_RX + '"><title>Period ' + (i + 1) + ': ' + values[i] + '</title></rect>';
    }
    return '<svg viewBox="0 0 320 150" role="img" aria-label="Bar chart" preserveAspectRatio="none">' +
      '<line class="grid-line" x1="0" y1="140" x2="320" y2="140"></line>' +
      '<line class="grid-line" x1="0" y1="95" x2="320" y2="95"></line>' +
      '<line class="grid-line" x1="0" y1="50" x2="320" y2="50"></line>' + bars + '</svg>';
  }

  function lineChartSvg(values) {
    var pts = [];
    for (var i = 0; i < values.length; i++) {
      var x = Math.round((10 + (i * 300) / (values.length - 1)) * 10) / 10;
      var y = Math.round((140 - (values[i] / 100) * 118) * 10) / 10;
      pts.push(x + ',' + y);
    }
    var points = pts.join(' ');
    var area = 'M ' + pts[0].split(',')[0] + ' 140 L ' +
      points.split(' ').join(' L ').split(',').join(' ') +
      ' L ' + pts[pts.length - 1].split(',')[0] + ' 140 Z';
    return '<svg viewBox="0 0 320 150" role="img" aria-label="Line chart" preserveAspectRatio="none">' +
      '<line class="grid-line" x1="0" y1="140" x2="320" y2="140"></line>' +
      '<line class="grid-line" x1="0" y1="95" x2="320" y2="95"></line>' +
      '<line class="grid-line" x1="0" y1="50" x2="320" y2="50"></line>' +
      '<path class="area" d="' + area + '"></path>' +
      '<polyline class="line" points="' + points + '"></polyline></svg>';
  }

  function donutGradient(values) {
    var stops = [];
    var acc = 0;
    for (var i = 0; i < values.length; i++) {
      var from = acc;
      acc += values[i];
      stops.push(DONUT_COLORS[i % DONUT_COLORS.length] + ' ' + from + '% ' + acc + '%');
    }
    return 'conic-gradient(' + stops.join(', ') + ')';
  }

  /* --------------------------- rendering --------------------------- */

  function data() { return DATASETS[state.range] || DATASETS['7d']; }

  function renderKpis() {
    var kpis = data().kpis;
    kpis.forEach(function (kpi, i) {
      var label = document.querySelector('[data-kpi-label="' + i + '"]');
      var value = document.querySelector('[data-kpi-value="' + i + '"]');
      var delta = document.querySelector('[data-kpi-delta="' + i + '"]');
      var spark = document.querySelector('[data-kpi-spark="' + i + '"]');
      if (label) label.textContent = kpi.label;
      if (value) value.textContent = kpi.value;
      if (delta) {
        var up = kpi.delta >= 0;
        delta.className = 'delta-pill ' + (up ? 'delta-up' : 'delta-down');
        delta.textContent = (up ? '\\u25B2 ' : '\\u25BC ') + Math.abs(kpi.delta) + '%';
      }
      if (spark) spark.innerHTML = sparkSvg(kpi.spark);
    });
  }

  function renderCharts() {
    var set = data();
    var barHost = document.getElementById('bar-chart');
    var lineHost = document.getElementById('line-chart');
    var donut = document.getElementById('donut');
    if (barHost) barHost.innerHTML = barChartSvg(set.bars);
    if (lineHost) lineHost.innerHTML = lineChartSvg(set.line);
    if (donut) donut.style.background = donutGradient(set.donut);
    var lead = document.querySelector('[data-donut-lead]');
    if (lead) lead.textContent = set.donut[0] + '%';
    set.donut.forEach(function (value, i) {
      var slot = document.querySelector('[data-donut-value="' + i + '"]');
      if (slot) slot.textContent = value + '%';
    });
    document.querySelectorAll('[data-range-label]').forEach(function (el) {
      el.textContent = RANGE_LABELS[state.range] || '';
    });
  }

  function visibleRows() {
    var rows = data().rows.slice();
    if (state.query) {
      rows = rows.filter(function (row) {
        var meta = STATUS_META[row.status] || { label: '' };
        var hay = (row.name + ' ' + row.action + ' ' + meta.label + ' ' + row.time).toLowerCase();
        return hay.indexOf(state.query) !== -1;
      });
    }
    if (state.sortKey) {
      var key = state.sortKey;
      var dir = state.sortDir;
      rows.sort(function (a, b) {
        var va = key === 'status' ? (STATUS_META[a.status] || {}).label || '' : a[key];
        var vb = key === 'status' ? (STATUS_META[b.status] || {}).label || '' : b[key];
        if (va < vb) return -dir;
        if (va > vb) return dir;
        return 0;
      });
    }
    return rows;
  }

  function renderTable() {
    var tbody = document.getElementById('activity-body');
    var emptyNote = document.getElementById('activity-empty');
    if (!tbody) return;
    tbody.textContent = '';
    var rows = visibleRows();
    rows.forEach(function (row) {
      var tr = document.createElement('tr');
      var nameTd = document.createElement('td');
      nameTd.textContent = row.name;
      var actionTd = document.createElement('td');
      actionTd.textContent = row.action;
      var statusTd = document.createElement('td');
      var meta = STATUS_META[row.status] || STATUS_META.active;
      var pill = document.createElement('span');
      pill.className = 'status-pill ' + meta.cls;
      pill.innerHTML = meta.svg;
      pill.appendChild(document.createTextNode(meta.label));
      statusTd.appendChild(pill);
      var timeTd = document.createElement('td');
      timeTd.className = 'activity-time';
      timeTd.textContent = row.time;
      tr.appendChild(nameTd);
      tr.appendChild(actionTd);
      tr.appendChild(statusTd);
      tr.appendChild(timeTd);
      tbody.appendChild(tr);
    });
    if (emptyNote) emptyNote.hidden = rows.length > 0;
    document.querySelectorAll('.th-sort').forEach(function (button) {
      var ind = button.querySelector('.sort-ind');
      if (!ind) return;
      if (button.getAttribute('data-sort') === state.sortKey) {
        ind.textContent = state.sortDir === 1 ? '\\u2191' : '\\u2193';
      } else {
        ind.textContent = '';
      }
    });
  }

  function renderAll() {
    renderKpis();
    renderCharts();
    renderTable();
  }

  /* ---------------------------- wiring ----------------------------- */

  document.querySelectorAll('[data-range]').forEach(function (chip) {
    chip.addEventListener('click', function () {
      var range = chip.getAttribute('data-range');
      if (!range || !DATASETS[range] || range === state.range) return;
      state.range = range;
      document.querySelectorAll('[data-range]').forEach(function (other) {
        var active = other === chip;
        other.classList.toggle('is-active', active);
        other.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      renderAll();
    });
  });

  var filter = document.getElementById('activity-filter');
  if (filter) {
    filter.addEventListener('input', function () {
      state.query = filter.value.trim().toLowerCase();
      renderTable();
    });
  }

  document.querySelectorAll('.th-sort').forEach(function (button) {
    button.addEventListener('click', function () {
      var key = button.getAttribute('data-sort');
      if (!key) return;
      if (state.sortKey === key) {
        state.sortDir = -state.sortDir;
      } else {
        state.sortKey = key;
        state.sortDir = 1;
      }
      renderTable();
    });
  });

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
})();`;

  return { body, css, js };
}
