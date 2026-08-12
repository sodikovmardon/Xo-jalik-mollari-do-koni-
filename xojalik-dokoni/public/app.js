// app.js — mijozlar katalogi uchun logika

const priceFmt = new Intl.NumberFormat('uz-UZ');

function badgeClass(holat) {
  if (holat === 'Mavjud') return 'ok';
  if (holat === 'Kam qoldi') return 'warn';
  return 'danger';
}

function productCard(p) {
  const img = p.rasm_url || '/uploads/placeholder-default.svg';
  const disabled = p.holat === 'Tugagan' ? 'disabled' : '';
  return `
    <div class="card">
      <a class="card-img" href="/mahsulot/${p.id}">
        <span class="badge ${badgeClass(p.holat)}">${p.holat}</span>
        <img src="${img}" alt="${p.nomi}" loading="lazy" onerror="this.src='/uploads/placeholder-default.svg'">
      </a>
      <div class="card-body">
        <span class="card-cat">${p.kategoriya}</span>
        <a class="card-title" href="/mahsulot/${p.id}">${p.nomi}</a>
        <div class="card-foot">
          <span class="card-price">${priceFmt.format(p.narx)} so'm</span>
          <span class="card-unit">/ ${p.birlik}</span>
        </div>
        <button class="btn btn-secondary btn-sm card-cart-btn" data-id="${p.id}" ${disabled}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          ${p.holat === 'Tugagan' ? 'Tugagan' : 'Savatga qo\'shish'}
        </button>
      </div>
    </div>`;
}

let allProducts = [];
let activeCategory = '';
let searchTerm = '';

async function loadCategories() {
  const res = await fetch('/api/v1/categories');
  const json = await res.json();
  const wrap = document.getElementById('categoryPills');
  json.data.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'pill';
    btn.dataset.category = cat;
    btn.textContent = cat;
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

async function loadProducts() {
  const grid = document.getElementById('productGrid');
  grid.innerHTML = Array(8).fill('<div class="card"><div class="card-img skeleton"></div><div class="card-body"><div class="skeleton" style="height:12px;width:60%;border-radius:4px"></div></div></div>').join('');
  const res = await fetch('/api/v1/products');
  const json = await res.json();
  allProducts = json.data;
  render();
}

function render() {
  const grid = document.getElementById('productGrid');
  let list = allProducts;
  if (activeCategory) list = list.filter(p => p.kategoriya === activeCategory);
  if (searchTerm) {
    const s = searchTerm.toLowerCase();
    list = list.filter(p => p.nomi.toLowerCase().includes(s) || p.tavsif.toLowerCase().includes(s));
  }
  if (list.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><h3>Hech narsa topilmadi</h3><p>Boshqa kalit so'z yoki kategoriya bilan qidirib ko'ring.</p></div>`;
    return;
  }
  grid.innerHTML = list.map(productCard).join('');
}

document.getElementById('searchInput').addEventListener('input', (e) => {
  searchTerm = e.target.value;
  render();
});

document.getElementById('productGrid').addEventListener('click', (e) => {
  const btn = e.target.closest('.card-cart-btn');
  if (!btn || btn.disabled) return;
  const id = parseInt(btn.dataset.id, 10);
  const product = allProducts.find(p => p.id === id);
  if (product && typeof addToCart === 'function') {
    addToCart(product, 1);
  }
});

loadCategories();
loadProducts();
