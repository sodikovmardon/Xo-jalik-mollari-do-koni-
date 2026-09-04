// cart.js — umumiy savat logikasi
// Format: [{ product_id: number, miqdor: number }]
// Narx/rasm/etc — API'dan yangilanadi, localStorage'da faqat ID + miqdor saqlanadi

const CART_KEY = 'cart';
const OLD_CART_KEY = 'qurilish_cart';
const fmt = new Intl.NumberFormat('uz-UZ');

// Migrate old key → new key
(function migrateCart() {
  try {
    var old = localStorage.getItem(OLD_CART_KEY);
    if (old) {
      var arr = JSON.parse(old);
      if (Array.isArray(arr) && arr.length > 0) {
        var migrated = arr.map(function(item) {
          return { product_id: item.id || item.product_id, miqdor: item.miqdor || 1 };
        }).filter(function(i) { return i.product_id; });
        localStorage.setItem(CART_KEY, JSON.stringify(migrated));
      }
      localStorage.removeItem(OLD_CART_KEY);
    }
  } catch (e) {}
})();

// ============ localStorage ============
function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter(i => i && typeof i.product_id === 'number' && typeof i.miqdor === 'number' && i.miqdor > 0);
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch (e) {}
  updateCartBadge();
  window.dispatchEvent(new CustomEvent('cart-updated', { detail: { cart } }));
}

// ============ Cart operations ============
function addToCart(productId, miqdor) {
  const qty = Math.max(1, Math.floor(Number(miqdor) || 1));
  if (!productId) return;
  const cart = getCart();
  const idx = cart.findIndex(i => i.product_id === productId);
  if (idx > -1) {
    cart[idx].miqdor += qty;
  } else {
    cart.push({ product_id: productId, miqdor: qty });
  }
  saveCart(cart);
}

function removeFromCart(productId) {
  saveCart(getCart().filter(i => i.product_id !== productId));
}

function updateQuantity(productId, newQty) {
  const qty = Math.floor(Number(newQty));
  if (qty <= 0) {
    removeFromCart(productId);
    return;
  }
  const cart = getCart();
  const item = cart.find(i => i.product_id === productId);
  if (!item) return;
  item.miqdor = qty;
  saveCart(cart);
}

function incrementQuantity(productId, delta) {
  const cart = getCart();
  const item = cart.find(i => i.product_id === productId);
  if (!item) return;
  item.miqdor += delta;
  if (item.miqdor <= 0) {
    removeFromCart(productId);
    return;
  }
  saveCart(cart);
}

function getCartCount() {
  return getCart().reduce((s, i) => s + i.miqdor, 0);
}

function getCartItem(productId) {
  return getCart().find(i => i.product_id === productId) || null;
}

function clearCart() {
  localStorage.removeItem(CART_KEY);
  updateCartBadge();
  window.dispatchEvent(new CustomEvent('cart-updated', { detail: { cart: [] } }));
}

// ============ Badge ============
let _lastBadge = -1;
function updateCartBadge() {
  const count = getCartCount();
  document.querySelectorAll('#cartCountBadge, .cart-badge').forEach(el => {
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

// ============ Stepper HTML ============
function renderCartButton(product) {
  if (!product) return '';
  if (product.holat === 'Tugagan') {
    return '<button class="btn btn-secondary btn-sm card-cart-btn" disabled>Tugagan</button>';
  }
  const item = getCartItem(product.id);
  if (item) {
    const atMax = product.ombordagi_soni != null && item.miqdor >= product.ombordagi_soni;
    return `
      <div class="card-cart-stepper" data-product-id="${product.id}">
        <button class="stepper-btn stepper-minus" data-action="minus" data-id="${product.id}" aria-label="Kamaytirish">\u2212</button>
        <span class="stepper-qty">${item.miqdor}</span>
        <button class="stepper-btn stepper-plus" data-action="plus" data-id="${product.id}" aria-label="Ko'paytirish"${atMax ? ' disabled' : ''}>+</button>
      </div>`;
  }
  return `
    <button class="btn btn-secondary btn-sm card-cart-btn" data-action="add" data-id="${product.id}" aria-label="Savatga qo'shish">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
      Savatga qo'shish
    </button>`;
}

// ============ Stepper click handler (delegated) ============
function handleStepperClick(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();

  const action = btn.dataset.action;
  const id = parseInt(btn.dataset.id, 10);
  if (!id) return;

  if (action === 'add') {
    addToCart(id, 1);
    const card = btn.closest('[data-product-id]');
    const product = card ? {
      id,
      nomi: card.dataset.nomi || '',
      narx: parseInt(card.dataset.narx, 10) || 0,
      birlik: card.dataset.birlik || 'dona',
      rasm_url: card.dataset.rasm || '/uploads/placeholder-default.svg',
      ombordagi_soni: parseInt(card.dataset.stock, 10) || 999,
      holat: 'Mavjud'
    } : { id };
    refreshStepper(btn.closest('.card') || btn.closest('.detail-actions') || btn.closest('.cart-item-row'), product);

  } else if (action === 'plus') {
    const card = btn.closest('[data-product-id]');
    const stock = parseInt(card?.dataset.stock, 10) || 999;
    const item = getCartItem(id);
    if (item && item.miqdor < stock) {
      incrementQuantity(id, 1);
      refreshStepper(btn.closest('.card') || btn.closest('.detail-actions') || btn.closest('.cart-item-row'), {
        id,
        ombordagi_soni: stock,
        holat: 'Mavjud'
      });
    }

  } else if (action === 'minus') {
    const item = getCartItem(id);
    if (!item) return;
    if (item.miqdor <= 1) {
      removeFromCart(id);
      const container = btn.closest('.card') || btn.closest('.detail-actions') || btn.closest('.cart-item-row');
      if (container) {
        refreshStepper(container, { id, holat: 'Mavjud' });
      }
    } else {
      incrementQuantity(id, -1);
      const card = btn.closest('[data-product-id]');
      const stock = parseInt(card?.dataset.stock, 10) || 999;
      refreshStepper(btn.closest('.card') || btn.closest('.detail-actions') || btn.closest('.cart-item-row'), {
        id,
        ombordagi_soni: stock,
        holat: 'Mavjud'
      });
    }
  }
}

function refreshStepper(container, product) {
  if (!container) return;
  const old = container.querySelector('.card-cart-stepper, .card-cart-btn');
  if (!old) return;
  const temp = document.createElement('div');
  temp.innerHTML = renderCartButton(product);
  const newEl = temp.firstElementChild;
  if (newEl) old.replaceWith(newEl);
}

// ============ Telefon maskasi ============
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

// ============ Init ============
document.addEventListener('DOMContentLoaded', () => {
  updateCartBadge();

  const grid = document.getElementById('productGrid');
  if (grid) grid.addEventListener('click', handleStepperClick);

  const detail = document.getElementById('detailWrap');
  if (detail) detail.addEventListener('click', handleStepperClick);
});
