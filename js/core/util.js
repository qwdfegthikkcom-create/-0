/* =========================================================
   أدوات عامة مشتركة — كل ملف في اللعبة يضيف نفسه إلى globalThis.FC
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC = G.FC || {};
  const U = FC.util = {};

  // حصر رقم بين حدين
  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  // استيفاء خطي بين قيمتين
  U.lerp = (a, b, t) => a + (b - a) * t;
  // تقريب لرقم عشري واحد
  U.round1 = (v) => Math.round(v * 10) / 10;

  // مجموع عناصر مصفوفة (مع دالة اختيارية لاستخراج القيمة)
  U.sum = (arr, f) => {
    let s = 0;
    for (let i = 0; i < arr.length; i++) s += f ? f(arr[i], i) : arr[i];
    return s;
  };
  // متوسط عناصر مصفوفة
  U.avg = (arr, f) => (arr.length ? U.sum(arr, f) / arr.length : 0);

  // تهريب النص قبل وضعه داخل HTML
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  U.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESC[c]);

  // رقم صحيح بفواصل الآلاف: 12,500
  U.int = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  // تنسيق المال بالدولار بشكل مختصر
  U.money = (v) => {
    const a = Math.abs(v);
    let s;
    if (a >= 1e6) s = U.round1(v / 1e6) + ' مليون';
    else if (a >= 1e3) s = U.int(v / 1e3) + ' ألف';
    else s = U.int(v);
    return s + '$';
  };

  // نسخة عميقة بسيطة (للبيانات فقط)
  U.clone = (o) => JSON.parse(JSON.stringify(o));

  // ترتيب مصفوفة حسب مفتاح رقمي تنازلياً
  U.sortDesc = (arr, f) => arr.sort((a, b) => f(b) - f(a));

  // تحويل لون hex إلى rgba مع شفافية
  U.rgba = (hex, a) => {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  };

  // سطوع لون (0–1) لاختيار لون نص مناسب فوقه
  U.luma = (hex) => {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  };
})(globalThis);
