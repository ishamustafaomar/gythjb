/**
 * Store template — product grid with gradient thumbnails plus a slide-in
 * cart drawer (add/remove/quantity/total) persisted to localStorage.
 */
import { createRng } from '@/lib/seeded';
import type { ProjectSpec } from '../../types';
import {
  baseCss,
  cssVariables,
  esc,
  gradientArtCss,
  renderFooter,
  renderHeader,
  slugify,
  toJsLiteral,
  type TemplateOutput,
} from '../shared';

const PRODUCT_POOL: ReadonlyArray<{ name: string; tag: string }> = [
  { name: 'Juniper candle', tag: 'Home' },
  { name: 'Linen tote', tag: 'Everyday' },
  { name: 'Ceramic pour-over set', tag: 'Kitchen' },
  { name: 'Walnut desk tray', tag: 'Desk' },
  { name: 'Wool throw blanket', tag: 'Home' },
  { name: 'Brass page marker', tag: 'Desk' },
  { name: 'Stoneware mug pair', tag: 'Kitchen' },
  { name: 'Botanical print', tag: 'Walls' },
  { name: 'Cedar soap bar', tag: 'Bath' },
  { name: 'Field notebook trio', tag: 'Desk' },
];

export function renderStore(spec: ProjectSpec): TemplateOutput {
  const rng = createRng(`${spec.seed}:store`);
  const productCount = rng.int(6, 8);
  const start = rng.int(0, PRODUCT_POOL.length - 1);
  const products: Array<{ id: string; name: string; tag: string; price: number }> = [];
  for (let i = 0; i < productCount; i++) {
    const item = PRODUCT_POOL[(start + i) % PRODUCT_POOL.length];
    if (!item) continue;
    products.push({
      id: `p-${i + 1}`,
      name: item.name,
      tag: item.tag,
      price: rng.int(12, 88) + (rng.chance(0.5) ? 0.5 : 0),
    });
  }
  const storageKey = `promptly:${slugify(spec.name)}:cart`;

  const productsHtml = products
    .map(
      (product, index) => `        <article class="product card">
          <div class="product-art art-${(index % 6) + 1}" aria-hidden="true"></div>
          <div class="product-info">
            <span class="badge">${esc(product.tag)}</span>
            <h3>${esc(product.name)}</h3>
            <div class="product-row">
              <span class="product-price">$${product.price.toFixed(2)}</span>
              <button class="btn btn-primary product-add" type="button" data-add="${product.id}">Add</button>
            </div>
          </div>
        </article>`,
    )
    .join('\n');

  const cartAction = `<button id="cart-toggle" class="btn btn-ghost" type="button" aria-haspopup="dialog">
        Cart <span id="cart-count" class="cart-count" aria-label="Items in cart">0</span>
      </button>`;

  const body = `${renderHeader(spec, [], cartAction)}
  <main class="app-main container">
    <div class="store-head">
      <h1>${esc(spec.name)}</h1>
      <p class="app-tagline">${esc(spec.tagline)}</p>
    </div>
    <div class="grid cols-3 product-grid" id="product-grid">
${productsHtml}
    </div>
  </main>
  <div id="cart-backdrop" class="cart-backdrop" hidden></div>
  <aside id="cart-drawer" class="cart-drawer" aria-label="Shopping cart" aria-hidden="true">
    <header class="cart-head">
      <h2>Your cart</h2>
      <button id="cart-close" class="btn btn-ghost" type="button" aria-label="Close cart">&times;</button>
    </header>
    <ul id="cart-items"></ul>
    <p id="cart-empty">Your cart is empty — the shelves are right there.</p>
    <footer class="cart-foot">
      <div class="cart-total-row">
        <span>Total</span>
        <strong id="cart-total">$0.00</strong>
      </div>
      <button id="cart-checkout" class="btn btn-primary" type="button">Checkout</button>
      <p id="cart-status" role="status"></p>
    </footer>
  </aside>
${renderFooter(spec)}`;

  const css = `${cssVariables(spec)}

${baseCss(spec)}

/* Storefront */
.store-head { margin-bottom: 1.75rem; }
.app-tagline { color: var(--muted); margin-top: 0.25rem; }
.product { overflow: hidden; display: grid; transition: transform 0.15s ease, box-shadow 0.15s ease; }
.product:hover { transform: translateY(-3px); box-shadow: var(--shadow); }
.product-art { aspect-ratio: 5 / 4; }
.product-info { padding: 1rem; display: grid; gap: 0.5rem; justify-items: start; }
.product-row { display: flex; align-items: center; justify-content: space-between; width: 100%; }
.product-price { font-weight: 700; }
.cart-count {
  display: inline-block; min-width: 1.4rem; text-align: center; margin-left: 0.35rem;
  background: var(--primary); color: var(--primary-contrast);
  border-radius: var(--radius-btn); font-size: 0.8rem; padding: 0.05rem 0.4rem;
}
.cart-backdrop { position: fixed; inset: 0; background: rgba(10, 12, 16, 0.45); z-index: 90; }
.cart-drawer {
  position: fixed; top: 0; right: 0; bottom: 0; width: min(24rem, 92vw); z-index: 100;
  background: var(--surface); border-left: 1px solid var(--border);
  display: flex; flex-direction: column; padding: 1.25rem;
  transform: translateX(100%); transition: transform 0.25s ease; visibility: hidden;
}
.cart-drawer.is-open { transform: translateX(0); visibility: visible; }
.cart-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
#cart-items { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.75rem; overflow-y: auto; flex: 1; }
.cart-item { display: grid; grid-template-columns: 1fr auto; gap: 0.35rem; border-bottom: 1px solid var(--border); padding-bottom: 0.75rem; }
.cart-item-name { font-weight: 600; font-size: 0.95rem; }
.cart-item-price { color: var(--muted); font-size: 0.85rem; }
.qty-controls { display: flex; align-items: center; gap: 0.45rem; grid-column: 1 / -1; }
.qty-btn {
  width: 1.6rem; height: 1.6rem; border: 1px solid var(--border); background: var(--surface);
  border-radius: var(--radius-sm); cursor: pointer; line-height: 1;
}
.qty-btn:hover { border-color: var(--primary); color: var(--primary); }
.cart-item-remove { border: 0; background: transparent; color: var(--muted); cursor: pointer; margin-left: auto; font-size: 0.85rem; }
.cart-item-remove:hover { color: #D64550; }
#cart-empty { color: var(--muted); text-align: center; padding-block: 2rem; }
.cart-foot { border-top: 1px solid var(--border); padding-top: 1rem; display: grid; gap: 0.75rem; }
.cart-total-row { display: flex; justify-content: space-between; font-size: 1.05rem; }
#cart-status { color: var(--primary); font-weight: 600; min-height: 1.3em; margin: 0; }

${gradientArtCss(spec)}`;

  const js = `(function () {
  'use strict';

  var STORAGE_KEY = '${storageKey}';
  var PRODUCTS = ${toJsLiteral(products)};

  var toggle = document.getElementById('cart-toggle');
  var drawer = document.getElementById('cart-drawer');
  var backdrop = document.getElementById('cart-backdrop');
  var closeButton = document.getElementById('cart-close');
  var itemsEl = document.getElementById('cart-items');
  var emptyEl = document.getElementById('cart-empty');
  var totalEl = document.getElementById('cart-total');
  var countEl = document.getElementById('cart-count');
  var checkoutButton = document.getElementById('cart-checkout');
  var statusEl = document.getElementById('cart-status');
  if (!drawer || !itemsEl) return;

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (error) { /* storage unavailable — run in memory */ }
    return {};
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch (error) { /* ignore */ }
  }

  var cart = load();

  function product(productId) {
    for (var i = 0; i < PRODUCTS.length; i++) {
      if (PRODUCTS[i].id === productId) return PRODUCTS[i];
    }
    return null;
  }

  function setQuantity(productId, quantity) {
    if (quantity <= 0) delete cart[productId];
    else cart[productId] = quantity;
    save();
    render();
  }

  function render() {
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
    if (checkoutButton) checkoutButton.disabled = ids.length === 0;
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

  document.querySelectorAll('[data-add]').forEach(function (button) {
    button.addEventListener('click', function () {
      var productId = button.getAttribute('data-add');
      if (!productId) return;
      setQuantity(productId, (cart[productId] || 0) + 1);
      openDrawer();
    });
  });

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
      render();
      if (statusEl) statusEl.textContent = 'Order placed — thank you!';
    });
  }

  render();
})();`;

  return { body, css, js };
}
