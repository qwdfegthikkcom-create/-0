/* =========================================================
   البطولات: جداول كل الدوريات، الهدافون، الصناع، نتائج الجولات
   (الكؤوس والبطولات القارية في المرحلة 4)
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC;
  const UI = FC.UI;
  const U = FC.util;
  const esc = U.esc;

  function leaders(st, lg, key) {
    const list = FC.Comp.leaders(st, lg, key, 20);
    if (!list.length) return '<p class="muted">لم تُسجَّل أي ' + (key === 'sG' ? 'أهداف' : 'تمريرات حاسمة') + ' بعد.</p>';
    return (
      '<table class="tbl"><thead><tr><th>#</th><th class="l">اللاعب</th><th class="l">النادي</th><th>م</th><th>' + (key === 'sG' ? 'أهداف' : 'صناعة') + '</th></tr></thead><tbody>' +
      list
        .map((x, i) => {
          const p = FC.getP(st, x.pid);
          const c = st.clubs[x.club];
          return '<tr class="' + (x.pid === 0 ? 'me' : '') + '"><td>' + (i + 1) + '</td><td class="l">' + UI.flag(p.nat, 11) + ' ' + esc(x.pid === 0 ? FC.Player.displayName(p) : p.fn + ' ' + p.ln) + '</td><td class="l">' + UI.badge(c, 16) + ' ' + esc(c.short) + '</td><td>' + x.ap + '</td><td><b>' + x.v + '</b></td></tr>';
        })
        .join('') +
      '</tbody></table>'
    );
  }

  UI.screens.comps = {
    chrome: true,
    nav: 'comps',
    render(p) {
      const st = FC.State.cur;
      const lg = p.lg && st.leagues[p.lg] ? p.lg : FC.Game.userLeague(st);
      const tab = p.tab || 'table';
      const L = st.leagues[lg];
      const team = FC.Game.userTeam(st);
      const order = FC.DATA.leagueOrder.concat(st.leagues.YTH ? ['YTH'] : []);
      let body = '';
      if (tab === 'table') {
        const rows = FC.Comp.table(st, lg);
        const n = rows.length;
        body =
          '<div class="tbl-wrap"><table class="tbl league"><thead><tr><th>#</th><th class="l">الفريق</th><th>لعب</th><th>فاز</th><th>تعادل</th><th>خسر</th><th class="hide-sm">له</th><th class="hide-sm">عليه</th><th>الفارق</th><th>النقاط</th><th class="hide-sm">آخر 5</th></tr></thead><tbody>' +
          rows
            .map((r, i) => {
              const c = st.clubs[r.id];
              const zone = i === 0 ? 'z-champ' : i < 4 && !L.youth ? 'z-top' : i >= n - 3 && !L.youth ? 'z-low' : '';
              return '<tr class="' + (r.id === team || r.id === st.user.club ? 'me ' : '') + zone + '"><td>' + (i + 1) + '</td><td class="l">' + UI.badge(c, 18) + ' <span class="cn">' + esc(c.name) + '</span></td><td>' + r.p + '</td><td>' + r.w + '</td><td>' + r.d + '</td><td>' + r.l + '</td><td class="hide-sm">' + r.gf + '</td><td class="hide-sm">' + r.ga + '</td><td dir="ltr">' + (r.gd > 0 ? '+' : '') + r.gd + '</td><td><b>' + r.pts + '</b></td><td class="hide-sm">' + FC.Comp.clubForm(st, lg, r.id, 5).map(UI.formChip).join('') + '</td></tr>';
            })
            .join('') +
          '</tbody></table></div><p class="muted small">المقاعد القارية والكؤوس تأتي في المرحلة 4.</p>';
      } else if (tab === 'scorers') body = leaders(st, lg, 'sG');
      else if (tab === 'assists') body = leaders(st, lg, 'sA');
      else {
        const nR = L.rounds.length;
        let r = p.r != null ? p.r : L.roundWeeks.findIndex((w) => w >= st.week);
        if (r < 0) r = nR - 1;
        body =
          '<div class="round-nav"><button class="icon-btn" data-r="' + Math.max(0, r - 1) + '">' + UI.icon('back') + '</button><b>الجولة ' + (r + 1) + ' <small class="muted">' + esc(UI.weekDate(st, L.roundWeeks[r])) + '</small></b><button class="icon-btn flip" data-r="' + Math.min(nR - 1, r + 1) + '">' + UI.icon('back') + '</button></div>' +
          '<div class="results">' +
          L.rounds[r]
            .map((f) => '<div class="res-row' + (f[0] === team || f[1] === team ? ' me' : '') + '"><span class="rt-h">' + esc(st.clubs[f[0]].short) + ' ' + UI.badge(st.clubs[f[0]], 18) + '</span>' + (f[2] >= 0 ? UI.score(f[2], f[3]) : '<span class="score muted">—</span>') + '<span class="rt-a">' + UI.badge(st.clubs[f[1]], 18) + ' ' + esc(st.clubs[f[1]].short) + '</span></div>')
            .join('') +
          '</div>';
        UI.screens.comps._r = r;
      }
      return (
        '<div class="page-h"><h2>البطولات</h2></div>' +
        '<div class="chips-scroll">' + order.map((id) => '<button class="chip' + (id === lg ? ' on' : '') + '" data-lg="' + id + '">' + (id === 'YTH' ? '⭐ ' : UI.flag(st.leagues[id].nat, 11) + ' ') + esc(st.leagues[id].short) + '</button>').join('') + '</div>' +
        '<div class="panel"><h3>' + esc(L.name) + ' <small class="muted">' + FC.Calendar.seasonLabel(st.season) + '</small></h3>' +
        '<div class="tabs">' + [['table', 'الترتيب'], ['scorers', 'الهدافون'], ['assists', 'الصناع'], ['rounds', 'النتائج']].map((t) => '<button class="tab' + (t[0] === tab ? ' on' : '') + '" data-tab="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>' +
        body + '</div>' +
        (st.history.seasons.length ? '<div class="panel"><h3>أبطال المواسم السابقة</h3>' + st.history.seasons.slice(-5).reverse().map((h) => '<div class="kv"><span>' + FC.Calendar.seasonLabel(h.season) + '</span><b>' + (h.champs[lg] && st.clubs[h.champs[lg]] ? UI.badge(st.clubs[h.champs[lg]], 16) + ' ' + esc(st.clubs[h.champs[lg]].name) : '—') + (h.scorers[lg] ? ' <small class="muted">· الهداف: ' + esc(h.scorers[lg].name) + ' (' + h.scorers[lg].g + ')</small>' : '') + '</b></div>').join('') + '</div>' : '')
      );
    },
    bind(el, p) {
      el.addEventListener('click', (ev) => {
        const t = ev.target.closest('[data-lg],[data-tab],[data-r]');
        if (!t) return;
        if (t.dataset.lg) UI.go('comps', { lg: t.dataset.lg, tab: p.tab });
        if (t.dataset.tab) UI.go('comps', { lg: p.lg, tab: t.dataset.tab });
        if (t.dataset.r) UI.go('comps', { lg: p.lg, tab: 'rounds', r: parseInt(t.dataset.r, 10) });
      });
      const act = el.querySelector('.chip.on');
      if (act && act.scrollIntoView) act.scrollIntoView({ block: 'nearest', inline: 'center' });
    },
  };
})(globalThis);
