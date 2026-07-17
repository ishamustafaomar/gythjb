/**
 * Seeded, topic-aware decorative art builders.
 *
 * Everything here returns plain HTML + CSS strings that shared.ts merges
 * into the generated stylesheet. All variety flows from the caller's Rng,
 * colors come from the theme's CSS variables, and any animation is wrapped
 * in a prefers-reduced-motion: no-preference media query.
 */
import type { Rng } from '@/lib/seeded';
import type { ProjectSpec, TopicDomain } from '../types';
import type { TopicContent } from './content';
import { icon, topicIcon } from './icons';

export interface ArtPiece {
  html: string;
  css: string;
}

function escText(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Card chrome matching the archetype: minimal stays shadow-free with a
 * hairline border, brutalist keeps thick borders + offset shadow, the rest
 * get their soft/glassy surfaces.
 */
function frameCss(spec: ProjectSpec): string {
  switch (spec.style.archetype) {
    case 'minimal':
      return 'background: var(--surface); border: 1px solid var(--border);';
    case 'brutalist':
      return 'background: var(--surface); border: 3px solid var(--text); box-shadow: var(--shadow);';
    case 'gradient':
      return 'background: var(--surface); border: 1px solid var(--border); box-shadow: var(--shadow);';
    case 'editorial':
      return 'background: var(--surface); border: 1px solid var(--border); box-shadow: var(--shadow);';
    case 'soft':
      return 'background: var(--surface); border: 0; box-shadow: var(--shadow);';
  }
}

const HP_BASE = `.hp { position: relative; width: 100%; max-width: 26rem; margin-inline: auto; }
.hp * { box-sizing: border-box; }
.hp-card { border-radius: var(--radius-lg); overflow: hidden; }`;

/* ------------------------------------------------------------------ */
/* Hero props (one per topic, 2+ seeded variants each)                 */
/* ------------------------------------------------------------------ */

function techProp(spec: ProjectSpec, rng: Rng): ArtPiece {
  const variant = rng.int(1, 2);
  const heights = Array.from({ length: 7 }, () => rng.int(28, 96));
  const cols = heights
    .map((h, i) => `<span class="hp-col${i === rng.int(0, 6) ? ' hp-col-hot' : ''}" style="height:${h}%"></span>`)
    .join('');
  const sideRows = variant === 1
    ? `<div class="hp-side">${'<span class="hp-side-row"></span>'.repeat(4)}</div>`
    : '';
  const chips = variant === 2
    ? `<div class="hp-chips"><span class="hp-chip-stat">+${rng.int(8, 32)}%</span><span class="hp-chip-stat hp-chip-alt">${rng.int(2, 9)}.${rng.int(0, 9)}k</span></div>`
    : '';
  const html = `<div class="hp hp-browser hp-browser-v${variant}">
  <div class="hp-card hp-window">
    <div class="hp-winbar"><span class="hp-dot"></span><span class="hp-dot"></span><span class="hp-dot"></span><span class="hp-addr"></span></div>
    <div class="hp-winbody">
      ${sideRows}<div class="hp-winmain">
        ${chips}<div class="hp-chart">${cols}</div>
        <div class="hp-lines"><span class="hp-line" style="width:72%"></span><span class="hp-line" style="width:48%"></span></div>
      </div>
    </div>
  </div>
</div>`;
  const css = `.hp-window { ${frameCss(spec)} }
.hp-winbar { display: flex; align-items: center; gap: 0.35rem; padding: 0.6rem 0.8rem; border-bottom: 1px solid var(--border); }
.hp-dot { width: 0.55rem; height: 0.55rem; border-radius: 50%; background: var(--border); }
.hp-dot:first-child { background: var(--accent); }
.hp-addr { flex: 1; height: 0.55rem; margin-left: 0.4rem; border-radius: 999px; background: var(--surface-alt); }
.hp-winbody { display: flex; gap: 0.8rem; padding: 0.9rem; }
.hp-side { display: grid; gap: 0.45rem; width: 27%; align-content: start; }
.hp-side-row { height: 0.5rem; border-radius: 999px; background: var(--surface-alt); }
.hp-side-row:first-child { background: var(--primary-soft); }
.hp-winmain { flex: 1; display: grid; gap: 0.7rem; align-content: start; }
.hp-chips { display: flex; gap: 0.4rem; }
.hp-chip-stat { font-size: 0.7rem; font-weight: 700; padding: 0.15rem 0.5rem; border-radius: var(--radius-sm); background: var(--primary-soft); color: var(--primary-strong); }
.hp-chip-alt { background: var(--accent-soft); }
.hp-chart { display: flex; align-items: flex-end; gap: 0.35rem; height: 6.5rem; }
.hp-col { flex: 1; border-radius: var(--radius-sm) var(--radius-sm) 0 0; background: var(--primary-soft); }
.hp-col-hot { background: var(--primary); }
.hp-lines { display: grid; gap: 0.4rem; }
.hp-line { height: 0.5rem; border-radius: 999px; background: var(--surface-alt); }`;
  return { html, css };
}

function photographyProp(
  spec: ProjectSpec,
  rng: Rng,
  content: TopicContent,
  instance: number,
): ArtPiece {
  const variant = rng.int(1, 2);
  const tilts = variant === 1 ? [-5, 3, -1] : [6, -4, 1];
  const captionCount = content.galleryProjects.length;
  const cards = tilts
    .map((tilt, i) => {
      const caption =
        (captionCount > 0
          ? content.galleryProjects[(instance * tilts.length + i) % captionCount]
          : undefined) ?? 'Untitled series';
      return `<figure class="hp-photo hp-photo-${i + 1}" style="--tilt:${tilt}deg">
      <div class="hp-photo-img hp-mesh-${i + 1}"></div>
      <figcaption>${escText(caption)}</figcaption>
    </figure>`;
    })
    .join('\n    ');
  const meshes = [1, 2, 3]
    .map((i) => {
      const x = rng.int(10, 90);
      const y = rng.int(10, 90);
      return `.hp-mesh-${i} { background: radial-gradient(120% 100% at ${x}% ${y}%, var(--primary-soft), transparent 70%), radial-gradient(100% 120% at ${100 - x}% ${100 - y}%, var(--accent-soft), transparent 65%), var(--surface-alt); }`;
    })
    .join('\n');
  const html = `<div class="hp hp-photos hp-photos-v${variant}">
    ${cards}
</div>`;
  const css = `.hp-photos { display: grid; place-items: center; min-height: 20rem; }
.hp-photo { grid-area: 1 / 1; width: 68%; margin: 0; padding: 0.6rem 0.6rem 0.9rem; transform: rotate(var(--tilt)); border-radius: var(--radius-md); ${frameCss(spec)} }
.hp-photo-1 { translate: -12% -6%; }
.hp-photo-2 { translate: 12% 4%; }
.hp-photo-3 { translate: 0 12%; }
.hp-photo-img { aspect-ratio: 4 / 3; border-radius: var(--radius-sm); }
.hp-photo figcaption { margin-top: 0.5rem; font-size: 0.72rem; color: var(--muted); }
${meshes}`;
  return { html, css };
}

function foodProp(
  spec: ProjectSpec,
  rng: Rng,
  content: TopicContent,
  instance: number,
): ArtPiece {
  const variant = rng.int(1, 2);
  const kicker = rng.pick(['From the counter', 'Today at the pass', 'On the chalkboard']);
  const title = rng.pick(['The short menu', 'This morning', 'House favorites']);
  // Each instance reads a different window of the product pool, so two
  // menu cards on one page never list the same items.
  const productCount = content.products.length;
  const rows = Array.from({ length: Math.min(3, productCount) }, (_, i) => {
    const product = content.products[(instance * 3 + i) % productCount];
    return product === undefined
      ? ''
      : `<li class="hp-menu-row"><span>${escText(product.name)}</span><span class="hp-menu-dots"></span><strong>$${product.price}</strong></li>`;
  }).join('\n      ');
  const foot = variant === 2
    ? `<div class="hp-menu-stamp">${icon(topicIcon('food'))}</div>`
    : `<p class="hp-menu-foot">${escText(content.hoursLine)}</p>`;
  const html = `<div class="hp hp-menu hp-menu-v${variant}">
  <div class="hp-card hp-menu-card">
    <span class="hp-menu-kicker">${escText(kicker)}</span>
    <p class="hp-menu-title">${escText(title)}</p>
    <ul class="hp-menu-list">
      ${rows}
    </ul>
    ${foot}
  </div>
</div>`;
  const css = `.hp-menu-card { padding: 1.4rem 1.5rem; ${frameCss(spec)} }
.hp-menu-v2 .hp-menu-card { background-image: linear-gradient(var(--border), var(--border)); background-size: 60% 1px; background-repeat: no-repeat; background-position: 50% 3.4rem; }
.hp-menu-kicker { font-size: 0.68rem; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: var(--primary); }
.hp-menu-title { margin: 0.3rem 0 1rem; font-weight: 800; font-size: 1.25rem; font-family: var(--font-display); }
.hp-menu-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.7rem; }
.hp-menu-row { display: flex; align-items: baseline; gap: 0.5rem; font-size: 0.85rem; }
.hp-menu-row strong { font-variant-numeric: tabular-nums; }
.hp-menu-dots { flex: 1; border-bottom: 2px dotted var(--border); }
.hp-menu-foot { margin: 1.1rem 0 0; padding-top: 0.8rem; border-top: 1px dashed var(--border); font-size: 0.72rem; color: var(--muted); }
.hp-menu-stamp { margin-top: 1.1rem; width: 2.6rem; height: 2.6rem; display: grid; place-items: center; border: 2px solid var(--primary); border-radius: 50%; color: var(--primary); }
.hp-menu-stamp svg { width: 1.2rem; height: 1.2rem; }`;
  return { html, css };
}

function plantsProp(spec: ProjectSpec, rng: Rng): ArtPiece {
  const variant = rng.int(1, 2);
  const sway = rng.int(-8, 8);
  const html = `<div class="hp hp-arch hp-arch-v${variant}">
  <div class="hp-card hp-arch-card">
    <span class="hp-leaf hp-leaf-1"></span>
    <span class="hp-leaf hp-leaf-2"></span>
    <span class="hp-leaf hp-leaf-3"></span>
    ${variant === 2 ? '<span class="hp-leaf hp-leaf-4"></span>' : '<span class="hp-arch-sill"></span>'}
  </div>
</div>`;
  const css = `.hp-arch-card { position: relative; aspect-ratio: 3 / 4; max-width: 20rem; margin-inline: auto; border-radius: 999px 999px var(--radius-lg) var(--radius-lg); ${frameCss(spec)} background: linear-gradient(180deg, var(--accent-soft), var(--surface)); }
.hp-leaf { position: absolute; background: radial-gradient(closest-side, var(--primary-soft), var(--primary) 140%); opacity: 0.85; }
.hp-leaf-1 { width: 46%; height: 38%; left: 8%; bottom: 6%; border-radius: 0 100% 0 100%; transform: rotate(${18 + sway}deg); }
.hp-leaf-2 { width: 40%; height: 34%; right: 8%; bottom: 12%; border-radius: 100% 0 100% 0; transform: rotate(${-24 + sway}deg); background: radial-gradient(closest-side, var(--accent-soft), var(--accent) 150%); }
.hp-leaf-3 { width: 30%; height: 26%; left: 32%; bottom: 30%; border-radius: 0 100% 0 100%; transform: rotate(${-6 + sway}deg); opacity: 0.7; }
.hp-arch-v2 .hp-leaf-4 { width: 22%; height: 20%; right: 26%; bottom: 44%; border-radius: 100% 0 100% 0; transform: rotate(${30 + sway}deg); opacity: 0.6; }
.hp-arch-sill { position: absolute; left: 10%; right: 10%; bottom: 4%; height: 3px; background: var(--border); border-radius: 999px; }`;
  return { html, css };
}

function fitnessProp(
  spec: ProjectSpec,
  rng: Rng,
  content: TopicContent,
  instance: number,
): ArtPiece {
  const variant = rng.int(1, 2);
  const pct = rng.int(62, 92);
  const stat = content.stats.length > 0 ? content.stats[instance % content.stats.length] : undefined;
  const bars = variant === 2
    ? `<div class="hp-ring-bars">${Array.from({ length: 5 }, () => `<span style="height:${rng.int(30, 100)}%"></span>`).join('')}</div>`
    : `<p class="hp-ring-note">${escText(stat?.label ?? 'weekly goal')}</p>`;
  const html = `<div class="hp hp-ring hp-ring-v${variant}">
  <div class="hp-card hp-ring-card">
    <div class="hp-ring-track" style="--pct:${pct}">
      <div class="hp-ring-center"><strong>${pct}%</strong><span>this week</span></div>
    </div>
    ${bars}
  </div>
</div>`;
  const css = `.hp-ring-card { display: grid; gap: 1rem; justify-items: center; padding: 1.8rem 1.4rem; ${frameCss(spec)} }
.hp-ring-track { width: 10.5rem; aspect-ratio: 1; border-radius: 50%; display: grid; place-items: center; background: conic-gradient(var(--primary) calc(var(--pct) * 1%), var(--surface-alt) 0); }
.hp-ring-center { width: 76%; aspect-ratio: 1; border-radius: 50%; background: var(--surface); display: grid; place-items: center; align-content: center; gap: 0.1rem; text-align: center; }
.hp-ring-center strong { font-size: 1.7rem; letter-spacing: -0.02em; }
.hp-ring-center span { font-size: 0.7rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.12em; }
.hp-ring-note { margin: 0; font-size: 0.8rem; color: var(--muted); }
.hp-ring-bars { display: flex; align-items: flex-end; gap: 0.45rem; height: 3rem; width: 60%; }
.hp-ring-bars span { flex: 1; border-radius: 999px; background: var(--primary-soft); }
.hp-ring-bars span:nth-child(odd) { background: var(--accent-soft); }`;
  return { html, css };
}

function travelProp(spec: ProjectSpec, rng: Rng): ArtPiece {
  const variant = rng.int(1, 2);
  const codes = ['LIS', 'KYO', 'OAX', 'CPH', 'MRK', 'BCN', 'NRT', 'PAT'] as const;
  const from = rng.pick(codes);
  let to = rng.pick(codes);
  if (to === from) to = codes[(codes.indexOf(from) + 3) % codes.length] ?? 'KYO';
  const seat = `${rng.int(4, 28)}${rng.pick(['A', 'C', 'D', 'F'] as const)}`;
  const gate = `${rng.pick(['B', 'C', 'E'] as const)}${rng.int(2, 19)}`;
  const html = `<div class="hp hp-pass hp-pass-v${variant}">
  <div class="hp-card hp-pass-card">
    <div class="hp-pass-route">
      <strong>${from}</strong>
      <span class="hp-pass-path">${icon('plane', 'hp-pass-plane')}</span>
      <strong>${to}</strong>
    </div>
    <div class="hp-pass-tear"></div>
    <div class="hp-pass-meta">
      <span><em>Seat</em>${seat}</span>
      <span><em>Gate</em>${gate}</span>
      <span><em>Group</em>${rng.int(1, 4)}</span>
      ${variant === 2 ? `<span><em>Bag</em>${rng.int(8, 18)} kg</span>` : ''}
    </div>
    <div class="hp-pass-barcode"></div>
  </div>
</div>`;
  const css = `.hp-pass-card { padding: 1.4rem 1.5rem; ${frameCss(spec)} }
.hp-pass-route { display: flex; align-items: center; gap: 0.8rem; font-size: 1.6rem; letter-spacing: 0.04em; font-weight: 800; }
.hp-pass-path { flex: 1; display: flex; align-items: center; color: var(--primary); border-bottom: 2px dashed var(--border); padding-bottom: 0.3rem; justify-content: center; }
.hp-pass-plane { width: 1.1rem; height: 1.1rem; background: var(--surface); }
.hp-pass-tear { margin: 1rem -1.5rem; border-top: 2px dashed var(--border); position: relative; }
.hp-pass-tear::before, .hp-pass-tear::after { content: ''; position: absolute; top: -0.55rem; width: 1.1rem; height: 1.1rem; border-radius: 50%; background: var(--bg); border: 1px solid var(--border); }
.hp-pass-tear::before { left: -0.55rem; }
.hp-pass-tear::after { right: -0.55rem; }
.hp-pass-meta { display: flex; gap: 1.4rem; flex-wrap: wrap; }
.hp-pass-meta span { display: grid; font-weight: 700; font-variant-numeric: tabular-nums; }
.hp-pass-meta em { font-style: normal; font-size: 0.64rem; text-transform: uppercase; letter-spacing: 0.14em; color: var(--muted); }
.hp-pass-barcode { margin-top: 1.1rem; height: 2rem; border-radius: var(--radius-sm); background: repeating-linear-gradient(90deg, var(--text) 0 2px, transparent 2px 5px, var(--text) 5px 6px, transparent 6px 11px); opacity: 0.75; }`;
  return { html, css };
}

function musicProp(spec: ProjectSpec, rng: Rng): ArtPiece {
  const variant = rng.int(1, 2);
  const bars = Array.from({ length: 22 }, (_, i) => {
    const h = rng.int(18, 100);
    return `<span style="height:${h}%; animation-delay:${(i % 7) * 0.12}s"></span>`;
  }).join('');
  const track = variant === 2
    ? `<div class="hp-track"><span class="hp-track-play">${icon('play')}</span><span class="hp-track-line"><span class="hp-track-done" style="width:${rng.int(25, 75)}%"></span></span><span class="hp-track-time">${rng.int(1, 3)}:${rng.int(10, 59)}</span></div>`
    : '';
  const html = `<div class="hp hp-wave hp-wave-v${variant}">
  <div class="hp-card hp-wave-card">
    <div class="hp-wave-bars">${bars}</div>
    ${track}
  </div>
</div>`;
  const css = `.hp-wave-card { padding: 1.6rem 1.4rem; display: grid; gap: 1.2rem; ${frameCss(spec)} }
.hp-wave-bars { display: flex; align-items: center; gap: 3px; height: 7rem; }
.hp-wave-bars span { flex: 1; min-height: 12%; border-radius: 999px; background: linear-gradient(180deg, var(--primary), var(--accent)); transform-origin: center; }
@media (prefers-reduced-motion: no-preference) {
  @keyframes hp-eq { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(0.45); } }
  .hp-wave-bars span { animation: hp-eq 1.6s ease-in-out infinite; }
}
.hp-track { display: flex; align-items: center; gap: 0.7rem; }
.hp-track-play { width: 2.2rem; height: 2.2rem; flex: none; display: grid; place-items: center; border-radius: 50%; background: var(--primary); color: var(--primary-contrast); }
.hp-track-play svg { width: 1rem; height: 1rem; }
.hp-track-line { flex: 1; height: 4px; border-radius: 999px; background: var(--surface-alt); overflow: hidden; display: block; }
.hp-track-done { display: block; height: 100%; background: var(--primary); }
.hp-track-time { font-size: 0.75rem; color: var(--muted); font-variant-numeric: tabular-nums; }`;
  return { html, css };
}

function fashionProp(
  spec: ProjectSpec,
  rng: Rng,
  content: TopicContent,
  instance: number,
): ArtPiece {
  const variant = rng.int(1, 2);
  const productCount = content.products.length;
  const labelAt = (i: number): string | undefined =>
    productCount > 0 ? content.products[(instance * 2 + i) % productCount]?.category : undefined;
  const labels = [labelAt(0) ?? 'Look 01', labelAt(1) ?? 'Look 02'];
  const meshA = `radial-gradient(110% 90% at ${rng.int(15, 85)}% ${rng.int(10, 60)}%, var(--primary-soft), transparent 70%), var(--surface-alt)`;
  const meshB = `radial-gradient(100% 110% at ${rng.int(15, 85)}% ${rng.int(40, 90)}%, var(--accent-soft), transparent 65%), var(--surface-alt)`;
  const html = `<div class="hp hp-look hp-look-v${variant}">
  <figure class="hp-look-card hp-look-a"><div class="hp-look-img"></div><figcaption><span>01</span>${escText(labels[0] ?? 'Look 01')}</figcaption></figure>
  <figure class="hp-look-card hp-look-b"><div class="hp-look-img"></div><figcaption><span>02</span>${escText(labels[1] ?? 'Look 02')}</figcaption></figure>
</div>`;
  const css = `.hp-look { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; align-items: center; }
.hp-look-v2 { align-items: start; }
.hp-look-card { margin: 0; padding: 0.55rem 0.55rem 0.8rem; border-radius: var(--radius-md); ${frameCss(spec)} }
.hp-look-v2 .hp-look-b { margin-top: 2.2rem; }
.hp-look-v1 .hp-look-a { transform: rotate(-2deg); }
.hp-look-v1 .hp-look-b { transform: rotate(2deg); }
.hp-look-img { aspect-ratio: 3 / 4; border-radius: var(--radius-sm); }
.hp-look-a .hp-look-img { background: ${meshA}; }
.hp-look-b .hp-look-img { background: ${meshB}; }
.hp-look-card figcaption { margin-top: 0.5rem; font-size: 0.7rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); display: flex; gap: 0.5rem; }
.hp-look-card figcaption span { color: var(--primary); font-weight: 700; }`;
  return { html, css };
}

function wellnessProp(spec: ProjectSpec, rng: Rng): ArtPiece {
  const variant = rng.int(1, 2);
  const word = rng.pick(['breathe', 'inhale', 'stillness', 'settle']);
  const html = `<div class="hp hp-breath hp-breath-v${variant}">
  <div class="hp-card hp-breath-card">
    <div class="hp-breath-rings">
      <span class="hp-breath-ring hp-breath-r1"></span>
      <span class="hp-breath-ring hp-breath-r2"></span>
      <span class="hp-breath-ring hp-breath-r3"></span>
      <span class="hp-breath-word">${word}</span>
    </div>
    ${variant === 2 ? '<p class="hp-breath-note">four counts in · six counts out</p>' : ''}
  </div>
</div>`;
  const css = `.hp-breath-card { display: grid; gap: 0.8rem; justify-items: center; padding: 2rem 1.4rem; ${frameCss(spec)} }
.hp-breath-rings { position: relative; width: 12rem; aspect-ratio: 1; display: grid; place-items: center; }
.hp-breath-ring { position: absolute; inset: 0; border-radius: 50%; border: 1.5px solid var(--primary); opacity: 0.55; }
.hp-breath-r2 { inset: 16%; opacity: 0.7; background: var(--primary-soft); border: 0; }
.hp-breath-r3 { inset: 32%; opacity: 0.9; background: var(--accent-soft); border: 0; }
.hp-breath-word { position: relative; font-size: 0.82rem; letter-spacing: 0.22em; text-transform: uppercase; color: var(--text); }
@media (prefers-reduced-motion: no-preference) {
  @keyframes hp-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.07); } }
  .hp-breath-ring { animation: hp-breathe 7s ease-in-out infinite; }
  .hp-breath-r2 { animation-delay: 0.4s; }
  .hp-breath-r3 { animation-delay: 0.8s; }
}
.hp-breath-note { margin: 0; font-size: 0.75rem; color: var(--muted); letter-spacing: 0.08em; }`;
  return { html, css };
}

function genericProp(spec: ProjectSpec, rng: Rng): ArtPiece {
  const variant = rng.int(1, 2);
  const html = `<div class="hp hp-glass hp-glass-v${variant}">
  <div class="hp-card hp-glass-back"></div>
  <div class="hp-card hp-glass-mid"></div>
  <div class="hp-card hp-glass-front">
    <span class="hp-glass-chip">${icon('sparkles')}</span>
    <div class="hp-glass-rows"><span style="width:78%"></span><span style="width:52%"></span><span style="width:64%"></span></div>
  </div>
</div>`;
  const css = `.hp-glass { position: relative; min-height: 19rem; }
.hp-glass .hp-card { position: absolute; inset: auto; width: 78%; padding: 1.3rem; ${frameCss(spec)} }
.hp-glass-back { top: 0; left: 0; height: 9rem; background: linear-gradient(135deg, var(--primary-soft), var(--accent-soft)); }
.hp-glass-mid { top: 3.4rem; right: 0; height: 9rem; background: var(--surface-alt); }
.hp-glass-v2 .hp-glass-back { left: auto; right: 0; }
.hp-glass-v2 .hp-glass-mid { right: auto; left: 0; }
.hp-glass-front { top: 7rem; left: 11%; display: grid; gap: 1rem; }
.hp-glass-chip { width: 2.4rem; height: 2.4rem; display: grid; place-items: center; border-radius: var(--radius-sm); background: var(--primary-soft); color: var(--primary-strong); }
.hp-glass-chip svg { width: 1.2rem; height: 1.2rem; }
.hp-glass-rows { display: grid; gap: 0.5rem; }
.hp-glass-rows span { display: block; height: 0.55rem; border-radius: 999px; background: var(--surface-alt); }
.hp-glass-rows span:first-child { background: var(--primary-soft); }`;
  return { html, css };
}

/**
 * The split-hero visual panel: a topic-specific, seeded mock (browser frame,
 * menu card, boarding pass, waveform…) that adapts its surfaces and borders
 * to the archetype. Deterministic for a given (spec, rng stream, instance).
 *
 * `instance` discriminates repeated uses on one page (hero = 0, split rows
 * = 1, 2, …): content-driven props read a different window of their pools
 * per instance, so the same card never renders twice with identical copy.
 */
export function heroProp(
  spec: ProjectSpec,
  rng: Rng,
  content: TopicContent,
  instance = 0,
): ArtPiece {
  let piece: ArtPiece;
  switch (spec.topic) {
    case 'tech':
      piece = techProp(spec, rng);
      break;
    case 'photography':
      piece = photographyProp(spec, rng, content, instance);
      break;
    case 'food':
      piece = foodProp(spec, rng, content, instance);
      break;
    case 'plants':
      piece = plantsProp(spec, rng);
      break;
    case 'fitness':
      piece = fitnessProp(spec, rng, content, instance);
      break;
    case 'travel':
      piece = travelProp(spec, rng);
      break;
    case 'music':
      piece = musicProp(spec, rng);
      break;
    case 'fashion':
      piece = fashionProp(spec, rng, content, instance);
      break;
    case 'wellness':
      piece = wellnessProp(spec, rng);
      break;
    case 'generic':
      piece = genericProp(spec, rng);
      break;
  }
  return { html: piece.html, css: `${HP_BASE}\n${piece.css}` };
}

/* ------------------------------------------------------------------ */
/* Pattern backgrounds                                                 */
/* ------------------------------------------------------------------ */

export type PatternKind = 'dotGrid' | 'lineGrid' | 'diagonalStripes' | 'speckle';

/**
 * CSS declarations (background-image + sizing) for a reusable section
 * texture. Colors ride on var(--border) so patterns stay theme-correct.
 */
export function patternBg(kind: PatternKind, rng: Rng): string {
  switch (kind) {
    case 'dotGrid': {
      const size = rng.int(14, 20);
      return `background-image: radial-gradient(var(--pattern-ink, var(--border)) 1px, transparent 1.6px); background-size: ${size}px ${size}px;`;
    }
    case 'lineGrid': {
      const size = rng.int(24, 34);
      return `background-image: linear-gradient(var(--pattern-ink, var(--border)) 1px, transparent 1px), linear-gradient(90deg, var(--pattern-ink, var(--border)) 1px, transparent 1px); background-size: ${size}px ${size}px;`;
    }
    case 'diagonalStripes': {
      const gap = rng.int(9, 15);
      return `background-image: repeating-linear-gradient(45deg, var(--pattern-ink, var(--border)) 0, var(--pattern-ink, var(--border)) 1px, transparent 1px, transparent ${gap}px);`;
    }
    case 'speckle': {
      const ox = rng.int(11, 29);
      const oy = rng.int(13, 31);
      return `background-image: radial-gradient(var(--pattern-ink, var(--border)) 1.2px, transparent 1.7px), radial-gradient(var(--pattern-ink, var(--border)) 1px, transparent 1.5px); background-size: 37px 43px, 53px 47px; background-position: 0 0, ${ox}px ${oy}px;`;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Product / card art                                                  */
/* ------------------------------------------------------------------ */

/** Static base rules for productArt pieces; emit once per stylesheet. */
export const PRODUCT_ART_BASE_CSS = `.product-art { position: relative; overflow: hidden; display: grid; place-items: center; }
.pa-chip { width: 2.6rem; height: 2.6rem; display: grid; place-items: center; border-radius: var(--radius-round); background: var(--surface); color: var(--primary); border: 1px solid var(--border); }
.pa-chip svg { width: 1.25rem; height: 1.25rem; }`;

/**
 * Rich card art replacing flat two-stop gradients: a layered radial + conic
 * mesh in theme hues, a subtle dot overlay and a centered topic glyph chip.
 * Deterministic per (rng stream, index); the returned CSS defines .pa-N.
 */
export function productArt(rng: Rng, topic: TopicDomain, index: number): ArtPiece {
  const angle = rng.int(0, 359);
  const x1 = rng.int(10, 90);
  const y1 = rng.int(10, 90);
  const x2 = 100 - rng.int(10, 90);
  const y2 = 100 - rng.int(10, 90);
  const dot = rng.int(12, 18);
  const html = `<div class="product-art pa-${index}" aria-hidden="true"><span class="pa-chip">${icon(topicIcon(topic))}</span></div>`;
  const css = `.pa-${index} { background-image: radial-gradient(var(--border) 1px, transparent 1.4px), radial-gradient(130% 100% at ${x1}% ${y1}%, var(--primary-soft), transparent 62%), radial-gradient(110% 120% at ${x2}% ${y2}%, var(--accent-soft), transparent 58%), conic-gradient(from ${angle}deg at 50% 50%, var(--surface-alt), var(--primary-soft), var(--surface-alt), var(--accent-soft), var(--surface-alt)); background-size: ${dot}px ${dot}px, auto, auto, auto; }`;
  return { html, css };
}
