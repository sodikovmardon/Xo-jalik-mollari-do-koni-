// db.js — Oddiy, tashqi bog'liqliksiz (native module kerak emas) JSON-fayl asosidagi DB.
// Kichik do'kon uchun yetarli: barcha o'qish/yozish sinxron va atomik tarzda bajariladi.

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'store.json');

function nowISO() {
  return new Date().toISOString();
}

function computeHolat(ombordagi_soni) {
  if (ombordagi_soni <= 0) return 'Tugagan';
  if (ombordagi_soni <= 10) return 'Kam qoldi';
  return 'Mavjud';
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
      passwordHash: bcrypt.hashSync('admin123', 10)
    },
    products: [
      {
        id: 1,
        nomi: "Silikat g'isht",
        kategoriya: "G'isht",
        birlik: "dona",
        narx: 850,
        ombordagi_soni: 5200,
        rasm: "/uploads/placeholder-brick.svg",
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
        rasm: "/uploads/placeholder-cement.svg",
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
        rasm: "/uploads/placeholder-sand.svg",
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
        rasm: "/uploads/placeholder-tool.svg",
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
        rasm: "/uploads/placeholder-cable.svg",
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
        rasm: "/uploads/placeholder-brick.svg",
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
        rasm: "/uploads/placeholder-brick.svg",
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
        rasm: "/uploads/placeholder-cement.svg",
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
        rasm: "/uploads/placeholder-cement.svg",
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
        rasm: "/uploads/placeholder-sand.svg",
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
        rasm: "/uploads/placeholder-sand.svg",
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
        rasm: "/uploads/placeholder-tool.svg",
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
        rasm: "/uploads/placeholder-tool.svg",
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
        rasm: "/uploads/placeholder-cable.svg",
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
        rasm: "/uploads/placeholder-cable.svg",
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
        rasm: "/uploads/placeholder-paint.svg",
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
        rasm: "/uploads/placeholder-paint.svg",
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
        rasm: "/uploads/placeholder-paint.svg",
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
        rasm: "/uploads/placeholder-plumbing.svg",
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
        rasm: "/uploads/placeholder-plumbing.svg",
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
  return JSON.parse(raw);
}

function write(data) {
  // atomik yozish: avval tmp faylga, keyin almashtiramiz
  const tmp = DB_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmp, DB_PATH);
}

module.exports = { read, write, nowISO, computeHolat, DB_PATH, defaultData };
