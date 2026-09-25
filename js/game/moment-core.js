/* =========================================================
   محرك اللحظات — المنطق فقط (بدون رسم ولا DOM) حتى يُختبر في Node
   - الإحداثيات بالمتر: x من 0 إلى 68 (عرض الملعب)، y من 0 إلى 105 (نهاجم نحو y = 105)
   - فيزياء الكرة: سرعة، احتكاك، ارتفاع وجاذبية، انحناء بسيط
   - ذكاء اصطناعي: المدافعون يضغطون ويقطعون، الزملاء يتحركون، الحارس يغلق الزاوية
   - التسديدة: فيزياء حقيقية + حسم التصدي لحظة التسديد (زمن الوصول مقابل رد فعل الحارس ومداه)
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC = G.FC || {};
  const U = FC.util;

  const W = 68;
  const L = 105;
  const GX = 34;
  const POST = 3.66;
  const BAR = 2.44;
  const DT = 1 / 60;
  const P = () => FC.BAL.moments;

  const hyp = Math.hypot;
  const dist = (a, b) => hyp(a.x - b.x, a.y - b.y);
  function unit(x, y) {
    const d = hyp(x, y) || 1;
    return [x / d, y / d];
  }

  // ================= الكيانات =================
  function makeEnt(sc, side, role, person, x, y) {
    const a = person.attrs;
    const B = P();
    const max = role === 'gk' ? 4.6 + (a.gref - 60) * 0.02 : B.runBase + B.runK * (a.spd - 60);
    const e = {
      id: sc.ents.length, side, role, pid: person.pid, name: person.name, num: person.num, pos: person.pos, a,
      x, y, vx: 0, vy: 0, max: U.clamp(max, 3.8, 7.6), acc: U.clamp(7 + (a.acc - 60) * 0.08, 5, 10),
      tx: x, ty: y, mode: 'hold', cool: 0, busyUntil: 0, face: Math.PI / 2, idx: -1, mark: null, dive: null,
    };
    sc.ents.push(e);
    return e;
  }

  // مستوى الضغط على لاعب (0 لا ضغط ← 1 مدافع ملاصق)
  function pressureOn(sc, e) {
    let d = 99;
    sc.ents.forEach((o) => {
      if (o.side !== e.side && o.role !== 'gk') d = Math.min(d, dist(o, e));
    });
    return U.clamp((2.6 - d) / 2.2, 0, 1);
  }
  function nearestOpp(sc, e) {
    let best = null;
    let bd = 1e9;
    sc.ents.forEach((o) => {
      if (o.side !== e.side && o.role !== 'gk') {
        const d = dist(o, e);
        if (d < bd) {
          bd = d;
          best = o;
        }
      }
    });
    return { e: best, d: bd };
  }

  // ================= فيزياء الكرة =================
  function ballPhys(b, dt) {
    const B = P();
    const sp = hyp(b.vx, b.vy);
    if (b.z > 0.001 || b.vz > 0) {
      b.vz -= B.gravity * dt;
      b.z += b.vz * dt;
      const k = 1 - B.drag * sp * dt;
      b.vx *= k;
      b.vy *= k;
      if (b.spin && sp > 1) {
        const nx = -b.vy / sp;
        const ny = b.vx / sp;
        b.vx += nx * b.spin * dt;
        b.vy += ny * b.spin * dt;
        b.spin *= 1 - 0.6 * dt;
      }
      if (b.z <= 0) {
        b.z = 0;
        if (b.vz < -1.4) {
          b.vz = -b.vz * B.bounce;
          b.vx *= 0.82;
          b.vy *= 0.82;
        } else b.vz = 0;
      }
    } else if (sp > 0) {
      const ns = Math.max(0, sp - (B.friction + B.drag * sp * sp * 0.4) * dt);
      b.vx *= ns / sp;
      b.vy *= ns / sp;
      if (b.spin) b.spin *= 1 - 2 * dt;
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
  }

  // توقع مسار الكرة (نقاط كل 0.05 ثانية)
  function predict(b, maxT) {
    const c = { x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, vz: b.vz, spin: b.spin || 0 };
    const out = [];
    const h = 1 / 120;
    let t = 0;
    let next = 0;
    while (t < maxT) {
      if (t >= next) {
        out.push({ t, x: c.x, y: c.y, z: c.z });
        next += 0.05;
      }
      ballPhys(c, h);
      t += h;
      if (hyp(c.vx, c.vy) < 0.15 && c.z <= 0) {
        out.push({ t, x: c.x, y: c.y, z: c.z, stop: true });
        break;
      }
    }
    return out;
  }

  // أين ومتى تعبر الكرة خط المرمى؟
  function crossing(b) {
    const c = { x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, vz: b.vz, spin: b.spin || 0 };
    const h = 1 / 240;
    let t = 0;
    while (t < 4) {
      const py = c.y;
      const px = c.x;
      const pz = c.z;
      ballPhys(c, h);
      t += h;
      if (c.y >= L) {
        const f = (L - py) / (c.y - py || 1);
        return { x: px + (c.x - px) * f, z: pz + (c.z - pz) * f, t };
      }
      if (hyp(c.vx, c.vy) < 0.3 && c.z <= 0) return null;
    }
    return null;
  }

  // ================= إنشاء المشهد =================
  function create(pd, opts) {
    opts = opts || {};
    const sc = {
      pd, t: 0, tMax: 6, over: false, result: null, endAt: 0,
      rng: new FC.RNG(pd.seed || 12345),
      ents: [], user: null, mates: [], opps: [], gk: null,
      ball: { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, spin: 0, owner: null, lastBy: null, kickT: -9, kind: null },
      stats: { pas: 0, pasOk: 0, drb: 0, loss: 0, badLoss: 0 },
      lastPass: null, passerIdx: null, lastPasser: null,
      shot: null, path: null, lofted: false,
      auto: !!opts.auto, human: opts.human !== false, humanNoise: opts.humanNoise != null ? opts.humanNoise : P().aiHumanNoise,
      diff: pd.diff || 'real', fx: [], msg: '', title: '', deep: false, give: false,
      autoAt: 0, autoPlan: null,
    };
    const S = SCEN[pd.scen] || SCEN.build;
    S(sc, sc.rng);
    // الحارس دائماً عند مرماه
    if (pd.gk && !sc.gk) {
      sc.gk = makeEnt(sc, 'D', 'gk', pd.gk, GX, L - 1);
      sc.gk.mode = 'gk';
    }
    return sc;
  }

  function addUser(sc, x, y) {
    const e = makeEnt(sc, 'A', 'user', sc.pd.me, x, y);
    e.fit = sc.pd.me.fit;
    sc.user = e;
    return e;
  }
  function addMate(sc, i, x, y, mode, tx, ty) {
    const p = sc.pd.mates[i];
    if (!p) return null;
    const e = makeEnt(sc, 'A', 'mate', p, x, y);
    e.idx = i;
    e.mode = mode || 'support';
    e.tx = tx != null ? tx : x;
    e.ty = ty != null ? ty : y;
    e.home = { x: e.tx, y: e.ty };
    sc.mates.push(e);
    return e;
  }
  function addOpp(sc, i, x, y, mode) {
    const p = sc.pd.opps[i];
    if (!p) return null;
    const e = makeEnt(sc, 'D', 'def', p, x, y);
    e.mode = mode || 'cover';
    e.home = { x, y };
    sc.opps.push(e);
    return e;
  }
  function give(sc, e) {
    const b = sc.ball;
    b.owner = e;
    b.x = e.x;
    b.y = e.y + 0.6;
    b.z = 0;
    b.vx = b.vy = b.vz = 0;
    e.hasT = sc.t;
  }

  // ================= السيناريوهات =================
  const SCEN = {
    // انفراد: أنت بالكرة ومدافع يلاحقك من الخلف
    oneOnOne(sc, r) {
      const m = r.chance(0.5) ? 1 : -1;
      const ux = GX + m * r.float(0, 8);
      const uy = L - r.float(21, 26);
      const u = addUser(sc, ux, uy);
      give(sc, u);
      u.mode = 'carry';
      u.carrySlow = 1;
      u.vy = 4.5;
      const d = addOpp(sc, 0, ux - m * r.float(0.5, 2.5), uy - r.float(3.6, 5.2), 'press');
      if (d) d.vy = 5;
      addOpp(sc, 1, GX - m * r.float(10, 16), uy + r.float(-2, 4), 'recover');
      addMate(sc, 0, ux - m * r.float(7, 11), uy - r.float(1, 4), 'run', GX - m * 6, L - 11);
      sc.tMax = 6.5;
      sc.title = 'انفراد!';
      sc.msg = 'تقدّم وسدد قبل وصول المدافع';
    },
    // نصف فرصة داخل المنطقة تحت الضغط
    boxShot(sc, r) {
      const m = r.chance(0.5) ? 1 : -1;
      const ux = GX + m * r.float(3, 10);
      const uy = L - r.float(10.5, 14.5);
      const u = addUser(sc, ux, uy);
      give(sc, u);
      u.mode = 'hold';
      addOpp(sc, 0, ux - m * r.float(0.8, 1.8), uy + r.float(2, 3), 'press');
      addOpp(sc, 1, GX - m * r.float(1, 4), L - r.float(7, 10), 'zone');
      addOpp(sc, 2, GX - m * r.float(6, 9), L - r.float(4, 7), 'zone');
      addMate(sc, 0, GX - m * r.float(5, 8), L - r.float(6, 9), 'run', GX - m * 3, L - 6);
      addMate(sc, 1, GX + m * r.float(0, 3), L - r.float(17, 20), 'support');
      sc.tMax = 4.2;
      sc.title = 'فرصة داخل المنطقة';
      sc.msg = 'سدد بسرعة أو مرر لزميلك';
    },
    // تسديدة من خارج المنطقة
    longShot(sc, r) {
      const m = r.chance(0.5) ? 1 : -1;
      const ux = GX + m * r.float(0, 11);
      const uy = L - r.float(23, 29);
      const u = addUser(sc, ux, uy);
      give(sc, u);
      u.mode = 'carry';
      u.carrySlow = 0.45;
      addOpp(sc, 0, ux + r.float(-1.5, 1.5), uy + r.float(4, 6), 'press');
      addOpp(sc, 1, GX - m * r.float(2, 6), L - r.float(12, 15), 'cover');
      addOpp(sc, 2, GX + m * r.float(3, 8), L - r.float(11, 14), 'cover');
      addOpp(sc, 3, GX - m * r.float(8, 14), uy + r.float(0, 4), 'cover');
      addMate(sc, 0, GX - m * r.float(2, 6), L - r.float(11, 14), 'support');
      addMate(sc, 1, GX + m * r.float(14, 20), uy + r.float(2, 6), 'support');
      addMate(sc, 2, GX - m * r.float(14, 20), uy + r.float(3, 8), 'support');
      sc.tMax = 5;
      sc.title = 'مساحة للتسديد';
      sc.msg = 'جرّب التسديد من بعيد أو مرر';
    },
    // كرة بينية لزميل يركض خلف الدفاع (من ثغرة بين مدافعَين)
    throughBall(sc, r) {
      const m = r.chance(0.5) ? 1 : -1;
      const gapX = GX + m * r.float(0, 7);
      const line = L - r.float(24, 28);
      const u = addUser(sc, gapX + r.float(-5, 5), line - r.float(10, 14));
      give(sc, u);
      u.mode = 'carry';
      u.carrySlow = 0.4;
      addMate(sc, 0, gapX + r.float(-1.5, 1.5), line - 0.6, 'run', gapX + (GX - gapX) * 0.5, L - 11);
      sc.mates[0].runDelay = r.float(0.2, 0.6);
      addMate(sc, 1, GX - m * r.float(14, 20), line - r.float(3, 7), 'support');
      addOpp(sc, 0, gapX - r.float(3.5, 5), line + 0.4, 'line');
      addOpp(sc, 1, gapX + r.float(3.5, 5), line + r.float(0, 0.8), 'line');
      addOpp(sc, 2, u.x + (r.chance(0.5) ? 1 : -1) * r.float(2.5, 4), u.y + r.float(4, 6), 'press');
      sc.tMax = 7.5;
      sc.title = 'كرة بينية';
      sc.msg = 'مرر بينية في المساحة أمام زميلك المنطلق';
      sc.give = true;
    },
    // عرضية أرضية من خط المرمى لزميل قادم
    cutback(sc, r) {
      const m = r.chance(0.5) ? 1 : -1;
      const ux = GX + m * r.float(13, 18);
      const uy = L - r.float(4, 8);
      const u = addUser(sc, ux, uy);
      give(sc, u);
      u.mode = 'hold';
      addMate(sc, 0, GX + m * r.float(-3, 2), L - r.float(14, 17), 'run', GX + m * r.float(-2, 1), L - r.float(10, 12));
      addMate(sc, 1, GX - m * r.float(4, 8), L - r.float(17, 21), 'run', GX - m * r.float(2, 5), L - 16);
      addOpp(sc, 0, ux - m * r.float(0.6, 1.4), Math.min(L - 0.5, uy + r.float(1.4, 2.2)), 'press');
      addOpp(sc, 1, GX + m * r.float(1, 4), L - r.float(3, 5), 'zone');
      addOpp(sc, 2, GX - m * r.float(2, 5), L - r.float(6, 8), 'zone');
      sc.tMax = 4.2;
      sc.title = 'عرضية أرضية';
      sc.msg = 'اضغط على زميلك لتمرر له في المنطقة';
      sc.give = true;
    },
    // بناء هجمة في وسط الملعب
    build(sc, r) {
      const m = r.chance(0.5) ? 1 : -1;
      const ux = GX + m * r.float(0, 14);
      const uy = L - r.float(42, 50);
      const u = addUser(sc, ux, uy);
      give(sc, u);
      u.mode = 'carry';
      u.carrySlow = 0.35;
      addMate(sc, 0, GX - m * r.float(0, 6), uy + r.float(16, 22), 'support');
      addMate(sc, 1, m > 0 ? r.float(4, 8) : W - r.float(4, 8), uy + r.float(6, 12), 'support');
      addMate(sc, 2, ux + m * r.float(8, 14), uy - r.float(4, 8), 'support');
      addOpp(sc, 0, ux + r.float(-2, 2), uy + r.float(4, 6), 'press');
      addOpp(sc, 1, GX - m * r.float(0, 5), uy + r.float(13, 17), 'zone');
      addOpp(sc, 2, GX + m * r.float(6, 12), uy + r.float(10, 14), 'zone');
      addOpp(sc, 3, GX - m * r.float(10, 16), uy + r.float(8, 12), 'zone');
      sc.tMax = 6;
      sc.title = 'بناء الهجمة';
      sc.msg = 'مرر للأمام إلى زميل حر';
      sc.build = true;
    },
    // هجمة مرتدة سريعة
    counter(sc, r) {
      const m = r.chance(0.5) ? 1 : -1;
      const ux = GX + m * r.float(0, 8);
      const uy = L - r.float(34, 40);
      const u = addUser(sc, ux, uy);
      give(sc, u);
      u.mode = 'carry';
      u.carrySlow = 1.1;
      u.vy = 5;
      addMate(sc, 0, GX - m * r.float(10, 16), uy + r.float(-2, 3), 'run', GX - m * r.float(4, 8), L - 14);
      addMate(sc, 1, GX + m * r.float(14, 20), uy - r.float(1, 4), 'run', GX + m * r.float(10, 14), L - 18);
      addOpp(sc, 0, ux + r.float(-3, 3), uy + r.float(9, 13), 'retreat');
      addOpp(sc, 1, GX - m * r.float(6, 10), uy + r.float(12, 16), 'retreat');
      sc.tMax = 7.5;
      sc.title = 'هجمة مرتدة!';
      sc.msg = 'اركض بالكرة ومرر أو سدد في الوقت المناسب';
      sc.build = true;
    },
    // بناء من الخلف تحت الضغط
    buildDeep(sc, r) {
      const m = r.chance(0.5) ? 1 : -1;
      const ux = GX + m * r.float(4, 18);
      const uy = r.float(18, 34);
      const u = addUser(sc, ux, uy);
      give(sc, u);
      u.mode = 'hold';
      addMate(sc, 0, GX - m * r.float(0, 6), uy + r.float(10, 16), 'support');
      addMate(sc, 1, m > 0 ? W - r.float(4, 8) : r.float(4, 8), uy + r.float(4, 12), 'support');
      addMate(sc, 2, GX - m * r.float(10, 16), uy - r.float(2, 6), 'support');
      addOpp(sc, 0, ux + r.float(-2, 2), uy + r.float(3.5, 5.5), 'press');
      addOpp(sc, 1, GX - m * r.float(0, 6), uy + r.float(9, 13), 'zone');
      addOpp(sc, 2, GX + m * r.float(8, 14), uy + r.float(6, 10), 'zone');
      sc.tMax = 5;
      sc.title = 'بناء من الخلف';
      sc.msg = 'اخرج بالكرة من الضغط بتمريرة آمنة';
      sc.build = true;
      sc.deep = true;
    },
    // توزيع الحارس
    gkDist(sc, r) {
      const u = addUser(sc, GX + r.float(-3, 3), r.float(6, 10));
      give(sc, u);
      u.mode = 'hold';
      addMate(sc, 0, r.float(14, 20), r.float(12, 18), 'support');
      addMate(sc, 1, W - r.float(14, 20), r.float(12, 18), 'support');
      addMate(sc, 2, GX + r.float(-8, 8), r.float(30, 40), 'support');
      addOpp(sc, 0, GX + r.float(-6, 6), r.float(15, 19), 'press');
      addOpp(sc, 1, r.float(22, 28), r.float(24, 30), 'zone');
      addOpp(sc, 2, W - r.float(22, 28), r.float(26, 32), 'zone');
      sc.tMax = 5;
      sc.title = 'توزيع الكرة';
      sc.msg = 'مرر لزميل حر أو ارمِ كرة طويلة';
      sc.build = true;
      sc.deep = true;
    },
  };

  // ================= الركل =================

  // مهارة الدقة للتسديد أو التمرير
  function skillFor(e, kind, d) {
    const a = e.a;
    if (e.role === 'gk' || (e.pos === 'GK' && kind !== 'shot')) return 0.5 * a.gkic + 0.3 * a.spas + 0.2 * a.cmp;
    if (kind === 'shot') return d > 18 ? 0.55 * a.lng + 0.25 * a.pow + 0.2 * a.cmp : 0.6 * a.fin + 0.4 * a.cmp;
    if (kind === 'long') return 0.6 * a.lpas + 0.25 * a.vis + 0.15 * a.cur;
    return 0.6 * a.spas + 0.3 * a.vis + 0.1 * a.cmp;
  }

  // انحراف الدقة (راديان)
  function sigmaFor(sc, e, kind, power, d) {
    const B = P();
    let s = B.aimSigma * Math.exp(-B.aimSkillK * (skillFor(e, kind, d) - 70));
    if (kind !== 'shot') s *= 0.55;
    s *= 1 + pressureOn(sc, e) * B.pressureK;
    s *= 1 + (hyp(e.vx, e.vy) / e.max) * B.runningK;
    if (e.role === 'user') {
      s *= 1 + ((100 - (e.fit || 100)) / 100) * B.fatigueK;
      s *= B.diffAim[sc.diff] || 1;
      if (sc.pd.derby && !sc.pd.calm) s *= 1.04;
      if (sc.pd.calm) s *= FC.BAL.life ? FC.BAL.life.mentalCalm : 0.96;
    }
    if (power > B.overPower) s *= 1 + (power - B.overPower) * 3;
    if (kind === 'shot' && d > 16) s *= 1 + (d - 16) * 0.02;
    return s;
  }

  // ركل الكرة: dir زاوية، v سرعة أفقية، vz سرعة عمودية
  function kickRaw(sc, e, ang, v, vz, spin, kind) {
    const b = sc.ball;
    b.owner = null;
    b.x = e.x + Math.cos(ang) * 0.5;
    b.y = e.y + Math.sin(ang) * 0.5;
    b.z = 0.05;
    b.vx = Math.cos(ang) * v;
    b.vy = Math.sin(ang) * v;
    b.vz = vz;
    b.spin = spin || 0;
    b.lastBy = e;
    b.kickT = sc.t;
    b.kind = kind;
    b.kickFrom = { x: e.x, y: e.y };
    e.busyUntil = sc.t + 0.35;
    sc.fx.push({ t: 'kick', x: b.x, y: b.y, kind });
    sc.path = predict(b, 3);
    // المدافعون يتفاعلون بعد زمن رد الفعل
    const react = P().defReact - (P().diffReact[sc.diff] || 0) * (e.side === 'A' ? -1 : 1);
    sc.ents.forEach((o) => {
      if (o !== e) o.reactAt = sc.t + Math.max(0.05, react - (o.a.rea - 60) * 0.004) + (o.mode === 'line' ? P().lineReact : 0);
    });
  }

  // تسديدة: tx هدف أفقي على خط المرمى، power 0..1، lofted = كرة ساقطة (chip)
  function shoot(sc, e, ang, power, lofted, extraSigma) {
    const B = P();
    const a = e.a;
    const dG = hyp(GX - e.x, L - e.y);
    let sig = sigmaFor(sc, e, 'shot', power, dG);
    let weak = false;
    if (e.role === 'user' && sc.rng.chance(B.weakFootChance)) {
      weak = true;
      sig *= 1 + (5 - (sc.pd.me.wf || 3)) * B.weakFootPenalty;
    }
    if (extraSigma) sig = hyp(sig, extraSigma);
    // التسديد من أول لمسة أصعب
    if (sc.t - (e.hasT || -9) < 0.45) sig *= 1.25;
    const angN = ang + sc.rng.normal(0, sig);
    const vmax = B.shotSpeedMin + (B.shotSpeedMax - B.shotSpeedMin) * ((a.pow - 20) / 79);
    let v;
    let vz;
    if (lofted) {
      v = U.lerp(9, 17, power);
      const T = dG / (v * 0.9);
      vz = U.clamp((2.1 + (B.gravity * T * T) / 2) / T + sc.rng.normal(0, sig * 18), 3, 11);
    } else {
      v = U.lerp(9, vmax, power);
      const T = dG / (v * 0.93);
      let tz = 0.25 + power * power * 1.55 + Math.abs(sc.rng.normal(0, 0.25 + sig * 6));
      if (power > B.overPower) tz += (power - B.overPower) * 9;
      vz = Math.max(0, (tz + (B.gravity * T * T) / 2) / T);
    }
    const spin = sc.rng.normal(0, 0.8);
    kickRaw(sc, e, angN, v, vz, spin, 'shot');
    const d = hyp(GX - e.x, L - e.y);
    sc.shot = { by: e, active: true, type: shotTypeAt(sc, e, d), weak, d, t0: sc.t };
    if (e.role === 'user') sc.shotUser = true;
    resolveShot(sc);
    return sc.shot;
  }

  // نوع التسديدة للإحصائيات: محققة / نصف فرصة / بعيدة
  function shotTypeAt(sc, e, d) {
    if (d > 17.5) return 'long';
    const n = nearestOpp(sc, e);
    if (d < 15 && n.d > 1.6) return 'big';
    return 'half';
  }

  // حسم التسديدة لحظة ضربها: صد دفاعي؟ خارج المرمى؟ هل يصل الحارس؟
  function resolveShot(sc) {
    const B = P();
    const b = sc.ball;
    const sh = sc.shot;
    const e = sh.by;
    // صد من مدافع قريب من مسار الكرة
    for (const o of sc.opps) {
      const pts = sc.path;
      for (const p of pts) {
        if (p.t < 0.06 || p.z > 1.9) continue;
        const need = dist(o, p) - 0.35;
        const canMove = Math.max(0, p.t - 0.12) * o.max;
        if (need <= 0.55 + Math.min(0.5, canMove * 0.4)) {
          const pr = B.blockBase * (0.6 + o.a.intc / 200) * (1 - Math.max(0, need) / 1.1);
          if (sc.rng.next() < pr) {
            sh.outcome = 'blocked';
            sh.blockAt = { x: p.x, y: p.y, t: p.t, by: o };
            return;
          }
          break;
        }
      }
    }
    const cr = crossing(b);
    if (!cr) {
      // الكرة لا تصل للمرمى: الحارس يلتقطها
      sh.outcome = 'saved';
      sh.weakShot = true;
      sh.saveT = 1.2;
      return;
    }
    sh.cross = cr;
    const onTarget = Math.abs(cr.x - GX) < POST - 0.11 && cr.z < BAR - 0.11 && cr.z >= 0;
    if (!onTarget) {
      sh.outcome = 'off';
      sh.post = Math.abs(Math.abs(cr.x - GX) - POST) < 0.15 || Math.abs(cr.z - BAR) < 0.12;
      return;
    }
    // الحارس
    const gk = sc.gk;
    if (!gk) {
      sh.outcome = 'goal';
      return;
    }
    const ga = gk.a;
    // متى وأين تمر الكرة بعمق الحارس؟
    let pg = null;
    for (const p of sc.path) {
      if (p.y >= gk.y - 0.1) {
        pg = p;
        break;
      }
    }
    if (!pg) pg = { t: cr.t, x: cr.x, z: cr.z };
    const react = B.gkReact - B.gkReactK * (ga.gref - 70) + (P().diffReact[sc.diff] || 0);
    const speed = B.gkDive * (1 + B.gkDiveK * (ga.gdiv - 70));
    let reach = B.gkReach + (ga.gpos - 70) / 220;
    if (pg.z > 1.85) reach -= B.gkHighPenalty;
    if (pg.z > 2.7) reach = -1; // فوق الحارس (كرة ساقطة)
    const lateral = Math.abs(pg.x - gk.x);
    const covered = Math.max(0, pg.t - react) * speed;
    let pSave = 0;
    if (reach > 0) {
      if (lateral <= reach * 0.6) pSave = 0.96;
      else if (lateral <= reach + covered) {
        // كلما زاد الوقت الفائض عند الحارس زادت فرصة التصدي
        const slack = reach + covered - lateral;
        pSave = B.gkHold * (B.gkCloseCall + (1 - B.gkCloseCall) * U.clamp(slack / B.gkSlack, 0, 1));
      }
    }
    pSave *= 0.93 + ga.ghan / 1400;
    sh.gkPoint = { x: pg.x, z: pg.z, t: pg.t };
    sh.pSave = pSave;
    if (sc.rng.next() < pSave) {
      sh.outcome = 'saved';
      sh.saveT = pg.t;
      sh.catch = sc.rng.chance(0.35 + ga.ghan / 300);
    } else sh.outcome = 'goal';
    // الحارس يرتمي (للرسم)
    gk.dive = { at: sc.t + react, tx: sh.outcome === 'saved' ? pg.x : pg.x - Math.sign(pg.x - gk.x) * Math.max(0.2, lateral - reach - covered) , speed };
  }

  // تمريرة أرضية أو عالية نحو نقطة
  function passTo(sc, e, tx, ty, lofted, extraSigma, target) {
    const B = P();
    const d = hyp(tx - e.x, ty - e.y);
    const kind = lofted || d > 30 ? 'long' : 'pass';
    let sig = sigmaFor(sc, e, kind, 0.6, d);
    if (extraSigma) sig = hyp(sig, extraSigma);
    const ang = Math.atan2(ty - e.y, tx - e.x) + sc.rng.normal(0, sig);
    let v;
    let vz = 0;
    if (lofted) {
      vz = U.clamp(4 + d * 0.16, 5, 10);
      const T = (2 * vz) / B.gravity;
      v = (d / T) * 1.05;
    } else {
      v = U.clamp(Math.sqrt(8 * 8 + 2 * (B.friction + 0.5) * d), 9, 26);
    }
    kickRaw(sc, e, ang, v, vz, 0, lofted ? 'lob' : 'pass');
    sc.passTarget = target || null;
    if (e.role === 'user') {
      sc.stats.pas++;
      sc.lastPasser = 'user';
    } else sc.lastPasser = e;
  }

  // ================= الذكاء الاصطناعي =================

  // أفضل نقطة لاعتراض الكرة المتحركة
  function interceptPoint(sc, e) {
    if (!sc.path) return null;
    const dt0 = sc.t - sc.ball.kickT;
    for (const p of sc.path) {
      if (p.t < dt0) continue;
      if (p.z > (e.role === 'gk' ? 2.6 : 1.6)) continue;
      const need = dist(e, p) / e.max + 0.1;
      if (need <= p.t - dt0 + 0.05) return p;
    }
    const last = sc.path[sc.path.length - 1];
    return last && last.stop ? last : null;
  }

  function think(sc, e) {
    const b = sc.ball;
    const owner = b.owner;
    const free = !owner && !(sc.shot && sc.shot.active);
    if (e.role === 'gk') return thinkGK(sc, e);
    if (sc.t < (e.reactAt || 0)) return;
    if (free && hyp(b.vx, b.vy) > 0.3) {
      // الكرة متحركة: من يستطيع الوصول إليها؟
      const p = interceptPoint(sc, e);
      const intended = sc.passTarget === e;
      if (p && (intended || e.side === 'D' || dist(e, p) < 9)) {
        e.tx = p.x;
        e.ty = p.y;
        return;
      }
    } else if (free) {
      if (dist(e, b) < 12) {
        e.tx = b.x;
        e.ty = b.y;
        return;
      }
    }
    if (e === owner) {
      if (e.role === 'user') {
        if (sc.userMove) {
          e.tx = sc.userMove.x;
          e.ty = sc.userMove.y;
        } else if (e.mode === 'carry') {
          const gy = Math.min(L - 8.5, e.y + 20);
          const u = unit(GX - e.x, gy - e.y);
          e.tx = e.x + u[0] * 5;
          e.ty = e.y + u[1] * 5;
        } else {
          e.tx = e.x;
          e.ty = e.y;
        }
      } else mateCarry(sc, e);
      return;
    }
    if (e.side === 'D') {
      if (owner && (e.mode === 'press' || dist(e, owner) < 3.2)) {
        // اضغط على حامل الكرة من جهة المرمى
        const u = unit(owner.x - e.x, owner.y - e.y);
        e.tx = owner.x - u[0] * 0.5;
        e.ty = owner.y - u[1] * 0.5 + (e.y > owner.y ? 0.3 : 0);
      } else if (e.markT) {
        if (!e.markAt || sc.t >= e.markAt) {
          e.markAt = sc.t + 0.45;
          e.mx = e.markT.x + (GX - e.markT.x) * 0.1;
          e.my = Math.max(e.markT.y + 1.2, e.home.y - 3);
        }
        e.tx = e.mx;
        e.ty = e.my;
      } else if (e.mode === 'line') {
        // خط دفاع ثابت: يتحرك جانبياً مع الكرة، ويرجع إذا تجاوزه المهاجم
        const tgt = owner || b;
        if (owner && owner.side === 'A' && owner.y > e.y + 1) {
          e.tx = (owner.x + GX) / 2;
          e.ty = Math.min(L - 3, owner.y + 3);
          e.turn = true;
        } else {
          e.tx = e.home.x * 0.8 + tgt.x * 0.2;
          e.ty = e.home.y;
        }
      } else if (e.mode === 'zone') {
        // منطقة: قرب موقعه مع ميل بسيط نحو الكرة
        const tgt = owner || b;
        e.tx = e.home.x * 0.8 + tgt.x * 0.2;
        e.ty = e.home.y + (tgt.y - e.home.y) * 0.1;
      } else if (e.mode === 'recover' || e.mode === 'retreat') {
        const tgt = owner || b;
        e.tx = (tgt.x + GX) / 2;
        e.ty = Math.min(L - 4, Math.max(tgt.y + 5, e.y));
      } else {
        // تغطية: بين الكرة والمرمى مع إزاحة جانبية
        const tgt = owner || b;
        e.tx = e.home.x * 0.6 + tgt.x * 0.4;
        e.ty = Math.max(e.home.y, tgt.y + 3);
        // راقب أقرب مهاجم متحرك
        let near = null;
        let nd = 7;
        sc.ents.forEach((o) => {
          if (o.side === 'A' && o !== owner && dist(o, e) < nd) {
            nd = dist(o, e);
            near = o;
          }
        });
        if (near) {
          e.tx = (e.tx + near.x) / 2;
          e.ty = Math.max(near.y + 1, (e.ty + near.y) / 2);
        }
      }
      return;
    }
    // أنت بدون كرة: تتقدم لطلب الكرة من جديد (مرر وخذ)
    if (e.role === 'user') {
      if (!e.runTo) e.runTo = { x: U.clamp(e.x + (GX - e.x) * 0.25, 3, W - 3), y: Math.min(L - 11, e.y + 9) };
      e.tx = e.runTo.x;
      e.ty = e.runTo.y;
      return;
    }
    // زميل بدون كرة
    if (e.mode === 'run') {
      if (sc.t >= (e.runDelay || 0)) {
        e.tx = e.home.x;
        e.ty = e.home.y;
      } else {
        e.tx = e.x;
        e.ty = e.y;
      }
    } else {
      // دعم: ابحث عن مساحة بعيداً عن المدافعين
      const base = e.home;
      let bx = base.x;
      let by = base.y + (owner && owner.side === 'A' ? Math.max(0, owner.y - sc.user.y) * 0.5 : 0);
      sc.opps.forEach((o) => {
        const d = hyp(o.x - bx, o.y - by);
        if (d < 4) {
          const u = unit(bx - o.x, by - o.y);
          bx += u[0] * (4 - d);
          by += u[1] * (4 - d) * 0.5;
        }
      });
      e.tx = U.clamp(bx, 2, W - 2);
      e.ty = U.clamp(by, 2, L - 2);
    }
  }

  // الحارس: يغلق الزاوية ويخرج في الانفراد
  function thinkGK(sc, e) {
    const b = sc.ball;
    if (e.dive) {
      if (sc.t >= e.dive.at) {
        e.tx = e.dive.tx;
        e.ty = e.y;
        e.max = e.dive.speed;
      }
      return;
    }
    const owner = b.owner;
    const src = owner || b;
    const dG = hyp(src.x - GX, src.y - L);
    let d = U.clamp(0.6 + dG * 0.07, 0.6, 3.2);
    // انفراد: لا مدافع بين الكرة والمرمى
    if (owner && owner.side === 'A' && dG < P().gkRushDist) {
      const blocked = sc.opps.some((o) => o.y > owner.y && Math.abs(o.x - owner.x) < 3 && hyp(o.x - owner.x, o.y - owner.y) < 8);
      if (!blocked) d = U.clamp(dG * 0.45, 1, 7);
    }
    const u = unit(src.x - GX, src.y - L);
    e.tx = GX + u[0] * d;
    e.ty = L + u[1] * d;
    if (e.ty > L - 0.5) e.ty = L - 0.5;
  }

  // الزميل يحمل الكرة: يسدد أو يمرر أو يتقدم
  function mateCarry(sc, e) {
    const held = sc.t - e.hasT;
    const dG = hyp(GX - e.x, L - e.y);
    const pr = nearestOpp(sc, e);
    const angOK = Math.abs(e.x - GX) < 20;
    const u = unit(GX - e.x, L - 9 - e.y);
    e.tx = e.x + u[0] * 4;
    e.ty = e.y + u[1] * 4;
    if (held < 0.28) return;
    if (dG < 21 && angOK && (dG < 13.5 || pr.d < 1.1 || held > 3)) {
      aiShoot(sc, e, 0);
      return;
    }
    // إعادة الكرة لك (مرر وخذ)
    const me = sc.user;
    if (sc.give && held > 0.35 && me && me.y > e.y - 2 && nearestOpp(sc, me).d > 3 && hyp(GX - me.x, L - me.y) < dG) {
      passTo(sc, e, me.x + me.vx * 0.4, me.y + me.vy * 0.4 + 1, false, 0, me);
      return;
    }
    if (held > 3.4) end(sc, 'kept');
  }

  // تسديدة الذكاء الاصطناعي نحو الزاوية البعيدة عن الحارس
  function aiShoot(sc, e, extraSigma) {
    const gk = sc.gk;
    const side = gk ? (gk.x <= GX ? 1 : -1) : sc.rng.chance(0.5) ? 1 : -1;
    const tx = GX + side * (POST - 0.85 - sc.rng.float(0, 0.6));
    const ang = Math.atan2(L - e.y, tx - e.x);
    const dG = hyp(GX - e.x, L - e.y);
    const chip = gk && dist(gk, e) < 5.5 && dG > 9 && sc.rng.chance(0.25);
    const power = chip ? 0.55 : U.clamp(0.72 + sc.rng.float(0, 0.12) + (dG > 18 ? 0.05 : 0), 0, 0.9);
    shoot(sc, e, ang, power, chip, extraSigma);
  }

  // ================= اللعب التلقائي لك («لاعب بشري متوسط») =================

  // هامش أمان ممر التمرير (ثوانٍ): موجب = الكرة تصل قبل أي مدافع
  function laneMargin(sc, from, to) {
    const d = hyp(to.x - from.x, to.y - from.y) || 1;
    const v = 12;
    let min = 9;
    for (const o of sc.opps) {
      const t = U.clamp(((o.x - from.x) * (to.x - from.x) + (o.y - from.y) * (to.y - from.y)) / (d * d), 0, 1);
      const px = from.x + (to.x - from.x) * t;
      const py = from.y + (to.y - from.y) * t;
      const tb = (t * d) / v;
      const td = Math.max(0, hyp(o.x - px, o.y - py) - 0.9) / o.max + 0.3;
      min = Math.min(min, td - tb);
    }
    return min;
  }

  // اختيار أفضل زميل للتمرير (أمان الممر + التقدم للأمام)
  function bestPass(sc, e, preferFwd) {
    let best = null;
    let bs = -1e9;
    sc.mates.forEach((m) => {
      const to = { x: m.x + m.vx * 0.5, y: m.y + m.vy * 0.5 };
      const mg = laneMargin(sc, e, to);
      const prog = to.y - e.y;
      const sc0 = Math.min(mg, 1.2) * 2 + (preferFwd ? prog * 0.06 : 0) - (nearestOpp(sc, m).d < 1.5 ? 1 : 0);
      if (sc0 > bs) {
        bs = sc0;
        best = { m, to, mg };
      }
    });
    return best;
  }

  function autoAct(sc) {
    const e = sc.user;
    if (sc.ball.owner !== e || sc.t < sc.autoAt) return;
    const held = sc.t - (e.hasT || 0);
    const dG = hyp(GX - e.x, L - e.y);
    const pr = nearestOpp(sc, e);
    const hn = sc.humanNoise;
    const scen = sc.pd.scen;
    if (!sc.autoPlan) sc.autoPlan = { wait: sc.rng.float(0.35, 0.85), shootDist: sc.rng.float(10.5, 14) };
    const plan = sc.autoPlan;
    if (scen === 'oneOnOne') {
      const gkd = sc.gk ? dist(sc.gk, e) : 99;
      if (dG < plan.shootDist || gkd < 5.5 || pr.d < 1.3 || held > 3.2) aiShoot(sc, e, hn);
      return;
    }
    if (held < plan.wait && pr.d > 1.3) return;
    if (scen === 'boxShot' || scen === 'longShot') {
      const bp = bestPass(sc, e, true);
      if (bp && bp.mg > 0.4 && sc.rng.chance(scen === 'longShot' ? 0.3 : 0.15)) passTo(sc, e, bp.to.x, bp.to.y + 0.5, false, hn * 0.6, bp.m);
      else aiShoot(sc, e, hn);
      return;
    }
    if (scen === 'throughBall') {
      const r = sc.mates[0];
      if (!r) return aiShoot(sc, e, hn);
      const started = sc.t >= (r.runDelay || 0) + 0.25;
      if (!started && held < 1.6) return;
      const u = unit(r.vx || 0.01, r.vy || 1);
      const tx = U.clamp(r.x + u[0] * 6, 4, W - 4);
      const ty = Math.min(L - 7, r.y + Math.max(u[1], 0.6) * 7);
      passTo(sc, e, tx, ty, false, hn * 0.7, r);
      return;
    }
    if (scen === 'cutback') {
      const m = sc.mates[0];
      if (m) passTo(sc, e, m.x + m.vx * 0.4, m.y + m.vy * 0.4, false, hn * 0.6, m);
      else aiShoot(sc, e, hn);
      return;
    }
    if (scen === 'counter') {
      if (dG > 29 && pr.d > 2.2 && held < 3) return;
      const bp = bestPass(sc, e, true);
      if (dG < 22 && (!bp || bp.mg < 0.5 || sc.rng.chance(0.4))) return aiShoot(sc, e, hn);
      if (bp) passTo(sc, e, bp.to.x, bp.to.y + 0.8, false, hn * 0.6, bp.m);
      return;
    }
    // بناء: أفضل ممر آمن للأمام (مع خطأ بشري أحياناً)
    let bp = bestPass(sc, e, !sc.deep || sc.rng.chance(0.5));
    if (!bp) return;
    if (!plan.err) plan.err = sc.rng.chance(0.22) ? 1 : -1;
    if (plan.err > 0) {
      const m = sc.rng.pick(sc.mates);
      bp = { m, to: { x: m.x + m.vx * 0.5, y: m.y + m.vy * 0.5 }, mg: 1 };
    }
    if (bp.mg < 0.15 && pr.d > 1.6 && held < 2.2) return; // انتظر فتح ممر
    passTo(sc, e, bp.to.x, bp.to.y + 0.4, false, hn * 0.6, bp.m);
  }

  // ================= الحركة والتلامس =================
  function move(sc, e, dt) {
    let tx = e.tx;
    let ty = e.ty;
    let max = e.max * (e.turn ? 0.82 : 1);
    const b = sc.ball;
    if (b.owner === e) {
      max *= e.role === 'mate' ? 0.9 : P().dribbleSlow * (!sc.userMove ? e.carrySlow || 0.7 : 1);
    }
    const dx = tx - e.x;
    const dy = ty - e.y;
    const d = hyp(dx, dy);
    let dvx = 0;
    let dvy = 0;
    if (d > 0.15) {
      const want = Math.min(max, d * 2.5);
      dvx = (dx / d) * want;
      dvy = (dy / d) * want;
    }
    const ax = dvx - e.vx;
    const ay = dvy - e.vy;
    const am = hyp(ax, ay);
    const step = e.acc * dt;
    if (am > step) {
      e.vx += (ax / am) * step;
      e.vy += (ay / am) * step;
    } else {
      e.vx = dvx;
      e.vy = dvy;
    }
    e.x = U.clamp(e.x + e.vx * dt, -1, W + 1);
    e.y = U.clamp(e.y + e.vy * dt, -1, L + 0.5);
    if (hyp(e.vx, e.vy) > 0.4) e.face = Math.atan2(e.vy, e.vx);
    if (b.owner === e) {
      b.x = e.x + Math.cos(e.face) * 0.55;
      b.y = e.y + Math.sin(e.face) * 0.55;
      b.vx = e.vx;
      b.vy = e.vy;
    }
  }

  // الافتكاك: مدافع قريب من حامل الكرة
  function tackles(sc, dt) {
    const b = sc.ball;
    const o = b.owner;
    if (!o || o.side !== 'A') return;
    const B = P();
    for (const d of sc.opps) {
      d.cool -= dt;
      if (d.cool > 0) continue;
      const dd = dist(d, o);
      if (dd > B.tackleRange) continue;
      if (sc.t - (o.hasT || 0) < 0.25) continue;
      d.cool = B.tackleCooldown;
      const def = 0.5 * d.a.tak + 0.3 * d.a.dawa + 0.2 * d.a.str;
      const att = 0.4 * o.a.dri + 0.3 * o.a.ctl + 0.2 * o.a.bal + 0.1 * o.a.str;
      const behind = d.y < o.y - 0.4 ? 0.65 : 1;
      let p = B.tackleBase * Math.exp(0.035 * (def - att)) * behind;
      if (o.role === 'user') p *= 1 + (P().diffReact[sc.diff] || 0) * -2;
      if (sc.rng.next() < U.clamp(p, 0.05, 0.85)) {
        sc.fx.push({ t: 'tackle', x: o.x, y: o.y });
        lose(sc, o, 'tackle');
        return;
      }
      if (o.role === 'user') sc.stats.drb++;
      sc.fx.push({ t: 'dodge', x: o.x, y: o.y });
    }
    // الحارس يخرج ويخطف الكرة
    const gk = sc.gk;
    if (gk && !gk.dive && dist(gk, o) < 1.2 && sc.t - (o.hasT || 0) > 0.2) {
      gk.cool = (gk.cool || 0) - dt;
      if (gk.cool <= 0) {
        gk.cool = 0.7;
        const p = 0.3 * Math.exp(0.03 * ((gk.a.gdiv + gk.a.gref) / 2 - o.a.dri));
        if (sc.rng.next() < p) {
          sc.fx.push({ t: 'save', x: gk.x, y: gk.y });
          lose(sc, o, 'gk');
        }
      }
    }
  }

  // لمس الكرة الحرة: استلام أو قطع
  function contacts(sc) {
    const b = sc.ball;
    if (b.owner || (sc.shot && sc.shot.active)) return;
    let best = null;
    let bd = 1e9;
    for (const e of sc.ents) {
      if (b.lastBy === e && sc.t - b.kickT < 0.3) continue;
      if (e.noTouch && sc.t < e.noTouch) continue;
      const reach = e.role === 'gk' ? 1.5 : 0.95;
      const zMax = e.role === 'gk' ? 2.7 : 2.2;
      const d = hyp(e.x - b.x, e.y - b.y);
      if (d < reach && b.z < zMax && d < bd) {
        bd = d;
        best = e;
      }
    }
    if (!best) return;
    const sp = hyp(b.vx, b.vy);
    if (best.side === 'D') {
      const B = P();
      const pInt = best.role === 'gk' ? 0.95 : U.clamp(B.interceptBase + (best.a.intc - 60) / 140 - Math.max(0, sp - 14) * 0.02, 0.2, 0.95);
      if (sc.rng.next() < pInt) {
        sc.fx.push({ t: 'intercept', x: b.x, y: b.y });
        lose(sc, b.lastBy, 'intercept');
      } else {
        best.noTouch = sc.t + 0.6;
        const a = Math.atan2(b.vy, b.vx) + sc.rng.normal(0, 0.7);
        b.vx = Math.cos(a) * sp * 0.55;
        b.vy = Math.sin(a) * sp * 0.55;
        sc.path = predict(b, 2);
      }
      return;
    }
    // مهاجم: رأسية لزميل في المنطقة إذا كانت الكرة عالية
    if (b.z > 1.2) {
      if (best.role === 'mate' && hyp(GX - best.x, L - best.y) < 15) return header(sc, best);
      if (b.z > 1.6) return;
    }
    // سرعة عالية = صعوبة في الاستلام
    const ctl = best.a.ctl;
    if (sp > 16 + ctl / 12 && sc.rng.chance(0.45)) {
      best.noTouch = sc.t + 0.4;
      b.vx *= 0.5;
      b.vy *= 0.5;
      sc.path = predict(b, 2);
      return;
    }
    receive(sc, best);
  }

  function receive(sc, e) {
    const b = sc.ball;
    const kicker = b.lastBy;
    b.owner = e;
    b.z = 0;
    b.vz = 0;
    e.hasT = sc.t;
    e.runTo = null;
    sc.passTarget = null;
    if (kicker && kicker !== e && kicker.side === 'A' && b.kind !== 'shot') {
      if (kicker.role === 'user') {
        sc.stats.pasOk++;
        sc.lastPass = 'user';
        sc.passerIdx = null;
      } else {
        sc.lastPass = 'mate';
        sc.passerIdx = kicker.idx;
      }
    }
    sc.fx.push({ t: 'receive', x: e.x, y: e.y });
    // تمريرة مفتاحية: تقدم 12م على الأقل وتجاوز مدافع
    if (e.role === 'mate' && kicker && kicker.role === 'user' && b.kickFrom) {
      const gain = e.y - b.kickFrom.y;
      const passed = sc.opps.some((o) => o.y > b.kickFrom.y + 1 && o.y < e.y - 0.5);
      if (gain >= 12 && passed) sc.progPass = true;
    }
    // نجاح البناء: زميل استلم تمريرتك في موقع جيد
    if (e.role === 'mate' && kicker && kicker.role === 'user' && sc.build) {
      const dG = hyp(GX - e.x, L - e.y);
      if (sc.deep || dG > (sc.pd.scen === 'counter' ? 32 : 26)) sc.endAtKept = sc.t + (sc.deep ? 0.6 : 0.8);
    }
  }

  // رأسية زميل من كرة عالية
  function header(sc, e) {
    const b = sc.ball;
    const kicker = b.lastBy;
    if (kicker && kicker.role === 'user') {
      sc.stats.pasOk++;
      sc.lastPass = 'user';
    }
    b.owner = null;
    b.x = e.x;
    b.y = e.y;
    b.z = 1.9;
    const gk = sc.gk;
    const side = gk ? (gk.x <= GX ? 1 : -1) : 1;
    const tx = GX + side * (POST - 0.8);
    const a = e.a;
    const sig = 0.09 * Math.exp(-0.02 * (0.7 * a.hea + 0.3 * a.jmp - 70));
    const ang = Math.atan2(L - e.y, tx - e.x) + sc.rng.normal(0, sig);
    const v = 11 + a.hea / 12;
    b.vx = Math.cos(ang) * v;
    b.vy = Math.sin(ang) * v;
    b.vz = -1 + sc.rng.normal(0, 1.2);
    b.lastBy = e;
    b.kickT = sc.t;
    b.kind = 'shot';
    sc.path = predict(b, 3);
    sc.shot = { by: e, active: true, type: 'header', d: hyp(GX - e.x, L - e.y), t0: sc.t };
    sc.fx.push({ t: 'header', x: e.x, y: e.y });
    resolveShot(sc);
  }

  // خسارة الكرة
  function lose(sc, by, how) {
    if (by && by.role === 'user') {
      if (sc.deep) sc.stats.badLoss++;
      else sc.stats.loss++;
    }
    const b = sc.ball;
    b.owner = null;
    b.vx *= 0.2;
    b.vy *= 0.2;
    end(sc, 'lost', { how });
  }

  // تقدم التسديدة المحسومة (رسم النتيجة)
  function shotProgress(sc) {
    const sh = sc.shot;
    if (!sh || !sh.active) return;
    const b = sc.ball;
    const el = sc.t - sh.t0;
    if (sh.outcome === 'blocked' && el >= sh.blockAt.t) {
      sh.active = false;
      const a = Math.atan2(b.vy, b.vx) + Math.PI + sc.rng.normal(0, 0.9);
      const sp = hyp(b.vx, b.vy) * 0.3;
      b.vx = Math.cos(a) * sp;
      b.vy = Math.sin(a) * sp;
      b.vz = Math.abs(b.vz) * 0.3;
      sc.fx.push({ t: 'block', x: b.x, y: b.y });
      return end(sc, 'blocked');
    }
    if (sh.outcome === 'saved' && el >= sh.saveT) {
      sh.active = false;
      sc.fx.push({ t: 'save', x: b.x, y: b.y });
      if (sh.catch || sh.weakShot) {
        b.vx = b.vy = b.vz = 0;
        if (sc.gk) {
          b.x = sc.gk.x;
          b.y = sc.gk.y;
        }
      } else {
        const a = -Math.PI / 2 + sc.rng.normal(0, 0.9);
        const sp = hyp(b.vx, b.vy) * 0.35;
        b.vx = Math.cos(a) * sp;
        b.vy = Math.sin(a) * sp;
        b.vz = 2;
      }
      return end(sc, 'saved');
    }
    if (b.y >= L) {
      if (sh.outcome === 'goal') {
        if (!sh.netted) {
          sh.netted = true;
          sc.fx.push({ t: 'goal', x: b.x, y: b.y });
        }
        if (b.y > L + 1.6) {
          b.vx *= 0.1;
          b.vy = 0;
          b.y = L + 1.6;
          sh.active = false;
          return end(sc, 'goal');
        }
      } else if (sh.outcome === 'off') {
        sh.active = false;
        sc.fx.push({ t: sh.post ? 'post' : 'miss', x: b.x, y: b.y });
        return end(sc, 'off');
      }
    }
    if (el > 4) {
      sh.active = false;
      end(sc, sh.outcome === 'goal' ? 'goal' : sh.outcome);
    }
  }

  // إنهاء اللحظة وتجهيز النتيجة للمحرك
  function end(sc, outcome, extra) {
    if (sc.result) return;
    const sh = sc.shot;
    const res = {
      outcome,
      shooter: null, mateIdx: null, shotType: null,
      lastPass: null, passerIdx: null,
      stats: sc.stats,
      weak: sh ? !!sh.weak : false,
    };
    if (sh && ['goal', 'saved', 'off', 'blocked'].indexOf(outcome) >= 0) {
      res.shooter = sh.by.role === 'user' ? 'user' : 'mate';
      res.mateIdx = sh.by.role === 'mate' ? sh.by.idx : null;
      res.shotType = sh.type;
      res.lastPass = sc.lastPass;
      res.passerIdx = sc.passerIdx;
      // هل كانت آخر تمريرة من الشخص نفسه؟ (لا صناعة)
      if (res.shooter === 'user' && res.lastPass === 'user') res.lastPass = null;
      if (res.shooter === 'mate' && res.lastPass === 'mate' && res.passerIdx === res.mateIdx) res.lastPass = null;
    }
    if (extra) Object.assign(res, extra);
    sc.stats.kp = sc.progPass && res.shooter !== 'mate' ? 1 : 0;
    sc.result = res;
    sc.endAt = sc.t + (outcome === 'goal' ? 1.6 : 1.1);
  }

  // خطوة زمنية واحدة للمشهد
  function step(sc, dt) {
    if (sc.over) return;
    dt = dt || DT;
    sc.t += dt;
    if (sc.result) {
      // استمرار الحركة قليلاً بعد النهاية ثم الإغلاق
      sc.ents.forEach((e) => move(sc, e, dt));
      if (!sc.ball.owner) ballPhys(sc.ball, dt);
      if (sc.t >= sc.endAt) sc.over = true;
      return;
    }
    if (sc.auto && sc.ball.owner === sc.user) autoAct(sc);
    sc.ents.forEach((e) => think(sc, e));
    sc.ents.forEach((e) => move(sc, e, dt));
    if (!sc.ball.owner) ballPhys(sc.ball, dt);
    tackles(sc, dt);
    contacts(sc);
    shotProgress(sc);
    const b = sc.ball;
    if (sc.result) return;
    if (sc.endAtKept && sc.t >= sc.endAtKept) return end(sc, 'kept');
    if (!b.owner && !(sc.shot && sc.shot.active)) {
      if (b.x < 0 || b.x > W || b.y < 0 || b.y > L) return lose(sc, b.lastBy, 'out');
      if (hyp(b.vx, b.vy) < 0.2 && b.z <= 0 && sc.t - b.kickT > 0.8) {
        // كرة ميتة: الأقرب يأخذها
        let near = null;
        let nd = 1e9;
        sc.ents.forEach((e) => {
          const d = dist(e, b);
          if (d < nd) {
            nd = d;
            near = e;
          }
        });
        if (near && near.side === 'D' && nd < 1.5) return lose(sc, b.lastBy, 'dead');
      }
    }
    if (sc.t >= sc.tMax && !(sc.shot && sc.shot.active)) {
      if (b.owner && b.owner.role === 'mate' && sc.lastPass === 'user') end(sc, 'kept');
      else end(sc, 'fizzle');
    }
  }

  // ================= مدخلات اللاعب =================

  // هل الاتجاه نحو المرمى (تسديد) أم تمرير؟
  function kindFor(sc, ang) {
    const e = sc.user;
    const dy = Math.sin(ang);
    if (dy <= 0.05) return 'pass';
    const t = (L - e.y) / dy;
    const x = e.x + Math.cos(ang) * t;
    const dG = hyp(GX - e.x, L - e.y);
    return Math.abs(x - GX) < 9 && dG < 36 ? 'shot' : 'pass';
  }

  const Moment = (FC.Moment = {
    create, step, predict, crossing, ballPhys, GX, L, W, POST, BAR,

    // السحب من الكرة: الاتجاه (زاوية بالراديان على الملعب) والقوة 0..1
    inputKick(sc, ang, power) {
      const e = sc.user;
      if (sc.result || sc.ball.owner !== e) return null;
      const kind = kindFor(sc, ang);
      if (kind === 'shot') return shoot(sc, e, ang, power, sc.lofted, 0);
      // تمريرة في المساحة (بينية/طويلة/عرضية)
      const d = 6 + power * (sc.lofted ? 45 : 32);
      let target = null;
      let bd = 7;
      sc.mates.forEach((m) => {
        const px = e.x + Math.cos(ang) * d;
        const py = e.y + Math.sin(ang) * d;
        const dd = hyp(m.x - px, m.y - py);
        if (dd < bd) {
          bd = dd;
          target = m;
        }
      });
      passTo(sc, e, e.x + Math.cos(ang) * d, e.y + Math.sin(ang) * d, sc.lofted, 0, target);
      return { kind: 'pass' };
    },

    // الضغط على زميل: تمريرة أرضية له (مع حساب حركته)
    inputPass(sc, mate) {
      const e = sc.user;
      if (sc.result || sc.ball.owner !== e || !mate) return;
      const d = dist(e, mate);
      const lead = d / 16;
      passTo(sc, e, mate.x + mate.vx * lead, mate.y + mate.vy * lead + 0.4, sc.lofted, 0, mate);
    },

    // تحريك لاعبك (سحب اللاعب)
    inputMove(sc, x, y) {
      sc.userMove = x == null ? null : { x: U.clamp(x, 1, W - 1), y: U.clamp(y, 1, L - 1) };
    },

    setAuto(sc, on) {
      sc.auto = on;
      sc.autoAt = sc.t + 0.15;
    },

    // معاينة التصويب للواجهة: نوع الركلة والانحراف المتوقع
    aimInfo(sc, ang, power) {
      const e = sc.user;
      const kind = kindFor(sc, ang);
      const d = hyp(GX - e.x, L - e.y);
      return { kind, sigma: sigmaFor(sc, e, kind === 'shot' ? 'shot' : sc.lofted ? 'long' : 'pass', power, d), dist: d };
    },

    // تشغيل مشهد كامل بدون واجهة
    runHeadless(sc, maxT) {
      let guard = 0;
      const lim = (maxT || 20) / DT;
      while (!sc.over && guard++ < lim) step(sc, DT);
      if (!sc.result) end(sc, 'fizzle');
      return sc.result;
    },

    // شخص افتراضي لاختبار اللحظات
    testPerson(pos, ovr, id, name) {
      const p = { id: id || 1, pos, ovr, age: 26, ht: pos === 'GK' || pos === 'CB' ? 188 : 180 };
      const attrs = {};
      FC.Player.KEYS.forEach((k) => (attrs[k] = FC.Player.aiAttr(p, k)));
      return { pid: id || 1, name: name || 'لاعب', num: (id % 30) + 1, pos, role: FC.Player.POS[pos].role, attrs };
    },

    // لحظة اختبارية بدون مباراة
    testSpec(scen, ovrMe, ovrOpp, seed, posMe) {
      const T = Moment.testPerson;
      const me = T(posMe || 'ST', ovrMe, 900, 'أنت');
      me.fit = 95;
      me.wf = 3;
      return {
        kind: 'test', scen, seed, diff: 'real',
        me,
        mates: [T('ST', ovrOpp, 901), T('RW', ovrOpp, 902), T('CM', ovrOpp, 903)],
        opps: [T('CB', ovrOpp, 911), T('CB', ovrOpp, 912), T('RB', ovrOpp, 913), T('CDM', ovrOpp, 914)],
        gk: T('GK', ovrOpp, 920),
        kit: { mine: ['#1565c0', '#ffffff'], opp: ['#c62828', '#ffffff'] },
      };
    },

    // اختبار ذاتي: آلاف اللحظات بلاعب متوسط يلعب تلقائياً
    selfTest(n) {
      const run = (scen, ovr, k) => {
        let goals = 0;
        let shots = 0;
        let comp = 0;
        let mateGoals = 0;
        let mateShots = 0;
        for (let i = 0; i < k; i++) {
          const sc = create(Moment.testSpec(scen, ovr, 70, 1000 + i * 7919), { auto: true });
          const r = Moment.runHeadless(sc);
          if (r.shooter === 'user') {
            shots++;
            if (r.outcome === 'goal') goals++;
          }
          if (scen === 'throughBall' && sc.lastPass === 'user') comp++;
          if (r.shooter === 'mate') {
            mateShots++;
            if (r.outcome === 'goal') mateGoals++;
          }
        }
        return { conv: shots ? goals / shots : 0, comp: comp / k, mateConv: mateShots ? mateGoals / mateShots : 0, shots };
      };
      const big = run('oneOnOne', 70, n);
      const half = run('boxShot', 70, n);
      const long = run('longShot', 70, n);
      const tb = run('throughBall', 70, n);
      const b85 = run('oneOnOne', 85, Math.round(n / 2));
      const b55 = run('oneOnOne', 55, Math.round(n / 2));
      return { n, big: big.conv, half: half.conv, long: long.conv, through: tb.comp, throughConv: tb.mateConv, big85: b85.conv, big55: b55.conv };
    },
  });
})(globalThis);
