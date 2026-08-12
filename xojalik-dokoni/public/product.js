// product.js — mahsulot batafsil sahifasi + buyurtma modal

const priceFmt = new Intl.NumberFormat('uz-UZ');

function getProductId() {
  const parts = window.location.pathname.split('/');
  return parts[parts.length - 1];
}

function badgeClass(holat) {
  if (holat === 'Mavjud') return 'ok';
  if (holat === 'Kam qoldi') return 'warn';
  return 'danger';
}

let currentProduct = null;

async function loadProduct() {
  const id = getProductId();
  const wrap = document.getElementById('detailWrap');
  const res = await fetch(`/api/v1/products/${id}`);
  if (!res.ok) {
    wrap.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><h3>Mahsulot topilmadi</h3><p><a href="/" class="btn btn-secondary" style="margin-top:12px">Katalogga qaytish</a></p></div>`;
    return;
  }
  const json = await res.json();
  const p = json.data;
  currentProduct = p;
  document.title = `${p.nomi} — Qurilish Bazasi`;

  const img = p.rasm_url || '/uploads/placeholder-default.svg';
  const disabled = p.holat === 'Tugagan' ? 'disabled' : '';

  wrap.innerHTML = `
    <div class="detail-img">
      <img src="${img}" alt="${p.nomi}" onerror="this.src='/uploads/placeholder-default.svg'">
    </div>
    <div class="detail-info">
      <span class="detail-cat">${p.kategoriya}</span>
      <h1>${p.nomi}</h1>
      <div class="detail-price-row">
        <span class="detail-price">${priceFmt.format(p.narx)} so'm</span>
        <span class="detail-unit">/ ${p.birlik}</span>
        <span class="badge ${badgeClass(p.holat)}">${p.holat}</span>
      </div>
      <p class="detail-desc">${p.tavsif || 'Tavsif kiritilmagan.'}</p>
      <div class="detail-meta">
        <div><span class="label">Ombordagi qoldiq</span><span class="value">${p.ombordagi_soni} ${p.birlik}</span></div>
        <div><span class="label">Yangilangan</span><span class="value">${new Date(p.oxirgi_yangilanish).toLocaleDateString('uz-UZ')}</span></div>
      </div>
      <div class="detail-actions">
        <button class="btn btn-primary" id="openOrderBtn" ${disabled}>
          ${disabled ? "Hozircha tugagan" : "Buyurtma berish"}
        </button>
        <button class="btn btn-secondary" id="addToCartBtn" ${disabled}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          Savatga qo'shish
        </button>
      </div>
    </div>
  `;

  if (!disabled) {
    document.getElementById('openOrderBtn').addEventListener('click', openModal);
    document.getElementById('addToCartBtn').addEventListener('click', () => {
      if (typeof addToCart === 'function' && currentProduct) {
        addToCart(currentProduct, 1);
      }
    });
  }
}

function openModal() {
  document.getElementById('modalProductName').textContent = currentProduct.nomi;
  document.getElementById('miqdor').max = currentProduct.ombordagi_soni;
  document.getElementById('orderModal').classList.add('open');
  document.getElementById('orderFormPanel').style.display = 'block';
  document.getElementById('orderSuccessPanel').style.display = 'none';
}
function closeModal() {
  document.getElementById('orderModal').classList.remove('open');
}

document.getElementById('closeModal').addEventListener('click', closeModal);
document.getElementById('orderModal').addEventListener('click', (e) => {
  if (e.target.id === 'orderModal') closeModal();
});
document.getElementById('closeSuccessBtn').addEventListener('click', closeModal);

document.getElementById('orderForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('submitOrderBtn');
  const msg = document.getElementById('formMsg');
  msg.className = 'form-msg';
  btn.disabled = true;
  btn.textContent = 'Yuborilmoqda...';

  const payload = {
    product_id: currentProduct.id,
    mijoz_ismi: document.getElementById('mijoz_ismi').value,
    telefon: document.getElementById('telefon').value,
    miqdor: document.getElementById('miqdor').value
  };

  try {
    const res = await fetch('/api/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Xatolik yuz berdi');

    const orderId = json.data && json.data.order_id ? json.data.order_id : '';
    const successSub = document.getElementById('singleOrderSuccessSub');
    if (successSub && orderId) {
      successSub.textContent = `Buyurtmangiz qabul qilindi. Buyurtma raqami: #${orderId}`;
    }

    document.getElementById('orderFormPanel').style.display = 'none';
    document.getElementById('orderSuccessPanel').style.display = 'block';
    document.getElementById('orderForm').reset();
  } catch (err) {
    msg.textContent = err.message;
    msg.classList.add('error', 'show');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Buyurtma berish';
  }
});

loadProduct();
