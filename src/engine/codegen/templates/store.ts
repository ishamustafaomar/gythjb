/**
 * Store template — a topic-true storefront: hero banner, shop grid with
 * category chips, search and sort, a per-product detail view (large art,
 * composed two-sentence description, quantity stepper, related items) and
 * a slide-in cart drawer with an add-to-cart toast. Cart state persists to
 * localStorage; all view switching is plain JS with no reload.
 */
import { createRng } from '@/lib/seeded';
import type { ProjectSpec } from '../../types';
import { PRODUCT_ART_BASE_CSS, productArt, type ArtPiece } from '../art';
import { contentFor, type TopicContent } from '../content';
import { icon } from '../icons';
import { buildRuntimeJs } from '../runtime';
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

interface StoreProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  related: readonly number[];
}

function capFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Two original sentences per product, composed from the topic pools. */
function composeDescription(
  spec: ProjectSpec,
  content: TopicContent,
  category: string,
  index: number,
): string {
  const rng = createRng(`${spec.seed}:store-desc:${index}`);
  const lead = rng.pick([
    `A quiet favorite from our ${category.toLowerCase()} shelf`,
    'One of the first things visitors pick up',
    'A small upgrade that pulls real weight',
    'The kind of staple that earns reorders',
    'Stocked in small batches and gone quickly',
  ]);
  const imagery = rng.pick(content.taglineImagery);
  const promise = rng.pick(content.taglinePromises);
  return `${lead}. ${capFirst(imagery)} — ${promise}.`;
}

function buildProducts(spec: ProjectSpec, content: TopicContent): StoreProduct[] {
  const rng = createRng(`${spec.seed}:store`);
  const productCount = Math.min(rng.int(7, 8), content.products.length);
  const base = content.products.slice(0, productCount);

  return base.map((item, i) => {
    // Related picks: same category first, then fill from the rest.
    const sameCategory: number[] = [];
    const others: number[] = [];
    base.forEach((candidate, k) => {
      if (k === i) return;
      (candidate.category === item.category ? sameCategory : others).push(k);
    });
    return {
      id: `p-${i + 1}`,
      name: item.name,
      category: item.category,
      price: item.price,
      description: composeDescription(spec, content, item.category, i),
      related: [...sameCategory, ...others].slice(0, 3),
    };
  });
}

function productCard(product: StoreProduct, index: number, art: ArtPiece): string {
  return `          <article class="card product" data-product-card data-id="${product.id}" data-category="${esc(product.category)}" data-name="${esc(product.name.toLowerCase())}" data-price="${product.price}" data-index="${index}" data-reveal data-reveal-delay="${(index % 3) * 80}">
            <button class="product-open" type="button" data-open="${product.id}" aria-label="View ${esc(product.name)}">
              <span class="product-art-frame" aria-hidden="true">${art.html}</span>
            </button>
            <div class="product-info">
              <span class="badge">${esc(product.category)}</span>
              <h3>${esc(product.name)}</h3>
              <div class="product-row">
                <span class="product-price">$${product.price.toFixed(2)}</span>
                <button class="btn btn-primary btn-add" type="button" data-add="${product.id}">Add</button>
              </div>
            </div>
          </article>`;
}

function detailView(
  product: StoreProduct,
  products: readonly StoreProduct[],
  arts: readonly ArtPiece[],
  artIndex: number,
): string {
  const related = product.related
    .map((k) => {
      const other = products[k];
      const art = arts[k];
      if (!other || !art) return '';
      return `            <button class="card related-item" type="button" data-open="${other.id}">
              <span class="related-art" aria-hidden="true">${art.html}</span>
              <span class="related-name">${esc(other.name)}</span>
              <span class="related-price">$${other.price.toFixed(2)}</span>
            </button>`;
    })
    .filter((chunk) => chunk.length > 0)
    .join('\n');

  return `        <article class="product-detail" id="detail-${product.id}" hidden>
          <button class="btn btn-ghost detail-back" type="button" data-back-to-shop>Back to the shop</button>
          <div class="detail-grid">
            <div class="detail-art" aria-hidden="true">${arts[artIndex]?.html ?? ''}</div>
            <div class="detail-info">
              <span class="badge">${esc(product.category)}</span>
              <h1 class="detail-name">${esc(product.name)}</h1>
              <p class="detail-price">$${product.price.toFixed(2)}</p>
              <p class="detail-desc">${esc(product.description)}</p>
              <div class="qty-row">
                <div class="qty-stepper" role="group" aria-label="Quantity">
                  <button class="qty-btn" type="button" data-step="-1" aria-label="Fewer">&minus;</button>
                  <span class="qty-value" data-qty>1</span>
                  <button class="qty-btn" type="button" data-step="1" aria-label="More">+</button>
                </div>
                <button class="btn btn-primary btn-lg" type="button" data-add-detail="${product.id}">Add to cart</button>
              </div>
              <ul class="detail-notes">
                <li>${icon('truck')} <span>Careful packing, quick dispatch</span></li>
                <li>${icon('shield')} <span>Easy returns within 30 days</span></li>
              </ul>
            </div>
          </div>
          <h3 class="related-head">You might also like</h3>
          <div class="related-row">
${related}
          </div>
        </article>`;
}

export function renderStore(spec: ProjectSpec): TemplateOutput {
  const content = contentFor(spec.topic, createRng(`${spec.seed}:content`));
  const products = buildProducts(spec, content);
  const arts = products.map((_, i) =>
    productArt(createRng(`${spec.seed}:product-art:${i}`), spec.topic, i),
  );
  const storageKey = `promptly:${slugify(spec.name)}:cart`;

  const heroRng = createRng(`${spec.seed}:store-hero`);
  const kicker = heroRng.pick(content.heroKickers);
  const shipLine = heroRng.pick([
    'Orders packed and shipped within 48 hours',
    'Free local delivery on orders over $50',
    'Same-week delivery across the city',
  ]);

  const categories = [...new Set(products.map((product) => product.category))];
  const chips = ['Everything', ...categories]
    .map((label, index) => {
      const value = index === 0 ? 'all' : label;
      return `            <button class="chip${index === 0 ? ' is-active' : ''}" type="button" data-filter="${esc(value)}" aria-pressed="${index === 0 ? 'true' : 'false'}">${esc(label)}</button>`;
    })
    .join('\n');

  const cards = products.map((product, i) => productCard(product, i, arts[i] ?? { html: '', css: '' })).join('\n');
  const details = products.map((product, i) => detailView(product, products, arts, i)).join('\n');

  const cartAction = `<button id="cart-toggle" class="btn btn-ghost cart-toggle" type="button" aria-haspopup="dialog">
        ${icon('cart')}<span>Cart</span><span id="cart-count" class="cart-count" aria-label="Items in cart">0</span>
      </button>`;

  const body = `${renderHeader(spec, [], cartAction)}
  <main class="store-main" id="main">
    <section class="section store-hero" aria-label="Welcome">
      <div class="container store-hero-inner" data-reveal>
        <span class="eyebrow">${esc(kicker)}</span>
        <h1>${esc(spec.name)}</h1>
        <p class="lede">${esc(spec.tagline)}</p>
        <div class="store-hero-meta">
          <span>${icon('truck')} ${esc(shipLine)}</span>
          <span>${icon('clock')} ${esc(content.hoursLine)}</span>
        </div>
      </div>
    </section>
    <section id="shop-view" class="shop" aria-label="Shop">
      <div class="container">
        <div class="shop-controls" data-reveal>
          <div class="chip-row" role="group" aria-label="Filter by category">
${chips}
          </div>
          <div class="shop-tools">
            <label class="sr-only" for="shop-search">Search products</label>
            <input id="shop-search" type="search" placeholder="Search the shelves&hellip;" autocomplete="off" />
            <label class="sr-only" for="shop-sort">Sort products</label>
            <select id="shop-sort">
              <option value="featured">Featured</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="name">Name A&ndash;Z</option>
            </select>
          </div>
        </div>
        <div class="grid cols-3 product-grid" id="product-grid">
${cards}
        </div>
        <p id="shop-empty" hidden>No matches on the shelves &mdash; try a different word.</p>
      </div>
    </section>
    <section id="product-view" class="shop" hidden aria-label="Product detail">
      <div class="container">
${details}
      </div>
    </section>
  </main>
  <div id="cart-backdrop" class="cart-backdrop" hidden></div>
  <aside id="cart-drawer" class="cart-drawer" aria-label="Shopping cart" aria-hidden="true">
    <header class="cart-head">
      <h2>Your cart</h2>
      <button id="cart-close" class="btn btn-ghost" type="button" aria-label="Close cart">${icon('close')}</button>
    </header>
    <ul id="cart-items"></ul>
    <p id="cart-empty">Your cart is empty &mdash; the shelves are right there.</p>
    <footer class="cart-foot">
      <div class="cart-total-row">
        <span>Total</span>
        <strong id="cart-total">$0.00</strong>
      </div>
      <button id="cart-checkout" class="btn btn-primary" type="button">Checkout</button>
      <p id="cart-status" role="status"></p>
    </footer>
  </aside>
  <div class="toast" id="toast" role="status" hidden></div>
${renderFooter(spec)}`;

  const css = [
    cssVariables(spec),
    baseCss(spec),
    storeCss(spec),
    `/* Product art */\n${PRODUCT_ART_BASE_CSS}\n${arts.map((art) => art.css).join('\n')}`,
  ].join('\n\n');

  const js = `${buildRuntimeJs()}\n${storeJs(storageKey, products)}`;

  return { body, css, js };
}

function storeCss(spec: ProjectSpec): string {
  const { archetype } = spec.style;
  const brutal = archetype === 'brutalist';
  const line = brutal ? '3px solid var(--text)' : '1px solid var(--border)';
  const chipBorder = brutal ? '2px solid var(--text)' : '1px solid var(--border)';

  return `/* Storefront */
.store-hero { padding-block: calc(var(--section-pad) * 0.8) calc(var(--section-pad) * 0.5); }
.store-hero-inner { max-width: 44rem; }
.store-hero .lede { color: var(--muted); font-size: 1.12rem; margin-top: 0.75rem; }
.store-hero-meta { display: flex; flex-wrap: wrap; gap: 0.6rem 1.75rem; margin-top: 1.5rem; color: var(--muted); font-size: 0.88rem; }
.store-hero-meta span { display: inline-flex; align-items: center; gap: 0.5rem; }
.store-hero-meta svg { width: 1rem; height: 1rem; color: var(--primary); }
.shop { padding-block: 0 var(--section-pad); }
.cart-toggle { display: inline-flex; align-items: center; gap: 0.45rem; }
.cart-toggle svg { width: 1.05rem; height: 1.05rem; }
.cart-count { display: inline-block; min-width: 1.4rem; text-align: center; background: var(--primary); color: var(--primary-contrast); border-radius: var(--radius-btn); font-size: 0.8rem; padding: 0.05rem 0.4rem; }

/* Controls */
.shop-controls { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.9rem 1.5rem; margin-bottom: 1.5rem; }
.chip-row { display: flex; flex-wrap: wrap; gap: 0.45rem; }
.chip { border: ${chipBorder}; background: var(--surface); color: var(--muted); border-radius: var(--radius-btn); padding: 0.3rem 0.9rem; cursor: pointer; font: inherit; font-size: 0.88rem; font-weight: 600; }
.chip:hover { border-color: var(--primary); color: var(--primary); }
.chip.is-active { background: var(--primary); border-color: var(--primary); color: var(--primary-contrast); }
.shop-tools { display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap; }
.shop-tools input[type='search'] { width: 13rem; }
.shop-tools select { width: auto; }

/* Grid cards */
.product { overflow: hidden; display: grid; grid-template-rows: auto 1fr; transition: transform 0.15s ease, box-shadow 0.15s ease; }
.product:hover { transform: translateY(-3px);${archetype === 'minimal' ? ' border-color: var(--text);' : ' box-shadow: var(--shadow);'} }
.product-open { display: block; padding: 0; border: 0; background: transparent; cursor: pointer; }
.product-art-frame { display: block; }
.product-art-frame .product-art { width: 100%; aspect-ratio: 5 / 4; }
.product-info { padding: 1rem 1.1rem 1.2rem; display: grid; gap: 0.5rem; justify-items: start; align-content: start; }
.product-info h3 { font-size: 1.02rem; }
.product-row { display: flex; align-items: center; justify-content: space-between; width: 100%; }
.product-price { font-weight: 700; font-variant-numeric: tabular-nums; }
.btn-add { padding: 0.4rem 0.95rem; }
#shop-empty { color: var(--muted); text-align: center; padding-block: 2.5rem; }

/* Detail view */
.detail-back { margin-bottom: 1.5rem; }
.detail-grid { display: grid; gap: clamp(1.5rem, 4vw, 3rem); grid-template-columns: 1.05fr 1fr; align-items: start; }
.detail-art { border-radius: var(--radius-lg); overflow: hidden;${brutal ? ' border: 3px solid var(--text);' : ''} }
.detail-art .product-art { width: 100%; aspect-ratio: 1; }
.detail-info { display: grid; gap: 0.9rem; justify-items: start; }
.detail-name { font-size: clamp(1.6rem, 3.5vw, 2.4rem); }
.detail-price { font-size: 1.3rem; font-weight: 800; font-variant-numeric: tabular-nums; color: var(--primary); }
.detail-desc { color: var(--muted); }
.qty-row { display: flex; align-items: center; gap: 0.9rem; flex-wrap: wrap; margin-top: 0.4rem; }
.qty-stepper { display: inline-flex; align-items: center; gap: 0.15rem; border: ${chipBorder}; border-radius: var(--radius-btn); padding: 0.2rem; background: var(--surface); }
.qty-btn { width: 2rem; height: 2rem; border: 0; background: transparent; color: var(--text); border-radius: var(--radius-btn); cursor: pointer; font: inherit; font-weight: 700; line-height: 1; }
.qty-btn:hover { background: var(--primary-soft); color: var(--primary-strong); }
.qty-value { min-width: 2rem; text-align: center; font-weight: 700; font-variant-numeric: tabular-nums; }
.detail-notes { list-style: none; margin: 0.75rem 0 0; padding: 0.9rem 0 0; border-top: ${line}; display: grid; gap: 0.5rem; color: var(--muted); font-size: 0.9rem; }
.detail-notes li { display: flex; align-items: center; gap: 0.55rem; }
.detail-notes svg { width: 1rem; height: 1rem; flex: none; color: var(--primary); }
.related-head { margin: 2.5rem 0 1rem; }
.related-row { display: grid; gap: var(--gap); grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); }
.related-item { display: grid; gap: 0.45rem; justify-items: start; padding: 0.75rem; cursor: pointer; font: inherit; text-align: left; color: var(--text); overflow: hidden; }
.related-art { display: block; width: 100%; border-radius: var(--radius-sm); overflow: hidden; }
.related-art .product-art { width: 100%; aspect-ratio: 5 / 4; }
.related-name { font-weight: 600; font-size: 0.9rem; line-height: 1.3; }
.related-price { color: var(--muted); font-size: 0.85rem; font-variant-numeric: tabular-nums; }
@media (max-width: 760px) { .detail-grid { grid-template-columns: 1fr; } }

/* Cart drawer */
.cart-backdrop { position: fixed; inset: 0; background: rgba(10, 12, 16, 0.45); z-index: 90; }
.cart-drawer { position: fixed; top: 0; right: 0; bottom: 0; width: min(24rem, 92vw); z-index: 100; background: var(--surface); border-left: ${line}; display: flex; flex-direction: column; padding: 1.25rem; transform: translateX(100%); visibility: hidden; }
.cart-drawer.is-open { transform: translateX(0); visibility: visible; }
.cart-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.cart-head svg { width: 1.05rem; height: 1.05rem; }
#cart-items { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.75rem; overflow-y: auto; flex: 1; align-content: start; }
.cart-item { display: grid; grid-template-columns: 1fr auto; gap: 0.35rem; border-bottom: 1px solid var(--border); padding-bottom: 0.75rem; }
.cart-item-name { font-weight: 600; font-size: 0.95rem; }
.cart-item-price { color: var(--muted); font-size: 0.85rem; font-variant-numeric: tabular-nums; }
.cart-item .qty-controls { display: flex; align-items: center; gap: 0.45rem; grid-column: 1 / -1; }
.cart-item .qty-btn { width: 1.6rem; height: 1.6rem; border: 1px solid var(--border); background: var(--surface); }
.cart-item .qty-btn:hover { border-color: var(--primary); color: var(--primary); }
.cart-item-remove { border: 0; background: transparent; color: var(--muted); cursor: pointer; margin-left: auto; font: inherit; font-size: 0.85rem; }
.cart-item-remove:hover { color: #D64550; }
#cart-empty { color: var(--muted); text-align: center; padding-block: 2rem; }
.cart-foot { border-top: ${line}; padding-top: 1rem; display: grid; gap: 0.75rem; }
.cart-total-row { display: flex; justify-content: space-between; font-size: 1.05rem; }
#cart-status { color: var(--primary); font-weight: 600; min-height: 1.3em; margin: 0; }
@media (prefers-reduced-motion: no-preference) {
  .cart-drawer { transition: transform 0.25s ease, visibility 0.25s; }
}

/* Toast */
.toast { position: fixed; left: 50%; bottom: 1.4rem; transform: translateX(-50%); z-index: 120; background: var(--text); color: var(--bg); padding: 0.6rem 1.2rem; border-radius: var(--radius-btn); font-weight: 600; font-size: 0.92rem;${brutal ? ' border: 3px solid var(--bg); box-shadow: 4px 4px 0 var(--bg);' : ' box-shadow: var(--shadow);'} }
.toast[hidden] { display: none; }
@media (prefers-reduced-motion: no-preference) {
  @keyframes toast-in { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }
  .toast { animation: toast-in 0.25s ease; }
}

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

function storeJs(storageKey: string, products: readonly StoreProduct[]): string {
  const productData = products.map((product) => ({
    id: product.id,
    name: product.name,
    price: product.price,
    category: product.category,
  }));

  return `(function () {
  'use strict';

  var STORAGE_KEY = '${storageKey}';
  var PRODUCTS = ${toJsLiteral(productData)};

  var grid = document.getElementById('product-grid');
  var shopView = document.getElementById('shop-view');
  var productView = document.getElementById('product-view');
  var drawer = document.getElementById('cart-drawer');
  var backdrop = document.getElementById('cart-backdrop');
  var itemsEl = document.getElementById('cart-items');
  var emptyEl = document.getElementById('cart-empty');
  var totalEl = document.getElementById('cart-total');
  var countEl = document.getElementById('cart-count');
  var statusEl = document.getElementById('cart-status');
  var searchInput = document.getElementById('shop-search');
  var sortSelect = document.getElementById('shop-sort');
  var shopEmpty = document.getElementById('shop-empty');
  var toastEl = document.getElementById('toast');
  if (!grid || !drawer || !itemsEl) return;

  /* ---------------- cart state (persisted) ---------------- */

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (error) { /* storage unavailable — run in memory */ }
    return {};
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch (error) { /* ignore */ }
  }

  var cart = load();
  var toastTimer = null;

  function product(productId) {
    for (var i = 0; i < PRODUCTS.length; i++) {
      if (PRODUCTS[i].id === productId) return PRODUCTS[i];
    }
    return null;
  }

  function toast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.hidden = false;
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { toastEl.hidden = true; }, 2600);
  }

  function setQuantity(productId, quantity) {
    if (quantity <= 0) delete cart[productId];
    else cart[productId] = Math.min(99, quantity);
    save();
    renderCart();
  }

  function addToCart(productId, amount) {
    var item = product(productId);
    if (!item) return;
    setQuantity(productId, (cart[productId] || 0) + amount);
    toast('Added ' + item.name + ' to your cart');
  }

  function renderCart() {
    itemsEl.textContent = '';
    var ids = Object.keys(cart);
    var total = 0;
    var count = 0;

    ids.forEach(function (productId) {
      var item = product(productId);
      var quantity = cart[productId];
      if (!item || !quantity) return;
      total += item.price * quantity;
      count += quantity;

      var row = document.createElement('li');
      row.className = 'cart-item';

      var name = document.createElement('span');
      name.className = 'cart-item-name';
      name.textContent = item.name;

      var price = document.createElement('span');
      price.className = 'cart-item-price';
      price.textContent = '$' + (item.price * quantity).toFixed(2);

      var controls = document.createElement('div');
      controls.className = 'qty-controls';

      var minus = document.createElement('button');
      minus.className = 'qty-btn';
      minus.type = 'button';
      minus.textContent = '\\u2212';
      minus.setAttribute('aria-label', 'Fewer ' + item.name);
      minus.addEventListener('click', function () { setQuantity(productId, quantity - 1); });

      var amount = document.createElement('span');
      amount.textContent = String(quantity);

      var plus = document.createElement('button');
      plus.className = 'qty-btn';
      plus.type = 'button';
      plus.textContent = '+';
      plus.setAttribute('aria-label', 'More ' + item.name);
      plus.addEventListener('click', function () { setQuantity(productId, quantity + 1); });

      var remove = document.createElement('button');
      remove.className = 'cart-item-remove';
      remove.type = 'button';
      remove.textContent = 'Remove';
      remove.addEventListener('click', function () { setQuantity(productId, 0); });

      controls.appendChild(minus);
      controls.appendChild(amount);
      controls.appendChild(plus);
      controls.appendChild(remove);

      row.appendChild(name);
      row.appendChild(price);
      row.appendChild(controls);
      itemsEl.appendChild(row);
    });

    if (emptyEl) emptyEl.hidden = ids.length > 0;
    if (totalEl) totalEl.textContent = '$' + total.toFixed(2);
    if (countEl) countEl.textContent = String(count);
    var checkout = document.getElementById('cart-checkout');
    if (checkout) checkout.disabled = ids.length === 0;
  }

  function openDrawer() {
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    if (backdrop) backdrop.hidden = false;
  }

  function closeDrawer() {
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    if (backdrop) backdrop.hidden = true;
  }

  /* ---------------- filter / search / sort ---------------- */

  var activeCategory = 'all';
  var chips = Array.prototype.slice.call(document.querySelectorAll('[data-filter]'));
  var cards = Array.prototype.slice.call(document.querySelectorAll('[data-product-card]'));

  function applyShelf() {
    var query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    var visible = 0;
    cards.forEach(function (card) {
      var matchesCategory = activeCategory === 'all' || card.getAttribute('data-category') === activeCategory;
      var matchesQuery = query.length === 0 || (card.getAttribute('data-name') || '').indexOf(query) !== -1;
      var show = matchesCategory && matchesQuery;
      card.hidden = !show;
      if (show) visible += 1;
    });
    if (shopEmpty) shopEmpty.hidden = visible > 0;
  }

  function applySort() {
    if (!sortSelect) return;
    var mode = sortSelect.value;
    var sorted = cards.slice().sort(function (a, b) {
      if (mode === 'price-asc' || mode === 'price-desc') {
        var priceA = parseFloat(a.getAttribute('data-price') || '0');
        var priceB = parseFloat(b.getAttribute('data-price') || '0');
        return mode === 'price-asc' ? priceA - priceB : priceB - priceA;
      }
      if (mode === 'name') {
        return (a.getAttribute('data-name') || '').localeCompare(b.getAttribute('data-name') || '');
      }
      var indexA = parseInt(a.getAttribute('data-index') || '0', 10);
      var indexB = parseInt(b.getAttribute('data-index') || '0', 10);
      return indexA - indexB;
    });
    sorted.forEach(function (card) { grid.appendChild(card); });
  }

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      activeCategory = chip.getAttribute('data-filter') || 'all';
      chips.forEach(function (other) {
        var active = other === chip;
        other.classList.toggle('is-active', active);
        other.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      applyShelf();
    });
  });
  if (searchInput) searchInput.addEventListener('input', applyShelf);
  if (sortSelect) sortSelect.addEventListener('change', applySort);

  /* ---------------- detail view switching ---------------- */

  function openDetail(productId) {
    if (!shopView || !productView) return;
    var target = document.getElementById('detail-' + productId);
    if (!target) return;
    productView.querySelectorAll('.product-detail').forEach(function (article) {
      article.hidden = article !== target;
    });
    var qty = target.querySelector('[data-qty]');
    if (qty) qty.textContent = '1';
    shopView.hidden = true;
    productView.hidden = false;
    window.scrollTo(0, 0);
  }

  function showShop() {
    if (!shopView || !productView) return;
    productView.hidden = true;
    shopView.hidden = false;
    window.scrollTo(0, 0);
  }

  document.addEventListener('click', function (event) {
    var origin = event.target;
    if (!origin || !origin.closest) return;

    var opener = origin.closest('[data-open]');
    if (opener) {
      var openId = opener.getAttribute('data-open');
      if (openId) openDetail(openId);
      return;
    }
    if (origin.closest('[data-back-to-shop]')) {
      showShop();
      return;
    }
    var step = origin.closest('[data-step]');
    if (step) {
      var detail = step.closest('.product-detail');
      var qtyEl = detail ? detail.querySelector('[data-qty]') : null;
      if (qtyEl) {
        var current = parseInt(qtyEl.textContent || '1', 10) || 1;
        var delta = parseInt(step.getAttribute('data-step') || '0', 10) || 0;
        qtyEl.textContent = String(Math.min(99, Math.max(1, current + delta)));
      }
      return;
    }
    var detailAdd = origin.closest('[data-add-detail]');
    if (detailAdd) {
      var detailId = detailAdd.getAttribute('data-add-detail');
      var host = detailAdd.closest('.product-detail');
      var qtyValue = host ? host.querySelector('[data-qty]') : null;
      var amount = qtyValue ? parseInt(qtyValue.textContent || '1', 10) || 1 : 1;
      if (detailId) addToCart(detailId, amount);
      return;
    }
    var quickAdd = origin.closest('[data-add]');
    if (quickAdd) {
      var addId = quickAdd.getAttribute('data-add');
      if (addId) addToCart(addId, 1);
    }
  });

  /* ---------------- drawer wiring ---------------- */

  var toggle = document.getElementById('cart-toggle');
  var closeButton = document.getElementById('cart-close');
  var checkoutButton = document.getElementById('cart-checkout');
  if (toggle) toggle.addEventListener('click', openDrawer);
  if (closeButton) closeButton.addEventListener('click', closeDrawer);
  if (backdrop) backdrop.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeDrawer();
  });

  if (checkoutButton) {
    checkoutButton.addEventListener('click', function () {
      cart = {};
      save();
      renderCart();
      if (statusEl) statusEl.textContent = 'Order placed — thank you!';
    });
  }

  renderCart();
})();`;
}
