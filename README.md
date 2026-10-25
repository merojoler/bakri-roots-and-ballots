# Bakri Roots And Ballots

أريد منك بناء تطبيق ويب متكامل ومخصص لعائلة "البكري" (شجرة العائلة + نظام التصويت للمختار + لوحة تحكم إدارية). 

أريد الكود كاملاً ومترابطاً (Frontend + Backend + Database) بحيث يكون جاهزاً للتشغيل على خادم حقيقي (Production-ready).



إليك التفاصيل والمتطلبات الأساسية بدقة:



1. التصميم والهوية البصرية:

- تصميم أنيق، عصري، متجاوب تماماً مع الهواتف الذكية (Mobile-Friendly)، وبواجهة عربية بالكامل (RTL).

- استخدام ألوان وقرائن تراثية وعائلية مميزة (مثل تدرجات الذهبي والأخضر الداكن أو الأزرق الملكي الراقي).



2. قسم الأجداد وكبار العائلة (الأعلى دائماً):

- قسم ثابت في أعلى الصفحة الرئيسية مخصص للأجداد والأعمام وكبار العائلة (يتم عرض صورهم، أسمائهم، ونبذة مختصرة عنهم إن وجدت) بحيث يظل ظاهرًا في الصدارة دائماً.



3. شجرة العائلة والإضافة الذاتية (Add Family Member):

- زر واضح "أضف فرداً جديداً للعائلة" يفتح نموذجاً (Form) لإدخال: (الاسم الكامل، اسم الأب/الجد، صلة القرابة، الصورة الشخصية، رقم الهاتف اختياري، ملاحظات).

- ميزة الأمان والموافقة (Approval Workflow): عند إرسال أي شخص لبيانات قريبه، لا تظهر فوراً في الشجرة، بل يتم حفظها بحالة "معلق" (Pending) وتذهب مباشرة إلى لوحة تحكم الأدمن للموافقة عليها أو رفضها.



4. نظام التصويت لمختار العائلة:

- صفحة مخصصة للتصويت لاختيار "مختار العائلة".

- تعرض قائمة المرخّصين للمنصب مع صورهم ونبذة عنهم.

- زر تصويت لكل مرشح، مع عرض إحصائيات فورية وشفافة (عدد الأصوات والنسبة المئوية لكل مرشح).

- حماية بسيطة لمنع تكرار التصويت من نفس الجهاز/المتصفح (مثلاً باستخدام LocalStorage أو تخزين مؤقت عبر الباك إند).



5. لوحة تحكم الأدمن (Admin Dashboard):

- صفحة محمية بكلمة مرور خاصة (Hidden Login Page)، يتم الوصول إليها من زر مخفي أو رابط مخصص في الموقع.

- لوحة التحكم تتيح للأدمن:

  * مراجعة الطلبات المعلقة (Pending Requests) مع إمكانية الضغط على "قبول" (فتنتقل تلقائياً لتظهر في الشجرة العامة) أو "رفض".

  * إدارة قائمة أفراد العائلة (تعديل أو حذف أي اسم عند الحاجة).

  * متابعة نتائج التصويت للمختار وإدارتها.



6. الهيكلة التقنية المطلوبة:

- Backend: (Node.js / Express أو Python / Flask أو PHP حسب ما تفضله وتراه مناسباً لاستقرار المشروع).

- Database: قاعدة بيانات (مثل SQLite أو MongoDB أو PostgreSQL) لحفظ الأجداد، الأعضاء المعتمدين، الطلبات المعلقة، والأصوات بشكل دائم على السيرفر.

- Frontend: HTML5, Tailwind CSS, JavaScript (أو إطار عمل مناسب) لضمان السرعة وسلاسة الاستخدام.



الرجاء تزويدي بكود المشروع كاملاً مقسماً بشكل واضح (ملفات الباك إند، قاعدة البيانات، والواجهات الأمامية) مع شرح ب

سيط لطريقة تشغيله ورفع على الخادم.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://bakri-roots-and-ballots.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e27a9f04-ff51-4370-87c5-05b353083a5c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
