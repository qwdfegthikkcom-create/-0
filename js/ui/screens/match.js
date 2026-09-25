/* =========================================================
   شاشات المباراة: قبلها (التشكيلة ومعلومات الخصم)، مباشرة (تعليق، زخم، لحظات)، بعدها (التقييمات)
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC;
  const UI = FC.UI;
  const U = FC.util;
  const esc = U.esc;

  UI.match = null; // المباراة الجارية
  let settings = null;

  const nm = (x) => (x.pid === 0 ? FC.Player.displayName(x.p) : x.p.ln);

  // رسم التشكيلة على ملعب
  function lineupPitch(side, flip) {
    const xy = FC.Select.XY[side.form];
    const kit = [side.club.c1, side.club.c2];
    return (
      '<div class="lineup-pitch"><div class="lp-lines"></div>' +
      side.xi
        .map((x, i) => {
          const p = xy[i] || [50, 50];
          const left = flip ? 100 - p[0] : p[0];
          const top = 6 + (100 - p[1]) * 0.86;
          return '<div class="lp-p' + (x.pid === 0 ? ' me' : '') + '" style="left:' + left + '%;top:' + top + '%"><i style="background:' + kit[0] + ';color:' + kit[1] + '">' + x.p.num + '</i><span>' + esc(nm(x)) + '</span></div>';
        })
        .join('') +
      '</div>'
    );
  }

  // ================= قبل المباراة =================
  UI.screens.matchPre = {
    chrome: true,
    nav: 'home',
    render() {
      const st = FC.State.cur;
      settings = settings || FC.Save.loadSettings();
      const ref = FC.Game.userFixtureRef(st);
      if (!ref || st.wk.played) return '<div class="panel"><p>لا مباراة لفريقك هذا الأسبوع.</p><button class="btn" data-go="home">الرئيسية</button></div>';
      const m = (UI.match = FC.Game.startMatch(st, settings.matchMode));
      const u = m.user;
      const S = m.sides[u.si];
      const O = m.sides[1 - u.si];
      const L = st.leagues[ref.lg];
      const H = m.sides[0].club;
      const A = m.sides[1].club;
      const oppPos = FC.Comp.position(st, ref.lg, O.id);
      const myPos = FC.Comp.position(st, ref.lg, S.id);
      const form = FC.Comp.clubForm(st, ref.lg, O.id, 5);
      const top = FC.Comp.leaders(st, ref.lg, 'sG', 30).find((x) => x.club === O.id);
      const role = FC.Player.POS[st.user.pos].role;
      const instr = FC.TXT.INSTR[role][st.week % FC.TXT.INSTR[role].length];
      const status = u.state === 'on' ? 'start' : u.state === 'bench' ? 'bench' : 'out';
      const modeName = { full: 'مباراة كاملة (تتحكم بلاعبك)', play: 'لعب اللحظات', mixed: 'مختلط (اللحظات الكبرى فقط)', auto: 'تلقائي' }[settings.matchMode];
      const full = settings.matchMode === 'full';
      const lens = FC.BAL.full.lengths;
      return (
        '<div class="pre-head panel">' +
        '<div class="muted">' + esc(L.name) + ' · الجولة ' + (ref.r + 1) + ' · ' + esc(UI.date(st)) + (m.derby ? ' · <b class="gold-text">ديربي!</b>' : '') + '</div>' +
        '<div class="vs big"><div class="vs-t">' + UI.badge(H, 56) + '<b>' + esc(H.name) + '</b></div><div class="vs-m"><span class="vs-x">VS</span><span class="vs-h">ملعب ' + esc(H.city) + '</span></div><div class="vs-t">' + UI.badge(A, 56) + '<b>' + esc(A.name) + '</b></div></div>' +
        '</div>' +
        '<div class="grid2">' +
        '<div class="panel"><div class="next-h"><h3>تشكيلة ' + esc(S.club.short) + ' (' + S.form + ')</h3>' + UI.roleChip(status) + '</div>' + lineupPitch(S) +
        (status === 'bench' ? '<p class="muted small">أنت على دكة البدلاء' + (u.subOn > 0 ? ' — قد يُدخلك المدرب في الشوط الثاني.' : '.') + '</p>' : '') +
        (status === 'out' ? '<p class="muted small">' + (st.user.inj ? 'أنت مصاب (' + esc(st.user.inj.name) + ') وتتابع من المدرجات.' : st.user.ban > 0 ? 'أنت موقوف هذه المباراة.' : 'لست ضمن قائمة المباراة هذه المرة. استمر في التدريب لتقنع المدرب.') + '</p>' : '') +
        (function () {
          const ex = FC.Select.explain(st, S.id);
          return '<div class="why-box"><b>قرار المدرب:</b> ' + ex.reasons.map(esc).join(' · ') + '</div>';
        })() +
        '</div>' +
        '<div class="panel"><h3>الخصم: ' + esc(O.club.name) + '</h3>' +
        '<div class="kv"><span>الترتيب</span><b>' + oppPos + ' (فريقك ' + myPos + ')</b></div>' +
        '<div class="kv"><span>آخر النتائج</span><b>' + (form.length ? form.map(UI.formChip).join('') : '—') + '</b></div>' +
        '<div class="kv"><span>الخطة</span><b>' + O.form + '</b></div>' +
        '<div class="kv"><span>القوة المتوقعة</span><b>هجوم ' + Math.round(O.str.att) + ' · دفاع ' + Math.round(O.str.def) + '</b></div>' +
        (top ? '<div class="kv"><span>هدافهم</span><b>' + esc(FC.Player.fullName(st.players[top.pid] || st.user)) + ' (' + top.v + ')</b></div>' : '') +
        (status !== 'out' ? '<div class="instr">📋 تعليمات المدرب لك: <b>«' + esc(instr) + '»</b></div>' : '') +
        '<p class="muted small">وضع المباراة: ' + modeName + ' (يُغيَّر من الإعدادات)</p>' +
        (full
          ? '<div class="len-row"><span>مدة المباراة</span><div class="seg-btns">' + lens.map((n) => '<button class="' + (settings.fullLength === n ? 'on' : '') + '" data-len="' + n + '">' + n + ' د</button>').join('') + '</div></div>'
          : '') +
        '</div></div>' +
        '<div class="cta">' +
        (status !== 'out' ? '<button class="btn gold big" data-act="live">' + UI.icon('whistle') + ' ابدأ المباراة</button><button class="btn ghost" data-act="quick">' + UI.icon('fast') + ' محاكاة سريعة</button>' : '<button class="btn gold big" data-act="live">تابع من المدرجات</button><button class="btn ghost" data-act="quick">النتيجة مباشرة</button>') +
        '</div>'
      );
    },
    bind(el) {
      el.addEventListener('click', (ev) => {
        const ln = ev.target.closest('[data-len]');
        if (ln) {
          settings.fullLength = parseInt(ln.dataset.len, 10);
          FC.Save.saveSettings(settings);
          el.querySelectorAll('[data-len]').forEach((b) => b.classList.toggle('on', b === ln));
          return;
        }
        const t = ev.target.closest('[data-act]');
        if (!t || !UI.match) return;
        if (t.dataset.act === 'live') UI.go(settings.matchMode === 'full' ? 'matchFull' : 'matchLive');
        if (t.dataset.act === 'quick') {
          const st = FC.State.cur;
          const m = UI.match;
          m.mode = 'auto';
          m.live = false;
          if (m.user) m.user.momentsOn = false;
          FC.Match.run(st, m);
          UI.finishMatch();
        }
      });
    },
  };

  // إنهاء المباراة وفتح ملخصها
  UI.finishMatch = function () {
    const st = FC.State.cur;
    const m = UI.match;
    const sum = FC.Game.completeMatch(st, m);
    UI.go('matchPost', { sum });
  };

  // ================= المباراة الكاملة (تتحكم بلاعبك طوال المباراة) =================
  UI.screens.matchFull = {
    chrome: false,
    render() {
      if (!UI.match) return '<div class="page"><button class="btn" data-go="home">الرئيسية</button></div>';
      return '<div class="page center"><p class="muted">جارٍ تجهيز الملعب…</p></div>';
    },
    bind() {
      const st = FC.State.cur;
      const m = UI.match;
      if (!m) return;
      settings = FC.Save.loadSettings();
      FC.FullView.start(document.body, st, m, { length: settings.fullLength, cam: settings.cam, assist: settings.assist !== false }).then((r) => {
        // محاكاة البقية بمحرك الإحصاء من الدقيقة الحالية
        if (r.how === 'sim' && !m.done) FC.Match.run(st, m);
        UI.finishMatch();
      });
    },
  };

  // ================= المباراة المباشرة =================
  UI.screens.matchLive = {
    chrome: false,
    render() {
      const m = UI.match;
      if (!m) return '<div class="page"><button class="btn" data-go="home">الرئيسية</button></div>';
      settings = settings || FC.Save.loadSettings();
      const H = m.sides[0].club;
      const A = m.sides[1].club;
      return (
        '<div class="live">' +
        '<div class="scoreboard">' +
        '<div class="sb-t">' + UI.badge(H, 34) + '<b>' + esc(H.short) + '</b></div>' +
        '<div class="sb-m"><div class="sb-s" dir="ltr"><span class="s0">0</span> - <span class="s1">0</span></div><div class="sb-c" dir="ltr">0\'</div></div>' +
        '<div class="sb-t">' + UI.badge(A, 34) + '<b>' + esc(A.short) + '</b></div>' +
        '</div>' +
        '<div class="mom"><i></i><span class="mom-l">' + esc(H.short) + '</span><span class="mom-r">' + esc(A.short) + '</span></div>' +
        '<div class="live-grid">' +
        '<div class="panel you"></div>' +
        '<div class="panel lstats"></div>' +
        '</div>' +
        '<div class="speed">' +
        [1, 2, 4].map((s) => '<button class="chip' + (settings.speed === s ? ' on' : '') + '" data-sp="' + s + '" dir="ltr">×' + s + '</button>').join('') +
        '<button class="chip" data-act="skip">⏭ اللحظة التالية</button>' +
        '<button class="chip hidden" data-act="end">ملخص المباراة</button>' +
        '</div>' +
        '<div class="feed"></div>' +
        '</div>'
      );
    },
    bind(el) {
      const st = FC.State.cur;
      const m = UI.match;
      if (!m) return;
      let timer = 0;
      let skipping = false;
      let alive = true;
      const feed = el.querySelector('.feed');
      const you = el.querySelector('.you');
      const lst = el.querySelector('.lstats');
      const s0 = el.querySelector('.s0');
      const s1 = el.querySelector('.s1');
      const clk = el.querySelector('.sb-c');
      const mom = el.querySelector('.mom i');
      const endBtn = el.querySelector('[data-act=end]');
      const skipBtn = el.querySelector('[data-act=skip]');
      let lastScore = [0, 0];

      function addEvents(evs) {
        evs.forEach((e) => {
          if (!e.txt) return;
          const d = document.createElement('div');
          d.className = 'ev ev-' + e.t + ' imp' + e.imp + (e.pid === 0 || e.apid === 0 ? ' mine' : '') + (e.moment ? ' mom-ev' : '');
          const icon = e.t === 'goal' ? '⚽' : e.t === 'card' ? (e.card === 'r' ? '🟥' : '🟨') : e.t === 'sub' ? '🔁' : e.t === 'ft' || e.t === 'ht' || e.t === 'ko' ? '⏱' : e.t === 'user' ? '⭐' : '';
          d.innerHTML = '<span class="ev-m" dir="ltr">' + esc(e.min) + "'</span><span class=\"ev-i\">" + icon + '</span><span class="ev-t">' + esc(e.txt) + '</span>';
          feed.insertBefore(d, feed.firstChild);
          if (e.t === 'goal' && !skipping) {
            if (FC.Sound) FC.Sound.goal(e.si === m.user.si ? 1 : 0.5);
            if (e.si === (m.user ? m.user.si : -1)) UI.confetti(e.pid === 0 ? 140 : 60);
          }
          if ((e.t === 'ko' || e.t === 'ht' || e.t === 'ft') && FC.Sound && !skipping) FC.Sound.whistle(e.t === 'ft' ? 3 : e.t === 'ht' ? 2 : 1);
        });
        while (feed.children.length > 80) feed.removeChild(feed.lastChild);
      }

      function draw() {
        const g = [m.sides[0].goals, m.sides[1].goals];
        s0.textContent = g[0];
        s1.textContent = g[1];
        if (g[0] !== lastScore[0] || g[1] !== lastScore[1]) {
          el.querySelector('.sb-s').classList.remove('pop');
          void el.offsetWidth;
          el.querySelector('.sb-s').classList.add('pop');
          lastScore = g;
        }
        clk.textContent = (m.phase === 'ht' ? 'استراحة' : m.phase === 'ft' ? 'نهاية' : FC.Match.clock(m) + "'");
        mom.style.width = U.clamp(50 + m.mom / 2, 5, 95) + '%';
        const u = m.user;
        if (u && u.x) {
          const r = FC.Match.userRating(st, m, false);
          const where = u.state === 'on' ? 'في الملعب' : u.state === 'bench' ? 'على الدكة' : u.state === 'off' ? 'خرجت من الملعب' : '—';
          you.innerHTML =
            '<div class="you-h"><span>' + esc(FC.Player.displayName(st.user)) + '</span><span class="muted small">' + where + '</span></div>' +
            '<div class="you-r">' + UI.rating(u.x.in >= 0 ? r : null, true) + '<div class="you-ga"><span>⚽ ' + u.x.g + '</span><span>🅰️ ' + u.x.a + '</span><span>تسديد ' + u.x.sh + '</span></div></div>' +
            UI.meter('اللياقة', u.fit);
        } else you.innerHTML = '<div class="you-h"><span>لست ضمن القائمة</span></div><p class="muted small">تابع فريقك من المدرجات.</p>';
        const A0 = m.sides[0];
        const A1 = m.sides[1];
        const poss = Math.round(U.clamp(A0.poss + m.mom / 12, 25, 75));
        lst.innerHTML =
          '<div class="ls-row"><b>' + poss + '%</b><span>الاستحواذ</span><b>' + (100 - poss) + '%</b></div>' +
          '<div class="ls-row"><b dir="ltr">' + A0.shots + ' (' + A0.sot + ')</b><span>التسديدات (على المرمى)</span><b dir="ltr">' + A1.shots + ' (' + A1.sot + ')</b></div>' +
          '<div class="ls-row"><b>' + U.sum(A0.all, (x) => x.yc) + ' / ' + A0.red + '</b><span>صفراء / حمراء</span><b>' + U.sum(A1.all, (x) => x.yc) + ' / ' + A1.red + '</b></div>';
      }

      // تشغيل لحظة
      async function playMoment() {
        clearTimeout(timer);
        skipping = false;
        const pd = m.pending;
        const res = await (pd.special ? FC.SpecialView.play(pd) : FC.MomentView.play(pd));
        if (!alive) return;
        addEvents(FC.Match.resolveMoment(st, m, res));
        draw();
        schedule();
      }

      function tick() {
        if (!alive) return;
        if (m.pending) return playMoment();
        if (m.done) return finished();
        addEvents(FC.Match.step(st, m));
        draw();
        if (m.pending) return playMoment();
        schedule();
      }
      function schedule() {
        if (!alive) return;
        if (m.done) return finished();
        if (skipping) {
          // تقدّم سريع حتى اللحظة التالية أو النهاية
          let n = 0;
          while (!m.done && !m.pending && n++ < 400) addEvents(FC.Match.step(st, m));
          skipping = false;
          draw();
          if (m.pending) return playMoment();
          return finished();
        }
        timer = setTimeout(tick, FC.BAL.ui.tickMs[settings.speed] || 350);
      }
      function finished() {
        draw();
        skipBtn.classList.add('hidden');
        endBtn.classList.remove('hidden');
        endBtn.classList.add('gold');
      }

      el.addEventListener('click', (ev) => {
        const t = ev.target.closest('button');
        if (!t) return;
        if (t.dataset.sp) {
          settings.speed = parseInt(t.dataset.sp, 10);
          FC.Save.saveSettings(settings);
          el.querySelectorAll('[data-sp]').forEach((b) => b.classList.toggle('on', b === t));
        }
        if (t.dataset.act === 'skip') {
          clearTimeout(timer);
          skipping = true;
          schedule();
        }
        if (t.dataset.act === 'end') {
          alive = false;
          clearTimeout(timer);
          UI.finishMatch();
        }
      });
      draw();
      schedule();
      // إيقاف عند مغادرة الشاشة
      const obs = new MutationObserver(() => {
        if (!document.body.contains(el)) {
          alive = false;
          clearTimeout(timer);
          obs.disconnect();
        }
      });
      obs.observe(document.getElementById('app'), { childList: true });
    },
  };

  // ================= بعد المباراة =================
  function coachLine(sum, rng) {
    const C = FC.TXT.COACH;
    let list;
    if (!sum.played) list = sum.role === 'bench' ? C.bench : C.out;
    else if (sum.rating >= 8) list = C.great;
    else if (sum.rating >= 7) list = C.good;
    else if (sum.rating >= 6.2) list = C.ok;
    else list = C.bad;
    return FC.TXT.pick(rng, list, 'coach');
  }

  UI.screens.matchPost = {
    chrome: true,
    nav: 'home',
    render(p) {
      const st = FC.State.cur;
      const sum = p.sum;
      const m = UI.match;
      if (!sum || !m) return '<div class="panel"><button class="btn" data-go="home">الرئيسية</button></div>';
      const H = m.sides[0].club;
      const A = m.sides[1].club;
      const goals = (si) =>
        m.sides[si].all
          .filter((x) => x.g > 0)
          .map((x) => '<div>⚽ ' + esc(nm(x)) + (x.g > 1 ? ' ×' + x.g : '') + '</div>')
          .join('');
      const motm = m.motm;
      const us = sum.userStats;
      const rng = FC.rngOf(st);
      const acc = us && us.pas ? Math.round((100 * us.pasOk) / us.pas) : 0;
      const isGK = st.user.pos === 'GK';
      let youHtml = '';
      if (sum.played) {
        youHtml =
          '<div class="panel you-post"><div class="yp-h"><div>' + UI.rating(sum.rating, true) + '</div><div><h3>أداؤك</h3><p class="coach">«' + esc(coachLine(sum, rng)) + '» — المدرب</p></div></div>' +
          '<div class="stat-grid">' +
          '<div><b>' + us.mn + '</b><span>دقيقة</span></div><div><b>' + us.g + '</b><span>أهداف</span></div><div><b>' + us.a + '</b><span>صناعة</span></div>' +
          '<div><b dir="ltr">' + us.sh + ' (' + us.sot + ')</b><span>تسديدات</span></div><div><b>' + us.kp + '</b><span>تمريرات مفتاحية</span></div><div><b>' + acc + '%</b><span>دقة التمرير</span></div>' +
          '<div><b>' + us.drb + '</b><span>مراوغات</span></div><div><b>' + us.tk + '</b><span>افتكاك</span></div><div><b>' + us.int + '</b><span>قطع</span></div>' +
          (isGK ? '<div><b>' + us.sv + '</b><span>تصديات</span></div>' : '') +
          '<div><b>' + us.fouls + '</b><span>أخطاء</span></div><div><b>' + (us.yc ? '🟨' : '') + (us.rc ? '🟥' : '') + (us.yc || us.rc ? '' : '—') + '</b><span>بطاقات</span></div>' +
          '</div></div>';
      } else youHtml = '<div class="panel"><h3>لم تشارك</h3><p class="coach">«' + esc(coachLine(sum, rng)) + '» — المدرب</p></div>';
      const ratingList = (si) => {
        const S = m.sides[si];
        return (
          '<div class="rlist"><h4>' + UI.badge(S.club, 20) + ' ' + esc(S.club.short) + '</h4>' +
          S.all
            .filter((x) => x.in >= 0)
            .map((x) => '<div class="rl-row' + (x.pid === 0 ? ' me' : '') + '"><span class="rl-n">' + x.p.num + '</span><span class="rl-name">' + esc(nm(x)) + (x.g ? ' ⚽' + (x.g > 1 ? x.g : '') : '') + (x.a ? ' 🅰️' : '') + (x.rc ? ' 🟥' : x.yc ? ' 🟨' : '') + (x.start ? '' : ' <small class="muted">(بديل)</small>') + '</span>' + UI.rating(x.rt) + '</div>')
            .join('') +
          '</div>'
        );
      };
      return (
        '<div class="panel post-head">' +
        '<div class="vs big"><div class="vs-t">' + UI.badge(H, 50) + '<b>' + esc(H.name) + '</b><div class="scorers">' + goals(0) + '</div></div>' +
        '<div class="vs-m"><span class="final" dir="ltr">' + sum.score[0] + ' - ' + sum.score[1] + '</span><span class="vs-h">نهاية المباراة</span></div>' +
        '<div class="vs-t">' + UI.badge(A, 50) + '<b>' + esc(A.name) + '</b><div class="scorers">' + goals(1) + '</div></div></div>' +
        (motm ? '<div class="motm">⭐ رجل المباراة: <b>' + esc(nm(motm)) + '</b> ' + UI.rating(motm.rt) + '</div>' : '') +
        '</div>' +
        youHtml +
        '<div class="panel"><h3>تقييمات اللاعبين</h3><div class="grid2">' + ratingList(0) + ratingList(1) + '</div></div>' +
        '<div class="cta"><button class="btn gold big" data-act="cont">متابعة</button></div>'
      );
    },
    bind(el, p) {
      if (p.sum && p.sum.played && p.sum.rating >= 8) setTimeout(() => UI.confetti(80), 200);
      el.addEventListener('click', (ev) => {
        const t = ev.target.closest('[data-act=cont]');
        if (!t) return;
        UI.match = null;
        UI.endWeek();
      });
    },
  };
})(globalThis);
