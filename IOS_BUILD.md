# تغليف التطبيق بـ Capacitor وبناءه على Xcode

تم إعداد Capacitor في هذا المشروع. اتبع هذه الخطوات على جهاز Mac (يتطلب Xcode 15+ وحساب Apple Developer للتثبيت على الأجهزة).

## 1) استنساخ المشروع محليًا

اربط مشروع Lovable بـ GitHub ثم استنسخه على جهازك:

```bash
git clone <repo-url>
cd <repo>
npm install   # أو: bun install
```

## 2) إضافة منصة iOS (مرة واحدة فقط)

```bash
npx cap add ios
```

هذا ينشئ مجلد `ios/` يحتوي على مشروع Xcode. **التزم به في git** بعد الإنشاء.

## 3) المزامنة بعد أي تغيير

ملف `capacitor.config.ts` يوجّه WebView إلى الموقع المنشور `https://date-dwrat.lovable.app`، فلا تحتاج `npm run build` لكل تغيير — فقط انشر الموقع من Lovable وستظهر التحديثات تلقائيًا داخل التطبيق.

```bash
npx cap sync ios
```

## 4) فتح المشروع في Xcode

```bash
npx cap open ios
```

داخل Xcode:
1. اختر فريق التوقيع (Signing & Capabilities → Team).
2. وصّل الآيفون أو اختر محاكيًا.
3. اضغط زر التشغيل (▶︎).

## 5) التحديث لاحقًا

- **تغييرات الواجهة فقط** → انشر من Lovable (Publish) ويُحدَّث التطبيق تلقائيًا في WebView.
- **تغييرات إعدادات Capacitor / أيقونات / أذونات** → كرّر `npx cap sync ios` ثم أعد البناء في Xcode.

## ملاحظات

- إذا أردت لاحقًا تطبيقًا يعمل **بدون إنترنت**، استبدل `server.url` ببناء ثابت (Static Export) ثم `npx cap copy ios`.
- `appId` الحالي: `app.lovable.dwrat` — غيّره في `capacitor.config.ts` قبل أول بناء إن رغبت.
