/**
 * Chat template — a message thread, a composer that appends instantly,
 * a typing indicator and varied canned replies on a short delay.
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
  toJsLiteral,
  type TemplateOutput,
} from '../shared';

const REPLY_POOL: readonly string[] = [
  'Good point — say more?',
  'Ha, exactly what I was thinking.',
  'Let me check and get back to you.',
  'Can you drop the link here?',
  'Agreed. Let us ship it.',
  'On my way — two minutes.',
  'That works. Same time tomorrow?',
  'Noted. Adding it to the list.',
];

export function renderChat(spec: ProjectSpec): TemplateOutput {
  const rng = createRng(`${spec.seed}:chat`);
  const content = contentFor(spec.topic, createRng(`${spec.seed}:content`));
  const taskA = content.kanbanCards[0] ?? 'the plan';
  const taskB = content.todoIdeas[0] ?? 'the next step';
  const starterPool: ReadonlyArray<{ from: 'in' | 'out'; text: string }> = [
    { from: 'in', text: `Morning! Any progress on “${taskA.toLowerCase()}”?` },
    { from: 'out', text: 'Just wrapped the first pass — want to take a look?' },
    { from: 'in', text: 'Looks great so far. Can we walk through it at noon?' },
    { from: 'out', text: `Works for me. Afterwards I still need to ${taskB.toLowerCase()}.` },
    { from: 'in', text: 'Deal. Bring snacks and it is officially a meeting.' },
  ];
  const starterCount = rng.int(3, 5);
  const starters = starterPool.slice(0, starterCount);
  const replyOffset = rng.int(0, REPLY_POOL.length - 1);
  const contact = rng.pick(content.chatContacts);

  const messages = starters
    .map(
      (message) => `        <li class="bubble bubble-${message.from}">
          <p>${esc(message.text)}</p>
        </li>`,
    )
    .join('\n');

  const body = `${renderHeader(spec, [])}
  <main class="app-main container chat-main">
    <section class="card chat-card" aria-label="Conversation">
      <header class="chat-head">
        <span class="chat-avatar" aria-hidden="true">${esc(contact.charAt(0))}</span>
        <div>
          <h1>${esc(contact)}</h1>
          <p class="chat-status"><span class="status-dot" aria-hidden="true"></span> Online</p>
        </div>
      </header>
      <ul id="thread" aria-live="polite">
${messages}
        <li id="typing" class="bubble bubble-in typing" hidden aria-label="${esc(contact)} is typing">
          <span class="dot"></span><span class="dot"></span><span class="dot"></span>
        </li>
      </ul>
      <form id="chat-form" autocomplete="off">
        <label class="sr-only" for="chat-input">Message</label>
        <input id="chat-input" type="text" placeholder="Write a message…" maxlength="400" />
        <button class="btn btn-primary" type="submit">Send</button>
      </form>
    </section>
  </main>
${renderFooter(spec)}`;

  const css = `${cssVariables(spec)}

${baseCss(spec)}

/* Chat */
.chat-main { max-width: 36rem; }
.chat-card { display: flex; flex-direction: column; height: min(72vh, 40rem); overflow: hidden; }
.chat-head {
  display: flex; align-items: center; gap: 0.75rem; padding: 0.9rem 1.1rem;
  border-bottom: 1px solid var(--border); background: var(--surface-alt);
}
.chat-head h1 { font-size: 1.05rem; }
.chat-avatar {
  width: 2.4rem; height: 2.4rem; border-radius: var(--radius-round); flex: none;
  display: grid; place-items: center; font-weight: 700;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  color: var(--primary-contrast);
}
.chat-status { color: var(--muted); font-size: 0.8rem; display: flex; align-items: center; gap: 0.35rem; }
.status-dot { width: 0.5rem; height: 0.5rem; border-radius: var(--radius-round); background: #3BA55D; display: inline-block; }
#thread {
  list-style: none; margin: 0; padding: 1.1rem; flex: 1; overflow-y: auto;
  display: flex; flex-direction: column; gap: 0.5rem;
}
.bubble { max-width: 78%; padding: 0.55rem 0.85rem; border-radius: var(--radius-md); }
.bubble p { margin: 0; font-size: 0.95rem; }
.bubble-in { align-self: flex-start; background: var(--surface-alt); border: 1px solid var(--border); }
.bubble-out { align-self: flex-end; background: var(--primary); color: var(--primary-contrast); }
.typing { display: inline-flex; gap: 0.3rem; padding-block: 0.8rem; }
.typing .dot {
  width: 0.42rem; height: 0.42rem; border-radius: var(--radius-round); background: var(--muted);
  animation: typing-bounce 1s ease-in-out infinite;
}
.typing .dot:nth-child(2) { animation-delay: 0.15s; }
.typing .dot:nth-child(3) { animation-delay: 0.3s; }
@keyframes typing-bounce {
  0%, 60%, 100% { transform: none; opacity: 0.5; }
  30% { transform: translateY(-4px); opacity: 1; }
}
#chat-form { display: flex; gap: 0.6rem; padding: 0.9rem 1.1rem; border-top: 1px solid var(--border); }
#chat-form input { flex: 1; }`;

  const js = `(function () {
  'use strict';

  var REPLIES = ${toJsLiteral(REPLY_POOL)};
  var replyIndex = ${replyOffset};

  var thread = document.getElementById('thread');
  var form = document.getElementById('chat-form');
  var input = document.getElementById('chat-input');
  var typing = document.getElementById('typing');
  if (!thread || !form || !input) return;

  function scrollToLatest() {
    thread.scrollTop = thread.scrollHeight;
  }

  function appendBubble(text, direction) {
    var item = document.createElement('li');
    item.className = 'bubble bubble-' + direction;
    var paragraph = document.createElement('p');
    paragraph.textContent = text;
    item.appendChild(paragraph);
    if (typing && typing.parentNode === thread) thread.insertBefore(item, typing);
    else thread.appendChild(item);
    scrollToLatest();
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var text = input.value.trim();
    if (!text) return;
    appendBubble(text, 'out');
    input.value = '';

    if (typing) {
      typing.hidden = false;
      scrollToLatest();
    }
    setTimeout(function () {
      if (typing) typing.hidden = true;
      var reply = REPLIES[replyIndex % REPLIES.length];
      replyIndex += 1;
      appendBubble(reply, 'in');
    }, 900);
  });

  scrollToLatest();
})();`;

  return { body, css, js };
}
