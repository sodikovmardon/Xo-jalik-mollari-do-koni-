const express = require('express');
const router = express.Router();
const db = require('../db');

// Mahsulotni tashqi API formatiga o'giradi
function toPublicProduct(p, req, data) {
  const host = `${req.protocol}://${req.get('host')}`;
  const threshold = data.settings ? data.settings.kam_qoldi_chegara : 10;
  return {
    id: p.id,
    nomi: p.nomi,
    kategoriya: p.kategoriya,
    birlik: p.birlik,
    narx: p.narx,
    ombordagi_soni: p.ombordagi_soni,
    holat: db.computeHolat(p.ombordagi_soni, threshold),
    tavsif: p.tavsif,
    rasm_url: p.rasm ? (p.rasm.startsWith('http') ? p.rasm : host + p.rasm) : null,
    oxirgi_yangilanish: p.oxirgi_yangilanish
  };
}

// GET /api/v1/settings — omma uchun xavfsiz sozlamalar
router.get('/settings', (req, res) => {
  const data = db.read();
  const host = `${req.protocol}://${req.get('host')}`;
  res.json({
    success: true,
    data: {
      dokon_nomi: data.settings.dokon_nomi,
      qisqa_tavsif: data.settings.qisqa_tavsif,
      telefon: data.settings.telefon,
      manzil: data.settings.manzil,
      ish_vaqti: data.settings.ish_vaqti,
      telegram: data.settings.telegram,
      logotip_url: data.settings.logotip
        ? (data.settings.logotip.startsWith('http') ? data.settings.logotip : host + data.settings.logotip)
        : null,
      kam_qoldi_chegara: data.settings.kam_qoldi_chegara,
      yashir_tugagan: data.settings.yashir_tugagan,
      dokon_yopiq: data.settings.dokon_yopiq,
      tema: data.settings.tema,
      accent: data.settings.accent,
      api_ochiq: data.settings.api_ochiq,
      studio_url: data.settings.studio_url || ''
    }
  });
});

// GET /api/v1/products?category=...&search=...
router.get('/products', (req, res) => {
  const data = db.read();
  let list = data.products;

  // Ombordagi qoldiq 0 bo'lganda yashirish yoqilgan bo'lsa
  if (data.settings.yashir_tugagan) {
    list = list.filter(p => p.ombordagi_soni > 0);
  }

  const category = req.query.category;
  const search = req.query.search;

  if (category) {
    const c = category.toLowerCase();
    list = list.filter(p => p.kategoriya.toLowerCase() === c);
  }
  if (search) {
    const s = search.toLowerCase();
    list = list.filter(p =>
      p.nomi.toLowerCase().includes(s) ||
      p.tavsif.toLowerCase().includes(s) ||
      p.kategoriya.toLowerCase().includes(s)
    );
  }

  res.json({
    success: true,
    count: list.length,
    data: list.map(p => toPublicProduct(p, req, data))
  });
});

// GET /api/v1/products/:id
router.get('/products/:id', (req, res) => {
  const data = db.read();
  const id = parseInt(req.params.id, 10);
  const product = data.products.find(p => p.id === id);
  if (!product) {
    return res.status(404).json({ success: false, error: 'Mahsulot topilmadi' });
  }
  if (data.settings.yashir_tugagan && product.ombordagi_soni <= 0) {
    return res.status(404).json({ success: false, error: 'Mahsulot topilmadi' });
  }
  res.json({ success: true, data: toPublicProduct(product, req, data) });
});

// GET /api/v1/categories — admin boshqaradigan tartiblangan ro'yxat
router.get('/categories', (req, res) => {
  const data = db.read();
  const categories = (data.categories || []).slice().sort((a, b) => a.tartib - b.tartib).map(c => c.nomi);
  res.json({ success: true, count: categories.length, data: categories });
});

// POST /api/v1/orders — mijoz buyurtma so'rovi qoldiradi
router.post('/orders', (req, res) => {
  const { product_id, mijoz_ismi, telefon, miqdor } = req.body;

  if (!product_id || !mijoz_ismi || !telefon || !miqdor) {
    return res.status(400).json({
      success: false,
      error: "product_id, mijoz_ismi, telefon va miqdor maydonlari majburiy"
    });
  }

  const data = db.read();
  const product = data.products.find(p => p.id === parseInt(product_id, 10));
  if (!product) {
    return res.status(404).json({ success: false, error: 'Mahsulot topilmadi' });
  }
  if (data.settings.dokon_yopiq) {
    return res.status(503).json({ success: false, error: "Do'kon vaqtincha yopiq, tez orada qaytamiz" });
  }

  const order = {
    id: data.nextOrderId++,
    product_id: product.id,
    mahsulot_nomi: product.nomi,
    items: [{
      product_id: product.id,
      nomi: product.nomi,
      miqdor: Number(miqdor),
      birlik: product.birlik,
      narx: product.narx,
      rasm: product.rasm
    }],
    mijoz_ismi: String(mijoz_ismi).trim(),
    telefon: String(telefon).trim(),
    izoh: req.body.izoh || undefined,
    miqdor: Number(miqdor),
    holat: data.settings.buyurtma_default_holat || 'Yangi',
    created_at: db.nowISO(),
    notes: [],
    activity: []
  };

  data.orders.unshift(order);
  db.write(data);

  res.json({
    success: true,
    message: 'Buyurtmangiz qabul qilindi',
    data: { order_id: order.id }
  });
});

// POST /api/v1/orders/bulk — savatdagi bir nechta mahsulotni bitta so'rovda yuborish
router.post('/orders/bulk', (req, res) => {
  const { mijoz_ismi, telefon, items } = req.body;

  if (!mijoz_ismi || !telefon || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      error: "mijoz_ismi, telefon va kamida bitta mahsulot (items) kiritilishi majburiy"
    });
  }

  const data = db.read();

  // Do'kon vaqtincha yopiq bo'lsa — yangi buyurtmalar qabul qilinmaydi
  if (data.settings.dokon_yopiq) {
    return res.status(503).json({
      success: false,
      error: "Do'kon vaqtincha yopiq, tez orada qaytamiz"
    });
  }

  const orderItems = [];
  for (const item of items) {
    const productId = parseInt(item.product_id, 10);
    const miqdor = Number(item.miqdor);

    if (!productId || !miqdor || miqdor <= 0) {
      return res.status(400).json({
        success: false,
        error: "Har bir mahsulot uchun product_id va miqdor to'g'ri kiritilishi shart"
      });
    }

    const product = data.products.find(p => p.id === productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: `ID ${productId} ga teng mahsulot topilmadi`
      });
    }

    orderItems.push({
      product_id: product.id,
      nomi: product.nomi,
      miqdor,
      birlik: product.birlik,
      narx: product.narx,
      rasm: product.rasm
    });
  }

  const order = {
    id: data.nextOrderId++,
    items: orderItems,
    mijoz_ismi: String(mijoz_ismi).trim(),
    telefon: String(telefon).trim(),
    izoh: req.body.izoh || undefined,
    holat: data.settings.buyurtma_default_holat || 'Yangi',
    created_at: db.nowISO(),
    notes: [],
    activity: []
  };

  data.orders.unshift(order);
  db.write(data);

  res.json({
    success: true,
    message: 'Buyurtmangiz qabul qilindi',
    data: { order_ids: [order.id] }
  });
});

module.exports = router;
