const express = require('express');
const router = express.Router();
const db = require('../db');

// Mahsulotni tashqi API formatiga o'giradi
function toPublicProduct(p, req) {
  const host = `${req.protocol}://${req.get('host')}`;
  return {
    id: p.id,
    nomi: p.nomi,
    kategoriya: p.kategoriya,
    birlik: p.birlik,
    narx: p.narx,
    ombordagi_soni: p.ombordagi_soni,
    holat: db.computeHolat(p.ombordagi_soni),
    tavsif: p.tavsif,
    rasm_url: p.rasm ? (p.rasm.startsWith('http') ? p.rasm : host + p.rasm) : null,
    oxirgi_yangilanish: p.oxirgi_yangilanish
  };
}

// GET /api/v1/products?category=...&search=...
router.get('/products', (req, res) => {
  const data = db.read();
  let list = data.products;

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
    data: list.map(p => toPublicProduct(p, req))
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
  res.json({ success: true, data: toPublicProduct(product, req) });
});

// GET /api/v1/categories
router.get('/categories', (req, res) => {
  const data = db.read();
  const categories = [...new Set(data.products.map(p => p.kategoriya))].sort();
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

  const order = {
    id: data.nextOrderId++,
    product_id: product.id,
    mahsulot_nomi: product.nomi,
    mijoz_ismi: String(mijoz_ismi).trim(),
    telefon: String(telefon).trim(),
    miqdor: Number(miqdor),
    holat: 'Yangi',
    created_at: db.nowISO()
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
  const createdOrders = [];

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

    const order = {
      id: data.nextOrderId++,
      product_id: product.id,
      mahsulot_nomi: product.nomi,
      mijoz_ismi: String(mijoz_ismi).trim(),
      telefon: String(telefon).trim(),
      miqdor: miqdor,
      holat: 'Yangi',
      created_at: db.nowISO()
    };

    createdOrders.push(order);
  }

  // orders massiviga unshift qilamiz (eng yangilari tepada tursin)
  data.orders.unshift(...createdOrders);
  db.write(data);

  res.json({
    success: true,
    message: 'Buyurtmalaringiz qabul qilindi',
    data: {
      order_ids: createdOrders.map(o => o.id)
    }
  });
});

module.exports = router;
