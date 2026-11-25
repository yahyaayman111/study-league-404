# تقرير التحقق

## 1) اختبارات قواعد الخدمات (Node)

```text
> node tests/rules.test.mjs

✓ seed exposes 8 competitions including the tie-break history
✓ anonymous projection strips names/codes and uses neutral labels
✓ c5 persistent tie resolves to joint first with 7 historical votes each
✓ up to 3 distinct votes, with unused votes allowed
✓ self-vote is rejected
✓ more than 3 votes rejected
✓ duplicate summary in one ballot rejected
✓ unpaid participant cannot vote
✓ voting after the deadline rejected
✓ admins cannot cast student votes
✓ submission after the deadline rejected
✓ only admins can approve results; admin approves the joint tie
✓ joint prize needs a manual settlement with notes
✓ only winning summaries can be submitted; publication is admin-only
✓ editor role can review but cannot publish; contributor badge grants nothing
✓ student cannot grant roles; admin needs a reason
✓ completed competitions cannot advance status again
✓ academic year closes once and awards the Annual Champion badge
✓ financial privacy: only finance admins can mark payments

19 rule tests passed
```

## 2) اختبار المتصفح الآلي (نسخة الإنتاج)

شغّلت Chrome عبر DevTools Protocol على حزمة الإنتاج المخدومة محلياً (نفس ملفات JS/CSS المنشورة) وسجّلت:

- تسجيل الدخول كطالب (`STU1001`) ومدير مجموعة (`ADMIN-404`) ومدير منصة (`OWNER-404`).
- التصويت: اختيار ملخصين مختلفين من أصل 3، ثم تأكيد → قفل دائم.
  - الحالة بعد التأكيد: `votes = 2`, `voteLocks = 1`.
- بطاقة «ملخصك الخاص» ظاهرة ومنع زر التصويت لملخص الطالب نفسه.
- المكتبة: 3 ملخصات، البحث والفلاتر.
- قارئ الكتاب: صفحتان على سطح المكتب (`spread pages = 2`)، صفحة واحدة على الجوال، وتبديل العرض العادي (3 صفحات) دون فقدان الموضع.
- تحميل PDF: ملف عربي RTL باسم «الجهاز الهضمي في المجترات.pdf»، الحجم 208,180 بايت، يبدأ بـ `%PDF-1.4`.
- اعتماد مركز أول مشترك: 3 نقاط لكل فائز، وجائزة `ON_HOLD_FOR_JOINT_WINNER_AGREEMENT`.
- تسوية يدوية: `DELIVERED` مع مبلغ 60 ج.م وملاحظات ومستلمين.
- منح شارة، نشر ملخص، و11 سجلاً في سجل التدقيق.
- 0 أخطاء JavaScript خلال الجلسة.

> ملاحظة: تم تنفيذ الجولة أعلاه على حزمة الإنتاج السابقة. التغييرات اللاحقة هي: بيانات التعادل الحقيقية (مغطاة باختبارات Node)، رسالة الاعتماد المكرر، بوابة React للنوافذ (Portal)، والتفاف شريط تنقل الجوال. أُعيد بناء هذه التغييرات ونشرها بنجاح (`READY`).

## 3) البناء والنشر

```text
> vite build
✓ 50 modules transformed.

Production  https://study-league-404-he79nwrio-qrmenu-egysa.vercel.app
Aliased     https://study-league-404.vercel.app
readyState  READY
```

## 4) قيود البيئة

- شبكة هذا الجهاز إلى CDN الخاص بـVercel كانت بطيئة/متقطعة أثناء الاختبار، لذلك استُخدمت نسخة محلية مطابقة لملفات البناء للتحقق.
- `npm install` المحلي تعطّل بسبب تحميل حزم npm من الشبكة؛ لكن Vercel ثبّت الحزم وبنى المشروع بنجاح.
