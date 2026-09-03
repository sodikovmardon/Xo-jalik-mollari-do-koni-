const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');

const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Railway (va boshqa reverse-proxy'lar) orqasida X-Forwarded-For to'g'ri ishlashi uchun
app.set('trust proxy', 1);

// ---------- Middleware ----------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS — tashqi ilovalar (masalan qurilish kalkulyatori) /api/v1/* ga so'rov yubora oladi
app.use('/api', cors());

app.use(session({
  secret: process.env.SESSION_SECRET || 'xojalik-dokoni-maxfiy-kalit-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8 } // 8 soat
}));

app.use(express.static(path.join(__dirname, 'public')));

// ---------- Routes ----------
app.use('/api/v1', apiRoutes);
app.use('/admin/api', adminRoutes);

// SPA-style fallback'lar
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

app.get('/mahsulot/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'product.html'));
});

app.get('/api-hujjat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'api-hujjat.html'));
});

app.get('/savat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'savat.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

db.read(); // birinchi ishga tushirishda DB yaratiladi (agar mavjud bo'lmasa)

app.listen(PORT, () => {
  console.log(`\n✅ Xo'jalik mollari do'koni serveri ishlamoqda!`);
  console.log(`   Sayt:        http://localhost:${PORT}`);
  console.log(`   Admin panel: http://localhost:${PORT}/admin  (login: admin / admin123)`);
  console.log(`   API:         http://localhost:${PORT}/api/v1/products`);
  console.log(`   API hujjat:  http://localhost:${PORT}/api-hujjat\n`);
});
