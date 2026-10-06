/* =========================================================
   البطولات: الدوريات (الترتيب، الهدافون، الصناع، النتائج)، الكؤوس المحلية،
   البطولات القارية للأندية، وبطولات المنتخبات (مجموعات + شجرة خروج المغلوب)
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC;
  const UI = FC.UI;
  const U = FC.util;
  const esc = U.esc;

  const CATS = [['lg', 'الدوريات'], ['cup', 'الكؤوس'], ['cont', 'القارية'], ['nat', 'المنتخبات']];

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

  // فرقك (ناديك ومنتخبك) لتمييزها في الجداول
  function meIds(st) {
    const out = [FC.Game.userTeam(st)];
    if (FC.Nat) out.push(FC.Nat.idOf(st.user.nat));
    return out;
  }

  // ================= الدوريات =================
  function leagueView(st, p) {
    const lg = p.lg && st.leagues[p.lg] ? p.lg : FC.Game.userLeague(st);
    const tab = p.tab || 'table';
    const L = st.leagues[lg];
    const team = FC.Game.userTeam(st);
    const order = FC.DATA.leagueOrder.concat(st.leagues.YTH ? ['YTH'] : []);
    const B = FC.BAL.cups;
    let body = '';
    if (tab === 'table') {
      const rows = FC.Comp.table(st, lg);
      const n = rows.length;
      const cont = B.euSlots[lg] || B.asSlots[lg] || 0;
      body =
        '<div class="tbl-wrap"><table class="tbl league"><thead><tr><th>#</th><th class="l">الفريق</th><th>لعب</th><th>فاز</th><th>تعادل</th><th>خسر</th><th class="hide-sm">له</th><th class="hide-sm">عليه</th><th>الفارق</th><th>النقاط</th><th class="hide-sm">آخر 5</th></tr></thead><tbody>' +
        rows
          .map((r, i) => {
            const c = st.clubs[r.id];
            const zone = i === 0 ? 'z-champ' : i < cont && !L.youth ? 'z-top' : i >= n - 3 && !L.youth ? 'z-low' : '';
            return '<tr class="' + (r.id === team || r.id === st.user.club ? 'me ' : '') + zone + '"><td>' + (i + 1) + '</td><td class="l">' + UI.badge(c, 18) + ' <span class="cn">' + esc(c.name) + '</span></td><td>' + r.p + '</td><td>' + r.w + '</td><td>' + r.d + '</td><td>' + r.l + '</td><td class="hide-sm">' + r.gf + '</td><td class="hide-sm">' + r.ga + '</td><td dir="ltr">' + (r.gd > 0 ? '+' : '') + r.gd + '</td><td><b>' + r.pts + '</b></td><td class="hide-sm">' + FC.Comp.clubForm(st, lg, r.id, 5).map(UI.formChip).join('') + '</td></tr>';
          })
          .join('') +
        '</tbody></table></div>' +
        (L.youth ? '' : '<p class="muted small">' + (cont ? 'الأخضر: مقاعد ' + (B.euSlots[lg] ? 'كأس النخبة الأوروبية' : 'كأس النخبة الآسيوية') + ' الموسم القادم (' + cont + ').' : '') + '</p>');
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
    }
    return (
      '<div class="chips-scroll">' + order.map((id) => '<button class="chip' + (id === lg ? ' on' : '') + '" data-lg="' + id + '">' + (id === 'YTH' ? '⭐ ' : UI.flag(st.leagues[id].nat, 11) + ' ') + esc(st.leagues[id].short) + '</button>').join('') + '</div>' +
      '<div class="panel"><h3>' + esc(L.name) + ' <small class="muted">' + FC.Calendar.seasonLabel(st.season) + '</small></h3>' +
      '<div class="tabs">' + [['table', 'الترتيب'], ['scorers', 'الهدافون'], ['assists', 'الصناع'], ['rounds', 'النتائج']].map((t) => '<button class="tab' + (t[0] === tab ? ' on' : '') + '" data-tab="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>' +
      body + '</div>' +
      (st.history.seasons.length ? '<div class="panel"><h3>أبطال المواسم السابقة</h3>' + st.history.seasons.slice(-5).reverse().map((h) => '<div class="kv"><span>' + FC.Calendar.seasonLabel(h.season) + '</span><b>' + (h.champs[lg] && st.clubs[h.champs[lg]] ? UI.badge(st.clubs[h.champs[lg]], 16) + ' ' + esc(st.clubs[h.champs[lg]].name) : '—') + (h.scorers[lg] ? ' <small class="muted">· الهداف: ' + esc(h.scorers[lg].name) + ' (' + h.scorers[lg].g + ')</small>' : '') + '</b></div>').join('') + '</div>' : '')
    );
  }

  // ================= مسابقة (كأس / قارية / منتخبات) =================
  function compView(st, c, p) {
    const me = meIds(st);
    const hasG = c.stages.some((s) => s.k === 'grp');
    const hasK = c.stages.some((s) => s.k === 'ko');
    const cur = c.stages[c.cur];
    const tab = p.tab && ['grp', 'ko', 'sc'].indexOf(p.tab) >= 0 ? p.tab : cur.k === 'grp' ? 'grp' : 'ko';
    const tabs = [];
    if (hasG) tabs.push(['grp', c.kind === 'q' ? 'المجموعات' : 'دور المجموعات']);
    if (hasK) tabs.push(['ko', 'خروج المغلوب']);
    tabs.push(['sc', 'الهدافون']);
    let body = '';
    if (tab === 'grp' && hasG) {
      const si = c.stages.findIndex((s) => s.k === 'grp');
      const stg = c.stages[si];
      if (!stg.groups) body = '<p class="muted">لم تُجرَ القرعة بعد.</p>';
      else {
        const note = c.kind === 'q' ? 'يتأهل أول ' + stg.adv + ' من كل مجموعة.' : 'يتأهل الأول والثاني' + (stg.thirds ? ' وأفضل ' + stg.thirds + ' من أصحاب المركز الثالث' : '') + '.';
        body =
          '<p class="muted small">' + note + '</p><div class="grp-grid">' +
          stg.groups
            .map((gr, gi) => {
              const fx = st.fx.filter((f) => f.c === c.id && f.s === si && f.g === gi);
              const mine = gr.ids.some((id) => me.indexOf(id) >= 0);
              return '<div class="grp-box' + (mine ? ' mine' : '') + '">' + UI.groupTable(st, gr, FC.Cups.groupName(gi), me, stg.adv) +
                '<details' + (mine ? ' open' : '') + '><summary>المباريات</summary><div class="results">' + fx.map((f) => UI.fxRow(st, f, me)).join('') + '</div></details></div>';
            })
            .join('') +
          '</div>';
      }
    } else if (tab === 'ko' && hasK) {
      const ks = c.stages.map((s, i) => ({ s, i })).filter((x) => x.s.k === 'ko');
      // عدد المواجهات في كل دور (للأدوار التي لم تُسحب بعد)
      let n = ks[0].s.ties ? ks[0].s.ties.length : 0;
      if (!n) {
        const prev = c.stages[ks[0].i - 1];
        n = prev && prev.k === 'grp' ? (prev.nG * 2 + (prev.thirds || 0)) / 2 : Math.max(1, Math.pow(2, ks.length - 1));
      }
      body =
        '<div class="bracket-wrap"><div class="bracket">' +
        ks
          .map((x, k) => {
            const cnt = x.s.ties ? x.s.ties.length : Math.max(1, Math.round(n / Math.pow(2, k)));
            const ties = [];
            for (let t = 0; t < cnt; t++) ties.push(UI.tieBox(st, x.s, x.s.ties ? x.s.ties[t] : null, me));
            return '<div class="br-col"><h5>' + esc(x.s.n) + '</h5><div class="br-ties">' + ties.join('') + '</div></div>';
          })
          .join('') +
        (c.win ? '<div class="br-col champ"><h5>البطل</h5><div class="br-ties"><div class="tie champ-box">🏆 ' + UI.badge(st.clubs[c.win], 26) + '<b>' + esc(st.clubs[c.win].name) + '</b></div></div></div>' : '') +
        '</div></div>' +
        '<p class="muted small">مباريات خروج المغلوب تُحسم بالأشواط الإضافية ثم ركلات الترجيح. الأرقام بين القوسين: ركلات الترجيح.</p>';
    } else {
      const list = FC.Cups.scorers(st, c, 15);
      body = list.length
        ? '<table class="tbl"><thead><tr><th>#</th><th class="l">اللاعب</th><th class="l">الفريق</th><th>صناعة</th><th>أهداف</th></tr></thead><tbody>' +
          list
            .map((x, i) => {
              const pl = FC.getP(st, x.pid);
              const cl = st.clubs[x.club];
              if (!pl || !cl) return '';
              return '<tr class="' + (x.pid === 0 ? 'me' : '') + '"><td>' + (i + 1) + '</td><td class="l">' + UI.flag(pl.nat, 11) + ' ' + esc(x.pid === 0 ? FC.Player.displayName(pl) : pl.fn + ' ' + pl.ln) + '</td><td class="l">' + UI.badge(cl, 16) + ' ' + esc(cl.short) + '</td><td>' + x.a + '</td><td><b>' + x.g + '</b></td></tr>';
            })
            .join('') +
          '</tbody></table>'
        : '<p class="muted">لم تُسجَّل أهداف بعد.</p>';
    }
    // حالة فرقك في المسابقة
    const my = me.filter((id) => c.teams.indexOf(id) >= 0).map((id) => {
      const s = FC.Cups.statusOf(st, c, id);
      return s ? '<span class="chip-tag ' + (s.k === 'win' ? 'ok' : s.k === 'out' ? 'bad' : 'mid') + '">' + UI.badge(st.clubs[id], 14) + ' ' + esc(s.txt) + '</span>' : '';
    });
    const next = st.fx.filter((f) => f.c === c.id && f.hg < 0).sort((a, b) => a.w - b.w || a.d - b.d)[0];
    const head =
      '<div class="comp-h"><h3>' + esc(c.name) + ' <small class="muted">' + FC.Calendar.seasonLabel(st.season) + '</small></h3>' +
      (c.win ? '<span class="chip-tag ok">🏆 ' + esc(st.clubs[c.win].name) + '</span>' : '<span class="muted small">' + esc(cur.n) + (next ? ' · ' + esc(UI.fxDate(st, next.w, next.d)) : '') + '</span>') +
      '</div>' +
      (c.host && st.clubs[c.host] ? '<p class="muted small">المستضيف: ' + UI.badge(st.clubs[c.host], 14) + ' ' + esc(st.clubs[c.host].short) + '</p>' : '') +
      (my.length ? '<div class="my-status">' + my.join('') + '</div>' : '');
    return '<div class="panel">' + head + '<div class="tabs">' + tabs.map((t) => '<button class="tab' + (t[0] === tab ? ' on' : '') + '" data-tab="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>' + body + '</div>' + historyPanel(st, c.id);
  }

  // أبطال النسخ السابقة
  function historyPanel(st, id) {
    const rows = (st.history.seasons || []).filter((h) => h.cups && h.cups[id]).slice(-8).reverse();
    if (!rows.length) return '';
    return (
      '<div class="panel"><h3>الأبطال السابقون</h3>' +
      rows
        .map((h) => {
          const r = h.cups[id];
          const cl = st.clubs[r.win];
          return '<div class="kv"><span>' + FC.Calendar.seasonLabel(h.season) + '</span><b>' + (cl ? UI.badge(cl, 16) + ' ' : '') + esc(r.winName) + (r.top ? ' <small class="muted">· الهداف: ' + esc(r.top.name) + ' (' + r.top.g + ')</small>' : '') + '</b></div>';
        })
        .join('') +
      '</div>'
    );
  }

  // المسابقات المتاحة لكل فئة
  function compsOfCat(st, cat) {
    const all = Object.values(st.comps || {});
    if (cat === 'cup') return FC.DATA.leagueOrder.map((lg) => st.comps['CUP_' + lg]).filter(Boolean);
    if (cat === 'cont') return ['CL_EU', 'CL_AS'].map((id) => st.comps[id]).filter(Boolean);
    return all.filter((c) => c.nat && c.kind !== 'fr');
  }

  // مواعيد البطولات الدولية القادمة (عندما لا توجد بطولة هذا الموسم)
  function natCalendar(st) {
    const B = FC.BAL.nat;
    const out = [];
    for (let s = st.season; s < st.season + 4; s++) {
      const y = s % 4;
      if (y === B.cycle.WC) out.push(['كأس العالم', 'صيف ' + (s + 1), 'التصفيات خلال موسم ' + FC.Calendar.seasonLabel(s)]);
      if (y === B.cycle.EURO) out.push(['كأس أوروبا', 'صيف ' + (s + 1), '']);
      if (y === B.cycle.COPA) out.push(['كوبا أمريكا', 'صيف ' + (s + 1), '']);
      if (y === B.cycle.ASIA) out.push(['كأس آسيا', 'يناير ' + (s + 1), 'تغيب عن ناديك أثناءها']);
      if (y === B.cycle.AFCON) out.push(['كأس أفريقيا', 'يناير ' + (s + 1), 'تغيب عن ناديك أثناءها']);
    }
    return '<div class="panel"><h3>روزنامة البطولات الدولية</h3>' + out.map((r) => '<div class="kv"><span>' + esc(r[0]) + '</span><b>' + esc(r[1]) + (r[2] ? ' <small class="muted">· ' + esc(r[2]) + '</small>' : '') + '</b></div>').join('') + '</div>';
  }

  UI.screens.comps = {
    chrome: true,
    nav: 'comps',
    render(p) {
      const st = FC.State.cur;
      let cat = p.cat || 'lg';
      if (!st.comps && cat !== 'lg') cat = 'lg';
      let html = '<div class="page-h"><h2>البطولات</h2></div><div class="seg cats">' + CATS.map((c) => '<button class="' + (c[0] === cat ? 'on' : '') + '" data-cat="' + c[0] + '">' + c[1] + '</button>').join('') + '</div>';
      if (cat === 'lg') return html + leagueView(st, p);
      const list = compsOfCat(st, cat);
      if (!list.length) {
        html += '<div class="panel"><p class="muted">' + (cat === 'nat' ? 'لا توجد بطولات أو تصفيات للمنتخبات هذا الموسم.' : 'تبدأ هذه المسابقات من الموسم القادم.') + '</p></div>';
        return html + (cat === 'nat' ? natCalendar(st) : '');
      }
      // الافتراضي: مسابقة فريقك
      const me = meIds(st);
      let c = p.c && st.comps[p.c] && list.indexOf(st.comps[p.c]) >= 0 ? st.comps[p.c] : null;
      if (!c) c = list.find((x) => x.teams.some((id) => me.indexOf(id) >= 0)) || (cat === 'cup' ? st.comps['CUP_' + FC.Game.userLeague(st)] : null) || list[0];
      html +=
        '<div class="chips-scroll">' +
        list.map((x) => '<button class="chip' + (x === c ? ' on' : '') + '" data-c="' + x.id + '">' + (x.lg && st.leagues[x.lg] ? UI.flag(st.leagues[x.lg].nat, 11) + ' ' : x.nat ? '🌍 ' : '⭐ ') + esc(x.kind === 'cup' ? st.leagues[x.lg].short : x.short) + '</button>').join('') +
        '</div>';
      html += compView(st, c, p);
      if (cat === 'nat') html += natCalendar(st);
      return html;
    },
    bind(el, p) {
      el.addEventListener('click', (ev) => {
        const t = ev.target.closest('[data-lg],[data-tab],[data-r],[data-cat],[data-c]');
        if (!t) return;
        if (t.dataset.cat) UI.go('comps', { cat: t.dataset.cat, lg: p.lg });
        if (t.dataset.c) UI.go('comps', { cat: p.cat, c: t.dataset.c });
        if (t.dataset.lg) UI.go('comps', { cat: 'lg', lg: t.dataset.lg, tab: p.tab });
        if (t.dataset.tab) UI.go('comps', { cat: p.cat, lg: p.lg, c: p.c, tab: t.dataset.tab });
        if (t.dataset.r) UI.go('comps', { cat: 'lg', lg: p.lg, tab: 'rounds', r: parseInt(t.dataset.r, 10) });
      });
      const act = el.querySelector('.chip.on');
      if (act && act.scrollIntoView) act.scrollIntoView({ block: 'nearest', inline: 'center' });
    },
  };
})(globalThis);
