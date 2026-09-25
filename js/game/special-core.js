/* =========================================================
   اللحظات الخاصة (منطق بدون رسم — يُختبر في Node):
   هجوماً: ركلة جزاء، رأسية من عرضية، ركلة حرة مباشرة
   دفاعاً: مواجهة 1 ضد 1، إبعاد عرضية، تصدي الحارس، صد ركلة جزاء
   كل لحظة: «مدخلات» اللاعب (مكان التصويب، التوقيت...) + سماته ← نتيجة
   و«اللاعب البشري المتوسط» يولّد مدخلات واقعية للاختبار وللعب التلقائي
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC = G.FC || {};
  const U = FC.util;
  const GW = 7.32;
  const GH = 2.44;
  const hyp = Math.hypot;
  const BS = () => FC.BAL.special;

  // مهارة من سمات الشخص (0..1 حول 50 → 90)
  function sk(a, keys, w) {
    a = (a && a.attrs) || a || {}; // شخص من المباراة {attrs} أو سمات مباشرة
    let s = 0;
    let t = 0;
    keys.forEach((k, i) => {
      s += (a[k] || 50) * (w ? w[i] : 1);
      t += w ? w[i] : 1;
    });
    return U.clamp((s / t - 45) / 45, 0, 1.2);
  }

  const Core = {
    GW, GH,

    // ============ ركلة الجزاء (أنت المسدد) ============
    // input: {x, z (مكان التصويب بالمتر من منتصف المرمى)، power 0..1}
    pen(me, gk, input, rng, diff) {
      const B = BS();
      const s = sk(me, ['pen', 'cmp', 'fin'], [0.6, 0.3, 0.1]);
      const sig = B.penSigma * (1.35 - s * 0.6) * (FC.BAL.moments.diffAim[diff] || 1) * (input.power > 0.9 ? 1.5 : 1);
      const x = input.x + rng.normal(0, sig);
      const z = U.clamp(input.z + rng.normal(0, sig * 0.8) + (input.power > 0.9 ? (input.power - 0.9) * 6 : 0), 0.05, 4);
      const res = { x, z, gkX: 0, gkZ: 0.9 };
      if (Math.abs(x) > GW / 2 - 0.1 || z > GH - 0.05) {
        res.outcome = 'off';
        res.post = Math.abs(Math.abs(x) - GW / 2) < 0.2 || Math.abs(z - GH) < 0.15;
        return res;
      }
      // الحارس يخمّن جهة
      const g = gk ? sk(gk, ['gdiv', 'gref'], [0.5, 0.5]) : 0.3;
      const guess = [-1, 0, 1][rng.weighted(B.penGuess)];
      res.gkX = guess * 2.2;
      res.gkZ = rng.float(0.6, 1.4);
      const side = Math.abs(x) < 0.9 ? 0 : Math.sign(x);
      let pSave = 0;
      if (side === guess) {
        const corner = U.clamp((Math.abs(x) - 1.5) / 1.9, 0, 1) * 0.5 + U.clamp(Math.abs(z - 1.0) / 1.3, 0, 1) * 0.5;
        pSave = B.penSameSide * (1 - corner * 0.6) * (0.85 + g * 0.3) * (1.15 - (input.power || 0.8) * 0.3);
      } else if (guess === 0 && side !== 0) pSave = 0.04;
      else if (side === 0 && guess !== 0) pSave = 0.02 + (z < 1.9 ? 0.04 : 0);
      res.outcome = rng.next() < pSave ? 'saved' : 'goal';
      return res;
    },
    // اللاعب المتوسط: يختار زاوية ويخطئ قليلاً
    penAuto(rng) {
      const side = rng.weighted([0.42, 0.16, 0.42]) - 1;
      return { x: side * rng.float(1.9, 3.1), z: rng.float(0.25, 1.9), power: rng.float(0.65, 0.9) };
    },

    // ============ صد ركلة الجزاء (أنت الحارس) ============
    // input: {side: -1/0/1، early: هل ارتميت مبكراً جداً}
    penSave(me, shooter, input, rng) {
      const B = BS();
      const s = shooter ? sk(shooter, ['pen', 'cmp'], [0.7, 0.3]) : 0.5;
      const g = sk(me, ['gdiv', 'gref', 'ghan'], [0.45, 0.4, 0.15]);
      const shotSide = [-1, 0, 1][rng.weighted(B.penShooterSide)];
      const res = { shotSide, x: shotSide * rng.float(1.6, 3.2), z: rng.float(0.2, 2) };
      if (rng.next() < B.penOffBase * (1.3 - s * 0.6)) {
        res.outcome = 'off';
        return res;
      }
      let pSave = 0;
      if (input.side === shotSide) pSave = (shotSide === 0 ? 0.8 : B.penKeeperSame * (0.85 + g * 0.35)) * (input.early ? 0.75 : 1);
      else pSave = 0.03;
      res.outcome = rng.next() < pSave * (1.15 - s * 0.3) ? 'saved' : 'goal';
      return res;
    },
    penSaveAuto(rng) {
      return { side: [-1, 0, 1][rng.weighted([0.42, 0.16, 0.42])], early: rng.chance(0.2) };
    },

    // ============ الرأسية من عرضية ============
    // input: {err: خطأ التوقيت بالثواني، aim: -1 القائم القريب / 1 البعيد}
    header(me, gk, input, rng, diff) {
      const B = BS();
      const s = sk(me, ['hea', 'jmp', 'str'], [0.6, 0.3, 0.1]);
      const win = B.headWin * (0.75 + s * 0.5);
      const res = {};
      const e = Math.abs(input.err);
      if (e > win) {
        res.outcome = input.err < 0 ? 'early' : 'late';
        res.contact = false;
        return res;
      }
      res.contact = true;
      const q = 1 - e / win; // جودة التوقيت
      const g = gk ? sk(gk, ['gref', 'gdiv', 'gpos'], [0.4, 0.4, 0.2]) : 0.3;
      const onT = U.clamp(B.headOnT * (0.55 + q * 0.6) * (0.8 + s * 0.35) / (FC.BAL.moments.diffAim[diff] || 1), 0.05, 0.9);
      if (rng.next() >= onT) {
        res.outcome = 'off';
        return res;
      }
      const conv = U.clamp(B.headConv * (0.7 + q * 0.5) * (0.85 + s * 0.3) * (1.2 - g * 0.4), 0.03, 0.8);
      res.outcome = rng.next() < conv ? 'goal' : 'saved';
      res.aim = input.aim || 1;
      return res;
    },
    headerAuto(rng) {
      return { err: rng.normal(0, 0.16), aim: rng.chance(0.5) ? 1 : -1 };
    },

    // ============ الركلة الحرة المباشرة ============
    // input: {x, z مكان التصويب، curve -1..1، power 0..1}
    fk(me, gk, input, rng, diff) {
      const B = BS();
      const s = sk(me, ['cur', 'lng', 'pow'], [0.55, 0.3, 0.15]);
      const sig = B.fkSigma * (1.35 - s * 0.6) * (FC.BAL.moments.diffAim[diff] || 1);
      const x = input.x + rng.normal(0, sig);
      const z = input.z + rng.normal(0, sig * 0.7);
      const res = { x, z };
      // الجدار: الكرة المنخفضة في الوسط ترتطم به (الانحناء يساعد على الالتفاف)
      const wallZ = 0.9 + z * 0.5 + (input.power || 0.7) * 0.6 - Math.abs(input.curve || 0) * 0.15;
      if (Math.abs(x * 0.5 - (input.curve || 0) * 0.6) < B.fkWallHalf && wallZ < 1.95) {
        res.outcome = 'blocked';
        return res;
      }
      if (Math.abs(x) > GW / 2 - 0.08 || z > GH - 0.05 || z < 0) {
        res.outcome = 'off';
        res.post = Math.abs(Math.abs(x) - GW / 2) < 0.2;
        return res;
      }
      const g = gk ? sk(gk, ['gref', 'gdiv', 'gpos'], [0.4, 0.4, 0.2]) : 0.3;
      const corner = U.clamp((Math.abs(x) - 1.2) / 2.3, 0, 1) * 0.7 + U.clamp((z - 0.9) / 1.4, 0, 1) * 0.3;
      const conv = U.clamp(B.fkConv * (0.35 + corner * 1.4) * (0.8 + s * 0.4) * (1.2 - g * 0.4), 0.02, 0.75);
      res.outcome = rng.next() < conv ? 'goal' : 'saved';
      return res;
    },
    fkAuto(rng) {
      const side = rng.chance(0.5) ? 1 : -1;
      return { x: side * rng.float(1.2, 3.4), z: rng.float(1.0, 2.35), curve: side * rng.float(0.2, 0.9), power: rng.float(0.55, 0.85) };
    },

    // ============ تصدي الحارس ============
    // shot: {x, z, T} مكان التسديدة وزمن وصولها. input: {x, z مكان الارتماء، at: زمن الضغط، none: لم يرتمِ}
    gkShot(pd, rng) {
      const type = pd.type;
      const B = BS();
      const far = { big: [0.55, 0.7], half: [0.62, 0.8], long: [0.85, 1.1], header: [0.6, 0.75], fk: [0.9, 1.05] }[type] || [0.7, 0.9];
      const corner = rng.chance(type === 'long' ? 0.45 : 0.6);
      const x = (rng.chance(0.5) ? 1 : -1) * (corner ? rng.float(1.9, 3.35) : rng.float(0, 1.9));
      const z = type === 'header' ? rng.float(0.2, 1.6) : rng.float(0.15, 2.25);
      return { x, z, T: rng.float(far[0], far[1]) * B.gkTimeMult };
    },
    gkSave(me, shooter, shot, input, rng, diff, type) {
      const B = BS();
      const g = sk(me, ['gdiv', 'gref', 'ghan', 'gpos'], [0.35, 0.35, 0.15, 0.15]);
      const reach = B.gkReach * (0.8 + g * 0.4) * (1 + (FC.BAL.moments.diffReact[diff] || 0) * 3);
      const res = { x: shot.x, z: shot.z };
      if (input.none) {
        // لم يرتمِ: يصدها فقط إن كانت عليه
        res.outcome = hyp(shot.x, (shot.z - 1) * 0.8) < 0.8 ? 'saved' : 'goal';
        return res;
      }
      const err = hyp(input.x - shot.x, (input.z - shot.z) * 0.8);
      const early = input.at < shot.T * 0.22; // ارتمى قبل أن يرى الكرة جيداً
      const s = shooter ? sk(shooter, ['fin', 'cmp'], [0.6, 0.4]) : 0.5;
      const eff = reach * (early ? 0.7 : 1) * (1.12 - s * 0.24) * ({ big: 0.86, half: 1.25, long: 1.2, header: 0.95, fk: 1.15 }[type] || 1);
      if (err < eff * 0.5) res.outcome = 'saved';
      else if (err < eff) res.outcome = rng.next() < 1 - (err - eff * 0.5) / (eff * 0.5) * 0.7 ? 'saved' : 'goal';
      else res.outcome = 'goal';
      res.catch = res.outcome === 'saved' && err < eff * 0.35 && rng.chance(0.4 + g * 0.3);
      return res;
    },
    gkAuto(shot, rng) {
      const B = BS();
      const e = (B.gkHumanErr * 0.65) / shot.T; // كلما طال زمن الكرة قلّ خطأ الإنسان
      return { x: shot.x + rng.normal(0, e), z: shot.z + rng.normal(0, e * 0.7), at: shot.T * rng.float(0.35, 0.9) };
    },

    // ============ المواجهة الدفاعية 1 ضد 1 ============
    // input: {err: خطأ توقيت الافتكاك (ثوانٍ؛ موجب = متأخر)، off: بعد جانبي عن المهاجم (0..1)، none: لم يتدخل}
    defend(me, att, input, rng, diff) {
      const B = BS();
      const d = sk(me, ['tak', 'dawa', 'sld', 'str'], [0.4, 0.35, 0.1, 0.15]);
      const a = att ? sk(att, ['dri', 'agi', 'ctl'], [0.5, 0.3, 0.2]) : 0.5;
      const res = {};
      if (input.none) {
        // لم يتدخل: التمركز وحده قد يكفي
        res.outcome = rng.next() < B.defContain * (1 - (input.off || 0)) * (0.8 + d * 0.4) ? 'won' : 'beaten';
        return res;
      }
      const win = B.defWin * (0.75 + d * 0.5) * (1 - (FC.BAL.moments.diffReact[diff] || 0) * -3);
      const e = Math.abs(input.err);
      if (input.err > win * 1.2) {
        res.outcome = rng.next() < B.defLateFoul ? 'foul' : 'beaten';
        return res;
      }
      if (e > win) {
        res.outcome = 'beaten';
        return res;
      }
      const q = 1 - e / win;
      const pWin = U.clamp(B.defBase * (0.6 + q * 0.6) * (0.85 + d * 0.35) * (1.15 - a * 0.3) * (1 - (input.off || 0) * 0.6), 0.05, 0.92);
      const r = rng.next();
      if (r < pWin) res.outcome = 'won';
      else if (r < pWin + B.defFoul) res.outcome = 'foul';
      else res.outcome = 'beaten';
      return res;
    },
    defendAuto(rng) {
      return rng.chance(0.12) ? { none: true, off: rng.float(0, 0.6) } : { err: rng.normal(0.02, 0.2), off: rng.float(0, 0.5) };
    },

    // ============ إبعاد العرضية ============
    // input: {err: خطأ توقيت القفز}
    clear(me, att, input, rng) {
      const B = BS();
      const d = sk(me, ['hea', 'jmp', 'str', 'dawa'], [0.4, 0.3, 0.15, 0.15]);
      const a = att ? sk(att, ['hea', 'jmp'], [0.6, 0.4]) : 0.5;
      const win = B.clearWin * (0.75 + d * 0.5);
      const e = Math.abs(input.err);
      if (input.none || e > win) return { outcome: 'missed' };
      const q = 1 - e / win;
      return { outcome: rng.next() < U.clamp(B.clearBase * (0.6 + q * 0.6) * (1.1 - a * 0.25), 0.1, 0.95) ? 'cleared' : 'missed' };
    },
    clearAuto(rng) {
      return rng.chance(0.1) ? { none: true } : { err: rng.normal(0, 0.17) };
    },

    // ============ لعب تلقائي كامل للحظة خاصة ============
    auto(pd, rng) {
      const me = pd.me;
      const gk = pd.gk;
      const opp = pd.opps && pd.opps[0];
      let r;
      switch (pd.scen) {
        case 'sp_pen':
          r = Core.pen(me, gk, Core.penAuto(rng), rng, pd.diff);
          return { shooter: 'user', outcome: r.outcome === 'goal' ? 'goal' : r.outcome === 'saved' ? 'saved' : 'off', shotType: 'pen' };
        case 'sp_header':
          r = Core.header(me, gk, Core.headerAuto(rng), rng, pd.diff);
          return { shooter: 'user', outcome: r.contact ? r.outcome : 'miss', shotType: 'header' };
        case 'sp_fk':
          r = Core.fk(me, gk, Core.fkAuto(rng), rng, pd.diff);
          return { shooter: 'user', outcome: r.outcome, shotType: 'fk' };
        case 'sp_gk': {
          const shot = Core.gkShot(pd, rng);
          r = Core.gkSave(me, opp, shot, Core.gkAuto(shot, rng), rng, pd.diff, pd.type);
          return { def: true, outcome: r.outcome, catch: r.catch };
        }
        case 'sp_pensave':
          r = Core.penSave(me, opp, Core.penSaveAuto(rng), rng);
          return { def: true, outcome: r.outcome };
        case 'sp_defend':
          r = Core.defend(me, opp, Core.defendAuto(rng), rng, pd.diff);
          return { def: true, outcome: r.outcome };
        case 'sp_clear':
          r = Core.clear(me, opp, Core.clearAuto(rng), rng);
          return { def: true, outcome: r.outcome };
      }
      return { outcome: 'fizzle' };
    },

    // اختبار ذاتي: آلاف المحاولات بلاعب متوسط
    selfTest(n) {
      const rng = new FC.RNG(4242);
      const person = (ovr) => {
        const a = {};
        FC.Player.KEYS.forEach((k) => (a[k] = ovr + rng.normal(0, 4)));
        return a;
      };
      const out = { pen: 0, header: 0, fk: 0, gkBig: 0, gkHalf: 0, gkLong: 0, penSave: 0, defWon: 0, defFoul: 0, clear: 0, n };
      for (let i = 0; i < n; i++) {
        const me = person(68);
        const gk = person(68);
        const opp = person(68);
        if (Core.pen(me, gk, Core.penAuto(rng), rng, 'real').outcome === 'goal') out.pen++;
        const h = Core.header(me, gk, Core.headerAuto(rng), rng, 'real');
        if (h.outcome === 'goal') out.header++;
        if (Core.fk(me, gk, Core.fkAuto(rng), rng, 'real').outcome === 'goal') out.fk++;
        ['big', 'half', 'long'].forEach((t) => {
          const shot = Core.gkShot({ type: t }, rng);
          const r = Core.gkSave(gk, opp, shot, Core.gkAuto(shot, rng), rng, 'real', t);
          if (r.outcome === 'saved') out['gk' + t[0].toUpperCase() + t.slice(1)]++;
        });
        if (Core.penSave(gk, opp, Core.penSaveAuto(rng), rng).outcome === 'saved') out.penSave++;
        const d = Core.defend(me, opp, Core.defendAuto(rng), rng, 'real');
        if (d.outcome === 'won') out.defWon++;
        if (d.outcome === 'foul') out.defFoul++;
        if (Core.clear(me, opp, Core.clearAuto(rng), rng).outcome === 'cleared') out.clear++;
      }
      for (const k in out) if (k !== 'n') out[k] /= n;
      return out;
    },
  };

  FC.SpecialCore = Core;
})(globalThis);
