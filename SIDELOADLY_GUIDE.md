# دليل: بناء ‎.ipa‎ على Codemagic + تثبيته بـ Sideloadly على Windows

تطبيق Capacitor جاهز للبناء السحابي. اتبع الخطوات بالترتيب.

---

## المرحلة 1: ربط GitHub

1. في Lovable: اضغط زر `+` في الشات (يسار الأسفل) → **GitHub** → **Connect project**.
2. وافق على صلاحيات GitHub، واختر اسم المستودع.
3. سيُدفع الكود تلقائيًا (يشمل مجلد ‎`ios/`‎ و ‎`codemagic.yaml`‎).

---

## المرحلة 2: بناء ‎.ipa‎ على Codemagic

### 2.1 إنشاء حساب
- افتح ‎https://codemagic.io‎ → **Sign up with GitHub**.
- اقبل الصلاحيات.

### 2.2 إضافة التطبيق
- في لوحة Codemagic: **Add application** → **GitHub** → اختر مستودعك.
- اختر **Other** كنوع المشروع (لأن Codemagic سيكتشف ‎`codemagic.yaml`‎ تلقائيًا).

### 2.3 تشغيل البناء
- في صفحة المشروع: اختر فرع ‎`main`‎ والـ workflow اسمه **iOS Unsigned IPA (Capacitor + Sideloadly)**.
- اضغط **Start new build**.
- المدة المتوقعة: **8–15 دقيقة**.

### 2.4 تنزيل الملف
- بعد نجاح البناء، اذهب لتبويب **Artifacts**.
- نزّل ‎`App.ipa`‎ على جهاز Windows.

> الحصة المجانية: 500 دقيقة/شهر = ~30–50 بناء. كافية للاختبار.

---

## المرحلة 3: تجهيز Windows

### 3.1 تثبيت iTunes (الإصدار الصحيح)
- مهم: حمّل من ‎https://www.apple.com/itunes/‎ — **ليس من Microsoft Store**.
- Sideloadly يحتاج مكتبات Apple Mobile Device Support الموجودة في إصدار apple.com فقط.

### 3.2 تثبيت iCloud for Windows
- من ‎https://support.apple.com/en-us/HT204283‎.
- يكفي تثبيته دون تسجيل الدخول.

### 3.3 تنزيل Sideloadly
- ‎https://sideloadly.io‎ → نزّل الإصدار لـ Windows.
- ثبّته كأي برنامج عادي.

---

## المرحلة 4: إنشاء App-Specific Password

Sideloadly لا يقبل كلمة سر Apple ID العادية إذا فعّلت 2FA (وهي إلزامية الآن من Apple).

1. افتح ‎https://account.apple.com‎ → سجّل الدخول.
2. **Sign-In and Security** → **App-Specific Passwords** → **Generate**.
3. سمّها مثلاً: ‎`Sideloadly`‎.
4. انسخ كلمة السر المُولّدة (مثل ‎`abcd-efgh-ijkl-mnop`‎). ستحتاجها بعد قليل.

---

## المرحلة 5: التثبيت على الآيفون

### 5.1 الاتصال
- وصّل الآيفون بـ Windows عبر USB.
- على الآيفون: اضغط **Trust** عند ظهور التنبيه.
- افتح iTunes مرة واحدة لتأكيد التعرف على الجهاز، ثم أغلقه.

### 5.2 التوقيع والتثبيت
1. افتح Sideloadly.
2. اسحب ملف ‎`App.ipa`‎ إلى نافذة Sideloadly.
3. تأكد أن جهازك ظاهر في خانة **Device**.
4. في خانة **Apple ID**: ضع بريدك الإلكتروني.
5. اضغط **Start**.
6. سيطلب كلمة السر → ضع **App-Specific Password** المنسوخة.
7. انتظر شريط التقدم (3–5 دقائق).

### 5.3 الثقة في الشهادة
على الآيفون:
1. **Settings** → **General** → **VPN & Device Management**.
2. تحت ‎`Developer App`‎ ستجد بريد Apple ID.
3. اضغط عليه → **Trust**.
4. أكّد.

### 5.4 تشغيل التطبيق
- ابحث عن أيقونة "مستخرج بيانات الدورات" على الشاشة الرئيسية.
- اضغط لفتحه. يعمل!

---

## بعد 7 أيام

سيتوقف التطبيق عن الفتح (تنتهي صلاحية التوقيع المجاني).

**لإعادة التوقيع:**
- وصّل الآيفون بـ Windows.
- افتح Sideloadly واسحب نفس الملف ‎`App.ipa`‎ مرة أخرى.
- اضغط Start. لا حاجة لإعادة تنزيل من Codemagic إن لم تتغير الأكواد.

---

## أخطاء شائعة وحلولها

| المشكلة | السبب | الحل |
|---|---|---|
| `Could not find iTunes installation` | iTunes من Microsoft Store | احذفه وثبّت من apple.com |
| `Authentication failed` | كلمة السر العادية | استخدم App-Specific Password |
| `Provisioning profile failed` | تجاوزت 3 تطبيقات على Apple ID المجاني | احذف تطبيقًا قديمًا من نفس الحساب |
| `Untrusted Developer` عند الفتح | لم تضغط Trust | كرّر المرحلة 5.3 |
| `Codemagic build failed at pod install` | كاش CocoaPods | أعد التشغيل من زر Restart |

---

## بعد نجاح الاختبار: الانتقال لحساب Apple Developer ($99)

عندما تشترك:
1. في Sideloadly: ضع شهادة المطور بدل Apple ID المجاني → الصلاحية **سنة كاملة** بدل 7 أيام.
2. في Codemagic: أضف الشهادة وملف Provisioning، وعدّل الـ workflow ليبني ‎.ipa‎ موقّعًا → جاهز لـ TestFlight (100 مختبر) أو App Store.
3. **لا حاجة لإعادة كتابة التطبيق بـ Swift** — Capacitor مقبول رسميًا في App Store.

---

## ملاحظة عن WebView

التطبيق يفتح ‎`https://date-dwrat.lovable.app`‎ داخل WebView. أي تحديث للموقع من Lovable يظهر مباشرة في التطبيق دون إعادة بناء ‎.ipa‎. تحتاج إعادة بناء فقط لتغييرات في:
- الأيقونة
- اسم التطبيق
- الأذونات
- إعدادات Capacitor
