/* =========================================================
   الإعدادات: وضع المباراة، سرعة التعليق، الصوت، الصعوبة، الحفظ
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC;
  const UI = FC.UI;

  function seg(name, cur, list) {
    return '<div class="seg-btns">' + list.map((x) => '<button class="' + (String(x[0]) === String(cur) ? 'on' : '') + '" data-set="' + name + '" data-v="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>';
  }

  UI.screens.settings = {
    render(p) {
      const s = FC.Save.loadSettings();
      const st = FC.State.cur;
      return (
        '<div class="page">' +
        '<div class="page-h"><button class="icon-btn" data-act="back">' + UI.icon('back') + '</button><h2>الإعدادات</h2></div>' +
        '<div class="panel form">' +
        '<div class="seg col"><span>وضع المباراة</span>' + seg('matchMode', s.matchMode, [['full', 'مباراة كاملة'], ['play', 'لحظات'], ['mixed', 'مختلط'], ['auto', 'تلقائي']]) +
        '<p class="muted small">مباراة كاملة: تتحكم بلاعبك طوال المباراة في ملعب ثلاثي الأبعاد (مثل مهنة اللاعب). لحظات: تعليق مع لحظاتك الحاسمة فقط. مختلط: الفرص الكبرى فقط. تلقائي: بدون لعب.</p></div>' +
        '<div class="seg col"><span>مدة المباراة الكاملة (دقائق حقيقية)</span>' + seg('fullLength', s.fullLength, FC.BAL.full.lengths.map((n) => [n, n + ' د'])) + '</div>' +
        '<div class="seg col"><span>الكاميرا</span>' + seg('cam', s.cam, [['auto', 'تلقائي'], ['tv', 'تلفزيونية'], ['pro', 'خلف اللاعب'], ['wide', 'واسعة']]) +
        '<p class="muted small">تلقائي: تلفزيونية عند إمالة الهاتف أفقياً، وخلف اللاعب عند الوضع العمودي.</p></div>' +
        '<div class="seg col"><span>سرعة التعليق الافتراضية</span>' + seg('speed', s.speed, [[1, 'بطيئة ×1'], [2, 'عادية ×2'], [4, 'سريعة ×4']]) + '</div>' +
        '<div class="seg col"><span>الصوت</span>' + seg('sound', s.sound ? 1 : 0, [[1, 'مفعّل'], [0, 'مكتوم']]) + '</div>' +
        (st
          ? '<div class="seg col"><span>الصعوبة (لهذه المسيرة)</span>' + seg('diff', st.diff, [['easy', 'سهل'], ['real', 'واقعي'], ['hard', 'صعب']]) + '<p class="muted small">تغيير الصعوبة يؤثر على سرعة التطور وصعوبة اللحظات من الآن، ولا يغيّر إمكاناتك.</p></div>'
          : '') +
        '</div>' +
        '<div class="panel"><h3>الحفظ</h3><div class="row gap">' +
        (st ? '<button class="btn gold" data-act="save">حفظ الآن</button><button class="btn" data-act="export">تصدير ملف</button>' : '') +
        '<button class="btn ghost" data-act="saves">الحفظ والتحميل والاستيراد</button></div></div>' +
        (st ? '<div class="panel"><h3>الشرح</h3><button class="btn ghost" data-act="tut">إعادة عرض الشرح</button></div>' : '') +
        '<p class="muted small center">مسيرة نجم — المرحلة 2 · كل الرسومات والأصوات مولّدة بدون ملفات خارجية</p>' +
        '</div>'
      );
    },
    bind(el, p) {
      const back = () => UI.go(p.from || (FC.State.cur ? 'home' : 'menu'));
      el.addEventListener('click', (ev) => {
        const t = ev.target.closest('button');
        if (!t) return;
        if (FC.Sound) FC.Sound.click();
        if (t.dataset.set) {
          const s = FC.Save.loadSettings();
          const k = t.dataset.set;
          const v = t.dataset.v;
          if (k === 'diff') FC.State.cur.diff = v;
          else if (k === 'speed' || k === 'fullLength') s[k] = parseInt(v, 10);
          else if (k === 'sound') s.sound = v === '1';
          else s[k] = v;
          FC.Save.saveSettings(s);
          FC.Sound.enabled = s.sound;
          return UI.go('settings', p);
        }
        const a = t.dataset.act;
        if (a === 'back') back();
        if (a === 'save') UI.saveNow();
        if (a === 'export') UI.exportSave();
        if (a === 'saves') UI.go('saves', { from: 'settings' });
        if (a === 'tut') {
          FC.State.cur.flags.tutDone = false;
          FC.State.cur.flags.introShown = false;
          UI.go('home');
          UI.intro();
        }
      });
    },
  };
})(globalThis);
