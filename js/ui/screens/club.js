/* =========================================================
   النادي: التشكيلة وعمق المراكز، الخطة، المباريات والنتائج، معلومات النادي
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC;
  const UI = FC.UI;
  const U = FC.util;
  const esc = U.esc;

  const LINES = [['GK', 'حراسة المرمى'], ['DEF', 'الدفاع'], ['MID', 'الوسط'], ['ATT', 'الهجوم']];

  function playerRow(st, p, clubId) {
    const me = p.id === 0;
    const ovr = Math.floor(FC.Player.ovr(p));
    const form = me ? (p.form.length ? U.round1(FC.Player.formOf(p)) : null) : p.sAp ? U.round1(p.sRs / p.sAp) : null;
    return (
      '<tr class="' + (me ? 'me' : '') + '"><td class="num">' + (p.num || '') + '</td>' +
      '<td class="l">' + UI.flag(p.nat, 11) + ' ' + esc(me ? FC.Player.displayName(p) : p.fn + ' ' + p.ln) + '</td>' +
      '<td>' + esc(FC.Player.POS[p.pos].short) + '</td><td>' + p.age + '</td>' +
      '<td><b class="ovr ovr-' + FC.Player.tier(ovr) + '">' + ovr + '</b></td>' +
      '<td>' + (me ? p.season.ap : p.sAp) + '</td><td>' + (me ? p.season.g : p.sG) + '</td><td>' + UI.rating(form) + '</td></tr>'
    );
  }

  UI.screens.club = {
    chrome: true,
    nav: 'club',
    render(p) {
      const st = FC.State.cur;
      const tab = p.tab || 'squad';
      const teamId = p.team === 'first' ? st.user.club : FC.Game.userTeam(st);
      const club = st.clubs[teamId];
      const isYouth = !!club.youth;
      const tabs = [['squad', 'التشكيلة'], ['tactic', 'الخطة'], ['fix', 'المباريات'], ['info', 'النادي']];
      let body = '';
      if (tab === 'squad') {
        const ids = FC.Select.squadIds(st, teamId);
        const players = ids.map((id) => FC.getP(st, id));
        const rivals = FC.Game.userTeam(st) === teamId ? FC.Select.rivals(st, teamId).slice(0, 4) : [];
        if (rivals.length) {
          body +=
            '<div class="panel rivals"><h3>منافسوك على مركزك</h3>' +
            rivals.map((r) => '<div class="rv"><span>' + UI.flag(r.nat, 11) + ' ' + esc(r.fn + ' ' + r.ln) + '</span><span class="muted">' + esc(FC.Player.POS[r.pos].short) + ' · ' + r.age + ' سنة</span><b class="ovr ovr-' + FC.Player.tier(r.ovr) + '">' + Math.floor(r.ovr) + '</b></div>').join('') +
            '<div class="rv me"><span>أنت</span><span class="muted">' + esc(FC.Player.POS[st.user.pos].short) + ' · ' + st.user.age + ' سنة</span><b class="ovr ovr-' + FC.Player.tier(FC.Player.ovr(st.user)) + '">' + Math.floor(FC.Player.ovr(st.user)) + '</b></div>' +
            '</div>';
        }
        LINES.forEach((ln) => {
          const list = players.filter((q) => FC.Player.POS[q.pos].line === ln[0]).sort((a, b) => FC.Player.POS_ORDER.indexOf(a.pos) - FC.Player.POS_ORDER.indexOf(b.pos) || FC.Player.ovr(b) - FC.Player.ovr(a));
          body += '<div class="panel"><h3>' + ln[1] + ' (' + list.length + ')</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th class="l">اللاعب</th><th>المركز</th><th>العمر</th><th>التقييم</th><th>م</th><th>هـ</th><th>الفورمة</th></tr></thead><tbody>' + list.map((q) => playerRow(st, q, teamId)).join('') + '</tbody></table></div></div>';
        });
      } else if (tab === 'tactic') {
        const pick = FC.Select.pick(st, teamId);
        const xy = FC.Select.XY[pick.form];
        body +=
          '<div class="panel"><h3>الخطة ' + pick.form + ' — التشكيلة المتوقعة</h3><div class="lineup-pitch big">' +
          pick.xi
            .map((x, i) => {
              const q = FC.getP(st, x.pid);
              return '<div class="lp-p' + (x.pid === 0 ? ' me' : '') + '" style="left:' + xy[i][0] + '%;top:' + (6 + (100 - xy[i][1]) * 0.86) + '%"><i style="background:' + club.c1 + ';color:' + club.c2 + '">' + q.num + '</i><span>' + esc(x.pid === 0 ? FC.Player.displayName(q) : q.ln) + '</span><small>' + Math.floor(FC.Player.ovr(q)) + '</small></div>';
            })
            .join('') +
          '</div><p class="muted small">' + (FC.Game.userTeam(st) === teamId ? 'دورك: ' + UI.roleChip(FC.Select.roleOf(pick, 0)) + ' · ' : '') + 'الاحتياط: ' + pick.bench.map((id) => esc(FC.getP(st, id).ln || FC.Player.displayName(FC.getP(st, id)))).join('، ') + '</p></div>';
      } else if (tab === 'fix') {
        const list = FC.Comp.clubFixtures(st, teamId);
        body +=
          '<div class="panel"><h3>مباريات الموسم</h3><div class="fixtures">' +
          list
            .map((f) => {
              const o = st.clubs[f.opp];
              const played = f.gf >= 0;
              const r = played ? (f.gf > f.ga ? 'W' : f.gf < f.ga ? 'L' : 'D') : null;
              return '<div class="fx-row' + (f.week === st.week ? ' now' : '') + '"><span class="fx-d">' + esc(UI.weekDate(st, f.week)) + '</span><span class="fx-h">' + (f.home ? 'أرضنا' : 'خارج') + '</span><span class="fx-o">' + UI.badge(o, 18) + ' ' + esc(o.name) + '</span>' + (played ? UI.score(f.home ? f.gf : f.ga, f.home ? f.ga : f.gf) + UI.formChip(r) : '<span class="muted">الجولة ' + (f.r + 1) + '</span>') + '</div>';
            })
            .join('') +
          '</div></div>';
      } else {
        const parent = isYouth ? st.clubs[club.parent] : club;
        const rival = parent.rival ? st.clubs[parent.rival] : null;
        const L = st.leagues[parent.lg];
        body +=
          '<div class="panel club-info"><div class="ci-h">' + UI.badge(parent, 64) + '<div><h2>' + esc(parent.name) + '</h2><p class="muted">' + esc(parent.city) + ' · ' + esc(L.name) + '</p></div></div>' +
          '<div class="kv"><span>السمعة</span><b>' + UI.stars(Math.max(1, Math.round(parent.rep / 20))) + ' <small dir="ltr">(' + parent.rep + ')</small></b></div>' +
          '<div class="kv"><span>المرافق</span><b>' + UI.stars(parent.fac) + '</b></div>' +
          '<div class="kv"><span>سعة الملعب</span><b>' + U.int(parent.cap * 1000) + ' متفرج</b></div>' +
          '<div class="kv"><span>الغريم التقليدي</span><b>' + (rival ? UI.badge(rival, 18) + ' ' + esc(rival.name) : '—') + '</b></div>' +
          '<div class="kv"><span>الخطة المفضلة</span><b>' + parent.form + '</b></div>' +
          '<div class="kv"><span>ألوان القميص</span><b><i class="swatch" style="background:' + parent.c1 + '"></i><i class="swatch" style="background:' + parent.c2 + '"></i></b></div>' +
          '<p class="muted small">المرافق الأفضل تسرّع تطورك (من ×0.85 إلى ×1.2).</p></div>';
      }
      const teamSwitch = isYouth || st.user.team === 'Y' ? '<div class="seg-btns team-sw"><button class="' + (p.team !== 'first' ? 'on' : '') + '" data-team="mine">فريقي (الشباب)</button><button class="' + (p.team === 'first' ? 'on' : '') + '" data-team="first">الفريق الأول</button></div>' : '';
      return (
        '<div class="page-h"><h2>' + UI.badge(club, 30) + ' ' + esc(club.name) + '</h2></div>' +
        teamSwitch +
        '<div class="tabs">' + tabs.map((t) => '<button class="tab' + (t[0] === tab ? ' on' : '') + '" data-tab="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>' +
        body
      );
    },
    bind(el, p) {
      el.addEventListener('click', (ev) => {
        const t = ev.target.closest('[data-tab],[data-team]');
        if (!t) return;
        if (t.dataset.tab) UI.go('club', Object.assign({}, p, { tab: t.dataset.tab }));
        if (t.dataset.team) UI.go('club', Object.assign({}, p, { team: t.dataset.team === 'first' ? 'first' : null }));
      });
    },
  };
})(globalThis);
