/* =========================================================
   الشاشة الرئيسية + ملخص الأسبوع + شرح البداية
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC;
  const UI = FC.UI;
  const U = FC.util;
  const esc = U.esc;

  // لوحة المباراة القادمة
  function nextMatchPanel(st) {
    const team = FC.Game.userTeam(st);
    const nf = FC.Game.nextFixture(st);
    if (!nf) return '<div class="panel next"><h3>المباراة القادمة</h3><p class="muted">لا مباريات متبقية هذا الموسم.</p></div>';
    const opp = st.clubs[nf.opp];
    const me = st.clubs[team];
    const L = st.leagues[nf.lg];
    const thisWeek = nf.week === st.week;
    const role = FC.Game.predictedRole(st);
    const oppPos = FC.Comp.position(st, nf.lg, nf.opp);
    const form = FC.Comp.clubForm(st, nf.lg, nf.opp, 5);
    const H = nf.home ? me : opp;
    const A = nf.home ? opp : me;
    let note = '';
    if (!thisWeek) {
      const ph = FC.Calendar.phase(st.week);
      note = '<div class="note">' + (ph === 'pre' ? 'فترة الإعداد: لا مباريات رسمية هذا الأسبوع' : FC.Calendar.isIntlBreak(st.week) ? 'توقف دولي: لا مباريات للأندية هذا الأسبوع' : 'لا مباراة لفريقك هذا الأسبوع') + '</div>';
    }
    return (
      '<div class="panel next' + (thisWeek ? ' now' : '') + '">' +
      '<div class="next-h"><h3>' + (thisWeek ? 'مباراة هذا الأسبوع' : 'المباراة القادمة') + '</h3><span class="muted">' + esc(L.short || L.name) + ' · الجولة ' + (nf.r + 1) + '</span></div>' +
      note +
      '<div class="vs">' +
      '<div class="vs-t">' + UI.badge(H, 44) + '<b>' + esc(H.name) + '</b></div>' +
      '<div class="vs-m"><span class="vs-d">' + esc(UI.weekDate(st, nf.week)) + '</span><span class="vs-x">VS</span><span class="vs-h">' + (nf.home ? 'على أرضك' : 'خارج أرضك') + '</span></div>' +
      '<div class="vs-t">' + UI.badge(A, 44) + '<b>' + esc(A.name) + '</b></div>' +
      '</div>' +
      '<div class="next-f"><span>دورك المتوقع: ' + UI.roleChip(role) + '</span><span>الخصم: المركز ' + oppPos + ' ' + form.map(UI.formChip).join('') + '</span></div>' +
      '</div>'
    );
  }

  // جدول مصغّر حول فريقك
  function miniTable(st) {
    const lg = FC.Game.userLeague(st);
    const team = FC.Game.userTeam(st);
    const rows = FC.Comp.table(st, lg);
    const i = rows.findIndex((r) => r.id === team);
    const from = U.clamp(i - 2, 0, Math.max(0, rows.length - 5));
    const part = rows.slice(from, from + 5);
    return (
      '<div class="panel"><div class="next-h"><h3>' + esc(st.leagues[lg].name) + '</h3><button class="link" data-go="comps" data-p=\'{"lg":"' + lg + '"}\'>الجدول كاملاً</button></div>' +
      '<table class="tbl compact"><thead><tr><th>#</th><th class="l">الفريق</th><th>ل</th><th>ف</th><th>ن</th></tr></thead><tbody>' +
      part.map((r) => '<tr class="' + (r.id === team ? 'me' : '') + '"><td>' + (rows.indexOf(r) + 1) + '</td><td class="l">' + UI.badge(st.clubs[r.id], 18) + ' ' + esc(st.clubs[r.id].short) + '</td><td>' + r.p + '</td><td dir="ltr">' + (r.gd > 0 ? '+' : '') + r.gd + '</td><td><b>' + r.pts + '</b></td></tr>').join('') +
      '</tbody></table></div>'
    );
  }

  function seasonStats(u) {
    const s = u.season;
    const avg = s.ap ? U.round1(s.rs / s.ap) : null;
    return (
      '<div class="panel"><h3>موسمك</h3><div class="stat-grid">' +
      '<div><b>' + s.ap + '</b><span>مباراة</span></div>' +
      '<div><b>' + s.g + '</b><span>هدف</span></div>' +
      '<div><b>' + s.a + '</b><span>صناعة</span></div>' +
      '<div>' + UI.rating(avg) + '<span>متوسط التقييم</span></div>' +
      '<div><b>' + s.motm + '</b><span>رجل المباراة</span></div>' +
      '<div><b>' + Math.round(s.mn) + '</b><span>دقيقة</span></div>' +
      '</div></div>'
    );
  }

  function messages(st) {
    const list = st.inbox.slice(0, 3);
    return (
      '<div class="panel"><div class="next-h"><h3>الرسائل</h3><button class="link" data-act="inbox">عرض الكل</button></div>' +
      (list.length
        ? list.map((m) => '<button class="msg-row' + (m.read ? '' : ' unread') + '" data-msg="' + m.id + '"><span class="msg-from">' + esc(FC.Msg.FROM[m.from] || m.from) + '</span><span class="msg-t">' + esc(m.title) + '</span></button>').join('')
        : '<p class="muted">لا رسائل.</p>') +
      '</div>'
    );
  }

  UI.screens.home = {
    chrome: true,
    nav: 'home',
    render() {
      const st = FC.State.cur;
      const u = st.user;
      const club = st.clubs[FC.Game.userTeam(st)];
      const pr = FC.Player.potRange(st, u);
      const wk = st.wk;
      const fx = FC.Game.userFixtureRef(st);
      let cta;
      if (!wk.planned) cta = '<button class="btn gold big" data-go="week">' + UI.icon('week') + ' خطة الأسبوع</button>';
      else if (fx && !wk.played) cta = '<button class="btn gold big" data-go="matchPre">' + UI.icon('whistle') + ' إلى المباراة</button>';
      else cta = '<button class="btn gold big" data-act="endweek">' + UI.icon('play') + ' إنهاء الأسبوع</button>';
      const form = u.form.slice().reverse();
      return (
        (st.flags.tutDone ? '' : '<div class="panel tut"><h3>كيف تلعب؟</h3><ol><li>كل أسبوع: اختر <b>خطة الأسبوع</b> (تدريب فردي، راحة، تحليل فيديو، عائلة).</li><li>العب <b>مباراتك</b>: عند اللحظات الحاسمة تتوقف المباراة — اسحب من الكرة للخلف ثم أفلت للتسديد، أو اضغط زميلاً للتمرير.</li><li><b>أنهِ الأسبوع</b>: تُحاكى كل الدوريات وترى تطورك (+1) ويُحفظ تقدمك تلقائياً.</li><li>تطوّر مع فريق الشباب حتى يطلبك <b>الفريق الأول</b>.</li></ol><button class="btn small" data-act="tut">فهمت</button></div>') +
        '<section class="hero">' +
        '<div class="hero-card">' + UI.card(u, { club, shine: !!st.flags.shine }) + '</div>' +
        '<div class="hero-info panel">' +
        '<h2>' + esc(FC.Player.displayName(u)) + '</h2>' +
        '<div class="hero-sub">' + UI.flag(u.nat, 14) + ' ' + esc(FC.Player.POS[u.pos].name) + ' · ' + u.age + ' سنة · ' + UI.badge(club, 18) + ' ' + esc(club.name) + (u.team === 'Y' ? ' <span class="chip-tag">الشباب</span>' : '') + '</div>' +
        '<div class="hero-pot">الإمكانات المقدّرة <b dir="ltr">' + pr[0] + '–' + pr[1] + '</b></div>' +
        UI.meter('اللياقة', u.fit) +
        UI.meter('المعنويات', u.morale) +
        UI.meter('ثقة المدرب', u.trust) +
        '<div class="form-row"><span>الفورمة</span>' + (form.length ? form.map((r) => UI.rating(r)).join('') : '<span class="muted small">لا مباريات بعد</span>') + '</div>' +
        '</div></section>' +
        '<section class="cta">' + cta + '<button class="btn ghost" data-act="quick">' + UI.icon('fast') + ' محاكاة الأسبوع بسرعة</button></section>' +
        '<div class="grid2">' + nextMatchPanel(st) + messages(st) + miniTable(st) + seasonStats(u) + '</div>'
      );
    },
    bind(el) {
      const st = FC.State.cur;
      st.flags.shine = false;
      el.addEventListener('click', async (ev) => {
        const t = ev.target.closest('[data-act],[data-msg]');
        if (!t) return;
        if (t.dataset.msg) return UI.inbox(parseInt(t.dataset.msg, 10));
        const a = t.dataset.act;
        if (a === 'inbox') UI.inbox();
        if (a === 'tut') {
          st.flags.tutDone = true;
          UI.refresh();
        }
        if (a === 'endweek') UI.endWeek();
        if (a === 'quick') UI.quickWeek();
      });
    },
  };

  // إنهاء الأسبوع ← ملخص الأسبوع ← حفظ تلقائي
  UI.endWeek = async function () {
    const st = FC.State.cur;
    const fx = FC.Game.userFixtureRef(st);
    if (fx && !st.wk.played) {
      const ok = await UI.modal('مباراتك لم تُلعب', '<p>ستُحاكى مباراتك تلقائياً بدون لحظات. هل تريد المتابعة؟</p>', [
        { label: 'نعم، حاكِها', cls: 'gold', value: true },
        { label: 'إلى المباراة', value: false },
      ]);
      if (ok === false) return UI.go('matchPre');
      if (ok !== true) return;
    }
    if (!st.wk.planned) FC.Game.applyPlan(st, FC.Game.autoPlan(st));
    const rep = FC.Game.endWeek(st);
    UI.go('report', { rep });
    UI.saveNow(true);
  };

  // أسبوع كامل بسرعة (خطة تلقائية + مباراة تلقائية)
  UI.quickWeek = async function () {
    const st = FC.State.cur;
    if (!st.wk.planned) FC.Game.applyPlan(st, FC.Game.autoPlan(st));
    let last = null;
    if (FC.Game.userFixtureRef(st) && !st.wk.played) last = FC.Game.simUserMatchAuto(st);
    const rep = FC.Game.endWeek(st);
    rep.quickMatch = last;
    UI.go('report', { rep });
    UI.saveNow(true);
  };

  // ================= ملخص الأسبوع =================
  UI.screens.report = {
    chrome: true,
    nav: 'home',
    render(p) {
      const st = FC.State.cur;
      const rep = p.rep || st.lastReport;
      if (!rep) return '<div class="panel">لا يوجد ملخص.</div>';
      const u = st.user;
      let html = '<div class="page-h"><h2>ملخص الأسبوع ' + (rep.week + 1) + '</h2><span class="muted">' + FC.Calendar.seasonLabel(rep.season) + '</span></div>';
      if (rep.promoted) html += '<div class="banner gold">🎉 تم تصعيدك إلى الفريق الأول! قميصك رقم <b>' + u.num + '</b></div>';
      if (rep.quickMatch) {
        const q = rep.quickMatch;
        const h = st.clubs[q.home];
        const a = st.clubs[q.away];
        html += '<div class="panel"><h3>نتيجة مباراتك</h3><div class="res-line">' + UI.badge(h, 22) + ' ' + esc(h.short) + ' ' + UI.score(q.score[0], q.score[1]) + ' ' + esc(a.short) + ' ' + UI.badge(a, 22) + '</div>' +
          (q.played ? '<p>تقييمك ' + UI.rating(q.rating) + ' · ' + q.userStats.g + ' هدف · ' + q.userStats.a + ' صناعة · ' + q.userStats.mn + ' دقيقة</p>' : '<p class="muted">' + (q.role === 'bench' ? 'بقيت على الدكة.' : 'لم تكن ضمن القائمة.') + '</p>') + '</div>';
      }
      if (rep.seasonEnd && rep.snap) {
        const lg = FC.Game.userLeague(st);
        const champ = st.clubs[rep.snap.champs[lg]];
        const hist = u.history[u.history.length - 1];
        html += '<div class="panel season-end"><h3>🏆 نهاية الموسم</h3>' +
          (champ ? '<p>بطل ' + esc(st.leagues[lg].name) + ': ' + UI.badge(champ, 22) + ' <b>' + esc(champ.name) + '</b></p>' : '') +
          (hist ? '<div class="stat-grid"><div><b>' + hist.ap + '</b><span>مباراة</span></div><div><b>' + hist.g + '</b><span>هدف</span></div><div><b>' + hist.a + '</b><span>صناعة</span></div><div>' + UI.rating(hist.avg || null) + '<span>المتوسط</span></div><div><b>' + hist.pos + '</b><span>مركز الفريق</span></div><div><b>' + hist.ovr + '</b><span>تقييمك</span></div></div>' : '') +
          '<p class="muted small">حفل الجوائز الكامل يأتي في المرحلة 6.</p></div>';
      }
      if (rep.newSeason) html += '<div class="banner">🌅 بداية موسم جديد ' + FC.Calendar.seasonLabel(st.season) + ' — عمرك الآن ' + u.age + '</div>';
      // التطور
      const ovr = FC.Player.ovr(u);
      html += '<div class="panel"><div class="next-h"><h3>تطورك</h3><span>التقييم <b>' + Math.floor(ovr) + '</b></span></div>';
      if (rep.ups.length) {
        html += '<div class="ups">' + rep.ups.map((x) => '<div class="up ' + (x.d > 0 ? 'pos' : 'neg') + '"><span>' + (x.d > 0 ? '▲ +' + x.d : '▼ ' + x.d) + '</span><b>' + esc(FC.Player.LABEL[x.k]) + '</b><i>' + x.v + '</i></div>').join('') + '</div>';
      } else html += '<p class="muted">لا زيادات كاملة هذا الأسبوع — التطور يتراكم بكسور صغيرة، استمر!</p>';
      html += '</div>';
      // نتائج الدوري
      const lg = FC.Game.userLeague(st);
      if (rep.results.length && st.leagues[lg]) {
        const team = FC.Game.userTeam(st);
        html += '<div class="panel"><h3>نتائج ' + esc(st.leagues[lg].name) + '</h3><div class="results">' +
          rep.results.map((f) => '<div class="res-row' + (f[0] === team || f[1] === team ? ' me' : '') + '"><span class="rt-h">' + esc(st.clubs[f[0]].short) + '</span>' + UI.score(f[2], f[3]) + '<span class="rt-a">' + esc(st.clubs[f[1]].short) + '</span></div>').join('') +
          '</div><p class="muted small">مركز فريقك: ' + FC.Comp.position(st, lg, team) + '</p></div>';
      }
      if (rep.msgs && rep.msgs.length) html += '<div class="panel"><p>📩 لديك ' + rep.msgs.length + ' رسالة جديدة</p><button class="btn small" data-act="inbox">قراءة</button></div>';
      html += '<div class="cta"><button class="btn gold big" data-go="home">متابعة</button></div>';
      return '<div class="report">' + html + '</div>';
    },
    bind(el, p) {
      const rep = p.rep;
      if (rep && (rep.promoted || (rep.seasonEnd && rep.snap && rep.snap.champs[FC.Game.userLeague(FC.State.cur)] === FC.Game.userTeam(FC.State.cur)))) {
        setTimeout(() => UI.confetti(140), 300);
        FC.State.cur.flags.shine = true;
      }
      if (rep && rep.ups.some((x) => x.d > 0) && Math.floor(FC.Player.ovr(FC.State.cur.user)) > (FC.State.cur.flags.lastOvr || 0)) {
        FC.State.cur.flags.shine = true;
      }
      FC.State.cur.flags.lastOvr = Math.floor(FC.Player.ovr(FC.State.cur.user));
      el.addEventListener('click', (ev) => {
        const t = ev.target.closest('[data-act=inbox]');
        if (t) UI.inbox();
      });
    },
  };

  // شرح قصير في البداية
  UI.intro = function () {
    const st = FC.State.cur;
    if (!st || st.flags.introShown) return;
    st.flags.introShown = true;
    const u = st.user;
    UI.modal(
      'أهلاً بك يا ' + (u.nick || u.fn),
      '<p>عمرك 16 سنة وتبدأ مع <b>فريق الشباب</b>. كل أسبوع تخطط لتدريبك، تلعب مباراتك، وتشاهد تطورك.</p><p>في المباريات تتحكم بلاعبك فقط في <b>اللحظات الحاسمة</b>: اسحب من الكرة للخلف (مثل المقلاع) ثم أفلت للتسديد، أو اضغط على زميل لتمرر له.</p><p class="muted small">يمكنك دائماً الضغط على «لعب تلقائي» داخل اللحظة.</p>',
      [{ label: 'لنبدأ!', cls: 'gold', value: 1 }]
    );
  };
})(globalThis);
