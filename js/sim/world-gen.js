/* =========================================================
   توليد العالم: الدوريات، الأندية، اللاعبون، لاعبك، ودوري الشباب
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC = G.FC || {};
  const U = FC.util;

  // عدد اللاعبين الأساسيين المعتاد لكل مركز (لحساب عمق التشكيلة)
  const STARTERS = { GK: 1, CB: 2, RB: 1, LB: 1, CDM: 1, CM: 2, CAM: 1, RW: 1, LW: 1, ST: 1 };
  // أطوال واقعية حسب المركز (متوسط، انحراف)
  const HEIGHT = { GK: [189, 4], CB: [187, 4], RB: [178, 5], LB: [177, 5], CDM: [182, 5], CM: [179, 5], CAM: [176, 5], RW: [175, 5], LW: [175, 5], ST: [182, 6] };
  // أرقام قمصان مألوفة لكل مركز
  const NUMS = { GK: [1, 13, 23, 30, 31], CB: [4, 5, 3, 15, 24, 32], RB: [2, 22, 12], LB: [3, 21, 25], CDM: [6, 16, 18], CM: [8, 14, 20, 26], CAM: [10, 19, 28], RW: [7, 17, 27], LW: [11, 29, 33], ST: [9, 19, 39, 35] };

  const W = (FC.World = {
    STARTERS,

    // اسم عشوائي حسب ثقافة الجنسية
    randomName(rng, nat) {
      const n = FC.DATA.nations[nat];
      const pool = FC.DATA.names[n ? n.cult : 'arab'] || FC.DATA.names.iraq;
      return [rng.pick(pool.f), rng.pick(pool.l)];
    },

    // اختيار جنسية لاعب في دوري معيّن
    pickNat(rng, L) {
      if (rng.chance(L.local)) return L.nat;
      const keys = Object.keys(L.foreign);
      return keys[rng.weighted(keys.map((k) => L.foreign[k]))];
    },

    // إمكانات لاعب ذكاء اصطناعي حسب عمره
    aiPotential(rng, ovr, age) {
      const B = FC.BAL.world;
      let r;
      if (age <= 20) r = B.potYoung;
      else if (age <= 24) r = B.potMid;
      else r = B.potOld;
      return Math.round(U.clamp(ovr + rng.float(r[0], r[1]), ovr, B.potCap));
    },

    // إنشاء لاعب ذكاء اصطناعي
    makePlayer(state, rng, o) {
      const id = state.nextPid++;
      const nm = W.randomName(rng, o.nat);
      const h = HEIGHT[o.pos];
      const left = o.pos === 'LB' || o.pos === 'LW' ? 0.6 : 0.2;
      const p = {
        id,
        fn: nm[0],
        ln: nm[1],
        nat: o.nat,
        age: o.age,
        pos: o.pos,
        ovr: U.round1(U.clamp(o.ovr, 25, 94)),
        pot: o.pot != null ? o.pot : W.aiPotential(rng, o.ovr, o.age),
        club: o.club,
        num: 0,
        ht: Math.round(U.clamp(rng.normal(h[0], h[1]), 163, 203)),
        ft: rng.chance(left) ? 'L' : 'R',
        fm: 6.7,
        fit: 100,
        sAp: 0, sSt: 0, sMn: 0, sG: 0, sA: 0, sRs: 0, sYc: 0, sRc: 0,
        cAp: 0, cG: 0, cA: 0,
        inj: 0, ban: 0, yk: 0, // أسابيع الإصابة، مباريات الإيقاف، الصفراء المتراكمة
        iC: 0, iG: 0, away: 0, // المباريات والأهداف الدولية، الغياب مع المنتخب في بطولة
        ce: (state.season || FC.BAL.cal.startYear) + rng.int(0, 4), // نهاية العقد (موسم)
      };
      if (p.pot < p.ovr) p.pot = Math.ceil(p.ovr);
      state.players[id] = p;
      return p;
    },

    // عمر عشوائي واقعي
    randomAge(rng, pos) {
      const B = FC.BAL.world;
      const max = pos === 'GK' ? B.ageMax + 2 : B.ageMax;
      return Math.round(U.clamp(rng.normal(B.ageMean, B.ageSd), B.ageMin, max));
    },

    // بناء تشكيلة نادٍ كاملة
    makeSquad(state, rng, club, L) {
      const B = FC.BAL.world;
      const shape = B.squadShape;
      let plan = [];
      for (const pos in shape) {
        const n = rng.int(shape[pos][0], shape[pos][1]);
        for (let d = 0; d < n; d++) plan.push({ pos, d });
      }
      // حصر العدد بين الحد الأدنى والأعلى
      while (plan.length > B.squadMax) {
        const extras = plan.filter((x) => x.d >= STARTERS[x.pos] + 1);
        const rm = rng.pick(extras.length ? extras : plan);
        plan.splice(plan.indexOf(rm), 1);
      }
      plan.forEach((x) => {
        const depth = Math.max(0, x.d - (STARTERS[x.pos] - 1));
        const age = W.randomAge(rng, x.pos);
        let ovr = club.lvl + B.depthOffset[Math.min(depth, B.depthOffset.length - 1)] + rng.normal(0, B.depthNoise);
        if (age < 23) ovr -= (23 - age) * B.youngPenalty;
        if (age > 31) ovr -= (age - 31) * B.oldPenalty;
        const p = W.makePlayer(state, rng, { nat: W.pickNat(rng, L), pos: x.pos, age, ovr, club: club.id });
        club.squad.push(p.id);
      });
      W.assignNumbers(state, club, rng);
    },

    // توزيع أرقام القمصان
    assignNumbers(state, club, rng) {
      const taken = new Set();
      const ps = club.squad.map((id) => state.players[id]).sort((a, b) => b.ovr - a.ovr);
      ps.forEach((p) => {
        if (p.num && !taken.has(p.num)) {
          taken.add(p.num);
          return;
        }
        const pref = NUMS[p.pos].find((n) => !taken.has(n));
        let n = pref;
        while (!n || taken.has(n)) n = rng.int(12, 45);
        p.num = n;
        taken.add(n);
      });
      if (state.user && state.user.club === club.id && state.user.team === 'F') {
        if (taken.has(state.user.num) || !state.user.num) {
          let n = rng.int(14, 40);
          while (taken.has(n)) n = rng.int(14, 45);
          state.user.num = n;
        }
      }
    },

    // اختيار الغريم التقليدي: أقوى نادٍ آخر في نفس المدينة
    setRivals(state, L) {
      const clubs = L.clubs.map((id) => state.clubs[id]);
      clubs.forEach((c) => {
        const same = clubs.filter((o) => o !== c && o.city === c.city).sort((a, b) => b.rep - a.rep);
        c.rival = same.length ? same[0].id : null;
      });
    },

    // توليد العالم كاملاً
    generate(seed, setup) {
      const rng = new FC.RNG(seed);
      const B = FC.BAL;
      const state = {
        v: FC.Save ? FC.Save.VERSION : 1,
        seed,
        rngState: 0,
        startSeason: B.cal.startYear,
        season: B.cal.startYear,
        week: 0,
        diff: setup.diff || 'real',
        clubs: {},
        players: {},
        leagues: {},
        nextPid: 1,
        inbox: [],
        msgSeq: 0,
        user: null,
        wk: null,
        history: { seasons: [] },
        flags: {},
      };
      state._rng = rng;
      let cid = 1;
      FC.DATA.leagues.forEach((def) => {
        const range = B.world.leagues[def.id];
        const L = { id: def.id, nat: def.nat, name: def.name, short: def.short, rep: def.rep, local: def.local, foreign: def.foreign, clubs: [] };
        const sorted = def.clubs.slice().sort((a, b) => b[5] - a[5]);
        const n = sorted.length;
        sorted.forEach((c, i) => {
          const t = Math.pow(i / (n - 1), B.world.clubCurve);
          const lvl = range.max - (range.max - range.min) * t + rng.normal(0, B.world.clubNoise);
          const club = {
            id: cid++,
            lg: def.id,
            name: c[0],
            short: c[1],
            city: c[2],
            c1: c[3],
            c2: c[4],
            rep: c[5],
            cap: c[6],
            fac: c[7],
            lvl: U.round1(U.clamp(lvl, range.min - 1, range.max + 1)),
            form: FC.Select.randomFormation(rng),
            squad: [],
            rival: null,
          };
          state.clubs[club.id] = club;
          L.clubs.push(club.id);
          W.makeSquad(state, rng, club, L);
        });
        W.setRivals(state, L);
        // نجوم الدوري (مثل السعودية)
        if (range.star) W.addStars(state, rng, L, range.star);
        state.leagues[def.id] = L;
      });
      // لاعبك
      const u = FC.Player.createUser(setup, rng);
      state.user = u;
      const lgId = setup.startLeague || (state.leagues[setup.nat] ? setup.nat : 'IRQ');
      const club = W.pickStartClub(state, rng, lgId);
      u.club = club.id;
      u.team = 'Y';
      u.joinSeason = state.startSeason;
      u.money = FC.BAL.econ.startMoney;
      u.bank = [];
      u.agent = null;
      u.clubHist = [{ club: club.id, s: state.startSeason, w: 0, fee: 0, type: 'academy' }];
      FC.Transfer.youthContract(state);
      FC.Econ.setBudgets(state, rng);
      W.makeYouthLeague(state, rng, lgId);
      state.wk = FC.Game.newWeekState();
      FC.Comp.newSeason(state);
      // الكؤوس والبطولات القارية والمنتخبات (مع الأندية المولّدة للدول بلا دوري)
      if (FC.Cups) FC.Cups.newSeason(state);
      return state;
    },

    // أندية النجوم: لاعبون أجانب بتقييم عالٍ في أقوى الأندية
    addStars(state, rng, L, starMax) {
      const B = FC.BAL.world;
      const top = L.clubs.map((id) => state.clubs[id]).sort((a, b) => b.lvl - a.lvl).slice(0, B.starClubs);
      top.forEach((club) => {
        for (let k = 0; k < B.starsPerTopClub; k++) {
          const pos = rng.pick(['ST', 'RW', 'LW', 'CAM', 'CM', 'CB', 'GK', 'ST']);
          const keys = Object.keys(L.foreign);
          const nat = keys[rng.weighted(keys.map((x) => L.foreign[x]))];
          const p = W.makePlayer(state, rng, { nat, pos, age: rng.int(28, 33), ovr: starMax - rng.float(0, 6), club: club.id });
          club.squad.push(p.id);
        }
        W.assignNumbers(state, club, rng);
      });
    },

    // نادي البداية: صغير أو متوسط في الدوري (أدنى 60% سمعة)
    pickStartClub(state, rng, lgId) {
      const L = state.leagues[lgId];
      const clubs = L.clubs.map((id) => state.clubs[id]).sort((a, b) => b.rep - a.rep);
      const from = Math.floor(clubs.length * 0.4);
      return rng.pick(clubs.slice(from));
    },

    // دوري الشباب: فرق الشباب لأندية دوري بلد البداية
    makeYouthLeague(state, rng, lgId) {
      const B = FC.BAL.world.youth;
      const L = state.leagues[lgId];
      const nat = FC.DATA.nations[L.nat];
      const Y = { id: 'YTH', nat: L.nat, name: 'دوري الشباب — ' + nat.name, short: 'الشباب', youth: true, parent: lgId, local: L.local, foreign: L.foreign, clubs: [] };
      const reps = L.clubs.map((id) => state.clubs[id].rep);
      const rMin = Math.min.apply(null, reps);
      const rMax = Math.max.apply(null, reps);
      L.clubs.forEach((pid) => {
        const pc = state.clubs[pid];
        const t = (pc.rep - rMin) / Math.max(1, rMax - rMin);
        const yc = {
          id: 1000 + pid,
          lg: 'YTH',
          parent: pid,
          youth: true,
          name: 'شباب ' + pc.name,
          short: 'ش. ' + pc.short,
          city: pc.city,
          c1: pc.c1,
          c2: pc.c2,
          rep: pc.rep,
          cap: 3,
          fac: pc.fac,
          lvl: U.round1(B.min + (B.max - B.min) * t + rng.normal(0, 1)),
          form: FC.Select.randomFormation(rng),
          squad: [],
          rival: pc.rival ? 1000 + pc.rival : null,
        };
        state.clubs[yc.id] = yc;
        Y.clubs.push(yc.id);
        W.fillYouthSquad(state, rng, yc, Y);
      });
      state.leagues.YTH = Y;
      // رقم قميص لاعبك في فريق الشباب
      const taken = new Set(state.clubs[1000 + state.user.club].squad.map((id) => state.players[id].num));
      let n = rng.int(14, 34);
      while (taken.has(n)) n = rng.int(14, 40);
      state.user.num = n;
    },

    // ملء تشكيلة فريق شباب حتى العدد المطلوب
    fillYouthSquad(state, rng, yc, Y) {
      const B = FC.BAL.world.youth;
      const shape = ['GK', 'GK', 'CB', 'CB', 'CB', 'RB', 'LB', 'CDM', 'CM', 'CM', 'CAM', 'RW', 'LW', 'ST', 'ST', 'CB', 'CM', 'RB', 'LB', 'RW', 'LW', 'CDM'];
      const have = {};
      yc.squad.forEach((id) => (have[state.players[id].pos] = (have[state.players[id].pos] || 0) + 1));
      const need = {};
      shape.forEach((pos) => (need[pos] = (need[pos] || 0) + 1));
      for (const pos of shape) {
        if (yc.squad.length >= B.squad) break;
        if ((have[pos] || 0) >= need[pos]) continue;
        have[pos] = (have[pos] || 0) + 1;
        const age = rng.int(B.ageMin, B.ageMax);
        const ovr = yc.lvl + (age - 17) * 2.5 + rng.normal(0, 3);
        const pot = Math.round(U.clamp(ovr + rng.float(B.potBonus[0], B.potBonus[1]), ovr, 90));
        const p = W.makePlayer(state, rng, { nat: W.pickNat(rng, Y), pos, age, ovr, pot, club: yc.id });
        yc.squad.push(p.id);
      }
      W.assignNumbers(state, yc, rng);
    },
  });
})(globalThis);
