// cart.js — umumiy savat logikasi + stepper UI
// Barcha sahifalarga ulanadi (index, product, savat)

const CART_KEY = 'qurilish_cart';
const cartPriceFmt = new Intl.NumberFormat('uz-UZ');

// ---- localStorage ----
function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

function saveCart(cart) {
  try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {}
  updateCartBadge();
  // Custom event — boshqa sahifalar tinglay oladi
  window.dispatchEvent(new CustomEvent('cart-updated', { detail: { cart } }));
}

// ---- Cart operations ----
function addToCart(product, miqdor = 1) {
  if (!product || !product.id) return;
  const cart = getCart();
  const idx = cart.findIndex(i => i.id === product.id);
  const qty = Number(miqdor) || 1;
  if (idx > -1) {
    cart[idx].miqdor += qty;
  } else {
    cart.push({
      id: product.id,
      nomi: product.nomi,
      narx: product.narx,
      birlik: product.birlik || 'dona',
      rasm_url: product.rasm_url || '/uploads/placeholder-default.svg',
      ombordagi_soni: product.ombordagi_soni || 999,
      miqdor: qty
    });
  }
  saveCart(cart);
}

function removeFromCart(productId) {
  saveCart(getCart().filter(i => i.id !== productId));
}

function updateCartQuantity(productId, delta) {
  const cart = getCart();
  const item = cart.find(i => i.id === productId);
  if (!item) return;
  item.miqdor += delta;
  if (item.miqdor <= 0) {
    removeFromCart(productId);
    return;
  }
  saveCart(cart);
}

function setCartQuantity(productId, qty) {
  const cart = getCart();
  const item = cart.find(i => i.id === productId);
  if (!item) return;
  if (qty <= 0) { removeFromCart(productId); return; }
  item.miqdor = qty;
  saveCart(cart);
}

function clearCart() {
  localStorage.removeItem(CART_KEY);
  updateCartBadge();
  window.dispatchEvent(new CustomEvent('cart-updated', { detail: { cart: [] } }));
}

function getCartItem(productId) {
  return getCart().find(i => i.id === productId) || null;
}

function getCartTotalCount() {
  return getCart().reduce((s, i) => s + (i.miqdor || 0), 0);
}

function getCartTotalPrice() {
  return getCart().reduce((s, i) => s + (i.narx * i.miqdor), 0);
}

// ---- Badge ----
let _lastBadge = -1;
function updateCartBadge() {
  const count = getCartTotalCount();
  document.querySelectorAll('.cart-badge, #cartCountBadge').forEach(el => {
    el.textContent = count;
    el.classList.toggle('has-items', count > 0);
    if (count !== _lastBadge) {
      el.classList.remove('bump');
      void el.offsetWidth;
      el.classList.add('bump');
    }
  });
  _lastBadge = count;
}

// ---- Stepper HTML (kartada va product detail'da ishlatiladi) ----
function renderCartButton(product) {
  if (product.holat === 'Tugagan') {
    return `<button class="btn btn-secondary btn-sm card-cart-btn" disabled>Tugagan</button>`;
  }
  const item = getCartItem(product.id);
  if (item) {
    return `
      <div class="card-cart-stepper" data-product-id="${product.id}">
        <button class="stepper-btn stepper-minus" data-action="minus" data-id="${product.id}" aria-label="Kamaytirish">−</button>
        <span class="stepper-qty">${item.miqdor}</span>
        <button class="stepper-btn stepper-plus" data-action="plus" data-id="${product.id}" aria-label="Ko'paytirish"${item.miqdor >= product.ombordagi_soni ? ' disabled' : ''}>+</button>
      </div>`;
  }
  return `
    <button class="btn btn-secondary btn-sm card-cart-btn" data-action="add" data-id="${product.id}" aria-label="Savatga qo'shish">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
      Savatga qo'shish
    </button>`;
}

// ---- Stepper click handler (delegated) ----
function handleStepperClick(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();

  const action = btn.dataset.action;
  const id = parseInt(btn.dataset.id, 10);
  if (!id) return;

  const item = getCartItem(id);
  if (action === 'add') {
    // Mahsulot ma'lumotlarini DOM'dan olamiz (product obyekt kerak)
    // data- attributlaridan foydalanamiz
    const card = btn.closest('[data-product-id]');
    const product = {
      id,
      nomi: card?.dataset.nomi || '',
      narx: parseInt(card?.dataset.narx, 10) || 0,
      birlik: card?.dataset.birlik || 'dona',
      rasm_url: card?.dataset.rasm || '/uploads/placeholder-default.svg',
      ombordagi_soni: parseInt(card?.dataset.stock, 10) || 999
    };
    addToCart(product, 1);
    // Stepperni yangilash — kartani qayta chizmasdan
    refreshStepper(btn.closest('.card') || btn.closest('.detail-actions'), product);
  } else if (action === 'plus') {
    if (item) {
      const stock = parseInt(btn.closest('[data-product-id]')?.dataset.stock, 10) || 999;
      if (item.miqdor < stock) {
        updateCartQuantity(id, 1);
        refreshStepper(btn.closest('.card') || btn.closest('.detail-actions'), { id });
      }
    }
  } else if (action === 'minus') {
    updateCartQuantity(id, -1);
    const newItem = getCartItem(id);
    const container = btn.closest('.card') || btn.closest('.detail-actions');
    if (container) {
      const product = { id, ombordagi_soni: parseInt(container.closest('[data-product-id]')?.dataset.stock, 10) || 999 };
      refreshStepper(container, product);
    }
  }
}

function refreshStepper(container, product) {
  if (!container) return;
  const wrapper = container.querySelector('.card-cart-stepper, .card-cart-btn')?.parentElement;
  if (!wrapper) return;
  // Stepperni topib, yangisini qo'yamiz
  const old = container.querySelector('.card-cart-stepper, .card-cart-btn');
  if (old) {
    const temp = document.createElement('div');
    temp.innerHTML = renderCartButton(product);
    const newEl = temp.firstElementChild;
    old.replaceWith(newEl);
  }
}

// ---- Telefon maskasi ----
function initPhoneMask(input) {
  if (!input) return;
  input.addEventListener('input', () => {
    let d = input.value.replace(/\D/g, '');
    if (d.startsWith('998')) d = d.slice(3);
    if (d.length > 9) d = d.slice(0, 9);
    let out = '+998';
    if (d.length > 0) out += ' ' + d.slice(0, 2);
    if (d.length > 2) out += ' ' + d.slice(2, 5);
    if (d.length > 5) out += ' ' + d.slice(5, 7);
    if (d.length > 7) out += ' ' + d.slice(7, 9);
    input.value = out;
  });
}

function isValidPhone(phone) {
  return /^\+998 \d{2} \d{3} \d{2} \d{2}$/.test(phone);
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  updateCartBadge();

  // Stepper / add-to-cart clicks — delegated on grid and detail
  const grid = document.getElementById('productGrid');
  if (grid) grid.addEventListener('click', handleStepperClick);

  const detail = document.getElementById('detailWrap');
  if (detail) detail.addEventListener('click', handleStepperClick);
});
