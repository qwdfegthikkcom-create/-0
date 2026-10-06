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
      // الشهرة والغريم وبقية الحياة خارج الملعب، والأرقام القياسية
      if (FC.Life) FC.Life.ensure(state);
      if (FC.Legacy) FC.Legacy.ensure(state);
      // «ابن الأسطورة»
      if (setup.legend && FC.Life) {
        state.user.fame = FC.BAL.legacy.sonFame;
        state.user.followers = FC.Life.followersOf(state.user.fame);
        FC.Msg.add(state, 'family', 'رسالة من والدك', 'يا بني، اسم عائلتنا يعرفه الجميع في الملاعب. لا تحمل ضغط اسمي، اصنع قصتك أنت. أنا فخور بك. — ' + setup.legend.name);
      }
      return state;
    },

    // كل مبارياتك هذا الأسبوع التي لم تُلعب (الدوري، الكأس، القارية، المنتخب) مرتبة حسب اليوم
    // اليوم 0 = نهاية الأسبوع، اليوم 1 = منتصف الأسبوع
    userFixtures(state) {
      const u = state.user;
      const team = Game.userTeam(state);
      const out = [];
      if (u.retired) return out; // اعتزلت: العالم يستمر بدونك
      // أثناء بطولة دولية في يناير تغيب عن مباريات ناديك
      if (!u.away) {
        const lg = Game.userLeague(state);
        const L = state.leagues[lg];
        const r = L ? L.roundWeeks.indexOf(state.week) : -1;
        if (r >= 0) {
          const i = L.rounds[r].findIndex((f) => f[0] === team || f[1] === team);
          if (i >= 0 && L.rounds[r][i][2] < 0) out.push({ lg, r, i, home: L.rounds[r][i][0], away: L.rounds[r][i][1], d: 0 });
        }
      }
      const nt = FC.Nat ? FC.Nat.userNt(state) : null;
      (state.fx || []).forEach((fx) => {
        if (fx.w !== state.week || fx.hg >= 0) return;
        const c = state.comps[fx.c];
        if (!c) return;
        if (c.nat) {
          if (nt != null && (fx.h === nt || fx.a === nt)) out.push(Object.assign(FC.Cups.refOf(state, fx), { userSide: fx.h === nt ? 0 : 1 }));
        } else if (!u.away && (fx.h === team || fx.a === team)) out.push(FC.Cups.refOf(state, fx));
      });
      out.sort((a, b) => a.d - b.d);
      return out;
    },

    // مباراتك القادمة هذا الأسبوع (إن وُجدت ولم تُلعب)
    userFixtureRef(state) {
      return Game.userFixtures(state)[0] || null;
    },

    // اسم المسابقة ومرحلتها لمباراة (للواجهة)
    refLabel(state, ref) {
      if (!ref) return '';
      if (ref.fid != null) return FC.Cups.label(state, state.fx[ref.fid]);
      const L = state.leagues[ref.lg];
      return L ? (L.short || L.name) + ' · الجولة ' + (ref.r + 1) : '';
    },

    // المباريات القادمة لك في كل المسابقات (للشاشة الرئيسية): [{week, d, home, opp, ref}]
    upcoming(state, n) {
      const u = state.user;
      const team = Game.userTeam(state);
      const out = [];
      FC.Comp.clubFixtures(state, team).forEach((f) => {
        if (f.gf < 0 && f.week >= state.week) out.push({ week: f.week, d: 0, home: f.home, opp: f.opp, ref: { lg: f.lg, r: f.r, i: f.i, home: f.home ? team : f.opp, away: f.home ? f.opp : team, d: 0 } });
      });
      const nt = FC.Nat ? FC.Nat.userNt(state) : null;
      (state.fx || []).forEach((fx) => {
        if (fx.hg >= 0 || fx.w < state.week) return;
        const c = state.comps[fx.c];
        if (!c) return;
        const me = c.nat ? nt : team;
        if (me == null || (fx.h !== me && fx.a !== me)) return;
        out.push({ week: fx.w, d: fx.d, home: fx.h === me, opp: fx.h === me ? fx.a : fx.h, ref: FC.Cups.refOf(state, fx), nat: c.nat, me });
      });
      out.sort((a, b) => a.week - b.week || a.d - b.d);
      // أثناء الغياب مع المنتخب: مباريات النادي لا تخصك
      const list = u.away ? out.filter((x) => x.nat) : out;
      return list.slice(0, n || 5);
    },

    // المباراة القادمة لفريقك (للشاشة الرئيسية)
    nextFixture(state) {
      return Game.upcoming(state, 1)[0] || null;
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
        } else if (it.k === 'media') {
          // حدث إعلامي أو إعلاني: مال + شهرة
          u.fit = U.clamp(u.fit + W.media.fit, 0, 100);
          wk.mediaPay = FC.Life ? FC.Life.media(state) : 0;
        }
        done.push(it);
      });
      wk.plan = done;
      if (FC.Life && FC.Life.has(state, 'mental')) wk.mental = true; // المدرب الذهني: تطور السمات الذهنية
      wk.energy = energy;
      wk.planned = true;
      return done;
    },

    // ============ المباراة ============

    // تجهيز مباراتك الحية
    startMatch(state, mode) {
      const ref = Game.userFixtureRef(state);
      if (!ref) return null;
      return FC.Match.create(state, ref.home, ref.away, ref, { live: true, mode: mode || 'play', userSide: ref.userSide });
    },

    // نوع المباراة: lg دوري، cup كأس أو قارية، nat منتخب
    kindOf(ref) {
      if (!ref || ref.fid == null) return 'lg';
      return ref.nat ? 'nat' : 'cup';
    },

    // محاكاة بقية مباريات العالم في يوم من الأسبوع ثم التقدم في المسابقات
    playDay(state, d) {
      const mine = Game.userFixtures(state);
      const isMine = (o) => mine.some((r) => (o.fid != null ? r.fid === o.fid : r.fid == null && r.lg === o.lg && r.r === o.r && r.i === o.i));
      if (d === 0) {
        FC.Comp.weekMatches(state, state.week).forEach((ref) => {
          const f = FC.Comp.fixture(state, ref);
          if (f[2] < 0 && !isMine(ref)) FC.Match.quick(state, ref);
        });
      }
      const list = FC.Cups.weekFixtures(state, state.week, d);
      if (d === 1 && list.length) Game.midRecover(state, list);
      list.forEach((fx) => {
        if (fx.hg < 0 && !isMine({ fid: fx.id })) FC.Match.quickFx(state, fx);
      });
      FC.Cups.advanceAll(state);
    },

    // استشفاء جزئي بين مباراة نهاية الأسبوع ومباراة منتصفه (لاعبو الذكاء الاصطناعي)
    midRecover(state, list) {
      const add = FC.BAL.cups.aiMidRecover;
      const done = new Set();
      list.forEach((fx) => {
        [fx.h, fx.a].forEach((cid) => {
          if (done.has(cid) || !state.clubs[cid]) return;
          done.add(cid);
          state.clubs[cid].squad.forEach((pid) => {
            const p = state.players[pid];
            if (p && p.fit < 100) p.fit = Math.min(100, p.fit + add);
          });
        });
      });
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
      const kind = Game.kindOf(m.ref);
      const summary = {
        home: m.sides[0].id, away: m.sides[1].id, score: res.score, si,
        role: mu ? mu.state : 'out', played: false, rating: null, motm: res.motm, ratings: res.ratings,
        userStats: null, lg: m.ref ? m.ref.lg : null, kind, c: m.ref && m.ref.c ? m.ref.c : null,
        label: Game.refLabel(state, m.ref), et: res.et, pens: res.pens, agg: m.agg ? [m.agg[0] + m.sides[0].goals, m.agg[1] + m.sides[1].goals] : null,
      };
      // الفوز يحسب بالترجيح في مباريات خروج المغلوب
      let result = gf > ga ? 1 : gf < ga ? -1 : 0;
      if (res.pens) result = res.pens[si] > res.pens[1 - si] ? 1 : -1;
      u.morale = U.clamp(u.morale + result * 3, 0, 100);
      const firstGoalBefore = u.career.g + (u.intl ? u.intl.g : 0) === 0;
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
        const firstGoal = firstGoalBefore && x.g > 0;
        const firstGame = kind !== 'nat' && u.team === 'F' && !state.flags.firstSenior;
        if (kind === 'nat') {
          // مسيرتك الدولية
          const I = (u.intl = u.intl || FC.Nat.emptyIntl());
          I.caps++;
          I.g += x.g;
          I.sc = (I.sc || 0) + 1; // مباريات هذا الموسم
          I.sg = (I.sg || 0) + x.g;
          I.a += x.a;
          I.mn += mins;
          I.rs += r;
          if (!I.debut) {
            I.debut = { s: state.season, w: state.week, opp: O.id };
            FC.Msg.add(state, 'nat', 'أول مباراة دولية', FC.TXT.msg(rng, 'ntDebut', { t: S.club.short, o: O.club.short }), { reply: 'family' });
          }
          if (x.g > 0 && I.g === x.g) FC.Msg.add(state, 'nat', 'هدفك الدولي الأول!', FC.TXT.msg(rng, 'ntFirstGoal', { t: S.club.short, o: O.club.short }));
        } else {
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
          if (kind === 'lg') {
            const sl = (s.lg = s.lg || { ap: 0, g: 0, a: 0, rs: 0 });
            sl.ap++;
            sl.g += x.g;
            sl.a += x.a;
            sl.rs += r;
          }
          u.career.ap++;
          u.career.g += x.g;
          u.career.a += x.a;
          u.career.mn += mins;
          if (res.motm === 0) u.career.motm++;
          u.minHist.push(mins / 90);
          FC.Status.trust(state, U.clamp((r - 6.6) * 3, -4, 5), 'perf');
        }
        u.form.push(r);
        if (u.form.length > BS.formWindow) u.form.shift();
        u.fit = Math.round(mu.fit);
        u.morale = U.clamp(u.morale + 1 + (r >= 7.5 ? 2 : r <= 5.5 ? -2 : 0), 0, 100);
        FC.Status.sharpAfterMatch(u, mins);
        summary.played = true;
        summary.rating = r;
        summary.userStats = st;
        if (firstGoal) FC.Msg.add(state, 'family', 'هدفك الأول!', FC.TXT.msg(rng, 'familyFirstGoal', {}), { reply: 'family' });
        if (firstGame) {
          state.flags.firstSenior = true;
          FC.Msg.add(state, 'family', 'أول ظهور مع الكبار', FC.TXT.msg(rng, 'familyFirstGame', {}), { reply: 'family' });
        }
      } else if (kind !== 'nat') {
        u.minHist.push(0);
        u.morale = U.clamp(u.morale - (summary.role === 'bench' ? 2 : 3), 0, 100);
      }
      if (u.minHist.length > FC.BAL.growth.minutesWindow) u.minHist.shift();
      // الإيقافات (البطاقات) بعد المباراة، ومكافآت العقد (للنادي فقط)
      FC.Status.afterMatchUser(state, m, rng);
      if (kind !== 'nat') FC.Econ.matchBonus(state, summary);
      u.log.push({ w: state.week, lg: summary.lg, c: summary.c, k: kind, opp: S === m.sides[0] ? m.sides[1].id : m.sides[0].id, h: si === 0, gf, ga, r: summary.rating, g: summary.userStats ? summary.userStats.g : 0, a: summary.userStats ? summary.userStats.a : 0, mn: summary.userStats ? summary.userStats.mn : 0, p: res.pens ? res.pens[si] + '-' + res.pens[1 - si] : null });
      if (u.log.length > 90) u.log.shift();
      state.wk.last = summary;
      // نتيجة المواجهة في الكأس (تأهلت أو خرجت)
      if (kind !== 'lg') summary.tie = Game.tieOutcome(state, m.ref, S.id);
      // الشهرة والأخبار والمنشور والمقابلة
      if (FC.Life) FC.Life.afterMatch(state, m, summary);
      // الأرقام القياسية والإنجازات
      if (FC.Legacy) summary.ach = FC.Legacy.afterMatch(state, summary);
      // بقية مباريات اليوم في العالم، ثم استعداد لمباراة منتصف الأسبوع إن وجدت
      Game.playDay(state, m.ref && m.ref.d != null ? m.ref.d : 0);
      const next = Game.userFixtureRef(state);
      if (next) u.fit = Math.min(BS.fitCap, u.fit + FC.BAL.cups.midRecover + (FC.Life && FC.Life.has(state, 'nutri') ? FC.BAL.life.nutriMid : 0));
      state.wk.played = !next;
      return summary;
    },

    // بعد مباراة إقصائية: هل تأهل فريقك أم خرج؟ (رسالة للخروج)
    tieOutcome(state, ref, teamId) {
      const fx = state.fx[ref.fid];
      if (!fx) return null;
      const c = state.comps[fx.c];
      const st = c.stages[fx.s];
      if (st.k !== 'ko') return null;
      const tie = st.ties[fx.t];
      if (!tie || tie.w == null) return null;
      const won = tie.w === teamId;
      if (!won && !c.nat && !st.final) FC.Msg.add(state, 'club', 'وداع ' + c.name, FC.TXT.msg(FC.rngOf(state), 'cupOut', { c: c.name, s: st.n }));
      return { won, stage: st.n, final: !!st.final, comp: c.name };
    },

    // محاكاة مباراتك تلقائياً (بدون لحظات)
    simUserMatchAuto(state) {
      const ref = Game.userFixtureRef(state);
      if (!ref) return null;
      const m = FC.Match.create(state, ref.home, ref.away, ref, { live: false, mode: 'auto', userSide: ref.userSide });
      FC.Match.run(state, m);
      return Game.completeMatch(state, m);
    },

    // ============ نهاية الأسبوع ============
    endWeek(state) {
      const rng = FC.rngOf(state);
      const u = state.user;
      const rep = { season: state.season, week: state.week, ups: [], results: [], promoted: false, seasonEnd: false, newSeason: false, msgs: [] };
      const msgBefore = state.msgSeq;
      // مبارياتك التي لم تُلعب (تُحاكى تلقائياً) ثم بقية العالم: نهاية الأسبوع ثم منتصفه
      for (const d of [0, 1]) {
        let ref;
        let guard = 0;
        while ((ref = Game.userFixtureRef(state)) && ref.d <= d && guard++ < 4) Game.simUserMatchAuto(state);
        Game.playDay(state, d);
      }
      // نتائج دوريك هذا الأسبوع
      const lg = Game.userLeague(state);
      FC.Comp.weekMatches(state, state.week).forEach((ref) => {
        if (ref.lg === lg) rep.results.push(FC.Comp.fixture(state, ref).slice());
      });
      const BS = FC.BAL.status;
      const active = !u.retired;
      if (active) {
        // التطور
        rep.ups = FC.Growth.weekUser(state);
        u.lastUps = rep.ups;
        // الاستشفاء والمعنويات للأسبوع القادم
        u.fit = Math.min(BS.fitCap, u.fit + BS.fitWeekly + (FC.Life && FC.Life.has(state, 'nutri') ? FC.BAL.life.nutriFit : 0));
        FC.Status.sharpWeekly(state);
        FC.Status.weeklyUser(state, rng);
      }
      // الإصابات ولاعبو الذكاء الاصطناعي
      FC.Status.weeklyAI(state);
      if (active) {
        FC.Status.coachReview(state, rng);
        if (state.week === FC.BAL.coach.captainWeek) FC.Status.captainReview(state, rng);
        // المال والانتقالات
        FC.Econ.weekly(state);
      }
      FC.Transfer.weekly(state, rng);
      if (active) {
        // الحياة خارج الملعب: الرعاة، الخدمات، الأحداث، الأخبار، الغربة
        if (FC.Life) FC.Life.weekly(state, rng, rep);
        // الأرقام القياسية والإنجازات
        if (FC.Legacy) rep.ach = FC.Legacy.weekly(state);
        u.morale += u.morale > BS.moraleMid ? -BS.moraleDrift : u.morale < BS.moraleMid ? BS.moraleDrift : 0;
        // التصعيد
        if (u.team === 'Y') Game.checkPromotion(state, rep);
      }
      // الاستدعاءات الدولية قبل الأسبوع الدولي القادم
      if (FC.Nat) {
        const nw = state.week + 1;
        if (nw < FC.Calendar.WEEKS && (FC.Nat.windowWeeks(state).indexOf(nw) >= 0 || FC.Nat.natFixtures(state, nw).length)) FC.Nat.callUps(state, nw);
      }
      // ملاحظات المدرب كل 8 أسابيع في الموسم
      if (active && FC.Calendar.phase(state.week) === 'season' && state.week % 8 === 0 && u.minHist.length >= 3) {
        const share = U.avg(u.minHist);
        const form = FC.Player.formOf(u);
        if (share < 0.2) FC.Msg.add(state, 'coach', 'حديث مع المدرب', FC.TXT.msg(rng, 'coachNoPlay', {}), { reply: 'coachBench' });
        else if (form >= 7.2) FC.Msg.add(state, 'coach', 'إشادة من المدرب', FC.TXT.msg(rng, 'coachGood', {}), { reply: 'coachPraise' });
        else if (form <= 6.3) FC.Msg.add(state, 'coach', 'تنبيه من المدرب', FC.TXT.msg(rng, 'coachBad', {}), { reply: 'coachWarn' });
      }
      // مبارياتك هذا الأسبوع (للملخص)
      rep.mine = u.log.filter((l) => l.w === state.week);
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
      if (state.user.retired) return Game.endWeek(state);
      FC.Transfer.autoDecide(state, FC.rngOf(state));
      if (FC.Life) FC.Life.autoDecide(state);
      // قرار الاعتزال التلقائي في نهاية الموسم
      if (FC.Legacy && state.week === FC.BAL.cal.seasonEndWeek && FC.Legacy.autoRetire(state)) state.user.retirePlan = true;
      if (!state.wk.planned) Game.applyPlan(state, Game.autoPlan(state));
      let guard = 0;
      while (Game.userFixtureRef(state) && guard++ < 4) Game.simUserMatchAuto(state);
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
      FC.Transfer.firstPro(state);
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
      state.qual = state.qual || {};
      for (const id in state.leagues) {
        const table = FC.Comp.table(state, id);
        const champ = table[0].id;
        // الترتيب النهائي: للتأهل إلى البطولات القارية
        state.qual[id] = table.map((r) => r.id);
        snap.champs[id] = champ;
        const top = FC.Comp.leaders(state, id, 'sG', 1)[0];
        if (top) snap.scorers[id] = { pid: top.pid, name: top.pid === 0 ? FC.Player.fullName(u) : FC.Player.fullName(state.players[top.pid]), club: top.club, g: top.v };
        if (id === myLg && !u.retired) {
          const L = state.leagues[id];
          if (champ === Game.userTeam(state)) {
            FC.Msg.add(state, 'club', 'أبطال!', FC.TXT.msg(rng, 'userChampion', { l: L.name, c: state.clubs[champ].name }), { big: 'champion' });
            if (!L.youth) {
              (u.trophies = u.trophies || []).push({ s: state.season, id: 'LG_' + id, k: 'league', name: L.name, team: champ });
              if (FC.Life) FC.Life.addFame(state, FC.BAL.life.trophy.league * FC.Life.visF(state));
              if (u.contract) FC.Econ.txn(state, u.contract.wage * FC.BAL.cups.trophyWage.league, 'bonus', 'مكافأة الفوز بالدوري');
            }
          }
          else FC.Msg.add(state, 'league', 'بطل الدوري', FC.TXT.msg(rng, 'champion', { l: L.name, c: state.clubs[champ].name }));
        }
      }
      state.history.seasons.push(snap);
      // جوائز الدوريات (أفضل لاعب، الهداف، الشاب، تشكيلة الموسم، أفضل لاعب في ناديك)
      if (FC.Awards) {
        FC.Awards.leagueAwards(state, snap);
        if (rep) rep.awards = true;
      }
      if (u.retired) {
        if (rep) rep.snap = snap;
        return;
      }
      const s = u.season;
      const avg = s.ap ? U.round1(s.rs / s.ap) : 0;
      u.history.push({
        season: state.season, club: u.club, team: u.team, lg: myLg, clubName: state.clubs[Game.userTeam(state)].name,
        ap: s.ap, st: s.st, mn: s.mn, g: s.g, a: s.a, avg, ovr: Math.floor(FC.Player.ovr(u)), motm: s.motm,
        pos: FC.Comp.position(state, myLg, Game.userTeam(state)),
        lgG: s.lg ? s.lg.g : s.g, lgAp: s.lg ? s.lg.ap : s.ap,
        cups: FC.Cups ? Game.cupRuns(state) : [],
      });
      FC.Growth.seasonPotential(state);
      FC.Msg.add(state, 'coach', 'نهاية الموسم', FC.TXT.msg(rng, 'seasonEnd', { s: FC.Calendar.seasonLabel(state.season), ap: s.ap, g: s.g, a: s.a, r: avg || '—' }));
      if (FC.Legacy) {
        FC.Legacy.seasonEnd(state);
        // قرار الاعتزال متاح بعد 33 (يُنفّذ عند نهاية الصيف)
        if (FC.Legacy.canRetire(state) && !u.retirePlan) FC.Msg.add(state, 'family', 'التفكير في المستقبل', 'عمرك الآن ' + u.age + ' عاماً. يمكنك إعلان اعتزالك من ملفك (يُنفّذ مع نهاية الموسم)، أو الاستمرار موسماً آخر.');
      }
      if (rep) rep.snap = snap;
    },

    // مشوار ناديك في الكؤوس هذا الموسم: [{name, txt, k}]
    cupRuns(state) {
      const team = Game.userTeam(state);
      return FC.Cups.compsOf(state, team)
        .filter((c) => !c.nat)
        .map((c) => {
          const st = FC.Cups.statusOf(state, c, team);
          return { id: c.id, name: c.name, txt: st ? st.txt : '', k: st ? st.k : '' };
        });
    },

    // الانتقال إلى موسم جديد
    rollover(state, rep) {
      const rng = FC.rngOf(state);
      const u = state.user;
      // الجوائز العالمية (بعد بطولات الصيف) قبل تصفير الإحصائيات
      if (FC.Awards) {
        FC.Awards.globalAwards(state);
        if (rep) rep.global = true;
      }
      // الاعتزال (قرارك أو إجباري)
      if (FC.Legacy && !u.retired) {
        const forced = FC.Legacy.forcedReason(state);
        if (u.retirePlan || forced) {
          FC.Legacy.retire(state, forced || 'choice');
          if (rep) rep.retired = true;
        }
      }
      // تطور لاعبي الذكاء الاصطناعي وأعمارهم
      if (FC.Cups) FC.Cups.archive(state);
      if (FC.Life) FC.Life.rivalSeason(state);
      for (const id in state.players) {
        const p = state.players[id];
        const club = state.clubs[p.club];
        const L = club ? state.leagues[club.lg] : null;
        const maxMin = L ? L.rounds.length * 90 : 3000;
        const share = club && club.gen ? FC.Cups.genShare(state, p) : Math.min(1, p.sMn / maxMin);
        p.away = 0;
        FC.Growth.yearAI(p, rng, share);
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
      if (u.intl) {
        u.intl.sc = 0;
        u.intl.sg = 0;
      }
      // دوري الشباب
      if (!u.retired && u.team === 'Y' && u.age >= FC.BAL.promote.autoAge) Game.promote(state, rep);
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
      u.away = false;
      if (!u.retired) FC.Transfer.rollover(state, rng);
      FC.Comp.newSeason(state);
      if (FC.Cups) FC.Cups.newSeason(state);
      if (FC.Life) FC.Life.rivalMove(state, rng);
      if (u.retired) return;
      if (FC.Life) FC.Life.newSeason(state);
      FC.Msg.add(state, 'club', 'موسم جديد', FC.TXT.msg(rng, 'newSeason', { s: FC.Calendar.seasonLabel(state.season), age: u.age }));
      FC.Status.captainReview(state, rng);
      const pr = FC.Player.potRange(state, u);
      FC.Msg.add(state, 'scout', 'تقرير الكشافين', FC.TXT.msg(rng, 'scout', { lo: pr[0], hi: pr[1] }));
    },
  });
})(globalThis);
