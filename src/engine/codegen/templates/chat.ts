/**
 * Chat template — a two-pane messenger: conversations sidebar with
 * initial avatars, unread badges, last-message previews and relative
 * stamps; thread switching; day dividers; per-message timestamps; a
 * typing indicator that precedes seeded, varied replies on a 2–4 s
 * delay; localStorage persistence for every thread. Emoji-free copy.
 */
import { createRng, type Rng } from '@/lib/seeded';
import type { ProjectSpec } from '../../types';
import { contentFor, type TopicContent } from '../content';
import {
  baseCss,
  cssVariables,
  esc,
  gradientArtCss,
  renderFooter,
  renderHeader,
  slugify,
  toJsLiteral,
  withAlpha,
  type TemplateOutput,
} from '../shared';

interface SeedMessage {
  from: 'in' | 'out';
  text: string;
  time: string;
  day: string;
}

interface SeedThread {
  id: string;
  name: string;
  initials: string;
  status: string;
  stamp: string;
  unread: number;
  messages: SeedMessage[];
}

function initialsOf(name: string): string {
  const words = name.split(/\s+/).filter((word) => /^[A-Za-z]/.test(word));
  const first = words[0]?.charAt(0) ?? 'A';
  const last = words.length > 1 ? (words[words.length - 1]?.charAt(0) ?? '') : '';
  return `${first}${last}`.toUpperCase();
}

function clock(rng: Rng): string {
  const hour = rng.int(8, 17);
  const minute = rng.int(10, 59);
  return `${String(hour).padStart(2, '0')}:${minute}`;
}

/** Three seeded conversation scripts so threads read differently. */
function buildScript(
  rng: Rng,
  shape: number,
  taskA: string,
  taskB: string,
): Array<{ from: 'in' | 'out'; text: string }> {
  const a = taskA.toLowerCase();
  const b = taskB.toLowerCase();
  if (shape === 0) {
    return [
      { from: 'in', text: `Morning! Where did we land on “${a}”?` },
      { from: 'out', text: 'Wrapped the first pass late last night.' },
      { from: 'in', text: 'That was fast. Anything blocking the next step?' },
      { from: 'out', text: `Just need to ${b} before Friday.` },
      { from: 'in', text: 'Take my slot tomorrow if it helps.' },
    ];
  }
  if (shape === 1) {
    return [
      { from: 'out', text: `Quick one — is “${a}” still on for this week?` },
      { from: 'in', text: 'Yes. I moved it to the top of the list this morning.' },
      { from: 'out', text: `Perfect. I can ${b} this afternoon then.` },
      { from: 'in', text: 'Ping me when it is done and I will give it a look.' },
    ];
  }
  const closer = rng.pick([
    'Deal — done by tomorrow.',
    'Works for me. I will start now.',
    'On it. Expect an update tonight.',
  ]);
  return [
    { from: 'in', text: `Did you see my notes on “${a}”?` },
    { from: 'out', text: 'Reading them now. Good catch on the details.' },
    { from: 'in', text: `Let us split it — could you ${b}?` },
    { from: 'out', text: closer },
  ];
}

function buildThreads(rng: Rng, content: TopicContent): SeedThread[] {
  const stamps = ['2m', '35m', '1h', '3h', 'Tue', 'Mon'] as const;
  const statuses = ['Online', 'Away', 'Online', 'Offline'] as const;
  const threads: SeedThread[] = [];
  const contacts = content.chatContacts.slice(0, 4);
  contacts.forEach((name, i) => {
    const taskA = content.kanbanCards[(i * 2) % content.kanbanCards.length] ?? 'the plan';
    const taskB = content.todoIdeas[(i * 2 + 1) % content.todoIdeas.length] ?? 'sort the next step';
    const script = buildScript(rng, i % 3, taskA, taskB);
    const earlier = rng.pick(['Monday', 'Tuesday', 'Wednesday'] as const);
    const splitAt = Math.max(1, script.length - rng.int(2, 3));
    const messages: SeedMessage[] = script.map((line, j) => ({
      from: line.from,
      text: line.text,
      time: clock(rng),
      day: j < splitAt ? earlier : 'Today',
    }));
    threads.push({
      id: `thread-${i + 1}`,
      name,
      initials: initialsOf(name),
      status: statuses[i % statuses.length] ?? 'Online',
      stamp: stamps[i % stamps.length] ?? '1h',
      unread: i === 0 ? 0 : rng.int(0, 3),
      messages,
    });
  });
  // Make sure at least one badge shows out of the box.
  const second = threads[1];
  if (second && second.unread === 0) second.unread = rng.int(1, 3);
  return threads;
}

const REPLY_POOL: readonly string[] = [
  'Good call — let me look this afternoon.',
  'Agreed. I will take the first pass.',
  'Can you send the latest version here?',
  'Works for me. Tomorrow, first thing.',
  'Noted — adding it to the board now.',
  'Give me two minutes, just wrapping something up.',
  'That matches what I was thinking.',
  'Let me check with the others and get back to you.',
];

export function renderChat(spec: ProjectSpec): TemplateOutput {
  const rng = createRng(`${spec.seed}:chat`);
  const content = contentFor(spec.topic, createRng(`${spec.seed}:content`));
  const { archetype } = spec.style;
  const isBrut = archetype === 'brutalist';

  const threads = buildThreads(rng, content);
  const replyOffset = rng.int(0, REPLY_POOL.length - 1);
  const delays = Array.from({ length: 5 }, () => rng.int(2000, 4000));
  const storageKey = `promptly:${slugify(spec.name)}:chat:v1`;
  const first = threads[0];

  const body = `${renderHeader(spec, [])}
  <main class="app-main container chat-main">
    <div class="chat-shell card">
      <aside class="chat-sidebar" aria-label="Conversations">
        <div class="chat-sidebar-head">
          <h1>${esc(spec.name)}</h1>
          <p class="chat-sidebar-sub">${esc(spec.tagline)}</p>
        </div>
        <ul id="thread-list"></ul>
      </aside>
      <section class="chat-pane" aria-label="Conversation">
        <header class="chat-head">
          <span class="chat-avatar art-1" id="chat-avatar" aria-hidden="true">${esc(first?.initials ?? 'A')}</span>
          <div>
            <h2 id="chat-name">${esc(first?.name ?? 'Conversation')}</h2>
            <p class="chat-status" id="chat-status"><span class="status-dot" aria-hidden="true"></span> <span id="chat-status-text">Online</span></p>
          </div>
        </header>
        <ul id="thread" aria-live="polite"></ul>
        <form id="chat-form" autocomplete="off">
          <label class="sr-only" for="chat-input">Message</label>
          <input id="chat-input" type="text" placeholder="Write a message…" maxlength="400" />
          <button class="btn btn-primary" type="submit">Send</button>
        </form>
      </section>
    </div>
  </main>
${renderFooter(spec)}`;

  const hairline = isBrut ? '2px solid var(--text)' : '1px solid var(--border)';
  const outBubble =
    archetype === 'gradient'
      ? 'background: linear-gradient(120deg, var(--primary), var(--accent)); color: var(--primary-contrast);'
      : 'background: var(--primary); color: var(--primary-contrast);';

  const css = `${cssVariables(spec)}

${baseCss(spec)}

/* Chat */
.chat-main { max-width: 62rem; }
.chat-shell { display: grid; grid-template-columns: minmax(220px, 280px) 1fr; height: min(74vh, 44rem); overflow: hidden; }

/* Conversations sidebar */
.chat-sidebar { border-right: ${hairline}; display: flex; flex-direction: column; min-width: 0; background: var(--surface-alt); }
.chat-sidebar-head { padding: 1rem 1.1rem 0.8rem; border-bottom: ${hairline}; }
.chat-sidebar-head h1 { font-size: 1.05rem; }
.chat-sidebar-sub { color: var(--muted); font-size: 0.76rem; margin-top: 0.15rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#thread-list { list-style: none; margin: 0; padding: 0.5rem; flex: 1; overflow-y: auto; display: grid; gap: 0.2rem; align-content: start; }
.thread-item {
  display: flex; gap: 0.6rem; align-items: center; width: 100%; text-align: left;
  border: 0; background: transparent; color: var(--text); cursor: pointer;
  padding: 0.55rem 0.6rem; border-radius: var(--radius-sm); min-width: 0;
}
.thread-item:hover { background: var(--surface); }
.thread-item.is-active { background: var(--primary-soft); }
.thread-copy { flex: 1; min-width: 0; display: grid; gap: 0.05rem; }
.thread-name { font-weight: 700; font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.thread-preview { color: var(--muted); font-size: 0.78rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.thread-meta { display: grid; gap: 0.25rem; justify-items: end; flex: none; }
.thread-stamp { color: var(--muted); font-size: 0.68rem; font-variant-numeric: tabular-nums; }
.unread-badge {
  min-width: 1.15rem; height: 1.15rem; padding-inline: 0.3rem; border-radius: 999px;
  background: var(--primary); color: var(--primary-contrast); font-size: 0.66rem; font-weight: 800;
  display: grid; place-items: center;${isBrut ? ' border: 2px solid var(--text); border-radius: 0;' : ''}
}

/* Avatars */
.chat-avatar {
  width: 2.4rem; height: 2.4rem; border-radius: var(--radius-round); flex: none;
  display: grid; place-items: center; font-weight: 800; font-size: 0.8rem; letter-spacing: 0.04em;
  color: #FFFFFF; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);${isBrut ? ' border: 2px solid var(--text);' : ''}
}
.thread-item .chat-avatar { width: 2.1rem; height: 2.1rem; font-size: 0.72rem; }

/* Thread pane */
.chat-pane { display: flex; flex-direction: column; min-width: 0; }
.chat-head {
  display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1.1rem;
  border-bottom: ${hairline}; background: var(--surface);
}
.chat-head h2 { font-size: 1rem; }
.chat-status { color: var(--muted); font-size: 0.78rem; display: flex; align-items: center; gap: 0.35rem; }
.status-dot { width: 0.5rem; height: 0.5rem; border-radius: var(--radius-round); background: #3BA55D; display: inline-block; }
.chat-status.is-away .status-dot { background: #D9A038; }
.chat-status.is-offline .status-dot { background: var(--border); }
#thread {
  list-style: none; margin: 0; padding: 1.1rem; flex: 1; overflow-y: auto;
  display: flex; flex-direction: column; gap: 0.55rem;
}
.day-divider {
  align-self: center; color: var(--muted); font-size: 0.68rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.12em; padding: 0.2rem 0.8rem; margin-block: 0.35rem;
  background: var(--surface-alt); border-radius: var(--radius-btn);${isBrut ? ' border: 2px solid var(--text);' : ''}
}
.bubble { max-width: 78%; padding: 0.55rem 0.85rem; border-radius: var(--radius-md); display: grid; gap: 0.15rem; }
.bubble p { margin: 0; font-size: 0.94rem; overflow-wrap: anywhere; }
.bubble-in { align-self: flex-start; background: var(--surface-alt); border: ${isBrut ? '2px solid var(--text)' : '1px solid var(--border)'}; }
.bubble-out { align-self: flex-end; ${outBubble}${isBrut ? ' border: 2px solid var(--text);' : ''} }
.msg-time { font-size: 0.64rem; opacity: 0.75; justify-self: end; font-variant-numeric: tabular-nums; }
.bubble-in .msg-time { color: var(--muted); opacity: 1; }

/* Typing indicator */
.typing { display: inline-flex; gap: 0.3rem; padding-block: 0.8rem; align-items: center; }
.typing .dot {
  width: 0.42rem; height: 0.42rem; border-radius: var(--radius-round); background: var(--muted);
}
@media (prefers-reduced-motion: no-preference) {
  @keyframes typing-bounce {
    0%, 60%, 100% { transform: none; opacity: 0.5; }
    30% { transform: translateY(-4px); opacity: 1; }
  }
  .typing .dot { animation: typing-bounce 1s ease-in-out infinite; }
  .typing .dot:nth-child(2) { animation-delay: 0.15s; }
  .typing .dot:nth-child(3) { animation-delay: 0.3s; }
}

#chat-form { display: flex; gap: 0.6rem; padding: 0.9rem 1.1rem; border-top: ${hairline}; }
#chat-form input { flex: 1; }

@media (max-width: 700px) {
  .chat-shell { grid-template-columns: 1fr; height: auto; }
  .chat-sidebar { border-right: 0; border-bottom: ${hairline}; }
  #thread-list { max-height: 11rem; }
  #thread { max-height: 46vh; }
}

/* Seeded avatar art */
${gradientArtCss(spec)}
.chat-avatar { background-color: ${withAlpha(spec.palette.primary, 0.85)}; }`;

  const js = `(function () {
  'use strict';

  var STORAGE_KEY = '${storageKey}';
  var SEED_THREADS = ${toJsLiteral(threads)};
  var REPLIES = ${toJsLiteral(REPLY_POOL)};
  var DELAYS = ${toJsLiteral(delays)};
  var replyIndex = ${replyOffset};
  var delayIndex = 0;

  var threadList = document.getElementById('thread-list');
  var threadEl = document.getElementById('thread');
  var form = document.getElementById('chat-form');
  var input = document.getElementById('chat-input');
  var headAvatar = document.getElementById('chat-avatar');
  var headName = document.getElementById('chat-name');
  var headStatus = document.getElementById('chat-status');
  var headStatusText = document.getElementById('chat-status-text');
  if (!threadList || !threadEl || !form || !input) return;

  function sanitize(parsed) {
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    var clean = [];
    for (var i = 0; i < parsed.length; i++) {
      var thread = parsed[i];
      if (!thread || typeof thread.name !== 'string' || !Array.isArray(thread.messages)) continue;
      var messages = [];
      for (var j = 0; j < thread.messages.length; j++) {
        var message = thread.messages[j];
        if (!message || typeof message.text !== 'string') continue;
        messages.push({
          from: message.from === 'out' ? 'out' : 'in',
          text: message.text,
          time: typeof message.time === 'string' ? message.time : '',
          day: typeof message.day === 'string' ? message.day : 'Today'
        });
      }
      clean.push({
        id: typeof thread.id === 'string' ? thread.id : 'thread-x' + i,
        name: thread.name,
        initials: typeof thread.initials === 'string' ? thread.initials : 'A',
        status: typeof thread.status === 'string' ? thread.status : 'Online',
        stamp: typeof thread.stamp === 'string' ? thread.stamp : '',
        unread: typeof thread.unread === 'number' ? thread.unread : 0,
        messages: messages
      });
    }
    return clean.length > 0 ? clean : null;
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = sanitize(JSON.parse(raw));
        if (parsed) return parsed;
      }
    } catch (error) { /* storage unavailable — run in memory */ }
    return SEED_THREADS.slice();
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(threads)); } catch (error) { /* ignore */ }
  }

  var threads = load();
  var activeId = threads.length > 0 ? threads[0].id : null;

  function activeThread() {
    for (var i = 0; i < threads.length; i++) {
      if (threads[i].id === activeId) return threads[i];
    }
    return null;
  }

  function threadById(id) {
    for (var i = 0; i < threads.length; i++) {
      if (threads[i].id === id) return threads[i];
    }
    return null;
  }

  function avatarClass(index) {
    return 'chat-avatar art-' + ((index % 6) + 1);
  }

  /* --------------------------- sidebar ----------------------------- */

  function renderSidebar() {
    threadList.textContent = '';
    threads.forEach(function (thread, index) {
      var item = document.createElement('li');
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'thread-item' + (thread.id === activeId ? ' is-active' : '');

      var avatar = document.createElement('span');
      avatar.className = avatarClass(index);
      avatar.setAttribute('aria-hidden', 'true');
      avatar.textContent = thread.initials;

      var copy = document.createElement('span');
      copy.className = 'thread-copy';
      var name = document.createElement('span');
      name.className = 'thread-name';
      name.textContent = thread.name;
      var preview = document.createElement('span');
      preview.className = 'thread-preview';
      var last = thread.messages[thread.messages.length - 1];
      preview.textContent = last ? (last.from === 'out' ? 'You: ' : '') + last.text : 'No messages yet';
      copy.appendChild(name);
      copy.appendChild(preview);

      var meta = document.createElement('span');
      meta.className = 'thread-meta';
      var stamp = document.createElement('span');
      stamp.className = 'thread-stamp';
      stamp.textContent = thread.stamp;
      meta.appendChild(stamp);
      if (thread.unread > 0) {
        var badge = document.createElement('span');
        badge.className = 'unread-badge';
        badge.textContent = String(thread.unread);
        badge.setAttribute('aria-label', thread.unread + ' unread messages');
        meta.appendChild(badge);
      }

      button.appendChild(avatar);
      button.appendChild(copy);
      button.appendChild(meta);
      button.setAttribute('aria-label', 'Open conversation with ' + thread.name);
      button.addEventListener('click', function () {
        if (thread.id === activeId) return;
        activeId = thread.id;
        thread.unread = 0;
        save();
        renderSidebar();
        renderThread();
      });
      item.appendChild(button);
      threadList.appendChild(item);
    });
  }

  /* ---------------------------- thread ------------------------------ */

  var typingEl = null;

  function buildTyping(name) {
    var item = document.createElement('li');
    item.className = 'bubble bubble-in typing';
    item.setAttribute('aria-label', name + ' is typing');
    for (var i = 0; i < 3; i++) {
      var dot = document.createElement('span');
      dot.className = 'dot';
      item.appendChild(dot);
    }
    return item;
  }

  function scrollToLatest() {
    threadEl.scrollTop = threadEl.scrollHeight;
  }

  function buildBubble(message) {
    var item = document.createElement('li');
    item.className = 'bubble bubble-' + message.from;
    var paragraph = document.createElement('p');
    paragraph.textContent = message.text;
    item.appendChild(paragraph);
    if (message.time) {
      var time = document.createElement('span');
      time.className = 'msg-time';
      time.textContent = message.time;
      item.appendChild(time);
    }
    return item;
  }

  function renderThread() {
    var thread = activeThread();
    threadEl.textContent = '';
    typingEl = null;
    if (!thread) return;

    var index = threads.indexOf(thread);
    if (headAvatar) {
      headAvatar.className = avatarClass(index);
      headAvatar.textContent = thread.initials;
    }
    if (headName) headName.textContent = thread.name;
    if (headStatusText) headStatusText.textContent = thread.status;
    if (headStatus) {
      headStatus.className = 'chat-status' +
        (thread.status === 'Away' ? ' is-away' : thread.status === 'Offline' ? ' is-offline' : '');
    }

    var lastDay = null;
    thread.messages.forEach(function (message) {
      if (message.day && message.day !== lastDay) {
        var divider = document.createElement('li');
        divider.className = 'day-divider';
        divider.textContent = message.day;
        threadEl.appendChild(divider);
        lastDay = message.day;
      }
      threadEl.appendChild(buildBubble(message));
    });

    typingEl = buildTyping(thread.name);
    typingEl.hidden = true;
    threadEl.appendChild(typingEl);
    scrollToLatest();
  }

  function appendMessage(thread, message) {
    thread.messages.push(message);
    if (thread.id === activeId) {
      var bubble = buildBubble(message);
      if (typingEl && typingEl.parentNode === threadEl) threadEl.insertBefore(bubble, typingEl);
      else threadEl.appendChild(bubble);
      scrollToLatest();
    } else {
      thread.unread += 1;
    }
    thread.stamp = 'now';
    save();
    renderSidebar();
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var thread = activeThread();
    var text = input.value.trim();
    if (!thread || !text) return;
    appendMessage(thread, { from: 'out', text: text, time: 'Just now', day: 'Today' });
    input.value = '';

    var targetId = thread.id;
    if (typingEl && targetId === activeId) {
      typingEl.hidden = false;
      scrollToLatest();
    }
    var delay = DELAYS[delayIndex % DELAYS.length];
    delayIndex += 1;
    setTimeout(function () {
      if (typingEl && targetId === activeId) typingEl.hidden = true;
      var target = threadById(targetId);
      if (!target) return;
      var reply = REPLIES[replyIndex % REPLIES.length];
      replyIndex += 1;
      appendMessage(target, { from: 'in', text: reply, time: 'Just now', day: 'Today' });
    }, delay);
  });

  renderSidebar();
  renderThread();
})();`;

  return { body, css, js };
}
