/* =========================================================
   ملف اللاعب: البطاقة، السمات مع أسهم التطور، رادار SVG، سجل المواسم
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC;
  const UI = FC.UI;
  const U = FC.util;
  const esc = U.esc;

  UI.screens.profile = {
    chrome: true,
    nav: 'profile',
    render() {
      const st = FC.State.cur;
      const u = st.user;
      const club = st.clubs[FC.Game.userTeam(st)];
      const pr = FC.Player.potRange(st, u);
      const w = FC.BAL.ovrWeights[FC.Player.POS[u.pos].role];
      const groups = FC.Player.GROUP_LIST.filter((g) => (u.pos === 'GK' ? true : g !== 'gk'));
      const attrHtml = groups
        .map((g) => {
          const keys = FC.Player.ATTRS.filter((a) => a[1] === g).map((a) => a[0]);
          return (
            '<div class="agroup"><h4>' + esc(FC.Player.GROUPS[g]) + '</h4>' +
            keys
              .map((k) => {
                const v = Math.floor(u.attrs[k]);
                const d = v - Math.floor(u.seasonStartAttrs[k]);
                const frac = u.attrs[k] - v;
                return '<div class="attr' + (w[k] ? ' key' : '') + '"><span class="an">' + esc(FC.Player.LABEL[k]) + '</span><span class="ab"><i style="width:' + v + '%"></i><em style="width:' + frac * 100 + '%"></em></span><b class="av a-' + (v >= 80 ? 'hi' : v >= 65 ? 'md' : v >= 50 ? 'lo' : 'vl') + '">' + v + '</b>' + (d > 0 ? '<span class="ad up">+' + d + '</span>' : d < 0 ? '<span class="ad dn">' + d + '</span>' : '<span class="ad"></span>') + '</div>';
              })
              .join('') +
            '</div>'
          );
        })
        .join('');
      const s = u.season;
      const hist = u.history
        .slice()
        .reverse()
        .map((h) => '<tr><td>' + FC.Calendar.seasonLabel(h.season) + '</td><td class="l">' + esc(h.clubName) + '</td><td>' + h.ap + '</td><td>' + h.g + '</td><td>' + h.a + '</td><td>' + UI.rating(h.avg || null) + '</td><td>' + h.ovr + '</td></tr>')
        .join('');
      const c = u.career;
      return (
        '<section class="hero">' +
        '<div class="hero-card">' + UI.card(u, { club }) + '</div>' +
        '<div class="panel hero-info">' +
        '<h2>' + esc(FC.Player.fullName(u)) + (u.nick ? ' «' + esc(u.nick) + '»' : '') + '</h2>' +
        '<div class="hero-sub">' + UI.flag(u.nat, 14) + ' ' + esc(FC.DATA.nations[u.nat].name) + ' · ' + esc(u.city) + '</div>' +
        '<div class="kv"><span>المركز</span><b>' + esc(FC.Player.POS[u.pos].name) + '</b></div>' +
        '<div class="kv"><span>العمر</span><b>' + u.age + '</b></div>' +
        '<div class="kv"><span>القدم المفضلة</span><b>' + (u.foot === 'L' ? 'اليسرى' : 'اليمنى') + '</b></div>' +
        '<div class="kv"><span>الطول / الوزن</span><b dir="ltr">' + u.ht + ' cm / ' + u.wt + ' kg</b></div>' +
        '<div class="kv"><span>القدم الضعيفة</span><b>' + UI.stars(u.hid.wf) + '</b></div>' +
        '<div class="kv"><span>المهارات</span><b>' + UI.stars(u.hid.sk) + '</b></div>' +
        '<div class="kv"><span>تقدير الإمكانات</span><b dir="ltr">' + pr[0] + '–' + pr[1] + '</b></div>' +
        '<div class="kv"><span>أعلى تقييم</span><b>' + Math.floor(u.maxOvr) + '</b></div>' +
        '</div></section>' +
        '<div class="grid2">' +
        '<div class="panel"><h3>المخطط</h3>' + UI.radar(FC.Player.cardStats(u), 220) + '</div>' +
        '<div class="panel"><h3>هذا الموسم</h3><div class="stat-grid">' +
        '<div><b>' + s.ap + '</b><span>مباراة</span></div><div><b>' + s.st + '</b><span>أساسي</span></div><div><b>' + Math.round(s.mn) + '</b><span>دقيقة</span></div>' +
        '<div><b>' + s.g + '</b><span>أهداف</span></div><div><b>' + s.a + '</b><span>صناعة</span></div><div>' + UI.rating(s.ap ? U.round1(s.rs / s.ap) : null) + '<span>المتوسط</span></div>' +
        '<div><b dir="ltr">' + s.sh + ' (' + s.sot + ')</b><span>تسديدات</span></div><div><b>' + s.kp + '</b><span>تمريرات مفتاحية</span></div><div><b>' + (s.pas ? Math.round((100 * s.pasOk) / s.pas) : 0) + '%</b><span>دقة التمرير</span></div>' +
        '<div><b>' + s.drb + '</b><span>مراوغات</span></div><div><b>' + (s.tk + s.int) + '</b><span>افتكاك وقطع</span></div><div><b>' + s.motm + '</b><span>رجل المباراة</span></div>' +
        (u.pos === 'GK' ? '<div><b>' + s.sv + '</b><span>تصديات</span></div><div><b>' + s.cs + '</b><span>شباك نظيفة</span></div>' : '') +
        '<div><b>' + s.yc + '</b><span>صفراء</span></div><div><b>' + s.rc + '</b><span>حمراء</span></div>' +
        '</div><h4>المسيرة</h4><p>' + c.ap + ' مباراة · ' + c.g + ' هدف · ' + c.a + ' صناعة · ' + c.motm + ' مرة رجل المباراة</p></div>' +
        '</div>' +
        '<div class="panel"><h3>السمات <small class="muted">(الأسهم = التغير منذ بداية الموسم، والمميزة ذهبياً تؤثر على تقييم مركزك)</small></h3><div class="attrs">' + attrHtml + '</div></div>' +
        (function () {
          const ih = (u.injHist || []).slice().reverse();
          const T = {};
          FC.BAL.inj.types.forEach((t) => (T[t[0]] = t[1]));
          return '<div class="panel"><h3>السجل الطبي والانضباط</h3>' +
            '<div class="kv"><span>الحالة</span><b>' + (u.inj ? '🚑 ' + esc(u.inj.name) + ' (متبقٍ ' + esc(FC.Status.durationText(Math.max(1, u.inj.days))) + ')' : 'جاهز') + '</b></div>' +
            '<div class="kv"><span>الجاهزية</span><b>' + Math.round(u.sharp != null ? u.sharp : 70) + '</b></div>' +
            '<div class="kv"><span>الإيقاف</span><b>' + (u.ban > 0 ? u.ban + ' مباراة' : 'لا يوجد') + '</b></div>' +
            '<div class="kv"><span>الصفراء المتراكمة (الدوري)</span><b>' + (s.ycCount || 0) + ' / ' + FC.BAL.inj.yellowLimit * (Math.floor((s.ycCount || 0) / FC.BAL.inj.yellowLimit) + 1) + '</b></div>' +
            (ih.length ? '<h4>الإصابات السابقة</h4><div class="fixtures">' + ih.slice(0, 8).map((x) => '<div class="fx-row"><span class="fx-d">' + FC.Calendar.seasonLabel(x.s) + '</span><span class="fx-o">' + esc(T[x.k] || x.k) + '</span><span class="muted small">' + esc(FC.Status.durationText(x.d)) + '</span></div>').join('') + '</div>' : '<p class="muted small">لا إصابات حتى الآن.</p>') +
            '</div>';
        })() +
        '<div class="panel"><h3>سجل المواسم</h3>' + (hist ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>الموسم</th><th class="l">الفريق</th><th>م</th><th>هـ</th><th>ص</th><th>التقييم</th><th>OVR</th></tr></thead><tbody>' + hist + '</tbody></table></div>' : '<p class="muted">موسمك الأول ما زال جارياً.</p>') + '</div>' +
        (u.log.length ? '<div class="panel"><h3>مبارياتك هذا الموسم</h3><div class="fixtures">' + u.log.slice().reverse().map((l) => '<div class="fx-row"><span class="fx-d">' + esc(UI.weekDate(st, l.w)) + '</span><span class="fx-o">' + UI.badge(st.clubs[l.opp], 16) + ' ' + esc(st.clubs[l.opp] ? st.clubs[l.opp].short : '') + '</span>' + UI.score(l.h ? l.gf : l.ga, l.h ? l.ga : l.gf) + '<span class="muted small">' + (l.mn ? l.mn + "'" : 'لم يشارك') + (l.g ? ' ⚽' + l.g : '') + (l.a ? ' 🅰️' + l.a : '') + '</span>' + UI.rating(l.r) + '</div>').join('') + '</div></div>' : '')
      );
    },
  };
})(globalThis);
