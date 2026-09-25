/* =========================================================
   ناشر/مشترك بسيط — تستخدمه الواجهة لتلقي أحداث اللعبة (حفظ، هدف...)
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC = G.FC || {};
  const map = {};

  FC.Events = {
    // الاشتراك في حدث
    on(name, fn) {
      (map[name] = map[name] || []).push(fn);
      return () => this.off(name, fn);
    },
    // إلغاء الاشتراك
    off(name, fn) {
      if (!map[name]) return;
      map[name] = map[name].filter((f) => f !== fn);
    },
    // إطلاق حدث مع بيانات
    emit(name, data) {
      (map[name] || []).slice().forEach((fn) => {
        try {
          fn(data);
        } catch (e) {
          if (G.console) console.error(e);
        }
      });
    },
  };
})(globalThis);
