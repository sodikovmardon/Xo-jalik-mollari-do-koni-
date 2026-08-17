// db.js — Oddiy, tashqi bog'liqliksiz (native module kerak emas) JSON-fayl asosidagi DB.
// Kichik do'kon uchun yetarli: barcha o'qish/yozish sinxron va atomik tarzda bajariladi.

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'store.json');

function nowISO() {
  return new Date().toISOString();
}

function computeHolat(ombordagi_soni, threshold = 10) {
  if (ombordagi_soni <= 0) return 'Tugagan';
  if (ombordagi_soni <= threshold) return 'Kam qoldi';
  return 'Mavjud';
}

const STATUSES = ['Yangi', "Ko'rib chiqilmoqda", 'Tasdiqlangan', 'Yetkazilmoqda', 'Bajarildi', 'Bekor qilindi'];

function defaultSettings() {
  const crypto = require('crypto');
  return {
    dokon_nomi: "Qurilish Bazasi",
    qisqa_tavsif: "xo'jalik mollari do'koni",
    logotip: null,
    telefon: "+998 97 904 18 20",
    manzil: "Toshkent shahri",
    ish_vaqti: "Dush-Shan: 08:00 - 19:00",
    telegram: "@mardonsodikov",
    yangi_buyurtma_xabar: false,
    buyurtma_default_holat: 'Yangi',
    yashir_tugagan: false,
    kam_qoldi_chegara: 10,
    api_kalit: crypto.randomBytes(24).toString('hex'),
    api_ochiq: true,
    tema: 'dark',
    accent: '#0a84ff',
    dokon_yopiq: false,
    studio_url: ''
  };
}

function defaultCategories() {
  return [
    { id: 1, nomi: "G'isht", ikonka: 'Gisht', tartib: 1 },
    { id: 2, nomi: 'Sement', ikonka: 'Sement', tartib: 2 },
    { id: 3, nomi: 'Qum', ikonka: 'Qum', tartib: 3 },
    { id: 4, nomi: 'Asbob-uskunalar', ikonka: 'Asbob-uskunalar', tartib: 4 },
    { id: 5, nomi: 'Elektr materiallari', ikonka: 'Elektr materiallari', tartib: 5 },
    { id: 6, nomi: "Bo'yoq materiallari", ikonka: 'Boyok', tartib: 6 },
    { id: 7, nomi: 'Santexnika', ikonka: 'Santexnika', tartib: 7 }
  ];
}

// Eski JSON skemani yangi maydonlar bilan to'ldiradi (mavjud ma'lumot buzilmaydi)
function ensureSchema(data) {
  let changed = false;
  if (!data.settings) { data.settings = defaultSettings(); changed = true; }
  else {
    const merged = { ...defaultSettings(), ...data.settings };
    if (Object.keys(merged).length !== Object.keys(data.settings).length) changed = true;
    data.settings = merged;
  }
  if (!Array.isArray(data.categories) || data.categories.length === 0) { data.categories = defaultCategories(); changed = true; }
  // Eski buyurtmalar (bitta mahsulotli) yangi formatga moslashtiriladi
  if (Array.isArray(data.orders)) {
    data.orders.forEach(o => {
      if (!Array.isArray(o.items) && o.product_id) {
        o.items = [{
          product_id: o.product_id,
          nomi: o.mahsulot_nomi || '',
          miqdor: o.miqdor || 1,
          birlik: o.birlik || 'dona',
          narx: o.narx || 0,
          rasm: o.rasm || null
        }];
        changed = true;
      }
      if (!Array.isArray(o.notes)) o.notes = [];
      if (!Array.isArray(o.activity)) o.activity = [];
      if (!o.sana) o.sana = o.created_at;
    });
  }
  if (!Array.isArray(data.admin.login_history)) data.admin.login_history = [];
  return { data, changed };
}

function defaultData() {
  const bcrypt = require('bcryptjs');
  const now = nowISO();
  return {
    nextProductId: 21,
    nextOrderId: 1,
    admin: {
      username: 'admin',
      // standart parol: admin123  (birinchi kirishdan keyin o'zgartirishni tavsiya qilamiz)
      passwordHash: bcrypt.hashSync('admin123', 10),
      login_history: []
    },
    settings: defaultSettings(),
    categories: defaultCategories(),
    products: [
      {
        id: 1,
        nomi: "Silikat g'isht",
        kategoriya: "G'isht",
        birlik: "dona",
        narx: 850,
        ombordagi_soni: 5200,
        rasm: "https://images.unsplash.com/photo-1531685250784-7569952593d2?w=800&q=70&fit=crop&auto=format",
        tavsif: "Standart o'lchamdagi oq silikat g'isht, devor qurilishi uchun mos.",
        oxirgi_yangilanish: now
      },
      {
        id: 2,
        nomi: "Portland sement M400",
        kategoriya: "Sement",
        birlik: "qop",
        narx: 62000,
        ombordagi_soni: 8,
        rasm: "https://images.unsplash.com/photo-1680357680725-f350480aee35?w=800&q=70&fit=crop&auto=format",
        tavsif: "50 kg qopda, yuqori sifatli qurilish sementi M400 markali.",
        oxirgi_yangilanish: now
      },
      {
        id: 3,
        nomi: "Daryo qumi",
        kategoriya: "Qum",
        birlik: "m³",
        narx: 120000,
        ombordagi_soni: 0,
        rasm: "https://images.unsplash.com/photo-1639998733114-99b7ff0101e5?w=800&q=70&fit=crop&auto=format",
        tavsif: "Tozalangan daryo qumi, beton va shtukaturka ishlari uchun.",
        oxirgi_yangilanish: now
      },
      {
        id: 4,
        nomi: "Perforator Bosch",
        kategoriya: "Asbob-uskunalar",
        birlik: "dona",
        narx: 1850000,
        ombordagi_soni: 14,
        rasm: "https://images.unsplash.com/photo-1689935421853-cb23a0bc92e4?w=800&q=70&fit=crop&auto=format",
        tavsif: "Professional perforator, beton va g'ishtni teshish uchun.",
        oxirgi_yangilanish: now
      },
      {
        id: 5,
        nomi: "Elektr kabeli 3x2.5 (VVG)",
        kategoriya: "Elektr materiallari",
        birlik: "m",
        narx: 9500,
        ombordagi_soni: 340,
        rasm: "https://images.unsplash.com/photo-1518181835702-6eef8b4b2113?w=800&q=70&fit=crop&auto=format",
        tavsif: "Mis o'tkazgichli, uy va ofis elektr ta'minoti uchun kabel.",
        oxirgi_yangilanish: now
      },
      {
        id: 6,
        nomi: "Qizil pishiq g'isht",
        kategoriya: "G'isht",
        birlik: "dona",
        narx: 950,
        ombordagi_soni: 3000,
        rasm: "https://images.unsplash.com/photo-1629608564457-5d74829a9e14?w=800&q=70&fit=crop&auto=format",
        tavsif: "Yuqori haroratda pishirilgan qizil g'isht, devor va poydevor qurilishi uchun.",
        oxirgi_yangilanish: now
      },
      {
        id: 7,
        nomi: "Keramik yopiq g'isht 12.5 NF",
        kategoriya: "G'isht",
        birlik: "dona",
        narx: 1200,
        ombordagi_soni: 0,
        rasm: "https://images.unsplash.com/photo-1647703519877-6bff3a2234fc?w=800&q=70&fit=crop&auto=format",
        tavsif: "Yopiq (bo'shliqli) keramik g'isht, issiqlikni yaxshi ushlaydi.",
        oxirgi_yangilanish: now
      },
      {
        id: 8,
        nomi: "Portland sement M500",
        kategoriya: "Sement",
        birlik: "qop",
        narx: 68000,
        ombordagi_soni: 15,
        rasm: "https://images.unsplash.com/photo-1773394089934-3e29f2a3d6a9?w=800&q=70&fit=crop&auto=format",
        tavsif: "50 kg qopda, M500 markali mustahkam sement, beton ishlari uchun.",
        oxirgi_yangilanish: now
      },
      {
        id: 9,
        nomi: "Oq sement 25 kg",
        kategoriya: "Sement",
        birlik: "qop",
        narx: 88000,
        ombordagi_soni: 6,
        rasm: "https://images.pexels.com/photos/7110136/pexels-photo-7110136.jpeg?auto=compress&cs=tinysrgb&w=800",
        tavsif: "Dekorativ ishlar va suvoq uchun oq sement.",
        oxirgi_yangilanish: now
      },
      {
        id: 10,
        nomi: "Saralangan qurilish qumi",
        kategoriya: "Qum",
        birlik: "m³",
        narx: 98000,
        ombordagi_soni: 12,
        rasm: "https://images.unsplash.com/photo-1648219247849-84242c30aad7?w=800&q=70&fit=crop&auto=format",
        tavsif: "Katta toshlardan tozalangan, saralangan qurilish qumi.",
        oxirgi_yangilanish: now
      },
      {
        id: 11,
        nomi: "Shag'al 5-20 mm",
        kategoriya: "Qum",
        birlik: "m³",
        narx: 185000,
        ombordagi_soni: 3,
        rasm: "https://images.unsplash.com/photo-1734415646776-eb5fd675ac73?w=800&q=70&fit=crop&auto=format",
        tavsif: "Beton tayyorlash uchun mos, 5-20 mm fraksiyadagi shag'al.",
        oxirgi_yangilanish: now
      },
      {
        id: 12,
        nomi: "Beton aralashtirgich 120L",
        kategoriya: "Asbob-uskunalar",
        birlik: "dona",
        narx: 2850000,
        ombordagi_soni: 5,
        rasm: "https://images.unsplash.com/photo-1770822662967-7f66605f9103?w=800&q=70&fit=crop",
        tavsif: "120 litrli barabanli beton aralashtirgich, mayda qurilish ishlari uchun.",
        oxirgi_yangilanish: now
      },
      {
        id: 13,
        nomi: "Shtukaturka mashinasi",
        kategoriya: "Asbob-uskunalar",
        birlik: "dona",
        narx: 4500000,
        ombordagi_soni: 1,
        rasm: "https://images.unsplash.com/photo-1745092707630-c00ef0a006c4?w=800&q=70&fit=crop",
        tavsif: "Suvoqni mexanik usulda yotqizadigan professional shtukaturka mashinasi.",
        oxirgi_yangilanish: now
      },
      {
        id: 14,
        nomi: "Avtomat o'chirgich 16A (1P)",
        kategoriya: "Elektr materiallari",
        birlik: "dona",
        narx: 15000,
        ombordagi_soni: 220,
        rasm: "https://images.pexels.com/photos/257736/pexels-photo-257736.jpeg?auto=compress&cs=tinysrgb&w=800",
        tavsif: "Bir qutbli avtomatik o'chirgich, 16 amper, o'rnatish shchiti uchun.",
        oxirgi_yangilanish: now
      },
      {
        id: 15,
        nomi: "Mis sim PV 2x1.5",
        kategoriya: "Elektr materiallari",
        birlik: "m",
        narx: 4800,
        ombordagi_soni: 0,
        rasm: "https://images.unsplash.com/photo-1764866085369-44c7ef1a18f3?w=800&q=70&fit=crop",
        tavsif: "Yopiq elektr o'tkazgichlar uchun ikkita mis yashashli sim.",
        oxirgi_yangilanish: now
      },
      {
        id: 16,
        nomi: "Akril fasad bo'yog'i (oq)",
        kategoriya: "Bo'yoq materiallari",
        birlik: "chelak",
        narx: 145000,
        ombordagi_soni: 25,
        rasm: "https://images.unsplash.com/photo-1744960151551-89325664e916?w=800&q=70&fit=crop",
        tavsif: "Fasad devorlari uchun suvga chidamli akril bo'yoq, oq rang.",
        oxirgi_yangilanish: now
      },
      {
        id: 17,
        nomi: "Universal gruntovka 5L",
        kategoriya: "Bo'yoq materiallari",
        birlik: "chelak",
        narx: 85000,
        ombordagi_soni: 9,
        rasm: "https://images.unsplash.com/photo-1755798322662-8ca0110d01ae?w=800&q=70&fit=crop",
        tavsif: "Bo'yashdan oldin devorlarga qo'llaniladigan universal astar gruntovka.",
        oxirgi_yangilanish: now
      },
      {
        id: 18,
        nomi: "Bo'yoq valigi 250mm",
        kategoriya: "Bo'yoq materiallari",
        birlik: "dona",
        narx: 12000,
        ombordagi_soni: 70,
        rasm: "https://images.unsplash.com/photo-1652829069862-87874e119527?w=800&q=70&fit=crop",
        tavsif: "Katta yuzalarni bo'yash uchun mo'ynali valik, dastasi bilan.",
        oxirgi_yangilanish: now
      },
      {
        id: 19,
        nomi: "Metall-plastik quvur 20mm",
        kategoriya: "Santexnika",
        birlik: "m",
        narx: 7800,
        ombordagi_soni: 150,
        rasm: "https://images.unsplash.com/photo-1609213244695-7d6902be89da?w=800&q=70&fit=crop",
        tavsif: "Suv ta'minoti tizimlari uchun 20 mm li metall-plastik quvur.",
        oxirgi_yangilanish: now
      },
      {
        id: 20,
        nomi: "Yuvinish joyi krani (qo'sh rejimli)",
        kategoriya: "Santexnika",
        birlik: "dona",
        narx: 320000,
        ombordagi_soni: 5,
        rasm: "https://images.unsplash.com/photo-1585247411924-f1c8286ce3a1?w=800&q=70&fit=crop",
        tavsif: "Oshxona uchun aylanadigan, ikki rejimli mixdor krani.",
        oxirgi_yangilanish: now
      }
    ],
    orders: []
  };
}

function ensureDb() {
  if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultData(), null, 2), 'utf-8');
  }
}

function read() {
  ensureDb();
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  const data = JSON.parse(raw);
  const { data: fixed, changed } = ensureSchema(data);
  if (changed) write(fixed);
  return fixed;
}

function write(data) {
  // atomik yozish: avval tmp faylga, keyin almashtiramiz
  const tmp = DB_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmp, DB_PATH);
}

module.exports = { read, write, nowISO, computeHolat, STATUSES, DB_PATH, defaultData };
