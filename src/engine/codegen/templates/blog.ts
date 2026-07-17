/**
 * Blog template — a home feed of posts with excerpts and reading times,
 * plus a single-post view toggled with JS (posts are pre-rendered).
 */
import { createRng } from '@/lib/seeded';
import type { ProjectSpec } from '../../types';
import {
  baseCss,
  cssVariables,
  esc,
  renderFooter,
  renderHeader,
  type TemplateOutput,
} from '../shared';

interface Post {
  title: string;
  tag: string;
  excerpt: string;
  paragraphs: readonly string[];
}

const POST_POOL: readonly Post[] = [
  {
    title: 'What a slow morning taught me about shipping',
    tag: 'Process',
    excerpt: 'I missed a deadline, made porridge, and accidentally learned the difference between urgency and momentum.',
    paragraphs: [
      'The deadline slipped at 8:40 in the morning and, for once, I let it. Instead of triaging, I made porridge and watched the kettle do its one job with total commitment.',
      'By the second coffee an odd thing happened: the feature I had been wrestling with for a week untangled itself in my head, uninvited. The knot was never technical. It was hurry.',
      'I still believe in deadlines. But now I schedule the porridge too.',
    ],
  },
  {
    title: 'A week without notifications',
    tag: 'Attention',
    excerpt: 'Seven days with every badge and banner switched off. Some findings were predictable. One was not.',
    paragraphs: [
      'The predictable part: nothing broke, nobody was angry, and the fear of missing something urgent turned out to be mostly decorative.',
      'The surprise was physical. Around day three I noticed I had stopped reaching for the phone during pauses — waiting for tea, standing in lifts. The pauses just became pauses again.',
      'Notifications are back on now, but only for humans. Software can wait its turn.',
    ],
  },
  {
    title: 'The quiet power of good defaults',
    tag: 'Design',
    excerpt: 'Most users never open the settings page. What you choose for them is the product.',
    paragraphs: [
      'Every option you expose is a small tax on everyone who meets it. Every default you choose well is a gift most people will never notice — which is exactly the point.',
      'The craft is in deciding what the software believes before anyone tells it anything. Margins, intervals, sort orders: these are opinions, and shipping them is the honest part of design.',
      'Settings pages are where disagreements go to live. Defaults are where care shows up.',
    ],
  },
  {
    title: 'Keeping a paper logbook in a digital job',
    tag: 'Tools',
    excerpt: 'Three years of one-line entries in a cheap notebook, and why I keep doing it.',
    paragraphs: [
      'Each workday gets one line: what actually happened, not what was planned. The rule keeps the habit cheap enough to survive busy weeks.',
      'The notebook does something no app has managed — it never suggests anything. It just accumulates, quietly, until the year needs reviewing and suddenly it is the most useful document I own.',
      'Highly recommended, especially if your job involves convincing computers to do things.',
    ],
  },
  {
    title: 'A gentle case for fewer features',
    tag: 'Product',
    excerpt: 'Deleting our roadmap’s bottom half was the most productive afternoon of the quarter.',
    paragraphs: [
      'Half of the roadmap existed because someone once asked, one time, in a meeting nobody remembered. We deleted it in an afternoon and waited for the complaints.',
      'They never came. What came instead was speed: fewer branches, fewer states, fewer sentences in the docs. The product got easier to explain, which is another way of saying it got better.',
      'Features are loans. Somebody pays the interest, and it is usually your future self.',
    ],
  },
  {
    title: 'Small tools, sharp edges',
    tag: 'Craft',
    excerpt: 'On preferring the utility knife to the multitool, in software and elsewhere.',
    paragraphs: [
      'The multitool promises everything and delivers most of it at three-quarter quality. The utility knife does one thing so well you stop thinking about it.',
      'Software has the same physics. The tools I trust are the ones small enough to understand end to end — when they misbehave, the fix is an hour, not an archaeology project.',
      'Collect small sharp things. They stay sharp.',
    ],
  },
];

export function renderBlog(spec: ProjectSpec): TemplateOutput {
  const rng = createRng(`${spec.seed}:blog`);
  const postCount = rng.int(4, 6);
  const start = rng.int(0, POST_POOL.length - 1);
  const posts: Array<Post & { id: string; minutes: number }> = [];
  for (let i = 0; i < postCount; i++) {
    const post = POST_POOL[(start + i) % POST_POOL.length];
    if (!post) continue;
    posts.push({ ...post, id: `post-${i + 1}`, minutes: rng.int(3, 9) });
  }

  const cards = posts
    .map(
      (post) => `      <article class="card post-card">
        <div class="post-meta">
          <span class="badge">${esc(post.tag)}</span>
          <span class="post-minutes">${post.minutes} min read</span>
        </div>
        <h2><a href="#${post.id}" data-post="${post.id}">${esc(post.title)}</a></h2>
        <p>${esc(post.excerpt)}</p>
        <a class="post-more" href="#${post.id}" data-post="${post.id}">Read the post →</a>
      </article>`,
    )
    .join('\n');

  const fullPosts = posts
    .map((post) => {
      const paragraphs = post.paragraphs
        .map((paragraph) => `        <p>${esc(paragraph)}</p>`)
        .join('\n');
      return `      <article class="post-full" id="${post.id}" hidden>
        <div class="post-meta">
          <span class="badge">${esc(post.tag)}</span>
          <span class="post-minutes">${post.minutes} min read</span>
        </div>
        <h1>${esc(post.title)}</h1>
${paragraphs}
      </article>`;
    })
    .join('\n');

  const body = `${renderHeader(spec, [{ href: '#top', label: 'Home' }])}
  <main class="app-main container blog-main">
    <section id="post-list" aria-label="All posts">
      <div class="blog-head">
        <h1>${esc(spec.name)}</h1>
        <p class="app-tagline">${esc(spec.tagline)}</p>
      </div>
${cards}
    </section>
    <section id="post-view" hidden aria-label="Post">
      <button id="back-to-list" class="btn btn-ghost" type="button">← All posts</button>
${fullPosts}
    </section>
  </main>
${renderFooter(spec)}`;

  const css = `${cssVariables(spec)}

${baseCss(spec)}

/* Blog */
.blog-main { max-width: 44rem; }
.blog-head { margin-bottom: 2rem; }
.app-tagline { color: var(--muted); margin-top: 0.25rem; }
#post-list { display: grid; gap: var(--gap); }
.post-card { padding: 1.5rem; display: grid; gap: 0.6rem; }
.post-card h2 { font-size: 1.3rem; }
.post-card h2 a { color: var(--text); }
.post-card h2 a:hover { color: var(--primary); text-decoration: none; }
.post-card p { color: var(--muted); }
.post-meta { display: flex; align-items: center; gap: 0.75rem; }
.post-minutes { color: var(--muted); font-size: 0.82rem; }
.post-more { font-weight: 600; font-size: 0.92rem; }
.post-full { padding-block: 1.5rem; }
.post-full h1 { margin-block: 0.75rem 1.25rem; }
.post-full p { margin-bottom: 1rem; font-size: 1.05rem; line-height: 1.75; }
#back-to-list { margin-bottom: 1rem; }`;

  const js = `(function () {
  'use strict';

  var listView = document.getElementById('post-list');
  var postView = document.getElementById('post-view');
  var backButton = document.getElementById('back-to-list');
  if (!listView || !postView) return;

  function openPost(postId) {
    var target = document.getElementById(postId);
    if (!target) return;
    postView.querySelectorAll('.post-full').forEach(function (article) {
      article.hidden = article !== target;
    });
    listView.hidden = true;
    postView.hidden = false;
    window.scrollTo(0, 0);
  }

  function showList() {
    postView.hidden = true;
    listView.hidden = false;
    window.scrollTo(0, 0);
  }

  document.querySelectorAll('[data-post]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      event.preventDefault();
      var postId = link.getAttribute('data-post');
      if (postId) openPost(postId);
    });
  });

  if (backButton) backButton.addEventListener('click', showList);
})();`;

  return { body, css, js };
}
