# خطة: بناء ‎.ipa‎ سحابيًا + تثبيت بـ Sideloadly على Windows

الهدف: اختبار التطبيق على آيفونك بدون Mac وبدون $99، فإن نجح تشترك لاحقًا في Apple Developer.

## نظرة عامة على المسار

```
Lovable (Capacitor) ──▶ GitHub ──▶ Codemagic (Mac سحابي) ──▶ ملف .ipa
                                                                  │
                                                                  ▼
                                                  Windows + Sideloadly + Apple ID مجاني
                                                                  │
                                                                  ▼
                                                          آيفونك (صلاحية 7 أيام)
```

## ما هو Sideloadly؟

أداة مجانية على Windows تسمح بتوقيع ملف ‎.ipa‎ بحساب **Apple ID مجاني** (نفس حسابك العادي) وتثبيته على آيفونك عبر USB. القيود:
- صلاحية 7 أيام، ثم يجب إعادة التوقيع وإعادة التثبيت.
- 3 تطبيقات كحد أقصى موقّعة بـ Apple ID مجاني.
- بعض الأذونات (Push notifications, iCloud, In-App Purchase) لا تعمل.
- التطبيق نفسه يعمل بشكل كامل لاختبار الفكرة.

## القيود الفنية المهمة

- **لا يمكن بناء ‎.ipa‎ على Windows مباشرة** — Apple تشترط macOS لتوقيع التطبيقات. الحل: خدمة بناء سحابية تشغّل macOS لك.
- **Codemagic** هو الأنسب لـ Capacitor: 500 دقيقة بناء مجانية شهريًا، يكفي بسهولة للاختبار.
- لـ Sideloadly تحتاج: ‎iTunes‎ من موقع Apple (الإصدار من apple.com وليس من Microsoft Store) + ‎iCloud for Windows‎ مثبتَين على جهازك.

## ما سأنفذه في وضع البناء

### 1. تثبيت منصة iOS على Capacitor
```bash
npx cap add ios
```
ينشئ مجلد ‎`ios/`‎ بمشروع Xcode الكامل. هذا المجلد ضروري ليبنيه Codemagic.

### 2. ضبط ‎`capacitor.config.ts`‎
- تعطيل `server.url` (لأنه يجعل التطبيق يحتاج إنترنت دائمًا، وقد يُرفض من بعض إعدادات Sideloadly).
- بدل ذلك: بناء ثابت إلى `dist/` يُحزم داخل التطبيق نفسه. يحتاج تكوين خاص لأن المشروع يستخدم TanStack Start (SSR). الخيار الأبسط: **إبقاء `server.url` يشير إلى الموقع المنشور** — التطبيق يفتح WebView على `https://date-dwrat.lovable.app`. هذا أسهل ويعمل مع Sideloadly.

سنبقي ‎`server.url`‎ كما هو.

### 3. إنشاء ‎`codemagic.yaml`‎ في جذر المشروع
ملف تكوين Codemagic يحدد:
- بيئة macOS + Xcode
- تثبيت ‎`npm install`‎ ثم ‎`npx cap sync ios`‎
- بناء ‎`.ipa`‎ بدون توقيع (`CODE_SIGNING_ALLOWED=NO`) لأن Sideloadly سيوقّعه لاحقًا
- إخراج الملف للتنزيل من واجهة Codemagic

### 4. تحديث ‎`.gitignore`‎
استبعاد ‎`ios/App/Pods/`‎ و ‎`ios/DerivedData/`‎ مع الإبقاء على ‎`ios/App/App.xcodeproj`‎ و ‎`ios/App/Podfile`‎ في المستودع.

### 5. توليد أيقونة التطبيق
أيقونة 1024x1024 بهوية الموقع البنفسجية (تستخدم في AppIcon داخل ‎`ios/App/App/Assets.xcassets/`‎).

### 6. إعداد ‎`Info.plist`‎ الأساسي
- ‎`CFBundleDisplayName`‎ = "مستخرج الدورات"
- ‎`NSCameraUsageDescription`‎ (إذا احتجنا QR من الكاميرا لاحقًا)
- ‎`NSPhotoLibraryUsageDescription`‎ (لرفع صور المنشور)

## ما ستفعله أنت بعد التنفيذ

### أ. ربط GitHub بمشروع Lovable
1. اضغط زر `+` في الشات → GitHub → Connect project.
2. سيتم إنشاء مستودع ودفع الكود إليه.

### ب. إنشاء حساب Codemagic مجاني
1. ‎https://codemagic.io‎ → سجّل الدخول بـ GitHub.
2. اختر المستودع الذي تم إنشاؤه.
3. سيكتشف ‎`codemagic.yaml`‎ تلقائيًا.
4. اضغط **Start new build**.
5. بعد ~10 دقائق ستحصل على ملف ‎`App.ipa`‎ في صفحة **Artifacts** للتنزيل.

### ج. تجهيز Windows
1. ثبّت ‎iTunes‎ من ‎https://www.apple.com/itunes/‎ (وليس Microsoft Store).
2. ثبّت ‎iCloud for Windows‎ من نفس الموقع.
3. حمّل Sideloadly من ‎https://sideloadly.io‎ (مجاني).

### د. التثبيت على الآيفون
1. وصّل الآيفون بـ USB.
2. افتح Sideloadly، اسحب ملف ‎`App.ipa`‎ إليه.
3. أدخل **Apple ID** و**كلمة سر مخصصة للتطبيق** (تُولَّد من ‎appleid.apple.com‎ → Security → App-Specific Passwords).
4. اضغط Start. سيوقّع ويثبت التطبيق (~3-5 دقائق).
5. على الآيفون: **Settings → General → VPN & Device Management → Trust [Apple ID]**.
6. افتح التطبيق من الشاشة الرئيسية.

## بعد نجاح الاختبار

عند الاشتراك في Apple Developer ($99/سنة):
- في Sideloadly نفسه: ضع شهادة المطور بدل Apple ID المجاني → الصلاحية تصبح سنة كاملة.
- أو في Codemagic: أضف شهادة التوقيع → ‎.ipa‎ موقّع جاهز للـ TestFlight أو App Store.
- **التحويل إلى Swift غير ضروري** — Capacitor تطبيق iOS رسمي ومقبول في App Store كأي تطبيق آخر. آلاف التطبيقات على المتجر مبنية بـ Capacitor (Sworkit، BBC Good Food، إلخ). لكن إذا أصررت لاحقًا، يمكن إعادة الكتابة بـ SwiftUI كمشروع جديد.

## الملفات المتأثرة

- ➕ مجلد ‎`ios/`‎ كامل (يولّده ‎`npx cap add ios`‎)
- ➕ ‎`codemagic.yaml`‎ (تعليمات البناء السحابي)
- ✏️ ‎`.gitignore`‎ (استثناء ‎`ios/App/Pods`‎، ‎`ios/DerivedData`‎)
- ✏️ ‎`capacitor.config.ts`‎ (ضبط ‎`appName`‎ بالعربية)
- ➕ ‎`SIDELOADLY_GUIDE.md`‎ دليل عربي مفصّل بكل الخطوات

## تحذيرات مهمة قبل أن تبدأ

⚠️ **الصلاحية 7 أيام:** ستحتاج إعادة التوقيع والتثبيت أسبوعيًا. للمجموعة المحدودة، كل شخص سيحتاج تكرار العملية على آيفونه — هذا غير عملي للنشر، لكنه ممتاز **للاختبار الشخصي**.

⚠️ **2FA على Apple ID:** يجب تفعيل المصادقة الثنائية وإنشاء ‎App-Specific Password‎ — لا يقبل Sideloadly كلمة السر العادية.

⚠️ **WebView عبر إنترنت:** بما أن ‎`server.url`‎ يشير للموقع المنشور، التطبيق يحتاج إنترنت ليعمل. إذا أردت تطبيقًا يعمل أوفلاين، نحتاج خطة مختلفة (تصدير ثابت).

اضغط "Implement plan" للتنفيذ.
