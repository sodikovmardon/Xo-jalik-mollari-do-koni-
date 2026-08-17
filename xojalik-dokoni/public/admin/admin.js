// admin.js — admin panel logikasi (Mahsulotlar + Buyurtmalar + Sozlamalar)

const priceFmt = new Intl.NumberFormat('uz-UZ');
const STATUS_COLORS = {
  'Yangi': 'accent',
  "Ko'rib chiqilmoqda": 'warn',
  'Tasdiqlangan': 'ok',
  'Yetkazilmoqda': 'purple',
  'Bajarildi': 'done',
  'Bekor qilindi': 'danger'
};
const ORDER_STATUSES = ['Yangi', "Ko'rib chiqilmoqda", 'Tasdiqlangan', 'Yetkazilmoqda', 'Bajarildi', 'Bekor qilindi'];

let allProducts = [];
let allCategories = [];
let orderState = { page: 1, limit: 20, hasMore: false, selected: new Set() };

// ---------- Yordamchilar ----------
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function fmtUZS(n) { return priceFmt.format(n || 0); }
function relTime(iso) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'hozirgina';
  if (min < 60) return `${min} daqiqa oldin`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} soat oldin`;
  const days = Math.floor(h / 24);
  return `${days} kun oldin`;
}

function showToast(text, isError = false) {
  let el = document.getElementById('saveToast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'saveToast';
    el.className = 'save-indicator';
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.classList.toggle('error', isError);
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2200);
}

function statusClass(holat) {
  if (holat === 'Mavjud') return 'ok';
  if (holat === 'Kam qoldi') return 'warn';
  return 'danger';
}
function orderStatusClass(holat) { return STATUS_COLORS[holat] || 'accent'; }

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok && !json.success) throw new Error(json.error || 'Xatolik yuz berdi');
  return json;
}

// ============ AUTH ============
async function checkAuth() {
  const json = await api('/admin/api/me');
  if (json.loggedIn) showAdmin();
  else {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('adminScreen').style.display = 'none';
  }
}

function showAdmin() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminScreen').style.display = 'block';
  loadStats();
  loadProducts();
  loadOrderStats();
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('loginMsg');
  msg.className = 'form-msg';
  try {
    await api('/admin/api/login', {
      method: 'POST',
      body: JSON.stringify({ username: document.getElementById('loginUsername').value, password: document.getElementById('loginPassword').value })
    });
    showAdmin();
  } catch (err) {
    msg.textContent = err.message;
    msg.classList.add('error', 'show');
  }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch('/admin/api/logout', { method: 'POST' });
  location.reload();
});

// ============ Statistika ============
async function loadStats() {
  const json = await api('/admin/api/stats');
  const s = json.data;
  document.getElementById('statsRow').innerHTML = `
    <div class="stat-card glass-surface"><div class="stat-label">Jami mahsulotlar</div><div class="stat-value">${s.jami_mahsulotlar}</div></div>
    <div class="stat-card warn glass-surface"><div class="stat-label">Kam qolgan</div><div class="stat-value">${s.kam_qolgan}</div></div>
    <div class="stat-card danger glass-surface"><div class="stat-label">Tugagan</div><div class="stat-value">${s.tugagan}</div></div>
    <div class="stat-card accent glass-surface"><div class="stat-label">Yangi buyurtmalar</div><div class="stat-value">${s.yangi_buyurtmalar}</div></div>
  `;
  const badge = document.getElementById('ordersBadge');
  if (s.yangi_buyurtmalar > 0) { badge.style.display = 'inline-block'; badge.textContent = s.yangi_buyurtmalar; }
  else badge.style.display = 'none';
}

// ============ Mahsulotlar jadvali ============
async function loadProducts() {
  const json = await api('/admin/api/products');
  allProducts = json.data;
  allCategories = [...new Set(allProducts.map(p => p.kategoriya))].sort();
  document.getElementById('categoryList').innerHTML = allCategories.map(c => `<option value="${esc(c)}">`).join('');
  renderProductsTable();
}

function renderProductsTable() {
  const term = document.getElementById('adminSearch').value.toLowerCase();
  let list = allProducts;
  if (term) list = list.filter(p => p.nomi.toLowerCase().includes(term) || p.kategoriya.toLowerCase().includes(term));
  const tbody = document.getElementById('productsTbody');
  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:var(--text-dim);padding:30px">Mahsulot topilmadi</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(p => `
    <tr data-id="${p.id}">
      <td><img class="row-thumb" src="${esc(p.rasm || '/uploads/placeholder-default.svg')}" onerror="this.src='/uploads/placeholder-default.svg'"></td>
      <td style="min-width:160px">${esc(p.nomi)}</td>
      <td>${esc(p.kategoriya)}</td>
      <td>${esc(p.birlik)}</td>
      <td><input class="inline-input price-input" type="number" min="0" value="${p.narx}" data-field="narx"></td>
      <td><input class="inline-input stock-input" type="number" min="0" value="${p.ombordagi_soni}" data-field="ombordagi_soni"></td>
      <td><span class="status-pill ${statusClass(p.holat)}">${p.holat}</span></td>
      <td style="color:var(--text-dim);font-size:12px;white-space:nowrap">${new Date(p.oxirgi_yangilanish).toLocaleString('uz-UZ')}</td>
      <td>
        <div class="row-actions">
          <button class="icon-btn edit-btn" title="Tahrirlash">✎</button>
          <button class="icon-btn danger delete-btn" title="O'chirish">🗑</button>
        </div>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.inline-input').forEach(inp => {
    inp.addEventListener('change', async (e) => {
      const id = e.target.closest('tr').dataset.id;
      try {
        await api(`/admin/api/products/${id}`, { method: 'PUT', body: JSON.stringify({ [e.target.dataset.field]: e.target.value }) });
        showToast('Saqlandi ✓');
        loadProducts();
        loadStats();
      } catch (err) { showToast(err.message, true); }
    });
  });
  tbody.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => openProductModal(allProducts.find(x => x.id == e.target.closest('tr').dataset.id)));
  });
  tbody.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const p = allProducts.find(x => x.id == e.target.closest('tr').dataset.id);
      if (!confirm(`"${p.nomi}" mahsulotini o'chirmoqchimisiz?`)) return;
      try {
        await api(`/admin/api/products/${p.id}`, { method: 'DELETE' });
        showToast("Mahsulot o'chirildi");
        loadProducts(); loadStats();
      } catch (err) { showToast(err.message, true); }
    });
  });
}

document.getElementById('adminSearch').addEventListener('input', renderProductsTable);

// ============ Mahsulot modal ============
const productModal = document.getElementById('productModal');
function openProductModal(product = null) {
  document.getElementById('productForm').reset();
  document.getElementById('rasmPreview').innerHTML = '';
  document.getElementById('p_rasm_url').value = '';
  if (product) {
    document.getElementById('productModalTitle').textContent = 'Mahsulotni tahrirlash';
    document.getElementById('p_id').value = product.id;
    document.getElementById('p_nomi').value = product.nomi;
    document.getElementById('p_kategoriya').value = product.kategoriya;
    document.getElementById('p_birlik').value = product.birlik;
    document.getElementById('p_narx').value = product.narx;
    document.getElementById('p_ombordagi_soni').value = product.ombordagi_soni;
    document.getElementById('p_tavsif').value = product.tavsif || '';
    document.getElementById('p_rasm_url').value = product.rasm || '';
    if (product.rasm) document.getElementById('rasmPreview').innerHTML = `<img src="${esc(product.rasm)}">`;
  } else {
    document.getElementById('productModalTitle').textContent = "Mahsulot qo'shish";
    document.getElementById('p_id').value = '';
  }
  productModal.classList.add('open');
}
function closeProductModal() { productModal.classList.remove('open'); }
document.getElementById('addProductBtn').addEventListener('click', () => openProductModal());
document.getElementById('closeProductModal').addEventListener('click', closeProductModal);
productModal.addEventListener('click', (e) => { if (e.target.id === 'productModal') closeProductModal(); });

document.getElementById('p_rasm_file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append('image', file);
  document.getElementById('rasmPreview').innerHTML = `<span style="color:var(--text-dim);font-size:13px">Yuklanmoqda...</span>`;
  try {
    const json = await fetch('/admin/api/upload', { method: 'POST', body: formData }).then(r => r.json());
    if (!json.success) throw new Error(json.error || 'Yuklashda xatolik');
    document.getElementById('p_rasm_url').value = json.url;
    document.getElementById('rasmPreview').innerHTML = `<img src="${json.url}">`;
  } catch (err) {
    document.getElementById('rasmPreview').innerHTML = `<span style="color:var(--danger);font-size:13px">${esc(err.message)}</span>`;
  }
});

document.getElementById('productForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('productFormMsg');
  msg.className = 'form-msg';
  const id = document.getElementById('p_id').value;
  const payload = {
    nomi: document.getElementById('p_nomi').value,
    kategoriya: document.getElementById('p_kategoriya').value,
    birlik: document.getElementById('p_birlik').value,
    narx: document.getElementById('p_narx').value,
    ombordagi_soni: document.getElementById('p_ombordagi_soni').value,
    rasm: document.getElementById('p_rasm_url').value,
    tavsif: document.getElementById('p_tavsif').value
  };
  const btn = document.getElementById('saveProductBtn');
  btn.disabled = true;
  try {
    await api(id ? `/admin/api/products/${id}` : '/admin/api/products', {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(payload)
    });
    closeProductModal();
    showToast(id ? 'Mahsulot yangilandi ✓' : "Mahsulot qo'shildi ✓");
    loadProducts(); loadStats();
  } catch (err) {
    msg.textContent = err.message;
    msg.classList.add('error', 'show');
  } finally { btn.disabled = false; }
});

// ============ BUYURTMALAR ============
async function loadOrderStats() {
  try {
    const json = await api('/admin/api/orders-stats');
    const s = json.data;
    document.getElementById('orderStatsRow').innerHTML = `
      <div class="stat-card accent glass-surface"><div class="stat-label">Bugungi buyurtmalar</div><div class="stat-value">${s.bugungi_buyurtmalar}</div></div>
      <div class="stat-card warn glass-surface"><div class="stat-label">Kutilayotgan</div><div class="stat-value">${s.kutilayotgan}</div></div>
      <div class="stat-card glass-surface"><div class="stat-label">Bu oy jami summa</div><div class="stat-value">${fmtUZS(s.oy_jami_summa)}</div></div>
      <div class="stat-card glass-surface"><div class="stat-label">O'rtacha buyurtma</div><div class="stat-value">${fmtUZS(s.ortacha_buyurtma)}</div></div>
    `;
  } catch (e) {}
}

function orderBadge(holat) {
  return `<span class="status-pill order-status-pill ${orderStatusClass(holat)}">${esc(holat)}</span>`;
}

function orderSummary(o) {
  const items = o.items || [];
  if (items.length === 1) return esc(items[0].nomi) + (items[0].miqdor > 1 ? ` × ${items[0].miqdor}` : '');
  return `${items.length} ta mahsulot · ${o.mahsulotlar_soni || 0} dona`;
}

async function loadOrders(reset = true) {
  const tbody = document.getElementById('ordersTbody');
  const skeleton = document.getElementById('ordersSkeleton');
  if (reset) { orderState.page = 1; orderState.selected.clear(); document.getElementById('orderSelectAll').checked = false; }
  skeleton.style.display = 'block';
  try {
    const params = new URLSearchParams({
      q: document.getElementById('orderSearch').value,
      holat: document.getElementById('orderStatusFilter').value,
      from: document.getElementById('orderFrom').value,
      to: document.getElementById('orderTo').value,
      sort: document.getElementById('orderSort').value,
      page: orderState.page,
      limit: orderState.limit
    });
    const json = await api(`/admin/api/orders?${params}`);
    orderState.hasMore = json.meta.hasMore;
    document.getElementById('ordersCount').textContent = `Jami: ${json.meta.total} ta buyurtma`;
    document.getElementById('loadMoreBtn').style.display = json.meta.hasMore ? 'inline-flex' : 'none';
    const rows = json.data.map(o => `
      <tr data-id="${o.id}" class="order-row ${orderState.selected.has(o.id) ? 'selected-row' : ''}">
        <td><input type="checkbox" class="order-check" data-id="${o.id}" ${orderState.selected.has(o.id) ? 'checked' : ''}></td>
        <td><b>#${o.id}</b></td>
        <td>${esc(o.mijoz_ismi)}</td>
        <td><a href="tel:${esc(o.telefon)}" style="color:var(--accent-2)">${esc(o.telefon)}</a></td>
        <td style="min-width:150px">${orderSummary(o)}</td>
        <td style="white-space:nowrap;font-weight:700">${fmtUZS(o.total)} so'm</td>
        <td style="white-space:nowrap;color:var(--text-dim);font-size:12px" title="${new Date(o.created_at).toLocaleString('uz-UZ')}">${new Date(o.created_at).toLocaleString('uz-UZ')}</td>
        <td>${orderBadge(o.holat)}</td>
        <td><button class="icon-btn view-order-btn" title="Batafsil">👁</button></td>
      </tr>
    `).join('');
    tbody.innerHTML = rows || `<tr><td colspan="9" style="text-align:center;color:var(--text-dim);padding:40px">
      <div style="font-size:34px;margin-bottom:10px">📦</div>Hali buyurtmalar yo'q — mijozlar buyurtma qoldirganda shu yerda ko'rinadi.</td></tr>`;

    if (json.meta.total === 0 && (document.getElementById('orderSearch').value || document.getElementById('orderStatusFilter').value !== 'Barchasi')) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:40px">
        <div style="font-size:34px;margin-bottom:10px">🔍</div>Hech narsa topilmadi<br>
        <button class="btn btn-secondary btn-sm" style="margin-top:14px" id="clearOrderFiltersBtn">Filtrni tozalash</button></td></tr>`;
      document.getElementById('clearOrderFiltersBtn').addEventListener('click', clearOrderFilters);
    }

    bindOrderEvents();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:var(--danger);padding:30px">${esc(err.message)}</td></tr>`;
  } finally {
    skeleton.style.display = 'none';
  }
}

function bindOrderEvents() {
  document.querySelectorAll('.order-check').forEach(cb => {
    cb.addEventListener('change', () => {
      const id = Number(cb.dataset.id);
      if (cb.checked) orderState.selected.add(id); else orderState.selected.delete(id);
      cb.closest('tr').classList.toggle('selected-row', cb.checked);
    });
  });
  document.querySelectorAll('.view-order-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.closest('tr').dataset.id;
      openOrderDetail(id);
    });
  });
  document.querySelectorAll('.order-row').forEach(tr => {
    tr.addEventListener('click', (e) => {
      if (e.target.closest('.order-check') || e.target.closest('a') || e.target.closest('.view-order-btn')) return;
      openOrderDetail(tr.dataset.id);
    });
  });
}

function clearOrderFilters() {
  document.getElementById('orderSearch').value = '';
  document.getElementById('orderStatusFilter').value = 'Barchasi';
  document.getElementById('orderFrom').value = '';
  document.getElementById('orderTo').value = '';
  loadOrders();
}

document.getElementById('orderSearch').addEventListener('input', debounce(() => loadOrders(), 300));
document.getElementById('orderStatusFilter').addEventListener('change', () => loadOrders());
document.getElementById('orderFrom').addEventListener('change', () => loadOrders());
document.getElementById('orderTo').addEventListener('change', () => loadOrders());
document.getElementById('orderSort').addEventListener('change', () => loadOrders());
document.getElementById('loadMoreBtn').addEventListener('click', () => { orderState.page++; loadOrders(false); });
document.getElementById('orderSelectAll').addEventListener('change', (e) => {
  document.querySelectorAll('.order-check').forEach(cb => cb.checked = e.target.checked);
  document.querySelectorAll('.order-check').forEach(cb => {
    const id = Number(cb.dataset.id);
    if (e.target.checked) orderState.selected.add(id); else orderState.selected.delete(id);
    cb.closest('tr').classList.toggle('selected-row', e.target.checked);
  });
});

document.getElementById('bulkApplyBtn').addEventListener('click', async () => {
  const holat = document.getElementById('bulkStatusSelect').value;
  const ids = [...orderState.selected];
  if (!holat || ids.length === 0) { showToast('Avval holat va kamida bitta buyurtma tanlang', true); return; }
  if (holat === 'Bekor qilindi' && !confirm(`${ids.length} ta buyurtmani bekor qilmoqchimisiz?`)) return;
  try {
    await api('/admin/api/orders/bulk-status', { method: 'POST', body: JSON.stringify({ ids, holat }) });
    showToast(`${ids.length} ta buyurtma yangilandi ✓`);
    loadOrders(); loadOrderStats(); loadStats();
  } catch (err) { showToast(err.message, true); }
});

function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

// ---------- Buyurtma tafsiloti ----------
const orderModal = document.getElementById('orderModal');

async function openOrderDetail(id) {
  try {
    const json = await api(`/admin/api/orders/${id}`);
    renderOrderDetail(json.data);
    orderModal.classList.add('open');
  } catch (err) { showToast(err.message, true); }
}

function renderOrderDetail(o) {
  const items = (o.items || []).map(it => `
    <div class="order-item">
      <img src="${esc(it.rasm || '/uploads/placeholder-default.svg')}" onerror="this.src='/uploads/placeholder-default.svg'">
      <div class="order-item-info">
        <b>${esc(it.nomi)}</b>
        <span>${it.miqdor} × ${fmtUZS(it.narx)} so'm/${esc(it.birlik)}</span>
      </div>
      <span class="order-item-total">${fmtUZS((it.narx || 0) * (it.miqdor || 0))} so'm</span>
    </div>`).join('');

  const statusOptions = ORDER_STATUSES.map(s =>
    `<option value="${s}" ${o.holat === s ? 'selected' : ''}>${s}</option>`
  ).join('');

  const notes = (o.notes || []).map(n => `
    <div class="activity-item">
      <div class="activity-text">${esc(n.text)}</div>
      <div class="activity-meta">${esc(n.admin || 'admin')} · ${new Date(n.created_at).toLocaleString('uz-UZ')}</div>
    </div>`).join('');

  const activity = (o.activity || []).map(a => `
    <div class="activity-item">
      <div class="activity-text">${esc(a)}</div>
    </div>`).join('');

  document.getElementById('orderDetailContent').innerHTML = `
    <div class="order-detail-head">
      <div>
        <h2 style="font-size:20px">Buyurtma #${o.id}</h2>
        <span class="order-date">${new Date(o.created_at).toLocaleString('uz-UZ')} · ${relTime(o.created_at)}</span>
      </div>
      ${orderBadge(o.holat)}
    </div>

    <div class="order-customer">
      <div class="order-customer-line"><b>${esc(o.mijoz_ismi)}</b></div>
      <div class="order-customer-line"><a href="tel:${esc(o.telefon)}" style="color:var(--accent-2)">${esc(o.telefon)}</a>
        <button class="icon-btn copy-phone-btn" title="Nusxalash">⧉</button></div>
      ${o.izoh ? `<div class="order-customer-line"><small style="color:var(--text-dim)">Izoh: ${esc(o.izoh)}</small></div>` : ''}
      ${o.bekor_sababi ? `<div class="order-customer-line"><small style="color:var(--danger)">Bekor qilish sababi: ${esc(o.bekor_sababi)}</small></div>` : ''}
    </div>

    <div class="order-actions-row">
      <a class="btn btn-secondary btn-sm" href="tel:${esc(o.telefon)}">📞 Mijozga qo'ng'iroq</a>
      <button class="btn btn-secondary btn-sm" id="printOrderBtn">🖨 PDF qilib chop etish</button>
    </div>

    <div class="order-status-change">
      <b>Holat</b>
      <div class="copy-row">
        <select id="orderStatusSelect" class="inline-input" style="border:1px solid var(--border)">${statusOptions}</select>
        <button class="btn btn-primary btn-sm" id="applyStatusBtn">Yangilash</button>
      </div>
      <div id="cancelReasonField" class="field" style="margin-top:10px;display:none">
        <label>Bekor qilish sababi (majburiy)</label>
        <input type="text" id="cancelReasonInput" placeholder="Masalan: mijoz bekor qildi">
      </div>
    </div>

    <div class="order-items-block">
      <b>Mahsulotlar</b>
      ${items || '<span style="color:var(--text-dim)">Ma\'lumot yo\'q</span>'}
      <div class="order-total">Jami: <span>${fmtUZS(o.total)} so'm</span></div>
    </div>

    <div class="order-notes-block">
      <b>Ichki eslatmalar</b>
      <div class="copy-row">
        <input type="text" id="noteInput" placeholder="Masalan: mijoz bilan bog'lanildi...">
        <button class="btn btn-secondary btn-sm" id="addNoteBtn">+ Qo'shish</button>
      </div>
      <div class="notes-list">${notes || '<span class="empty-hint">Hozircha eslatmalar yo\'q</span>'}</div>
    </div>

    <div class="order-notes-block">
      <b>Faoliyat tarixi</b>
      <div class="notes-list">${activity || '<span class="empty-hint">Tarix bo\'sh</span>'}</div>
    </div>
  `;

  // Status o'zgarishi
  const statusSel = document.getElementById('orderStatusSelect');
  const cancelField = document.getElementById('cancelReasonField');
  function toggleCancelField() { cancelField.style.display = statusSel.value === 'Bekor qilindi' ? 'block' : 'none'; }
  toggleCancelField();
  statusSel.addEventListener('change', toggleCancelField);

  document.getElementById('applyStatusBtn').addEventListener('click', async () => {
    const body = { holat: statusSel.value };
    if (statusSel.value === 'Bekor qilindi') {
      const sabab = document.getElementById('cancelReasonInput').value.trim();
      if (!sabab) { showToast('Bekor qilish sababini yozing', true); return; }
      if (!confirm('Buyurtmani bekor qilmoqchimisiz?')) return;
      body.sabab = sabab;
    }
    try {
      await api(`/admin/api/orders/${o.id}`, { method: 'PUT', body: JSON.stringify(body) });
      showToast('Holat yangilandi ✓');
      loadOrders(); loadOrderStats(); loadStats();
      openOrderDetail(o.id);
    } catch (err) { showToast(err.message, true); }
  });

  document.getElementById('addNoteBtn').addEventListener('click', async () => {
    const note = document.getElementById('noteInput').value.trim();
    if (!note) return;
    try {
      await api(`/admin/api/orders/${o.id}`, { method: 'PUT', body: JSON.stringify({ note }) });
      document.getElementById('noteInput').value = '';
      showToast('Eslatma qo\'shildi ✓');
      openOrderDetail(o.id);
    } catch (err) { showToast(err.message, true); }
  });

  document.querySelector('.copy-phone-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(o.telefon);
    showToast('Telefon nusxalandi ✓');
  });

  document.getElementById('printOrderBtn').addEventListener('click', () => printOrder(o));
}

function printOrder(o) {
  const items = (o.items || []).map(it =>
    `<tr><td>${esc(it.nomi)}</td><td>${it.miqdor}</td><td>${esc(it.birlik)}</td><td>${fmtUZS(it.narx)}</td><td>${fmtUZS((it.narx||0)*(it.miqdor||0))}</td></tr>`
  ).join('');
  const w = window.open('', '_blank', 'width=600,height=800');
  w.document.write(`
    <html><head><title>Buyurtma #${o.id}</title>
    <style>
      body{font-family:system-ui,sans-serif;padding:30px;color:#111}
      h1{font-size:20px;border-bottom:2px solid #111;padding-bottom:10px}
      .meta{margin:14px 0;line-height:1.7;font-size:14px}
      table{width:100%;border-collapse:collapse;font-size:13px;margin-top:14px}
      th,td{border:1px solid #ccc;padding:8px 10px;text-align:left}
      th{background:#f3f3f3}
      .total{margin-top:14px;font-size:16px;font-weight:700;text-align:right}
    </style></head><body>
    <h1>Buyurtma #${o.id}</h1>
    <div class="meta">
      <div><b>Mijoz:</b> ${esc(o.mijoz_ismi)}</div>
      <div><b>Telefon:</b> ${esc(o.telefon)}</div>
      ${o.izoh ? `<div><b>Izoh:</b> ${esc(o.izoh)}</div>` : ''}
      <div><b>Sana:</b> ${new Date(o.created_at).toLocaleString('uz-UZ')}</div>
      <div><b>Holat:</b> ${esc(o.holat)}</div>
    </div>
    <table><thead><tr><th>Mahsulot</th><th>Miqdor</th><th>Birlik</th><th>Narx</th><th>Summa</th></tr></thead>
    <tbody>${items}</tbody></table>
    <div class="total">Jami: ${fmtUZS(o.total)} so'm</div>
    </body></html>`);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 300);
}

document.getElementById('closeOrderModal').addEventListener('click', () => orderModal.classList.remove('open'));
orderModal.addEventListener('click', (e) => { if (e.target.id === 'orderModal') orderModal.classList.remove('open'); });

// ============ SOZLAMALAR ============
let settings = null;

async function loadSettings() {
  try {
    const json = await api('/admin/api/settings');
    settings = json.data;
    document.getElementById('set_dokon_nomi').value = settings.dokon_nomi || '';
    document.getElementById('set_qisqa_tavsif').value = settings.qisqa_tavsif || '';
    document.getElementById('set_telefon').value = settings.telefon || '';
    document.getElementById('set_telegram').value = settings.telegram || '';
    document.getElementById('set_manzil').value = settings.manzil || '';
    document.getElementById('set_ish_vaqti').value = settings.ish_vaqti || '';
    document.getElementById('set_studio_url').value = settings.studio_url || '';
    document.getElementById('set_logotip').value = settings.logotip || '';
    document.getElementById('set_yangi_buyurtma_xabar').checked = !!settings.yangi_buyurtma_xabar;
    document.getElementById('set_buyurtma_default_holat').value = settings.buyurtma_default_holat || 'Yangi';
    document.getElementById('set_yashir_tugagan').checked = !!settings.yashir_tugagan;
    document.getElementById('set_kam_qoldi_chegara').value = settings.kam_qoldi_chegara || 10;
    document.getElementById('set_api_base_url').value = settings.api_base_url || '';
    document.getElementById('set_api_kalit').value = settings.api_kalit || '';
    document.getElementById('set_api_ochiq').checked = settings.api_ochiq !== false;
    document.getElementById('set_tema').checked = settings.tema === 'light';
    document.getElementById('set_accent').value = settings.accent || '#0a84ff';
    document.getElementById('set_dokon_yopiq').checked = !!settings.dokon_yopiq;
    if (settings.logotip_url) {
      document.getElementById('logoPreview').innerHTML = `<img src="${esc(settings.logotip_url)}">`;
    }
    renderAccentSwatches(settings.accent || '#0a84ff');
    loadCategoriesManager();
    loadLoginHistory();
  } catch (err) { showToast(err.message, true); }
}

function renderAccentSwatches(current) {
  const colors = ['#0a84ff', '#ff375f', '#30d158', '#ff9f0a', '#bf5af2', '#ffd60a', '#5e5ce6'];
  document.getElementById('accentSwatches').innerHTML = colors.map(c =>
    `<button class="swatch ${c === current ? 'active' : ''}" data-color="${c}" style="--swatch:${c}"></button>`
  ).join('');
  document.querySelectorAll('.swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      document.querySelectorAll('.swatch').forEach(x => x.classList.remove('active'));
      sw.classList.add('active');
      document.getElementById('set_accent').value = sw.dataset.color;
    });
  });
}

// Do'kon ma'lumotlari
document.getElementById('saveStoreInfoBtn').addEventListener('click', async () => {
  const msg = document.getElementById('storeInfoMsg');
  msg.className = 'form-msg';
  try {
    await api('/admin/api/settings', { method: 'PUT', body: JSON.stringify({
      dokon_nomi: document.getElementById('set_dokon_nomi').value,
      qisqa_tavsif: document.getElementById('set_qisqa_tavsif').value,
      telefon: document.getElementById('set_telefon').value,
      telegram: document.getElementById('set_telegram').value,
      manzil: document.getElementById('set_manzil').value,
      ish_vaqti: document.getElementById('set_ish_vaqti').value,
      studio_url: document.getElementById('set_studio_url').value,
      logotip: document.getElementById('set_logotip').value
    }) });
    msg.textContent = "Ma'lumotlar saqlandi ✓";
    msg.classList.add('success', 'show');
    showToast("Ma'lumotlar saqlandi ✓");
  } catch (err) { msg.textContent = err.message; msg.classList.add('error', 'show'); }
});

document.getElementById('set_logotip_file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append('image', file);
  document.getElementById('logoPreview').innerHTML = '<span style="color:var(--text-dim);font-size:13px">Yuklanmoqda...</span>';
  try {
    const json = await fetch('/admin/api/upload', { method: 'POST', body: formData }).then(r => r.json());
    if (!json.success) throw new Error(json.error || 'Xatolik');
    document.getElementById('set_logotip').value = json.url;
    document.getElementById('logoPreview').innerHTML = `<img src="${json.url}">`;
    showToast('Logotip yuklandi ✓');
  } catch (err) { showToast(err.message, true); }
});

// Buyurtma sozlamalari
document.getElementById('saveOrderPrefsBtn').addEventListener('click', async () => {
  const msg = document.getElementById('orderPrefsMsg');
  msg.className = 'form-msg';
  try {
    await api('/admin/api/settings', { method: 'PUT', body: JSON.stringify({
      yangi_buyurtma_xabar: document.getElementById('set_yangi_buyurtma_xabar').checked,
      buyurtma_default_holat: document.getElementById('set_buyurtma_default_holat').value,
      yashir_tugagan: document.getElementById('set_yashir_tugagan').checked,
      kam_qoldi_chegara: document.getElementById('set_kam_qoldi_chegara').value
    }) });
    msg.textContent = "Saqlandi ✓";
    msg.classList.add('success', 'show');
    showToast('Saqlandi ✓');
  } catch (err) { msg.textContent = err.message; msg.classList.add('error', 'show'); }
});

// Ko'rinish
document.getElementById('saveAppearanceBtn').addEventListener('click', async () => {
  const msg = document.getElementById('appearanceMsg');
  msg.className = 'form-msg';
  try {
    await api('/admin/api/settings', { method: 'PUT', body: JSON.stringify({
      tema: document.getElementById('set_tema').checked ? 'light' : 'dark',
      accent: document.getElementById('set_accent').value
    }) });
    msg.textContent = "Saqlandi ✓";
    msg.classList.add('success', 'show');
    showToast('Saqlandi ✓');
  } catch (err) { msg.textContent = err.message; msg.classList.add('error', 'show'); }
});

// API
document.getElementById('copyApiUrlBtn').addEventListener('click', async () => {
  await navigator.clipboard.writeText(document.getElementById('set_api_base_url').value);
  showToast('Nusxalandi ✓');
});
document.getElementById('copyApiKeyBtn').addEventListener('click', async () => {
  await navigator.clipboard.writeText(document.getElementById('set_api_kalit').value);
  showToast('Nusxalandi ✓');
});
document.getElementById('regenerateKeyBtn').addEventListener('click', async () => {
  if (!confirm('Yangi kalit yaratilsinmi? Eski kalit bekor bo\'ladi.')) return;
  try {
    const json = await api('/admin/api/settings/regenerate-key', { method: 'POST' });
    document.getElementById('set_api_kalit').value = json.data;
    showToast('Yangi kalit yaratildi ✓');
  } catch (err) { showToast(err.message, true); }
});
document.getElementById('set_api_ochiq').addEventListener('change', async () => {
  try {
    await api('/admin/api/settings', { method: 'PUT', body: JSON.stringify({ api_ochiq: document.getElementById('set_api_ochiq').checked }) });
    showToast('API holati saqlandi ✓');
  } catch (err) { showToast(err.message, true); }
});

// Do'konni yopish (maintenance)
document.getElementById('set_dokon_yopiq').addEventListener('change', async (e) => {
  const on = e.target.checked;
  if (on && !confirm("Do'konni vaqtincha yopishni tasdiqlaysizmi? Saytda banner chiqadi va buyurtmalar qabul qilinmaydi.")) {
    e.target.checked = false;
    return;
  }
  try {
    await api('/admin/api/settings', { method: 'PUT', body: JSON.stringify({ dokon_yopiq: e.target.checked }) });
    showToast(e.target.checked ? "Do'kon yopildi" : "Do'kon ochildi");
  } catch (err) { showToast(err.message, true); }
});

// Eksport
document.getElementById('exportJsonBtn').addEventListener('click', () => window.location.href = '/admin/api/export?format=json');
document.getElementById('exportCsvBtn').addEventListener('click', () => window.location.href = '/admin/api/export?format=csv');

// Parol
document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('passwordMsg');
  msg.className = 'form-msg';
  try {
    const json = await api('/admin/api/change-password', {
      method: 'POST',
      body: JSON.stringify({
        current_password: document.getElementById('currentPassword').value,
        new_password: document.getElementById('newPassword').value
      })
    });
    msg.textContent = json.message;
    msg.classList.add('success', 'show');
    e.target.reset();
  } catch (err) {
    msg.textContent = err.message;
    msg.classList.add('error', 'show');
  }
});

// Login tarixi
async function loadLoginHistory() {
  try {
    const json = await api('/admin/api/login-history');
    const list = document.getElementById('loginHistoryList');
    list.innerHTML = (json.data || []).slice(0, 8).map(h => `
      <div class="history-item">
        <span>${new Date(h.sana).toLocaleString('uz-UZ')}</span>
        <span style="color:var(--text-dim);font-size:12px">IP: ${esc(h.ip || 'noma\'lum')}</span>
      </div>
    `).join('') || '<span style="color:var(--text-dim);font-size:13px">Ma\'lumot yo\'q</span>';
  } catch (e) {}
}

// ============ KATEGORIYA BOSHQARUVI ============
async function loadCategoriesManager() {
  const wrap = document.getElementById('categoryManager');
  try {
    const json = await api('/admin/api/categories');
    wrap.innerHTML = json.data.map(c => `
      <div class="cat-row" data-id="${c.id}">
        <span class="cat-drag">⠿</span>
        <input class="inline-input cat-name" value="${esc(c.nomi)}">
        <input class="inline-input cat-icon" value="${esc(c.ikonka)}" placeholder="ikonka" style="min-width:80px;width:80px">
        <span class="cat-count">${c.mahsulotlar_soni} ta</span>
        <div class="row-actions">
          <button class="icon-btn cat-save" title="Saqlash">💾</button>
          <button class="icon-btn danger cat-del" title="O'chirish">🗑</button>
        </div>
      </div>
    `).join('') + `
      <div class="cat-add">
        <input class="inline-input" id="newCatName" placeholder="Yangi kategoriya nomi">
        <button class="btn btn-secondary btn-sm" id="addCatBtn">+ Qo'shish</button>
      </div>`;

    wrap.querySelectorAll('.cat-save').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const row = e.target.closest('.cat-row');
        try {
          await api(`/admin/api/categories/${row.dataset.id}`, { method: 'PUT', body: JSON.stringify({
            nomi: row.querySelector('.cat-name').value,
            ikonka: row.querySelector('.cat-icon').value
          }) });
          showToast('Kategoriya saqlandi ✓');
          loadCategoriesManager();
        } catch (err) { showToast(err.message, true); }
      });
    });
    wrap.querySelectorAll('.cat-del').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const row = e.target.closest('.cat-row');
        const count = row.querySelector('.cat-count').textContent;
        if (!confirm(`Kategoriyani o'chirmoqchimisiz? (${count})`)) return;
        let moveTo = null;
        if (parseInt(count) > 0) {
          moveTo = prompt('Bu kategoriyada mahsulotlar bor. Qaysi kategoriyaga ko\'chirilsin?', '');
          if (!moveTo) { showToast('Ko\'chirish bekor qilindi', true); return; }
        }
        try {
          const url = moveTo ? `/admin/api/categories/${row.dataset.id}?moveTo=${encodeURIComponent(moveTo)}` : `/admin/api/categories/${row.dataset.id}`;
          await api(url, { method: 'DELETE' });
          showToast('Kategoriya o\'chirildi');
          loadCategoriesManager();
          loadProducts();
        } catch (err) { showToast(err.message, true); }
      });
    });
    document.getElementById('addCatBtn').addEventListener('click', async () => {
      const name = document.getElementById('newCatName').value.trim();
      if (!name) return;
      try {
        await api('/admin/api/categories', { method: 'POST', body: JSON.stringify({ nomi: name }) });
        showToast("Kategoriya qo'shildi ✓");
        loadCategoriesManager();
      } catch (err) { showToast(err.message, true); }
    });
  } catch (err) { wrap.innerHTML = `<span style="color:var(--danger)">${esc(err.message)}</span>`; }
}

// ============ Tablar ============
document.querySelectorAll('.admin-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
    document.getElementById(`tab-${tab.dataset.tab}`).style.display = 'block';
    if (tab.dataset.tab === 'orders') loadOrders();
    if (tab.dataset.tab === 'settings') loadSettings();
  });
});

checkAuth();
