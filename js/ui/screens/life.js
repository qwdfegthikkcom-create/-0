/* =========================================================
   واجهة الحياة خارج الملعب (المرحلة 5):
   تطبيقات الهاتف (الأخبار، «نبض»، نمط الحياة، الرعاة)، بطاقة الحدث في الرئيسية،
   المقابلة والمنشور بعد المباراة، وبطاقة الغريم
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC;
  const UI = FC.UI;
  const U = FC.util;
  const esc = U.esc;
  const money = (n) => FC.Econ.fmt(n);
  const TONES = [['humble', 'متواضع', '🙏'], ['confident', 'واثق', '😎'], ['fiery', 'ناري', '🔥']];
  const NEWS_ICON = { you: '⭐', club: '🛡️', league: '🏆', transfer: '🔁', intl: '🌍', rival: '⚔️' };

  function header(title) {
    return '<div class="ph-h"><button class="icon-btn small" data-app="home">' + UI.icon('back') + '</button><b>' + esc(title) + '</b><span class="ph-time" dir="ltr">' + new Date().toTimeString().slice(0, 5) + '</span></div>';
  }

  // ================= تطبيقات الهاتف =================
  FC.PhoneApps = [
    { id: 'news', name: 'الأخبار', icon: '📰', badge: (st) => (st.news || []).filter((n) => n.s === st.season && n.w >= st.week - 1 && n.k === 'you').length },
    { id: 'social', name: 'نبض', icon: '📣', badge: () => 0 },
    { id: 'sponsors', name: 'الرعاة', icon: '✍️', badge: (st) => (st.user.spOffers || []).length },
    { id: 'life', name: 'نمط الحياة', icon: '💎', badge: () => 0 },
    { id: 'cal', name: 'التقويم', icon: '📅', badge: () => 0 },
  ];

  FC.PhoneViews = {
    news(st, p) {
      const f = p.f || 'all';
      const list = (st.news || []).filter((n) => f === 'all' || n.k === f || (f === 'you' && n.k === 'rival'));
      const tabs = [['all', 'الكل'], ['you', 'عنك'], ['league', 'الدوري'], ['transfer', 'الانتقالات'], ['intl', 'دولي']];
      return (
        header('الأخبار') +
        '<div class="ph-tabs">' + tabs.map((t) => '<button class="' + (t[0] === f ? 'on' : '') + '" data-pa="nf" data-f="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>' +
        '<div class="ph-list">' +
        (list.length
          ? list.slice(0, 40).map((n) => '<div class="nw nw-' + n.k + '"><span class="nw-i">' + (NEWS_ICON[n.k] || '📰') + '</span><div><b>' + esc(n.h) + '</b><small class="muted">' + FC.Calendar.seasonLabel(n.s) + ' · أ' + (n.w + 1) + '</small></div></div>').join('')
          : '<p class="muted">لا أخبار بعد.</p>') +
        '</div>'
      );
    },

    social(st) {
      const u = st.user;
      const posts = st.social || [];
      return (
        header('نبض') +
        '<div class="sc-prof">' + UI.face(u.face, st.clubs[FC.Game.userTeam(st)] ? st.clubs[FC.Game.userTeam(st)].c1 : null, 54) + '<div><b>' + esc(FC.Player.displayName(u)) + (u.fame >= 40 ? ' <span class="verified">✔</span>' : '') + '</b><span class="muted">@' + esc((u.fn + '_' + u.ln).replace(/\s+/g, '')) + '</span></div>' +
        '<div class="sc-num"><b>' + FC.Life.fmtNum(u.followers || 0) + '</b><span>متابع</span></div><div class="sc-num"><b>' + Math.round(u.fame || 0) + '</b><span>الشهرة</span></div></div>' +
        '<p class="muted small">تنشر بعد كل مباراة من ملخصها. النبرة تؤثر على شهرتك وثقة المدرب.</p>' +
        '<div class="ph-list">' +
        (posts.length
          ? posts
              .map((po) =>
                '<div class="sc-post">' +
                '<div class="sc-ph"><b>' + esc(FC.Player.displayName(u)) + '</b><small class="muted">' + FC.Calendar.seasonLabel(po.s) + ' · أ' + (po.w + 1) + (po.trend ? ' · <span class="trend">🔥 ترند</span>' : '') + '</small></div>' +
                '<p>' + esc(po.txt) + '</p>' +
                '<div class="sc-meta"><span>❤ ' + FC.Life.fmtNum(po.likes) + '</span><span>💬 ' + po.cm.length + '</span><span class="tone tone-' + po.tone + '">' + TONES.find((t) => t[0] === po.tone)[2] + '</span></div>' +
                '<div class="sc-cm">' + po.cm.map((c) => '<div><b>' + esc(c[0]) + '</b> ' + esc(c[1]) + '</div>').join('') + '</div>' +
                '</div>'
              )
              .join('')
          : '<p class="muted">لم تنشر شيئاً بعد. بعد مباراتك القادمة اختر نبرة منشورك من شاشة الملخص.</p>') +
        '</div>'
      );
    },

    sponsors(st) {
      const u = st.user;
      const B = FC.BAL.life.sponsor;
      const offers = u.spOffers || [];
      const act = u.sponsors || [];
      const full = act.length >= B.max;
      return (
        header('الرعاة') +
        '<div class="ph-card"><div class="kv"><span>دخل الرعاية الأسبوعي</span><b>' + esc(money(act.reduce((s, x) => s + x.weekly, 0))) + '</b></div>' +
        '<div class="kv"><span>قيمتك الإعلانية المتوقعة</span><b>' + esc(money(FC.Life.sponsorWeekly(u.fame || 0))) + ' / أسبوع</b></div>' +
        '<p class="muted small">' + (u.fame < B.minFame ? 'تبدأ عروض الرعاية عندما تصل شهرتك إلى ' + B.minFame + ' (الآن ' + Math.round(u.fame) + ').' : 'حتى ' + B.max + ' عقود في فئات مختلفة. الدخل يرتفع مع شهرتك.') + '</p></div>' +
        (offers.length
          ? '<h4>عروض جديدة</h4>' +
            offers
              .map((o) => '<div class="ph-card sp"><div class="sp-h"><span class="sp-i">' + o.icon + '</span><div><b>' + esc(o.name) + '</b><small class="muted">' + esc(o.catName) + '</small></div><b class="sp-w">' + esc(money(o.weekly)) + '<small>/أسبوع</small></b></div>' +
                '<p class="small">المدة: ' + o.seasons + (o.seasons === 1 ? ' موسم' : ' مواسم') + ' · الشرط: ' + esc(FC.Life.condText(o)) + '</p>' +
                '<div class="row gap"><button class="btn gold small" data-pa="spok" data-id="' + esc(o.id) + '"' + (full ? ' disabled' : '') + '>قبول</button><button class="btn ghost small" data-pa="spno" data-id="' + esc(o.id) + '">رفض</button></div></div>')
              .join('')
          : '') +
        '<h4>عقودك</h4>' +
        (act.length
          ? act.map((sp) => '<div class="ph-card sp"><div class="sp-h"><span class="sp-i">' + sp.icon + '</span><div><b>' + esc(sp.name) + '</b><small class="muted">' + esc(sp.catName) + ' · حتى ' + FC.Calendar.seasonLabel(sp.until) + '</small></div><b class="sp-w">' + esc(money(sp.weekly)) + '<small>/أسبوع</small></b></div><p class="small">' + (FC.Life.condOk(st, sp) ? '✅ ' : '⚠️ ') + esc(FC.Life.condText(sp)) + (sp.warn ? ' — <b>تحذير</b>' : '') + '</p></div>').join('')
          : '<p class="muted">لا عقود رعاية حالياً.</p>')
      );
    },

    life(st) {
      const u = st.user;
      const L = u.life;
      const T = FC.TXT;
      const svcKeys = Object.keys(T.SERVICES);
      const abroad = FC.Life.abroadActive(st);
      const lg = FC.Game.userLeague(st);
      const lnat = st.leagues[lg] ? st.leagues[lg].nat : null;
      const row = (kind, list, cur) =>
        list
          .map((it, i) => {
            const own = i <= cur;
            const can = !own && (u.money || 0) >= it.price;
            return '<div class="lf-item' + (i === cur ? ' cur' : '') + '"><span class="lf-i">' + it.icon + '</span><div><b>' + esc(it.name) + '</b><small class="muted">' + (it.price ? esc(money(it.price)) : 'مجاناً') + '</small></div>' +
              (i === cur ? '<span class="chip-tag ok">لديك</span>' : own ? '<span class="chip-tag">سابقاً</span>' : '<button class="btn small' + (can ? ' gold' : '') + '" data-pa="buy" data-kind="' + kind + '" data-lvl="' + i + '"' + (can ? '' : ' disabled') + '>شراء</button>') + '</div>';
          })
          .join('');
      return (
        header('نمط الحياة') +
        '<div class="ph-card"><div class="kv"><span>الرصيد</span><b>' + esc(money(u.money || 0)) + '</b></div><p class="muted small">البيت والسيارة شكليان يرفعان معنوياتك. الخدمات تُدفع أسبوعياً كنسبة من راتبك.</p></div>' +
        '<h4>الخدمات الأسبوعية</h4>' +
        svcKeys
          .map((k) => {
            const sv = T.SERVICES[k];
            const on = FC.Life.has(st, k);
            if (k === 'lang' && !abroad && !on) return '';
            return '<div class="lf-item svc' + (on ? ' on' : '') + '"><span class="lf-i">' + sv.icon + '</span><div><b>' + esc(sv.name) + '</b><small class="muted">' + esc(sv.desc) + ' · ' + esc(money(FC.Life.svcCost(st, k))) + '/أسبوع</small></div><button class="btn small' + (on ? '' : ' gold') + '" data-pa="svc" data-k="' + k + '">' + (on ? 'إلغاء' : 'اشتراك') + '</button></div>';
          })
          .join('') +
        (abroad ? '<div class="ph-card"><b>🌍 الغربة</b><p class="small">إتقان لغة البلد: ' + Math.round(L.lang[lnat] || 0) + '%. معنوياتك تتأثر حتى تتأقلم — دروس اللغة تسرّع ذلك.</p></div>' : '') +
        '<h4>البيت</h4>' + row('home', T.HOMES, L.home) +
        '<h4>السيارة</h4>' + row('car', T.CARS, L.car)
      );
    },
  };

  // التقويم: مبارياتك القادمة في كل المسابقات
  FC.PhoneViews.cal = function (st) {
    const list = FC.Game.upcoming(st, 14);
    const B = FC.BAL;
    const marks = [];
    B.cal.intlBreaks.concat([B.transfer.winter[0]]).forEach((w) => w >= st.week && marks.push(w));
    return (
      header('التقويم') +
      '<div class="ph-list">' +
      (list.length
        ? list
            .map((f) => {
              const o = st.clubs[f.opp];
              return '<div class="cal-row' + (f.week === st.week ? ' now' : '') + (f.nat ? ' nat' : '') + '"><div class="cal-d"><b>' + esc(UI.fxDate(st, f.week, f.d)) + '</b><small>' + (f.d ? 'منتصف الأسبوع' : 'نهاية الأسبوع') + '</small></div><div class="cal-m"><span>' + (f.home ? 'ضد ' : 'في ضيافة ') + (o ? UI.badge(o, 16) + ' ' + esc(o.short) : '') + '</span><small class="muted">' + esc(FC.Game.refLabel(st, f.ref)) + '</small></div></div>';
            })
            .join('')
        : '<p class="muted">لا مباريات قادمة معروفة (قرعة الأدوار التالية تُجرى لاحقاً).</p>') +
      '</div>' +
      '<p class="muted small">التوقف الدولي: ' + B.cal.intlBreaks.map((w) => esc(UI.weekDate(st, w))).join('، ') + ' · فترة الانتقالات الشتوية تبدأ ' + esc(UI.weekDate(st, B.transfer.winter[0])) + '</p>'
    );
  };

  // أوامر تطبيقات الحياة
  UI.phoneAct = function (st, t, p) {
    const a = t.dataset.pa;
    if (a === 'nf') return UI.go('phone', { app: 'news', f: t.dataset.f });
    if (a === 'spok') {
      if (FC.Life.acceptSponsor(st, t.dataset.id)) UI.toast('وقّعت عقد الرعاية ✍️', 'ok');
      else UI.toast('لا يمكن قبول المزيد من العقود', 'bad');
      UI.saveNow(true);
      return UI.go('phone', { app: 'sponsors' });
    }
    if (a === 'spno') {
      FC.Life.declineSponsor(st, t.dataset.id);
      return UI.go('phone', { app: 'sponsors' });
    }
    if (a === 'svc') {
      const k = t.dataset.k;
      FC.Life.setService(st, k, !FC.Life.has(st, k));
      UI.toast(FC.Life.has(st, k) ? 'اشتركت في الخدمة' : 'ألغيت الخدمة', 'ok');
      return UI.go('phone', { app: 'life' });
    }
    if (a === 'buy') {
      const kind = t.dataset.kind;
      const lvl = parseInt(t.dataset.lvl, 10);
      const item = (kind === 'home' ? FC.TXT.HOMES : FC.TXT.CARS)[lvl];
      UI.modal('شراء ' + item.name, '<p>السعر ' + esc(money(item.price)) + '. متأكد؟</p>', [
        { label: 'نعم، اشترِ', cls: 'gold', value: true },
        { label: 'إلغاء', cls: 'ghost', value: false },
      ]).then((ok) => {
        if (ok && FC.Life.buy(st, kind, lvl)) {
          UI.toast('مبروك! ' + item.icon, 'ok');
          UI.confetti(60);
          UI.saveNow(true);
        }
        UI.go('phone', { app: 'life' });
      });
    }
  };

  // ================= بطاقة الحدث في الرئيسية =================
  UI.eventCard = function (st) {
    const e = st.user.event;
    if (!e) return '';
    return (
      '<div class="panel ev-card"><div class="next-h"><h3>📌 ' + esc(e.title) + '</h3><span class="muted small">تنتهي المهلة بعد ' + Math.max(0, e.exp - st.week) + ' أسبوع</span></div>' +
      '<p>' + esc(e.text) + '</p><div class="ev-opts">' + e.opts.map((o, i) => '<button class="btn small' + (i === 0 ? ' gold' : '') + '" data-ev="' + i + '">' + esc(o) + '</button>').join('') + '</div></div>'
    );
  };
  UI.chooseEvent = function (idx) {
    const st = FC.State.cur;
    const title = st.user.event ? st.user.event.title : '';
    const r = FC.Life.chooseEvent(st, idx);
    if (r) UI.modal(title, '<p>' + esc(r) + '</p>', [{ label: 'حسناً', cls: 'gold', value: 1 }]);
    UI.saveNow(true);
    UI.refresh();
  };

  // ================= بعد المباراة: المقابلة والمنشور =================
  UI.afterMatchLife = function (sum) {
    if (!FC.Life || !sum) return '';
    let h = '';
    if (sum.interview && !sum.interviewDone) {
      h += '<div class="panel iv"><h3>🎤 مقابلة بعد المباراة</h3><p class="iv-q">«' + esc(sum.interview.q) + '»</p><div class="ev-opts">' +
        TONES.map((t) => '<button class="btn small tone-' + t[0] + '" data-iv="' + t[0] + '">' + t[2] + ' ' + t[1] + '</button>').join('') +
        '</div><p class="muted small">المتواضع يرضي المدرب، والواثق يرفع شهرتك، والناري يشعل الإعلام لكنه يغضب المدرب.</p></div>';
    } else if (sum.interviewAns) h += '<div class="panel iv"><h3>🎤 المقابلة</h3><p class="iv-q">«' + esc(sum.interview.q) + '»</p><p>أنت: «' + esc(sum.interviewAns) + '»</p></div>';
    if (sum.post && !sum.posted) {
      h += '<div class="panel iv"><h3>📣 انشر على «نبض»</h3><div class="ev-opts">' +
        TONES.map((t) => '<button class="btn small tone-' + t[0] + '" data-post="' + t[0] + '">' + t[2] + ' ' + t[1] + '</button>').join('') +
        '<button class="btn small ghost" data-post="skip">لا أريد النشر</button></div></div>';
    } else if (sum.posted && sum.posted.txt) {
      const po = sum.posted;
      h += '<div class="panel iv"><h3>📣 منشورك</h3><div class="sc-post"><p>' + esc(po.txt) + '</p><div class="sc-meta"><span>❤ ' + FC.Life.fmtNum(po.likes) + '</span>' + (po.trend ? '<span class="trend">🔥 ترند</span>' : '') + '</div><div class="sc-cm">' + po.cm.map((c) => '<div><b>' + esc(c[0]) + '</b> ' + esc(c[1]) + '</div>').join('') + '</div></div></div>';
    }
    return h;
  };

  // ================= بطاقة الغريم =================
  UI.rivalCard = function (st) {
    if (!FC.Life) return '';
    const rv = FC.Life.rival(st);
    if (!rv) return '';
    const u = st.user;
    const rc = st.clubs[rv.club];
    const myG = u.season.g;
    const rvG = FC.Life.rivalGoals(st);
    const row = (lbl, a, b, better) => '<div class="rv-row"><b class="' + (better === 1 ? 'up' : '') + '">' + a + '</b><span>' + lbl + '</span><b class="' + (better === -1 ? 'up' : '') + '">' + b + '</b></div>';
    const cmp = (a, b) => (a > b ? 1 : a < b ? -1 : 0);
    const myO = Math.floor(FC.Player.ovr(u));
    const rvO = Math.floor(rv.ovr);
    const myV = FC.Econ.value(st, u);
    const rvV = FC.Econ.value(st, rv);
    const caps = u.intl ? u.intl.caps : 0;
    return (
      '<div class="panel rival"><h3>⚔️ غريمك</h3>' +
      '<div class="rv-h"><div><b>' + esc(FC.Player.displayName(u)) + '</b><small class="muted">' + UI.flag(u.nat, 11) + ' ' + esc(st.clubs[FC.Game.userTeam(st)].short) + '</small></div><span class="vs-x">VS</span><div><b>' + esc(FC.Player.fullName(rv)) + '</b><small class="muted">' + UI.flag(rv.nat, 11) + ' ' + (rc ? esc(rc.short) : '—') + '</small></div></div>' +
      row('التقييم', myO, rvO, cmp(myO, rvO)) +
      row('أهداف الموسم', myG, rvG, cmp(myG, rvG)) +
      row('المباريات الدولية', caps, rv.iC || 0, cmp(caps, rv.iC || 0)) +
      row('القيمة', esc(money(myV)), esc(money(rvV)), cmp(myV, rvV)) +
      '<p class="muted small">لاعب بعمرك ومركزك من ' + esc(FC.DATA.nations[rv.nat].name) + '. الصحافة تقارن بينكما، وسيظهر في التصويت على الجوائز.</p></div>'
    );
  };
})(globalThis);
