/* =========================================================
   شاشة المنتخب (القسم 15): حالتك مع المنتخب، القائمة، المباريات، ومسيرتك الدولية
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC;
  const UI = FC.UI;
  const U = FC.util;
  const esc = U.esc;

  const GROUPS = [['GK', 'حراسة المرمى'], ['DEF', 'الدفاع'], ['MID', 'الوسط'], ['ATT', 'الهجوم']];
  const GROUP_OF = { GK: 'GK', CB: 'DEF', RB: 'DEF', LB: 'DEF', CDM: 'MID', CM: 'MID', CAM: 'MID', RW: 'ATT', LW: 'ATT', ST: 'ATT' };

  UI.screens.nation = {
    chrome: true,
    nav: 'profile',
    render(p) {
      const st = FC.State.cur;
      const u = st.user;
      if (!FC.Nat || !st.ntDone) return '<div class="panel"><p class="muted">المنتخبات غير متاحة في هذا الحفظ.</p></div>';
      const code = p.code && FC.DATA.nations[p.code] ? p.code : u.nat;
      const id = FC.Nat.idOf(code);
      const club = st.clubs[id];
      const N = FC.DATA.nations[code];
      const mine = code === u.nat;
      const I = u.intl || FC.Nat.emptyIntl();
      const called = FC.Nat.userIn(st, id);
      const pw = FC.Nat.power(st, id);
      // حالتك
      let status;
      if (!mine) status = '';
      else if (called) status = '<div class="banner gold">✅ أنت ضمن قائمة المنتخب' + (club.capt === 0 ? ' — وقائد الفريق 🅒' : '') + (u.away ? ' · مع المنتخب في البطولة الآن' : '') + '</div>';
      else if (I.caps) status = '<div class="banner">لست ضمن القائمة الأخيرة. قدّم مستويات أفضل مع ناديك لتعود.</div>';
      else status = '<div class="banner">لم تُستدعَ بعد. المدرب يختار أفضل ~24 لاعباً ' + esc(N.adj) + 'اً حسب التقييم والفورمة في كل مركز.</div>';
      // المنافسون في مركزك (لمعرفة الفارق)
      let rivals = '';
      if (mine && !called) {
        const pool = FC.Nat.pool(st)[code] || [];
        const same = pool.filter((x) => GROUP_OF[x.pos] === GROUP_OF[u.pos]).sort((a, b) => FC.Nat.callScore(st, b) - FC.Nat.callScore(st, a));
        const quota = U.sum(Object.keys(FC.BAL.nat.squad).filter((k) => GROUP_OF[k] === GROUP_OF[u.pos]).map((k) => FC.BAL.nat.squad[k]));
        const last = same[Math.min(same.length - 1, quota - 1)];
        const myS = FC.Nat.callScore(st, u);
        if (last) rivals = '<p class="muted small">آخر لاعب مستدعى في مجموعة مركزك: ' + esc(FC.Player.fullName(last)) + ' (تقييم ' + Math.floor(last.ovr) + '). ' + (myS >= FC.Nat.callScore(st, last) ? 'مستواك يكفي — انتظر الفترة الدولية القادمة.' : 'تحتاج نحو ' + Math.max(1, Math.ceil(FC.Nat.callScore(st, last) - myS)) + ' نقطة إضافية (تقييم أو فورمة).') + '</p>';
      }
      // القائمة
      const squad = club.squad.map((pid) => FC.getP(st, pid)).filter(Boolean);
      const squadHtml = squad.length
        ? GROUPS.map((g) => {
            const list = squad.filter((pl) => GROUP_OF[pl.pos] === g[0]).sort((a, b) => FC.Player.ovr(b) - FC.Player.ovr(a));
            if (!list.length) return '';
            return (
              '<h4>' + g[1] + '</h4>' +
              list
                .map((pl) => {
                  const isU = pl.id === 0;
                  const cl = st.clubs[isU ? FC.Game.userTeam(st) : pl.club];
                  const caps = isU ? I.caps : pl.iC || 0;
                  const goals = isU ? I.g : pl.iG || 0;
                  return '<div class="sq-row' + (isU ? ' me' : '') + '"><span class="sq-pos">' + esc(FC.Player.POS[pl.pos] ? FC.Player.POS[pl.pos].short || pl.pos : pl.pos) + '</span><span class="sq-n">' + esc(isU ? FC.Player.displayName(pl) : pl.fn + ' ' + pl.ln) + (club.capt === pl.id ? ' <b class="gold-text">🅒</b>' : '') + '</span><span class="sq-c">' + (cl ? UI.badge(cl, 14) + ' ' + esc(cl.short) : '') + '</span><span class="sq-a">' + pl.age + '</span><span class="sq-cap">' + caps + '/' + goals + '</span><b class="sq-o">' + Math.floor(FC.Player.ovr(pl)) + '</b></div>';
                })
                .join('')
            );
          }).join('')
        : '<p class="muted">لم تُعلن قائمة بعد (تُعلن قبل كل فترة دولية).</p>';
      // المباريات
      const fx = (st.fx || []).filter((f) => f.h === id || f.a === id).sort((a, b) => a.w - b.w || a.d - b.d);
      const fxHtml = fx.length
        ? '<div class="results">' + fx.map((f) => '<div class="fx-line"><small class="muted">' + esc(UI.fxDate(st, f.w, f.d)) + ' · ' + esc(FC.Cups.label(st, f)) + '</small>' + UI.fxRow(st, f, [id]) + '</div>').join('') + '</div>'
        : '<p class="muted">لا مباريات مجدولة لهذا المنتخب هذا الموسم بعد (الوديات تُحدد مع كل استدعاء).</p>';
      // مسيرتك الدولية
      const avg = I.caps ? U.round1(I.rs / I.caps) : null;
      const career = mine
        ? '<div class="panel"><h3>مسيرتك الدولية</h3><div class="stat-grid">' +
          '<div><b>' + I.caps + '</b><span>مباراة دولية</span></div><div><b>' + I.g + '</b><span>هدف</span></div><div><b>' + I.a + '</b><span>صناعة</span></div>' +
          '<div>' + UI.rating(avg) + '<span>متوسط التقييم</span></div><div><b>' + I.calls + '</b><span>استدعاء</span></div><div><b>' + (I.capt ? 'نعم' : '—') + '</b><span>القيادة</span></div>' +
          '</div>' +
          (I.debut ? '<p class="muted small">الظهور الأول: ' + FC.Calendar.seasonLabel(I.debut.s) + ' ضد ' + esc(st.clubs[I.debut.opp] ? st.clubs[I.debut.opp].short : '—') + '</p>' : '') +
          ((I.tourn || []).length ? '<h4>البطولات</h4>' + I.tourn.map((t) => '<div class="kv"><span>' + esc(t.name) + ' ' + (t.s + 1) + '</span><b>' + esc(t.res) + '</b></div>').join('') : '') +
          '</div>'
        : '';
      // منتخبات أخرى
      const others = FC.DATA.nationOrder.map((k) => '<button class="chip' + (k === code ? ' on' : '') + '" data-code="' + k + '">' + UI.flag(k, 11) + ' ' + esc(FC.DATA.nations[k].name) + '</button>').join('');
      return (
        '<div class="page-h"><h2>المنتخب الوطني</h2></div>' +
        '<div class="chips-scroll">' + others + '</div>' +
        '<div class="panel nt-head">' +
        '<div class="nt-flag">' + UI.flag(code, 54) + '</div>' +
        '<div class="nt-info"><h3>' + esc(club.name) + '</h3>' +
        '<div class="kv"><span>المدرب</span><b>' + esc(FC.Status.coachName(club.coach)) + '</b></div>' +
        '<div class="kv"><span>قوة التشكيلة</span><b>' + Math.round(pw) + '</b></div>' +
        '<div class="kv"><span>القارة</span><b>' + esc(FC.Nat.confName(N.conf)) + '</b></div>' +
        (club.capt != null && FC.getP(st, club.capt) ? '<div class="kv"><span>القائد</span><b>' + esc(club.capt === 0 ? FC.Player.displayName(u) : FC.Player.fullName(FC.getP(st, club.capt))) + '</b></div>' : '') +
        '<div class="kv"><span>آخر النتائج</span><b>' + (UI.teamForm(st, id, 5).map(UI.formChip).join('') || '—') + '</b></div>' +
        '</div></div>' +
        status + rivals +
        career +
        '<div class="panel"><h3>المباريات هذا الموسم</h3>' + fxHtml + '</div>' +
        '<div class="panel"><div class="next-h"><h3>القائمة الأخيرة</h3><span class="muted small">مباريات/أهداف دولية</span></div><div class="nt-squad">' + squadHtml + '</div></div>' +
        '<div class="cta"><button class="btn" data-go="comps" data-p=\'{"cat":"nat"}\'>بطولات المنتخبات</button></div>'
      );
    },
    bind(el) {
      el.addEventListener('click', (ev) => {
        const t = ev.target.closest('[data-code]');
        if (t) UI.go('nation', { code: t.dataset.code });
      });
      const act = el.querySelector('.chip.on');
      if (act && act.scrollIntoView) act.scrollIntoView({ block: 'nearest', inline: 'center' });
    },
  };
})(globalThis);
