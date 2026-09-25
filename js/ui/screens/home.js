/* =========================================================
   الشاشة الرئيسية + ملخص الأسبوع + شرح البداية
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC;
  const UI = FC.UI;
  const U = FC.util;
  const esc = U.esc;

  // لوحة المباراة القادمة (أي مسابقة: الدوري، الكأس، القارية، المنتخب)
  function nextMatchPanel(st) {
    const nf = FC.Game.nextFixture(st);
    if (!nf) return '<div class="panel next"><h3>المباراة القادمة</h3><p class="muted">لا مباريات متبقية هذا الموسم.</p></div>';
    const meId = nf.me != null ? nf.me : FC.Game.userTeam(st);
    const opp = st.clubs[nf.opp];
    const me = st.clubs[meId];
    const thisWeek = nf.week === st.week;
    const H = nf.home ? me : opp;
    const A = nf.home ? opp : me;
    const label = FC.Game.refLabel(st, nf.ref);
    const oppLg = opp && st.leagues[opp.lg] ? opp.lg : null;
    const form = UI.teamForm(st, nf.opp, 5);
    const role = nf.nat ? null : FC.Game.predictedRole(st);
    let note = '';
    if (!thisWeek) {
      const ph = FC.Calendar.phase(st.week);
      note = '<div class="note">' + (ph === 'pre' ? 'فترة الإعداد: لا مباريات رسمية هذا الأسبوع' : FC.Calendar.isIntlBreak(st.week) ? 'توقف دولي: لا مباريات للأندية هذا الأسبوع' : 'لا مباراة لفريقك هذا الأسبوع') + '</div>';
    }
    // نتيجة الذهاب في مباراة الإياب
    let agg = '';
    if (nf.ref.agg) agg = '<div class="note">الذهاب: ' + esc(st.clubs[nf.ref.away].short) + ' ' + nf.ref.agg[1] + ' - ' + nf.ref.agg[0] + ' ' + esc(st.clubs[nf.ref.home].short) + '</div>';
    const where = nf.ref.n ? 'ملعب محايد' : nf.home ? 'على أرضك' : 'خارج أرضك';
    const oppInfo = oppLg ? 'الخصم: ' + esc(st.leagues[oppLg].short) + ' · المركز ' + FC.Comp.position(st, oppLg, nf.opp) : opp.nt ? 'قوة المنتخب ' + Math.round(FC.Nat.power(st, nf.opp)) : 'الخصم: ' + esc(opp.name);
    return (
      '<div class="panel next' + (thisWeek ? ' now' : '') + (nf.nat ? ' nat' : '') + '">' +
      '<div class="next-h"><h3>' + (thisWeek ? 'مباراة هذا الأسبوع' : 'المباراة القادمة') + '</h3><span class="muted">' + esc(label) + '</span></div>' +
      note + agg +
      '<div class="vs">' +
      '<div class="vs-t">' + UI.badge(H, 44) + '<b>' + esc(H.name) + '</b></div>' +
      '<div class="vs-m"><span class="vs-d">' + esc(UI.fxDate(st, nf.week, nf.d)) + '</span><span class="vs-x">VS</span><span class="vs-h">' + where + '</span></div>' +
      '<div class="vs-t">' + UI.badge(A, 44) + '<b>' + esc(A.name) + '</b></div>' +
      '</div>' +
      '<div class="next-f">' + (role ? '<span>دورك المتوقع: ' + UI.roleChip(role) + ' <button class="link" data-act="role">لماذا؟</button></span>' : '<span>🌍 مع المنتخب</span>') + '<span>' + oppInfo + ' ' + form.map(UI.formChip).join('') + '</span></div>' +
      '</div>'
    );
  }

  // مسابقاتك هذا الموسم: الكأس، القارية، المنتخب
  function compsPanel(st) {
    if (!st.comps || !FC.Cups) return '';
    const u = st.user;
    const team = FC.Game.userTeam(st);
    const rows = FC.Cups.compsOf(st, team)
      .filter((c) => !c.nat)
      .map((c) => {
        const s = FC.Cups.statusOf(st, c, team);
        return '<button class="comp-row" data-go="comps" data-p=\'{"cat":"' + (c.kind === 'cup' ? 'cup' : 'cont') + '","c":"' + c.id + '"}\'><span>' + (c.kind === 'cup' ? '🏆 ' : '⭐ ') + esc(c.name) + '</span>' + (s ? '<span class="chip-tag ' + (s.k === 'win' ? 'ok' : s.k === 'out' ? 'bad' : 'mid') + '">' + esc(s.txt) + '</span>' : '') + '</button>';
      });
    const ntId = FC.Nat ? FC.Nat.idOf(u.nat) : null;
    const I = u.intl || { caps: 0, g: 0 };
    const called = ntId != null && FC.Nat.userIn(st, ntId);
    const natComps = Object.values(st.comps).filter((c) => c.nat && c.kind !== 'fr' && c.teams.indexOf(ntId) >= 0);
    natComps.forEach((c) => {
      const s = FC.Cups.statusOf(st, c, ntId);
      rows.push('<button class="comp-row" data-go="comps" data-p=\'{"cat":"nat","c":"' + c.id + '"}\'><span>🌍 ' + esc(c.name) + '</span>' + (s ? '<span class="chip-tag ' + (s.k === 'win' ? 'ok' : s.k === 'out' ? 'bad' : 'mid') + '">' + esc(s.txt) + '</span>' : '') + '</button>');
    });
    const nat =
      '<button class="comp-row nt" data-go="nation">' + UI.flag(u.nat, 14) + ' <span>منتخب ' + esc(FC.DATA.nations[u.nat].name) + '</span><span class="chip-tag ' + (called ? 'ok' : '') + '">' + (called ? 'مستدعى' : I.caps ? 'خارج القائمة' : 'لم تُستدعَ بعد') + ' · ' + I.caps + ' مباراة / ' + I.g + ' هدف</span></button>';
    return '<div class="panel"><h3>بطولاتك هذا الموسم</h3><div class="comp-list">' + (rows.length ? rows.join('') : '<p class="muted small">ناديك لا يشارك في كؤوس هذا الموسم.</p>') + nat + '</div></div>';
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

  // تنبيهات الحالة: إصابة، عودة مبكرة، إيقاف، خطر تجدد الإصابة
  function statusAlerts(st) {
    const u = st.user;
    let h = '';
    if (u.inj) {
      const inj = u.inj;
      const done = Math.round(100 * (1 - Math.max(0, inj.days) / inj.total));
      h +=
        '<div class="panel alert bad"><div class="al-h"><span class="al-i">🚑</span><div><b>مصاب: ' + esc(inj.name) + '</b><span class="muted small">متبقٍ تقريباً ' + esc(FC.Status.durationText(Math.max(1, inj.days))) + ' · العلاج الطبيعي يسرّع العودة</span></div></div>' +
        '<div class="m-track"><i style="width:' + done + '%"></i></div>' +
        (inj.offer ? '<p class="small">الجهاز الطبي يعرض عليك <b>عودة مبكرة</b> الآن، مع خطر أعلى لتجدد الإصابة.</p><div class="row gap"><button class="btn small gold" data-early="1">أعود مبكراً</button><button class="btn small ghost" data-early="0">أكمل العلاج</button></div>' : '') +
        '</div>';
    }
    if (u.ban > 0) h += '<div class="panel alert"><div class="al-h"><span class="al-i">🟥</span><div><b>موقوف ' + (u.ban === 1 ? 'مباراة واحدة' : u.ban + ' مباريات') + '</b><span class="muted small">لن تكون ضمن القائمة حتى ينتهي الإيقاف · الصفراء هذا الموسم: ' + (u.season.ycCount || 0) + '</span></div></div></div>';
    else if ((u.season.ycCount || 0) % FC.BAL.inj.yellowLimit === FC.BAL.inj.yellowLimit - 1) h += '<div class="panel alert"><div class="al-h"><span class="al-i">🟨</span><div><b>تحذير: ' + u.season.ycCount + ' بطاقات صفراء</b><span class="muted small">الصفراء القادمة تعني الإيقاف مباراة</span></div></div></div>';
    if (u.reinj > 0 && !u.inj) h += '<div class="panel alert"><div class="al-h"><span class="al-i">⚠️</span><div><b>خطر تجدد الإصابة</b><span class="muted small">عدت مبكراً: تجنّب التدريب المكثف ' + u.reinj + ' أسابيع</span></div></div></div>';
    return h;
  }

  // تنبيهات الهاتف: عروض، لاعب حر
  function phoneAlerts(st) {
    const u = st.user;
    const n = FC.Transfer.active(st).length;
    let h = '';
    if (u.freeAgent) h += '<button class="panel alert bad ph-go" data-go="phone" data-p=\'{"app":"offers"}\'><div class="al-h"><span class="al-i">📝</span><div><b>أنت لاعب حر</b><span class="muted small">لن تلعب حتى توقّع عقداً — راجع العروض</span></div></div></button>';
    else if (n) h += '<button class="panel alert ph-go" data-go="phone" data-p=\'{"app":"offers"}\'><div class="al-h"><span class="al-i">📝</span><div><b>لديك ' + (n === 1 ? 'عرض جديد' : n + ' عروض') + '</b><span class="muted small">افتح الهاتف للتفاوض أو الرد</span></div></div></button>';
    const sp = (u.spOffers || []).length;
    if (sp) h += '<button class="panel alert ph-go" data-go="phone" data-p=\'{"app":"sponsors"}\'><div class="al-h"><span class="al-i">✍️</span><div><b>' + (sp === 1 ? 'عرض رعاية جديد' : sp + ' عروض رعاية') + '</b><span class="muted small">' + esc(u.spOffers[0].name) + ' — افتح تطبيق الرعاة</span></div></div></button>';
    return h;
  }

  // سطر أسباب ثقة المدرب
  function trustLine(st) {
    const rs = FC.Status.trustReasons(st).slice(0, 3);
    return '<div class="trust-why">' + (rs.length ? rs.map((r) => '<span class="' + (r.d > 0 ? 'up' : 'dn') + '">' + (r.d > 0 ? '+' : '') + r.d + ' ' + esc(r.name) + '</span>').join('') : '<span class="muted">لا تغييرات مؤخراً</span>') + '<button class="link" data-act="why">المدرب ولماذا؟</button></div>';
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
        (st.flags.tutDone ? '' : '<div class="panel tut"><h3>كيف تلعب؟</h3><ol><li>كل أسبوع: اختر <b>خطة الأسبوع</b> (تدريب فردي بلعبة مصغّرة، علاج، راحة، تحليل فيديو، عائلة).</li><li>العب <b>مباراتك كاملة</b>: تتحكم بلاعبك فقط في ملعب ثلاثي الأبعاد (عصا تحكم يساراً وأزرار يميناً)، أو اختر وضع اللحظات من الإعدادات.</li><li><b>أنهِ الأسبوع</b>: تُحاكى كل الدوريات وترى تطورك (+1) ويُحفظ تقدمك تلقائياً.</li><li>تطوّر مع فريق الشباب حتى يطلبك <b>الفريق الأول</b>.</li></ol><button class="btn small" data-act="tut">فهمت</button></div>') +
        '<section class="hero">' +
        '<div class="hero-card">' + UI.card(u, { club, shine: !!st.flags.shine }) + '</div>' +
        '<div class="hero-info panel">' +
        '<h2>' + esc(FC.Player.displayName(u)) + '</h2>' +
        '<div class="hero-sub">' + UI.flag(u.nat, 14) + ' ' + esc(FC.Player.POS[u.pos].name) + ' · ' + u.age + ' سنة · ' + UI.badge(club, 18) + ' ' + esc(club.name) + (u.team === 'Y' ? ' <span class="chip-tag">الشباب</span>' : '') + (u.captain ? ' <span class="chip-tag cap">© القائد</span>' : '') + '</div>' +
        '<div class="hero-pot">الإمكانات المقدّرة <b dir="ltr">' + pr[0] + '–' + pr[1] + '</b> · القيمة <b dir="ltr">' + esc(FC.Econ.fmt(FC.Econ.value(st, u))) + '</b></div>' +
        (FC.Life ? '<div class="hero-fame"><span>⭐ الشهرة <b>' + Math.round(u.fame || 0) + '</b></span><span>📣 <b>' + FC.Life.fmtNum(u.followers || 0) + '</b> متابع</span>' + ((u.sponsors || []).length ? '<span>✍️ ' + u.sponsors.length + ' رعاة</span>' : '') + '</div>' : '') +
        UI.meter('اللياقة', u.fit) +
        UI.meter('الجاهزية', u.sharp != null ? u.sharp : 70) +
        UI.meter('المعنويات', u.morale) +
        UI.meter('ثقة المدرب', u.trust) +
        trustLine(st) +
        '<div class="form-row"><span>الفورمة</span>' + (form.length ? form.map((r) => UI.rating(r)).join('') : '<span class="muted small">لا مباريات بعد</span>') + '</div>' +
        '</div></section>' +
        statusAlerts(st) +
        (UI.eventCard ? UI.eventCard(st) : '') +
        phoneAlerts(st) +
        '<section class="cta">' + cta + '<button class="btn ghost" data-act="quick">' + UI.icon('fast') + ' محاكاة الأسبوع بسرعة</button><button class="btn ghost" data-go="phone">' + UI.icon('phone') + ' الهاتف</button></section>' +
        '<div class="grid2">' + nextMatchPanel(st) + compsPanel(st) + messages(st) + miniTable(st) + seasonStats(u) + '</div>'
      );
    },
    bind(el) {
      const st = FC.State.cur;
      st.flags.shine = false;
      el.addEventListener('click', async (ev) => {
        const t = ev.target.closest('[data-act],[data-msg],[data-ev]');
        if (!t) return;
        if (t.dataset.ev) return UI.chooseEvent(parseInt(t.dataset.ev, 10));
        if (t.dataset.msg) return UI.inbox(parseInt(t.dataset.msg, 10));
        const a = t.dataset.act;
        if (a === 'inbox') UI.inbox();
        if (a === 'tut') {
          st.flags.tutDone = true;
          UI.refresh();
        }
        if (a === 'endweek') UI.endWeek();
        if (a === 'quick') UI.quickWeek();
        if (a === 'why') UI.coachInfo();
        if (a === 'role') UI.roleWhy();
      });
      el.addEventListener('click', (ev) => {
        const t = ev.target.closest('[data-early]');
        if (!t) return;
        const acc = t.dataset.early === '1';
        FC.Status.earlyReturn(st, acc);
        UI.toast(acc ? 'عدت مبكراً — انتبه لخطر الانتكاسة' : 'قررت إكمال العلاج', acc ? 'ok' : '');
        UI.saveNow(true);
        UI.refresh();
      });
    },
  };

  // نافذة المدرب وأسباب الثقة
  UI.coachInfo = function () {
    const st = FC.State.cur;
    const u = st.user;
    const cid = FC.Game.userTeam(st);
    const club = st.clubs[cid];
    const c = club.youth ? null : FC.Status.coachOf(st, cid);
    const rs = FC.Status.trustReasons(st);
    const S = FC.Status.STYLES;
    UI.modal(
      'ثقة المدرب: ' + Math.round(u.trust),
      (c ? '<p><b>' + esc(FC.Status.coachName(c)) + '</b> · ' + c.age + ' سنة · منذ ' + FC.Calendar.seasonLabel(c.since) + '</p><p class="muted small">الأسلوب: ' + esc(S[c.style].name) + ' — ' + esc(S[c.style].desc) + '</p>' : '<p class="muted small">مدرب فريق الشباب يمنح مواهب الأكاديمية فرصاً أكبر.</p>') +
        '<h4>أسباب تغيّر الثقة مؤخراً</h4>' +
        (rs.length ? '<div class="why-list">' + rs.map((r) => '<div class="' + (r.d > 0 ? 'up' : 'dn') + '"><span>' + esc(r.name) + '</span><b dir="ltr">' + (r.d > 0 ? '+' : '') + r.d + '</b></div>').join('') + '</div>' : '<p class="muted">لا تغييرات تذكر في الأسابيع الأخيرة.</p>') +
        '<p class="muted small">ترتفع الثقة بالأداء الجيد، التدريب المكثف وتحليل الفيديو، وتنخفض بالتقييمات الضعيفة والبطاقات.</p>',
      [{ label: 'حسناً', cls: 'gold', value: 1 }]
    );
  };

  // لماذا أنا أساسي أو احتياطي؟
  UI.roleWhy = function () {
    const st = FC.State.cur;
    const ex = FC.Select.explain(st, FC.Game.userTeam(st));
    const title = { start: 'أساسي', bench: 'على الدكة', out: 'خارج القائمة' }[ex.role];
    UI.modal('دورك المتوقع: ' + title, '<ul class="why-ul">' + ex.reasons.map((r) => '<li>' + esc(r) + '</li>').join('') + '</ul>', [{ label: 'حسناً', cls: 'gold', value: 1 }]);
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
    if (st.user.freeAgent) {
      UI.toast('أنت لاعب حر: وقّع عقداً أولاً من الهاتف', 'bad');
      return UI.go('phone', { app: 'offers' });
    }
    if (!st.wk.planned) FC.Game.applyPlan(st, FC.Game.autoPlan(st));
    let last = null;
    let guard = 0;
    while (FC.Game.userFixtureRef(st) && guard++ < 4) last = FC.Game.simUserMatchAuto(st);
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
      if (rep.mine && rep.mine.length > 1) {
        // أكثر من مباراة هذا الأسبوع (دوري + كأس، أو مباراتان دوليتان)
        html += '<div class="panel"><h3>مبارياتك هذا الأسبوع</h3>' +
          rep.mine
            .map((l) => {
              const o = st.clubs[l.opp];
              const nm = l.c && st.comps && st.comps[l.c] ? st.comps[l.c].name : l.lg && st.leagues[l.lg] ? st.leagues[l.lg].short : '';
              const res = l.gf > l.ga ? 'W' : l.gf < l.ga ? 'L' : 'D';
              return '<div class="kv"><span>' + esc(nm) + ' · ' + (l.h ? 'ضد ' : 'في ضيافة ') + (o ? UI.badge(o, 16) + ' ' + esc(o.short) : '') + '</span><b>' + UI.formChip(res) + ' <span dir="ltr">' + l.gf + '-' + l.ga + '</span>' + (l.p ? ' <small class="muted" dir="ltr">(ت ' + l.p + ')</small>' : '') + ' ' + (l.r != null ? UI.rating(l.r) : '<small class="muted">لم تشارك</small>') + '</b></div>';
            })
            .join('') +
          '</div>';
      } else if (rep.quickMatch) {
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
      // عناوين الأخبار هذا الأسبوع
      const nws = (st.news || []).filter((n) => n.s === rep.season && n.w === rep.week).slice(0, 4);
      if (nws.length) html += '<div class="panel"><div class="next-h"><h3>📰 عناوين الأسبوع</h3><button class="link" data-go="phone" data-p=\'{"app":"news"}\'>كل الأخبار</button></div>' + nws.map((n) => '<div class="nw-line">' + esc(n.h) + '</div>').join('') + '</div>';
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
      '<p>عمرك 16 سنة وتبدأ مع <b>فريق الشباب</b>. كل أسبوع تخطط لتدريبك، تلعب مباراتك، وتشاهد تطورك.</p><p>في المباراة <b>تتحكم بلاعبك طوال المباراة</b> مثل «مهنة اللاعب»: عصا تحكم على اليسار، وأزرار التمرير والتسديد على اليمين (أو الأسهم وS/D/W/A على الكمبيوتر).</p><p class="muted small">يمكنك «محاكاة البقية» في أي لحظة، أو اختيار وضع اللحظات من الإعدادات.</p>',
      [{ label: 'لنبدأ!', cls: 'gold', value: 1 }]
    );
  };
})(globalThis);
