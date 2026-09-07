// nav-init.js — navbar qidiruv kengayishi + sevimlilar badge

(function() {
  // ============ Search expand ============
  const searchBtn = document.getElementById('navSearchBtn');
  const searchExpand = document.getElementById('navSearchExpand');
  const searchInput = document.getElementById('navSearchInput');

  if (searchBtn && searchExpand && searchInput) {
    searchBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = searchExpand.classList.toggle('open');
      if (isOpen) {
        searchInput.focus();
      }
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = searchInput.value.trim();
        if (!q) return;
        // Index sahifasida bo'lsa — to'g'ridan-to'g'ri qidiruv
        if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
          const mainInput = document.getElementById('searchInput');
          if (mainInput) {
            mainInput.value = q;
            mainInput.dispatchEvent(new Event('input'));
            searchExpand.classList.remove('open');
            mainInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
          }
        }
        // Boshqa sahifa — indexga qidiruv bilan yo'naltirish
        window.location.href = '/?search=' + encodeURIComponent(q);
      }
    });

    // Tashqarini bosish — yopish
    document.addEventListener('click', (e) => {
      if (!searchExpand.contains(e.target) && !searchBtn.contains(e.target)) {
        searchExpand.classList.remove('open');
      }
    });

    // Escape — yopish
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        searchExpand.classList.remove('open');
        searchBtn.focus();
      }
    });
  }

  // ============ URL'dan qidiruvni avtomatik to'ldirish (faqat index) ============
  if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
    const params = new URLSearchParams(window.location.search);
    const searchQ = params.get('search');
    if (searchQ) {
      // DOMContentLoaded kutmasdan — searchInput hozir bo'lmasa keyinroq
      function fillSearch() {
        const mainInput = document.getElementById('searchInput');
        if (mainInput) {
          mainInput.value = searchQ;
          mainInput.dispatchEvent(new Event('input'));
        } else {
          requestAnimationFrame(fillSearch);
        }
      }
      fillSearch();
    }
  }

  // ============ Favorites badge init ============
  if (typeof updateFavBadge === 'function') {
    updateFavBadge();
  }
})();
