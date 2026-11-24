# Dermalake — Skincare E-commerce

موقع تجارة إلكترونية لمنتجات العناية بالبشرة لشركة **Dermalake**.
React 19 + TypeScript + Vite + Tailwind CSS v4 + Firebase (Firestore).

## المميزات

- عربي (RTL) + إنجليزي (LTR) مع زرار تبديل اللغة
- صفحات: رئيسية، منتجات (فلترة + بحث + ترتيب)، تفاصيل منتج، سلة، إتمام طلب (دفع عند الاستلام)، مفضلة، تقييمات
- السلة والمفضلة بتتحفظ في المتصفح (localStorage)
- الطلبات والتقييمات بتتسجل في Firestore
- **وضع تجريبي تلقائي**: لو Firebase مش متظبط، الموقع يشتغل ببيانات محلية والطلبات تتحفظ في المتصفح

## التشغيل

```bash
npm install
npm run dev
```

الموقع هيفتح على `http://localhost:5173` — هيشتغل فورًا بالبيانات التجريبية حتى من غير Firebase.

## ربط Firebase (الباك إند الحقيقي)

1. اعمل مشروع جديد على [Firebase Console](https://console.firebase.google.com)
2. من **Build → Firestore Database** اعمل Database جديدة وابدأها في **Test mode** مؤقتًا
3. من **Project settings → Your apps** ضيف Web app وانسخ الـ config
4. انسخ `.env.example` إلى `.env.local` واملأ القيم:
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```
5. ارفع بيانات المنتجات لقاعدة البيانات:
   ```bash
   npm run seed
   ```
6. **مهم**: بعد الـ seed، افتح **Firestore → Rules** والصق محتوى ملف
   [`firebase/firestore.rules`](firebase/firestore.rules) بدل قواعد الـ test mode
   (بتسمح بقراءة المنتجات والتقييمات للجميع، وإضافة طلبات وتقييمات فقط — من غير أي تعديل أو قراءة للطلبات)
7. أعد تشغيل `npm run dev`

## أوامر

| الأمر | الوظيفة |
|---|---|
| `npm run dev` | تشغيل بيئة التطوير |
| `npm run build` | بناء نسخة الإنتاج في `dist/` |
| `npm run preview` | معاينة نسخة الإنتاج |
| `npm run seed` | رفع المنتجات والتقييمات المبدئية لـ Firestore |
| `npm run lint` | فحص الكود |

## ملاحظات

- صور المنتجات حاليًا placeholders من Unsplash — بدّلها بروابط صور المنتجات الحقيقية في
  [`src/data/products.ts`](src/data/products.ts) ثم أعد تشغيل `npm run seed`
- الطلبات بتتسجل بحالة `pending` — تقدر تتابعها من Firebase Console → Firestore → `orders`
- الشحن: 60 ج.م، ومجاني للطلبات فوق 800 ج.م (تتعدل من `src/lib/types.ts`)
