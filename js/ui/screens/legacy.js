/* =========================================================
   المرحلة 6: حفل الجوائز المتحرك، ملخص المسيرة والإرث عند الاعتزال، قاعة المشاهير،
   الإنجازات وخزانة الألقاب
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC;
  const UI = FC.UI;
  const U = FC.util;
  const esc = U.esc;
  const money = (n) => FC.Econ.fmt(n);

  // بطاقة فائز
  function winner(st, r, extra) {
    if (!r) return '<div class="aw-card none"><p class="muted">لم تُمنح هذا الموسم</p></div>';
    const me = r.pid === 0;
    const club = st.clubs[r.club];
    return (
      '<div class="aw-card' + (me ? ' me' : '') + '">' +
      (me ? UI.face(st.user.face, club ? club.c1 : null, 86) : '<div class="aw-avatar">' + UI.flag(r.nat, 40) + '</div>') +
      '<b class="aw-name">' + esc(r.name) + (me ? ' <span class="chip-tag cap">أنت!</span>' : '') + '</b>' +
      '<span class="aw-sub">' + UI.flag(r.nat, 12) + ' ' + (club ? UI.badge(club, 16) + ' ' + esc(club.name) : esc(r.clubName || '')) + '</span>' +
      '<span class="aw-stats">' + (extra || (r.g != null ? '⚽ ' + r.g + ' · 🅰️ ' + (r.a || 0) + (r.avg ? ' · متوسط ' + r.avg : '') : '')) + '</span>' +
      '</div>'
    );
  }

  // تشكيلة الموسم على ملعب
  function totsPitch(st, list) {
    const XY = { GK: [[50, 90]], RB: [[86, 70]], CB: [[62, 76], [38, 76]], LB: [[14, 70]], MID: [[72, 50], [50, 56], [28, 50]], RW: [[82, 24]], ST: [[50, 16]], LW: [[18, 24]] };
    const used = {};
    return (
      '<div class="tots-pitch">' +
      list
        .map((r) => {
          const k = r.slot;
          const i = (used[k] = (used[k] || 0) + 1) - 1;
          const xy = (XY[k] || [[50, 50]])[i] || [50, 50];
          return '<div class="tots-p' + (r.pid === 0 ? ' me' : '') + '" style="left:' + xy[0] + '%;top:' + xy[1] + '%">' + UI.flag(r.nat, 12) + '<b>' + esc(r.name.split(' ').slice(-1)[0]) + '</b><small>' + esc(r.clubName || '') + '</small></div>';
        })
        .join('') +
      '</div>'
    );
  }

  // ================= حفل الجوائز =================
  UI.screens.awards = {
    chrome: false,
    render(p) {
      const st = FC.State.cur;
      const season = p.season != null ? p.season : st.season;
      const snap = (st.history.seasons || []).find((s) => s.season === season);
      if (!snap) return '<div class="page"><p>لا توجد جوائز.</p><button class="btn" data-go="home">الرئيسية</button></div>';
      const slides = [];
      if (p.kind === 'global') {
        const g = snap.global;
        if (!g) return '<div class="page"><p>لم تُعلن الجوائز العالمية بعد.</p><button class="btn" data-go="home">الرئيسية</button></div>';
        slides.push(['أفضل لاعب تحت 21 في العالم', winner(st, g.boy), g.boy && g.boy.pid === 0]);
        slides.push(['أفضل حارس في العالم', winner(st, g.gk), g.gk && g.gk.pid === 0]);
        const rest = g.ballon.slice(3);
        slides.push(['الكرة الذهبية: المراكز 4–30', '<div class="bl-list">' + rest.map((r) => '<div class="bl-row' + (r.pid === 0 ? ' me' : '') + '"><b>' + r.rank + '</b>' + UI.flag(r.nat, 12) + '<span>' + esc(r.name) + '</span><small>' + esc(r.clubName) + '</small></div>').join('') + '</div>' + (g.userRank > 30 ? '<p class="muted small">ترتيبك: ' + g.userRank + '</p>' : ''), rest.some((r) => r.pid === 0)]);
        [2, 1, 0].forEach((i) => g.ballon[i] && slides.push([i === 0 ? '🏐 الكرة الذهبية ' + (season + 1) : 'الكرة الذهبية: المركز ' + (i + 1), winner(st, g.ballon[i]), g.ballon[i].pid === 0]));
      } else {
        const lg = st.leagues[p.lg] && snap.awards && snap.awards[p.lg] ? p.lg : FC.Game.userLeague(st);
        const A = (snap.awards || {})[lg];
        if (!A) return '<div class="page"><p>لا جوائز لهذا الدوري.</p><button class="btn" data-go="home">الرئيسية</button></div>';
        const L = st.leagues[lg];
        slides.push(['أفضل لاعب شاب — ' + L.short, winner(st, A.young), A.young && A.young.pid === 0]);
        slides.push(['هداف ' + L.name, winner(st, A.top, A.top ? '⚽ ' + A.top.g + ' هدفاً' : ''), A.top && A.top.pid === 0]);
        if (snap.awards.club && snap.awards.club.team) slides.push(['أفضل لاعب في ' + (st.clubs[snap.awards.club.team] ? st.clubs[snap.awards.club.team].name : 'ناديك'), winner(st, snap.awards.club), snap.awards.club.pid === 0]);
        slides.push(['تشكيلة الموسم', totsPitch(st, A.tots), A.tots.some((r) => r.pid === 0)]);
        slides.push(['🏆 أفضل لاعب في ' + L.name, winner(st, A.poty), A.poty && A.poty.pid === 0]);
      }
      return (
        '<div class="ceremony">' +
        '<div class="cer-bg"><i></i><i></i><i></i></div>' +
        '<div class="cer-h"><span class="gold-text">' + (p.kind === 'global' ? 'حفل الجوائز العالمية' : 'حفل جوائز الموسم') + '</span><small>' + FC.Calendar.seasonLabel(season) + '</small></div>' +
        slides.map((s, i) => '<section class="cer-slide' + (i === 0 ? ' on' : '') + '" data-i="' + i + '" data-me="' + (s[2] ? 1 : 0) + '"><h2>' + esc(s[0]) + '</h2><div class="cer-env"><span>والجائزة تذهب إلى…</span></div><div class="cer-win">' + s[1] + '</div></section>').join('') +
        '<div class="cer-foot"><button class="btn gold big" data-act="reveal">اكشف الفائز</button><button class="btn ghost" data-act="skip">تخطي الحفل</button></div>' +
        '</div>'
      );
    },
    bind(el, p) {
      const slides = [...el.querySelectorAll('.cer-slide')];
      let i = 0;
      let open = false;
      const btn = el.querySelector('[data-act=reveal]');
      const done = () => UI.go(p.back || 'home', p.backP || {});
      el.addEventListener('click', (ev) => {
        const t = ev.target.closest('[data-act]');
        if (!t) return;
        if (t.dataset.act === 'skip') return done();
        if (!open) {
          // فتح الظرف
          slides[i].classList.add('open');
          open = true;
          if (FC.Sound) FC.Sound.whistle(1);
          if (slides[i].dataset.me === '1') UI.confetti(160);
          btn.textContent = i === slides.length - 1 ? 'متابعة' : 'الجائزة التالية';
          return;
        }
        if (i === slides.length - 1) return done();
        slides[i].classList.remove('on');
        i++;
        slides[i].classList.add('on');
        open = false;
        btn.textContent = 'اكشف الفائز';
      });
    },
  };

  // ================= ملخص المسيرة والإرث =================
  UI.legacyHtml = function (e, own) {
    const T = FC.Legacy.TIERS;
    const tc = e.trophyCount || {};
    const trophyLine = [['league', '🏆 دوري'], ['cup', '🥇 كأس'], ['cont', '⭐ قارية'], ['nt', '🌍 منتخب']].map((x) => (tc[x[0]] ? '<span>' + x[1] + ' ×' + tc[x[0]] + '</span>' : '')).join('');
    const awardsBy = {};
    (e.awards || []).forEach((a) => (awardsBy[a.name] = (awardsBy[a.name] || 0) + 1));
    return (
      '<div class="legacy">' +
      '<div class="panel lg-head"><div class="lg-face">' + UI.face(e.face, '#1f4e9e', 110) + '</div><div class="lg-info"><h2>' + esc(e.name) + (e.nick ? ' <small class="muted">«' + esc(e.nick) + '»</small>' : '') + '</h2>' +
      '<p>' + UI.flag(e.nat, 14) + ' ' + esc(FC.Player.POS[e.pos] ? FC.Player.POS[e.pos].name : e.pos) + ' · ' + e.from + '–' + (e.to + 1) + ' · اعتزل في ' + e.age + '</p>' +
      '<div class="tier tier-' + e.tier + '"><span>' + e.tierIcon + '</span><b>' + esc(e.tierName) + '</b><small>' + e.pts + ' نقطة إرث</small></div>' +
      '<div class="tier-bar">' + T.map((t, k) => '<i class="' + (k <= e.tier ? 'on' : '') + '" title="' + esc(t.name) + '">' + t.icon + '</i>').join('') + '</div>' +
      '</div></div>' +
      '<div class="panel"><h3>الأرقام</h3><div class="stat-grid">' +
      '<div><b>' + e.ap + '</b><span>مباراة</span></div><div><b>' + e.g + '</b><span>هدف</span></div><div><b>' + e.a + '</b><span>صناعة</span></div>' +
      '<div><b>' + e.caps + '</b><span>مباراة دولية</span></div><div><b>' + e.ig + '</b><span>هدف دولي</span></div><div><b>' + e.motm + '</b><span>رجل المباراة</span></div>' +
      '<div><b>' + e.peakOvr + '</b><span>أعلى تقييم</span></div><div><b dir="ltr">' + esc(money(e.peakVal || 0)) + '</b><span>أعلى قيمة</span></div><div><b>' + (e.peakFame || 0) + '</b><span>أعلى شهرة</span></div>' +
      '</div></div>' +
      '<div class="panel"><h3>الألقاب والجوائز</h3>' + (trophyLine ? '<div class="lg-tro">' + trophyLine + '</div>' : '<p class="muted">لا ألقاب.</p>') +
      (Object.keys(awardsBy).length ? '<ul class="lg-aw">' + Object.keys(awardsBy).map((k) => '<li>' + esc(k) + (awardsBy[k] > 1 ? ' ×' + awardsBy[k] : '') + '</li>').join('') + '</ul>' : '<p class="muted small">لا جوائز فردية.</p>') + '</div>' +
      '<div class="panel"><h3>الخط الزمني للأندية</h3><div class="timeline">' +
      (e.clubs || []).map((c) => '<div class="tl-row' + (c.youth ? ' y' : '') + '"><span class="tl-y">' + c.from + (c.to !== c.from ? '–' + (c.to + 1) : '') + '</span><b>' + esc(c.name) + '</b><span class="muted">' + c.ap + ' م · ' + c.g + ' هـ · ' + c.a + ' ص</span></div>').join('') +
      '</div></div>' +
      '<div class="panel"><h3>الأرقام القياسية</h3>' +
      '<div class="kv"><span>أفضل موسم</span><b>' + (e.records.bestSeason ? e.records.seasonG + ' هدفاً (' + FC.Calendar.seasonLabel(e.records.bestSeason.s) + ' مع ' + esc(e.records.bestSeason.club) + ')' : '—') + '</b></div>' +
      '<div class="kv"><span>هاتريك</span><b>' + e.records.hat + '</b></div>' +
      '<div class="kv"><span>أكثر أهداف في مباراة</span><b>' + e.records.maxG + '</b></div>' +
      '<div class="kv"><span>أعلى تقييم في مباراة</span><b>' + (e.records.bestR || '—') + '</b></div>' +
      '<div class="kv"><span>الإنجازات</span><b>' + (e.ach || 0) + ' / ' + FC.Legacy.ACH.length + '</b></div>' +
      (e.rival && e.rival.name ? '<div class="kv"><span>الغريم</span><b>' + esc(e.rival.name) + '</b></div>' : '') +
      '</div>' +
      '</div>'
    );
  };

  UI.screens.legacy = {
    chrome: true,
    nav: 'profile',
    render(p) {
      const st = FC.State.cur;
      const e = p.entry || (st && st.legacy);
      if (!e) return '<div class="panel"><p class="muted">لا يوجد ملخص مسيرة.</p><button class="btn" data-go="home">الرئيسية</button></div>';
      const own = !p.entry;
      return (
        '<div class="page-h"><h2>' + (own ? 'نهاية المسيرة' : 'قاعة المشاهير') + '</h2></div>' +
        (own ? '<div class="banner gold">🎖️ شكراً على مسيرة لا تُنسى — حُفظت في قاعة المشاهير</div>' : '') +
        UI.legacyHtml(e, own) +
        '<div class="cta">' +
        (own ? '<button class="btn gold big" data-act="newcareer">مسيرة جديدة</button>' : '') +
        '<button class="btn" data-go="hof">قاعة المشاهير</button>' +
        (own ? '<button class="btn ghost" data-go="menu">القائمة الرئيسية</button>' : '<button class="btn ghost" data-go="menu">القائمة</button>') +
        '</div>'
      );
    },
    bind(el, p) {
      const st = FC.State.cur;
      const own = !p.entry;
      if (own && st && st.legacy && !st.legacyStored && FC.Save.hofAdd) {
        FC.Save.hofAdd(st.legacy).then((l) => {
          st.legacyStored = true;
          UI.hofCache = l;
          UI.saveNow(true);
        });
      }
      if (own) setTimeout(() => UI.confetti(120), 300);
      el.addEventListener('click', (ev) => {
        const t = ev.target.closest('[data-act=newcareer]');
        if (!t) return;
        FC.Save.hofList().then((l) => {
          UI.hofCache = l;
          UI.go('create');
        });
      });
    },
  };

  // ================= قاعة المشاهير =================
  UI.screens.hof = {
    render(p) {
      const list = UI.hofCache || [];
      return (
        '<div class="page hof">' +
        '<div class="page-h"><button class="icon-btn" data-go="menu">' + UI.icon('back') + '</button><h2>قاعة المشاهير</h2></div>' +
        (list.length
          ? '<div class="hof-list">' +
            list
              .map((e, i) => '<button class="panel hof-row" data-i="' + i + '"><span class="hof-t">' + e.tierIcon + '</span><div><b>' + esc(e.name) + '</b><small class="muted">' + UI.flag(e.nat, 11) + ' ' + esc(FC.Player.POS[e.pos] ? FC.Player.POS[e.pos].short : e.pos) + ' · ' + e.from + '–' + (e.to + 1) + ' · ' + esc(e.tierName) + '</small></div><span class="hof-s">' + e.g + ' هـ<br>' + e.ap + ' م</span></button>')
              .join('') +
            '</div>'
          : '<div class="panel"><p>القاعة فارغة بعد. عندما تعتزل، تُحفظ مسيرتك هنا إلى الأبد، ويمكنك بدء مسيرة جديدة كـ«ابن الأسطورة».</p></div>') +
        '</div>'
      );
    },
    bind(el) {
      if (FC.Save.hofList && !UI.hofLoaded) {
        UI.hofLoaded = true;
        FC.Save.hofList().then((l) => {
          UI.hofCache = l;
          UI.go('hof');
        });
      }
      el.addEventListener('click', (ev) => {
        const t = ev.target.closest('[data-i]');
        if (!t) return;
        const e = (UI.hofCache || [])[parseInt(t.dataset.i, 10)];
        if (e) UI.go('legacy', { entry: e });
      });
    },
  };

  // ================= الإنجازات وخزانة الألقاب (في ملفك) =================
  UI.achPanel = function (st) {
    const u = st.user;
    if (!FC.Legacy) return '';
    const A = FC.Legacy.ACH;
    const got = u.ach || {};
    const n = Object.keys(got).length;
    return (
      '<div class="panel"><h3>الإنجازات (' + n + '/' + A.length + ')</h3><div class="ach-grid">' +
      A.map((a) => {
        const ok = !!got[a.id];
        const pr = !ok && a.p ? a.p(u) : null;
        return '<div class="ach' + (ok ? ' ok' : '') + '" title="' + esc(a.desc) + '"><span class="ach-i">' + (ok ? a.icon : '🔒') + '</span><b>' + esc(a.name) + '</b><small>' + (ok ? FC.Calendar.seasonLabel(got[a.id].s) : pr ? Math.min(pr[0], pr[1]) + '/' + pr[1] : esc(a.desc)) + '</small></div>';
      }).join('') +
      '</div></div>'
    );
  };

  UI.cabinet = function (st) {
    const u = st.user;
    const T = u.trophies || [];
    const A = u.awards || [];
    if (!T.length && !A.length) return '<div class="panel"><h3>خزانة الألقاب</h3><p class="muted">لا ألقاب بعد — الدوري والكأس والبطولات القارية والدولية والجوائز الفردية تنتظرك.</p></div>';
    const icon = { league: '🏆', cup: '🥇', cont: '⭐', nt: '🌍' };
    const aicon = { poty: '🥇', top: '👟', young: '🌟', lgk: '🧤', tots: '📋', club: '🛡️', ballon: '🏐', ballon3: '🥉', ballon10: '🎖️', ballon30: '🎗️', boy: '👶', wgk: '🧤' };
    return (
      '<div class="panel"><h3>خزانة الألقاب (' + T.length + ' لقباً · ' + A.length + ' جائزة)</h3>' +
      (T.length ? '<div class="trophies">' + T.slice().reverse().map((t) => '<div class="trophy"><span class="tr-i">' + (t.id === 'WC' ? '🌐' : icon[t.k] || '🏆') + '</span><b>' + esc(t.name) + '</b><small class="muted">' + FC.Calendar.seasonLabel(t.s) + (st.clubs[t.team] ? ' · ' + esc(st.clubs[t.team].short) : '') + '</small></div>').join('') + '</div>' : '') +
      (A.length ? '<h4>الجوائز الفردية</h4><div class="trophies aw">' + A.slice().reverse().map((a) => '<div class="trophy"><span class="tr-i">' + (aicon[a.k] || '🏅') + '</span><b>' + esc(a.name) + '</b><small class="muted">' + FC.Calendar.seasonLabel(a.s) + '</small></div>').join('') + '</div>' : '') +
      '</div>'
    );
  };

  // زر الاعتزال في ملفك
  UI.retirePanel = function (st) {
    const u = st.user;
    if (!FC.Legacy || u.retired || !FC.Legacy.canRetire(st)) return '';
    return (
      '<div class="panel retire"><h3>🎖️ الاعتزال</h3>' +
      (u.retirePlan
        ? '<p>أعلنت أن هذا موسمك الأخير. ستعتزل مع نهاية الموسم.</p><button class="btn ghost small" data-act="unretire">تراجعت، سأكمل</button>'
        : '<p class="muted small">عمرك ' + u.age + '. يمكنك إعلان أن هذا موسمك الأخير، أو الاعتزال فوراً إذا انتهى الموسم.</p><div class="row gap"><button class="btn small" data-act="retirePlan">موسمي الأخير</button>' + (st.week >= FC.BAL.cal.seasonEndWeek ? '<button class="btn danger small" data-act="retireNow">اعتزل الآن</button>' : '') + '</div>') +
      '<p class="muted small">تصنيف إرثك الآن: ' + FC.Legacy.TIERS[FC.Legacy.tierOf(FC.Legacy.points(st))].icon + ' ' + esc(FC.Legacy.TIERS[FC.Legacy.tierOf(FC.Legacy.points(st))].name) + ' (' + FC.Legacy.points(st) + ' نقطة)</p></div>'
    );
  };
  UI.retireAct = function (a) {
    const st = FC.State.cur;
    const u = st.user;
    if (a === 'retirePlan') {
      u.retirePlan = true;
      FC.Msg.add(st, 'club', 'موسمك الأخير', 'أعلنت أن هذا الموسم هو الأخير في مسيرتك. الجماهير تستعد لوداعك.');
      UI.toast('أعلنت موسمك الأخير', 'ok');
    } else if (a === 'unretire') {
      u.retirePlan = false;
      UI.toast('ستكمل مسيرتك');
    } else if (a === 'retireNow') {
      return UI.modal('الاعتزال', '<p>ستنتهي مسيرتك الآن وتُحفظ في قاعة المشاهير. متأكد؟</p>', [
        { label: 'نعم، أعتزل', cls: 'danger', value: true },
        { label: 'إلغاء', cls: 'ghost', value: false },
      ]).then((ok) => {
        if (!ok) return;
        FC.Legacy.retire(st, 'choice');
        UI.saveNow(true);
        UI.go('legacy');
      });
    }
    UI.saveNow(true);
    UI.refresh();
  };
})(globalThis);
