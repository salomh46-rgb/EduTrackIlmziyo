# 🚀 EduTrack Ilmziyo SaaS — To'liq Ishlab Chiqarish va Bozorga Chiqarish Rejasi (Production Launch Roadmap)

> **Loyiha:** EduTrack Ilmziyo (Enterprise Multi-Tenant EdTech SaaS)  
> **Muallif va Bosh Arxitektor:** Javohirbek Asqarov (Jasper)  
> **Texnologik Stek:** React 19, TypeScript, Vite 7, Tailwind CSS, Supabase (PostgreSQL + RLS), Telegram Bot, Click / Payme / Uzum.  
> **Holati:** ✅ Baza migratsiyalari va Frontend poydevori tayyor, TypeScript/Build 100% Green.

---

## 🎯 1. Mahsulotning Asosiy Missiyasi va Bozorqi Qiymati (Product Vision)

EduTrack Ilmziyo — O'zbekistondagi o'quv markazlari, IT akademiyalar, xususiy maktablar va repetitorlik markazlari uchun mo'ljallangan **№1 avtomatlashtirilgan boshqaruv ekotizimi**.

### Biznes Yechimi:
- ❌ **Eski muammo:** Qog'oz jurnallar, Exceldagi chalkash hisoblar, o'quvchi darsga kelmaganini ota-onaga kech yetkazish, oylik to'lovlarni undirishdagi noaniqliklar.
- ✅ **EduTrack Ilmziyo yechimi:** 
  1. O'qituvchi darsda 10 soniyada davomat qiladi.
  2. Darsga kelmagan o'quvchining ota-onasiga shu soniyaning o'zidayoq Telegram orqali xabar boradi.
  3. Kurs to'lovlari Click / Payme orqali qabul qilinadi, qarzdorliklar avtomatik nazorat qilinadi.
  4. O'quv markazi rahbari tushum, sof foyda va o'quvchilar dinamikasini jonli analitika orqali ko'rib turadi.

---

## 🗺️ 2. Bosqichma-Bosqich Ishlab Chiqarish Rejasi (Phase Breakdown)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        EDUTRACK ILMZIYO PRODUCTION ROADMAP                             │
└───────────────────────────────────┬────────────────────────────────────────────────────┘
                                    │
 ┌─────────────────┬────────────────┴────────────────┬─────────────────┐
 ▼                 ▼                                 ▼                 ▼
FAZA 1: Poydevor  FAZA 2: O'quv & Davomat           FAZA 3: Moliya     FAZA 4: Telegram Bot
• RLS xavfsizlik   • Guruhlar & Dars jadvallari      • Click/Payme/Uzum • Asinxron Worker
• Rollar (RBAC)    • 1-klikda Davomat jurnali        • 100x konvertatsiya • Ota-ona bildirishnomasi
• Talaba/O'qituvchi • Imtihonlar & Baholash          • Avtomat cheklar  • Ota-ona Mini App
```

---

### 🔹 FAZA 1: Tizim Poydevori va Xavfsizlik (Tugallandi ✅)
* [x] Supabase PostgreSQL bazasi, 3 ta migratsiya (0001, 0002, 0003 hardening).
* [x] Multi-tenancy arxitekturasi (`organizations`, `organization_members`).
* [x] Talabalar (`students`), Ota-onalar (`parents`) va O'qituvchilar (`teachers`) ma'lumotlar modeli.
* [x] Barcha TypeScript xatoliklarini tozalash va `npm run build` ning 100% muvaffaqiyatli chiqishi.
* [x] 2026 Elite UI: Kursor Spotlight fizikasi va zamonaviy statistika kartalari.

---

### 🔹 FAZA 2: O'quv Dvigateli va Davomat Nazorati (Learning & Attendance Engine)
*Maqsad: O'quv markazining kunlik faoliyatini to'liq raqamlashtirish.*

1. **O'quv Guruhlari & Dars Jadvallari (`/groups`):**
   - Guruh yaratish: Fan, o'qituvchi, oylik to'lov narxi, xona va dars kunlari (Juft/Toq/Har kuni).
   - Guruhga o'quvchilarni biriktirish va cheklovlar (masalan, maksimal 15 o'quvchi).
2. **Interaktiv Davomat Jurnali (`/attendance`):**
   - Kunlik darslar ro'yxati va "Davomat qilish" tugmasi.
   - Tezkor belgilar: `Keldi (yashil)`, `Kelmadi (qizil)`, `Sababli (sariq)`, `Kechikdi (ko'k)`.
   - 1 ta tugma orqali saqlash (`Bulk Upsert`).
3. **Imtihonlar & Reyting (`/exams`):**
   - Haftalik va oylik test natijalarini kiritish.
   - Guruh ichidagi o'quvchilar reytingi (Top o'quvchilar doskasi).

---

### 🔹 FAZA 3: Fintech & Moliya Dvigateli (Jasper Pillar 4 Standarti)
*Maqsad: Kurs to'lovlarini 0 xatolik bilan avtomatlashtirish.*

1. **To'lovlar Tizimi Integratsiyasi:**
   - **Click Merchant API**, **Payme Business API** va **Uzum Bank**.
   - Tiyin / so'm 100x qoidasi: Hisob-kitoblar va saqlash har doim so'mda, to'lov shlyuziga uzatishda esa 100 ga ko'paytirilib tiyinda uzatiladi.
   - Takroriy to'lov (Idempotency) qulfi — bitta to'lov qayta tasdiqlanib ketmasligi uchun tranzaksiya unikal ID tekshiruvi.
2. **Qarzdorlik Boshqaruvi:**
   - O'quvchining shaxsiy balansi (Deposit balance).
   - Har oyning belgilangan sanasida (masalan, 1-sanasida) avtomatik oylik to'lov hisoblash.
   - Qarzdorlar filtri: "To'lov muddati o'tganlar" qizil ro'yxati.
3. **Elektron Kvitansiya (PDF/Image):**
   - To'lov qabul qilinganda avtomatik professional kvitansiya generatsiya qilish.

---

### 🔹 FAZA 4: Telegram Parent Bot & Avtomatlashtirilgan Xabarnomalar
*Maqsad: O'quv markazini ota-onalar bilan eng ishonchli bog'lovchi zanjir.*

1. **Telegram Webhook & Worker:**
   - `supabase/functions/notification-worker`: Davomat saqlanganda yoki to'lov amalga oshirilganda navbat (`notification_queue`) ga yoziladi.
   - Worker orqa fonda asinxron ravishda Telegram bot orqali ota-onaga xabarni yetkazadi.
2. **Xabar Shablonlari (O'zbek tilida):**
   - ⚠️ *Davomat xabari:* "Hurmatli [Ota-ona ismi], farzandingiz [Talaba ismi] bugun [Guruh nomi] darsiga qatnashmadi."
   - 💳 *To'lov eslatmasi:* "Hurmatli [Ota-ona ismi], farzandingizning [Oy nomi] oyi uchun to'lov muddati [Sana] gacha. To'lov summasi: [Summa] so'm. Click/Payme orqali to'lash: [Havola]"
   - 🌟 *Natija xabari:* "Farzandingiz bugungi imtihondan 95 ball to'plab, guruhda 1-o'rinni egalladi!"
3. **Ota-onalar uchun Telegram Mini App:**
   - Ota-ona bot ichidan o'z telefon raqamini tasdiqlab, farzandining davomati, baholari va to'lov tarixini bitta ekranda ko'radi.

---

### 🔹 FAZA 5: 2026 Elite UI & Foydalanuvchi Tajribasi (UX)
*Maqsad: O'zbekistondagi eng ko'rkam va chaqqon EdTech interfeysi.*

1. **Apple & Linear Ergonomikasi:**
   - 60–120 FPS li ravon o'tishlar, glassmorphism modal oynalari.
   - Sichqoncha kursorini kuzatuvchi **Spotlight fizikasi** (kartochkalarda allaqachon ulandi).
   - O'qituvchilar uchun telefon orqali tezkor ishlash qulayligi (Thumb-friendly touch zones).
2. **PWA (Progressive Web App):**
   - Kompyuter yoki telefonga alohida dastur kabi o'rnatib olish (`Install App`).

---

### 🔹 FAZA 6: Ishlab Chiqarishga Chiqarish & Go-to-Market (Production Launch)

1. **Infratuzilma va Xavfsizlik:**
   - Supabase Enterprise Cloud yoki Hetzner-da Self-hosted Supabase (Docker + Coolify).
   - Vercel / Cloudflare orqali yuqori tezlikdagi Edge CDN.
   - Kunlik avtomatik zaxira nusxalash (Daily Database Backups).
2. **14 Kunlik Bepul Pilot Sinov (Beta Launch):**
   - O'zbekistondagi 3-5 ta do'stona o'quv markaziga tizimni bepul 1 oyga o'rnatib berish.
   - O'qituvchi va ma'murlardan jonli fikr-mulohazalar (feedback) to'plash.
3. **Monetizatsiya va Tariflar:**
   - 🥉 **Boshlang'ich (Starter):** 1 ta filial, 150 tagacha o'quvchi — 290 000 so'm / oy.
   - 🥈 **Professional (Pro):** 500 tagacha o'quvchi, Telegram bot, Click/Payme — 590 000 so'm / oy.
   - 🥇 **Enterprise:** Cheksiz o'quvchilar, ko'p filiallar, oq yorliq (White-label brending) — 1 200 000 so'm / oy.

---

## 📋 Keyingi Aniq Harakatlar Rejasi (Action Items):

1. **1-qadam:** O'quv guruhlari (`/groups`) va Guruh yaratish formasini to'liq ulash.
2. **2-qadam:** Interaktiv Davomat stolini (`/attendance`) yaratish.
3. **3-qadam:** Click/Payme to'lovlar modulini sinovdan o'tkazish.
4. **4-qadam:** Telegram Bot xabarnoma workerini jonli rejimda tekshirish.
