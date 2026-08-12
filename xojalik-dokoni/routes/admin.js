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
  max: 8, // Har bir IP uchun ko'pi bilan 8 marta urinish
  message: {
    success: false,
    error: "Juda ko'p urinish, birozdan keyin qayta urinib ko'ring"
  },
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

  req.session.isAdmin = true;
  req.session.username = username;
  res.json({ success: true, message: 'Tizimga muvaffaqiyatli kirdingiz' });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

router.get('/me', (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.json({ success: true, loggedIn: true, username: req.session.username });
  }
  res.json({ success: true, loggedIn: false });
});

// Quyidagi barcha yo'llar login talab qiladi
router.use(requireAdmin);

// ---------- STATISTIKA ----------
router.get('/stats', (req, res) => {
  const data = db.read();
  const total = data.products.length;
  const kamQoldi = data.products.filter(p => p.ombordagi_soni > 0 && p.ombordagi_soni <= 10).length;
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
  res.json({
    success: true,
    data: list.map(p => ({ ...p, holat: db.computeHolat(p.ombordagi_soni) }))
  });
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
router.get('/orders', (req, res) => {
  const data = db.read();
  res.json({ success: true, data: data.orders });
});

router.put('/orders/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const data = db.read();
  const order = data.orders.find(o => o.id === id);
  if (!order) return res.status(404).json({ success: false, error: 'Buyurtma topilmadi' });
  if (req.body.holat) order.holat = req.body.holat;
  db.write(data);
  res.json({ success: true, data: order });
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

module.exports = router;
