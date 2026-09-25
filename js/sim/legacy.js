/* =========================================================
   الإرث (القسم 18): الأرقام القياسية، الإنجازات، الاعتزال (اختياري بعد 33 أو إجباري)،
   ملخص المسيرة وتصنيف الإرث (مغمور ← محترف جيد ← نجم ← أسطورة ← أسطورة خالدة)،
   و«قاعة المشاهير» التي تحفظ كل مسيراتك (التخزين في save.js)
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC = G.FC || {};
  const U = FC.util;
  const BL = () => FC.BAL.legacy;

  const TIERS = [
    { name: 'مغمور', icon: '🌱' },
    { name: 'محترف جيد', icon: '⚽' },
    { name: 'نجم', icon: '⭐' },
    { name: 'أسطورة', icon: '🏆' },
    { name: 'أسطورة خالدة', icon: '👑' },
  ];

  // عدد ألقاب من نوع
  const tro = (u, k) => (u.trophies || []).filter((t) => t.k === k).length;
  const awd = (u, k) => (u.awards || []).filter((a) => a.k === k).length;

  // ================= الإنجازات =================
  const ACH = [
    { id: 'senior', icon: '👕', name: 'أول ظهور مع الكبار', desc: 'العب أول مباراة مع الفريق الأول', t: (st, u) => !!st.flags.firstSenior },
    { id: 'goal1', icon: '⚽', name: 'الهدف الأول', desc: 'سجل أول أهدافك', t: (st, u) => u.career.g + (u.intl ? u.intl.g : 0) >= 1 },
    { id: 'hat', icon: '🎩', name: 'هاتريك', desc: 'سجل ثلاثة أهداف في مباراة', t: (st, u) => (u.rec.hat || 0) >= 1 },
    { id: 'g50', icon: '5️⃣', name: '50 هدفاً', desc: 'سجل 50 هدفاً مع الأندية', t: (st, u) => u.career.g >= 50, p: (u) => [u.career.g, 50] },
    { id: 'g100', icon: '💯', name: '100 هدف', desc: 'سجل 100 هدف مع الأندية', t: (st, u) => u.career.g >= 100, p: (u) => [u.career.g, 100] },
    { id: 'g250', icon: '🔥', name: '250 هدفاً', desc: 'سجل 250 هدفاً مع الأندية', t: (st, u) => u.career.g >= 250, p: (u) => [u.career.g, 250] },
    { id: 'a50', icon: '🅰️', name: 'صانع الألعاب', desc: '50 تمريرة حاسمة مع الأندية', t: (st, u) => u.career.a >= 50, p: (u) => [u.career.a, 50] },
    { id: 'ap100', icon: '💪', name: '100 مباراة', desc: 'العب 100 مباراة مع الأندية', t: (st, u) => u.career.ap >= 100, p: (u) => [u.career.ap, 100] },
    { id: 'ap500', icon: '🏟️', name: '500 مباراة', desc: 'العب 500 مباراة مع الأندية', t: (st, u) => u.career.ap >= 500, p: (u) => [u.career.ap, 500] },
    { id: 'season30', icon: '🎯', name: 'موسم الثلاثين', desc: 'سجل 30 هدفاً في موسم واحد', t: (st, u) => (u.rec.seasonG || 0) >= 30 || u.season.g >= 30 },
    { id: 'motm10', icon: '⭐', name: 'رجل المباريات', desc: 'كن رجل المباراة 10 مرات', t: (st, u) => u.career.motm >= 10, p: (u) => [u.career.motm, 10] },
    { id: 'perfect', icon: '💎', name: 'التقييم الكامل', desc: 'احصل على تقييم 10 في مباراة', t: (st, u) => (u.rec.bestR || 0) >= 10 },
    { id: 'cap1', icon: '🌍', name: 'أول استدعاء دولي', desc: 'العب أول مباراة مع منتخب بلدك', t: (st, u) => u.intl && u.intl.caps >= 1 },
    { id: 'cap50', icon: '🎖️', name: '50 مباراة دولية', desc: 'العب 50 مباراة مع المنتخب', t: (st, u) => u.intl && u.intl.caps >= 50, p: (u) => [u.intl ? u.intl.caps : 0, 50] },
    { id: 'cap100', icon: '🏅', name: 'نادي المئة', desc: 'العب 100 مباراة دولية', t: (st, u) => u.intl && u.intl.caps >= 100, p: (u) => [u.intl ? u.intl.caps : 0, 100] },
    { id: 'intlGoal', icon: '🥅', name: 'هدف دولي', desc: 'سجل مع المنتخب', t: (st, u) => u.intl && u.intl.g >= 1 },
    { id: 'capt', icon: '©️', name: 'القائد', desc: 'احمل شارة القيادة في ناديك', t: (st, u) => !!u.captain || !!u.rec.capt },
    { id: 'ntCapt', icon: '🎗️', name: 'قائد المنتخب', desc: 'احمل شارة قيادة المنتخب', t: (st, u) => !!(u.intl && u.intl.capt) || !!u.rec.ntCapt },
    { id: 'league', icon: '🏆', name: 'بطل الدوري', desc: 'افز بلقب الدوري', t: (st, u) => tro(u, 'league') >= 1 },
    { id: 'cup', icon: '🥇', name: 'بطل الكأس', desc: 'افز بالكأس المحلية', t: (st, u) => tro(u, 'cup') >= 1 },
    { id: 'cont', icon: '⭐', name: 'نخبة القارة', desc: 'افز بكأس النخبة القارية', t: (st, u) => tro(u, 'cont') >= 1 },
    { id: 'intl', icon: '🌟', name: 'بطل القارة مع المنتخب', desc: 'افز ببطولة قارية مع منتخبك', t: (st, u) => (u.trophies || []).some((t) => t.k === 'nt' && t.id !== 'WC') },
    { id: 'wc', icon: '🌐', name: 'بطل العالم', desc: 'افز بكأس العالم', t: (st, u) => (u.trophies || []).some((t) => t.id === 'WC') },
    { id: 'treble', icon: '🔱', name: 'الثلاثية', desc: 'الدوري والكأس والقارية في موسم واحد', t: (st, u) => (u.trophies || []).some((t) => t.k === 'league' && ['cup', 'cont'].every((k) => (u.trophies || []).some((x) => x.k === k && x.s === t.s))) },
    { id: 'poty', icon: '🥇', name: 'أفضل لاعب في الدوري', desc: 'افز بجائزة أفضل لاعب في الدوري', t: (st, u) => awd(u, 'poty') >= 1 },
    { id: 'top', icon: '👟', name: 'الهداف', desc: 'تصدر هدافي الدوري', t: (st, u) => awd(u, 'top') >= 1 },
    { id: 'tots', icon: '📋', name: 'تشكيلة الموسم', desc: 'ادخل تشكيلة موسم الدوري', t: (st, u) => awd(u, 'tots') >= 1 },
    { id: 'ballon30', icon: '🎗️', name: 'مرشح للكرة الذهبية', desc: 'ادخل قائمة أفضل 30', t: (st, u) => (u.awards || []).some((a) => /^ballon/.test(a.k)) },
    { id: 'ballon', icon: '🏐', name: 'الكرة الذهبية', desc: 'كن أفضل لاعب في العالم', t: (st, u) => awd(u, 'ballon') >= 1 },
    { id: 'abroad', icon: '✈️', name: 'الاحتراف الخارجي', desc: 'العب في دوري خارج بلدك', t: (st, u) => (u.history || []).some((h) => h.lg && state_nat(st, h.lg) && state_nat(st, h.lg) !== u.nat) || (FC.Game.userLeague(st) && state_nat(st, FC.Game.userLeague(st)) && state_nat(st, FC.Game.userLeague(st)) !== u.nat) },
    { id: 'big5', icon: '🌆', name: 'الدوريات الكبرى', desc: 'العب في إنجلترا أو إسبانيا أو ألمانيا أو إيطاليا أو فرنسا', t: (st, u) => ['ENG', 'ESP', 'GER', 'ITA', 'FRA'].indexOf(FC.Game.userLeague(st)) >= 0 || (u.history || []).some((h) => ['ENG', 'ESP', 'GER', 'ITA', 'FRA'].indexOf(h.lg) >= 0) },
    { id: 'val50', icon: '💰', name: 'قيمة 50 مليون', desc: 'تصل قيمتك السوقية إلى 50 مليون $', t: (st, u) => (u.rec.peakVal || 0) >= 5e7 },
    { id: 'val100', icon: '💎', name: 'قيمة 100 مليون', desc: 'تصل قيمتك السوقية إلى 100 مليون $', t: (st, u) => (u.rec.peakVal || 0) >= 1e8 },
    { id: 'fol1m', icon: '📣', name: 'مليون متابع', desc: 'مليون متابع على «نبض»', t: (st, u) => (u.followers || 0) >= 1e6 },
    { id: 'sponsor', icon: '✍️', name: 'وجه إعلاني', desc: 'وقّع أول عقد رعاية', t: (st, u) => (u.sponsors || []).length > 0 || !!u.rec.sponsor },
    { id: 'mansion', icon: '🏰', name: 'قصر الأحلام', desc: 'اشترِ القصر', t: (st, u) => u.life && u.life.home >= 3 },
    { id: 'loyal', icon: '❤️', name: 'ابن النادي', desc: '10 مواسم مع النادي نفسه', t: (st, u) => Legacy.loyalty(u) >= 10 },
    { id: 'rival', icon: '⚔️', name: 'تفوقت على غريمك', desc: 'سجل أكثر من غريمك في 3 مواسم', t: (st, u) => (u.rec.beatRival || 0) >= 3 },
  ];
  function state_nat(st, lg) {
    return st.leagues[lg] ? st.leagues[lg].nat : lg === 'YTH' && st.leagues.YTH ? st.leagues.YTH.nat : null;
  }

  const Legacy = (FC.Legacy = {
    ACH,
    TIERS,

    ensure(state) {
      const u = state.user;
      if (!u) return;
      if (!u.rec) u.rec = { hat: 0, maxG: 0, bestR: 0, seasonG: 0, peakOvr: FC.Player.ovr(u), peakVal: 0, peakFame: 0, beatRival: 0 };
      if (!u.ach) u.ach = {};
      if (!u.awards) u.awards = [];
    },

    // بعد مباراتك: الأرقام القياسية ثم الإنجازات
    afterMatch(state, sum) {
      Legacy.ensure(state);
      const u = state.user;
      const R = u.rec;
      if (sum.played) {
        const g = sum.userStats.g;
        if (g >= 3) R.hat++;
        R.maxG = Math.max(R.maxG, g);
        R.bestR = Math.max(R.bestR, sum.rating || 0);
      }
      if (u.captain) R.capt = true;
      if (u.intl && u.intl.capt) R.ntCapt = true;
      return Legacy.check(state);
    },

    // أسبوعياً: القمم (التقييم، القيمة، الشهرة) ثم الإنجازات
    weekly(state) {
      Legacy.ensure(state);
      const u = state.user;
      if (u.retired) return [];
      const R = u.rec;
      R.peakOvr = Math.max(R.peakOvr || 0, FC.Player.ovr(u));
      R.peakVal = Math.max(R.peakVal || 0, FC.Econ.value(state, u));
      R.peakFame = Math.max(R.peakFame || 0, u.fame || 0);
      if ((u.sponsors || []).length) R.sponsor = true;
      return Legacy.check(state);
    },

    // فحص الإنجازات الجديدة
    check(state) {
      const u = state.user;
      const out = [];
      ACH.forEach((a) => {
        if (u.ach[a.id]) return;
        let ok = false;
        try {
          ok = a.t(state, u);
        } catch (e) {
          ok = false;
        }
        if (ok) {
          u.ach[a.id] = { s: state.season, w: state.week };
          out.push(a);
          FC.Msg.add(state, 'club', 'إنجاز جديد: ' + a.name, a.icon + ' ' + a.desc + '.');
        }
      });
      if (out.length) state.newAch = (state.newAch || []).concat(out.map((a) => a.id)).slice(-8);
      return out;
    },

    // مواسم مع النادي نفسه (متتالية حتى الآن)
    loyalty(u) {
      const h = (u.history || []).filter((x) => x.team === 'F');
      let n = 0;
      for (let i = h.length - 1; i >= 0 && h[i].club === u.club; i--) n++;
      return n;
    },

    // نهاية الموسم: رقم موسمك، والمقارنة مع الغريم
    seasonEnd(state) {
      Legacy.ensure(state);
      const u = state.user;
      u.rec.seasonG = Math.max(u.rec.seasonG || 0, u.season.g);
      if (FC.Life && FC.Life.rival(state) && u.team === 'F' && u.season.g > FC.Life.rivalGoals(state)) u.rec.beatRival = (u.rec.beatRival || 0) + 1;
      Legacy.check(state);
    },

    // ================= الاعتزال =================
    canRetire(state) {
      const u = state.user;
      return !u.retired && u.age >= BL().retireAge;
    },
    // سبب الاعتزال الإجباري (إن وُجد) — يُفحص عند نهاية الموسم
    forcedReason(state) {
      const u = state.user;
      const B = BL();
      if (u.age >= B.forceAge) return 'age';
      if (u.age >= B.forceAgeLow && FC.Player.ovr(u) < B.forceOvr) return 'decline';
      if (u.inj && u.inj.k === 'acl' && u.age >= B.injuryAge && u.inj.careerEnd) return 'injury';
      return null;
    },

    // نقاط الإرث وتصنيفه
    points(state) {
      const u = state.user;
      const P = BL().pts;
      const A = BL().award;
      const I = u.intl || { caps: 0, g: 0 };
      let pts = u.career.ap * P.ap + u.career.g * P.g + u.career.a * P.a + u.career.motm * P.motm + I.caps * P.caps + I.g * P.ig;
      (u.trophies || []).forEach((t) => (pts += t.id === 'WC' ? P.WC : t.k === 'nt' ? P.intl : P[t.k] || 0));
      (u.awards || []).forEach((a) => (pts += A[a.k] || 0));
      const R = u.rec || {};
      pts += Math.max(0, (R.peakOvr || 0) - 70) * P.peakOvr + (R.peakFame || 0) * P.fame;
      return Math.round(pts);
    },
    tierOf(pts) {
      const T = BL().tiers;
      let i = 0;
      for (let k = 0; k < T.length; k++) if (pts >= T[k]) i = k;
      return i;
    },

    // خط زمني للأندية من سجل المواسم
    timeline(state) {
      const u = state.user;
      const rows = [];
      (u.history || []).forEach((h) => {
        const last = rows[rows.length - 1];
        const key = h.clubName + (h.team === 'Y' ? ' (الشباب)' : '');
        if (last && last.key === key) {
          last.to = h.season;
          last.ap += h.ap;
          last.g += h.g;
          last.a += h.a;
        } else rows.push({ key, name: key, from: h.season, to: h.season, ap: h.ap, g: h.g, a: h.a, lg: h.lg, club: h.club, youth: h.team === 'Y' });
      });
      return rows;
    },

    // ملخص المسيرة (يُحفظ في قاعة المشاهير)
    summary(state) {
      const u = state.user;
      const pts = Legacy.points(state);
      const tier = Legacy.tierOf(pts);
      const I = u.intl || { caps: 0, g: 0, a: 0 };
      const count = (list, key) => {
        const o = {};
        (list || []).forEach((x) => (o[x[key]] = (o[x[key]] || 0) + 1));
        return o;
      };
      const R = u.rec || {};
      const bestSeason = (u.history || []).reduce((b, h) => (!b || h.g > b.g ? h : b), null);
      return {
        id: state.seed + '_' + state.season + '_' + Date.now(),
        name: FC.Player.fullName(u), fn: u.fn, ln: u.ln, nick: u.nick || '', nat: u.nat, pos: u.pos, face: u.face,
        from: state.startSeason, to: state.season, age: u.age,
        clubs: Legacy.timeline(state),
        ap: u.career.ap, g: u.career.g, a: u.career.a, motm: u.career.motm,
        caps: I.caps, ig: I.g, ia: I.a,
        trophies: (u.trophies || []).map((t) => ({ s: t.s, k: t.k, id: t.id, name: t.name })),
        trophyCount: count(u.trophies, 'k'),
        awards: (u.awards || []).map((a) => ({ s: a.s, k: a.k, name: a.name })),
        peakOvr: Math.floor(R.peakOvr || FC.Player.ovr(u)), peakVal: R.peakVal || 0, peakFame: Math.round(R.peakFame || u.fame || 0),
        records: { hat: R.hat || 0, maxG: R.maxG || 0, bestR: R.bestR || 0, seasonG: Math.max(R.seasonG || 0, bestSeason ? bestSeason.g : 0), bestSeason: bestSeason ? { s: bestSeason.season, g: bestSeason.g, club: bestSeason.clubName } : null },
        ach: Object.keys(u.ach || {}).length,
        pts, tier, tierName: TIERS[tier].name, tierIcon: TIERS[tier].icon,
        rival: FC.Life && state.rival ? { name: FC.Life.rival(state) ? FC.Player.fullName(FC.Life.rival(state)) : '', hist: state.rival.hist.slice(-3) } : null,
        retiredAt: Date.now(),
      };
    },

    // الاعتزال: يُنهي المسيرة ويحفظ ملخصها
    retire(state, reason) {
      const u = state.user;
      if (u.retired) return state.legacy;
      Legacy.ensure(state);
      Legacy.weekly(state);
      // الموسم الجاري يُضاف لسجلك إن لم يُسجَّل بعد
      if (u.season.ap && !(u.history || []).some((h) => h.season === state.season)) {
        const s = u.season;
        u.history.push({ season: state.season, club: u.club, team: u.team, lg: FC.Game.userLeague(state), clubName: state.clubs[FC.Game.userTeam(state)].name, ap: s.ap, st: s.st, mn: s.mn, g: s.g, a: s.a, avg: s.ap ? U.round1(s.rs / s.ap) : 0, ovr: Math.floor(FC.Player.ovr(u)), motm: s.motm, pos: 0 });
      }
      const sum = Legacy.summary(state);
      sum.reason = reason || 'choice';
      u.retired = { s: state.season, w: state.week, age: u.age, reason: sum.reason };
      // تنظيف: خارج قوائم النادي والمنتخب والعقود والرعاة
      const nt = FC.Nat ? state.clubs[FC.Nat.idOf(u.nat)] : null;
      if (nt) nt.squad = nt.squad.filter((pid) => pid !== 0);
      u.contract = null;
      u.freeAgent = false;
      u.away = false;
      if (u.sponsors) u.sponsors = [];
      if (u.spOffers) u.spOffers = [];
      u.event = null;
      state.legacy = sum;
      FC.Msg.add(state, 'family', 'نهاية مسيرة', 'أعلنت اعتزالك عن ' + u.age + ' عاماً. شكراً على كل لحظة — ' + sum.tierIcon + ' تصنيف إرثك: ' + sum.tierName + '.', { big: 'retire' });
      return sum;
    },

    // قرار تلقائي (للمحاكاة): الاعتزال عند التراجع الواضح
    autoRetire(state) {
      const u = state.user;
      if (!Legacy.canRetire(state)) return false;
      if (u.age >= 37 || (u.age >= 35 && FC.Player.ovr(u) < 66)) return true;
      return false;
    },
  });
})(globalThis);
