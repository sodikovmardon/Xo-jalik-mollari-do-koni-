// favorites.js — umumiy sevimlilar logikasi
// Format: [product_id, product_id, ...] (array of numbers)
// localStorage'da product ID'lar saqlanadi

const FAV_KEY = 'favorites';

function getFavorites() {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter(id => typeof id === 'number');
  } catch (e) {
    return [];
  }
}

function saveFavorites(ids) {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(ids));
  } catch (e) {}
  updateFavBadge();
  window.dispatchEvent(new CustomEvent('favorites-updated'));
}

function toggleFavorite(productId) {
  if (!productId) return;
  const ids = getFavorites();
  const idx = ids.indexOf(productId);
  if (idx > -1) {
    ids.splice(idx, 1);
  } else {
    ids.push(productId);
  }
  saveFavorites(ids);
  return idx === -1; // returns true if added, false if removed
}

function isFavorite(productId) {
  return getFavorites().indexOf(productId) > -1;
}

function getFavoriteCount() {
  return getFavorites().length;
}

function updateFavBadge() {
  const count = getFavoriteCount();
  document.querySelectorAll('#favCountBadge, .fav-badge').forEach(el => {
    el.textContent = count;
    el.classList.toggle('has-items', count > 0);
  });
}

// ============ Heart button HTML ============
function renderHeartButton(productId) {
  const filled = isFavorite(productId);
  return `
    <button class="fav-heart-btn ${filled ? 'active' : ''}" data-action="fav" data-id="${productId}" title="${filled ? 'Sevimlilardan olib tashlash' : 'Sevimlilarga qo\'shish'}" aria-label="Sevimli">
      <svg class="heart-outline" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
      <svg class="heart-filled" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
    </button>`;
}

// ============ Favorites click handler (delegated) ============
function handleFavClick(e) {
  const btn = e.target.closest('[data-action="fav"]');
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();

  const id = parseInt(btn.dataset.id, 10);
  if (!id) return;

  const added = toggleFavorite(id);
  btn.classList.toggle('active', added);

  // Animation
  btn.classList.remove('fav-pop');
  void btn.offsetWidth;
  btn.classList.add('fav-pop');
}

// ============ Init ============
document.addEventListener('DOMContentLoaded', () => {
  updateFavBadge();
});
