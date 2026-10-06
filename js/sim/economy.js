/* =========================================================
   الاقتصاد (القسم 13): القيمة السوقية، الرواتب، ميزانيات الأندية، البنك
   القيمة = 500,000$ × e^(0.214 × (OVR − 60)) × معامل العمر × معامل الإمكانات × معامل الدوري × معامل الفورمة
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC = G.FC || {};
  const U = FC.util;
  const BE = () => FC.BAL.econ;

  const Ec = (FC.Econ = {
    // دوري نادٍ (نادي الشباب يتبع دوري الشباب)
    leagueOf(state, clubId) {
      const c = state.clubs[clubId];
      return c ? c.lg : null;
    },

    // معامل العمر (الشباب حسب الإمكانات)
    ageF(age, gap) {
      const T = BE().ageF;
      if (age <= 20) return U.lerp(T.youngMin, T.youngMax, U.clamp(gap / 20, 0, 1));
      for (const row of T.table) if (age <= row[0]) return row[1];
      return T.old;
    },

    // القيمة السوقية بالدولار
    value(state, p) {
      const B = BE();
      const isUser = p.id === 0;
      const ovr = FC.Player.ovr(p);
      const pot = isUser ? p.hid.pot : p.pot || ovr;
      const clubId = isUser ? FC.Game.userTeam(state) : p.club;
      let lg = Ec.leagueOf(state, clubId);
      if (lg === 'YTH') lg = state.leagues.YTH ? state.leagues.YTH.parent : 'IRQ';
      const gap = Math.max(0, pot - ovr);
      const ageF = Ec.ageF(p.age, gap);
      const potF = p.age >= 21 && p.age <= 24 ? 1 + Math.min(gap, 20) * B.potK : 1;
      const lgF = B.leagueF[lg] != null ? B.leagueF[lg] : 0.5;
      const form = FC.Player.formOf(p);
      const formF = U.clamp(1 + (form - 6.7) * B.formK, 0.8, 1.2);
      let v = B.valueBase * Math.exp(B.valueK * (ovr - 60)) * ageF * potF * lgF * formF;
      if (isUser && p.team === 'Y') v *= B.youthTeamF;
      if (isUser && p.inj && p.inj.total >= 60) v *= 0.8;
      return Math.max(10000, Math.round(v / 1000) * 1000);
    },

    // الراتب الأسبوعي المناسب
    wageFor(ovr, lg, role) {
      const B = BE();
      const lw = B.wageLeague[lg] != null ? B.wageLeague[lg] : 0.4;
      const w = B.wageBase * Math.exp(B.wageK * (ovr - 60)) * lw * (B.roleWage[role] || 1);
      return Math.max(B.minWage, Math.round(w / 50) * 50);
    },

    // ميزانية انتقالات النادي في بداية الصيف
    setBudgets(state, rng) {
      const B = BE();
      for (const id in state.clubs) {
        const c = state.clubs[id];
        if (c.youth || c.nt) continue;
        const base = B.budgetLeague[c.lg] || 5e6;
        c.budget = Math.round(base * Math.pow(c.rep / 85, 2.5) * rng.float(0.7, 1.3));
      }
    },

    // «4.2 مليون $»
    fmt(n) {
      const a = Math.abs(n);
      const sgn = n < 0 ? '−' : '';
      if (a >= 1e6) return sgn + (a >= 1e8 ? Math.round(a / 1e6) : U.round1(a / 1e6)) + ' مليون $';
      if (a >= 1e3) return sgn + Math.round(a / 1e3) + ' ألف $';
      return sgn + Math.round(a) + ' $';
    },

    // حركة في حسابك البنكي
    txn(state, amount, kind, text) {
      const u = state.user;
      u.money = Math.round((u.money || 0) + amount);
      const list = (u.bank = u.bank || []);
      list.unshift({ s: state.season, w: state.week, a: Math.round(amount), k: kind, t: text });
      if (list.length > 80) list.length = 80;
    },

    // الدخل والمصاريف الأسبوعية (الراتب، عمولة الوكيل، الخدمات)
    weekly(state) {
      const u = state.user;
      const c = u.contract;
      if (!c) return;
      const B = BE();
      Ec.txn(state, c.wage, 'wage', c.youth ? 'منحة الأكاديمية' : 'الراتب الأسبوعي');
      if (u.agent && !c.youth) Ec.txn(state, -c.wage * (u.agent.fee / 100), 'agent', 'عمولة الوكيل ' + u.agent.fee + '%');
      // ضريبة/مصاريف معيشة بسيطة
      Ec.txn(state, -Math.round(c.wage * B.living), 'living', 'مصاريف المعيشة');
    },

    // مكافآت المباراة حسب العقد
    matchBonus(state, sum) {
      const u = state.user;
      const c = u.contract;
      if (!c || !sum || !sum.played || !c.bonus) return;
      const st = sum.userStats;
      const b = c.bonus;
      let tot = b.app || 0;
      tot += (b.goal || 0) * st.g + (b.assist || 0) * st.a + (st.cs ? b.cs || 0 : 0);
      if (tot > 0) Ec.txn(state, tot, 'bonus', 'مكافآت المباراة');
    },

    // مكافآت العقد الافتراضية حسب الراتب والمركز
    bonusFor(wage, pos) {
      const B = BE().bonus;
      const def = pos === 'GK' || pos === 'CB' || pos === 'RB' || pos === 'LB';
      return {
        app: Math.round(wage * B.app / 50) * 50,
        goal: Math.round(wage * B.goal * (def ? 1.5 : 1) / 50) * 50,
        assist: Math.round(wage * B.assist / 50) * 50,
        cs: def ? Math.round(wage * B.cs / 50) * 50 : 0,
      };
    },
  });
})(globalThis);
