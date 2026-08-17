// app.js — mijozlar katalogi uchun logika

const priceFmt = new Intl.NumberFormat('uz-UZ');

function badgeClass(holat) {
  if (holat === 'Mavjud') return 'ok';
  if (holat === 'Kam qoldi') return 'warn';
  return 'danger';
}

function stockText(p) {
  if (p.holat === 'Tugagan') return 'Tugagan';
  return `${priceFmt.format(p.ombordagi_soni)} ${p.birlik} qoldiq`;
}

const CATEGORY_ICONS = {
  "G'isht": '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>',
  'Sement': '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M3 7l4-4h10l4 4"/></svg>',
  'Qum': '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 20h18L12 4z"/></svg>',
  'Asbob-uskunalar': '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4L15 12l-3-3 2.7-2.7z"/></svg>',
  'Elektr materiallari': '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M13 2 3 14h7l-1 8 10-12h-7z"/></svg>',
  "Bo'yoq materiallari": '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l4 14.5L13 19"/><path d="M2 2l7.6 7.6"/></svg>',
  'Santexnika': '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v20M4 12h16"/></svg>'
};

function categoryIcon(cat) {
  return CATEGORY_ICONS[cat] || '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>';
}

function stockDotClass(holat) {
  if (holat === 'Mavjud') return 'ok';
  if (holat === 'Kam qoldi') return 'warn';
  return 'out';
}

const CATEGORY_COLOR = {
  "G'isht": 'brick',
  'Sement': 'cement',
  'Qum': 'sand',
  'Asbob-uskunalar': 'tool',
  'Elektr materiallari': 'electric',
  "Bo'yoq materiallari": 'paint',
  'Santexnika': 'plumbing'
};
function catClass(cat) {
  return CATEGORY_COLOR[cat] || 'default';
}

function productCard(p) {
  const img = p.rasm_url || '/uploads/placeholder-default.svg';
  const disabled = p.holat === 'Tugagan' ? 'disabled' : '';
  return `
    <div class="card">
      <a class="card-img" href="/mahsulot/${p.id}">
        <span class="badge ${badgeClass(p.holat)}">${p.holat}</span>
        <img src="${img}" alt="${p.nomi}" loading="lazy" onerror="this.onerror=null;this.src='/uploads/placeholder-default.svg'">
      </a>
      <div class="card-body">
        <span class="card-cat cat-${catClass(p.kategoriya)}">${categoryIcon(p.kategoriya)}${p.kategoriya}</span>
        <a class="card-title" href="/mahsulot/${p.id}">${p.nomi}</a>
        <span class="card-stock ${stockDotClass(p.holat)}">${stockText(p)}</span>
        <div class="card-foot">
          <span class="card-price">${priceFmt.format(p.narx)} so'm</span>
          <span class="card-unit">/ ${p.birlik}</span>
        </div>
        <button class="btn btn-secondary btn-sm card-cart-btn" data-id="${p.id}" ${disabled} aria-label="Savatga qo'shish">
          <svg class="ic-cart" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          <svg class="ic-check" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          <span class="btn-label">${p.holat === 'Tugagan' ? 'Tugagan' : 'Savatga qo\'shish'}</span>
        </button>
      </div>
    </div>`;
}

let allProducts = [];
let activeCategory = '';
let searchTerm = '';
let searchTimer = null;

async function loadCategories() {
  const res = await fetch('/api/v1/categories');
  const json = await res.json();
  const wrap = document.getElementById('categoryPills');

  const counts = {};
  allProducts.forEach(p => {
    counts[p.kategoriya] = (counts[p.kategoriya] || 0) + 1;
  });

  const totalCount = allProducts.length;
  const allBtn = wrap.querySelector('.pill[data-category=""]');
  if (allBtn) allBtn.innerHTML = `${categoryIcon('')}<span>Barchasi (${totalCount})</span>`;

  json.data.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'pill';
    btn.dataset.category = cat;
    btn.innerHTML = `${categoryIcon(cat)}<span>${cat} (${counts[cat] || 0})</span>`;
    btn.addEventListener('click', () => {
      activeCategory = cat;
      document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      render();
    });
    wrap.appendChild(btn);
  });
  document.querySelector('.pill[data-category=""]').addEventListener('click', (e) => {
    activeCategory = '';
    document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    e.target.classList.add('active');
    render();
  });
}

function skeletonGrid() {
  return Array(8).fill(`
    <div class="card">
      <div class="card-img skeleton"></div>
      <div class="card-body">
        <div class="skeleton" style="height:12px;width:50%;border-radius:4px"></div>
        <div class="skeleton" style="height:16px;width:80%;border-radius:4px"></div>
        <div class="skeleton" style="height:18px;width:45%;border-radius:4px"></div>
        <div class="skeleton" style="height:38px;border-radius:8px;margin-top:12px"></div>
      </div>
    </div>`).join('');
}

async function loadProducts() {
  const grid = document.getElementById('productGrid');
  grid.innerHTML = skeletonGrid();
  const res = await fetch('/api/v1/products');
  const json = await res.json();
  allProducts = json.data;
  const statEl = document.getElementById('statProducts');
  if (statEl) statEl.textContent = `${priceFmt.format(allProducts.length)}+`;
  loadCategories();
  render();
}

function setResultCount(list) {
  const el = document.getElementById('resultCount');
  if (!el) return;
  const active = activeCategory || searchTerm;
  if (!active) {
    el.style.display = 'none';
    return;
  }
  el.style.display = 'block';
  el.textContent = `${priceFmt.format(list.length)} ta natija topildi`;
}

function render() {
  const grid = document.getElementById('productGrid');
  let list = allProducts;
  if (activeCategory) list = list.filter(p => p.kategoriya === activeCategory);
  if (searchTerm) {
    const s = searchTerm.toLowerCase();
    list = list.filter(p => p.nomi.toLowerCase().includes(s) || p.tavsif.toLowerCase().includes(s));
  }
  setResultCount(list);
  if (list.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        </div>
        <h3>Hech narsa topilmadi</h3>
        <p>Qidiruv shartlariga mos mahsulot topilmadi.</p>
        <button class="btn btn-secondary" id="clearFiltersBtn" style="margin-top:16px">Filtrni tozalash</button>
      </div>`;
    document.getElementById('clearFiltersBtn').addEventListener('click', clearFilters);
    return;
  }
  grid.innerHTML = list.map(productCard).join('');
}

function clearFilters() {
  searchTerm = '';
  activeCategory = '';
  const input = document.getElementById('searchInput');
  if (input) input.value = '';
  document.getElementById('searchClearBtn').classList.remove('show');
  document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
  const allBtn = document.querySelector('.pill[data-category=""]');
  if (allBtn) allBtn.classList.add('active');
  render();
}

function applySearch() {
  searchTerm = document.getElementById('searchInput').value.trim();
  render();
}

const searchInput = document.getElementById('searchInput');
searchInput.addEventListener('input', (e) => {
  const showClear = e.target.value.length > 0;
  document.getElementById('searchClearBtn').classList.toggle('show', showClear);
  clearTimeout(searchTimer);
  searchTimer = setTimeout(applySearch, 300);
});

document.getElementById('searchClearBtn').addEventListener('click', () => {
  searchInput.value = '';
  document.getElementById('searchClearBtn').classList.remove('show');
  applySearch();
  searchInput.focus();
});

document.getElementById('productGrid').addEventListener('click', (e) => {
  const btn = e.target.closest('.card-cart-btn');
  if (!btn || btn.disabled) return;
  const id = parseInt(btn.dataset.id, 10);
  const product = allProducts.find(p => p.id === id);
  if (product && typeof addToCart === 'function') {
    addToCart(product, 1);
    // satisfaying checkmark micro-animation
    btn.classList.add('added');
    setTimeout(() => btn.classList.remove('added'), 1400);
  }
});

// ============ SOZLAMALARNI QO'LLASH (do'kon nomi, tema, accent, yopiq banner) ============
async function loadSettings() {
  try {
    const res = await fetch('/api/v1/settings');
    const json = await res.json();
    if (!json.success) return null;
    const s = json.data;

    // Do'kon nomi / tavsif / logo
    const nameEl = document.getElementById('storeName');
    if (nameEl && s.dokon_nomi) nameEl.textContent = s.dokon_nomi;
    const taglineEl = document.getElementById('storeTagline');
    if (taglineEl && s.qisqa_tavsif) taglineEl.textContent = s.qisqa_tavsif;
    const fnEl = document.getElementById('footerName');
    if (fnEl && s.dokon_nomi) fnEl.textContent = s.dokon_nomi;

    // Logo (yuklangan bo'lsa gradient belgi o'rniga rasm)
    const mark = document.getElementById('brandMark');
    if (mark && s.logotip_url) mark.innerHTML = `<img src="${s.logotip_url}" alt="logo" style="width:100%;height:100%;object-fit:cover;border-radius:10px">`;
    const fl = document.getElementById('footerLogo');
    if (fl && s.logotip_url) fl.innerHTML = `<img src="${s.logotip_url}" alt="logo" style="width:100%;height:100%;object-fit:cover;border-radius:10px">`;

    // Bog'lanish ma'lumotlari
    const fp = document.getElementById('footerPhone');
    if (fp && s.telefon) {
      fp.textContent = s.telefon;
      fp.href = 'tel:' + s.telefon.replace(/[^0-9+]/g, '');
    }
    const ft = document.getElementById('footerTelegram');
    if (ft && s.telegram) ft.textContent = s.telegram.startsWith('@') ? 'Telegram: ' + s.telegram : 'Telegram: @' + s.telegram.replace('@', '');
    const fa = document.getElementById('footerAddress');
    if (fa && s.manzil) { fa.textContent = s.manzil; fa.style.display = 'block'; }
    const fh = document.getElementById('footerHours');
    if (fh && s.ish_vaqti) { fh.textContent = s.ish_vaqti; fh.style.display = 'block'; }

    // Tema (dark/light)
    document.documentElement.classList.toggle('theme-light', s.tema === 'light');

    // Accent rang
    if (s.accent) {
      document.documentElement.style.setProperty('--accent', s.accent);
      document.documentElement.style.setProperty('--accent-2', s.accent === '#0a84ff' ? '#4da3ff' : s.accent);
      document.documentElement.style.setProperty('--accent-glow', s.accent + '59');
    }

    // Do'kon yopiq banneri
    const banner = document.getElementById('maintenanceBanner');
    if (banner) banner.style.display = s.dokon_yopiq ? 'block' : 'none';

    // Buyurtma formasi: yopiq bo'lsa bloklash (cart.js orqali qo'shimcha tekshiriladi)
    if (s.dokon_yopiq) {
      document.documentElement.classList.add('store-closed');
    }

    // "Uy Loyiha Studio"ga qaytish havolalari
    if (s.studio_url) {
      const back = document.getElementById('studioBackLink');
      const foot = document.getElementById('footerStudioLink');
      if (back) { back.href = s.studio_url; back.classList.remove('hidden'); }
      if (foot) { foot.href = s.studio_url; foot.classList.remove('hidden'); }
    }
  return s;
  } catch (e) { /* sozlamalar ixtiyoriy */ }
}

// ---- Uy Loyiha Studio'dan kelgan mijoz uchun banner ----
function initStudioArrival(studioUrl) {
  const banner = document.getElementById('studioArrival');
  if (!banner) return;
  const STORE_KEY = 'qb_studio_arrival_dismissed';

  const viaQuery = new URLSearchParams(location.search).get('from') === 'studio';
  let viaReferrer = false;
  try {
    const ref = document.referrer && new URL(document.referrer).host;
    const studioHost = studioUrl && new URL(studioUrl).host;
    if (ref && studioHost && ref === studioHost) viaReferrer = true;
  } catch (e) {}

  if ((viaQuery || viaReferrer) && !localStorage.getItem(STORE_KEY)) {
    banner.classList.remove('hidden');
  }
  const closeBtn = document.getElementById('studioArrivalClose');
  if (closeBtn) closeBtn.addEventListener('click', () => {
    banner.classList.add('hidden');
    localStorage.setItem(STORE_KEY, '1');
  });
}

// Header scrolled state
function handleHeaderScroll() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  header.classList.toggle('scrolled', window.scrollY > 8);
}
window.addEventListener('scroll', handleHeaderScroll, { passive: true });
handleHeaderScroll();

loadSettings().then((s) => initStudioArrival(s && s.studio_url));
loadProducts();
