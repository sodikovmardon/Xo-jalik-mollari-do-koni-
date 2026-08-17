// cart.js — Savat (Cart) boshqaruvi va yon panel UI logikasi

const cartPriceFmt = new Intl.NumberFormat('uz-UZ');

// O'zbek telefon raqami uchun input maskasi: +998 XX XXX XX XX
function initPhoneMask(input) {
  if (!input) return;
  input.addEventListener('input', () => {
    let digits = input.value.replace(/\D/g, '');
    if (digits.startsWith('998')) digits = digits.slice(3);
    if (digits.length > 9) digits = digits.slice(0, 9);

    let out = '+998';
    if (digits.length > 0) out += ' ' + digits.slice(0, 2);
    if (digits.length > 2) out += ' ' + digits.slice(2, 5);
    if (digits.length > 5) out += ' ' + digits.slice(5, 7);
    if (digits.length > 7) out += ' ' + digits.slice(7, 9);
    input.value = out;
  });
}

function isValidPhone(phone) {
  return /^\+998 \d{2} \d{3} \d{2} \d{2}$/.test(phone);
}

function getCart() {
  try {
    const raw = localStorage.getItem('qurilish_cart');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  try {
    localStorage.setItem('qurilish_cart', JSON.stringify(cart));
  } catch (e) {
    console.error('LocalStorage error:', e);
  }
  updateCartUI();
}

function addToCart(product, miqdor = 1) {
  if (!product || !product.id) return;
  const cart = getCart();
  const index = cart.findIndex(item => item.id === product.id);
  const qtyToAdd = Number(miqdor) || 1;

  if (index > -1) {
    cart[index].miqdor += qtyToAdd;
  } else {
    cart.push({
      id: product.id,
      nomi: product.nomi,
      narx: product.narx,
      birlik: product.birlik || 'dona',
      rasm_url: product.rasm_url || '/uploads/placeholder-default.svg',
      miqdor: qtyToAdd
    });
  }

  saveCart(cart);
  openCartDrawer();
}

function removeFromCart(productId) {
  let cart = getCart();
  cart = cart.filter(item => item.id !== productId);
  saveCart(cart);
}

function updateCartQuantity(productId, delta) {
  const cart = getCart();
  const item = cart.find(i => i.id === productId);
  if (item) {
    item.miqdor += delta;
    if (item.miqdor <= 0) {
      removeFromCart(productId);
      return;
    }
    saveCart(cart);
  }
}

function clearCart() {
  localStorage.removeItem('qurilish_cart');
  updateCartUI();
}

function getCartTotalCount() {
  const cart = getCart();
  return cart.reduce((sum, item) => sum + (item.miqdor || 0), 0);
}

function getCartTotalPrice() {
  const cart = getCart();
  return cart.reduce((sum, item) => sum + (item.narx * item.miqdor), 0);
}

function injectCartDrawerHTML() {
  if (document.getElementById('cartDrawerOverlay')) return;

  const html = `
  <div class="modal-overlay cart-drawer-overlay" id="cartDrawerOverlay">
    <div class="cart-drawer">
      <div class="cart-drawer-header">
        <h2>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
          Savat
        </h2>
        <button class="modal-close" id="closeCartBtn" title="Yopish">✕</button>
      </div>

      <!-- VIEW 1: Items List -->
      <div class="cart-drawer-view" id="cartListView">
        <div class="cart-items-wrap" id="cartItemsWrap"></div>
        <div class="cart-footer" id="cartFooter">
          <div class="cart-total-row">
            <span>Umumiy summa:</span>
            <span class="cart-total-price" id="cartTotalPrice">0 so'm</span>
          </div>
          <button class="btn btn-primary btn-block" id="cartCheckoutBtn">Buyurtma berish</button>
        </div>
      </div>

      <!-- VIEW 2: Order Form -->
      <div class="cart-drawer-view" id="cartFormView" style="display:none">
        <form id="cartCheckoutForm">
          <button type="button" class="back-link" id="cartBackToItemsBtn" style="margin-bottom:16px;cursor:pointer;border:none;background:none;padding:0;">← Savatga qaytish</button>
          <h3 style="margin-bottom:14px;font-size:18px">Buyurtma berish</h3>
          <p class="modal-sub" id="cartOrderSummary" style="margin-bottom:16px;color:var(--text-dim);font-size:13px"></p>

          <div class="field">
            <label>Ismingiz</label>
            <input type="text" id="cart_mijoz_ismi" required placeholder="Masalan: Aziz Karimov">
          </div>
          <div class="field">
            <label>Telefon raqamingiz</label>
            <input type="tel" id="cart_telefon" required placeholder="+998 90 123 45 67" inputmode="tel" autocomplete="tel">
          </div>
          <div class="field">
            <label>Izoh (ixtiyoriy)</label>
            <input type="text" id="cart_izoh" placeholder="Masalan: qurilish maydonchasiga yetkazish" autocomplete="off">
          </div>
          <button type="submit" class="btn btn-primary btn-block" id="cartSubmitBtn" style="margin-top:12px">Buyurtmani tasdiqlash</button>
          <div class="form-msg" id="cartFormMsg"></div>
        </form>
      </div>

      <!-- VIEW 3: Success -->
      <div class="cart-drawer-view" id="cartSuccessView" style="display:none">
        <div class="success-panel">
          <div class="check">✓</div>
          <h2>Buyurtmangiz qabul qilindi</h2>
          <p class="modal-sub" id="cartSuccessSub">Tez orada operatorlarimiz siz bilan bog'lanadi.</p>
          <button class="btn btn-secondary btn-block" id="closeCartSuccessBtn" style="margin-top:16px">Yopish</button>
        </div>
      </div>
    </div>
  </div>`;

  document.body.insertAdjacentHTML('beforeend', html);
  bindCartDrawerEvents();
}

function openCartDrawer() {
  injectCartDrawerHTML();
  updateCartUI();
  showCartView('cartListView');
  document.getElementById('cartDrawerOverlay').classList.add('open');
}

function closeCartDrawer() {
  const drawer = document.getElementById('cartDrawerOverlay');
  if (drawer) drawer.classList.remove('open');
}

function showCartView(viewId) {
  ['cartListView', 'cartFormView', 'cartSuccessView'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = (id === viewId) ? 'block' : 'none';
  });
}

let lastCartCount = -1;

function updateCartUI() {
  const count = getCartTotalCount();

  // Update all count badges on page
  document.querySelectorAll('.cart-badge, #cartCountBadge').forEach(el => {
    el.textContent = count;
    if (count > 0) {
      el.classList.add('has-items');
    } else {
      el.classList.remove('has-items');
    }
    // pop/bounce animation on change
    if (count !== lastCartCount) {
      el.classList.remove('bump');
      void el.offsetWidth; // restart animation
      el.classList.add('bump');
    }
  });
  lastCartCount = count;

  const wrap = document.getElementById('cartItemsWrap');
  if (!wrap) return;

  const cart = getCart();
  const totalPrice = getCartTotalPrice();

  document.getElementById('cartTotalPrice').textContent = `${cartPriceFmt.format(totalPrice)} so'm`;

  const checkoutBtn = document.getElementById('cartCheckoutBtn');
  if (checkoutBtn) checkoutBtn.disabled = (cart.length === 0);

  if (cart.length === 0) {
    wrap.innerHTML = `
      <div class="empty-state" style="padding:40px 10px">
        <h3>Savatingiz bo'sh</h3>
        <p>Katalogdan mahsulot tanlang va savatga qo'shing.</p>
      </div>`;
    return;
  }

  wrap.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img src="${item.rasm_url}" alt="${item.nomi}" class="cart-item-img" onerror="this.src='/uploads/placeholder-default.svg'">
      <div class="cart-item-info">
        <div class="cart-item-title">${item.nomi}</div>
        <div class="cart-item-price-unit">${cartPriceFmt.format(item.narx)} so'm / ${item.birlik}</div>
        <div class="cart-item-controls">
          <button class="qty-btn minus" data-action="minus" data-id="${item.id}">-</button>
          <span class="qty-val">${item.miqdor}</span>
          <button class="qty-btn plus" data-action="plus" data-id="${item.id}">+</button>
        </div>
      </div>
      <div class="cart-item-right">
        <div class="cart-item-total">${cartPriceFmt.format(item.narx * item.miqdor)} so'm</div>
        <button class="cart-item-del" data-action="delete" data-id="${item.id}" title="O'chirish">✕</button>
      </div>
    </div>
  `).join('');
}

function bindCartDrawerEvents() {
  const overlay = document.getElementById('cartDrawerOverlay');
  if (!overlay) return;

  document.getElementById('closeCartBtn').addEventListener('click', closeCartDrawer);
  overlay.addEventListener('click', (e) => {
    if (e.target.id === 'cartDrawerOverlay') closeCartDrawer();
  });
  document.getElementById('closeCartSuccessBtn').addEventListener('click', closeCartDrawer);

  initPhoneMask(document.getElementById('cart_telefon'));

  document.getElementById('cartCheckoutBtn').addEventListener('click', () => {
    const cart = getCart();
    if (cart.length === 0) return;
    const summary = `${cart.length} turdagi mahsulot (Jami: ${cartPriceFmt.format(getCartTotalPrice())} so'm)`;
    document.getElementById('cartOrderSummary').textContent = summary;
    const msg = document.getElementById('cartFormMsg');
    if (msg) msg.className = 'form-msg';
    showCartView('cartFormView');
  });

  document.getElementById('cartBackToItemsBtn').addEventListener('click', () => {
    showCartView('cartListView');
  });

  // Quantity +/- and Delete button click handlers inside cart
  document.getElementById('cartItemsWrap').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const id = parseInt(btn.dataset.id, 10);
    if (action === 'plus') updateCartQuantity(id, 1);
    if (action === 'minus') updateCartQuantity(id, -1);
    if (action === 'delete') removeFromCart(id);
  });

  // Bulk Checkout Form submit
  document.getElementById('cartCheckoutForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('cartSubmitBtn');
    const msg = document.getElementById('cartFormMsg');
    msg.className = 'form-msg';
    btn.disabled = true;
    btn.textContent = 'Yuborilmoqda...';

    const cart = getCart();
    if (cart.length === 0) {
      msg.textContent = "Savat bo'sh";
      msg.classList.add('error', 'show');
      btn.disabled = false;
      btn.textContent = 'Buyurtmani tasdiqlash';
      return;
    }

    if (document.documentElement.classList.contains('store-closed')) {
      msg.textContent = "Do'kon hozir yopiq, buyurtma qabul qilinmayapti";
      msg.classList.add('error', 'show');
      btn.disabled = false;
      btn.textContent = 'Buyurtmani tasdiqlash';
      return;
    }

    const telefonInput = document.getElementById('cart_telefon');
    if (!isValidPhone(telefonInput.value)) {
      msg.textContent = "Telefon raqamini to'liq kiriting (+998 XX XXX XX XX)";
      msg.classList.add('error', 'show');
      btn.disabled = false;
      btn.textContent = 'Buyurtmani tasdiqlash';
      return;
    }

    const payload = {
      mijoz_ismi: document.getElementById('cart_mijoz_ismi').value,
      telefon: document.getElementById('cart_telefon').value,
      izoh: document.getElementById('cart_izoh').value || undefined,
      items: cart.map(item => ({
        product_id: item.id,
        miqdor: item.miqdor
      }))
    };

    try {
      const res = await fetch('/api/v1/orders/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Xatolik yuz berdi');

      clearCart();

      const orderIds = json.data && json.data.order_ids ? json.data.order_ids : [];
      let orderText = '';
      if (orderIds.length === 1) {
        orderText = `Buyurtmangiz qabul qilindi. Buyurtma raqami: #${orderIds[0]}`;
      } else if (orderIds.length > 1) {
        orderText = `Buyurtmangiz qabul qilindi. Buyurtma raqamlari: #${orderIds.join(', #')}`;
      } else {
        orderText = `Buyurtmangiz qabul qilindi.`;
      }

      document.getElementById('cartSuccessSub').textContent = orderText;
      document.getElementById('cartCheckoutForm').reset();
      showCartView('cartSuccessView');
    } catch (err) {
      msg.textContent = err.message;
      msg.classList.add('error', 'show');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Buyurtmani tasdiqlash';
    }
  });
}

// Auto-inject and update badge on DOMReady
document.addEventListener('DOMContentLoaded', () => {
  injectCartDrawerHTML();
  updateCartUI();

  // Attach click handler to header cart buttons if present
  document.querySelectorAll('#openCartHeaderBtn, .cart-icon-btn').forEach(btn => {
    btn.addEventListener('click', openCartDrawer);
  });
});
