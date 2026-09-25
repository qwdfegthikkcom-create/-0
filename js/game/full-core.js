/* =========================================================
   المباراة الكاملة — تتحكم بلاعبك طوال المباراة (مثل «مهنة اللاعب»)
   المنطق فقط (بدون رسم) حتى يُختبر في Node:
   - 22 لاعباً بذكاء اصطناعي: تمركز حسب الخطة، ضغط، تغطية، انطلاقات خلف الدفاع
   - حامل الكرة يقرر: تمرير، بينية، عرضية، مراوغة، تسديد — حسب سماته والضغط
   - الحكم: أخطاء، بطاقات، ركلات حرة، جزاء، رميات تماس، ركنيات، ركلات مرمى، تسلل
   - الإحداثيات بالمتر: x طول الملعب 0–105، y عرضه 0–68
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC = G.FC || {};
  const U = FC.util;

  const L = 105;
  const W = 68;
  const GY = 34;
  const POST = 3.66;
  const BAR = 2.44;
  const BOX_D = 16.5;
  const BOX_W = 20.16;
  const hyp = Math.hypot;
  const BF = () => FC.BAL.full;
  const BM = () => FC.BAL.moments;
  const BR = () => FC.BAL.rating;
  const RT = () => FC.BAL.full.rt; // أوزان أحداث التقييم داخل المباراة الكاملة

  // ================= إحداثيات نسبية للفريق =================
  const goalX = (T) => (T.dir > 0 ? L : 0); // المرمى الذي يهاجمه الفريق
  const ownX = (T) => (T.dir > 0 ? 0 : L); // مرمى الفريق نفسه
  const along = (T, x) => (T.dir > 0 ? x / L : (L - x) / L); // 0 مرماه ← 1 مرمى الخصم
  const xAt = (T, a) => (T.dir > 0 ? a * L : L - a * L);
  const acr = (T, y) => (T.dir > 0 ? 1 - y / W : y / W); // 0 يسار الفريق ← 1 يمينه
  const yAt = (T, c) => (T.dir > 0 ? W * (1 - c) : W * c);
  const dist = (a, b) => hyp(a.x - b.x, a.y - b.y);
  function unit(x, y) {
    const d = hyp(x, y) || 1;
    return [x / d, y / d];
  }
  const inBox = (T, p) => Math.abs(p.x - ownX(T)) < BOX_D && Math.abs(p.y - GY) < BOX_W; // داخل منطقة جزاء الفريق T
  const other = (fm, T) => fm.teams[1 - T.si];

  // ================= الإنشاء =================

  // إنشاء مباراة كاملة من مباراة المحرك (FC.Match) — opts: {length, auto, startMin}
  function create(state, m, opts) {
    opts = opts || {};
    const startMin = opts.startMin || 0;
    const fm = {
      m, state,
      rng: new FC.RNG(FC.rngOf(state).int(1, 2147483646)),
      t: 0,
      sec: startMin * 60,
      half: startMin >= 45 ? 2 : 1,
      scale: 5400 / ((opts.length || BF().defaultLength) * 60),
      teams: [], all: [], user: null, auto: !!opts.auto, assist: opts.assist !== false,
      ball: { x: L / 2, y: GY, z: 0, vx: 0, vy: 0, vz: 0, spin: 0, owner: null, lastBy: null, kickT: -9, kind: null, passTarget: null, from: null },
      dead: null, pause: 0, over: false, shot: null, path: null, offside: null,
      lastPass: [null, null], lastTouch: null, feed: [], fx: [], userCall: 0, userOff: false,
      input: { dx: 0, dy: 0, mag: 0, sprint: false, press: false, idle: 0 }, charge: null, roleT: 0,
      banner: null, htDone: startMin >= 45,
    };
    fm.teams.push(makeTeam(fm, 0), makeTeam(fm, 1));
    setDirs(fm);
    fm.teams[0].score = m.sides[0].goals;
    fm.teams[1].score = m.sides[1].goals;
    placeKickoff(fm);
    setRestart(fm, 'kickoff', startMin >= 45 ? 1 : 0, L / 2, GY, 1.2);
    return fm;
  }

  function makeTeam(fm, si) {
    const S = fm.m.sides[si];
    const T = {
      si, S, club: S.club, form: S.form, dir: 1, score: 0, players: [],
      st: { sh: 0, sot: 0, pas: 0, pasOk: 0, fouls: 0, corners: 0, poss: 0, off: 0 },
    };
    const xy = FC.Select.XY[S.form];
    S.xi.forEach((rec, i) => {
      if (rec.on) T.players.push(makePlayer(fm, T, rec, xy[i] || [50, 50]));
    });
    return T;
  }

  function makePlayer(fm, T, rec, base) {
    const a = {};
    FC.Player.KEYS.forEach((k) => (a[k] = FC.Player.attr(rec.p, k)));
    const B = BF();
    const isUser = rec.pid === 0;
    const max = B.runBase + B.runK * (a.spd - 60) + 0.015 * (a.acc - 60);
    const e = {
      id: fm.all.length, si: T.si, T, rec, pid: rec.pid, p: rec.p,
      name: isUser ? FC.Player.displayName(rec.p) : rec.p.ln, num: rec.p.num,
      role: rec.role, isGK: rec.role === 'GK', isUser, a,
      fx: base[0] / 100, fy: base[1] / 100, x: L / 2, y: GY, vx: 0, vy: 0, face: 0,
      max: U.clamp(max, 4.6, 8.4), acc: U.clamp(9 + (a.acc - 60) * 0.1, 6.5, 13),
      sta: isUser ? U.clamp(fm.state.user.fit / 100, 0.3, 1) : U.clamp((rec.p.fit || 100) / 100, 0.6, 1),
      st: { pas: 0, pasOk: 0, sh: 0, sot: 0, g: 0, a: 0, kp: 0, drb: 0, tk: 0, int: 0, sv: 0, bsv: 0, fouls: 0, loss: 0, clr: 0, blk: 0, yc: 0, rc: 0 },
      rt: 0, cool: 0, down: 0, next: 0, tx: L / 2, ty: GY, mode: 'jog', run: null, hasT: 0, anim: 0,
      dive: null, hold: 0, slide: null, job: null, reactAt: 0, kpFrom: null, base0: { g: rec.g, a: rec.a, sh: rec.sh, sot: rec.sot, yc: rec.yc, rc: rec.rc, sv: rec.sv, bsv: rec.bsv },
    };
    fm.all.push(e);
    if (isUser) fm.user = e;
    return e;
  }

  // اتجاه الهجوم: صاحب الأرض يهاجم نحو x=105 في الشوط الأول
  function setDirs(fm) {
    const d = fm.half === 1 ? 1 : -1;
    fm.teams[0].dir = d;
    fm.teams[1].dir = -d;
  }

  // ================= الوقت =================
  function minuteOf(fm) {
    return Math.floor(fm.sec / 60);
  }
  function clock(fm) {
    const m = minuteOf(fm);
    if (fm.half === 1 && m >= 45) return '45+' + (m - 44);
    if (fm.half === 2 && m >= 90) return '90+' + (m - 89);
    return String(m + 1);
  }

  // ================= الحركة =================
  function speedOf(e, mode) {
    const B = BF();
    let s = e.max * (0.72 + 0.28 * e.sta);
    if (mode === 'jog') s *= B.jogMult;
    else if (mode === 'sprint') s *= B.sprintMult;
    else if (mode === 'walk') s *= 0.35;
    if (e.redMove) s *= 0.8;
    return s;
  }

  function move(fm, e, dt) {
    const b = fm.ball;
    if (e.down > 0) {
      e.down -= dt;
      e.vx *= 0.9;
      e.vy *= 0.9;
    } else {
      let max;
      if (e.mode === 'dive' && e.dive) max = e.dive.speed;
      else max = speedOf(e, e.mode);
      if (b.owner === e) max *= BF().dribbleMult * (e.mode === 'sprint' ? 1 : 1.05);
      if (e.slide) max = 7.5;
      const dx = e.tx - e.x;
      const dy = e.ty - e.y;
      const d = hyp(dx, dy);
      let wx = 0;
      let wy = 0;
      if (d > 0.12) {
        const want = Math.min(max, d * 3);
        wx = (dx / d) * want;
        wy = (dy / d) * want;
      }
      const ax = wx - e.vx;
      const ay = wy - e.vy;
      const am = hyp(ax, ay);
      const step = (e.mode === 'dive' ? 22 : e.acc) * dt;
      if (am > step) {
        e.vx += (ax / am) * step;
        e.vy += (ay / am) * step;
      } else {
        e.vx = wx;
        e.vy = wy;
      }
    }
    e.x = U.clamp(e.x + e.vx * dt, -3, L + 3);
    e.y = U.clamp(e.y + e.vy * dt, -3, W + 3);
    const sp = hyp(e.vx, e.vy);
    if (sp > 0.3) e.face = Math.atan2(e.vy, e.vx);
    e.anim += sp * dt;
    // اللياقة
    const B = BF();
    if (sp > e.max * 0.5) e.sta -= B.drain * dt * (e.mode === 'sprint' ? B.sprintDrain : 1) * (1.25 - e.a.sta / 200);
    else if (sp < 1.5) e.sta += B.recover * dt;
    e.sta = U.clamp(e.sta, 0.05, 1);
    if (b.owner === e) {
      b.x = e.x + Math.cos(e.face) * 0.55;
      b.y = e.y + Math.sin(e.face) * 0.55;
      b.z = 0;
      b.vx = e.vx;
      b.vy = e.vy;
      b.vz = 0;
    }
  }

  // ================= الركل =================
  function kick(fm, e, ang, v, vz, spin, kind) {
    const b = fm.ball;
    b.owner = null;
    b.x = e.x + Math.cos(ang) * 0.5;
    b.y = e.y + Math.sin(ang) * 0.5;
    b.z = 0.05;
    b.vx = Math.cos(ang) * v;
    b.vy = Math.sin(ang) * v;
    b.vz = vz;
    b.spin = spin || 0;
    b.lastBy = e;
    b.kickT = fm.t;
    b.kind = kind;
    b.from = { x: e.x, y: e.y };
    b.passTarget = null;
    fm.lastTouch = e;
    e.face = ang;
    fm.path = FC.Moment.predict(b, 3);
    fm.fx.push({ t: 'kick', x: b.x, y: b.y, kind });
    fm.all.forEach((o) => {
      if (o !== e) o.reactAt = fm.t + 0.15 + U.clamp((70 - o.a.rea) * 0.004, -0.08, 0.15);
    });
  }

  function pressure(fm, e) {
    let d = 99;
    other(fm, e.T).players.forEach((o) => {
      if (!o.isGK) d = Math.min(d, dist(o, e));
    });
    return d;
  }

  // تمريرة أرضية أو عالية نحو نقطة
  function passTo(fm, e, tx, ty, lofted, target, extraSigma, kindOverride) {
    const B = BM();
    const d = hyp(tx - e.x, ty - e.y);
    const a = e.a;
    const skill = lofted || d > 30 ? 0.6 * a.lpas + 0.25 * a.vis + 0.15 * a.cur : 0.6 * a.spas + 0.3 * a.vis + 0.1 * a.cmp;
    const pr = pressure(fm, e);
    let sig = 0.026 * Math.exp(-0.02 * (skill - 70)) * (1 + (pr < 2.5 ? (2.5 - pr) / 2.5 : 0) * 0.35) * (1 + (1 - e.sta) * 0.4) * (lofted ? 1.35 : 1);
    if (e.isUser) sig *= B.diffAim[fm.state.diff] || 1;
    if (extraSigma) sig = hyp(sig, extraSigma);
    const ang = Math.atan2(ty - e.y, tx - e.x) + fm.rng.normal(0, sig);
    let v;
    let vz = 0;
    if (lofted) {
      vz = U.clamp(4 + d * 0.16, 5, 11);
      const Tt = (2 * vz) / B.gravity;
      v = (d / Tt) * 1.03;
    } else v = U.clamp(Math.sqrt(64 + 2 * (B.friction + 0.5) * d), 9, 27);
    kick(fm, e, ang, v, vz, 0, kindOverride || (lofted ? 'lob' : 'pass'));
    fm.ball.passTarget = target || null;
    if (kindOverride !== 'clear') {
      e.st.pas++;
      e.T.st.pas++;
    }
    // لقطة التسلل لحظة التمرير
    fm.offside = kindOverride === 'throw' || kindOverride === 'corner' || kindOverride === 'gk' ? null : offsideSet(fm, e.T, e);
  }

  // الفريق المستحوذ: حامل الكرة، أو صاحب التمريرة التي في الهواء، أو آخر من سيطر
  const PASSY = { pass: 1, lob: 1, throw: 1, corner: 1, gk: 1, kick: 1 };
  function possSi(fm) {
    const b = fm.ball;
    if (b.owner) return b.owner.si;
    if (b.lastBy && PASSY[b.kind]) return b.lastBy.si;
    return fm.poss != null ? fm.poss : -1;
  }

  // من في موقع تسلل الآن؟
  function offsideSet(fm, T, passer) {
    const O = other(fm, T);
    const al = O.players.map((o) => along(T, o.x)).sort((a, b) => b - a);
    const line = Math.max(0.5, al[1] != null ? al[1] : 0.5, along(T, fm.ball.x));
    const ids = new Set();
    T.players.forEach((p) => {
      if (p !== passer && along(T, p.x) > line + 0.004) ids.add(p.id);
    });
    return { si: T.si, ids };
  }
  function offsideLine(fm, T) {
    const O = other(fm, T);
    const al = O.players.map((o) => along(T, o.x)).sort((a, b) => b - a);
    return Math.max(0.5, al[1] != null ? al[1] : 0.5);
  }

  // ================= التسديد =================
  function shotType(fm, e, d) {
    if (d > 18) return 'long';
    return d < 14 && pressure(fm, e) > 1.8 ? 'big' : 'half';
  }

  // تسديدة نحو المرمى: ty موضع الهدف عرضياً، power 0..1
  function shoot(fm, e, ty, power, lofted, extraSigma, type) {
    const B = BM();
    const T = e.T;
    const gx = goalX(T);
    const a = e.a;
    const dG = hyp(gx - e.x, GY - e.y);
    const skill = dG > 18 ? 0.55 * a.lng + 0.25 * a.pow + 0.2 * a.cmp : 0.6 * a.fin + 0.4 * a.cmp;
    let sig = B.aimSigma * Math.exp(-B.aimSkillK * (skill - 70));
    const pr = pressure(fm, e);
    sig *= 1 + (pr < 2.6 ? (2.6 - pr) / 2.2 : 0) * B.pressureK;
    sig *= 1 + (hyp(e.vx, e.vy) / e.max) * B.runningK;
    sig *= 1 + (1 - e.sta) * B.fatigueK;
    if (e.isUser) {
      sig *= B.diffAim[fm.state.diff] || 1;
      if (fm.rng.chance(B.weakFootChance)) sig *= 1 + (5 - (fm.state.user.hid.wf || 3)) * B.weakFootPenalty;
    }
    if (power > B.overPower) sig *= 1 + (power - B.overPower) * 3;
    if (dG > 16) sig *= 1 + (dG - 16) * 0.02;
    if (fm.t - (e.hasT || -9) < 0.45) sig *= 1.2;
    if (extraSigma) sig = hyp(sig, extraSigma);
    const ang = Math.atan2(ty - e.y, gx - e.x) + fm.rng.normal(0, sig);
    const vmax = B.shotSpeedMin + (B.shotSpeedMax - B.shotSpeedMin) * ((a.pow - 20) / 79);
    let v;
    let vz;
    if (lofted) {
      v = U.lerp(9, 17, power);
      const Tt = dG / (v * 0.9);
      vz = U.clamp((2.1 + (B.gravity * Tt * Tt) / 2) / Tt + fm.rng.normal(0, sig * 18), 3, 11);
    } else {
      v = U.lerp(9, vmax, power);
      const Tt = dG / (v * 0.93);
      let tz = 0.25 + power * power * 1.55 + Math.abs(fm.rng.normal(0, 0.25 + sig * 6));
      if (power > B.overPower) tz += (power - B.overPower) * 9;
      vz = Math.max(0, (tz + (B.gravity * Tt * Tt) / 2) / Tt);
    }
    kick(fm, e, ang, v, vz, fm.rng.normal(0, 0.8), 'shot');
    fm.shot = { by: e, T, active: true, t0: fm.t, type: type || shotType(fm, e, dG), gx };
    e.st.sh++;
    T.st.sh++;
    if (e.kpFrom && e.kpFrom.until > fm.t && e.kpFrom.by !== e) {
      e.kpFrom.by.st.kp++;
      e.kpFrom.by.rt += RT().keyPass;
      e.kpFrom = null;
    }
    resolveShot(fm);
    fm.feedShot = true;
  }

  // أين تعبر الكرة خط المرمى x = gx؟
  function crossingX(b, gx) {
    const c = { x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, vz: b.vz, spin: b.spin || 0 };
    const h = 1 / 240;
    let t = 0;
    while (t < 4) {
      const px = c.x;
      const py = c.y;
      const pz = c.z;
      FC.Moment.ballPhys(c, h);
      t += h;
      if ((gx > L / 2 && c.x >= gx) || (gx < L / 2 && c.x <= gx)) {
        const f = (gx - px) / (c.x - px || 1);
        return { y: py + (c.y - py) * f, z: pz + (c.z - pz) * f, t };
      }
      if (hyp(c.vx, c.vy) < 0.3 && c.z <= 0) return null;
    }
    return null;
  }

  function gkOf(T) {
    return T.players.find((p) => p.isGK) || null;
  }

  // حسم التسديدة لحظة ضربها (صد دفاعي، خارج المرمى، تصدي الحارس)
  function resolveShot(fm) {
    const B = BM();
    const sh = fm.shot;
    const b = fm.ball;
    const O = other(fm, sh.T);
    const F = BF();
    for (const o of O.players) {
      if (o.isGK || o.down > 0) continue;
      // أقرب نقطة يستطيع المدافع بلوغها على مسار الكرة
      let bestP = null;
      let bestM = 9;
      for (const p of fm.path) {
        if (p.t < 0.05 || p.z > 1.9) continue;
        if (Math.abs(p.x - sh.gx) < 0.5) break;
        const canMove = Math.min(0.6, Math.max(0, p.t - 0.15) * o.max * 0.5);
        const margin = dist(o, p) - 0.35 - canMove;
        if (margin < bestM) {
          bestM = margin;
          bestP = p;
        }
      }
      if (bestP && bestM <= F.blockReach) {
        const pr = F.blockBase * (0.6 + o.a.intc / 200) * (1 - Math.max(0, bestM) / (F.blockReach + 0.3));
        if (fm.rng.next() < pr) {
          sh.outcome = 'blocked';
          sh.blockAt = { t: bestP.t, by: o };
          return;
        }
      }
    }
    const cr = crossingX(b, sh.gx);
    const gk = gkOf(O);
    if (!cr) {
      sh.outcome = gk ? 'saved' : 'off';
      sh.weak = true;
      sh.saveT = 1.3;
      return;
    }
    sh.cross = cr;
    const onTarget = Math.abs(cr.y - GY) < POST - 0.11 && cr.z < BAR - 0.11 && cr.z >= 0;
    if (!onTarget) {
      sh.outcome = 'off';
      return;
    }
    if (!gk) {
      sh.outcome = 'goal';
      return;
    }
    // حارسك بدون مساعدة: أنت من يرتمي. مع المساعدة: تصدٍّ تلقائي حسب تمركزك وسماتك
    if (gk.isUser && !fm.auto && !fm.assist) {
      sh.outcome = 'live';
      return;
    }
    const ga = gk.a;
    let pg = null;
    for (const p of fm.path) {
      if ((sh.gx > L / 2 && p.x >= gk.x - 0.1) || (sh.gx < L / 2 && p.x <= gk.x + 0.1)) {
        pg = p;
        break;
      }
    }
    if (!pg) pg = { t: cr.t, x: sh.gx, y: cr.y, z: cr.z };
    const userSide = fm.m.user ? fm.m.user.si : -1;
    const react = U.clamp(B.gkReact - B.gkReactK * (ga.gref - 70), 0.18, 0.4) + (B.diffReact[fm.state.diff] || 0) * (sh.T.si === userSide ? 1 : 0);
    const speed = B.gkDive * F.gkDiveMult * U.clamp(1 + F.gkDiveK * (ga.gdiv - 70), 0.6, 1.3);
    let reach = B.gkReach + F.gkReachAdd + U.clamp((ga.gpos - 70) / 220, -0.15, 0.12);
    if (pg.z > 1.85) reach -= B.gkHighPenalty * (pg.z > 2.2 ? 1.4 : 1);
    if (pg.z > 2.7) reach = -1;
    const lateral = Math.abs(pg.y - gk.y);
    const covered = Math.max(0, pg.t - react) * speed;
    let pSave = 0;
    if (reach > 0) {
      if (lateral <= reach * 0.6) pSave = 0.96;
      else if (lateral <= reach + covered) {
        const slack = reach + covered - lateral;
        pSave = B.gkHold * (B.gkCloseCall + (1 - B.gkCloseCall) * U.clamp(slack / B.gkSlack, 0, 1));
      }
    }
    pSave *= 0.93 + ga.ghan / 1400;
    // معايرة المباراة الكاملة: الحارس ينقذ جزءاً من الكرات التي يصعب وصوله إليها هندسياً
    pSave = 1 - (1 - pSave) * F.goalK * U.clamp(1 - (((ga.gref + ga.gdiv) / 2) - 60) / 250, 0.8, 1.15);
    if (globalThis.__gkdbg) globalThis.__gkdbg({ react, speed, reach, lateral, covered, pSave, pg, gk: { x: gk.x, y: gk.y, a: ga }, sh });
    if (fm.rng.next() < pSave) {
      sh.outcome = 'saved';
      sh.saveT = pg.t;
      sh.catch = fm.rng.chance(0.35 + ga.ghan / 300);
    } else sh.outcome = 'goal';
    const ty = sh.outcome === 'saved' ? pg.y : pg.y - Math.sign(pg.y - gk.y) * Math.max(0.2, lateral - reach - covered);
    gk.dive = { at: fm.t + react, ty, speed, until: fm.t + react + 0.9 };
  }

  // تقدم التسديدة المحسومة
  function shotProgress(fm) {
    const sh = fm.shot;
    if (!sh || !sh.active) return;
    const b = fm.ball;
    const el = fm.t - sh.t0;
    const O = other(fm, sh.T);
    const gk = gkOf(O);
    if (sh.outcome === 'blocked' && el >= sh.blockAt.t) {
      sh.active = false;
      const a = Math.atan2(b.vy, b.vx) + Math.PI + fm.rng.normal(0, 1.0);
      const sp = hyp(b.vx, b.vy) * 0.3;
      b.vx = Math.cos(a) * sp;
      b.vy = Math.sin(a) * sp;
      b.vz = Math.abs(b.vz) * 0.3;
      sh.blockAt.by.st.blk++;
      sh.blockAt.by.rt += RT().block;
      if (fm.rng.chance(BF().blockOut)) {
        say(fm, 'blocked', { p: sh.by.name, t: sh.T.club.short }, 1);
        return setRestart(fm, 'corner', sh.T.si, sh.gx === 0 ? 0.3 : L - 0.3, b.y < GY ? 0.3 : W - 0.3);
      }
      fm.lastTouch = sh.blockAt.by;
      b.lastBy = sh.blockAt.by;
      b.kickT = fm.t;
      fm.path = FC.Moment.predict(b, 2);
      fm.fx.push({ t: 'block', x: b.x, y: b.y });
      say(fm, 'blocked', { p: sh.by.name, t: sh.T.club.short }, 1);
      return;
    }
    if (sh.outcome === 'saved' && el >= sh.saveT) return doSave(fm, sh, gk, !!(sh.catch || sh.weak));
    if (sh.outcome === 'live' && gk) {
      // حارسك: هل تصل يداك للكرة؟
      const nearPlane = Math.abs(b.x - gk.x) < 0.45;
      if (nearPlane && b.z < 2.35) {
        const lateral = Math.abs(b.y - gk.y);
        const diving = gk.dive && fm.t < gk.dive.until;
        const reach = (diving ? 1.45 : 0.8) + (gk.a.gdiv - 70) / 200;
        if (lateral < reach) {
          const pHold = U.clamp(0.55 + gk.a.ghan / 250 - hyp(b.vx, b.vy) / 90, 0.3, 0.92);
          return doSave(fm, sh, gk, fm.rng.chance(pHold));
        }
      }
    }
    if (el > 4) sh.active = false;
  }

  function doSave(fm, sh, gk, caught) {
    const b = fm.ball;
    sh.active = false;
    if (!gk) return;
    sh.T.st.sot++;
    sh.by.st.sot++;
    sh.by.rt += RT().sot;
    gk.st.sv++;
    const big = sh.type === 'big' || sh.type === 'pen';
    if (big) gk.st.bsv++;
    gk.rt += big ? RT().bigSave : RT().save;
    fm.lastTouch = gk;
    fm.fx.push({ t: 'save', x: b.x, y: b.y });
    say(fm, big ? 'bigSave' : 'save', { p: sh.by.name, gk: gk.name }, big ? 2 : 1);
    if (caught) {
      giveBall(fm, gk);
      gk.hold = fm.t + 1.3;
    } else if (fm.rng.chance(BF().parryOut)) {
      // الحارس يبعدها إلى ركنية
      const gx = sh.gx;
      setRestart(fm, 'corner', sh.T.si, gx === 0 ? 0.3 : L - 0.3, b.y < GY ? 0.3 : W - 0.3);
    } else {
      const dirIn = sh.T.dir > 0 ? -1 : 1; // نحو الملعب
      const a = Math.atan2(fm.rng.normal(0, 1), dirIn) + fm.rng.normal(0, 0.6);
      const sp = hyp(b.vx, b.vy) * 0.35 + 2;
      b.vx = Math.cos(a) * sp;
      b.vy = Math.sin(a) * sp;
      b.vz = 2;
      b.lastBy = gk;
      b.kickT = fm.t;
      b.kind = 'parry';
      fm.path = FC.Moment.predict(b, 2);
    }
  }

  // ================= الاستلام والقطع =================
  function giveBall(fm, e) {
    const b = fm.ball;
    b.owner = e;
    b.passTarget = null;
    b.z = 0;
    b.vz = 0;
    e.hasT = fm.t;
    e.next = fm.t + (pressure(fm, e) < 2 ? 0.12 : 0.28 + fm.rng.float(0, 0.3));
    fm.lastTouch = e;
    fm.poss = e.si;
  }

  function contacts(fm) {
    const b = fm.ball;
    if (b.owner || (fm.shot && fm.shot.active) || fm.dead) return;
    let best = null;
    let bd = 1e9;
    for (const e of fm.all) {
      if (e.down > 0 && !e.slide) continue;
      if (b.lastBy === e && fm.t - b.kickT < 0.3) continue;
      if (e.noTouch && fm.t < e.noTouch) continue;
      const gkHands = e.isGK && inBox(e.T, b);
      const reach = gkHands ? 1.5 : e.slide ? 1.3 : 0.95;
      const zMax = gkHands ? 2.7 : 2.25;
      const d = hyp(e.x - b.x, e.y - b.y);
      if (d < reach && b.z < zMax && d < bd) {
        bd = d;
        best = e;
      }
    }
    if (!best) return;
    let e = best;
    // صراع هوائي: كل من يستطيع القفز للكرة العالية
    if (b.z > 1.25) {
      const rivals = fm.all.filter((o) => !o.off && o.down <= 0 && o.si !== e.si && !(o.isGK && inBox(o.T, b)) && hyp(o.x - b.x, o.y - b.y) < 1.7);
      if (rivals.length && !(e.isGK && inBox(e.T, b))) {
        const air = (o) => 0.4 * o.a.hea + 0.4 * o.a.jmp + 0.2 * o.a.str + (o.p.ht - 180) * 0.8 + fm.rng.normal(0, 12) - hyp(o.x - b.x, o.y - b.y) * 6;
        let top = e;
        let ts = air(e);
        rivals.forEach((o) => {
          const v = air(o);
          if (v > ts) {
            ts = v;
            top = o;
          }
        });
        e = top;
      }
    }
    const kicker = b.lastBy;
    const sp = hyp(b.vx, b.vy);
    const sameTeam = kicker && kicker.si === e.si;
    // التسلل
    if (sameTeam && fm.offside && fm.offside.si === e.si && fm.offside.ids.has(e.id) && (b.kind === 'pass' || b.kind === 'lob')) {
      fm.offside = null;
      e.T.st.off++;
      say(fm, 'offside', { p: e.name, t: e.T.club.short }, 1);
      return setRestart(fm, 'fk', 1 - e.si, e.x, e.y);
    }
    fm.offside = null;
    // الحارس يمسك الكرة في منطقته
    if (e.isGK && inBox(e.T, b)) {
      if (!sameTeam && kicker) {
        kicker.st.loss++;
      }
      giveBall(fm, e);
      e.hold = fm.t + 1.1;
      return;
    }
    // كرة عالية: رأسية، أو ترويض بالصدر إذا كانت تمريرة من زميل خارج منطقة الخصم
    if (b.z > 1.25) {
      if (b.z > 2.25) return;
      const attackBox = hyp(goalX(e.T) - e.x, GY - e.y) < 17;
      if (!(sameTeam && !attackBox && PASSY[b.kind])) return header(fm, e);
      if (fm.rng.chance(0.12 + (70 - e.a.ctl) / 300)) {
        // ترويض سيئ: الكرة ترتد
        e.noTouch = fm.t + 0.4;
        b.vx *= 0.3;
        b.vy *= 0.3;
        b.vz = 1.2;
        b.lastBy = e;
        fm.lastTouch = e;
        fm.path = FC.Moment.predict(b, 2);
        return;
      }
    }
    if (!sameTeam && kicker) {
      // محاولة قطع
      const pInt = U.clamp(BM().interceptBase + (e.a.intc - 60) / 140 - Math.max(0, sp - 14) * 0.02, 0.2, 0.95);
      if (fm.rng.next() < pInt || sp < 6) {
        if (b.kind === 'pass' || b.kind === 'lob') {
          e.st.int++;
          e.rt += RT().intercept;
          kicker.st.loss++;
          kicker.rt += along(kicker.T, kicker.x) < 0.33 ? RT().badLoss : RT().loss;
        }
        giveBall(fm, e);
      } else {
        e.noTouch = fm.t + 0.5;
        const a = Math.atan2(b.vy, b.vx) + fm.rng.normal(0, 0.7);
        b.vx = Math.cos(a) * sp * 0.55;
        b.vy = Math.sin(a) * sp * 0.55;
        b.lastBy = e;
        fm.lastTouch = e;
        fm.path = FC.Moment.predict(b, 2);
      }
      return;
    }
    // استلام من زميل
    if (sp > 17 + e.a.ctl / 12 && fm.rng.chance(0.4)) {
      e.noTouch = fm.t + 0.35;
      b.vx *= 0.5;
      b.vy *= 0.5;
      b.lastBy = e;
      fm.path = FC.Moment.predict(b, 2);
      return;
    }
    if (sameTeam && kicker !== e && (b.kind === 'pass' || b.kind === 'lob' || b.kind === 'throw' || b.kind === 'corner' || b.kind === 'gk')) {
      kicker.st.pasOk++;
      kicker.T.st.pasOk++;
      kicker.rt += RT().pass;
      fm.lastPass[e.si] = { by: kicker, t: fm.t };
      e.kpFrom = { by: kicker, until: fm.t + 3.5 };
    }
    giveBall(fm, e);
  }

  // رأسية: تسديدة في منطقة الخصم أو إبعاد في منطقتك
  function header(fm, e) {
    const b = fm.ball;
    const T = e.T;
    const kicker = b.lastBy;
    if (kicker && kicker.si === e.si && kicker !== e) {
      kicker.st.pasOk++;
      fm.lastPass[e.si] = { by: kicker, t: fm.t };
      e.kpFrom = { by: kicker, until: fm.t + 2 };
    }
    fm.offside = null;
    const dG = hyp(goalX(T) - e.x, GY - e.y);
    const a = e.a;
    fm.fx.push({ t: 'header', x: e.x, y: e.y });
    if (dG < 15 && along(T, e.x) > 0.8) {
      // رأسية نحو المرمى
      const gk = gkOf(other(fm, T));
      let side = gk ? (gk.y <= GY ? 1 : -1) : 1;
      if (e.isUser && !fm.auto && Math.abs(fm.input.dy) > 0.2) side = fm.input.dy > 0 ? 1 : -1;
      const ty = GY + side * (POST - 0.8);
      const sig = 0.09 * Math.exp(-0.02 * (0.7 * a.hea + 0.3 * a.jmp - 70));
      const ang = Math.atan2(ty - e.y, goalX(T) - e.x) + fm.rng.normal(0, sig);
      const v = 11 + a.hea / 12;
      b.owner = null;
      b.x = e.x;
      b.y = e.y;
      b.z = 1.9;
      b.vx = Math.cos(ang) * v;
      b.vy = Math.sin(ang) * v;
      b.vz = -1 + fm.rng.normal(0, 1.2);
      b.lastBy = e;
      b.kickT = fm.t;
      b.kind = 'shot';
      fm.lastTouch = e;
      fm.path = FC.Moment.predict(b, 3);
      fm.shot = { by: e, T, active: true, t0: fm.t, type: 'header', gx: goalX(T) };
      e.st.sh++;
      T.st.sh++;
      if (e.kpFrom && e.kpFrom.by !== e) {
        e.kpFrom.by.st.kp++;
        e.kpFrom.by.rt += RT().keyPass;
        e.kpFrom = null;
      }
      resolveShot(fm);
      return;
    }
    // إبعاد أو تمريرة بالرأس
    const tgtX = xAt(T, U.clamp(along(T, e.x) + 0.25, 0, 0.95));
    const ang = Math.atan2(fm.rng.normal(0, 12) + (e.y < GY ? -6 : 6), tgtX - e.x);
    b.owner = null;
    b.z = 1.9;
    b.vx = Math.cos(ang) * 13;
    b.vy = Math.sin(ang) * 13;
    b.vz = 3;
    b.lastBy = e;
    b.kickT = fm.t;
    b.kind = 'clear';
    fm.lastTouch = e;
    fm.path = FC.Moment.predict(b, 3);
    if (inBox(T, e)) {
      e.st.clr++;
      e.rt += RT().clear;
    }
  }

  // ================= الافتكاك والأخطاء =================
  function tryTackle(fm, d, slide) {
    const b = fm.ball;
    const o = b.owner;
    const B = BF();
    if (!o || o.si === d.si || d.cool > fm.t) return false;
    const range = slide ? 1.25 : B.tackleRange;
    if (dist(d, o) > range) return false;
    if (fm.t - (o.hasT || 0) < 0.2 && !slide) return false;
    d.cool = fm.t + B.tackleCool;
    const def = 0.5 * (slide ? d.a.sld : d.a.tak) + 0.3 * d.a.dawa + 0.2 * d.a.str;
    const att = 0.4 * o.a.dri + 0.3 * o.a.ctl + 0.2 * o.a.bal + 0.1 * o.a.str;
    // من الخلف؟
    const toD = Math.atan2(d.y - o.y, d.x - o.x);
    const behind = Math.cos(toD - o.face) < -0.3;
    let pFoul = B.foulBase + (slide ? B.foulSlide : 0) + (behind ? B.foulBehind : 0) + (d.a.agg - 60) / 500 - (d.a.dawa - 60) / 600;
    if (inBox(d.T, o)) pFoul *= B.boxCare; // المدافع أحذر داخل منطقته
    let pWin = (slide ? B.slideBase : B.tackleBase) * Math.exp(0.035 * (def - att)) * (behind ? 0.72 : 1);
    if (o.isUser && !fm.auto) pWin *= 1 - (BM().diffReact[fm.state.diff] || 0) * 2;
    if (d.isUser && !fm.auto) pWin *= 1 + (BM().diffReact[fm.state.diff] || 0) * 2;
    pFoul = U.clamp(pFoul, 0.02, 0.5);
    if (fm.rng.next() < pFoul) {
      foul(fm, d, o);
      return true;
    }
    if (fm.rng.next() < U.clamp(pWin, 0.05, 0.9)) {
      d.st.tk++;
      d.rt += RT().tackle;
      o.st.loss++;
      o.rt += along(o.T, o.x) < 0.33 ? RT().badLoss : RT().loss;
      fm.fx.push({ t: 'tackle', x: o.x, y: o.y });
      if (slide) {
        const b2 = fm.ball;
        b2.owner = null;
        const a = d.face + fm.rng.normal(0, 0.5);
        b2.vx = Math.cos(a) * 6;
        b2.vy = Math.sin(a) * 6;
        b2.lastBy = d;
        b2.kickT = fm.t;
        b2.kind = 'tackle';
        fm.lastTouch = d;
        fm.path = FC.Moment.predict(b2, 2);
      } else giveBall(fm, d);
      return true;
    }
    o.st.drb++;
    o.rt += RT().dribble;
    fm.fx.push({ t: 'dodge', x: o.x, y: o.y });
    if (slide) d.down = BF().slideDown;
    return false;
  }

  // خطأ: ركلة حرة أو جزاء + بطاقة محتملة
  function foul(fm, d, o) {
    const B = BF();
    if (fm.rng.chance(B.foulInjury * (d.slide ? 2 : 1)) && FC.Status) injure(fm, o);
    d.st.fouls++;
    d.T.st.fouls++;
    d.rt += RT().foul;
    fm.fx.push({ t: 'foul', x: o.x, y: o.y });
    const r = fm.rng.next();
    const hard = d.slide || d.a.agg > 75 ? 1.4 : 1;
    const inPen = inBox(d.T, o);
    if (r < B.redOfFoul * hard) sendOff(fm, d, 'red');
    else if (r < (B.yellowOfFoul + (inPen ? 0.1 : 0)) * hard) {
      d.st.yc++;
      d.rt += BR().yellow;
      if (d.base0.yc + d.st.yc >= 2) sendOff(fm, d, 'second');
      else say(fm, 'yellow', { p: d.name, t: d.T.club.short }, 1, { card: 'y', si: d.si, pid: d.pid });
    }
    if (inPen) setRestart(fm, 'pen', o.si, goalX(o.T) - o.T.dir * 11, GY);
    else setRestart(fm, 'fk', o.si, o.x, o.y);
  }

  function sendOff(fm, d, how) {
    d.st.rc = 1;
    d.rt += BR().red;
    say(fm, how === 'second' ? 'secondYellow' : 'red', { p: d.name, t: d.T.club.short }, 2, { card: 'r', si: d.si, pid: d.pid });
    const T = d.T;
    T.players.splice(T.players.indexOf(d), 1);
    d.off = true;
    d.rec.on = false;
    d.rec.out = minuteOf(fm);
    T.S.red++;
    if (fm.ball.owner === d) fm.ball.owner = null;
    if (d.isUser) fm.userOff = 'red';
  }

  // ================= الكرات الثابتة =================
  function setRestart(fm, type, si, x, y, delay) {
    const b = fm.ball;
    b.owner = null;
    b.vx = b.vy = b.vz = 0;
    b.z = 0;
    b.x = U.clamp(x, 0, L);
    b.y = U.clamp(y, 0, W);
    b.passTarget = null;
    if (fm.shot) fm.shot.active = false;
    fm.offside = null;
    const T = fm.teams[si];
    const d = { type, si, x: b.x, y: b.y, at: fm.t + (delay != null ? delay : BF().restartDelay), taker: null, wall: [] };
    fm.dead = d;
    fm.all.forEach((e) => {
      e.run = null;
      e.slide = null;
      e.dive = null;
    });
    // من ينفذ؟
    const pool = T.players.filter((e) => !e.isGK);
    const best = (f) => pool.slice().sort((a, b2) => f(b2) - f(a))[0];
    if (type === 'goalkick') d.taker = gkOf(T) || pool[0];
    else if (type === 'pen') d.taker = best((e) => e.a.pen + e.a.cmp * 0.3);
    else if (type === 'corner') d.taker = best((e) => e.a.cro + e.a.cur * 0.5);
    else if (type === 'fk') {
      const dG = hyp(goalX(T) - b.x, GY - b.y);
      d.direct = dG < 30 && Math.abs(b.y - GY) < 17;
      d.taker = d.direct ? best((e) => e.a.cur + e.a.lng) : pool.slice().sort((a, b2) => dist(a, b) - dist(b2, b))[0];
      if (d.direct) {
        // الجدار: 3–4 مدافعين على بعد 9.15م
        const O = other(fm, T);
        const g = { x: ownX(O), y: GY };
        const u = unit(g.x - b.x, g.y - b.y);
        const n = dG < 22 ? 4 : 3;
        const wallers = O.players.filter((e) => !e.isGK).sort((a, b2) => dist(a, b) - dist(b2, b)).slice(0, n);
        wallers.forEach((w, i) => {
          const off = (i - (n - 1) / 2) * 0.7;
          d.wall.push({ e: w, x: b.x + u[0] * 9.15 - u[1] * off, y: b.y + u[1] * 9.15 + u[0] * off });
        });
      }
    } else if (type === 'kickoff') {
      const fw = pool.slice().sort((a, b2) => b2.fy - a.fy);
      d.taker = fw[0];
      b.x = L / 2;
      b.y = GY;
    } else d.taker = pool.slice().sort((a, b2) => dist(a, b) - dist(b2, b))[0];
    if (type === 'corner') T.st.corners++;
    if (type === 'pen') say(fm, 'penalty', { t: T.club.short }, 2);
  }

  // مواقع اللاعبين أثناء الكرة الثابتة
  function restartTarget(fm, e) {
    const d = fm.dead;
    const b = fm.ball;
    const T = e.T;
    const atk = e.si === d.si;
    if (d.taker === e) {
      const g = { x: goalX(T), y: GY };
      const u = unit(g.x - b.x, g.y - b.y);
      e.tx = b.x - u[0] * 0.8;
      e.ty = b.y - u[1] * 0.8;
      if (d.type === 'throw') {
        e.tx = b.x;
        e.ty = b.y < 1 ? -0.4 : W + 0.4;
      }
      e.mode = 'run';
      return;
    }
    const w = d.wall.find((q) => q.e === e);
    if (w) {
      e.tx = w.x;
      e.ty = w.y;
      e.mode = 'run';
      return;
    }
    if (e.isGK) {
      const gx = ownX(T);
      if (d.type === 'pen' && !atk) {
        e.tx = gx;
        e.ty = GY;
      } else {
        const u = unit(b.x - gx, b.y - GY);
        e.tx = gx + u[0] * 1;
        e.ty = GY + u[1] * 1;
      }
      e.mode = 'run';
      return;
    }
    if (d.type === 'kickoff') {
      const s = shapeTarget(fm, e, atk, { x: L / 2, y: GY });
      let a = Math.min(along(T, s.x), 0.47);
      e.tx = xAt(T, a);
      e.ty = s.y;
      if (!atk && hyp(e.tx - L / 2, e.ty - GY) < 9.5) e.tx = xAt(T, 0.4);
      e.mode = 'jog';
      return;
    }
    if (d.type === 'pen') {
      const A = fm.teams[d.si];
      const gx = goalX(A);
      const i = T.players.indexOf(e);
      e.tx = gx - A.dir * (18 + (i % 3));
      e.ty = GY + ((i % 7) - 3) * 4.5;
      e.mode = 'jog';
      return;
    }
    if (d.type === 'corner') {
      const A = fm.teams[d.si];
      const gx = goalX(A);
      const dir = A.dir;
      const side = b.y < GY ? -1 : 1;
      const spots = [[5, 3 * side], [6, -2 * side], [11, 0], [8, -5 * side], [13, 5 * side], [17, -3 * side]];
      const order = T.players.filter((p) => !p.isGK && p !== d.taker).sort((a, b2) => b2.a.hea + b2.p.ht / 10 - (a.a.hea + a.p.ht / 10));
      const idx = order.indexOf(e);
      if (atk) {
        if (idx >= 0 && idx < 5) {
          e.tx = gx - dir * spots[idx][0];
          e.ty = GY + spots[idx][1];
        } else {
          e.tx = gx - dir * (28 + idx * 3);
          e.ty = GY + (idx % 2 ? 10 : -10);
        }
      } else if (idx >= 0 && idx < 7) {
        const def = [[2, 2.5 * side], [3, -1], [6, 3 * side], [6, -3 * side], [10, 0], [12, 4 * side], [16, -2]];
        e.tx = gx - dir * def[idx][0];
        e.ty = GY + def[idx][1];
      } else {
        e.tx = gx - dir * 34;
        e.ty = GY;
      }
      e.mode = 'run';
      return;
    }
    const s = shapeTarget(fm, e, atk, b);
    e.tx = s.x;
    e.ty = s.y;
    e.mode = 'jog';
    // لا تقف فوق الكرة إذا كانت للخصم
    if (!atk && dist({ x: e.tx, y: e.ty }, b) < 9.15) {
      const u = unit(e.tx - b.x, e.ty - b.y);
      e.tx = b.x + u[0] * 9.2;
      e.ty = b.y + u[1] * 9.2;
    }
  }

  // تنفيذ الكرة الثابتة
  function execRestart(fm) {
    const d = fm.dead;
    const t = d.taker;
    const b = fm.ball;
    const T = fm.teams[d.si];
    if (!t || t.off) {
      fm.dead = null;
      return;
    }
    // انتظر وصول المنفذ (بحد أقصى)
    if (dist(t, b) > 1.6 && fm.t < d.at + 2.5) return;
    if (d.type === 'pen' && t.isUser && !fm.auto) {
      // جزاؤك: انتظر أمر التسديد
      if (!d.userWait) {
        d.userWait = fm.t;
        fm.banner = { txt: 'ركلة جزاء! اختر الزاوية بالاتجاه ثم سدد', until: fm.t + 3 };
      }
      if (fm.t - d.userWait < 8) return;
    }
    const gkUser = d.type === 'pen' && gkOf(other(fm, T)) && gkOf(other(fm, T)).isUser && !fm.auto;
    if (gkUser && !d.gkWait) {
      d.gkWait = fm.t;
      fm.banner = { txt: 'ركلة جزاء ضدك! اختر جهة الارتماء واضغط «ارتماء»', until: fm.t + 3 };
    }
    if (gkUser && fm.t - d.gkWait < 1.8) return;
    fm.dead = null;
    t.x = b.x - (t.x - b.x) * 0;
    switch (d.type) {
      case 'kickoff': {
        const mates = T.players.filter((e) => e !== t && !e.isGK).sort((a, b2) => dist(a, b) - dist(b2, b));
        giveBall(fm, t);
        const m = mates[0];
        if (m) passTo(fm, t, m.x, m.y, false, m, 0, 'kick');
        break;
      }
      case 'throw': {
        const mates = T.players.filter((e) => e !== t && !e.isGK && dist(e, b) < 22).sort((a, b2) => pressure(fm, b2) - pressure(fm, a));
        const m = mates[0] || T.players.find((e) => e !== t);
        giveBall(fm, t);
        passTo(fm, t, m.x + m.vx * 0.4, m.y + m.vy * 0.4, false, m, 0.03, 'throw');
        fm.ball.z = 1.6;
        fm.ball.vz = 2;
        break;
      }
      case 'goalkick': {
        giveBall(fm, t);
        t.hold = fm.t;
        gkDistribute(fm, t, true);
        break;
      }
      case 'corner': {
        const A = T;
        const box = A.players.filter((e) => e !== t && Math.abs(e.x - goalX(A)) < 18 && Math.abs(e.y - GY) < 18);
        const target = box.sort((a, b2) => b2.a.hea - a.a.hea)[Math.floor(fm.rng.next() * Math.min(3, box.length))] || null;
        giveBall(fm, t);
        const tx = target ? target.x : goalX(A) - A.dir * 7;
        const ty = target ? target.y : GY;
        passTo(fm, t, tx, ty, true, target, 0.02, 'corner');
        say(fm, 'corner', { t: A.club.short }, 1);
        break;
      }
      case 'fk': {
        giveBall(fm, t);
        if (d.direct) {
          if (t.isUser && !fm.auto) {
            // ركلتك الحرة: تنتظر زر التسديد (مع حد زمني)
            fm.userFK = { until: fm.t + 7 };
            fm.banner = { txt: 'ركلة حرة مباشرة! صوّب واضغط «تسديد»', until: fm.t + 3 };
            return;
          }
          const gk = gkOf(other(fm, T));
          const side = gk ? (gk.y <= GY ? 1 : -1) : 1;
          freeKickShot(fm, t, GY + side * (POST - 0.7), 0.7);
        } else carrierDecide(fm, t, true);
        break;
      }
      case 'pen': {
        giveBall(fm, t);
        if (t.isUser && !fm.auto) {
          const aim = fm.input.mag > 0.25 ? (penSideFromInput(fm, t)) : 0;
          penaltyKick(fm, t, aim, 0.8);
        } else penaltyKick(fm, t, [-1, 1, 1, -1, 0][fm.rng.int(0, 4)], 0.75 + fm.rng.float(0, 0.15));
        break;
      }
      default:
        fm.dead = null;
    }
  }

  // اتجاه الجزاء من الذراع: -1 يسار الحارس، 1 يمينه، 0 الوسط
  function penSideFromInput(fm, t) {
    const T = t.T;
    // المحور العرضي بالنسبة لاتجاه الهجوم
    const lat = T.dir > 0 ? fm.input.dy : -fm.input.dy;
    return Math.abs(lat) < 0.3 ? 0 : lat > 0 ? 1 : -1;
  }

  // ركلة الجزاء: side -1/0/1 (عرضياً بالنسبة لمحور y)
  function penaltyKick(fm, t, side, power) {
    const T = t.T;
    const O = other(fm, T);
    const gk = gkOf(O);
    const gx = goalX(T);
    const B = BF();
    const ty = GY + (T.dir > 0 ? side : -side) * 2.6;
    // تخمين الحارس
    let guess;
    if (gk && gk.isUser && !fm.auto) guess = fm.gkPenGuess != null ? fm.gkPenGuess : 99;
    else guess = [-1, 0, 1][fm.rng.weighted([0.42, 0.16, 0.42])];
    const guessY = guess === 99 ? null : GY + (T.dir > 0 ? guess : -guess) * 2.4;
    // الدقة
    const a = t.a;
    let conv = B.penConv * Math.exp(0.012 * (0.75 * a.pen + 0.25 * a.cmp - 70));
    if (gk) conv *= Math.exp(-0.01 * ((gk.a.gdiv + gk.a.gref) / 2 - 70));
    const offT = fm.rng.chance(0.07 * (1 + (70 - a.pen) / 60));
    const sameSide = guessY != null && Math.abs(guessY - ty) < 1.6;
    let outcome;
    if (offT) outcome = 'off';
    else if (sameSide) outcome = fm.rng.chance(t.isUser || (gk && gk.isUser) ? 0.62 : U.clamp(1 - conv, 0.1, 0.5) * 2.2) ? 'saved' : 'goal';
    else outcome = fm.rng.chance(t.isUser || (gk && gk.isUser) ? 0.04 : U.clamp((1 - conv) * 0.25, 0.01, 0.2)) ? 'saved' : 'goal';
    const angBase = Math.atan2((offT ? ty + (fm.rng.chance(0.5) ? 1.8 : -1.8) : ty) - t.y, gx - t.x);
    const v = 18 + power * 8;
    const dG = hyp(gx - t.x, GY - t.y);
    const Tt = dG / (v * 0.95);
    const tz = offT && fm.rng.chance(0.5) ? 3 : 0.4 + fm.rng.float(0, 1.3);
    kick(fm, t, angBase, v, Math.max(0, (tz + (BM().gravity * Tt * Tt) / 2) / Tt), 0, 'shot');
    fm.shot = { by: t, T, active: true, t0: fm.t, type: 'pen', gx, outcome, pen: true };
    t.st.sh++;
    T.st.sh++;
    if (gk) {
      const dy = guessY != null ? guessY : gk.y;
      gk.dive = { at: fm.t + 0.12, ty: dy, speed: 7, until: fm.t + 1 };
      if (outcome === 'saved') {
        fm.shot.saveT = Tt * 0.92;
        fm.shot.catch = false;
      }
    }
  }

  // ركلة حرة مباشرة: فوق الجدار مع انحناء
  function freeKickShot(fm, t, ty, power) {
    const a = t.a;
    const T = t.T;
    shoot(fm, t, ty, power, false, 0.02 * Math.exp(-0.02 * (a.cur - 70)), 'fk');
    // انحناء + ارتفاع فوق الجدار
    const b = fm.ball;
    b.spin = (b.y > ty ? 1 : -1) * (1 + a.cur / 60) * (T.dir > 0 ? 1 : -1) * 0.8;
    b.vz = Math.max(b.vz, 3.8 + fm.rng.float(0, 0.8));
    fm.path = FC.Moment.predict(b, 3);
    resolveShot(fm);
  }

  // ================= الذكاء الاصطناعي =================

  // موقع اللاعب في الخطة حسب مكان الكرة والاستحواذ
  function shapeTarget(fm, e, inPoss, ballPos) {
    const T = e.T;
    const b = ballPos || fm.ball;
    const bA = along(T, b.x);
    const bC = acr(T, b.y);
    let center;
    let spread;
    const B = BF();
    if (inPoss) {
      center = U.clamp(bA + B.shapePush, 0.36, 0.78);
      spread = 0.62;
    } else {
      center = U.clamp(bA - 0.1, 0.2, 0.6);
      spread = 0.46;
    }
    let a = center + (e.fy - 0.5) * spread;
    let c = 0.5 + (e.fx - 0.5) * (inPoss ? 1.08 : 0.78) + (bC - 0.5) * (inPoss ? 0.22 : 0.38);
    if (inPoss && e.fy > 0.6) a = Math.min(a, offsideLine(fm, T) - 0.012);
    a = U.clamp(a, 0.04, 0.96);
    c = U.clamp(c, 0.04, 0.96);
    let x = xAt(T, a);
    let y = yAt(T, c);
    // الرقابة: المدافع يقترب من المهاجم القريب من منطقته
    if (!inPoss && e.fy < 0.6) {
      const O = other(fm, T);
      let near = null;
      let nd = 9;
      O.players.forEach((o) => {
        if (o.isGK || o === fm.ball.owner) return;
        const d = hyp(o.x - x, o.y - y);
        if (d < nd) {
          nd = d;
          near = o;
        }
      });
      if (near) {
        const g = ownX(T);
        const u = unit(g - near.x, GY - near.y);
        x = x * 0.4 + (near.x + u[0] * 1.6) * 0.6;
        y = y * 0.4 + (near.y + u[1] * 1.6) * 0.6;
      }
    }
    return { x: U.clamp(x, 1, L - 1), y: U.clamp(y, 1, W - 1) };
  }

  // نقطة اعتراض الكرة المتحركة
  function interceptPoint(fm, e) {
    const b = fm.ball;
    if (!fm.path || hyp(b.vx, b.vy) < 0.5) return { x: b.x, y: b.y, t: dist(e, b) / e.max };
    const dt0 = fm.t - b.kickT;
    for (const p of fm.path) {
      if (p.t < dt0) continue;
      if (p.z > (e.isGK ? 2.6 : 2.1)) continue;
      const need = dist(e, p) / (e.max * 1.1) + 0.12;
      if (need <= p.t - dt0 + 0.05) return { x: p.x, y: p.y, t: p.t - dt0 };
    }
    const last = fm.path[fm.path.length - 1];
    return last ? { x: last.x, y: last.y, t: 3 } : { x: b.x, y: b.y, t: 3 };
  }

  // توزيع الأدوار كل 0.1 ثانية: من يطارد الكرة الحرة، من يضغط، من يغطي
  function assignJobs(fm) {
    const b = fm.ball;
    fm.all.forEach((e) => (e.job = null));
    if (fm.dead) return;
    if (!b.owner) {
      fm.teams.forEach((T) => {
        let best = null;
        let bt = 1e9;
        T.players.forEach((e) => {
          if (e.down > 0) return;
          if (e.isGK && !inBox(T, b)) return;
          const ip = interceptPoint(fm, e);
          const t = dist(e, ip) / e.max;
          if (t < bt) {
            bt = t;
            best = e;
          }
        });
        if (best) best.job = 'chase';
      });
      if (b.passTarget && !b.passTarget.off) b.passTarget.job = 'chase';
    } else {
      const c = b.owner;
      const O = other(fm, c.T);
      const list = O.players.filter((e) => !e.isGK && e.down <= 0).sort((p, q) => dist(p, c) - dist(q, c));
      if (list[0] && dist(list[0], c) < BF().pressRange) list[0].job = 'press';
      if (list[1] && dist(list[1], c) < 15) list[1].job = 'cover';
    }
  }

  // هدف حركة لاعب بدون كرة
  function aiTarget(fm, e) {
    const b = fm.ball;
    const T = e.T;
    if (e.down > 0) {
      e.tx = e.x;
      e.ty = e.y;
      return;
    }
    if (fm.dead) return restartTarget(fm, e);
    if (e.isGK) return gkThink(fm, e);
    if (fm.t < e.reactAt) return;
    if (e.job === 'chase') {
      const ip = interceptPoint(fm, e);
      e.tx = ip.x;
      e.ty = ip.y;
      e.mode = 'sprint';
      return;
    }
    const own = b.owner && b.owner.si === e.si;
    if (b.owner && !own) {
      const c = b.owner;
      const g = ownX(T);
      const u = unit(g - c.x, GY - c.y);
      if (e.job === 'press') {
        e.tx = c.x + u[0] * 0.8;
        e.ty = c.y + u[1] * 0.8;
        e.mode = dist(e, c) > 5 ? 'sprint' : 'run';
        return;
      }
      if (e.job === 'cover') {
        e.tx = c.x + u[0] * 5;
        e.ty = c.y + u[1] * 5;
        e.mode = 'run';
        return;
      }
    }
    const s = shapeTarget(fm, e, possSi(fm) === e.si);
    e.tx = s.x;
    e.ty = s.y;
    const far = hyp(e.tx - e.x, e.ty - e.y);
    e.mode = far > 10 ? 'run' : far > 3 ? 'jog' : 'walk';
    // انطلاقات خلف الدفاع
    if (own && b.owner !== e && !e.isGK) {
      if (e.run && fm.t > e.run.until) e.run = null;
      const oa = along(T, b.owner.x);
      if (!e.run && e.fy > 0.6 && oa > 0.3 && oa < 0.88 && fm.rng.next() < BF().runChance / 10) {
        const line = offsideLine(fm, T);
        if (Math.abs(along(T, e.x) - line) < 0.08) e.run = { until: fm.t + 2.3, x: xAt(T, Math.min(0.95, line + 0.16)), y: U.clamp(e.y + fm.rng.normal(0, 6), 6, W - 6) };
      }
      if (e.run) {
        e.tx = e.run.x;
        e.ty = e.run.y;
        e.mode = 'sprint';
      }
      // دعم حامل الكرة إذا كان تحت ضغط
      if (!e.run && dist(e, b.owner) < 22 && pressure(fm, b.owner) < 3 && e.fy > 0.3) {
        const c = b.owner;
        const side = e.y > c.y ? 1 : -1;
        e.tx = e.tx * 0.5 + (c.x - T.dir * 4) * 0.5;
        e.ty = e.ty * 0.5 + (c.y + side * 9) * 0.5;
      }
    }
  }

  // الحارس: يغلق الزاوية، يخرج للانفراد، يمسك الكرات في منطقته
  function gkThink(fm, e) {
    const b = fm.ball;
    const T = e.T;
    const gx = ownX(T);
    if (e.dive && fm.t < e.dive.until) {
      if (fm.t >= e.dive.at) {
        e.tx = e.x;
        e.ty = e.dive.ty;
        e.mode = 'dive';
      }
      return;
    }
    e.dive = null;
    if (b.owner === e) return;
    if (!b.owner && e.job === 'chase' && inBox(T, b)) {
      const ip = interceptPoint(fm, e);
      e.tx = ip.x;
      e.ty = ip.y;
      e.mode = 'sprint';
      return;
    }
    const src = b.owner || b;
    const dG = hyp(src.x - gx, src.y - GY);
    let d = U.clamp(0.8 + dG * 0.06, 0.8, 4);
    if (b.owner && b.owner.si !== e.si && dG < 18) {
      const blocked = T.players.some((o) => !o.isGK && Math.abs(along(T, o.x)) < along(T, b.owner.x) && hyp(o.x - b.owner.x, o.y - b.owner.y) < 7);
      if (!blocked) d = U.clamp(dG * 0.42, 1, 7);
    }
    const u = unit(src.x - gx, src.y - GY);
    e.tx = gx + u[0] * d;
    e.ty = GY + u[1] * d;
    e.mode = 'run';
  }

  // توزيع الحارس للكرة
  function gkDistribute(fm, e, kickOnly) {
    const T = e.T;
    const mates = T.players.filter((p) => p !== e);
    const safe = mates.filter((p) => pressure(fm, p) > 6 && dist(p, e) < 28 && along(T, p.x) < 0.4);
    if (!kickOnly && safe.length && fm.rng.chance(0.6)) {
      const m = safe[Math.floor(fm.rng.next() * safe.length)];
      passTo(fm, e, m.x, m.y, false, m, 0.02, 'gk');
    } else {
      const fw = mates.filter((p) => p.fy > 0.55);
      const m = fw[Math.floor(fm.rng.next() * fw.length)] || mates[0];
      passTo(fm, e, m.x, m.y, true, m, 0.05, 'gk');
    }
    e.hold = 0;
  }

  // هامش أمان ممر التمرير (ثوانٍ)
  function laneMargin(fm, from, to, O) {
    const d = hyp(to.x - from.x, to.y - from.y) || 1;
    const v = 13;
    let min = 9;
    for (const o of O.players) {
      const t = U.clamp(((o.x - from.x) * (to.x - from.x) + (o.y - from.y) * (to.y - from.y)) / (d * d), 0, 1);
      const px = from.x + (to.x - from.x) * t;
      const py = from.y + (to.y - from.y) * t;
      const tb = (t * d) / v;
      const td = Math.max(0, hyp(o.x - px, o.y - py) - 0.9) / o.max + 0.25;
      min = Math.min(min, td - tb);
    }
    return min;
  }

  // قيمة موقع في الملعب للفريق المهاجم (كلما اقترب من المرمى ومن العمق زادت)
  function threat(T, x, y) {
    const a = along(T, x);
    const c = Math.abs(y - GY) / GY;
    return a * a * (1 - 0.35 * c * a);
  }

  // أفضل تمريرة: {m, x, y, s, lofted, through}
  function bestPass(fm, e, dirPref) {
    const T = e.T;
    const O = other(fm, T);
    const B = BF();
    const aE = along(T, e.x);
    const tE = threat(T, e.x, e.y);
    let best = null;
    const call = fm.userCall > fm.t && fm.user && fm.user.si === e.si ? fm.user : null;
    const score = (m, tx, ty, lane, lofted, through) => {
      const d = hyp(tx - e.x, ty - e.y);
      const prog = along(T, tx) - aE;
      let s = (threat(T, tx, ty) - tE) * B.passFwd + Math.min(pressure(fm, m), 8) * 0.07 + U.clamp(lane, -0.3, 0.8) * 0.8;
      if (prog < 0) s += prog * B.passBack;
      s -= Math.max(0, d - 32) * 0.03 + (lofted ? 0.4 : 0);
      if (through) s += 0.25;
      if (m.isGK) s -= 1.5;
      if (m.run) s += 0.3;
      if (m === call) s += 2;
      if (m.isUser && !fm.auto) s += B.userPassBias;
      if (dirPref) {
        const cos = ((tx - e.x) * dirPref[0] + (ty - e.y) * dirPref[1]) / (d || 1);
        s += cos * 3;
        if (cos < 0.35) s -= 3;
      }
      return s + fm.rng.normal(0, 0.12 * (1.4 - e.a.vis / 100));
    };
    T.players.forEach((m) => {
      if (m === e || m.off) return;
      const tx = m.x + m.vx * 0.45;
      const ty = m.y + m.vy * 0.45;
      const d = hyp(tx - e.x, ty - e.y);
      if (d < 4 || d > 50) return;
      const lane = laneMargin(fm, e, { x: tx, y: ty }, O);
      const lofted = lane < 0.05 && d > 18;
      if (lane < -0.1 && !lofted) return;
      const s = score(m, tx, ty, lofted ? 0.2 : lane, lofted, false);
      if (!best || s > best.s) best = { m, x: tx, y: ty, s, lofted, through: false };
      // بينية لمنطلق
      if (m.run || (m.fy > 0.55 && along(T, m.x) > offsideLine(fm, T) - 0.06)) {
        const tx2 = U.clamp(m.x + T.dir * 8, 2, L - 2);
        const ty2 = U.clamp(m.y + m.vy * 0.8, 3, W - 3);
        const lane2 = laneMargin(fm, e, { x: tx2, y: ty2 }, O);
        if (lane2 > 0.05 && hyp(tx2 - e.x, ty2 - e.y) < 45) {
          const s2 = score(m, tx2, ty2, lane2, false, true);
          if (s2 > best.s) best = { m, x: tx2, y: ty2, s: s2, lofted: false, through: true };
        }
      }
    });
    return best;
  }

  // المساحة أمام حامل الكرة (أقرب خصم لنقطة أمامه بـ 6م)
  function spaceAhead(fm, e) {
    const T = e.T;
    const O = other(fm, T);
    const ang = Math.atan2(GY - e.y, goalX(T) - e.x);
    const px = e.x + Math.cos(ang) * 6;
    const py = e.y + Math.sin(ang) * 6;
    let d = 99;
    O.players.forEach((o) => (d = Math.min(d, hyp(o.x - px, o.y - py))));
    return d;
  }

  // قرار حامل الكرة (الذكاء الاصطناعي)
  function carrierDecide(fm, e, forced) {
    const T = e.T;
    const O = other(fm, T);
    const B = BF();
    if (e.isGK) {
      if (fm.t < e.hold && !forced) return;
      return gkDistribute(fm, e, false);
    }
    if (fm.t < e.next && !forced) return;
    const pr = pressure(fm, e);
    e.next = fm.t + fm.rng.float(B.decide[0], B.decide[1]) * (pr < 2.5 ? 0.6 : 1);
    const gx = goalX(T);
    const dG = hyp(gx - e.x, GY - e.y);
    const aE = along(T, e.x);
    const a = e.a;
    // 1) التسديد
    const ang = Math.abs(Math.atan2(e.y - GY, Math.abs(gx - e.x)));
    if (dG < B.shootMaxDist && ang < 1.1 && aE > 0.6) {
      let q = Math.exp(-(dG - 10) / 9) * Math.pow(Math.cos(ang), 1.3) * (0.6 + (dG > 18 ? a.lng : a.fin) / 160);
      if (dG < 13) q *= 1.8;
      if (pr < 1.2) q *= 0.8;
      if (fm.rng.next() < q * B.shootWill || (dG < 10 && ang < 0.8)) {
        const gk = gkOf(O);
        const side = gk ? (gk.y <= GY ? 1 : -1) : 1;
        const low = fm.rng.chance(B.aiLowShot);
        return shoot(fm, e, GY + side * (POST - 0.55 - fm.rng.float(0, 1.0)), U.clamp((low ? 0.5 : 0.72) + fm.rng.float(0, 0.14) + (dG > 18 ? 0.06 : 0), 0, 0.9), false, B.aiShotNoise);
      }
    }
    // 2) العرضية من الطرف
    const c = acr(T, e.y);
    if (aE > 0.78 && (c < 0.22 || c > 0.78) && fm.rng.chance(B.crossWill)) {
      const box = T.players.filter((m) => m !== e && Math.abs(m.x - gx) < 16 && Math.abs(m.y - GY) < 13);
      if (box.length) {
        const m = box[Math.floor(fm.rng.next() * box.length)];
        return passTo(fm, e, m.x + m.vx * 0.3 + T.dir * 1.5, m.y, true, m, 0.03);
      }
    }
    // 3) التمرير أو الاستمرار بالكرة
    const bp = bestPass(fm, e);
    const sp = spaceAhead(fm, e);
    let carry = B.carryBase + Math.min(sp, 10) * B.carrySpace + (a.dri - 65) / 70 - (pr < 2 ? 0.5 : 0);
    if (aE > 0.8) carry -= 0.25;
    if (e.hasT && fm.t - e.hasT > 3) carry -= (fm.t - e.hasT - 3) * 0.5;
    // تحت ضغط شديد في ثلثك الأول: إبعاد
    if (pr < 1.3 && aE < 0.25 && (!bp || bp.s < 0)) {
      const tx = xAt(T, 0.6);
      return passTo(fm, e, tx, U.clamp(e.y + fm.rng.normal(0, 14), 5, W - 5), true, null, 0.08, 'clear');
    }
    if (bp && bp.s > carry) return passTo(fm, e, bp.x, bp.y, bp.lofted, bp.m, 0);
  }

  // اتجاه المراوغة: نحو المرمى مع تجنب المدافعين
  function dribbleTarget(fm, e) {
    const T = e.T;
    const O = other(fm, T);
    const gx = goalX(T);
    const base = Math.atan2(GY - e.y, gx - e.x);
    let best = base;
    let bs = -1e9;
    for (let k = -3; k <= 3; k++) {
      const a = base + k * 0.35;
      const px = e.x + Math.cos(a) * 4;
      const py = e.y + Math.sin(a) * 4;
      if (px < 1 || px > L - 1 || py < 1 || py > W - 1) continue;
      let clr = 99;
      O.players.forEach((o) => (clr = Math.min(clr, hyp(o.x - px, o.y - py))));
      const s = Math.min(clr, 6) - Math.abs(k) * 0.35;
      if (s > bs) {
        bs = s;
        best = a;
      }
    }
    e.tx = e.x + Math.cos(best) * 5;
    e.ty = e.y + Math.sin(best) * 5;
    e.mode = pressure(fm, e) > 6 ? 'sprint' : 'run';
  }

  // ضغط الذكاء الاصطناعي: افتكاك أو انزلاق
  function aiTackles(fm) {
    const c = fm.ball.owner;
    if (!c) return;
    const O = other(fm, c.T);
    O.players.forEach((d) => {
      if (d.isUser && !fm.auto) return;
      if (d.job !== 'press' && d.job !== 'cover') return;
      const dd = dist(d, c);
      if (dd < BF().tackleRange) tryTackle(fm, d, false);
      else if (dd < 2.4 && dd > 1.4 && d.cool < fm.t && fm.rng.chance(0.004)) startSlide(fm, d);
    });
  }

  function startSlide(fm, d) {
    const c = fm.ball.owner;
    const tgt = c || fm.ball;
    const a = Math.atan2(tgt.y - d.y, tgt.x - d.x);
    d.slide = { until: fm.t + 0.38, a };
    d.face = a;
    d.tx = d.x + Math.cos(a) * 4;
    d.ty = d.y + Math.sin(a) * 4;
    d.cool = fm.t + 0.4;
  }

  function slides(fm) {
    fm.all.forEach((d) => {
      if (!d.slide) return;
      d.tx = d.x + Math.cos(d.slide.a) * 3;
      d.ty = d.y + Math.sin(d.slide.a) * 3;
      const c = fm.ball.owner;
      if (c && c.si !== d.si && dist(d, c) < 1.3) {
        d.slide = null;
        tryTackle(fm, d, true);
        d.down = BF().slideDown;
        return;
      }
      if (fm.t > d.slide.until) {
        d.slide = null;
        d.down = BF().slideDown * 0.8;
      }
    });
  }

  // ================= تحكم لاعبك =================

  // تحويل مدخلات الذراع (اتجاه في العالم) إلى حركة
  function userControl(fm, dt) {
    const e = fm.user;
    if (!e || e.off || fm.auto) return false;
    const inp = fm.input;
    if (e.down > 0 || e.slide) return true;
    if (e.isGK && e.dive && fm.t < e.dive.until) {
      e.tx = e.x;
      e.ty = e.dive.ty;
      e.mode = 'dive';
      return true;
    }
    const b = fm.ball;
    const pressing = fm.pressUntil > fm.t && !fm.dead;
    if (pressing && e.isGK && !b.owner) {
      const ip = interceptPoint(fm, e);
      e.tx = ip.x;
      e.ty = ip.y;
      e.mode = 'sprint';
    } else if (pressing && b.owner && b.owner.si !== e.si) {
      // ضغط على حامل الكرة
      const c = b.owner;
      const u = unit(ownX(e.T) - c.x, GY - c.y);
      e.tx = c.x + u[0] * 0.6;
      e.ty = c.y + u[1] * 0.6;
      e.mode = 'sprint';
    } else if (inp.mag > 0.12) {
      inp.idle = 0;
      e.tx = e.x + inp.dx * 6;
      e.ty = e.y + inp.dy * 6;
      e.mode = inp.sprint ? 'sprint' : inp.mag > 0.72 ? 'run' : 'jog';
    } else {
      inp.idle += dt;
      if (!b.owner && !fm.dead && (b.passTarget === e || e.job === 'chase') && fm.assist) {
        // استلام تلقائي: تتحرك نحو الكرة القادمة إليك
        const ip = interceptPoint(fm, e);
        e.tx = ip.x;
        e.ty = ip.y;
        e.mode = 'run';
      } else if (b.owner === e || !fm.assist || inp.idle < BF().autoPosIdle) {
        e.tx = e.x;
        e.ty = e.y;
        e.mode = 'walk';
      } else {
        // التمركز التلقائي
        if (fm.dead) restartTarget(fm, e);
        else if (e.isGK) gkThink(fm, e);
        else {
          const s = shapeTarget(fm, e, possSi(fm) === e.si);
          e.tx = s.x;
          e.ty = s.y;
          e.mode = 'jog';
        }
      }
    }
    // الحارس يمسك الكرة: ينتظر أمرك (مع حد زمني)
    if (e.isGK && fm.ball.owner === e && fm.t > e.hold + 6) gkDistribute(fm, e, false);
    return true;
  }

  // اتجاه الذراع كمتجه في العالم أو null
  function inputDir(fm) {
    const i = fm.input;
    return i.mag > 0.2 ? [i.dx, i.dy] : null;
  }

  // أوامر الأزرار
  function act(fm, action) {
    const e = fm.user;
    if (!e || e.off || fm.over) return;
    const b = fm.ball;
    const has = b.owner === e;
    const dir = inputDir(fm);
    if (fm.dead && fm.dead.type === 'pen') {
      if (action === 'shootEnd' && fm.dead.taker === e) {
        fm.dead.userWait = -99;
        return;
      }
      if ((action === 'shootStart' || action === 'dive') && e.isGK && fm.dead.si !== e.si) {
        fm.gkPenGuess = dir ? (Math.abs(e.T.dir > 0 ? dir[1] : -dir[1]) < 0.3 ? 0 : (e.T.dir > 0 ? -dir[1] : dir[1]) > 0 ? 1 : -1) : 0;
        fm.banner = { txt: 'اخترت: ' + (fm.gkPenGuess === 0 ? 'الوسط' : fm.gkPenGuess > 0 ? 'اليمين' : 'اليسار'), until: fm.t + 1.2 };
        return;
      }
    }
    if (fm.dead) return;
    // ركلتك الحرة المباشرة
    if (fm.userFK && has) {
      if (action === 'shootEnd') {
        const pw = fm.charge ? U.clamp((fm.t - fm.charge.t0) / 1.0, 0.3, 1) : 0.7;
        fm.charge = null;
        fm.userFK = null;
        const lat = dir ? dir[1] : 0;
        freeKickShot(fm, e, GY + U.clamp(lat, -1, 1) * 3.2, pw);
        return;
      }
      if (action === 'shootStart') {
        fm.charge = { t0: fm.t };
        return;
      }
      if (action === 'pass' || action === 'through' || action === 'lob') fm.userFK = null;
    }
    if (e.isGK) {
      if (has) {
        if (action === 'pass') {
          const bp = bestPass(fm, e, dir);
          if (bp) passTo(fm, e, bp.x, bp.y, false, bp.m, 0, 'gk');
        } else if (action === 'shootEnd' || action === 'lob') gkDistribute(fm, e, true);
        return;
      }
      if (action === 'shootStart' || action === 'dive') {
        // ارتماء نحو الاتجاه (أو نحو الكرة)
        let ty;
        if (dir && Math.abs(dir[1]) > 0.2) ty = e.y + Math.sign(dir[1]) * 3;
        else if (fm.shot && fm.shot.active && fm.shot.cross) ty = fm.shot.cross.y;
        else ty = b.y;
        e.dive = { at: fm.t, ty: U.clamp(ty, GY - POST - 1, GY + POST + 1), speed: BM().gkDive * (1 + BM().gkDiveK * (e.a.gdiv - 70)) * 1.1, until: fm.t + 0.75 };
        return;
      }
      if (action === 'through' || action === 'tackle') fm.pressUntil = fm.t + 1.2; // الخروج نحو الكرة
      return;
    }
    if (has) {
      if (action === 'pass' || action === 'through' || action === 'lob') {
        const bp = bestPass(fm, e, dir);
        if (!bp) return;
        if (action === 'through') {
          const m = bp.m;
          const u = unit(m.vx + e.T.dir * 3, m.vy);
          passTo(fm, e, m.x + u[0] * 7, m.y + u[1] * 7, false, m, 0);
        } else if (action === 'lob') {
          const gx = goalX(e.T);
          const nearBy = Math.abs(e.x - gx) < 25 && (e.y < 18 || e.y > W - 18);
          if (nearBy) {
            // عرضية نحو المنطقة
            const box = e.T.players.filter((m) => m !== e && Math.abs(m.x - gx) < 16 && Math.abs(m.y - GY) < 12);
            const m = box.sort((p, q) => q.a.hea - p.a.hea)[0];
            passTo(fm, e, m ? m.x : gx - e.T.dir * 8, m ? m.y : GY, true, m || null, 0);
          } else passTo(fm, e, bp.m.x + bp.m.vx * 0.6, bp.m.y + bp.m.vy * 0.6, true, bp.m, 0);
        } else passTo(fm, e, bp.x, bp.y, bp.lofted && bp.through, bp.m, 0);
        return;
      }
      if (action === 'shootStart') {
        fm.charge = { t0: fm.t };
        return;
      }
      if (action === 'shootEnd') {
        const pw = fm.charge ? U.clamp(0.35 + (fm.t - fm.charge.t0) / 0.9, 0.35, 1) : 0.75;
        fm.charge = null;
        const T = e.T;
        // التصويب العرضي من الذراع
        let lat = 0;
        if (dir) lat = T.dir > 0 ? -dir[1] : dir[1];
        const gk = gkOf(other(fm, T));
        let ty;
        if (Math.abs(lat) > 0.25) ty = GY + (T.dir > 0 ? -1 : 1) * Math.sign(lat) * (POST - 0.8);
        else ty = GY + (gk ? (gk.y <= GY ? 1 : -1) : 1) * (POST - 1.2);
        shoot(fm, e, ty, pw, fm.input.lobShot, 0);
        return;
      }
      return;
    }
    // بدون كرة
    if (action === 'pass') {
      fm.userCall = fm.t + 1.4;
      return;
    }
    if (action === 'shootStart' || action === 'tackle') {
      // افتكاك إن كان الخصم قريباً، وإلا ضغط تلقائي عليه لثوانٍ
      if (!tryTackle(fm, e, false)) fm.pressUntil = fm.t + 0.9;
      return;
    }
    if (action === 'through' || action === 'slide') {
      if (e.cool < fm.t) startSlide(fm, e);
    }
  }

  // ================= الأهداف والخروج =================
  function checkOut(fm) {
    const b = fm.ball;
    if (b.owner || fm.dead) return;
    if (b.x < 0 || b.x > L) {
      const gx = b.x < 0 ? 0 : L;
      if (Math.abs(b.y - GY) < POST && b.z < BAR) return goal(fm, gx);
      const Tdef = fm.teams.find((T) => ownX(T) === gx);
      const last = fm.lastTouch;
      if (fm.shot && fm.shot.active) fm.shot.active = false;
      if (last && last.si === Tdef.si) setRestart(fm, 'corner', 1 - Tdef.si, gx === 0 ? 0.3 : L - 0.3, b.y < GY ? 0.3 : W - 0.3);
      else setRestart(fm, 'goalkick', Tdef.si, gx === 0 ? 5.5 : L - 5.5, GY + (b.y < GY ? -8 : 8));
      if (last && last.si !== Tdef.si && fm.shotMiss !== fm.shot && fm.shot && fm.shot.by === last) {
        fm.shotMiss = fm.shot;
        say(fm, fm.shot.type === 'big' ? 'missBig' : 'miss', { p: last.name, t: last.T.club.short }, fm.shot.type === 'big' ? 2 : 1);
      }
      return;
    }
    if (b.y < 0 || b.y > W) {
      const last = fm.lastTouch;
      const si = last ? 1 - last.si : 0;
      setRestart(fm, 'throw', si, U.clamp(b.x, 1, L - 1), b.y < 0 ? 0.2 : W - 0.2);
    }
  }

  function goal(fm, gx) {
    const A = fm.teams.find((T) => goalX(T) === gx);
    const D = other(fm, A);
    const last = fm.lastTouch;
    let scorer = last && last.si === A.si ? last : null;
    const og = !scorer && last;
    A.score++;
    A.S.goals++;
    const sh = fm.shot;
    if (sh && sh.active) sh.active = false;
    let assister = null;
    if (scorer) {
      const lp = fm.lastPass[A.si];
      if (lp && lp.by !== scorer && fm.t - lp.t < 10) assister = lp.by;
      scorer.st.g++;
      scorer.st.sot++;
      A.st.sot++;
      scorer.rt += RT().sot;
      if (assister) assister.st.a++;
    } else if (og) {
      og.rt += BR().ownGoal;
    }
    fm.lastPass = [null, null];
    const gk = gkOf(D);
    fm.fx.push({ t: 'goal', x: fm.ball.x, y: fm.ball.y, si: A.si });
    const type = sh ? sh.type : 'half';
    const key = !scorer ? 'goal' : scorer.isUser ? 'userGoal' : type === 'long' ? 'goalLong' : type === 'header' ? 'goalHeader' : type === 'pen' ? 'goalPen' : type === 'fk' ? 'goalFK' : 'goal';
    let txt = FC.TXT.com(fm.rng, key, { p: scorer ? scorer.name : og ? og.name + ' (عكسي)' : '', t: A.club.short, gk: gk ? gk.name : '' });
    if (assister) txt += ' ' + FC.TXT.com(fm.rng, 'assistBy', { a: assister.name });
    feed(fm, txt, 'goal', 3, { si: A.si, pid: scorer ? scorer.pid : null, apid: assister ? assister.pid : null, sc: [fm.teams[0].score, fm.teams[1].score] });
    fm.banner = { txt: scorer && scorer.isUser ? 'هدددف! سجلت!' : 'هدف لـ ' + A.club.short, until: fm.t + 2.2, goal: true, si: A.si, user: !!(scorer && scorer.isUser) };
    setRestart(fm, 'kickoff', D.si, L / 2, GY, BF().celebrate);
    fm.goalFor = A.si;
  }

  // ================= التعليق =================
  function feed(fm, txt, t, imp, extra) {
    const e = Object.assign({ min: clock(fm), txt, t, imp: imp || 1 }, extra || {});
    fm.feed.push(e);
    if (fm.feed.length > 60) fm.feed.shift();
  }
  const EXTRA = {
    offside: ['تسلل! الراية ترتفع ضد {p}.', 'الحكم المساعد يرفع الراية: تسلل على {p}.', 'تسلل واضح، ركلة حرة للخصم.', '{p} في موقف تسلل.'],
    penalty: ['ركلة جزاء لـ {t}!', 'الحكم يشير إلى نقطة الجزاء! ركلة جزاء لـ {t}.', 'جزاء! فرصة ذهبية لـ {t}.'],
    corner: ['ركنية لـ {t}.', '{t} يكسب ركلة ركنية.', 'ركلة ركنية، المدافعون يستعدون.'],
  };
  function say(fm, key, vars, imp, extra) {
    const list = FC.TXT.COM[key] ? null : EXTRA[key];
    const txt = list ? FC.TXT.fill(FC.TXT.pick(fm.rng, list, 'f_' + key), vars) : FC.TXT.com(fm.rng, key, vars);
    feed(fm, txt, extra && extra.card ? 'card' : key === 'penalty' ? 'chance' : 'info', imp, extra);
  }

  // ================= خطوة زمنية =================
  function step(fm, dt) {
    if (fm.over) return;
    fm.t += dt;
    fm.sec += dt * fm.scale;
    // نهاية الشوط والمباراة (عند توقف اللعب أو بعد تجاوز واضح)
    const m1 = (45 + fm.m.st1) * 60;
    const m2 = (90 + fm.m.st2) * 60;
    if (fm.half === 1 && fm.sec >= m1 && (!fm.shot || !fm.shot.active)) return halfTime(fm);
    if (fm.half === 2 && fm.sec >= m2 && (!fm.shot || !fm.shot.active)) return fullTime(fm);
    if (fm.pause > 0) {
      fm.pause -= dt;
      fm.all.forEach((e) => {
        if (fm.dead) restartTarget(fm, e);
        move(fm, e, dt);
      });
      return;
    }
    fm.roleT -= dt;
    if (fm.roleT <= 0) {
      fm.roleT = 0.1;
      assignJobs(fm);
    }
    const b = fm.ball;
    const userCtl = userControl(fm, dt);
    fm.all.forEach((e) => {
      if (e.off) return;
      if (e === fm.user && userCtl) return;
      if (b.owner === e && !fm.dead) {
        if (e.isGK) {
          e.tx = e.x;
          e.ty = e.y;
          e.mode = 'walk';
        } else dribbleTarget(fm, e);
        carrierDecide(fm, e);
        return;
      }
      aiTarget(fm, e);
    });
    if (fm.dead && fm.t >= fm.dead.at) execRestart(fm);
    fm.all.forEach((e) => {
      if (!e.off) move(fm, e, dt);
    });
    if (!b.owner) FC.Moment.ballPhys(b, dt);
    if (!fm.dead) {
      slides(fm);
      aiTackles(fm);
      contacts(fm);
      shotProgress(fm);
      checkOut(fm);
    }
    if (fm.userFK && fm.t > fm.userFK.until && b.owner === fm.user) {
      fm.userFK = null;
      freeKickShot(fm, fm.user, GY, 0.7);
    }
    if (b.owner) fm.teams[b.owner.si].st.poss += dt;
    else if (fm.poss != null) fm.teams[fm.poss].st.poss += dt;
    // استبدال لاعبك من المدرب (تعب أو أداء سيئ) عند توقف اللعب
    const u = fm.user;
    if (u && !u.off && minuteOf(fm) >= 60 && fm.dead && fm.dead.type !== 'pen' && !fm.coachChecked) {
      fm.coachChecked = fm.t;
      const S = u.T.S;
      const ins = S.bench.filter((x) => x.in < 0 && x.p.pos !== 'GK' && x.pid !== 0);
      if ((u.sta < BF().coachTired || liveRating(fm, u) < 5.8) && fm.rng.chance(0.35) && S.subsLeft > 0 && ins.length && !u.isGK) {
        substitute(fm, u.T, u, FC.Match.bestFor(ins, u.rec.slot));
        fm.userOff = 'sub';
        S.subPlan.pop();
      }
    }
    if (fm.coachChecked && fm.t - fm.coachChecked > 25) fm.coachChecked = 0;
    // دخولك بديلاً من الدكة
    const mu = fm.m.user;
    if (mu && mu.state === 'bench' && mu.subOn > 0 && minuteOf(fm) >= mu.subOn && fm.half === 2 && fm.dead && fm.dead.type !== 'pen') {
      const T = fm.teams[mu.si];
      if (T.S.subsLeft > 0) {
        const famU = (e) => FC.Select.fam(fm.state.user.pos, e.rec.slot);
        const outs = T.players.filter((e) => !e.isGK && !e.isUser);
        if (outs.length) {
          const top = Math.max.apply(null, outs.map(famU));
          const cand = outs.filter((e) => famU(e) >= top - 0.001).sort((a, b2) => a.rec.eff - b2.rec.eff)[0];
          substitute(fm, T, cand, mu.x);
          T.S.subPlan.pop();
          fm.banner = { txt: 'دخلت بديلاً! حان وقتك', until: fm.t + 3 };
          fm.userOn = fm.t;
        }
      }
      mu.subOn = -1;
    }
    aiSubs(fm);
    // الإصابات (مرة كل دقيقة مباراة)
    const mn = minuteOf(fm);
    if (mn !== fm.injMin) {
      fm.injMin = mn;
      if (FC.Status) injuries(fm);
    }
  }

  // إصابات محتملة في هذه الدقيقة
  function injuries(fm) {
    fm.teams.forEach((T) => {
      const ps = T.players.map((e) => FC.Status.perMinute(fm.state, e.p, e.sta * 100));
      const tot = ps.reduce((a, b) => a + b, 0);
      if (fm.rng.next() >= tot) return;
      injure(fm, T.players[fm.rng.weighted(ps)]);
    });
  }

  // إصابة لاعب: يخرج ويدخل بديل إن أمكن
  function injure(fm, e) {
    if (!e || e.off || e.rec.injured) return;
    const T = e.T;
    const S = T.S;
    e.rec.injured = true;
    fm.fx.push({ t: 'foul', x: e.x, y: e.y });
    if (e.isUser) FC.Status.injureUser(fm.state, fm.rng, 'match');
    else FC.Status.injureAI(e.p, fm.rng);
    feed(fm, FC.TXT.com(fm.rng, e.isUser ? 'userInjured' : 'injury', { p: e.name, t: T.club.short }), e.isUser ? 'user' : 'info', e.isUser ? 2 : 1, e.isUser ? { pid: 0 } : null);
    const ins = S.bench.filter((x) => x.in < 0 && x.pid !== 0 && (x.p.pos === 'GK') === e.isGK);
    if (S.subsLeft > 0 && ins.length) {
      substitute(fm, T, e, FC.Match.bestFor(ins, e.rec.slot));
      S.subPlan.pop();
    } else if (e.isUser) {
      // لا تبديلات: تخرج ويكمل فريقك بعشرة
      T.players.splice(T.players.indexOf(e), 1);
      e.off = true;
      e.rec.on = false;
      e.rec.out = minuteOf(fm);
      if (fm.m.user) fm.m.user.state = 'off';
      if (fm.ball.owner === e) fm.ball.owner = null;
    }
    if (e.isUser) {
      fm.userOff = 'inj';
      fm.banner = { txt: 'أصبت!', until: fm.t + 2.5 };
    }
  }

  // تبديلات الذكاء الاصطناعي عند توقف اللعب
  function aiSubs(fm) {
    if (!fm.dead) return;
    const mn = minuteOf(fm);
    fm.teams.forEach((T) => {
      const S = T.S;
      if (!S.subPlan.length || S.subPlan[0] > mn || S.subsLeft <= 0) return;
      S.subPlan.shift();
      const outs = T.players.filter((e) => !e.isGK && !e.isUser);
      const ins = S.bench.filter((x) => x.in < 0 && x.p.pos !== 'GK' && x.pid !== 0);
      if (!outs.length || !ins.length) return;
      const o = outs.sort((a, b) => a.sta - b.sta)[0];
      const i = FC.Match.bestFor(ins, o.rec.slot);
      substitute(fm, T, o, i);
    });
  }

  function substitute(fm, T, o, inRec) {
    const m = fm.m;
    m.min = Math.min(89, minuteOf(fm));
    syncEnt(fm, o);
    FC.Match.doSub(fm.state, m, T.S, o.rec, inRec, [], fm.rng);
    const ne = makePlayer(fm, T, inRec, [o.fx * 100, o.fy * 100]);
    ne.x = o.x;
    ne.y = o.y;
    ne.face = o.face;
    T.players[T.players.indexOf(o)] = ne;
    o.off = true;
    if (fm.ball.owner === o) fm.ball.owner = null;
    if (ne.isUser) feed(fm, FC.TXT.com(fm.rng, 'userSubOn', { a: o.name }), 'user', 2, { pid: 0 });
    else if (o.isUser) feed(fm, FC.TXT.com(fm.rng, 'userSubOff', { p: ne.name }), 'user', 2, { pid: 0 });
    else feed(fm, FC.TXT.com(fm.rng, 'sub', { t: T.club.short, p: ne.name, a: o.name }), 'sub', 1);
  }

  function halfTime(fm) {
    fm.half = 2;
    fm.sec = 45 * 60;
    setDirs(fm);
    fm.htDone = true;
    feed(fm, FC.TXT.com(fm.rng, 'halftime', { sc: fm.teams[0].score + ' - ' + fm.teams[1].score }), 'ht', 2);
    fm.banner = { txt: 'نهاية الشوط الأول', until: fm.t + 2.5 };
    placeKickoff(fm);
    setRestart(fm, 'kickoff', 1, L / 2, GY, 3);
    fm.pause = 2.5;
  }

  function fullTime(fm) {
    fm.over = true;
    const t0 = fm.teams[0];
    const t1 = fm.teams[1];
    const sc = t0.score + ' - ' + t1.score;
    if (t0.score === t1.score) feed(fm, FC.TXT.com(fm.rng, 'ftDraw', { t: t0.club.short, o: t1.club.short, sc }), 'ft', 2);
    else {
      const w = t0.score > t1.score ? t0 : t1;
      const l = w === t0 ? t1 : t0;
      feed(fm, FC.TXT.com(fm.rng, 'ftWin', { t: w.club.short, o: l.club.short, sc }), 'ft', 2);
    }
  }

  // وضع اللاعبين في مواقع ضربة البداية فوراً
  function placeKickoff(fm) {
    fm.all.forEach((e) => {
      if (e.off) return;
      const T = e.T;
      const s = shapeTarget(fm, e, false, { x: L / 2, y: GY });
      const a = Math.min(along(T, s.x), 0.46);
      e.x = e.isGK ? xAt(T, 0.02) : xAt(T, a);
      e.y = e.isGK ? GY : s.y;
      e.vx = e.vy = 0;
      e.face = T.dir > 0 ? 0 : Math.PI;
    });
  }

  // ================= التقييم والإحصائيات =================
  function liveRating(fm, e) {
    const s = e.st;
    let r = 6.0 + BR().userBase + e.rt;
    if (s.g) r += BR().goal + (s.g - 1) * BR().goalExtra;
    r += s.a * BR().assist;
    return U.clamp(Math.round(r * 10) / 10, 3, 10);
  }

  // نقل إحصائيات لاعب إلى سجل مباراة المحرك
  function syncEnt(fm, e) {
    const r = e.rec;
    const s = e.st;
    r.g = e.base0.g + s.g;
    r.a = e.base0.a + s.a;
    r.sh = e.base0.sh + s.sh;
    r.sot = e.base0.sot + s.sot;
    r.yc = e.base0.yc + s.yc;
    r.rc = Math.max(e.base0.rc, s.rc);
    r.sv = e.base0.sv + s.sv;
    r.bsv = e.base0.bsv + s.bsv;
    if (!e.isUser) r.rtAdd = (r.rtAdd || 0) + U.clamp(e.rt, -2, 2) - (e.synced || 0);
    e.synced = U.clamp(e.rt, -2, 2);
  }

  // كتابة نتيجة المباراة الكاملة في مباراة المحرك (final: نهاية المباراة)
  function writeBack(fm, final) {
    const m = fm.m;
    fm.all.forEach((e) => syncEnt(fm, e));
    fm.teams.forEach((T) => {
      T.S.goals = T.score;
      T.S.shots = (T.S.shotsBase || T.S.shots) + 0;
      T.S.shots += T.st.sh - (T.shSynced || 0);
      T.S.sot += T.st.sot - (T.sotSynced || 0);
      T.shSynced = T.st.sh;
      T.sotSynced = T.st.sot;
    });
    const u = fm.user;
    if (u && m.user) {
      const mu = m.user;
      const s = u.st;
      const d = (k) => s[k] - ((fm.uSynced || {})[k] || 0);
      mu.kp += d('kp');
      mu.pas += d('pas');
      mu.pasOk += d('pasOk');
      mu.drb += d('drb');
      mu.tk += d('tk') + d('blk');
      mu.int += d('int');
      mu.loss += d('loss');
      mu.fouls += d('fouls');
      // التقييم: أحداث المباراة الكاملة + الأهداف والصناعة
      let add = u.rt - ((fm.uSynced || {}).rt || 0);
      const g0 = (fm.uSynced || {}).g || 0;
      for (let k = g0; k < s.g; k++) add += u.base0.g + k === 0 ? BR().goal : BR().goalExtra;
      add += (s.a - ((fm.uSynced || {}).a || 0)) * BR().assist;
      mu.rt += add;
      mu.fit = u.sta * 100;
      fm.uSynced = Object.assign({}, s, { rt: u.rt });
    }
    // التعليق للأهداف في سجل المباراة
    fm.feed.forEach((f) => {
      if (!f.synced) {
        f.synced = true;
        m.events.push(f);
      }
    });
    m.min = Math.min(final ? 90 + m.st2 : minuteOf(fm), 90 + m.st2);
    if (final) {
      m.phase = 'ft';
      m.done = true;
    } else {
      m.phase = fm.half === 1 ? (minuteOf(fm) >= 45 ? 'h1' : 'h1') : 'h2';
      if (fm.half === 2 && m.min < 45) m.min = 45;
      m.pending = null;
      m.mode = 'auto';
      m.live = false;
      m.mom = 0;
      if (m.user) m.user.momentsOn = false;
      if (m.user && fm.userOff === 'sub' && u && !u.off) {
        // المدرب يستبدلك
        const S = u.T.S;
        const ins = S.bench.filter((x) => x.in < 0 && x.p.pos !== 'GK');
        if (ins.length) FC.Match.doSub(fm.state, m, S, u.rec, FC.Match.bestFor(ins, u.rec.slot), [], fm.rng);
      }
      if (m.user && fm.userOff === 'red') m.user.state = 'off';
    }
  }

  // تشغيل بدون واجهة (للاختبار وللعب التلقائي الكامل)
  function runHeadless(fm, dt) {
    const h = dt || 1 / 30;
    let guard = 0;
    while (!fm.over && guard++ < 200000) step(fm, h);
    return fm;
  }

  FC.Full = {
    L, W, GY, POST, BAR,
    create, step, act, writeBack, runHeadless, liveRating, clock, minuteOf,
    along, goalX, ownX, gkOf,
    setInput(fm, dx, dy, mag, sprint) {
      const i = fm.input;
      i.dx = dx;
      i.dy = dy;
      i.mag = mag;
      i.sprint = !!sprint;
    },
    setAuto(fm, on) {
      fm.auto = on;
    },
  };
})(globalThis);
