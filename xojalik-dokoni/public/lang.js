(function(){
  var LANG_KEY = 'store-lang';
  var currentLang = 'uz';
  try { currentLang = localStorage.getItem(LANG_KEY) || 'uz'; } catch(e){}

  var T = {
    // Utility bar
    'delivery': { uz: "Yetkazib berish: butun O'zbekiston bo'ylab", ru: "Доставка по всему Узбекистану" },
    'open':     { uz: "Ochiq", ru: "Открыто" },
    'closed':   { uz: "Yopiq", ru: "Закрыто" },

    // Nav
    'categories': { uz: "Kategoriyalar", ru: "Категории" },
    'favorites':  { uz: "Sevimli", ru: "Избранное" },
    'cart':       { uz: "Savat", ru: "Корзина" },

    // Search
    'search_placeholder': { uz: "Mahsulot qidirish, masalan: sement, g'isht...", ru: "Поиск товара, например: цемент, кирпич..." },

    // Hero
    'hero_eyebrow':    { uz: "Ombordagi qoldiq real vaqtda yangilanadi", ru: "Остатки на складе обновляются в реальном времени" },
    'hero_h1_pre':     { uz: "Qurilish uchun kerakli", ru: "Всё необходимое для строительства" },
    'hero_h1_span':    { uz: "hamma narsa", ru: "всё" },
    'hero_h1_post':    { uz: "bitta joyda.", ru: "в одном месте." },
    'hero_desc':       { uz: "G'isht, sement, qum, asbob-uskuna va elektr materiallari — narxi va ombordagi qoldig'i bilan. Mahsulotni tanlang va buyurtma so'rovini qoldiring, biz siz bilan bog'lanamiz.", ru: "Кирпич, цемент, песок, инструменты и электроматериалы — с ценами и остатками на складе. Выберите товар и оставьте заявку, мы свяжемся с вами." },
    'stat_products':   { uz: "mahsulot katalogda", ru: "товаров в каталоге" },
    'stat_categories': { uz: "kategoriya bo'limi", ru: "категорий" },
    'stat_hours_val':  { uz: "24 soat", ru: "24 часа" },
    'stat_hours':      { uz: "ichida javob", ru: "ответ в течение" },
    'btn_catalog':     { uz: "Katalogni ko'rish", ru: "Смотреть каталог" },
    'btn_calculator':  { uz: "Qurilish kalkulyatori", ru: "Строительный калькулятор" },
    'hero_cta_hint':   { uz: "Loyihangiz uchun material miqdorini hisoblab ko'ring →", ru: "Рассчитайте количество материалов для вашего проекта →" },

    // Trust
    'trust_payment':   { uz: "Naqd va nasiya to'lov", ru: "Наличные и рассрочка" },
    'trust_delivery':  { uz: "Yetkazib berish mavjud", ru: "Доставка доступна" },
    'trust_quality':   { uz: "Sifat kafolati", ru: "Гарантия качества" },

    // Features
    'features_title':  { uz: "Nega bizni tanlashadi?", ru: "Почему выбирают нас?" },
    'feat1_title':     { uz: "Tezkor yetkazib berish", ru: "Быстрая доставка" },
    'feat1_desc':      { uz: "Buyurtma 24 soat ichida yetkaziladi", ru: "Заказ доставляется в течение 24 часов" },
    'feat2_title':     { uz: "Hamyonbop narxlar", ru: "Доступные цены" },
    'feat2_desc':      { uz: "Bozordagi eng maqbul narxlar", ru: "Лучшие цены на рынке" },
    'feat3_title':     { uz: "Aniq ombor qoldig'i", ru: "Точные остатки на складе" },
    'feat3_desc':      { uz: "Real vaqtda qoldiq miqdorini tekshiring", ru: "Проверяйте остатки в реальном времени" },
    'feat4_title':     { uz: "Ishonchli hamkorlik", ru: "Надёжное сотрудничество" },
    'feat4_desc':      { uz: "3 yillik tajriba va ishonchli obro'", ru: "3 года опыта и надёжная репутация" },

    // Footer
    'footer_desc':     { uz: "Xo'jalik va qurilish mollari do'koni. Narxlar va ombordagi qoldiq har kuni yangilanadi.", ru: "Магазин хозтоваров и стройматериалов. Цены и остатки обновляются ежедневно." },
    'footer_desc_short': { uz: "Xo'jalik va qurilish mollari do'koni.", ru: "Магазин хозтоваров и стройматериалов." },
    'footer_contacts': { uz: "Bog'lanish", ru: "Контакты" },
    'footer_rights':   { uz: "© 2026 Qurilish Bazasi. Barcha huquqlar himoyalangan.", ru: "© 2026 Qurilish Bazasi. Все права защищены." },
    'footer_studio':   { uz: "Uy Loyiha Studio — hisob-kitobga qaytish", ru: "Uy Loyiha Studio — вернуться к расчётам" },

    // Product page
    'back_catalog':    { uz: "← Katalogga qaytish", ru: "← Вернуться в каталог" },
    'order_title':     { uz: "Buyurtma so'rovi", ru: "Оформление заказа" },
    'label_name':      { uz: "Ismingiz", ru: "Ваше имя" },
    'label_phone':     { uz: "Telefon raqamingiz", ru: "Номер телефона" },
    'label_qty':       { uz: "Miqdori", ru: "Количество" },
    'label_comment':   { uz: "Izoh (ixtiyoriy)", ru: "Комментарий (необязательно)" },
    'btn_order':       { uz: "Buyurtma berish", ru: "Оформить заказ" },
    'order_success':   { uz: "Buyurtmangiz qabul qilindi", ru: "Ваш заказ принят" },
    'order_success_sub': { uz: "Tez orada operatorlarimiz siz bilan bog'lanadi.", ru: "Наши операторы скоро свяжутся с вами." },
    'btn_close':       { uz: "Yopish", ru: "Закрыть" },
    'name_placeholder': { uz: "Masalan: Aziz Karimov", ru: "Например: Азиз Каримов" },
    'comment_placeholder': { uz: "Masalan: qurilish maydonchasiga yetkazish", ru: "Например: доставить на строительную площадку" },

    // Cart page
    'cart_title':      { uz: "Savatim", ru: "Моя корзина" },
    'cart_empty_h3':   { uz: "Savatingiz hozircha bo'sh", ru: "Ваша корзина пока пуста" },
    'cart_empty_p':    { uz: "Katalogdan mahsulot tanlang va savatga qo'shing.", ru: "Выберите товар из каталога и добавьте в корзину." },
    'btn_go_catalog':  { uz: "Katalogga o'tish", ru: "Перейти в каталог" },
    'cart_items_count': { uz: "Mahsulotlar soni:", ru: "Количество товаров:" },
    'pcs':             { uz: "dona", ru: "шт." },
    'cart_total':      { uz: "Jami summa:", ru: "Итого:" },
    'cart_unavailable': { uz: "mavjud emas", ru: "нет в наличии" },
    'delete_hint':     { uz: "O'chirish", ru: "Удалить" },
    'inc_hint':        { uz: "Ko'paytirish", ru: "Увеличить" },
    'dec_hint':        { uz: "Kamaytirish", ru: "Уменьшить" },
    'comment_ph_cart': { uz: "Yetkazish manzili yoki izoh", ru: "Адрес доставки или комментарий" },
    'sending':         { uz: "Yuborilmoqda...", ru: "Отправка..." },
    'cart_empty_err':  { uz: "Savat bo'sh", ru: "Корзина пуста" },
    'store_closed':    { uz: "Do'kon hozir yopiq", ru: "Магазин сейчас закрыт" },
    'phone_error':     { uz: "Telefon raqamini to'liq kiriting (+998 XX XXX XX XX)", ru: "Введите полный номер телефона (+998 XX XXX XX XX)" },
    'cart_success':    { uz: "Buyurtmangiz qabul qilindi!", ru: "Ваш заказ принят!" },

    // Favorites page
    'fav_title':       { uz: "Saqlanganlar", ru: "Избранное" },
    'fav_empty_h3':    { uz: "Hozircha sevimli mahsulotlaringiz yo'q", ru: "У вас пока нет избранных товаров" },
    'fav_empty_p':     { uz: "Katalogdan mahsulotlarni tanlang va yurak tugmasini bosing", ru: "Выберите товары из каталога и нажмите на сердечко" },
    'btn_add_cart':    { uz: "Savatga qo'shish", ru: "В корзину" },
    'btn_added':       { uz: "Qo'shildi!", ru: "Добавлено!" },
    'btn_remove_fav':  { uz: "Sevimlilardan o'chirish", ru: "Удалить из избранного" },

    // Misc
    'maintenance':     { uz: "Do'kon vaqtincha yopiq, tez orada qaytamiz", ru: "Магазин временно закрыт, скоро вернёмся" },
    'modal_stock':     { uz: "Omborda:", ru: "На складе:" },
    'modal_unit_price': { uz: "Narx:", ru: "Цена:" },
    'all':             { uz: "Barchasi", ru: "Все" },
    'out_of_stock':    { uz: "Hozircha tugagan", ru: "Временно нет в наличии" },
    'stock_label':     { uz: "Ombordagi qoldiq", ru: "Остаток на складе" },
    'updated_label':   { uz: "Yangilangan", ru: "Обновлено" }
  };

  function t(key) {
    if (!T[key]) return key;
    return T[key][currentLang] || T[key]['uz'] || key;
  }

  function applyLang() {
    // data-i18n: replace textContent
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      var key = el.getAttribute('data-i18n');
      var val = t(key);
      if (val) el.textContent = val;
    });
    // data-i18n-placeholder: replace placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
      var key = el.getAttribute('data-i18n-placeholder');
      var val = t(key);
      if (val) el.placeholder = val;
    });
    // Update lang buttons active state
    document.querySelectorAll('.lang-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === currentLang);
    });
    // Update html lang attr
    document.documentElement.lang = currentLang === 'ru' ? 'ru' : 'uz';
    // Update business hours text if present
    if (typeof updateBusinessHoursLang === 'function') updateBusinessHoursLang();
  }

  function setLang(lang) {
    currentLang = lang;
    try { localStorage.setItem(LANG_KEY, lang); } catch(e){}
    applyLang();
  }

  function getLang() { return currentLang; }

  // Expose globally
  window.__t = t;
  window.__lang = { set: setLang, get: getLang, apply: applyLang };
})();
