/* =========================================================
   البطولات (القسم 14): الكأس المحلية، البطولات القارية للأندية، والمحرك العام للمسابقات
   كل مسابقة = مراحل: «مجموعات» (دوري مصغّر) أو «خروج المغلوب» (مباراة أو ذهاب وإياب)
   المباريات في state.fx: {id, c, s, g, t, l, w, d, h, a, hg, ag, et, ph, pa, n}
     c: المسابقة، s: المرحلة، g: المجموعة، t: المواجهة، l: الذهاب/الإياب، w: الأسبوع، d: اليوم (0 نهاية الأسبوع، 1 منتصفه)
     h/a: المضيف والضيف، hg/ag: الأهداف (−1 = لم تُلعب)، et: أشواط إضافية، ph/pa: ركلات الترجيح، n: ملعب محايد
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC = G.FC || {};
  const U = FC.util;
  const BC = () => FC.BAL.cups;

  const GEN_BASE = 2001; // أرقام الأندية المولّدة (بعيداً عن أرقام أندية الشباب 1000+)
  const PALETTE = ['#1565c0', '#c62828', '#2e7d32', '#f9a825', '#6a1b9a', '#00838f', '#ef6c00', '#37474f', '#ad1457', '#283593', '#4e342e', '#00695c', '#111111', '#f4f4f4'];

  const Cup = (FC.Cups = {
    GEN_BASE,

    // ================= الأندية المولّدة للدول بلا دوري =================
    // «دوري» افتراضي للنادي المولّد (لاختيار جنسيات لاعبيه ومواهبه)
    genLeague(nat) {
      const N = FC.DATA.nations[nat];
      return { id: 'GEN', nat, local: BC().genLocal, foreign: FC.DATA.genForeign[N ? N.conf : 'AFC'] || FC.DATA.genForeign.AFC };
    },
    // الدوري الحقيقي أو الافتراضي لأي نادٍ
    leagueFor(state, club) {
      if (!club) return null;
      return state.leagues[club.lg] || (club.gen ? Cup.genLeague(club.nat) : null);
    },

    // إنشاء الأندية المولّدة مرة واحدة (عالم جديد أو حفظ قديم)
    ensureWorld(state) {
      if (state.genDone) return;
      const rng = FC.rngOf(state);
      let id = GEN_BASE;
      for (const nat in FC.DATA.genClubs) {
        const def = FC.DATA.genClubs[nat];
        const N = FC.DATA.nations[nat];
        if (!N) continue;
        const tpl = FC.DATA.genNames[FC.DATA.genCult[N.cult] || 'eng'];
        const cities = N.cities.slice();
        const usedNames = new Set();
        for (let k = 0; k < def[0]; k++) {
          while (state.clubs[id]) id++;
          const city = cities[k % cities.length];
          let name = '';
          for (let tries = 0; tries < 12 && (!name || usedNames.has(name)); tries++) name = rng.pick(tpl).replace('{c}', city);
          usedNames.add(name);
          const t = def[0] === 1 ? 0.5 : k / (def[0] - 1);
          const lvl = U.round1(def[2] - (def[2] - def[1]) * t + rng.normal(0, 0.6));
          const c1 = rng.pick(PALETTE);
          let c2 = rng.pick(PALETTE);
          while (c2 === c1) c2 = rng.pick(PALETTE);
          const club = {
            id, lg: 'GEN', gen: true, nat, name, short: name.length <= 11 ? name : city, city, c1, c2,
            rep: Math.round(U.clamp(30 + (lvl - 50) * 2.4, 25, 85)), cap: rng.int(8, 40), fac: rng.int(2, 4),
            lvl, form: FC.Select.randomFormation(rng), squad: [], rival: null,
          };
          state.clubs[id] = club;
          FC.World.makeSquad(state, rng, club, Cup.genLeague(nat));
          id++;
        }
      }
      state.genDone = true;
    },

    // حصة الدقائق التقديرية للاعب نادٍ مولّد (لا يلعب دورياً في اللعبة): للتطور السنوي
    genShare(state, p) {
      const club = state.clubs[p.club];
      if (!club) return 0.5;
      const rank = club.squad.map((id) => state.players[id]).filter(Boolean).sort((a, b) => b.ovr - a.ovr).indexOf(p);
      return rank < 11 ? 0.85 : rank < 16 ? 0.45 : 0.15;
    },

    // ترقية حفظ قديم (قبل المرحلة 4): الأندية المولّدة والمنتخبات، والمسابقات من الآن
    upgrade(state) {
      const rng = FC.rngOf(state);
      Cup.ensureWorld(state);
      if (FC.Nat) FC.Nat.ensure(state);
      if (state.week < 8) return Cup.newSeason(state);
      // منتصف الموسم: الكؤوس تبدأ من الموسم القادم، والبطولات الدولية التي لم تبدأ بعد تُقام
      state.comps = {};
      state.fx = [];
      if (FC.Nat) {
        FC.Cups.make(state, rng, { id: 'FRI', kind: 'fr', nat: true, name: FC.DATA.natComps.FRI.name, short: 'ودية', teams: [], stages: [{ k: 'fr', n: 'ودية' }] });
        const y = state.season % 4;
        const B = FC.BAL.nat;
        if (y === B.cycle.ASIA && state.week < 26) FC.Nat.makeTournament(state, rng, 'ASIA', FC.Nat.confTeams('AFC'), 'winter');
      }
    },

    // ================= الموسم الجديد =================
    newSeason(state) {
      const rng = FC.rngOf(state);
      Cup.ensureWorld(state);
      state.comps = {};
      state.fx = [];
      for (const id in state.leagues) {
        const L = state.leagues[id];
        if (L.youth) continue;
        Cup.makeDomestic(state, rng, L);
      }
      Cup.makeContinental(state, rng, 'CL_EU');
      Cup.makeContinental(state, rng, 'CL_AS');
      if (FC.Nat) FC.Nat.newSeason(state, rng);
    },

    // ترتيب أندية دوري للتأهل: الترتيب النهائي للموسم الماضي أو قوة الأندية في الموسم الأول
    qualOrder(state, lg) {
      const q = state.qual && state.qual[lg];
      const L = state.leagues[lg];
      if (q && q.length) return q.filter((id) => state.clubs[id] && L.clubs.indexOf(id) >= 0);
      return L.clubs.slice().sort((a, b) => state.clubs[b].lvl - state.clubs[a].lvl);
    },

    // الكأس المحلية: خروج المغلوب من مباراة واحدة
    makeDomestic(state, rng, L) {
      const W = BC().dom;
      const teams = L.clubs.slice();
      const stages = [];
      let first = teams;
      if (teams.length > 16) {
        // الأضعف يلعبون الدور التمهيدي والباقون يدخلون من دور الـ16
        const k = (teams.length - 16) * 2;
        const sorted = teams.slice().sort((a, b) => state.clubs[a].lvl - state.clubs[b].lvl);
        first = sorted.slice(0, k);
        stages.push({ k: 'ko', n: 'الدور التمهيدي', legs: 1, w: [W.prelim], draw: true, rot: true });
        stages.push({ k: 'ko', n: 'دور الـ16', legs: 1, w: [W.r16], draw: true, rot: true, entry: sorted.slice(k) });
      } else stages.push({ k: 'ko', n: 'دور الـ16', legs: 1, w: [W.r16], draw: true, rot: true });
      stages.push({ k: 'ko', n: 'ربع النهائي', legs: 1, w: [W.qf] });
      stages.push({ k: 'ko', n: 'نصف النهائي', legs: 1, w: [W.sf], big: true });
      stages.push({ k: 'ko', n: 'النهائي', legs: 1, w: [W.f], big: true, neutral: true, final: true });
      return Cup.make(state, rng, {
        id: 'CUP_' + L.id, kind: 'cup', lg: L.id, name: FC.DATA.domCups[L.id] || 'كأس ' + L.short, short: 'الكأس', teams, first, stages,
      });
    },

    // البطولة القارية: 32 نادياً، 8 مجموعات، ثم ذهاب وإياب، ونهائي واحد
    makeContinental(state, rng, id) {
      const B = BC();
      const W = B.cont;
      const def = FC.DATA.contCups[id];
      const slots = id === 'CL_EU' ? B.euSlots : B.asSlots;
      let teams = [];
      for (const lg in slots) if (state.leagues[lg]) teams = teams.concat(Cup.qualOrder(state, lg).slice(0, slots[lg]));
      // المقاعد الناقصة: أندية مولّدة من دول القارة (الأقوى أرجح)
      const gens = Object.values(state.clubs).filter((c) => c.gen && FC.DATA.nations[c.nat] && FC.DATA.nations[c.nat].conf === def.conf);
      const need = 32 - teams.length;
      const pool = gens.slice();
      while (teams.length < 32 && pool.length) {
        const i = rng.weighted(pool.map((c) => Math.exp((c.lvl - 60) / 4)));
        teams.push(pool[i].id);
        pool.splice(i, 1);
      }
      if (teams.length < 32 || need < 0) teams = teams.slice(0, 32);
      if (teams.length < 32) return null;
      const stages = [
        { k: 'grp', n: 'دور المجموعات', nG: 8, legs: 2, adv: 2, w: W.grp, seeded: true, sep: true },
        { k: 'ko', n: 'دور الـ16', legs: 2, w: W.r16, big: true },
        { k: 'ko', n: 'ربع النهائي', legs: 2, w: W.qf, big: true },
        { k: 'ko', n: 'نصف النهائي', legs: 2, w: W.sf, big: true },
        { k: 'ko', n: 'النهائي', legs: 1, w: W.f, big: true, neutral: true, final: true },
      ];
      return Cup.make(state, rng, { id, kind: 'cont', conf: def.conf, name: def.name, short: def.short, teams, stages });
    },

    // ================= المحرك العام =================
    // o: {id, kind, name, short, teams, stages, first?, lg?, conf?, host?, nat?}
    make(state, rng, o) {
      const c = {
        id: o.id, kind: o.kind, name: o.name, short: o.short || o.name, season: state.season, lg: o.lg || null, conf: o.conf || null,
        nat: !!o.nat, host: o.host || null, teams: o.teams.slice(), stages: o.stages, cur: 0, win: null, ru: null, sc: {}, done: false,
      };
      state.comps[c.id] = c;
      Cup.openStage(state, rng, c, 0, o.first || o.teams);
      return c;
    },

    // قوة فريق للتصنيف في القرعة (نادٍ أو منتخب)
    power(state, id) {
      const c = state.clubs[id];
      if (!c) return 0;
      return c.nt && FC.Nat ? FC.Nat.power(state, id) : c.lvl;
    },

    // فتح مرحلة: قرعة المجموعات أو المواجهات وإنشاء المباريات
    openStage(state, rng, c, si, entrants) {
      const st = c.stages[si];
      c.cur = si;
      st.open = true;
      if (st.k === 'grp') {
        const nG = st.nG;
        let order = entrants.slice();
        if (st.seeded) order.sort((a, b) => Cup.power(state, b) - Cup.power(state, a));
        else order = rng.shuffle(order);
        const groups = [];
        for (let g = 0; g < nG; g++) groups.push({ ids: [], t: {} });
        const per = Math.ceil(order.length / nG);
        // وعاء بعد وعاء: كل مجموعة تأخذ فريقاً من كل وعاء (مع تجنب أندية الدوري نفسه قدر الإمكان)
        for (let pot = 0; pot < per; pot++) {
          const potTeams = rng.shuffle(order.slice(pot * nG, pot * nG + nG));
          const free = groups.map((gg, i) => i).filter((i) => groups[i].ids.length === pot);
          potTeams.forEach((tid) => {
            let cands = free.filter((i) => groups[i].ids.length === pot);
            if (st.sep) {
              const lg = Cup.sepKey(state, tid);
              const ok = cands.filter((i) => !groups[i].ids.some((x) => Cup.sepKey(state, x) === lg));
              if (ok.length) cands = ok;
            }
            const gi = cands.length ? rng.pick(cands) : groups.findIndex((gg) => gg.ids.length <= pot);
            groups[gi].ids.push(tid);
          });
        }
        groups.forEach((gr) => gr.ids.forEach((id) => (gr.t[id] = [0, 0, 0, 0, 0, 0, 0])));
        st.groups = groups;
        groups.forEach((gr, gi) => {
          let rounds = FC.Comp.roundRobin(gr.ids, rng);
          if (st.legs === 1) rounds = rounds.slice(0, rounds.length / 2);
          rounds.forEach((round, r) => {
            const wk = st.w[Math.min(r, st.w.length - 1)];
            round.forEach((f) => Cup.addFx(state, c, si, { g: gi, t: -1, l: 0, w: wk, h: f[0], a: f[1], n: st.neutral }));
          });
        });
      } else {
        const list = st.draw ? rng.shuffle(entrants.slice()) : entrants.slice();
        const ties = [];
        for (let i = 0; i + 1 < list.length; i += 2) ties.push({ a: list[i], b: list[i + 1], w: null, f: [] });
        // عدد فردي (نادر): الأخير يتأهل مباشرة
        if (list.length % 2) ties.push({ a: list[list.length - 1], b: null, w: list[list.length - 1], f: [] });
        st.ties = ties;
        ties.forEach((tie, ti) => {
          if (tie.b == null) return;
          if (st.legs === 2) {
            tie.f.push(Cup.addFx(state, c, si, { g: -1, t: ti, l: 1, w: st.w[0], h: tie.a, a: tie.b, n: false }).id);
            tie.f.push(Cup.addFx(state, c, si, { g: -1, t: ti, l: 2, w: st.w[1], h: tie.b, a: tie.a, n: false }).id);
          } else tie.f.push(Cup.addFx(state, c, si, { g: -1, t: ti, l: 0, w: st.w[0], h: tie.a, a: tie.b, n: st.neutral }).id);
        });
      }
    },

    // مفتاح الفصل في القرعة (نفس الدوري أو نفس القارة)
    sepKey(state, id) {
      const c = state.clubs[id];
      if (!c) return '';
      if (c.nt) return FC.DATA.nations[c.nat] ? FC.DATA.nations[c.nat].conf : '';
      return c.gen ? 'G' + c.nat : c.lg;
    },

    addFx(state, c, si, o) {
      // المضيف في البطولات الدولية: يلعب على أرضه دائماً
      let h = o.h;
      let a = o.a;
      let n = o.n ? 1 : 0;
      if (c.host && (h === c.host || a === c.host)) {
        if (a === c.host) {
          a = h;
          h = c.host;
        }
        n = 0;
      }
      const fx = { id: state.fx.length, c: c.id, s: si, g: o.g, t: o.t, l: o.l, w: o.w[0], d: o.w[1], h, a, hg: -1, ag: -1, et: 0, ph: -1, pa: -1, n };
      state.fx.push(fx);
      return fx;
    },

    // مرجع المباراة لمحرك المباريات
    refOf(state, fx) {
      const c = state.comps[fx.c];
      const st = c.stages[fx.s];
      const ko = st.k === 'ko' && (st.legs === 1 || fx.l === 2);
      let agg = null;
      if (st.k === 'ko' && fx.l === 2) {
        const f1 = state.fx[st.ties[fx.t].f[0]];
        // أهداف الذهاب منسوبة لمضيف الإياب وضيفه
        agg = [f1.ag, f1.hg];
      }
      return { fid: fx.id, c: c.id, ko, agg, big: !!st.big, n: !!fx.n, rot: !!st.rot, nat: c.nat, home: fx.h, away: fx.a, d: fx.d };
    },

    // مباريات أسبوع (ويوم) لم تُلعب بعد
    weekFixtures(state, week, d) {
      const out = [];
      (state.fx || []).forEach((fx) => {
        if (fx.w === week && fx.hg < 0 && (d == null || fx.d === d)) out.push(fx);
      });
      return out;
    },

    // كل مباريات فريق في الموسم (المسابقات فقط)
    teamFixtures(state, id) {
      return (state.fx || []).filter((fx) => fx.h === id || fx.a === id);
    },

    // تسجيل نتيجة مباراة من المحرك
    record(state, m) {
      const fx = state.fx[m.ref.fid];
      if (!fx || fx.hg >= 0) return;
      fx.hg = m.sides[0].goals;
      fx.ag = m.sides[1].goals;
      fx.et = m.et ? 1 : 0;
      if (m.pens) {
        fx.ph = m.pens.s[0];
        fx.pa = m.pens.s[1];
      }
      const c = state.comps[fx.c];
      // الهدافون والصناع في المسابقة
      m.sides.forEach((S) => {
        S.all.forEach((x) => {
          if (x.in < 0 || (!x.g && !x.a)) return;
          const r = (c.sc[x.pid] = c.sc[x.pid] || [0, 0, S.id]);
          r[0] += x.g;
          r[1] += x.a;
          r[2] = S.id;
        });
      });
      Cup.applyResult(state, c, fx);
    },

    // تحديث جدول المجموعة أو حسم المواجهة
    applyResult(state, c, fx) {
      const st = c.stages[fx.s];
      if (st.k === 'fr') return;
      if (st.k === 'grp') {
        const gr = st.groups[fx.g];
        const H = gr.t[fx.h];
        const A = gr.t[fx.a];
        H[0]++; A[0]++;
        H[4] += fx.hg; H[5] += fx.ag;
        A[4] += fx.ag; A[5] += fx.hg;
        if (fx.hg > fx.ag) { H[1]++; A[3]++; H[6] += 3; }
        else if (fx.hg < fx.ag) { A[1]++; H[3]++; A[6] += 3; }
        else { H[2]++; A[2]++; H[6]++; A[6]++; }
        return;
      }
      const tie = st.ties[fx.t];
      if (st.legs === 2 && fx.l === 1) return;
      tie.w = Cup.tieWinner(state, st, tie);
    },

    // الفائز في مواجهة (بعد اكتمالها)
    tieWinner(state, st, tie) {
      const fs = tie.f.map((id) => state.fx[id]);
      if (fs.some((f) => f.hg < 0)) return null;
      const last = fs[fs.length - 1];
      let ga = 0;
      let gb = 0;
      fs.forEach((f) => {
        if (f.h === tie.a) { ga += f.hg; gb += f.ag; }
        else { ga += f.ag; gb += f.hg; }
      });
      if (ga !== gb) return ga > gb ? tie.a : tie.b;
      if (last.ph >= 0) return last.ph > last.pa ? last.h : last.a;
      return tie.a; // احتياط (لا يحدث: المحرك يحسم بالترجيح)
    },

    // هل انتهت المرحلة الحالية؟
    stageDone(state, c) {
      const si = c.cur;
      return state.fx.every((fx) => fx.c !== c.id || fx.s !== si || fx.hg >= 0);
    },

    // ترتيب مجموعة: النقاط ثم الفارق ثم الأهداف
    groupTable(state, gr) {
      const rows = gr.ids.map((id) => {
        const t = gr.t[id];
        return { id, p: t[0], w: t[1], d: t[2], l: t[3], gf: t[4], ga: t[5], gd: t[4] - t[5], pts: t[6] };
      });
      rows.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || Cup.power(state, b.id) - Cup.power(state, a.id));
      return rows;
    },

    // التقدم في كل المسابقات التي اكتملت مرحلتها الحالية
    advanceAll(state) {
      const rng = FC.rngOf(state);
      const out = [];
      for (const id in state.comps) {
        const c = state.comps[id];
        if (c.kind === 'fr') continue;
        let guard = 0;
        while (!c.done && Cup.stageDone(state, c) && guard++ < 8) out.push(Cup.advance(state, rng, c));
      }
      return out.filter(Boolean);
    },

    // الانتقال من مرحلة إلى التالية (أو إعلان البطل)
    advance(state, rng, c) {
      const st = c.stages[c.cur];
      let quals;
      const elim = [];
      if (st.k === 'grp') {
        const W = [];
        const R = [];
        const T = [];
        st.groups.forEach((gr) => {
          const t = Cup.groupTable(state, gr);
          if (t[0]) W.push(t[0].id);
          if (st.adv >= 2 && t[1]) R.push(t[1].id);
          if (st.adv >= 3 && t[2]) T.push(t[2].id);
          if (st.adv >= 4 && t[3]) T.push(t[3].id);
          t.slice(st.adv).forEach((r) => elim.push(r.id));
        });
        // أفضل أصحاب المركز الثالث (عند الحاجة)
        let thirds = [];
        if (st.thirds) {
          const rows = st.groups.map((gr) => Cup.groupTable(state, gr)[2]).filter(Boolean);
          rows.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
          thirds = rows.slice(0, st.thirds).map((r) => r.id);
          rows.slice(st.thirds).forEach((r) => {
            const i = elim.indexOf(r.id);
            if (i < 0) elim.push(r.id);
          });
          thirds.forEach((id) => {
            const i = elim.indexOf(id);
            if (i >= 0) elim.splice(i, 1);
          });
        }
        st.qual = W.concat(R, T, thirds);
        quals = st.final ? null : Cup.koOrder(W, R, T.concat(thirds), c.stages[c.cur + 1]);
      } else {
        quals = st.ties.map((t) => t.w);
        st.ties.forEach((t) => {
          if (t.b != null) elim.push(t.w === t.a ? t.b : t.a);
        });
      }
      if (FC.Nat && c.nat) FC.Nat.onEliminated(state, c, elim);
      const next = c.stages[c.cur + 1];
      if (!next || st.final) {
        Cup.finishComp(state, c, st);
        return { c: c.id, done: true };
      }
      const entrants = (quals || []).concat(next.entry || []);
      Cup.openStage(state, rng, c, c.cur + 1, entrants);
      return { c: c.id, stage: c.cur };
    },

    // ترتيب المتأهلين من المجموعات إلى الأدوار الإقصائية (الأول ضد ثاني مجموعة أخرى)
    koOrder(W, R, extra, nextStage) {
      const G = W.length;
      const out = [];
      if (R.length === G && G % 2 === 0) {
        // نصف الشجرة الأول: أ1–ب2، ج1–د2... والثاني: ب1–أ2، د1–ج2...
        // (المرحلة ذات الذهاب والإياب: صاحب المركز الثاني أولاً ليستضيف الأول الإياب)
        const two = nextStage && nextStage.legs === 2;
        const pair = (w, r) => (two ? out.push(r, w) : out.push(w, r));
        for (let j = 0; j < G; j += 2) pair(W[j], R[j + 1]);
        for (let j = 0; j < G; j += 2) pair(W[j + 1], R[j]);
        for (let k = 0; k + 1 < extra.length; k += 2) out.push(extra[k], extra[k + 1]);
        return out;
      }
      // حالات أخرى (مثل 3 مجموعات + أفضل الثوالث): المصنف الأول ضد الأخير
      const seeds = W.concat(R, extra);
      const n = seeds.length;
      const pairs = [];
      for (let i = 0; i < n / 2; i++) pairs.push([seeds[i], seeds[n - 1 - i]]);
      // ترتيب الشجرة حتى يلتقي الأقوياء متأخراً
      const order = n === 8 ? [0, 3, 1, 2] : pairs.map((p, i) => i);
      order.forEach((i) => pairs[i] && out.push(pairs[i][0], pairs[i][1]));
      return out;
    },

    // نهاية المسابقة: البطل والوصيف والرسائل والألقاب
    finishComp(state, c, st) {
      c.done = true;
      if (st.k === 'ko') {
        const tie = st.ties[0];
        c.win = tie.w;
        c.ru = tie.w === tie.a ? tie.b : tie.a;
      } else {
        const t = Cup.groupTable(state, st.groups[0]);
        c.win = t[0].id;
        c.ru = t[1] ? t[1].id : null;
      }
      if (FC.Nat && c.nat) FC.Nat.onFinished(state, c);
      Cup.onChampion(state, c);
    },

    // رسالة البطل ولقبك إن فزت
    onChampion(state, c) {
      if (c.kind === 'q' || c.kind === 'fr') return;
      const rng = FC.rngOf(state);
      const u = state.user;
      const winClub = state.clubs[c.win];
      if (!winClub) return;
      const mine = c.nat ? FC.Nat && FC.Nat.userIn(state, c.win) : FC.Game.userTeam(state) === c.win;
      if (mine) {
        Cup.addTrophy(state, c);
        FC.Msg.add(state, c.nat ? 'nat' : 'club', 'بطل ' + c.name + '!', FC.TXT.msg(rng, c.nat ? 'tournWin' : 'cupWinUser', { c: c.name, t: winClub.name }), { big: 'champion' });
      } else if (c.kind === 'cup' && c.lg === FC.Game.userLeague(state)) {
        FC.Msg.add(state, 'news', 'بطل ' + c.name, FC.TXT.msg(rng, 'cupWinner', { c: c.name, t: winClub.name }));
      } else if (c.kind === 'cont' || c.kind === 'nt') {
        FC.Msg.add(state, 'news', 'بطل ' + c.name, FC.TXT.msg(rng, 'cupWinner', { c: c.name, t: winClub.name }));
      }
    },

    // لقب جديد في خزانتك + مكافأة مالية
    addTrophy(state, c) {
      const u = state.user;
      (u.trophies = u.trophies || []).push({ s: state.season, id: c.id, k: c.kind, name: c.name, team: c.win });
      if (FC.Life) {
        const TF = FC.BAL.life.trophy;
        FC.Life.addFame(state, c.id === 'WC' ? TF.WC : TF[c.kind] || TF.cup);
        FC.Life.news(state, 'you', 'youTrophy', { p: FC.Player.displayName(u), c: c.name, t: state.clubs[c.win].short });
      }
      const mult = BC().trophyWage[c.kind === 'cont' ? 'cont' : c.kind === 'cup' ? 'cup' : 'intl'] || 0;
      if (mult && u.contract && FC.Econ) FC.Econ.txn(state, u.contract.wage * mult, 'bonus', 'مكافأة الفوز بـ' + c.name);
    },

    // ================= أدوات للواجهة =================
    // اسم المرحلة الحالية لمباراة: «كأس العراق — ربع النهائي (ذهاب)»
    label(state, fx) {
      const c = state.comps[fx.c];
      if (!c) return '';
      const st = c.stages[fx.s];
      let s = c.name;
      if (c.kind !== 'fr') s += ' — ' + st.n;
      if (st.k === 'grp' && st.groups && st.groups.length > 1) s += ' (' + Cup.groupName(fx.g) + ')';
      if (fx.l === 1) s += ' · ذهاب';
      if (fx.l === 2) s += ' · إياب';
      return s;
    },
    groupName(g) {
      return 'المجموعة ' + 'أبجدهوزحطيكلمنسعفصقرشت'.charAt(g);
    },

    // نتيجة مباراة كنص «2 - 1» مع الترجيح
    scoreText(fx) {
      if (fx.hg < 0) return '';
      let s = fx.hg + ' - ' + fx.ag;
      if (fx.ph >= 0) s += ' (ترجيح ' + fx.ph + '-' + fx.pa + ')';
      else if (fx.et) s += ' (ت.إ)';
      return s;
    },

    // الهدافون في مسابقة
    scorers(state, c, n) {
      const list = [];
      for (const pid in c.sc) {
        const r = c.sc[pid];
        if (r[0] > 0) list.push({ pid: +pid, g: r[0], a: r[1], club: r[2] });
      }
      list.sort((a, b) => b.g - a.g || b.a - a.a);
      return list.slice(0, n || 10);
    },

    // مسابقات فريقك الجارية هذا الموسم (للواجهة)
    compsOf(state, teamId) {
      const out = [];
      for (const id in state.comps) {
        const c = state.comps[id];
        if (c.teams.indexOf(teamId) >= 0) out.push(c);
      }
      return out;
    },

    // حالة فريق في مسابقة: «خرج من ربع النهائي» أو «البطل» أو «مستمر»
    statusOf(state, c, teamId) {
      if (c.win === teamId) return { k: 'win', txt: 'البطل 🏆' };
      if (c.teams.indexOf(teamId) < 0) return null;
      for (let si = 0; si <= c.cur; si++) {
        const st = c.stages[si];
        if (!st.open) continue;
        if (st.k === 'ko') {
          const tie = (st.ties || []).find((t) => t.a === teamId || t.b === teamId);
          if (tie && tie.w != null && tie.w !== teamId) return { k: 'out', txt: si === c.stages.length - 1 || st.final ? 'الوصيف' : 'خرج من ' + st.n };
          if (tie && tie.w == null) return { k: 'in', txt: st.n };
        } else {
          const inG = (st.groups || []).some((gr) => gr.ids.indexOf(teamId) >= 0);
          if (inG && st.qual && st.qual.indexOf(teamId) < 0 && c.cur > si) return { k: 'out', txt: 'خرج من ' + st.n };
          if (inG && c.cur === si && !c.done) return { k: 'in', txt: st.n };
          if (inG && c.done && st.final) return { k: 'out', txt: 'انتهت' };
        }
      }
      return { k: 'in', txt: c.stages[c.cur].n };
    },

    // أرشفة أبطال الموسم قبل تصفير المسابقات
    archive(state) {
      const snap = (state.history.seasons || []).find((s) => s.season === state.season);
      const cups = {};
      for (const id in state.comps || {}) {
        const c = state.comps[id];
        if (!c.win || c.kind === 'q' || c.kind === 'fr') continue;
        const top = Cup.scorers(state, c, 1)[0];
        const tp = top ? FC.getP(state, top.pid) : null;
        cups[id] = { name: c.name, win: c.win, winName: state.clubs[c.win] ? state.clubs[c.win].name : '', ru: c.ru, top: tp ? { pid: top.pid, name: FC.Player.fullName(tp), g: top.g } : null };
      }
      if (snap) snap.cups = cups;
      else state.history.seasons.push({ season: state.season, champs: {}, scorers: {}, cups });
    },
  });
})(globalThis);
