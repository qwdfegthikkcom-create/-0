/* =========================================================
   الحلقة الأسبوعية
   خطة الأسبوع ← يوم المباراة ← نهاية الأسبوع (محاكاة كل الدوريات + التطور + الرسائل) ← نهاية الموسم
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC = G.FC || {};
  const U = FC.util;

  // مجموعات التدريب الافتراضية لكل دور (للتدريب التلقائي)
  const DEFAULT_TRAIN = {
    ST: ['shoot', 'fitness'], W: ['dribble', 'shoot'], CAM: ['pass', 'dribble'], CM: ['pass', 'fitness'],
    CDM: ['defend', 'pass'], FB: ['fitness', 'defend'], CB: ['defend', 'heading'], GK: ['keeper', 'fitness'],
  };

  const Game = (FC.Game = {
    DEFAULT_TRAIN,

    newWeekState() {
      return { planned: false, played: false, plan: [], tm: {}, video: false, energy: FC.BAL.week.energy, last: null };
    },

    // الفريق الذي تلعب له الآن (فريق الشباب أو الأول)
    userTeam(state) {
      const u = state.user;
      return u.team === 'Y' ? 1000 + u.club : u.club;
    },
    userLeague(state) {
      const c = state.clubs[Game.userTeam(state)];
      return c ? c.lg : null;
    },

    // بدء مسيرة جديدة
    newCareer(setup) {
      const seed = setup.seed != null ? setup.seed >>> 0 : (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
      const state = FC.World.generate(seed, setup);
      const rng = FC.rngOf(state);
      const club = state.clubs[state.user.club];
      FC.Msg.add(state, 'academy', 'مرحباً بك في الأكاديمية', FC.TXT.msg(rng, 'welcome', { c: club.name, city: state.user.city }));
      const pr = FC.Player.potRange(state, state.user);
      FC.Msg.add(state, 'scout', 'تقرير الكشافين', FC.TXT.msg(rng, 'scout', { lo: pr[0], hi: pr[1] }));
      return state;
    },

    // مباراة فريقك هذا الأسبوع (إن وُجدت ولم تُلعب)
    userFixtureRef(state) {
      const team = Game.userTeam(state);
      const lg = Game.userLeague(state);
      const L = state.leagues[lg];
      if (!L) return null;
      const r = L.roundWeeks.indexOf(state.week);
      if (r < 0) return null;
      const i = L.rounds[r].findIndex((f) => f[0] === team || f[1] === team);
      if (i < 0) return null;
      const f = L.rounds[r][i];
      if (f[2] >= 0) return null;
      return { lg, r, i, home: f[0], away: f[1] };
    },

    // المباراة القادمة لفريقك (للشاشة الرئيسية)
    nextFixture(state) {
      const team = Game.userTeam(state);
      const list = FC.Comp.clubFixtures(state, team).filter((f) => f.gf < 0 && f.week >= state.week);
      return list[0] || null;
    },

    // دورك المتوقع في المباراة القادمة
    predictedRole(state) {
      const pick = FC.Select.pick(state, Game.userTeam(state));
      return FC.Select.roleOf(pick, 0);
    },

    // ============ خطة الأسبوع ============

    // تكلفة الطاقة لنشاط
    activityCost(item) {
      const W = FC.BAL.week;
      if (item.k === 'train') return W.train[item.int || 'mid'].energy;
      return (W[item.k] && W[item.k].energy) || 0;
    },

    // خطة تلقائية حسب مركزك (والمصاب: علاج طبيعي وراحة)
    autoPlan(state) {
      if (state.user.inj) return [{ k: 'physio' }, { k: 'rest' }, { k: 'video' }];
      const role = FC.Player.POS[state.user.pos].role;
      return DEFAULT_TRAIN[role].map((g) => ({ k: 'train', g, int: 'mid', mult: null }));
    },

    // تطبيق خطة الأسبوع: items = [{k:'train', g, int, mult}, {k:'physio'}, {k:'rest'}, {k:'video'}, {k:'family'}]
    applyPlan(state, items) {
      const rng = FC.rngOf(state);
      const W = FC.BAL.week;
      const BG = FC.BAL.growth;
      const u = state.user;
      const wk = state.wk;
      let energy = W.energy;
      const done = [];
      items.slice(0, W.maxActivities).forEach((it) => {
        const cost = Game.activityCost(it);
        if (cost > energy) return;
        if (it.k === 'train' && u.inj) return; // المصاب لا يتدرب
        energy -= cost;
        if (it.k === 'train') {
          const m = (it.mult != null ? it.mult : BG.autoTrain) * BG.intensity[it.int || 'mid'];
          wk.tm[it.g] = Math.max(wk.tm[it.g] || 0, m);
          u.fit = U.clamp(u.fit + W.train[it.int || 'mid'].fit, 0, 100);
          if (it.int === 'hard') FC.Status.trust(state, 1, 'train');
          // خطر الإصابة في التدريب (المكثف مع التعب أخطر)
          FC.Status.trainingRisk(state, rng, it.int || 'mid');
        } else if (it.k === 'physio') {
          wk.physio = true;
          u.fit = U.clamp(u.fit + W.physio.fit, 0, 100);
        } else if (it.k === 'rest') {
          u.fit = U.clamp(u.fit + W.rest.fit, 0, 100);
          u.morale = U.clamp(u.morale + W.rest.morale, 0, 100);
        } else if (it.k === 'video') {
          wk.video = true;
          FC.Status.trust(state, W.video.trust, 'train');
        } else if (it.k === 'family') {
          u.morale = U.clamp(u.morale + W.family.morale, 0, 100);
          u.fit = U.clamp(u.fit + W.family.fit, 0, 100);
        }
        done.push(it);
      });
      wk.plan = done;
      wk.energy = energy;
      wk.planned = true;
      return done;
    },

    // ============ المباراة ============

    // تجهيز مباراتك الحية
    startMatch(state, mode) {
      const ref = Game.userFixtureRef(state);
      if (!ref) return null;
      return FC.Match.create(state, ref.home, ref.away, ref, { live: true, mode: mode || 'play' });
    },

    // إنهاء مباراتك وتسجيل كل شيء
    completeMatch(state, m) {
      const res = FC.Match.finish(state, m);
      const rng = FC.rngOf(state);
      const u = state.user;
      const mu = m.user;
      const BS = FC.BAL.status;
      const si = mu ? mu.si : 0;
      const S = m.sides[si];
      const O = m.sides[1 - si];
      const gf = S.goals;
      const ga = O.goals;
      const summary = {
        home: m.sides[0].id, away: m.sides[1].id, score: res.score, si,
        role: mu ? mu.state : 'out', played: false, rating: null, motm: res.motm, ratings: res.ratings,
        userStats: null, lg: m.ref ? m.ref.lg : null,
      };
      const result = gf > ga ? 1 : gf < ga ? -1 : 0;
      u.morale = U.clamp(u.morale + result * 3, 0, 100);
      if (mu && mu.x && mu.x.in >= 0) {
        const x = mu.x;
        const mins = FC.Match.minutes(m, x);
        const r = x.rt;
        const s = u.season;
        const clean = ga === 0 && mins >= 60 && (x.role === 'GK' || x.role === 'CB' || x.role === 'FB');
        const st = {
          mn: mins, g: x.g, a: x.a, sh: x.sh, sot: x.sot, kp: mu.kp, pas: Math.round(mu.pas), pasOk: Math.round(mu.pasOk),
          drb: mu.drb, tk: mu.tk, int: mu.int, sv: x.sv, fouls: mu.fouls, yc: x.yc, rc: x.rc, cs: clean ? 1 : 0,
        };
        s.ap++;
        if (x.start) s.st++;
        s.mn += mins;
        s.g += x.g;
        s.a += x.a;
        s.rs += r;
        s.yc += x.yc;
        s.rc += x.rc;
        s.sh += x.sh;
        s.sot += x.sot;
        s.kp += st.kp;
        s.pas += st.pas;
        s.pasOk += st.pasOk;
        s.drb += st.drb;
        s.tk += st.tk;
        s.int += st.int;
        s.sv += st.sv;
        s.cs += st.cs;
        if (res.motm === 0) s.motm++;
        const firstGoal = u.career.g === 0 && x.g > 0;
        const firstGame = u.team === 'F' && !state.flags.firstSenior;
        u.career.ap++;
        u.career.g += x.g;
        u.career.a += x.a;
        u.career.mn += mins;
        if (res.motm === 0) u.career.motm++;
        u.form.push(r);
        if (u.form.length > BS.formWindow) u.form.shift();
        u.fit = Math.round(mu.fit);
        u.minHist.push(mins / 90);
        u.morale = U.clamp(u.morale + 1 + (r >= 7.5 ? 2 : r <= 5.5 ? -2 : 0), 0, 100);
        FC.Status.trust(state, U.clamp((r - 6.6) * 3, -4, 5), 'perf');
        FC.Status.sharpAfterMatch(u, mins);
        summary.played = true;
        summary.rating = r;
        summary.userStats = st;
        if (firstGoal) FC.Msg.add(state, 'family', 'هدفك الأول!', FC.TXT.msg(rng, 'familyFirstGoal', {}));
        if (firstGame) {
          state.flags.firstSenior = true;
          FC.Msg.add(state, 'family', 'أول ظهور مع الكبار', FC.TXT.msg(rng, 'familyFirstGame', {}));
        }
      } else {
        u.minHist.push(0);
        u.morale = U.clamp(u.morale - (summary.role === 'bench' ? 2 : 3), 0, 100);
      }
      if (u.minHist.length > FC.BAL.growth.minutesWindow) u.minHist.shift();
      // الإيقافات (البطاقات) بعد المباراة
      FC.Status.afterMatchUser(state, m, rng);
      u.log.push({ w: state.week, lg: summary.lg, opp: S === m.sides[0] ? m.sides[1].id : m.sides[0].id, h: si === 0, gf, ga, r: summary.rating, g: summary.userStats ? summary.userStats.g : 0, a: summary.userStats ? summary.userStats.a : 0, mn: summary.userStats ? summary.userStats.mn : 0 });
      state.wk.played = true;
      state.wk.last = summary;
      return summary;
    },

    // محاكاة مباراتك تلقائياً (بدون لحظات)
    simUserMatchAuto(state) {
      const ref = Game.userFixtureRef(state);
      if (!ref) return null;
      const m = FC.Match.create(state, ref.home, ref.away, ref, { live: false, mode: 'auto' });
      FC.Match.run(state, m);
      return Game.completeMatch(state, m);
    },

    // ============ نهاية الأسبوع ============
    endWeek(state) {
      const rng = FC.rngOf(state);
      const u = state.user;
      const rep = { season: state.season, week: state.week, ups: [], results: [], promoted: false, seasonEnd: false, newSeason: false, msgs: [] };
      const msgBefore = state.msgSeq;
      // مباراتك إن لم تُلعب
      if (Game.userFixtureRef(state) && !state.wk.played) Game.simUserMatchAuto(state);
      // كل مباريات الأسبوع الباقية
      FC.Comp.weekMatches(state, state.week).forEach((ref) => {
        const f = FC.Comp.fixture(state, ref);
        if (f[2] < 0) FC.Match.quick(state, ref);
      });
      // نتائج دوريك هذا الأسبوع
      const lg = Game.userLeague(state);
      FC.Comp.weekMatches(state, state.week).forEach((ref) => {
        if (ref.lg === lg) rep.results.push(FC.Comp.fixture(state, ref).slice());
      });
      // التطور
      rep.ups = FC.Growth.weekUser(state);
      u.lastUps = rep.ups;
      // الاستشفاء والمعنويات للأسبوع القادم
      const BS = FC.BAL.status;
      u.fit = Math.min(BS.fitCap, u.fit + BS.fitWeekly);
      // الإصابات والجاهزية ولاعبو الذكاء الاصطناعي
      FC.Status.sharpWeekly(state);
      FC.Status.weeklyUser(state, rng);
      FC.Status.weeklyAI(state);
      FC.Status.coachReview(state, rng);
      if (state.week === FC.BAL.coach.captainWeek) FC.Status.captainReview(state, rng);
      u.morale += u.morale > BS.moraleMid ? -BS.moraleDrift : u.morale < BS.moraleMid ? BS.moraleDrift : 0;
      // التصعيد
      if (u.team === 'Y') Game.checkPromotion(state, rep);
      // ملاحظات المدرب كل 8 أسابيع في الموسم
      if (FC.Calendar.phase(state.week) === 'season' && state.week % 8 === 0 && u.minHist.length >= 3) {
        const share = U.avg(u.minHist);
        const form = FC.Player.formOf(u);
        if (share < 0.2) FC.Msg.add(state, 'coach', 'حديث مع المدرب', FC.TXT.msg(rng, 'coachNoPlay', {}));
        else if (form >= 7.2) FC.Msg.add(state, 'coach', 'إشادة من المدرب', FC.TXT.msg(rng, 'coachGood', {}));
        else if (form <= 6.3) FC.Msg.add(state, 'coach', 'تنبيه من المدرب', FC.TXT.msg(rng, 'coachBad', {}));
      }
      if (state.week === FC.BAL.cal.seasonEndWeek) {
        Game.seasonEnd(state, rep);
        rep.seasonEnd = true;
      }
      state.week++;
      if (state.week >= FC.Calendar.WEEKS) {
        Game.rollover(state, rep);
        rep.newSeason = true;
      }
      state.wk = Game.newWeekState();
      rep.msgs = state.inbox.filter((mm) => mm.id > msgBefore).map((mm) => mm.id);
      state.lastReport = rep;
      return rep;
    },

    // أسبوع كامل تلقائي (للمحاكاة السريعة والاختبار)
    autoWeek(state) {
      if (!state.wk.planned) Game.applyPlan(state, Game.autoPlan(state));
      if (Game.userFixtureRef(state) && !state.wk.played) Game.simUserMatchAuto(state);
      return Game.endWeek(state);
    },

    // ============ التصعيد للفريق الأول ============
    checkPromotion(state, rep) {
      const BP = FC.BAL.promote;
      const u = state.user;
      if (state.season === state.startSeason && state.week < BP.minWeek) return;
      const club = state.clubs[u.club];
      const same = club.squad
        .map((id) => state.players[id])
        .filter((p) => p.pos === u.pos || FC.Select.fam(p.pos, u.pos) >= 0.9)
        .sort((a, b) => b.ovr - a.ovr);
      // المرجع: أضعف لاعب أساسي في مركزك بالفريق الأول
      const idx = Math.min(same.length - 1, (FC.World.STARTERS[u.pos] || 1) - 1);
      const ref = same.length ? same[Math.max(0, idx)].ovr : 50;
      const ovr = FC.Player.ovr(u);
      const form = FC.Player.formOf(u);
      const ok = ovr >= ref - BP.gapToSecond || (u.form.length >= 3 && form >= BP.formRating && ovr >= ref - BP.formGap);
      if (ok) Game.promote(state, rep);
    },

    promote(state, rep) {
      const u = state.user;
      const rng = FC.rngOf(state);
      const club = state.clubs[u.club];
      u.team = 'F';
      u.num = 0;
      FC.World.assignNumbers(state, club, rng);
      u.trust = FC.BAL.status.trustStart;
      FC.Msg.add(state, 'club', 'تصعيد إلى الفريق الأول!', FC.TXT.msg(rng, 'promotion', { c: club.name, n: u.num }), { big: 'promotion' });
      FC.Status.captainReview(state, rng);
      if (rep) rep.promoted = true;
    },

    // ============ نهاية الموسم ============
    seasonEnd(state, rep) {
      const rng = FC.rngOf(state);
      const u = state.user;
      const snap = { season: state.season, champs: {}, scorers: {} };
      const myLg = Game.userLeague(state);
      for (const id in state.leagues) {
        const table = FC.Comp.table(state, id);
        const champ = table[0].id;
        snap.champs[id] = champ;
        const top = FC.Comp.leaders(state, id, 'sG', 1)[0];
        if (top) snap.scorers[id] = { pid: top.pid, name: top.pid === 0 ? FC.Player.fullName(u) : FC.Player.fullName(state.players[top.pid]), club: top.club, g: top.v };
        if (id === myLg) {
          const L = state.leagues[id];
          if (champ === Game.userTeam(state)) FC.Msg.add(state, 'club', 'أبطال!', FC.TXT.msg(rng, 'userChampion', { l: L.name, c: state.clubs[champ].name }), { big: 'champion' });
          else FC.Msg.add(state, 'league', 'بطل الدوري', FC.TXT.msg(rng, 'champion', { l: L.name, c: state.clubs[champ].name }));
        }
      }
      state.history.seasons.push(snap);
      const s = u.season;
      const avg = s.ap ? U.round1(s.rs / s.ap) : 0;
      u.history.push({
        season: state.season, club: u.club, team: u.team, lg: myLg, clubName: state.clubs[Game.userTeam(state)].name,
        ap: s.ap, st: s.st, mn: s.mn, g: s.g, a: s.a, avg, ovr: Math.floor(FC.Player.ovr(u)), motm: s.motm,
        pos: FC.Comp.position(state, myLg, Game.userTeam(state)),
      });
      FC.Growth.seasonPotential(state);
      FC.Msg.add(state, 'coach', 'نهاية الموسم', FC.TXT.msg(rng, 'seasonEnd', { s: FC.Calendar.seasonLabel(state.season), ap: s.ap, g: s.g, a: s.a, r: avg || '—' }));
      if (rep) rep.snap = snap;
    },

    // الانتقال إلى موسم جديد
    rollover(state, rep) {
      const rng = FC.rngOf(state);
      const u = state.user;
      // تطور لاعبي الذكاء الاصطناعي وأعمارهم
      for (const id in state.players) {
        const p = state.players[id];
        const club = state.clubs[p.club];
        const L = club ? state.leagues[club.lg] : null;
        const maxMin = L ? L.rounds.length * 90 : 3000;
        FC.Growth.yearAI(p, rng, p.sMn / maxMin);
        p.age++;
        p.sAp = p.sSt = p.sMn = p.sG = p.sA = p.sRs = p.sYc = p.sRc = 0;
        p.fm = U.round1(6.7 + (p.fm - 6.7) * 0.5);
      }
      const stats = FC.Regens.run(state, rng);
      if (rep) rep.regens = stats;
      // عمرك وموسمك الجديد
      u.age++;
      u.season = FC.Player.emptySeason();
      u.log = [];
      u.sg = 0;
      u.luck = rng.next();
      u.seasonStartAttrs = U.clone(u.attrs);
      u.fit = 100;
      FC.Status.newSeason(state);
      // دوري الشباب
      if (u.team === 'Y' && u.age >= FC.BAL.promote.autoAge) Game.promote(state, rep);
      if (u.team === 'Y') FC.Regens.refreshYouth(state, rng);
      else if (state.leagues.YTH) {
        state.leagues.YTH.clubs.forEach((cid) => {
          state.clubs[cid].squad.forEach((pid) => delete state.players[pid]);
          delete state.clubs[cid];
        });
        delete state.leagues.YTH;
      }
      state.season++;
      state.week = 0;
      FC.Comp.newSeason(state);
      FC.Msg.add(state, 'club', 'موسم جديد', FC.TXT.msg(rng, 'newSeason', { s: FC.Calendar.seasonLabel(state.season), age: u.age }));
      FC.Status.captainReview(state, rng);
      const pr = FC.Player.potRange(state, u);
      FC.Msg.add(state, 'scout', 'تقرير الكشافين', FC.TXT.msg(rng, 'scout', { lo: pr[0], hi: pr[1] }));
    },
  });
})(globalThis);
