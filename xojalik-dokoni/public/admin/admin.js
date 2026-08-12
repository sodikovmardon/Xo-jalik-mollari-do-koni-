// admin.js — admin panel logikasi

const priceFmt = new Intl.NumberFormat('uz-UZ');
let allProducts = [];
let allCategories = [];

// ---------- Yordamchi: kichik "saqlandi" bildirishnomasi ----------
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

// ============ AUTentifikatsiya ============
async function checkAuth() {
  const res = await fetch('/admin/api/me');
  const json = await res.json();
  if (json.loggedIn) {
    showAdmin();
  } else {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('adminScreen').style.display = 'none';
  }
}

function showAdmin() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminScreen').style.display = 'block';
  loadStats();
  loadProducts();
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('loginMsg');
  msg.className = 'form-msg';
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;
  try {
    const res = await fetch('/admin/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Xatolik');
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
  const res = await fetch('/admin/api/stats');
  const json = await res.json();
  const s = json.data;
  document.getElementById('statsRow').innerHTML = `
    <div class="stat-card"><div class="stat-label">Jami mahsulotlar</div><div class="stat-value">${s.jami_mahsulotlar}</div></div>
    <div class="stat-card warn"><div class="stat-label">Kam qolgan</div><div class="stat-value">${s.kam_qolgan}</div></div>
    <div class="stat-card danger"><div class="stat-label">Tugagan</div><div class="stat-value">${s.tugagan}</div></div>
    <div class="stat-card accent"><div class="stat-label">Yangi buyurtmalar</div><div class="stat-value">${s.yangi_buyurtmalar}</div></div>
  `;
  const badge = document.getElementById('ordersBadge');
  if (s.yangi_buyurtmalar > 0) {
    badge.style.display = 'inline-block';
    badge.textContent = s.yangi_buyurtmalar;
  } else {
    badge.style.display = 'none';
  }
}

// ============ Mahsulotlar jadvali ============
async function loadProducts() {
  const res = await fetch('/admin/api/products');
  const json = await res.json();
  allProducts = json.data;
  allCategories = [...new Set(allProducts.map(p => p.kategoriya))].sort();
  document.getElementById('categoryList').innerHTML = allCategories.map(c => `<option value="${c}">`).join('');
  renderProductsTable();
}

function renderProductsTable() {
  const term = document.getElementById('adminSearch').value.toLowerCase();
  let list = allProducts;
  if (term) {
    list = list.filter(p => p.nomi.toLowerCase().includes(term) || p.kategoriya.toLowerCase().includes(term));
  }
  const tbody = document.getElementById('productsTbody');
  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:var(--text-dim);padding:30px">Mahsulot topilmadi</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(p => `
    <tr data-id="${p.id}">
      <td><img class="row-thumb" src="${p.rasm || '/uploads/placeholder-default.svg'}" onerror="this.src='/uploads/placeholder-default.svg'"></td>
      <td style="min-width:160px">${p.nomi}</td>
      <td>${p.kategoriya}</td>
      <td>${p.birlik}</td>
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

  // Inline edit: narx / ombordagi_soni — blur bo'lganda saqlanadi
  tbody.querySelectorAll('.inline-input').forEach(inp => {
    inp.addEventListener('change', async (e) => {
      const tr = e.target.closest('tr');
      const id = tr.dataset.id;
      const field = e.target.dataset.field;
      const value = e.target.value;
      try {
        const res = await fetch(`/admin/api/products/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [field]: value })
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || 'Xatolik');
        showToast('Saqlandi ✓');
        const idx = allProducts.findIndex(p => p.id == id);
        allProducts[idx] = { ...json.data, holat: json.data.holat || allProducts[idx].holat };
        loadProducts();
        loadStats();
      } catch (err) {
        showToast(err.message, true);
      }
    });
  });

  tbody.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.closest('tr').dataset.id;
      const p = allProducts.find(x => x.id == id);
      openProductModal(p);
    });
  });
  tbody.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.closest('tr').dataset.id;
      const p = allProducts.find(x => x.id == id);
      if (!confirm(`"${p.nomi}" mahsulotini o'chirmoqchimisiz?`)) return;
      const res = await fetch(`/admin/api/products/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showToast("Mahsulot o'chirildi");
        loadProducts();
        loadStats();
      } else {
        showToast(json.error, true);
      }
    });
  });
}

document.getElementById('adminSearch').addEventListener('input', renderProductsTable);

// ============ Mahsulot qo'shish/tahrirlash modal ============
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
    if (product.rasm) {
      document.getElementById('rasmPreview').innerHTML = `<img src="${product.rasm}">`;
    }
  } else {
    document.getElementById('productModalTitle').textContent = 'Mahsulot qo\'shish';
    document.getElementById('p_id').value = '';
  }
  productModal.classList.add('open');
}
function closeProductModal() { productModal.classList.remove('open'); }

document.getElementById('addProductBtn').addEventListener('click', () => openProductModal());
document.getElementById('closeProductModal').addEventListener('click', closeProductModal);
productModal.addEventListener('click', (e) => { if (e.target.id === 'productModal') closeProductModal(); });

// Rasm yuklash — fayl tanlanganda darhol serverga yuboriladi
document.getElementById('p_rasm_file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append('image', file);
  document.getElementById('rasmPreview').innerHTML = `<span style="color:var(--text-dim);font-size:13px">Yuklanmoqda...</span>`;
  try {
    const res = await fetch('/admin/api/upload', { method: 'POST', body: formData });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Yuklashda xatolik');
    document.getElementById('p_rasm_url').value = json.url;
    document.getElementById('rasmPreview').innerHTML = `<img src="${json.url}">`;
  } catch (err) {
    document.getElementById('rasmPreview').innerHTML = `<span style="color:var(--danger);font-size:13px">${err.message}</span>`;
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
    const url = id ? `/admin/api/products/${id}` : '/admin/api/products';
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Xatolik yuz berdi');
    closeProductModal();
    showToast(id ? 'Mahsulot yangilandi ✓' : "Mahsulot qo'shildi ✓");
    loadProducts();
    loadStats();
  } catch (err) {
    msg.textContent = err.message;
    msg.classList.add('error', 'show');
  } finally {
    btn.disabled = false;
  }
});

// ============ Buyurtmalar ============
async function loadOrders() {
  const res = await fetch('/admin/api/orders');
  const json = await res.json();
  const tbody = document.getElementById('ordersTbody');
  if (json.data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-dim);padding:30px">Hozircha buyurtmalar yo'q</td></tr>`;
    return;
  }
  tbody.innerHTML = json.data.map(o => `
    <tr data-id="${o.id}">
      <td>#${o.id}</td>
      <td>${o.mahsulot_nomi}</td>
      <td>${o.mijoz_ismi}</td>
      <td><a href="tel:${o.telefon}" style="color:var(--accent-2)">${o.telefon}</a></td>
      <td>${o.miqdor}</td>
      <td style="white-space:nowrap;color:var(--text-dim);font-size:12px">${new Date(o.created_at).toLocaleString('uz-UZ')}</td>
      <td>
        <select class="inline-input order-status" data-id="${o.id}" style="border:1px solid var(--border)">
          <option ${o.holat === 'Yangi' ? 'selected' : ''}>Yangi</option>
          <option ${o.holat === "Bog'lanildi" ? 'selected' : ''}>Bog'lanildi</option>
          <option ${o.holat === 'Bajarildi' ? 'selected' : ''}>Bajarildi</option>
          <option ${o.holat === 'Bekor qilindi' ? 'selected' : ''}>Bekor qilindi</option>
        </select>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.order-status').forEach(sel => {
    sel.addEventListener('change', async (e) => {
      const id = e.target.dataset.id;
      await fetch(`/admin/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holat: e.target.value })
      });
      showToast('Holat yangilandi ✓');
      loadStats();
    });
  });
}

// ============ Tablar ============
document.querySelectorAll('.admin-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
    document.getElementById(`tab-${tab.dataset.tab}`).style.display = 'block';
    if (tab.dataset.tab === 'orders') loadOrders();
  });
});

// ============ Parolni o'zgartirish ============
document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('passwordMsg');
  msg.className = 'form-msg';
  const current_password = document.getElementById('currentPassword').value;
  const new_password = document.getElementById('newPassword').value;
  try {
    const res = await fetch('/admin/api/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password, new_password })
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Xatolik');
    msg.textContent = json.message;
    msg.classList.add('success', 'show');
    e.target.reset();
  } catch (err) {
    msg.textContent = err.message;
    msg.classList.add('error', 'show');
  }
});

checkAuth();
