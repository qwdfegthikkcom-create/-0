/* =========================================================
   تشغيل اللعبة
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC;

  function boot() {
    const s = FC.Save.loadSettings();
    FC.Sound.enabled = s.sound;
    FC.UI.go('menu');
    // الأخطاء غير المتوقعة تظهر كإشعار بدل أن تكسر اللعبة بصمت
    G.addEventListener('error', (e) => {
      if (FC.UI && FC.UI.toast) FC.UI.toast('حدث خطأ: ' + (e.message || ''), 'bad');
    });
    G.addEventListener('unhandledrejection', (e) => {
      if (FC.UI && FC.UI.toast) FC.UI.toast('حدث خطأ: ' + ((e.reason && e.reason.message) || ''), 'bad');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(globalThis);
