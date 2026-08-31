# ناوي 🎯

تطبيق بسيط وجميل لتدوين النوايا والأهداف

## المميزات ✨

- 📝 أضف نواياك وأهدافك بسهولة
- ✓ علّم المنجزة منها
- 📊 شوف إحصائيات تقدمك الفوري
- 📱 يعمل على الموبايل والويب
- 🔌 يعمل بدون إنترنت (Offline)
- 💾 حفظ تلقائي للبيانات

## 🌐 الرابط الرسمي

**https://islamfakhri.github.io/nawy**

## التشغيل المحلي 🚀

### المتطلبات
- متصفح حديث (Chrome, Firefox, Safari...)
- خادم محلي (اختياري)

### الطريقة الأولى: بدون خادم
```bash
git clone https://github.com/islamfakhri/nawy.git
cd nawy
# افتح index.html مباشرة في المتصفح
```

### الطريقة الثانية: مع خادم محلي
```bash
# باستخدام Python
python -m http.server 8000

# أو باستخدام Node.js
npx http-server

# ثم افتح المتصفح على:
# http://localhost:8000
```

## النشر على الإنترنت 🌐

### GitHub Pages
1. اذهب إلى Settings
2. اختر Pages
3. اختر main branch
4. احفظ

الرابط: `https://islamfakhri.github.io/nawy`

### Vercel
```bash
npm i -g vercel
vercel
```

### Netlify
```bash
npm i -g netlify-cli
netlify deploy
```

## البنية 📁

```
nawy/
├── index.html          # الواجهة الرئيسية
├── manifest.json       # إعدادات PWA
├── sw.js              # Service Worker (Offline)
├── vercel.json        # إعدادات Vercel
├── README.md          # هذا الملف
└── .github/
    └── workflows/
        └── deploy.yml # GitHub Actions
```

## التكنولوجيا 🛠️

- **HTML5** - البنية الأساسية
- **CSS3** - التصميم الجميل
- **Vanilla JavaScript** - الوظائف (بدون مكتبات)
- **Service Worker** - للعمل بدون إنترنت
- **LocalStorage** - حفظ البيانات
- **PWA** - Progressive Web App

## الترخيص 📄

هذا المشروع مفتوح المصدر وحر الاستخدام

## المساهمة 🤝

هل تبي تساهم؟ 
- Fork المستودع
- أنشئ branch جديد
- أرسل Pull Request

---

تم إنشاؤه بـ ❤️ من islamfakhri