// nav-init.js — navbar behavior: search, mega-menu, favorites badge

(function() {
  var searchInput = document.getElementById('navSearchInput');
  var searchClear = document.getElementById('searchClear');
  var mobileSearchTrigger = document.getElementById('mobileSearchTrigger');
  var navSearchBox = document.getElementById('navSearchBox');
  var categoriesBtn = document.getElementById('categoriesBtn');
  var categoriesMega = document.getElementById('categoriesMega');

  // ============ Search: Enter → navigate ============
  if (searchInput) {
    searchInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        var q = searchInput.value.trim();
        if (!q) return;
        window.location.href = '/?search=' + encodeURIComponent(q);
      }
    });

    // Clear button
    if (searchClear) {
      searchInput.addEventListener('input', function() {
        searchClear.classList.toggle('show', searchInput.value.length > 0);
      });
      searchClear.addEventListener('click', function() {
        searchInput.value = '';
        searchClear.classList.remove('show');
        // On mobile, close the search overlay if empty
        if (navSearchBox && navSearchBox.classList.contains('mobile-open') && !searchInput.value) {
          navSearchBox.classList.remove('mobile-open');
        } else {
          searchInput.focus();
        }
      });
    }
  }

  // ============ Mobile search trigger ============
  if (mobileSearchTrigger && navSearchBox) {
    mobileSearchTrigger.addEventListener('click', function() {
      navSearchBox.classList.toggle('mobile-open');
      if (navSearchBox.classList.contains('mobile-open')) {
        searchInput.focus();
      }
    });
    // Close mobile search on Escape
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && navSearchBox.classList.contains('mobile-open')) {
        navSearchBox.classList.remove('mobile-open');
      }
    });
  }

  // ============ URL ?search= auto-fill ============
  var params = new URLSearchParams(window.location.search);
  var searchQ = params.get('search');
  if (searchQ && searchInput) {
    searchInput.value = searchQ;
    if (searchClear) searchClear.classList.add('show');
    // On index page, also fill the main search input
    var mainInput = document.getElementById('searchInput');
    if (mainInput) {
      mainInput.value = searchQ;
      mainInput.dispatchEvent(new Event('input'));
    }
  }

  // ============ Categories mega-menu toggle ============
  if (categoriesBtn && categoriesMega) {
    categoriesBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      var isOpen = categoriesMega.classList.toggle('open');
      categoriesMega.classList.toggle('is-open', isOpen);
    });

    // Close on outside click
    document.addEventListener('click', function(e) {
      if (!categoriesMega.contains(e.target) && !categoriesBtn.contains(e.target)) {
        categoriesMega.classList.remove('open');
        categoriesMega.classList.remove('is-open');
      }
    });

    // Close on Escape
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        categoriesMega.classList.remove('open');
        categoriesMega.classList.remove('is-open');
      }
    });
  }

  // ============ Favorites badge ============
  if (typeof updateFavBadge === 'function') {
    updateFavBadge();
  }
})();
