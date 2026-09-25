/* =========================================================
   محرك المباراة — دقيقة بدقيقة، نفس المحرك للمحاكاة السريعة ولمباراتك
   - كل فريق يصنع «فرصاً» حسب قوته مقابل الخصم (هجوم × دفاع × وسط + الأرض + يوم المباراة)
   - كل فرصة لها نوع (محققة، نصف فرصة، بعيدة، رأسية، ركلة حرة، جزاء) ومسدد وصانع حسب المركز والسمات
   - إذا كنت أنت المسدد أو الصانع تتوقف المباراة وتتحول إلى «لحظة» قابلة للعب
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC = G.FC || {};
  const U = FC.util;

  const B = () => FC.BAL;
  const attr = (p, k) => FC.Player.attr(p, k);
  const roleOfSlot = (slot) => FC.Player.POS[slot].role;

  // السمات المستخدمة لكل نوع فرصة: [أساسية، ثانوية، وزن الأساسية]
  const FIN_ATTR = { big: ['fin', 'cmp', 0.65], half: ['fin', 'cmp', 0.65], long: ['lng', 'pow', 0.7], header: ['hea', 'jmp', 0.7], fk: ['cur', 'lng', 0.6], pen: ['pen', 'cmp', 0.75] };
  const AST_ATTR = { big: ['vis', 'spas'], half: ['cro', 'spas'], long: ['spas', 'vis'], header: ['cro', 'cur'] };
  const TYPES = ['big', 'half', 'long', 'header', 'fk', 'pen'];
  // أنواع اللحظات المتاحة في هذه المرحلة
  const PLAY_SHOT = { big: 1, half: 1, long: 1 };
  const PLAY_PASS = { big: 1, half: 1 };

  // مهارة التسديد لنوع فرصة
  function finOf(p, type) {
    const a = FIN_ATTR[type];
    return a[2] * attr(p, a[0]) + (1 - a[2]) * attr(p, a[1]);
  }
  function astOf(p, type) {
    const a = AST_ATTR[type];
    return 0.6 * attr(p, a[0]) + 0.4 * attr(p, a[1]);
  }
  // مستوى الحارس
  function gkVal(p) {
    return (attr(p, 'gdiv') + attr(p, 'gref') + attr(p, 'gpos') + attr(p, 'ghan')) / 4;
  }

  // سجل لاعب داخل المباراة
  function rec(state, pid, slot, starter) {
    const p = FC.getP(state, pid);
    const s = slot || p.pos;
    return {
      pid, p, slot: s, role: roleOfSlot(s), start: starter, on: starter, in: starter ? 0 : -1, out: -1,
      g: 0, a: 0, sh: 0, sot: 0, yc: 0, rc: 0, sv: 0, bsv: 0, rt: 0,
      eff: FC.Player.ovr(p) * FC.Select.fam(p.pos, s),
    };
  }

  // قوة الفريق من اللاعبين الموجودين في الملعب
  function strength(side) {
    const W = B().match.strW;
    const on = side.xi.filter((x) => x.on);
    const res = {};
    for (const k in W) {
      let s = 0;
      let w = 0;
      on.forEach((x) => {
        const ww = W[k][x.role] || 0;
        s += ww * x.eff;
        w += ww;
      });
      res[k] = w ? s / w : 40;
    }
    const gk = on.find((x) => x.role === 'GK');
    res.gk = gk ? gkVal(gk.p) : 30;
    res.gkRec = gk || null;
    return res;
  }

  const M = (FC.Match = {
    TYPES, finOf, astOf,

    // إنشاء مباراة. ref = {lg, r, i} أو null. opts: {live, mode, userClub}
    create(state, home, away, ref, opts) {
      opts = opts || {};
      const rng = FC.rngOf(state);
      const BM = B().match;
      const pickH = opts.pickH || FC.Select.pick(state, home, rng);
      const pickA = opts.pickA || FC.Select.pick(state, away, rng);
      const mkSide = (clubId, pick, isHome) => {
        const xi = pick.xi.map((x) => rec(state, x.pid, x.slot, true));
        const bench = pick.bench.map((pid) => rec(state, pid, null, false));
        return {
          id: clubId, club: state.clubs[clubId], home: isHome, form: pick.form,
          xi, bench, subsLeft: 5, red: 0, goals: 0, shots: 0, sot: 0, borrow: 0,
          day: Math.exp(rng.normal(0, BM.dayForm)), subPlan: [],
        };
      };
      const m = {
        ref: ref || null,
        live: !!opts.live,
        week: state.week,
        sides: [mkSide(home, pickH, true), mkSide(away, pickA, false)],
        phase: 'pre',
        min: 0,
        st1: rng.int(BM.stoppage1[0], BM.stoppage1[1]),
        st2: rng.int(BM.stoppage2[0], BM.stoppage2[1]),
        perMin: 90 + (BM.stoppage1[0] + BM.stoppage1[1] + BM.stoppage2[0] + BM.stoppage2[1]) / 2,
        mom: 0,
        events: [],
        pending: null,
        done: false,
        derby: state.clubs[home].rival === away,
        user: null,
        mode: opts.mode || 'auto',
      };
      m.sides.forEach((s) => {
        s.all = s.xi.concat(s.bench);
        const nSubs = Math.min(rng.int(BM.subsMin, BM.subsMax), s.bench.filter((x) => x.p.pos !== 'GK').length);
        for (let k = 0; k < nSubs; k++) s.subPlan.push(rng.int(BM.subFrom, BM.subTo));
        s.subPlan.sort((a, b) => a - b);
      });
      M.updateRates(m);
      // لاعبك في هذه المباراة؟
      const uTeam = FC.Game.userTeam(state);
      const si = uTeam === home ? 0 : uTeam === away ? 1 : -1;
      if (si >= 0) M.setupUser(state, m, si, rng);
      return m;
    },

    // حساب معدل الفرص والاستحواذ من القوة الحالية
    updateRates(m) {
      const BM = B().match;
      const [A, H] = [m.sides[0], m.sides[1]];
      A.str = strength(A);
      H.str = strength(H);
      const f = (x, y) => Math.exp((BM.strengthK * (x.att - y.def + BM.midK * (x.mid - y.mid))) / 10);
      A.rate = BM.chancesBase * f(A.str, H.str) * BM.homeMult * A.day;
      H.rate = BM.chancesBase * f(H.str, A.str) * BM.awayMult * H.day;
      A.poss = U.clamp(50 + (A.str.mid - H.str.mid) * BM.possMid + BM.possHome, 30, 70);
      H.poss = 100 - A.poss;
    },

    // تجهيز بيانات لاعبك داخل المباراة
    setupUser(state, m, si, rng) {
      const S = m.sides[si];
      const x = S.all.find((r) => r.pid === 0);
      const u = state.user;
      m.user = {
        si, x, role: x ? x.role : FC.Player.POS[u.pos].role,
        startFit: u.fit, fit: u.fit, rt: 0,
        kp: 0, pas: 0, pasOk: 0, drb: 0, tk: 0, int: 0, loss: 0, fouls: 0,
        used: 0, target: 0, natRate: 0, subOn: -1, onMin: -1,
        momentsOn: m.mode !== 'auto', state: 'none',
      };
      if (!x) {
        m.user.state = 'out';
        return;
      }
      if (x.start) {
        m.user.state = 'on';
        m.user.onMin = 0;
        M.planMoments(m, rng);
      } else {
        m.user.state = 'bench';
        // هل يُدخلك المدرب بديلاً؟
        const rank = S.bench.filter((b) => b.p.pos !== 'GK').indexOf(x);
        const chance = B().select.subOnChance * (rank <= 2 ? 1 : rank <= 5 ? 0.6 : 0.3);
        if (rng.chance(chance) && x.role !== 'GK') m.user.subOn = rng.int(60, 85);
      }
    },

    // عدد اللحظات المستهدف لك في هذه المباراة
    planMoments(m, rng) {
      const u = m.user;
      const BMo = B().moments;
      const role = u.x.role;
      const r = BMo.count[role];
      const remain = Math.max(0, 90 - m.min);
      u.target = (rng.int(r[0], r[1]) * remain) / 90;
      // المعدل الطبيعي للحظات القادمة من الفرص (مسدد أو صانع)
      const S = m.sides[u.si];
      const on = S.xi.filter((x) => x.on);
      const BM = B().match;
      let nat = 0;
      const tw = TYPES.reduce((s, t) => s + BM.types[t].w, 0);
      TYPES.forEach((t) => {
        const T = BM.types[t];
        if (t === 'pen') return;
        const shW = on.map((x) => (BM.shooterW[t][x.role] || 0) * Math.pow(finOf(x.p, t) / 70, BM.shooterAttrExp));
        const tot = U.sum(shW);
        const mine = shW[on.indexOf(u.x)] || 0;
        const shShare = tot ? mine / tot : 0;
        let asShare = 0;
        if (BM.assistW[t]) {
          const aW = on.map((x) => (BM.assistW[t][x.role] || 0) * Math.pow(astOf(x.p, t) / 70, BM.assistAttrExp));
          const at = U.sum(aW);
          asShare = at ? (aW[on.indexOf(u.x)] || 0) / at : 0;
        }
        const p = T.w / tw;
        if (PLAY_SHOT[t]) nat += p * shShare;
        if (PLAY_PASS[t]) nat += p * (1 - shShare) * T.ast * asShare;
      });
      u.natRate = (S.rate / m.perMin) * nat;
    },

    // تسمية الوقت: 45+2 أو 90+3
    clock(m) {
      if (m.phase === 'h1' || m.phase === 'ht') return m.min > 45 ? '45+' + (m.min - 45) : String(m.min);
      return m.min > 90 ? '90+' + (m.min - 90) : String(m.min);
    },

    // تقدم دقيقة واحدة (أو حدث انتقالي: البداية، الاستراحة، النهاية)
    step(state, m) {
      const ev = [];
      if (m.done || m.pending) return ev;
      const rng = FC.rngOf(state);
      const S0 = m.sides[0];
      const S1 = m.sides[1];
      const vars = () => ({ t: S0.club.short, o: S1.club.short, sc: S0.goals + ' - ' + S1.goals });
      if (m.phase === 'pre') {
        m.phase = 'h1';
        M.say(m, ev, rng, 'ko', 'kickoff', vars(), 1);
        return ev;
      }
      if (m.phase === 'h1' && m.min >= 45 + m.st1) {
        m.phase = 'ht';
        M.say(m, ev, rng, 'ht', 'halftime', vars(), 2);
        return ev;
      }
      if (m.phase === 'ht') {
        m.phase = 'h2';
        m.min = 45;
        M.say(m, ev, rng, 'info', 'secondHalf', vars(), 1);
        return ev;
      }
      if (m.phase === 'h2' && m.min >= 90 + m.st2) {
        m.phase = 'ft';
        m.done = true;
        const v = vars();
        if (S0.goals === S1.goals) M.say(m, ev, rng, 'ft', 'ftDraw', v, 2);
        else {
          const w = S0.goals > S1.goals ? S0 : S1;
          const l = w === S0 ? S1 : S0;
          M.say(m, ev, rng, 'ft', 'ftWin', { t: w.club.short, o: l.club.short, sc: v.sc }, 2);
        }
        return ev;
      }
      m.min++;
      M.minute(state, m, ev, rng);
      if (m.min === 45 && m.phase === 'h1') M.say(m, ev, rng, 'info', 'stoppage', { n: m.st1 }, 1);
      if (m.min === 90 && m.phase === 'h2') M.say(m, ev, rng, 'info', 'stoppage', { n: m.st2 }, 1);
      return ev;
    },

    // إضافة سطر تعليق (للمباراة الحية فقط)
    say(m, ev, rng, type, key, vars, imp, extra) {
      if (!m.live) return;
      const e = { min: M.clock(m), t: type, txt: FC.TXT.com(rng, key, vars), imp: imp || 1 };
      if (extra) Object.assign(e, extra);
      ev.push(e);
      m.events.push(e);
    },

    // منطق الدقيقة الواحدة
    minute(state, m, ev, rng) {
      const u = m.user;
      // تبديلات
      M.userSubs(state, m, ev, rng);
      m.sides.forEach((S, si) => M.aiSubs(state, m, si, ev, rng));
      // لياقتك
      if (u && u.state === 'on') {
        const sta = attr(state.user, 'sta');
        const BS = B().status;
        const drain = U.lerp(BS.fitMatchMax, BS.fitMatchMin, U.clamp((sta - 40) / 55, 0, 1));
        u.fit = Math.max(0, u.fit - drain / 90);
        M.userBackground(state, m, rng);
      }
      // البطاقات
      m.sides.forEach((S, si) => M.cards(state, m, si, ev, rng));
      // الفرص (بترتيب عشوائي)
      const order = rng.chance(0.5) ? [0, 1] : [1, 0];
      let happened = false;
      for (const si of order) {
        if (m.pending) break;
        if (M.tryChance(state, m, si, ev, rng)) happened = true;
      }
      // لحظات البناء
      if (!m.pending) M.tryBuild(state, m, ev, rng);
      // تعليق عام إذا لم يحدث شيء
      if (!happened && !m.pending && m.live && rng.chance(0.22)) {
        const si = rng.chance(m.sides[0].poss / 100) ? 0 : 1;
        const S = m.sides[si];
        const O = m.sides[1 - si];
        M.say(m, ev, rng, 'info', rng.chance(0.7) ? 'attack' : 'calm', { t: S.club.short, o: O.club.short }, 0);
      }
      m.mom *= 0.92;
    },

    // محاولة صنع فرصة لفريق
    tryChance(state, m, si, ev, rng) {
      const BM = B().match;
      const S = m.sides[si];
      const O = m.sides[1 - si];
      let p = S.rate / m.perMin;
      if (m.min >= BM.stateMinute) {
        const d = S.goals - O.goals;
        if (d > 0) p *= BM.leadMult;
        else if (d < 0) p *= BM.trailMult;
        else if (m.min >= BM.levelLateMinute) p *= BM.levelLateMult;
      }
      p *= Math.pow(BM.redCardSelf, S.red) * Math.pow(BM.redCardOpp, O.red);
      p *= 1 + (si === 0 ? m.mom : -m.mom) / 500;
      if (rng.next() >= p) return false;
      if (S.borrow > 0) {
        S.borrow--;
        return false;
      }
      const tw = TYPES.map((t) => BM.types[t].w);
      const type = TYPES[rng.weighted(tw)];
      const on = S.xi.filter((x) => x.on && x.role !== 'GK');
      if (!on.length) return false;
      const shooter = M.pickShooter(on, type, rng);
      let assister = null;
      if (BM.assistW[type] && rng.chance(BM.types[type].ast)) assister = M.pickAssister(on, shooter, type, rng);
      // لحظة لك؟
      const u = m.user;
      if (u && u.state === 'on' && u.si === si && u.momentsOn) {
        if (shooter.pid === 0 && M.canPlay(m, 'shot', type)) {
          M.makePending(state, m, 'shot', type, si, shooter, assister, rng);
          return true;
        }
        if (assister && assister.pid === 0 && M.canPlay(m, 'pass', type)) {
          M.makePending(state, m, 'pass', type, si, shooter, assister, rng);
          return true;
        }
      }
      M.resolveStat(state, m, si, type, shooter, assister, ev, rng);
      return true;
    },

    canPlay(m, kind, type) {
      const u = m.user;
      if (u.used >= B().moments.maxPerMatch) return false;
      if (m.mode === 'mixed' && type !== 'big') return false;
      return kind === 'shot' ? !!PLAY_SHOT[type] : !!PLAY_PASS[type];
    },

    // اختيار المسدد حسب المركز وسمات التسديد
    pickShooter(on, type, rng) {
      const BM = B().match;
      if (type === 'pen') {
        let best = on[0];
        on.forEach((x) => {
          if (attr(x.p, 'pen') + attr(x.p, 'cmp') * 0.3 > attr(best.p, 'pen') + attr(best.p, 'cmp') * 0.3) best = x;
        });
        return best;
      }
      const w = on.map((x) => (BM.shooterW[type][x.role] || 0.01) * Math.pow(finOf(x.p, type) / 70, BM.shooterAttrExp));
      return on[rng.weighted(w)];
    },

    pickAssister(on, shooter, type, rng) {
      const BM = B().match;
      const cands = on.filter((x) => x !== shooter);
      if (!cands.length) return null;
      const w = cands.map((x) => (BM.assistW[type][x.role] || 0.01) * Math.pow(astOf(x.p, type) / 70, BM.assistAttrExp));
      return cands[rng.weighted(w)];
    },

    // حسم الفرصة إحصائياً (للمحاكاة السريعة ولحظاتك التلقائية)
    resolveStat(state, m, si, type, shooter, assister, ev, rng) {
      const BM = B().match;
      const T = BM.types[type];
      const S = m.sides[si];
      const O = m.sides[1 - si];
      const gk = O.str.gkRec && O.str.gkRec.on ? O.str.gkRec : null;
      const gv = gk ? gkVal(gk.p) : 30;
      let conv = T.conv * Math.exp(BM.finK * (finOf(shooter.p, type) - 70)) * Math.exp(-BM.gkK * (gv - 70));
      if (shooter.pid === 0 && m.user) conv *= M.userForm(state, m);
      conv = U.clamp(conv, 0.005, 0.95);
      let out;
      if (rng.next() < conv) out = 'goal';
      else if (rng.next() < T.onT) out = 'saved';
      else out = rng.next() < BM.blockShare ? 'blocked' : 'off';
      M.applyShot(state, m, si, type, shooter, assister, out, ev, rng);
      return out;
    },

    // أثر معنوياتك ولياقتك على تحويل الفرص (±3%)
    userForm(state, m) {
      const u = state.user;
      const f = 1 + (B().match.moraleEffect * (u.morale - 65)) / 35;
      const fit = m.user ? m.user.fit : u.fit;
      return f * (fit < 60 ? 0.9 + fit / 600 : 1);
    },

    // تطبيق نتيجة تسديدة على المباراة والإحصائيات والتعليق
    applyShot(state, m, si, type, shooter, assister, out, ev, rng) {
      const BR = B().rating;
      const S = m.sides[si];
      const O = m.sides[1 - si];
      const gk = O.str.gkRec && O.str.gkRec.on ? O.str.gkRec : null;
      const u = m.user;
      S.shots++;
      shooter.sh++;
      const nm = (x) => (x.pid === 0 ? FC.Player.displayName(x.p) : x.p.ln);
      const v = { p: nm(shooter), t: S.club.short, o: O.club.short, gk: gk ? nm(gk) : 'الحارس' };
      if (out === 'goal' || out === 'saved') {
        S.sot++;
        shooter.sot++;
        if (shooter.pid === 0) u.rt += BR.shotOnTarget;
      }
      if (out === 'goal') {
        S.goals++;
        shooter.g++;
        if (shooter.pid === 0) u.rt += shooter.g === 1 ? BR.goal : BR.goalExtra;
        if (assister) {
          assister.a++;
          if (assister.pid === 0) u.rt += BR.assist;
        }
        m.mom += si === 0 ? 35 : -35;
        if (m.live) {
          const key = shooter.pid === 0 ? 'userGoal' : type === 'long' ? 'goalLong' : type === 'header' ? 'goalHeader' : type === 'pen' ? 'goalPen' : type === 'fk' ? 'goalFK' : 'goal';
          let txt = FC.TXT.com(rng, key, v);
          if (m.min >= 85) txt = FC.TXT.com(rng, 'goalLate', v) + ' ' + txt;
          if (assister) txt += ' ' + FC.TXT.com(rng, 'assistBy', { a: nm(assister) });
          const e = { min: M.clock(m), t: 'goal', si, txt, imp: 3, pid: shooter.pid, apid: assister ? assister.pid : null, sc: [m.sides[0].goals, m.sides[1].goals] };
          ev.push(e);
          m.events.push(e);
        }
      } else {
        m.mom += si === 0 ? 10 : -10;
        if (out === 'saved' && gk) {
          gk.sv++;
          if (type === 'big' || type === 'pen') gk.bsv++;
          if (gk.pid === 0) u.rt += type === 'big' || type === 'pen' ? BR.bigSave : BR.save;
        }
        if (type === 'pen' && shooter.pid === 0) u.rt += BR.penMiss;
        if (m.live) {
          let key;
          if (type === 'pen') key = out === 'saved' ? 'penSaved' : 'penMiss';
          else if (out === 'saved') key = type === 'big' ? 'bigSave' : 'save';
          else if (out === 'blocked') key = 'blocked';
          else key = type === 'big' ? 'missBig' : 'miss';
          M.say(m, ev, rng, 'chance', key, v, type === 'big' || type === 'pen' ? 2 : 1, { si });
        }
      }
    },

    // أحداث «غير مرئية» لك كل دقيقة حسب مركزك وسماتك
    userBackground(state, m, rng) {
      const u = m.user;
      const p = state.user;
      const BR = B().rating;
      const bg = BR.bg[u.x.role];
      const f = (k) => attr(p, k) / 70;
      const mood = M.userForm(state, m);
      const roll = (per90, q) => rng.next() < (per90 * q * mood) / 90;
      if (roll(bg.kp, f('vis') * f('spas'))) { u.kp++; u.rt += BR.keyPass; }
      if (roll(bg.drb, f('dri') * f('agi'))) { u.drb++; u.rt += BR.dribble; }
      if (roll(bg.tk, f('tak') * f('dawa'))) { u.tk++; u.rt += BR.tackle; }
      if (roll(bg.int, f('intc') * f('dawa'))) { u.int++; u.rt += BR.tackle; }
      if (rng.next() < (bg.loss * Math.pow(70 / attr(p, 'ctl'), 2)) / 90 / mood) { u.loss++; u.rt += BR.badLoss; }
      if (rng.next() < bg.fouls / 90) u.fouls++;
      const n = bg.pass / 90;
      const acc = U.clamp(0.6 + (attr(p, 'spas') - 60) * 0.006 + (attr(p, 'vis') - 60) * 0.002, 0.5, 0.95);
      u.pas += n;
      u.pasOk += n * acc;
    },

    // البطاقات
    cards(state, m, si, ev, rng) {
      const BM = B().match;
      const BR = B().rating;
      const S = m.sides[si];
      const pY = BM.yellowPerTeam / m.perMin;
      const pR = BM.redPerTeam / m.perMin;
      const r = rng.next();
      if (r >= pY + pR) return;
      const on = S.xi.filter((x) => x.on);
      const w = on.map((x) => (BM.cardW[x.role] || 1) * (0.6 + attr(x.p, 'agg') / 150) * (x.yc ? BM.bookedMult : 1));
      const x = on[rng.weighted(w)];
      const nm = x.pid === 0 ? FC.Player.displayName(x.p) : x.p.ln;
      const v = { p: nm, t: S.club.short };
      if (r < pY) {
        x.yc++;
        if (x.pid === 0) m.user.rt += BR.yellow;
        if (x.yc >= 2) {
          x.rc = 1;
          M.sendOff(m, S, x);
          M.say(m, ev, rng, 'card', 'secondYellow', v, 2, { card: 'r', si, pid: x.pid });
        } else M.say(m, ev, rng, 'card', 'yellow', v, 1, { card: 'y', si, pid: x.pid });
      } else {
        x.rc = 1;
        if (x.pid === 0) m.user.rt += BR.red;
        M.sendOff(m, S, x);
        M.say(m, ev, rng, 'card', 'red', v, 2, { card: 'r', si, pid: x.pid });
      }
    },

    sendOff(m, S, x) {
      x.on = false;
      x.out = m.min;
      S.red++;
      if (x.pid === 0 && m.user) m.user.state = 'off';
      M.updateRates(m);
    },

    // تبديلات فريق الذكاء الاصطناعي
    aiSubs(state, m, si, ev, rng) {
      const S = m.sides[si];
      while (S.subPlan.length && S.subPlan[0] <= m.min && m.phase === 'h2') {
        S.subPlan.shift();
        if (S.subsLeft <= 0) break;
        const outs = S.xi.filter((x) => x.on && x.role !== 'GK' && x.pid !== 0);
        const ins = S.bench.filter((x) => x.in < 0 && x.p.pos !== 'GK' && x.pid !== 0);
        if (!outs.length || !ins.length) break;
        const ow = outs.map((x) => ({ ST: 1.4, W: 1.4, CAM: 1.2, CM: 1, CDM: 0.8, FB: 0.7, CB: 0.5 }[x.role] || 1) * (x.p.age > 30 ? 1.3 : 1));
        const o = outs[rng.weighted(ow)];
        M.doSub(state, m, S, o, M.bestFor(ins, o.slot), ev, rng);
      }
    },

    // أفضل بديل لمركز معيّن
    bestFor(ins, slot) {
      let best = ins[0];
      let bs = -1;
      ins.forEach((x) => {
        const s = FC.Player.ovr(x.p) * FC.Select.fam(x.p.pos, slot);
        if (s > bs) {
          bs = s;
          best = x;
        }
      });
      return best;
    },

    // تنفيذ تبديل
    doSub(state, m, S, o, i, ev, rng) {
      o.on = false;
      o.out = m.min;
      i.on = true;
      i.in = m.min;
      i.slot = o.slot;
      i.role = o.role;
      i.eff = FC.Player.ovr(i.p) * FC.Select.fam(i.p.pos, i.slot);
      S.xi[S.xi.indexOf(o)] = i;
      S.subsLeft--;
      M.updateRates(m);
      const u = m.user;
      if (m.live) {
        const nm = (x) => (x.pid === 0 ? FC.Player.displayName(x.p) : x.p.ln);
        if (i.pid === 0) M.say(m, ev, rng, 'user', 'userSubOn', { a: nm(o) }, 2);
        else if (o.pid === 0) M.say(m, ev, rng, 'user', 'userSubOff', { p: nm(i) }, 2);
        else M.say(m, ev, rng, 'sub', 'sub', { t: S.club.short, p: nm(i), a: nm(o) }, 1);
      }
      if (u && i.pid === 0) {
        u.state = 'on';
        u.onMin = m.min;
        M.planMoments(m, rng);
      }
      if (u && o.pid === 0) u.state = 'off';
    },

    // دخولك بديلاً أو خروجك (تعب أو تقييم سيئ)
    userSubs(state, m, ev, rng) {
      const u = m.user;
      if (!u || m.phase !== 'h2') return;
      const S = m.sides[u.si];
      if (u.state === 'bench' && u.subOn > 0 && m.min >= u.subOn && S.subsLeft > 0) {
        const outs = S.xi.filter((x) => x.on && x.role !== 'GK' && (u.x.role === 'GK') === (x.role === 'GK'));
        if (outs.length) {
          // يخرج أضعف لاعب في المركز الأنسب لك
          const famU = (x) => FC.Select.fam(state.user.pos, x.slot);
          const top = Math.max.apply(null, outs.map(famU));
          const cand = outs.filter((x) => famU(x) >= top - 0.001).sort((a, b) => a.eff - b.eff)[0];
          M.doSub(state, m, S, cand, u.x, ev, rng);
          S.subPlan.pop();
        }
        u.subOn = -1;
      }
      if (u.state === 'on' && m.min >= 60 && S.subsLeft > 0 && !m.pending) {
        const rating = M.userRating(state, m, false);
        const tired = u.fit < 55;
        const bad = rating < 5.8;
        if ((tired || bad) && rng.chance(0.2)) {
          const ins = S.bench.filter((x) => x.in < 0 && x.p.pos !== 'GK');
          if (ins.length) {
            M.doSub(state, m, S, u.x, M.bestFor(ins, u.x.slot), ev, rng);
            S.subPlan.pop();
          }
        }
      }
    },

    // ============ اللحظات ============

    // اختيار زملاء وخصوم للحظة
    pickPeople(m, si, kind, scen, shooter) {
      const S = m.sides[si];
      const O = m.sides[1 - si];
      const pref = {
        attack: ['ST', 'W', 'CAM', 'CM', 'FB', 'CDM', 'CB'],
        deep: ['CM', 'CDM', 'FB', 'W', 'CB', 'CAM', 'ST'],
      }[scen === 'buildDeep' || scen === 'gkDist' ? 'deep' : 'attack'];
      let mates = S.xi.filter((x) => x.on && x.pid !== 0 && x.role !== 'GK');
      mates.sort((a, b) => pref.indexOf(a.role) - pref.indexOf(b.role));
      if (shooter && shooter.pid !== 0) mates = [shooter].concat(mates.filter((x) => x !== shooter));
      const nMates = { big: 1, oneOnOne: 1, boxShot: 2, longShot: 3, throughBall: 2, cutback: 2, build: 3, counter: 2, buildDeep: 3, gkDist: 3 }[scen] || 2;
      const dpref = scen === 'buildDeep' || scen === 'gkDist' ? ['ST', 'W', 'CAM', 'CM', 'CDM'] : ['CB', 'FB', 'CDM', 'CM', 'W'];
      const opps = O.xi.filter((x) => x.on && x.role !== 'GK').sort((a, b) => dpref.indexOf(a.role) - dpref.indexOf(b.role));
      const nOpps = { oneOnOne: 1, boxShot: 3, longShot: 4, throughBall: 3, cutback: 3, build: 4, counter: 2, buildDeep: 3, gkDist: 3 }[scen] || 3;
      const gk = O.xi.find((x) => x.on && x.role === 'GK');
      return { mates: mates.slice(0, nMates), opps: opps.slice(0, nOpps), gk };
    },

    // ملف مختصر لشخص في اللحظة
    person(x) {
      const a = {};
      FC.Player.KEYS.forEach((k) => (a[k] = attr(x.p, k)));
      return { pid: x.pid, name: x.pid === 0 ? FC.Player.displayName(x.p) : x.p.ln, num: x.pid === 0 ? x.p.num : x.p.num, pos: x.p.pos, role: x.role, attrs: a };
    },

    // إنشاء لحظة معلقة بانتظار اللعب
    makePending(state, m, kind, type, si, shooter, assister, rng) {
      const u = m.user;
      u.used++;
      let scen;
      if (kind === 'shot') scen = { big: 'oneOnOne', half: 'boxShot', long: 'longShot' }[type];
      else if (kind === 'pass') scen = type === 'big' ? 'throughBall' : u.x.role === 'W' || u.x.role === 'FB' ? 'cutback' : 'throughBall';
      else {
        const role = u.x.role;
        const opts = {
          GK: ['gkDist'], CB: ['buildDeep'], FB: ['buildDeep', 'build'], CDM: ['buildDeep', 'build'],
          CM: ['build', 'build', 'counter'], CAM: ['build', 'counter'], W: ['counter', 'build'], ST: ['counter', 'build'],
        }[role];
        scen = rng.pick(opts);
      }
      const people = M.pickPeople(m, si, kind, scen, kind === 'pass' ? shooter : null);
      const S = m.sides[si];
      const O = m.sides[1 - si];
      m.pending = {
        kind, type, scen, si,
        clock: M.clock(m),
        me: Object.assign(M.person(u.x), { foot: state.user.foot, wf: state.user.hid.wf, fit: u.fit, morale: state.user.morale }),
        mates: people.mates.map((x) => M.person(x)),
        opps: people.opps.map((x) => M.person(x)),
        gk: people.gk ? M.person(people.gk) : null,
        kit: { mine: [S.club.c1, S.club.c2], opp: [O.club.c1, O.club.c2] },
        diff: state.diff,
        derby: m.derby,
        score: [m.sides[0].goals, m.sides[1].goals],
        teams: [m.sides[0].club.short, m.sides[1].club.short],
        seed: rng.int(1, 2147483646),
        _shooter: shooter,
        _assister: assister,
        _mateRecs: people.mates,
        _gkRec: people.gk || null,
      };
    },

    // عدد اللحظات البنائية (تكمل العدد المستهدف حسب المركز)
    tryBuild(state, m, ev, rng) {
      const u = m.user;
      if (!u || u.state !== 'on' || !u.momentsOn || m.mode === 'mixed') return;
      if (u.used >= B().moments.maxPerMatch) return;
      const end = 90 + (m.phase === 'h2' ? m.st2 : 0);
      const remain = Math.max(1, end - m.min);
      const need = u.target - u.used - u.natRate * remain;
      if (need <= 0) return;
      if (rng.next() < Math.min(0.2, need / remain)) M.makePending(state, m, 'build', null, u.si, null, null, rng);
    },

    // حسم اللحظة المعلقة تلقائياً (وضع اللعب التلقائي أو التخطي)
    autoResolve(state, m) {
      const pd = m.pending;
      if (!pd) return [];
      const rng = FC.rngOf(state);
      const ev = [];
      m.pending = null;
      const u = m.user;
      const BR = B().rating;
      if (pd.kind === 'shot') M.resolveStat(state, m, pd.si, pd.type, pd._shooter, pd._assister, ev, rng);
      else if (pd.kind === 'pass') {
        u.kp++;
        u.rt += BR.keyPass;
        u.pas++;
        u.pasOk++;
        M.resolveStat(state, m, pd.si, pd.type, pd._shooter, pd._assister, ev, rng);
      } else {
        const r = rng.next();
        const S = m.sides[pd.si];
        const on = S.xi.filter((x) => x.on && x.pid !== 0 && x.role !== 'GK');
        u.pas++;
        if (r < 0.14 && u.x.role !== 'GK' && u.x.role !== 'CB') {
          S.borrow++;
          u.pasOk++;
          M.resolveStat(state, m, pd.si, 'long', u.x, null, ev, rng);
        } else if (r < 0.3 && on.length) {
          S.borrow++;
          u.pasOk++;
          u.kp++;
          u.rt += BR.keyPass;
          M.resolveStat(state, m, pd.si, 'half', M.pickShooter(on, 'half', rng), u.x, ev, rng);
        } else if (r < 0.8) {
          u.pasOk++;
        } else {
          u.loss++;
          u.rt += pd.scen === 'buildDeep' || pd.scen === 'gkDist' ? BR.badLoss : BR.loss;
        }
      }
      return ev;
    },

    // تطبيق نتيجة لحظة لعبتها على المباراة
    resolveMoment(state, m, res) {
      const pd = m.pending;
      if (!pd) return [];
      m.pending = null;
      const rng = FC.rngOf(state);
      const ev = [];
      const u = m.user;
      const BR = B().rating;
      const S = m.sides[pd.si];
      const O = m.sides[1 - pd.si];
      const st = res.stats || {};
      u.pas += st.pas || 0;
      u.pasOk += st.pasOk || 0;
      u.kp += st.kp || 0;
      u.rt += (st.kp || 0) * BR.keyPass;
      u.drb += st.drb || 0;
      u.rt += (st.drb || 0) * BR.dribble;
      u.loss += (st.loss || 0) + (st.badLoss || 0);
      u.rt += (st.loss || 0) * BR.loss + (st.badLoss || 0) * BR.badLoss;
      const nm = (x) => (x.pid === 0 ? FC.Player.displayName(x.p) : x.p.ln);
      const gk = O.str.gkRec && O.str.gkRec.on ? O.str.gkRec : null;
      if (res.shooter) {
        const type = pd.kind === 'shot' && res.shooter === 'user' ? pd.type : res.shotType || pd.type || 'half';
        const shooter = res.shooter === 'user' ? u.x : pd._mateRecs[res.mateIdx] || pd._shooter || u.x;
        let assister = null;
        if (res.shooter === 'mate' && res.lastPass === 'user') {
          assister = u.x;
          u.kp++;
          u.rt += BR.keyPass;
        } else if (res.shooter === 'user' && res.lastPass === 'mate' && res.passerIdx != null) assister = pd._mateRecs[res.passerIdx] || null;
        else if (res.shooter === 'user' && pd.kind === 'shot') assister = pd._assister;
        if (pd.kind === 'build') S.borrow++;
        const out = res.outcome === 'goal' ? 'goal' : res.outcome === 'saved' ? 'saved' : res.outcome === 'blocked' ? 'blocked' : 'off';
        const liveBefore = m.live;
        // التعليق الخاص بلحظتك
        m.live = false;
        M.applyShot(state, m, pd.si, type, shooter, assister, out, ev, rng);
        m.live = liveBefore;
        if (m.live) {
          const v = { p: nm(shooter), a: assister ? nm(assister) : '', gk: gk ? nm(gk) : 'الحارس', t: S.club.short };
          let key;
          if (out === 'goal') key = res.shooter === 'user' ? 'userGoal' : assister && assister.pid === 0 ? 'userAssist' : 'goal';
          else if (res.shooter === 'user') key = out === 'saved' ? 'userSaved' : out === 'blocked' ? 'userBlocked' : 'userMiss';
          else key = assister && assister.pid === 0 ? 'mateMiss' : out === 'saved' ? 'save' : 'miss';
          const txt = FC.TXT.com(rng, key, v);
          const e = { min: pd.clock, t: out === 'goal' ? 'goal' : 'user', si: pd.si, txt, imp: out === 'goal' ? 3 : 2, pid: shooter.pid, apid: assister ? assister.pid : null, sc: [m.sides[0].goals, m.sides[1].goals], moment: true };
          ev.push(e);
          m.events.push(e);
        }
      } else if (m.live) {
        const key = res.outcome === 'lost' ? 'userLost' : res.outcome === 'kept' ? 'userKept' : 'fizzle';
        const e = { min: pd.clock, t: 'user', si: pd.si, txt: FC.TXT.com(rng, key, {}), imp: 1, moment: true };
        ev.push(e);
        m.events.push(e);
      }
      return ev;
    },

    // ============ نهاية المباراة ============

    // تقييمك الحالي (مباشر) أو النهائي
    userRating(state, m, final) {
      const u = m.user;
      if (!u || !u.x) return 0;
      const BR = B().rating;
      let r = BR.start + BR.userBase + u.rt;
      if (final) {
        const S = m.sides[u.si];
        const O = m.sides[1 - u.si];
        const mins = M.minutes(m, u.x);
        const share = Math.min(1, mins / 90);
        const res = S.goals > O.goals ? BR.win : S.goals < O.goals ? BR.loss_ : 0;
        r += res * share;
        if (u.x.role === 'GK' || u.x.role === 'CB' || u.x.role === 'FB') {
          if (O.goals === 0 && mins >= 60) r += BR.cleanSheet;
          else r += BR.conceded * Math.max(0, O.goals - 1) * share;
        }
        const cons = state.user.hid.cons;
        r += FC.rngOf(state).normal(0, BR.noise * 0.45 * (1.3 - cons / 20));
      }
      return U.clamp(Math.round(r * 10) / 10, BR.min, BR.max);
    },

    minutes(m, x) {
      if (x.in < 0) return 0;
      const end = x.out >= 0 ? x.out : m.phase === 'ft' || m.done ? 90 + m.st2 : m.min;
      return Math.max(1, Math.min(90, end) - Math.min(90, x.in));
    },

    // تقييم لاعب ذكاء اصطناعي
    aiRating(m, S, O, x, avgEff, rng) {
      const BR = B().rating;
      const mins = M.minutes(m, x);
      const share = Math.min(1, mins / 90);
      let r = BR.start + BR.aiBase;
      r += (S.goals > O.goals ? BR.win : S.goals < O.goals ? BR.loss_ : 0) * share;
      if (x.g) r += BR.goal + (x.g - 1) * BR.goalExtra;
      r += x.a * BR.assist;
      if (x.role === 'GK' || x.role === 'CB' || x.role === 'FB') {
        if (O.goals === 0 && mins >= 60) r += BR.cleanSheet;
        else r += BR.conceded * Math.max(0, O.goals - 1) * share;
      }
      if (x.role === 'GK' && x.rtAdd == null) r += x.sv * BR.save + x.bsv * (BR.bigSave - BR.save);
      r += (x.eff - avgEff) * BR.quality;
      r += x.yc * BR.yellow + x.rc * BR.red;
      // أحداث المباراة الكاملة (إن لُعبت): تمريرات، افتكاك، تصديات… فتقل العشوائية
      if (x.rtAdd != null) r += x.rtAdd;
      r += rng.normal(0, BR.noise * (share < 0.35 ? 0.6 : 1) * (x.rtAdd != null ? 0.75 : 1));
      return U.clamp(Math.round(r * 10) / 10, BR.min, BR.max);
    },

    // إنهاء المباراة: التقييمات، الإحصائيات، الترتيب
    finish(state, m) {
      const rng = FC.rngOf(state);
      const out = { ratings: [], motm: null, score: [m.sides[0].goals, m.sides[1].goals] };
      let best = null;
      m.sides.forEach((S, si) => {
        const O = m.sides[1 - si];
        const played = S.all.filter((x) => x.in >= 0);
        const avgEff = U.avg(played.filter((x) => x.start), (x) => x.eff);
        played.forEach((x) => {
          const r = x.pid === 0 ? M.userRating(state, m, true) : M.aiRating(m, S, O, x, avgEff, rng);
          x.rt = r;
          if (!best || r > best.rt) best = x;
          out.ratings.push({ si, pid: x.pid, r });
          if (x.pid !== 0) {
            const p = x.p;
            p.sAp++;
            if (x.start) p.sSt++;
            p.sMn += M.minutes(m, x);
            p.sG += x.g;
            p.sA += x.a;
            p.sRs += r;
            p.sYc += x.yc;
            p.sRc += x.rc;
            p.cAp++;
            p.cG += x.g;
            p.cA += x.a;
            p.fm = U.round1(p.fm * 0.7 + r * 0.3);
          }
        });
      });
      out.motm = best ? best.pid : null;
      m.motm = best;
      if (m.ref) FC.Comp.record(state, m.ref.lg, m.ref.r, m.ref.i, m.sides[0].goals, m.sides[1].goals);
      return out;
    },

    // تشغيل المباراة حتى النهاية (مع حسم لحظاتك تلقائياً)
    run(state, m) {
      let guard = 0;
      while (!m.done && guard++ < 400) {
        if (m.pending) M.autoResolve(state, m);
        else M.step(state, m);
      }
    },

    // محاكاة سريعة كاملة لمباراة من جدول الدوري
    quick(state, ref) {
      const f = FC.Comp.fixture(state, ref);
      const m = M.create(state, f[0], f[1], ref, { live: false, mode: 'auto' });
      M.run(state, m);
      return { m, res: M.finish(state, m) };
    },
  });
})(globalThis);
