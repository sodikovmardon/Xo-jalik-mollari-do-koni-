const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

// ---------- Login brute-force himoyasi (Rate Limiter) ----------
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 daqiqa
  max: 8,
  message: { success: false, error: "Juda ko'p urinish, birozdan keyin qayta urinib ko'ring" },
  standardHeaders: true,
  legacyHeaders: false
});

// ---------- Rasm yuklash sozlamalari ----------
const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const name = `mahsulot-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, name);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Faqat rasm fayllari qabul qilinadi'));
  }
});

// ---------- Yordamchi funksiyalar ----------
function fmtUZS(n) {
  return new Intl.NumberFormat('uz-UZ').format(n || 0);
}

// Buyurtma summasi va mahsulotlar soni (eski bitta-mahsulotli va yangi items'li formatlar uchun)
function orderTotal(o) {
  if (Array.isArray(o.items)) {
    return o.items.reduce((s, it) => s + (Number(it.narx) || 0) * (Number(it.miqdor) || 0), 0);
  }
  return (Number(o.narx) || 0) * (Number(o.miqdor) || 0);
}
function orderCount(o) {
  if (Array.isArray(o.items)) return o.items.reduce((s, it) => s + (Number(it.miqdor) || 0), 0);
  return Number(o.miqdor) || 1;
}
function orderItems(o) {
  if (Array.isArray(o.items)) return o.items;
  return [{
    product_id: o.product_id,
    nomi: o.mahsulot_nomi,
    miqdor: o.miqdor,
    birlik: o.birlik || 'dona',
    narx: o.narx || 0,
    rasm: o.rasm || null
  }];
}

// ---------- AUTH ----------
router.post('/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;
  const data = db.read();

  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Login va parolni kiriting' });
  }

  if (username !== data.admin.username || !bcrypt.compareSync(password, data.admin.passwordHash)) {
    return res.status(401).json({ success: false, error: 'Login yoki parol noto\'g\'ri' });
  }

  // Login tarixi
  const ip = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : (req.socket.remoteAddress || '');
  data.admin.login_history = data.admin.login_history || [];
  data.admin.login_history.unshift({
    sana: db.nowISO(),
    ip: ip || 'noma\'lum',
    user_agent: (req.headers['user-agent'] || '').slice(0, 160)
  });
  data.admin.login_history = data.admin.login_history.slice(0, 20);
  db.write(data);

  req.session.isAdmin = true;
  req.session.username = username;
  res.json({ success: true, message: 'Tizimga muvaffaqiyatli kirdingiz' });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

router.get('/me', (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.json({ success: true, loggedIn: true, username: req.session.username });
  }
  res.json({ success: true, loggedIn: false });
});

router.use(requireAdmin);

// ---------- STATISTIKA ----------
router.get('/stats', (req, res) => {
  const data = db.read();
  const total = data.products.length;
  const kamQoldi = data.products.filter(p => p.ombordagi_soni > 0 && p.ombordagi_soni <= data.settings.kam_qoldi_chegara).length;
  const tugagan = data.products.filter(p => p.ombordagi_soni <= 0).length;
  const yangiBuyurtmalar = data.orders.filter(o => o.holat === 'Yangi').length;
  res.json({
    success: true,
    data: {
      jami_mahsulotlar: total,
      kam_qolgan: kamQoldi,
      tugagan: tugagan,
      yangi_buyurtmalar: yangiBuyurtmalar,
      jami_buyurtmalar: data.orders.length
    }
  });
});

// ---------- MAHSULOTLAR (CRUD) ----------
router.get('/products', (req, res) => {
  const data = db.read();
  let list = data.products;
  const search = req.query.search;
  if (search) {
    const s = search.toLowerCase();
    list = list.filter(p => p.nomi.toLowerCase().includes(s) || p.kategoriya.toLowerCase().includes(s));
  }
  res.json({ success: true, data: list.map(p => ({ ...p, holat: db.computeHolat(p.ombordagi_soni, data.settings.kam_qoldi_chegara) })) });
});

router.post('/products', (req, res) => {
  const { nomi, kategoriya, birlik, narx, ombordagi_soni, rasm, tavsif } = req.body;
  if (!nomi || !kategoriya || !birlik || narx === undefined || ombordagi_soni === undefined) {
    return res.status(400).json({ success: false, error: 'Barcha majburiy maydonlarni to\'ldiring' });
  }
  const data = db.read();
  const product = {
    id: data.nextProductId++,
    nomi: String(nomi).trim(),
    kategoriya: String(kategoriya).trim(),
    birlik: String(birlik).trim(),
    narx: Number(narx),
    ombordagi_soni: Number(ombordagi_soni),
    rasm: rasm || null,
    tavsif: tavsif || '',
    oxirgi_yangilanish: db.nowISO()
  };
  data.products.push(product);
  db.write(data);
  res.json({ success: true, data: product });
});

router.put('/products/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const data = db.read();
  const product = data.products.find(p => p.id === id);
  if (!product) return res.status(404).json({ success: false, error: 'Mahsulot topilmadi' });

  const fields = ['nomi', 'kategoriya', 'birlik', 'narx', 'ombordagi_soni', 'rasm', 'tavsif'];
  let changed = false;
  fields.forEach(f => {
    if (req.body[f] !== undefined) {
      const val = (f === 'narx' || f === 'ombordagi_soni') ? Number(req.body[f]) : req.body[f];
      if (product[f] !== val) changed = true;
      product[f] = val;
    }
  });
  if (changed) product.oxirgi_yangilanish = db.nowISO();

  db.write(data);
  res.json({ success: true, data: product });
});

router.delete('/products/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const data = db.read();
  const idx = data.products.findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Mahsulot topilmadi' });
  data.products.splice(idx, 1);
  db.write(data);
  res.json({ success: true, message: "Mahsulot o'chirildi" });
});

// ---------- RASM YUKLASH ----------
router.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'Fayl yuklanmadi' });
  res.json({ success: true, url: `/uploads/${req.file.filename}` });
});

// ---------- BUYURTMALAR ----------
// Ro'yxat: qidirish, holat, sana oralig'i, sortlash, sahifalash
router.get('/orders', (req, res) => {
  const data = db.read();
  let list = data.orders.slice();

  const q = (req.query.q || '').toLowerCase();
  if (q) {
    list = list.filter(o =>
      String(o.id).includes(q) ||
      (o.mijoz_ismi || '').toLowerCase().includes(q) ||
      (o.telefon || '').toLowerCase().includes(q)
    );
  }
  const holat = req.query.holat;
  if (holat && holat !== 'Barchasi') list = list.filter(o => o.holat === holat);

  const from = req.query.from;
  const to = req.query.to;
  if (from) list = list.filter(o => new Date(o.created_at) >= new Date(from));
  if (to) list = list.filter(o => new Date(o.created_at) <= new Date(to + 'T23:59:59'));

  const sort = req.query.sort || 'yangi';
  if (sort === 'eski') list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  else if (sort === 'summa') list.sort((a, b) => orderTotal(b) - orderTotal(a));
  else list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);
  const start = (page - 1) * limit;
  const paged = list.slice(start, start + limit);

  res.json({
    success: true,
    data: paged.map(o => ({
      ...o,
      total: orderTotal(o),
      mahsulotlar_soni: orderCount(o),
      items: orderItems(o)
    })),
    meta: { total: list.length, page, limit, hasMore: start + limit < list.length }
  });
});

// Bitta buyurtma (batafsil)
router.get('/orders/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const data = db.read();
  const o = data.orders.find(x => x.id === id);
  if (!o) return res.status(404).json({ success: false, error: 'Buyurtma topilmadi' });
  res.json({ success: true, data: { ...o, total: orderTotal(o), items: orderItems(o) } });
});

// Holatni o'zgartirish + avtomatik log
router.put('/orders/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const data = db.read();
  const order = data.orders.find(o => o.id === id);
  if (!order) return res.status(404).json({ success: false, error: 'Buyurtma topilmadi' });

  const oldStatus = order.holat;
  if (req.body.holat && req.body.holat !== oldStatus) {
    if (!db.STATUSES.includes(req.body.holat)) {
      return res.status(400).json({ success: false, error: 'Noto\'g\'ri holat' });
    }
    if (req.body.holat === 'Bekor qilindi') {
      const sabab = String(req.body.sabab || '').trim();
      if (!sabab) {
        return res.status(400).json({ success: false, error: 'Bekor qilish sababini yozing' });
      }
      order.bekor_sababi = sabab;
    }
    order.holat = req.body.holat;
    order.activity = order.activity || [];
    const soat = new Date().toLocaleString('uz-UZ', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    const log = oldStatus === order.holat
      ? null
      : `Holat o'zgartirildi: ${oldStatus} → ${order.holat} — ${soat}`;
    if (log) order.activity.unshift(log);
  }

  // Ichki eslatma
  if (req.body.note) {
    const text = String(req.body.note).trim();
    if (text) {
      order.notes = order.notes || [];
      order.notes.unshift({
        text,
        created_at: db.nowISO(),
        admin: req.session.username || 'admin'
      });
    }
  }

  db.write(data);
  res.json({ success: true, data: { ...order, total: orderTotal(order) } });
});

// Ommaviy holat yangilash
router.post('/orders/bulk-status', (req, res) => {
  const { ids, holat } = req.body;
  if (!Array.isArray(ids) || ids.length === 0 || !holat) {
    return res.status(400).json({ success: false, error: 'ids va holat kerak' });
  }
  if (!db.STATUSES.includes(holat)) {
    return res.status(400).json({ success: false, error: 'Noto\'g\'ri holat' });
  }
  const data = db.read();
  let n = 0;
  data.orders.forEach(o => {
    if (ids.includes(o.id) && o.holat !== holat) {
      o.holat = holat;
      o.activity = o.activity || [];
      const soat = new Date().toLocaleString('uz-UZ', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
      o.activity.unshift(`Holat o'zgartirildi: ${o.holat} → ${holat} (ommaviy) — ${soat}`);
      n++;
    }
  });
  db.write(data);
  res.json({ success: true, message: `${n} ta buyurtma yangilandi` });
});

// Dashboard: bugungi, kutilayotgan, oy summasi, o'rtacha
router.get('/orders-stats', (req, res) => {
  const data = db.read();
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const bugungi = data.orders.filter(o => new Date(o.created_at) >= startToday).length;
  const kutilayotgan = data.orders.filter(o => o.holat === 'Yangi' || o.holat === "Ko'rib chiqilmoqda").length;
  const oySumma = data.orders
    .filter(o => new Date(o.created_at) >= startMonth)
    .reduce((s, o) => s + orderTotal(o), 0);
  const jamiSumma = data.orders.reduce((s, o) => s + orderTotal(o), 0);
  const ortacha = data.orders.length ? Math.round(jamiSumma / data.orders.length) : 0;

  res.json({
    success: true,
    data: {
      bugungi_buyurtmalar: bugungi,
      kutilayotgan,
      oy_jami_summa: oySumma,
      ortacha_buyurtma: ortacha,
      yangi_buyurtmalar: data.orders.filter(o => o.holat === 'Yangi').length
    }
  });
});

// ---------- SOZLAMALAR ----------
router.get('/settings', (req, res) => {
  const data = db.read();
  const host = `${req.protocol}://${req.get('host')}`;
  res.json({
    success: true,
    data: {
      ...data.settings,
      logotip_url: data.settings.logotip
        ? (data.settings.logotip.startsWith('http') ? data.settings.logotip : host + data.settings.logotip)
        : null,
      api_base_url: host + '/api/v1',
      username: data.admin.username
    }
  });
});

router.put('/settings', (req, res) => {
  const data = db.read();
  const allowed = [
    'dokon_nomi', 'qisqa_tavsif', 'logotip', 'telefon', 'manzil', 'ish_vaqti', 'telegram',
    'yangi_buyurtma_xabar', 'buyurtma_default_holat', 'yashir_tugagan', 'kam_qoldi_chegara',
    'api_ochiq', 'tema', 'accent', 'dokon_yopiq', 'studio_url'
  ];
  allowed.forEach(k => {
    if (req.body[k] !== undefined) data.settings[k] = req.body[k];
  });
  data.settings.kam_qoldi_chegara = Math.max(1, Number(data.settings.kam_qoldi_chegara) || 10);
  db.write(data);
  res.json({ success: true, message: 'Ma\'lumotlar saqlandi', data: data.settings });
});

// ---------- KATEGORIYALAR ----------
router.get('/categories', (req, res) => {
  const data = db.read();
  const list = data.categories.slice().sort((a, b) => a.tartib - b.tartib);
  res.json({
    success: true,
    data: list.map(c => ({
      ...c,
      mahsulotlar_soni: data.products.filter(p => p.kategoriya === c.nomi).length
    }))
  });
});

router.post('/categories', (req, res) => {
  const { nomi, ikonka } = req.body;
  if (!nomi || !String(nomi).trim()) return res.status(400).json({ success: false, error: 'Kategoriya nomini kiriting' });
  const data = db.read();
  const name = String(nomi).trim();
  if (data.categories.some(c => c.nomi.toLowerCase() === name.toLowerCase())) {
    return res.status(400).json({ success: false, error: 'Bunday kategoriya allaqachon mavjud' });
  }
  const cat = {
    id: Math.max(0, ...data.categories.map(c => c.id)) + 1,
    nomi: name,
    ikonka: ikonka || 'default',
    tartib: data.categories.length + 1
  };
  data.categories.push(cat);
  db.write(data);
  res.json({ success: true, data: cat });
});

router.put('/categories/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const data = db.read();
  const cat = data.categories.find(c => c.id === id);
  if (!cat) return res.status(404).json({ success: false, error: 'Kategoriya topilmadi' });
  if (req.body.nomi !== undefined) {
    const name = String(req.body.nomi).trim();
    if (data.categories.some(c => c.id !== id && c.nomi.toLowerCase() === name.toLowerCase())) {
      return res.status(400).json({ success: false, error: 'Bunday kategoriya allaqachon mavjud' });
    }
    cat.nomi = name;
  }
  if (req.body.ikonka !== undefined) cat.ikonka = req.body.ikonka;
  if (req.body.tartib !== undefined) cat.tartib = Number(req.body.tartib);
  db.write(data);
  res.json({ success: true, data: cat });
});

// O'chirish: mahsulotlari bo'lsa ko'chirish talab qilinadi
router.delete('/categories/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const data = db.read();
  const cat = data.categories.find(c => c.id === id);
  if (!cat) return res.status(404).json({ success: false, error: 'Kategoriya topilmadi' });
  const count = data.products.filter(p => p.kategoriya === cat.nomi).length;
  const moveTo = req.query.moveTo;
  if (count > 0 && !moveTo) {
    return res.status(400).json({
      success: false,
      error: `Bu kategoriyada ${count} ta mahsulot bor. Avval ularni boshqa kategoriyaga ko'chiring (moveTo)`
    });
  }
  if (count > 0 && moveTo) {
    const target = data.categories.find(c => c.nomi === moveTo);
    if (!target) return res.status(400).json({ success: false, error: 'Ko\'chiriladigan kategoriya topilmadi' });
    data.products.forEach(p => { if (p.kategoriya === cat.nomi) p.kategoriya = moveTo; });
  }
  data.categories = data.categories.filter(c => c.id !== id);
  db.write(data);
  res.json({ success: true, message: 'Kategoriya o\'chirildi' });
});

// ---------- API KALIT ----------
router.post('/settings/regenerate-key', (req, res) => {
  const crypto = require('crypto');
  const data = db.read();
  data.settings.api_kalit = crypto.randomBytes(24).toString('hex');
  db.write(data);
  res.json({ success: true, message: 'Yangi kalit yaratildi', data: data.settings.api_kalit });
});

// ---------- EKSPORT ----------
router.get('/export', (req, res) => {
  const data = db.read();
  const fmt = req.query.format || 'json';
  const now = new Date().toISOString().slice(0, 10);

  if (fmt === 'csv') {
    const rows = [['id', 'nomi', 'kategoriya', 'birlik', 'narx', 'ombordagi_soni', 'holat', 'rasm']];
    data.products.forEach(p => rows.push([
      p.id, p.nomi, p.kategoriya, p.birlik, p.narx, p.ombordagi_soni,
      db.computeHolat(p.ombordagi_soni, data.settings.kam_qoldi_chegara), p.rasm || ''
    ]));
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="mahsulotlar-${now}.csv"`);
    return res.send('\uFEFF' + csv);
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="mahsulotlar-${now}.json"`);
  res.send(JSON.stringify({ eksport_sana: now, products: data.products }, null, 2));
});

// ---------- PAROLNI O'ZGARTIRISH ----------
router.post('/change-password', (req, res) => {
  const { current_password, new_password } = req.body;
  const data = db.read();
  if (!bcrypt.compareSync(current_password || '', data.admin.passwordHash)) {
    return res.status(401).json({ success: false, error: "Joriy parol noto'g'ri" });
  }
  if (!new_password || new_password.length < 4) {
    return res.status(400).json({ success: false, error: "Yangi parol kamida 4 belgidan iborat bo'lsin" });
  }
  data.admin.passwordHash = bcrypt.hashSync(new_password, 10);
  db.write(data);
  res.json({ success: true, message: "Parol muvaffaqiyatli o'zgartirildi" });
});

// ---------- LOGIN TARIXI ----------
router.get('/login-history', (req, res) => {
  const data = db.read();
  res.json({ success: true, data: data.admin.login_history || [] });
});

module.exports = router;
