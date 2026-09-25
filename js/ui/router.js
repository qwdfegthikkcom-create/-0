/* =========================================================
   التنقل بين الشاشات مع حركة انتقال ناعمة + الشريط العلوي والسفلي
   كل شاشة: { chrome: true/false, nav: 'home'|..., render(params) → HTML, bind(el, params) }
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC = G.FC || {};
  const UI = (FC.UI = FC.UI || {});
  const esc = FC.util.esc;

  const NAV = [
    ['home', 'الرئيسية', 'home'],
    ['week', 'الأسبوع', 'week'],
    ['club', 'النادي', 'club'],
    ['comps', 'البطولات', 'trophy'],
    ['profile', 'ملفي', 'user'],
  ];

  UI.cur = null;

  // الشريط العلوي داخل المسيرة
  function topbar(st) {
    const club = st.clubs[FC.Game.userTeam(st)];
    const unread = FC.Msg.unread(st);
    return (
      '<header class="topbar">' +
      '<button class="icon-btn" data-nav-act="pause" aria-label="القائمة">' + UI.icon('menu') + '</button>' +
      '<div class="tb-mid"><div class="tb-date">' + esc(UI.date(st)) + '</div>' +
      '<div class="tb-sub">' + esc(FC.Calendar.phaseLabel(st.week)) + ' · ' + FC.Calendar.seasonLabel(st.season) + '</div></div>' +
      '<button class="icon-btn tb-mail" data-nav-act="inbox" aria-label="الرسائل">' + UI.icon('mail') + (unread ? '<i class="dot">' + unread + '</i>' : '') + '</button>' +
      '<div class="tb-club">' + UI.badge(club, 30) + '</div>' +
      '</header>'
    );
  }
  function bottomNav(active) {
    return (
      '<nav class="bottomnav">' +
      NAV.map((n) => '<button class="bn' + (n[0] === active ? ' on' : '') + '" data-go="' + n[0] + '">' + UI.icon(n[2]) + '<span>' + n[1] + '</span></button>').join('') +
      '</nav>'
    );
  }

  // الانتقال إلى شاشة
  UI.go = function (name, params) {
    const scr = UI.screens[name];
    if (!scr) throw new Error('شاشة غير موجودة: ' + name);
    const app = document.getElementById('app');
    const st = FC.State.cur;
    let html = scr.render(params || {});
    if (scr.chrome && st) html = topbar(st) + '<main class="scr-body">' + html + '</main>' + bottomNav(scr.nav || name);
    const el = document.createElement('div');
    el.className = 'screen scr-' + name + (scr.chrome ? ' chrome' : '') + ' enter';
    el.innerHTML = html;
    const old = app.querySelector('.screen');
    if (old) {
      old.classList.add('leave');
      setTimeout(() => old.remove(), 220);
    }
    app.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('enter')));
    UI.cur = { name, params: params || {}, el };
    // التنقل العام
    el.addEventListener('click', (ev) => {
      const g = ev.target.closest('[data-go]');
      if (g) {
        if (FC.Sound) FC.Sound.click();
        UI.go(g.dataset.go, g.dataset.p ? JSON.parse(g.dataset.p) : {});
        return;
      }
      const n = ev.target.closest('[data-nav-act]');
      if (n) {
        if (FC.Sound) FC.Sound.click();
        if (n.dataset.navAct === 'pause') UI.pauseMenu();
        if (n.dataset.navAct === 'inbox') UI.inbox();
      }
    });
    if (scr.bind) scr.bind(el, params || {});
    const body = el.querySelector('.scr-body');
    if (body) body.scrollTop = 0;
    G.scrollTo && G.scrollTo(0, 0);
    return el;
  };

  // إعادة رسم الشاشة الحالية
  UI.refresh = function () {
    if (UI.cur) UI.go(UI.cur.name, UI.cur.params);
  };

  // قائمة الإيقاف المؤقت
  UI.pauseMenu = async function () {
    const v = await UI.modal('القائمة', '<p class="muted">مسيرتك تُحفظ تلقائياً كل أسبوع في الخانة ' + FC.State.slot + '.</p>', [
      { label: 'حفظ الآن', cls: 'gold', value: 'save' },
      { label: 'الحفظ والتحميل', value: 'saves' },
      { label: 'الإعدادات', value: 'settings' },
      { label: 'القائمة الرئيسية', cls: 'ghost', value: 'menu' },
    ]);
    if (v === 'save') UI.saveNow();
    else if (v === 'saves') UI.go('saves', { from: UI.cur && UI.cur.name });
    else if (v === 'settings') UI.go('settings', { from: UI.cur && UI.cur.name });
    else if (v === 'menu') {
      await UI.saveNow(true);
      UI.go('menu');
    }
  };

  // حفظ فوري في الخانة الحالية
  UI.saveNow = async function (silent) {
    const st = FC.State.cur;
    if (!st) return;
    try {
      await FC.Save.save(FC.State.slot, st);
      if (!silent) UI.toast('تم الحفظ في الخانة ' + FC.State.slot, 'ok');
    } catch (e) {
      console.error(e);
      UI.toast('تعذّر الحفظ: ' + e.message, 'bad');
    }
  };

  // صندوق الرسائل
  UI.inbox = function (focusId) {
    const st = FC.State.cur;
    const list = st.inbox;
    const html = list.length
      ? '<div class="inbox">' +
        list
          .map(
            (m) =>
              '<details class="msg' + (m.read ? '' : ' unread') + '" data-id="' + m.id + '"' + (m.id === focusId ? ' open' : '') + '><summary><span class="msg-from">' + esc(FC.Msg.FROM[m.from] || m.from) + '</span><span class="msg-t">' + esc(m.title) + '</span><span class="msg-d">' + FC.Calendar.seasonLabel(m.s) + ' · أ' + (m.wk + 1) + '</span></summary><p>' + esc(m.body) + '</p></details>'
          )
          .join('') +
        '</div>'
      : '<p class="muted">لا توجد رسائل بعد.</p>';
    UI.modal('الرسائل', html, [], {
      cls: 'wide',
      onOpen(el) {
        el.querySelectorAll('details.msg').forEach((d) =>
          d.addEventListener('toggle', () => {
            const m = list.find((x) => x.id === parseInt(d.dataset.id, 10));
            if (m && d.open) {
              m.read = true;
              d.classList.remove('unread');
            }
          })
        );
        const f = el.querySelector('details[open]');
        if (f) f.dispatchEvent(new Event('toggle'));
      },
    }).then(() => {
      if (UI.cur && UI.screens[UI.cur.name].chrome) UI.refresh();
    });
  };
})(globalThis);
