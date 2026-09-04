// product.js — mahsulot batafsil sahifasi + buyurtma modal

const priceFmt = new Intl.NumberFormat('uz-UZ');

function getProductId() {
  const parts = window.location.pathname.split('/');
  return parseInt(parts[parts.length - 1], 10);
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
  const res = await fetch('/api/v1/products/' + id);
  if (!res.ok) {
    wrap.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><h3>Mahsulot topilmadi</h3><p><a href="/" class="btn btn-secondary" style="margin-top:12px">Katalogga qaytish</a></p></div>';
    return;
  }
  const json = await res.json();
  const p = json.data;
  currentProduct = p;
  document.title = p.nomi + ' — Qurilish Bazasi';

  const img = p.rasm_url || '/uploads/placeholder-default.svg';
  const disabled = p.holat === 'Tugagan' ? 'disabled' : '';

  wrap.innerHTML =
    '<div class="detail-img">' +
      '<img src="' + img + '" alt="' + p.nomi + '" onerror="this.src=\'/uploads/placeholder-default.svg\'">' +
    '</div>' +
    '<div class="detail-info" data-product-id="' + p.id + '" data-nomi="' + p.nomi + '" data-narx="' + p.narx + '" data-birlik="' + p.birlik + '" data-rasm="' + img + '" data-stock="' + p.ombordagi_soni + '">' +
      '<span class="detail-cat">' + p.kategoriya + '</span>' +
      '<h1>' + p.nomi + '</h1>' +
      '<div class="detail-price-row">' +
        '<span class="detail-price">' + priceFmt.format(p.narx) + ' so\'m</span>' +
        '<span class="detail-unit">/ ' + p.birlik + '</span>' +
        '<span class="badge ' + badgeClass(p.holat) + '">' + p.holat + '</span>' +
      '</div>' +
      '<p class="detail-desc">' + (p.tavsif || 'Tavsif kiritilmagan.') + '</p>' +
      '<div class="detail-meta">' +
        '<div><span class="label">Ombordagi qoldiq</span><span class="value">' + p.ombordagi_soni + ' ' + p.birlik + '</span></div>' +
        '<div><span class="label">Yangilangan</span><span class="value">' + new Date(p.oxirgi_yangilanish).toLocaleDateString('uz-UZ') + '</span></div>' +
      '</div>' +
      '<div class="detail-actions">' +
        '<button class="btn btn-primary" id="openOrderBtn" ' + disabled + '>' +
          (disabled ? 'Hozircha tugagan' : 'Buyurtma berish') +
        '</button>' +
        renderCartButton(p) +
      '</div>' +
    '</div>';

  if (!disabled) {
    document.getElementById('openOrderBtn').addEventListener('click', openModal);
  }
}

function openModal() {
  document.getElementById('modalProductName').textContent = currentProduct.nomi;
  document.getElementById('miqdor').max = currentProduct.ombordagi_soni;
  document.getElementById('orderModal').classList.add('open');
  document.getElementById('orderFormPanel').style.display = 'block';
  document.getElementById('orderSuccessPanel').style.display = 'none';
  const tel = document.getElementById('telefon');
  if (!tel.value) tel.value = '+998 ';
}
function closeModal() {
  document.getElementById('orderModal').classList.remove('open');
}

document.getElementById('closeModal').addEventListener('click', closeModal);
document.getElementById('orderModal').addEventListener('click', (e) => {
  if (e.target.id === 'orderModal') closeModal();
});
document.getElementById('closeSuccessBtn').addEventListener('click', closeModal);

if (typeof initPhoneMask === 'function') {
  initPhoneMask(document.getElementById('telefon'));
}

document.getElementById('orderForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('submitOrderBtn');
  const msg = document.getElementById('formMsg');
  msg.className = 'form-msg';
  btn.disabled = true;
  btn.textContent = 'Yuborilmoqda...';

  const telInput = document.getElementById('telefon');
  if (typeof isValidPhone === 'function' && !isValidPhone(telInput.value)) {
    msg.textContent = "Telefon raqamini to'liq kiriting (+998 XX XXX XX XX)";
    msg.classList.add('error', 'show');
    btn.disabled = false;
    btn.textContent = 'Buyurtma berish';
    return;
  }

  if (document.documentElement.classList.contains('store-closed')) {
    msg.textContent = "Do'kon hozir yopiq, buyurtma qabul qilinmayapti";
    msg.classList.add('error', 'show');
    btn.disabled = false;
    btn.textContent = 'Buyurtma berish';
    return;
  }

  const payload = {
    product_id: currentProduct.id,
    mijoz_ismi: document.getElementById('mijoz_ismi').value,
    telefon: telInput.value,
    izoh: document.getElementById('izoh').value || undefined,
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
      successSub.textContent = 'Buyurtmangiz qabul qilindi. Buyurtma raqami: #' + orderId;
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

// Sozlamalarni qo'llash
async function applySettings() {
  try {
    const res = await fetch('/api/v1/settings');
    const json = await res.json();
    if (!json.success) return;
    const s = json.data;
    const n = document.getElementById('storeName');
    if (n && s.dokon_nomi) n.textContent = s.dokon_nomi;
    const t = document.getElementById('storeTagline');
    if (t && s.qisqa_tavsif) t.textContent = s.qisqa_tavsif;
    const fn = document.getElementById('footerName');
    if (fn && s.dokon_nomi) fn.textContent = s.dokon_nomi;
    const mark = document.getElementById('brandMark');
    if (mark && s.logotip_url) mark.innerHTML = '<img src="' + s.logotip_url + '" alt="logo" style="width:100%;height:100%;object-fit:cover;border-radius:10px">';
    const fl = document.getElementById('footerLogo');
    if (fl && s.logotip_url) fl.innerHTML = '<img src="' + s.logotip_url + '" alt="logo" style="width:100%;height:100%;object-fit:cover;border-radius:10px">';
    const fp = document.getElementById('footerPhone');
    if (fp && s.telefon) { fp.textContent = s.telefon; fp.href = 'tel:' + s.telefon.replace(/[^0-9+]/g, ''); }
    const ft = document.getElementById('footerTelegram');
    if (ft && s.telegram) ft.textContent = s.telegram.startsWith('@') ? 'Telegram: ' + s.telegram : 'Telegram: @' + s.telegram.replace('@', '');
    const fa = document.getElementById('footerAddress');
    if (fa && s.manzil) { fa.textContent = s.manzil; fa.style.display = 'block'; }
    const fh = document.getElementById('footerHours');
    if (fh && s.ish_vaqti) { fh.textContent = s.ish_vaqti; fh.style.display = 'block'; }
    var theme = s.tema === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
    try { localStorage.setItem('store-theme', theme); } catch (e) {}
    if (s.accent) {
      document.documentElement.style.setProperty('--accent', s.accent);
      document.documentElement.style.setProperty('--accent-2', s.accent === '#0a84ff' ? '#4da3ff' : s.accent);
    }
    const b = document.getElementById('maintenanceBanner');
    if (b) b.style.display = s.dokon_yopiq ? 'block' : 'none';
    if (s.dokon_yopiq) document.documentElement.classList.add('store-closed');
    if (s.studio_url) {
      const back = document.getElementById('studioBackLink');
      const foot = document.getElementById('footerStudioLink');
      if (back) { back.href = s.studio_url; back.classList.remove('hidden'); }
      if (foot) { foot.href = s.studio_url; foot.classList.remove('hidden'); }
    }
    return s;
  } catch (e) { return null; }
}

applySettings();
loadProduct();
