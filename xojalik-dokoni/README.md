# Xo'jalik Mollari Do'koni

Node.js (Express) asosida qurilgan mustaqil veb-sayt: mijozlar uchun ochiq katalog, do'kon egasi uchun admin panel va tashqi ilovalar (masalan, qurilish kalkulyatori) uchun ochiq JSON API.

## Ishga tushirish

Talab qilinadi: [Node.js](https://nodejs.org) 18+ versiyasi.

```bash
npm install
npm start
```

Server ishga tushgach:

- **Sayt (katalog):** http://localhost:3000
- **Admin panel:** http://localhost:3000/admin — login: `admin` / parol: `admin123`
- **API:** http://localhost:3000/api/v1/products
- **API hujjati:** http://localhost:3000/api-hujjat

> Standart portni o'zgartirish uchun: `PORT=4000 npm start`

Birinchi marta kirgandan so'ng, Admin panel → Sozlamalar bo'limidan parolni albatta o'zgartiring.

## Loyiha tuzilishi

```
xojalik-dokoni/
├── server.js              # Asosiy Express server
├── db.js                  # JSON-fayl asosidagi oddiy ma'lumotlar bazasi
├── data/store.json         # Barcha ma'lumotlar shu yerda saqlanadi (avtomatik yaratiladi)
├── routes/
│   ├── api.js              # Ochiq JSON API (/api/v1/*)
│   └── admin.js            # Admin panel API (/admin/api/*, login talab qiladi)
├── middleware/auth.js      # Admin sessiyasini tekshirish
└── public/                 # Frontend (HTML/CSS/JS)
    ├── index.html           # Mijozlar katalogi
    ├── product.html         # Mahsulot batafsil sahifasi
    ├── api-hujjat.html      # API hujjat sahifasi
    ├── admin/               # Admin panel fayllari
    └── uploads/             # Yuklangan mahsulot rasmlari
```

## Ma'lumotlar bazasi haqida

Ma'lumotlar `data/store.json` faylida saqlanadi — alohida DB server (MySQL, PostgreSQL va h.k.) o'rnatish shart emas. Bu kichik do'kon uchun yetarli va oddiy. Agar kelajakda ko'proq trafik yoki bir nechta odam bir vaqtda yozadigan bo'lsa, buni PostgreSQL/MySQL'ga o'tkazish tavsiya etiladi — lekin `db.js` fayli shu maqsadda alohida qatlam sifatida yozilgan, shuning uchun almashtirish qiyin bo'lmaydi.

**Zaxira nusxa:** `data/store.json` faylini vaqti-vaqti bilan boshqa joyga nusxalab qo'ying.

## API — tashqi ilovalar uchun (masalan, qurilish kalkulyatori)

Barcha endpointlar CORS yoqilgan holda ishlaydi, autentifikatsiya talab qilinmaydi:

| So'rov | Tavsif |
|---|---|
| `GET /api/v1/products` | Barcha mahsulotlar (filtr: `?category=`, `?search=`) |
| `GET /api/v1/products/:id` | Bitta mahsulot |
| `GET /api/v1/categories` | Kategoriyalar ro'yxati |
| `POST /api/v1/orders` | Buyurtma so'rovi yaratish |

To'liq misollar bilan: `/api-hujjat` sahifasida.

Admin panelda narx yoki miqdor o'zgartirilgan zahoti, API keyingi so'rovda yangilangan qiymatni qaytaradi (keshlash yo'q).

## Ishlab chiqarish muhitiga (production) chiqarish haqida eslatma

Bu loyiha hozircha oddiy va bitta serverda ishlashga mo'ljallangan:
- `express-session` xotirada (in-memory) ishlaydi — server qayta ishga tushsa, barcha admin sessiyalari tugaydi (bu xavfsiz, faqat qayta login qilish kerak bo'ladi).
- Rasmlar `public/uploads/` papkasida saqlanadi.
- Real domenga chiqarishda: HTTPS o'rnating, `server.js` dagi `session secret` qiymatini o'zgartiring, va agar kerak bo'lsa `cookie: { secure: true }` qo'shing.

## To'lov tizimi haqida

Hozircha Payme/Click integratsiyasi yo'q — bu ataylab shunday, chunki hozirgi maqsad faqat katalog + buyurtma so'rovi. Kerak bo'lganda `routes/api.js` ichidagi `/orders` endpointiga to'lov logikasi qo'shish mumkin.
