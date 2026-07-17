/**
 * Blog template — a magazine home (one large featured story plus a thumb
 * grid with reading times and tag-chip filtering) and a reading view with
 * a scroll progress bar, byline row, four-to-six composed body paragraphs
 * (drop cap on editorial), and cyclic previous/next links.
 *
 * Body copy is composed from per-domain paragraph pools written for this
 * template, so a travel dispatch never talks about sourdough starters.
 */
import { createRng } from '@/lib/seeded';
import type { ProjectSpec, TopicDomain } from '../../types';
import { PRODUCT_ART_BASE_CSS, productArt } from '../art';
import { contentFor } from '../content';
import { icon } from '../icons';
import { buildRuntimeJs } from '../runtime';
import {
  baseCss,
  cssVariables,
  esc,
  renderFooter,
  renderHeader,
  type TemplateOutput,
} from '../shared';

/* ------------------------------------------------------------------ */
/* Per-domain body paragraph pools (original copy, post-agnostic)      */
/* ------------------------------------------------------------------ */

const BODY_POOLS: Record<TopicDomain, readonly string[]> = {
  food: [
    'The counter test never lies. If a new bake or blend survives three Saturdays of regulars — the ones who order without looking up — it earns a place on the board; if it needs explaining twice, it goes back to the bench.',
    'We keep a battered notebook next to the roaster for exactly this reason. Batch temperature, first crack, how the kitchen smelled, who wandered in mid-cup — the numbers matter, but the margins are where the good decisions come from.',
    'Freshness is a schedule, not a slogan. The ovens start before the streetlights go off, the roast rests exactly long enough to settle, and anything that misses the morning window becomes staff lunch rather than shelf stock.',
    'Suppliers make or break this work. We would rather run out of something honest than pad the case with a filler, and the growers and millers we buy from know our order is a conversation, not a form.',
    'Every Friday the whole crew tastes the week side by side, blind where we can manage it. The quietest person at the table usually catches the flaw the rest of us had talked ourselves out of.',
    'The mistakes are part of the recipe now. An over-proofed batch taught us more about our flour than a year of good ones, and the burnt lot from last spring is the reason the cooling tray sits where it does.',
    'Seasonality does the creative work if you let it. When the market shifts, the menu shifts — no brainstorm required, just a walk through the stalls with an empty basket and an open mind.',
    'None of this is fast, and that is the point. The three-day loaf, the rested roast, the slow reduction — the clock is an ingredient, and we budget for it the way we budget for butter.',
  ],
  plants: [
    'Start with the light, always. Before we recommend a single plant we ask which way the windows face, because a thriving jungle in a south-facing flat becomes a slow tragedy in a north-facing one.',
    'Overwatering kills more houseplants than neglect ever will. Roots need air as much as water, and the finger-in-the-soil test beats every schedule, app and moisture gadget we have tried.',
    'We propagate almost everything on open shelves where customers can watch. A jar of cuttings does more to demystify plant care than any leaflet — roots grow in public here.',
    'Terracotta earns its keep. It wicks away the excess that plastic traps, it telegraphs dryness by color, and it forgives an enthusiastic waterer more gracefully than any glazed pot.',
    'The rehab bench is the best teacher in the greenhouse. Every half-dead fern that comes through the door is a diagnosis exercise, and most of them leave greener than they arrived.',
    'Patience is the actual product. A monstera does not fenestrate on demand and a fiddle-leaf sulks for a month after moving house — the sooner a plant parent accepts the timeline, the happier everyone grows.',
    'Repotting is spring’s ritual for a reason. Fresh mix, one size up, roots teased loose — twenty minutes of mess that buys a year of growth.',
    'Pests are a when, not an if. Check the undersides weekly, quarantine the new arrivals, and keep the neem within reach — vigilance is cheaper than replacement.',
  ],
  tech: [
    'The boring answer usually wins. Every time we chose the battle-tested tool over the exciting one, the decision aged well; the reverse list is shorter, and every entry on it has a postmortem.',
    'We measure before we optimize, and it is humbling every time. The slow path is never where intuition points, and profilers have saved us from confidently fixing the wrong thing more than once.',
    'Small pull requests are a kindness. Reviews land faster, bugs hide less, rollbacks stay surgical — the discipline costs minutes and pays in whole afternoons.',
    'On-call shaped our architecture more than any design review. Nothing clarifies a dependency diagram like being woken by it, and every alert now has to answer one question: what should a human do about this at 3 a.m.?',
    'Feature flags turned deploys into non-events. Shipping dark, ramping slowly and rolling back with a toggle — the release train stopped being scary the week the switchboard went in.',
    'Documentation is a product surface. The quickstart gets the same review bar as the code, because the first fifteen minutes decide whether anyone stays for the fifteenth week.',
    'Deleting code is our favorite refactor. Every module we removed took its bugs with it, and the system that remains fits in fewer heads.',
    'Postmortems are blameless or they are useless. The incident channel is for timelines and fixes; the retro is for systems, never names — and the fixes actually ship because of it.',
  ],
  fitness: [
    'Consistency beats intensity every time we measure it. The member who shows up three times a week for a year laps the one who goes heroic for six weeks and vanishes.',
    'We film form because mirrors flatter and memory lies. Two minutes of video catches the collapsing knee or the rounded back that a whole session of cues missed.',
    'Progressive overload is boring arithmetic, and it works. A rep here, a kilo there, logged honestly — the graph only has to slope one way, and slowly counts.',
    'Rest days are programmed, not earned. Adaptation happens between sessions, so the calendar treats Thursday’s sofa with the same respect as Tuesday’s squat rack.',
    'Warm-ups are rehearsal, not ceremony. The empty bar tells you everything about today’s hips and shoulders before the plates make it expensive information.',
    'The whiteboard culture matters more than the equipment. A personal record gets a name and a date on the wall, and half the gym cheers for someone they have never spoken to.',
    'Fuel is the quiet variable. Most plateaus we see are kitchens, not programs — a banana before and protein after moves more needles than a new routine.',
    'The goal is a body that says yes. Yes to stairs, to the heavy suitcase, to the pickup game at forty — the numbers on the bar are just how we keep score of that.',
  ],
  fashion: [
    'Fit is the whole argument. A modest garment that fits precisely will beat a luxurious one that almost does, every single time it leaves the wardrobe.',
    'We put the measurements on the page because bodies are not sizes. Pit to pit, sleeve, hem — flat numbers from the actual garment, so the only surprise in the parcel is how often you reach for it.',
    'Deadstock changed how we design. When the roll is finite, every marker is a small negotiation, and the constraint has produced better pieces than freedom ever did.',
    'The seam allowance is where quality hides. Finished edges, bar-tacked stress points, a hem with enough fabric to let down — the inside of a garment tells you whether it was made or merely manufactured.',
    'Care is design too. We cut linen expecting the wrinkle, wash-test denim before it ships, and write care labels a human can follow, because a garment’s tenth year is part of the brief.',
    'Small runs keep us honest. Sixty pieces means every one passes through hands that can stop the line, and sold out means exactly that — the reprint machine does not exist here.',
    'The repair bench eventually sees everything we make. Mending what we sold teaches us where the work fails, and every returned elbow or frayed cuff quietly redesigns the next run.',
    'Style is editing. The wardrobe that works is the one with fewer arguments in it — pieces that agree with each other on color, weight and occasion, chosen slowly.',
  ],
  photography: [
    'Light first, subject second, gear a distant third. The best camera in a bad window loses to a phone in a good one, and scouting the light is most of the job.',
    'We shoot the in-between frames on purpose. The laugh after the pose, the fixing of a cuff, the glance away — the keepers almost always live in the moments people think do not count.',
    'Culling is where the story gets written. Eight hundred frames become twelve on the strength of ruthless first passes, and the discipline of choosing is worth more than the luxury of shooting.',
    'Printing changed how we photograph. A file on a screen is a suggestion; a print on the table is a decision, and knowing the frame will be held makes the shutter finger more honest.',
    'People relax when you show them one good frame early. The whole shoot changes the moment a nervous subject sees proof that they photograph well.',
    'The archive is a working tool, not a graveyard. Backed up twice, keyworded once, revisited often — last year’s rejects have a way of becoming this year’s series.',
    'One light, mastered, beats five lights guessed at. The single window, the single strobe, the reflector that lives in the car boot — constraints teach faster than equipment.',
    'Slow formats keep us honest. Thirty-six frames force a decision before the shutter, and that habit follows you back to the card that holds ten thousand.',
  ],
  travel: [
    'Pack for the person you actually are. The imagined traveler reads three novels and wears the linen blazer; the real one wants dry socks, a power bank and room for the market haul.',
    'The best itineraries have margins. One anchor per day, generous white space around it, and the confidence to let a good detour eat the afternoon’s plan.',
    'Follow the queue of locals, not the sign in English. The rule has never once failed us at lunch, and it works for barbers, bakeries and bus stops too.',
    'Shoulder season is the honest season. The light is softer, the queues are shorter, the prices are kinder, and the city you meet is closer to the one that lives there all year.',
    'Night trains solve three problems at once. A bed, a border and a sunrise arrival — no airport can compete with waking up in the middle of somewhere new.',
    'Learn five words and use all of them badly. Hello, thank you, please, sorry and delicious open more doors than a phrasebook’s entire grammar section.',
    'The journal earns its weight. One page a night, written tired — years later it is the cheapest souvenir and the only one that still surprises us.',
    'Getting mildly lost is a technique. Put the phone away for one block past the wrong turn; the neighborhoods you cannot name afterward are the ones you describe first at home.',
  ],
  music: [
    'The room is an instrument. The same take sounds different in the kitchen, the stairwell and the rehearsal space above the print shop, and half of production is choosing which room gets to sing.',
    'Demos protect the idea. The voice memo with traffic in the background often holds a spark the polished version loses, so we keep every rough take and argue with them later.',
    'Play it live before you record it. Songs change shape in front of people — the bridge that drags on tape earns its keep in a room, or it gets cut on the drive home.',
    'Limitations write better parts than options do. One microphone, one afternoon, one amp that hums unless you stand just so — every constraint on the record is audible, and we would not mix them out.',
    'The setlist is an argument you have with the room. Open too hard and there is nowhere to go; the slow song lands at song four, never song two, and the encore is decided by the third chorus.',
    'Practice the transitions, not just the songs. The silence between numbers is where a set falls apart, and the bands that feel effortless have rehearsed exactly that.',
    'Mixing is subtraction. Every fader ride we are proud of is something turned down, not up — the vocal gets loud by making room, not by pushing.',
    'Tape hiss and honest edits keep a record human. We quantize nothing that grooves and tune nothing that feels — the flaws people hum along to are not flaws.',
  ],
  wellness: [
    'Small rituals hold better than grand resolutions. The two-minute morning stretch that actually happens beats the hour-long routine that lives in a notes app.',
    'The breath is the fastest lever we know. Four counts in, six counts out, five rounds — the physiology does not care whether you believe in it, which is the best thing about it.',
    'Sleep is the foundation everything else negotiates with. The evening routine matters more than the alarm, and the last screen of the day sets the tone for the first hour of tomorrow.',
    'Rest needs scheduling or it loses to everything. The unhurried hour survives only when it is written down with the same weight as a meeting.',
    'Boundaries are a wellness practice. Saying no kindly — early, clearly, without a paragraph of apology — protects more energy than anything on our shelves.',
    'Quiet is a room you can furnish. Warm light, a door that closes, a chair that belongs to no task — the space teaches the habit faster than willpower does.',
    'Progress here is subtraction. Fewer tabs, fewer alerts, fewer commitments held reluctantly — what remains gets the attention it was always asking for.',
    'Gentleness works. The skin, the schedule and the nervous system all respond better to consistency than to intensity, and the kindest version of the plan is the one that survives a bad week.',
  ],
  generic: [
    'Good defaults are quiet leverage. Most people never open the settings page, so what a tool assumes on their behalf is the product — and we treat every default like a small promise.',
    'We keep a plain-text logbook of decisions. One line per choice, dated — six months later the “why” matters more than the “what”, and the notebook answers questions nothing else can.',
    'The weekly review is the keystone habit. Twenty minutes on Sunday to sweep loose ends into one list buys a week of not wondering what is falling through.',
    'Deleting is underrated everywhere. The feature list, the wardrobe, the calendar — every system we admire got that way by subtraction, and the discipline transfers.',
    'Small tools with sharp edges beat platforms that do everything adequately. The utility-knife philosophy: know what a thing is for, and let it be excellent at exactly that.',
    'Momentum is built, not found. Starting badly for ten minutes outperforms planning perfectly for an hour, and the streak — however scrappy — is the strategy.',
    'The empty states deserve design. The first screen someone meets is usually the blank one, and a blank page that suggests a first step converts confusion into motion.',
    'Finish things properly. The last five percent — the note to your future self, the closed tabs, the archived folder — is where the compounding actually happens.',
  ],
};

const POST_TAGS = ['Field notes', 'Guide', 'Essay', 'Dispatch', 'Notebook'] as const;
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

/** "MO" from "Marta Oliveira" — byline initials chip. */
function initialsOf(name: string): string {
  const words = name.split(/\s+/).filter((word) => /^[A-Za-z]/.test(word));
  const first = words[0]?.charAt(0) ?? 'A';
  const last = words.length > 1 ? (words[words.length - 1]?.charAt(0) ?? '') : '';
  return `${first}${last}`.toUpperCase();
}

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  tag: string;
  date: string;
  minutes: number;
  author: { name: string; role: string };
  paragraphs: readonly string[];
}

export function renderBlog(spec: ProjectSpec): TemplateOutput {
  const rng = createRng(`${spec.seed}:blog`);
  const content = contentFor(spec.topic, createRng(`${spec.seed}:content`));
  const pool = BODY_POOLS[spec.topic];
  const postCount = Math.min(6, content.posts.length);
  const tagStart = rng.int(0, POST_TAGS.length - 1);

  const posts: BlogPost[] = content.posts.slice(0, postCount).map((post, i) => {
    const paraCount = rng.int(4, 5);
    const start = rng.int(0, pool.length - 1);
    // A stride coprime with the pool size keeps paragraphs distinct within
    // a post and gives each post its own reading order through the pool.
    const strides = [1, 3, 5, 7].filter((candidate) => {
      let a = candidate;
      let b = pool.length;
      while (b !== 0) [a, b] = [b, a % b];
      return a === 1;
    });
    const stride = strides.length > 0 ? rng.pick(strides) : 1;
    const paragraphs = Array.from(
      { length: paraCount },
      (_, k) => pool[(start + k * stride) % pool.length] ?? '',
    );
    const words = `${post.excerpt} ${paragraphs.join(' ')}`.split(/\s+/).length;
    const author = content.personas[i % content.personas.length] ?? {
      name: 'The editors',
      role: 'Staff',
    };
    return {
      id: `post-${i + 1}`,
      title: post.title,
      excerpt: post.excerpt,
      tag: POST_TAGS[(tagStart + i) % POST_TAGS.length] ?? 'Notes',
      date: `${MONTH_NAMES[rng.int(0, 11)]} ${rng.int(2, 28)}`,
      minutes: Math.max(3, Math.round(words / 150)) + rng.int(0, 2),
      author,
      paragraphs,
    };
  });

  const tags = [...new Set(posts.map((post) => post.tag))];
  const chips = ['All stories', ...tags]
    .map((label, index) => {
      const value = index === 0 ? 'all' : label;
      return `          <button class="chip${index === 0 ? ' is-active' : ''}" type="button" data-tag-filter="${esc(value)}" aria-pressed="${index === 0 ? 'true' : 'false'}">${esc(label)}</button>`;
    })
    .join('\n');

  const arts = posts.map((_, i) =>
    productArt(createRng(`${spec.seed}:post-art:${i}`), spec.topic, i),
  );

  const featured = posts[0];
  const featuredHtml = featured
    ? `        <article class="card feature-post" data-post-card data-tag="${esc(featured.tag)}" data-reveal>
          <button class="feature-post-art" type="button" data-post="${featured.id}" aria-label="Read ${esc(featured.title)}">
            <span class="post-art" aria-hidden="true">${arts[0]?.html ?? ''}</span>
          </button>
          <div class="feature-post-body">
            <div class="post-meta">
              <span class="badge">${esc(featured.tag)}</span>
              <span class="post-minutes">${featured.minutes} min read</span>
              <span class="post-date">${esc(featured.date)}</span>
            </div>
            <h2><a href="#${featured.id}" data-post="${featured.id}">${esc(featured.title)}</a></h2>
            <p>${esc(featured.excerpt)}</p>
            <div class="post-byline">
              <span class="post-avatar" aria-hidden="true">${initialsOf(featured.author.name)}</span>
              <span><strong>${esc(featured.author.name)}</strong> · ${esc(featured.author.role)}</span>
            </div>
          </div>
        </article>`
    : '';

  const gridCards = posts
    .slice(1)
    .map((post, k) => {
      const i = k + 1;
      return `          <article class="card post-card" data-post-card data-tag="${esc(post.tag)}" data-reveal data-reveal-delay="${(k % 3) * 80}">
            <button class="post-thumb" type="button" data-post="${post.id}" aria-label="Read ${esc(post.title)}">
              <span class="post-art" aria-hidden="true">${arts[i]?.html ?? ''}</span>
            </button>
            <div class="post-card-body">
              <div class="post-meta">
                <span class="badge">${esc(post.tag)}</span>
                <span class="post-minutes">${post.minutes} min read</span>
              </div>
              <h3 class="post-title"><a href="#${post.id}" data-post="${post.id}">${esc(post.title)}</a></h3>
              <p>${esc(post.excerpt)}</p>
            </div>
          </article>`;
    })
    .join('\n');

  const fullPosts = posts
    .map((post, i) => {
      const prev = posts[(i - 1 + posts.length) % posts.length];
      const next = posts[(i + 1) % posts.length];
      const paragraphs = post.paragraphs
        .map((paragraph) => `          <p>${esc(paragraph)}</p>`)
        .join('\n');
      return `        <article class="post-full" id="${post.id}" hidden>
          <div class="post-meta">
            <span class="badge">${esc(post.tag)}</span>
            <span class="post-minutes">${post.minutes} min read</span>
            <span class="post-date">${esc(post.date)}</span>
          </div>
          <h1>${esc(post.title)}</h1>
          <p class="post-byline post-byline-row">
            <span class="post-avatar" aria-hidden="true">${initialsOf(post.author.name)}</span>
            <span>By <strong>${esc(post.author.name)}</strong>, ${esc(post.author.role)}</span>
          </p>
          <p class="post-lede">${esc(post.excerpt)}</p>
          <div class="post-body">
${paragraphs}
          </div>
          <nav class="post-nav" aria-label="More stories">
            <button class="post-nav-link" type="button" data-post="${prev?.id ?? post.id}">
              <span>${icon('arrowRight', 'post-nav-back')} Previous</span>
              <strong>${esc(prev?.title ?? '')}</strong>
            </button>
            <button class="post-nav-link post-nav-next" type="button" data-post="${next?.id ?? post.id}">
              <span>Next ${icon('arrowRight')}</span>
              <strong>${esc(next?.title ?? '')}</strong>
            </button>
          </nav>
        </article>`;
    })
    .join('\n');

  const kicker = createRng(`${spec.seed}:blog-kicker`).pick(content.heroKickers);

  const body = `${renderHeader(spec, [
    { href: '#top', label: 'Home' },
    { href: '#post-list', label: 'Stories' },
  ])}
  <main class="blog-main" id="main">
    <section id="post-list" class="section blog-home" aria-label="All stories">
      <div class="container">
        <header class="blog-hero" data-reveal>
          <span class="eyebrow">${esc(kicker)}</span>
          <h1>${esc(spec.name)}</h1>
          <p class="blog-tagline">${esc(spec.tagline)}</p>
        </header>
        <div class="chip-row" role="group" aria-label="Filter by tag">
${chips}
        </div>
${featuredHtml}
        <div class="post-grid grid cols-3">
${gridCards}
        </div>
        <p id="posts-empty" hidden>Nothing filed under that tag yet — try another.</p>
      </div>
    </section>
    <section id="post-view" class="section blog-read" hidden aria-label="Story">
      <div class="read-progress" aria-hidden="true"><span id="read-progress-bar"></span></div>
      <div class="container post-container">
        <button id="back-to-list" class="btn btn-ghost" type="button">All stories</button>
${fullPosts}
      </div>
    </section>
  </main>
${renderFooter(spec)}`;

  const artCss = arts.map((art) => art.css).join('\n');
  const css = [
    cssVariables(spec),
    baseCss(spec),
    blogCss(spec),
    `/* Post art */\n${PRODUCT_ART_BASE_CSS}\n${artCss}`,
  ].join('\n\n');

  const js = `${buildRuntimeJs()}\n${blogJs()}`;

  return { body, css, js };
}

function blogCss(spec: ProjectSpec): string {
  const { archetype } = spec.style;
  const brutal = archetype === 'brutalist';
  const chipBorder = brutal ? '2px solid var(--text)' : '1px solid var(--border)';
  const dropCap =
    archetype === 'editorial'
      ? `
.post-body > p:first-child::first-letter {
  font-family: var(--font-display); float: left; font-size: 3.6em; line-height: 0.82;
  padding: 0.04em 0.14em 0 0; font-weight: 700; color: var(--primary);
}`
      : '';

  return `/* Blog — magazine home */
.blog-hero { margin-bottom: 2rem; max-width: 40rem; }
.blog-tagline { color: var(--muted); margin-top: 0.5rem; font-size: 1.1rem; }
.chip-row { display: flex; flex-wrap: wrap; gap: 0.45rem; margin-bottom: 1.75rem; }
.chip { border: ${chipBorder}; background: var(--surface); color: var(--muted); border-radius: var(--radius-btn); padding: 0.3rem 0.9rem; cursor: pointer; font: inherit; font-size: 0.88rem; font-weight: 600; }
.chip:hover { border-color: var(--primary); color: var(--primary); }
.chip.is-active { background: var(--primary); border-color: var(--primary); color: var(--primary-contrast); }

.feature-post { display: grid; grid-template-columns: 1.1fr 1fr; overflow: hidden; margin-bottom: var(--gap); }
.feature-post-art, .post-thumb { display: block; padding: 0; border: 0; background: transparent; cursor: pointer; text-align: inherit; }
.post-art { display: block; height: 100%; }
.post-art .product-art { width: 100%; height: 100%; min-height: 14rem; }
.feature-post-body { padding: clamp(1.25rem, 3vw, 2.25rem); display: grid; gap: 0.8rem; align-content: center; justify-items: start; }
.feature-post-body h2 a { color: var(--text); text-decoration: none; }
.feature-post-body h2 a:hover { color: var(--primary); }
.feature-post-body p { color: var(--muted); }
@media (max-width: 760px) { .feature-post { grid-template-columns: 1fr; } }

.post-grid { align-items: stretch; }
.post-card { display: grid; grid-template-rows: auto 1fr; overflow: hidden; }
.post-card .post-art .product-art { min-height: 9.5rem; aspect-ratio: 16 / 9; }
.post-card-body { padding: 1.1rem 1.2rem 1.3rem; display: grid; gap: 0.55rem; align-content: start; justify-items: start; }
.post-title { font-size: 1.12rem; }
.post-title a { color: var(--text); text-decoration: none; }
.post-title a:hover { color: var(--primary); }
.post-card-body > p { color: var(--muted); font-size: 0.92rem; }
.post-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 0.7rem; }
.post-minutes, .post-date { color: var(--muted); font-size: 0.82rem; }
.post-byline { display: flex; align-items: center; gap: 0.6rem; color: var(--muted); font-size: 0.88rem; }
.post-avatar { width: 2rem; height: 2rem; flex: none; display: grid; place-items: center; border-radius: var(--radius-round); background: var(--primary-soft); color: var(--primary-strong); font-size: 0.7rem; font-weight: 800; letter-spacing: 0.04em;${brutal ? ' border: 2px solid var(--text); color: var(--text);' : ''} }
#posts-empty { color: var(--muted); text-align: center; padding-block: 2.5rem; }

/* Blog — reading view */
.read-progress { position: fixed; top: 0; left: 0; right: 0; height: 3px; z-index: 130; background: transparent; }
#read-progress-bar { display: block; height: 100%; width: 0%; background: linear-gradient(90deg, var(--primary), var(--accent)); }
.post-container { max-width: 44rem; }
#back-to-list { margin-bottom: 1.75rem; }
.post-full h1 { margin-block: 0.8rem 1rem; }
.post-byline-row { margin-bottom: 1.5rem; }
.post-lede { font-size: 1.18rem; line-height: 1.6; color: var(--text); margin-bottom: 1.5rem;${archetype === 'editorial' ? ' font-family: var(--font-display); font-style: italic;' : ''} }
.post-body p { margin-bottom: 1.1rem; font-size: 1.04rem; line-height: 1.8; color: var(--text); }${dropCap}
.post-nav { margin-top: 2.5rem; padding-top: 1.5rem; border-top: 1px solid ${brutal ? 'var(--text)' : 'var(--border)'}; display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.post-nav-link { display: grid; gap: 0.3rem; justify-items: start; padding: 0.9rem 1rem; border: ${chipBorder}; border-radius: var(--radius-md); background: var(--surface); cursor: pointer; text-align: left; font: inherit; color: var(--text); }
.post-nav-link:hover { border-color: var(--primary); }
.post-nav-link span { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); }
.post-nav-link svg { width: 0.9rem; height: 0.9rem; }
.post-nav-link .post-nav-back { transform: rotate(180deg); }
.post-nav-link strong { font-size: 0.92rem; line-height: 1.35; }
.post-nav-next { justify-items: end; text-align: right; }
@media (max-width: 640px) { .post-nav { grid-template-columns: 1fr; } .post-nav-next { justify-items: start; text-align: left; } }

/* Scroll reveal (armed by the runtime; nothing hides without JS) */
@media (prefers-reduced-motion: no-preference) {
  html.js-reveal [data-reveal] { ${archetype === 'brutalist' || archetype === 'editorial' ? 'opacity: 0;' : 'opacity: 0; transform: translateY(14px);'} ${
    archetype === 'brutalist'
      ? 'transition: opacity 0.18s steps(2, jump-end);'
      : archetype === 'editorial'
        ? 'transition: opacity 0.7s ease;'
        : 'transition: opacity 0.55s ease, transform 0.55s ease;'
  } }
  html.js-reveal [data-reveal].is-revealed { opacity: 1; transform: none; }
}`;
}

function blogJs(): string {
  return `(function () {
  'use strict';

  var listView = document.getElementById('post-list');
  var postView = document.getElementById('post-view');
  var backButton = document.getElementById('back-to-list');
  var progressBar = document.getElementById('read-progress-bar');
  var emptyNote = document.getElementById('posts-empty');
  if (!listView || !postView) return;

  // Reading progress: fill the top bar as the story scrolls by.
  function updateProgress() {
    if (!progressBar || postView.hidden) return;
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    var ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    progressBar.style.width = (ratio * 100).toFixed(1) + '%';
  }
  window.addEventListener('scroll', updateProgress, { passive: true });

  function openPost(postId) {
    var target = document.getElementById(postId);
    if (!target || !target.classList.contains('post-full')) return;
    postView.querySelectorAll('.post-full').forEach(function (article) {
      article.hidden = article !== target;
    });
    listView.hidden = true;
    postView.hidden = false;
    window.scrollTo(0, 0);
    updateProgress();
  }

  function showList() {
    postView.hidden = true;
    listView.hidden = false;
    window.scrollTo(0, 0);
  }

  // One delegate covers cards, title links and prev/next buttons.
  document.addEventListener('click', function (event) {
    var origin = event.target;
    if (!origin || !origin.closest) return;
    var trigger = origin.closest('[data-post]');
    if (!trigger) return;
    event.preventDefault();
    var postId = trigger.getAttribute('data-post');
    if (postId) openPost(postId);
  });

  if (backButton) backButton.addEventListener('click', showList);

  // Tag chips: filter the featured card and the grid together.
  var chips = Array.prototype.slice.call(document.querySelectorAll('[data-tag-filter]'));
  var cards = Array.prototype.slice.call(document.querySelectorAll('[data-post-card]'));
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var value = chip.getAttribute('data-tag-filter') || 'all';
      chips.forEach(function (other) {
        var active = other === chip;
        other.classList.toggle('is-active', active);
        other.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      var visible = 0;
      cards.forEach(function (card) {
        var match = value === 'all' || card.getAttribute('data-tag') === value;
        card.hidden = !match;
        if (match) visible += 1;
      });
      if (emptyNote) emptyNote.hidden = visible > 0;
    });
  });
})();`;
}
