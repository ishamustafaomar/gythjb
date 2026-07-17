/**
 * Blog template — a home feed of topic-driven posts with excerpts and
 * reading times, plus a single-post view toggled with JS.
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
  type TemplateOutput,
} from '../shared';

/** Neutral body paragraphs composed under each excerpt, seeded per post. */
const BODY_PARAGRAPHS: readonly string[] = [
  'It started, as most useful things do, with a small annoyance that refused to go away. Once we named it out loud, the shape of the answer was already half-visible.',
  'The first attempt was wrong in an instructive way. The second was wrong in a boring way. The third one stuck, and it stuck because it was the simplest of the three.',
  'What surprised us was not the result but how repeatable it turned out to be. Do the unglamorous part first, keep notes, and the rest gets easier every single time.',
  'There is a version of this that costs twice as much and impresses nobody who matters. Skipping it was the best decision of the whole exercise.',
  'If you take one thing from this, make it the habit rather than the specifics. The specifics will change by next season; the habit compounds.',
  'We will keep refining and report back. In the meantime, the comments and the inbox are open — the best corrections always come from readers.',
];

const POST_TAGS: readonly string[] = ['Field notes', 'Guide', 'Essay', 'Dispatch', 'Notebook'];

export function renderBlog(spec: ProjectSpec): TemplateOutput {
  const rng = createRng(`${spec.seed}:blog`);
  const content = contentFor(spec.topic, createRng(`${spec.seed}:content`));
  const postCount = Math.min(rng.int(4, 6), content.posts.length);
  const tagStart = rng.int(0, POST_TAGS.length - 1);
  const posts = content.posts.slice(0, postCount).map((post, i) => ({
    ...post,
    id: `post-${i + 1}`,
    tag: POST_TAGS[(tagStart + i) % POST_TAGS.length] ?? 'Notes',
    minutes: rng.int(3, 9),
    paragraphs: [
      post.excerpt,
      BODY_PARAGRAPHS[rng.int(0, 2)] ?? '',
      BODY_PARAGRAPHS[rng.int(3, BODY_PARAGRAPHS.length - 1)] ?? '',
    ],
  }));

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
