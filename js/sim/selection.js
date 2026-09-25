/* =========================================================
   الخطط واختيار التشكيلة
   المدرب يختار الأفضل لكل مركز في خطته حسب: التقييم × التوافق مع المركز + الفورمة + اللياقة (+ ثقته بك)
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC = G.FC || {};
  const U = FC.util;

  // الخطط: المراكز من الحارس إلى الهجوم
  const FORMATIONS = {
    '4-3-3': ['GK', 'RB', 'CB', 'CB', 'LB', 'CM', 'CDM', 'CM', 'RW', 'ST', 'LW'],
    '4-2-3-1': ['GK', 'RB', 'CB', 'CB', 'LB', 'CDM', 'CDM', 'RW', 'CAM', 'LW', 'ST'],
    '4-4-2': ['GK', 'RB', 'CB', 'CB', 'LB', 'RW', 'CM', 'CM', 'LW', 'ST', 'ST'],
    '3-5-2': ['GK', 'CB', 'CB', 'CB', 'RB', 'CM', 'CDM', 'CM', 'LB', 'ST', 'ST'],
    '5-3-2': ['GK', 'RB', 'CB', 'CB', 'CB', 'LB', 'CM', 'CDM', 'CM', 'ST', 'ST'],
  };
  // مواقع الرسم على الملعب (x: 0 يسار → 100 يمين، y: 0 مرمانا → 100 مرمى الخصم)
  const XY = {
    '4-3-3': [[50, 5], [86, 26], [62, 20], [38, 20], [14, 26], [70, 48], [50, 40], [30, 48], [82, 76], [50, 84], [18, 76]],
    '4-2-3-1': [[50, 5], [86, 26], [62, 20], [38, 20], [14, 26], [62, 40], [38, 40], [80, 64], [50, 62], [20, 64], [50, 84]],
    '4-4-2': [[50, 5], [86, 26], [62, 20], [38, 20], [14, 26], [84, 54], [60, 48], [40, 48], [16, 54], [62, 82], [38, 82]],
    '3-5-2': [[50, 5], [72, 20], [50, 18], [28, 20], [90, 50], [68, 50], [50, 40], [32, 50], [10, 50], [62, 82], [38, 82]],
    '5-3-2': [[50, 5], [90, 32], [70, 20], [50, 18], [30, 20], [10, 32], [70, 50], [50, 42], [30, 50], [62, 80], [38, 80]],
  };
  const FORM_LIST = Object.keys(FORMATIONS);
  const FORM_W = [30, 25, 22, 12, 11]; // شيوع كل خطة بين الأندية

  // توافق لاعب مع مركز غير مركزه (1 = مركزه الأصلي)
  const FAM = {
    GK: {},
    CB: { CDM: 0.86, RB: 0.84, LB: 0.84 },
    RB: { LB: 0.9, CB: 0.84, RW: 0.8, CDM: 0.78 },
    LB: { RB: 0.9, CB: 0.84, LW: 0.8, CDM: 0.78 },
    CDM: { CM: 0.93, CB: 0.86, CAM: 0.8 },
    CM: { CDM: 0.93, CAM: 0.92, RW: 0.8, LW: 0.8 },
    CAM: { CM: 0.92, ST: 0.86, RW: 0.88, LW: 0.88, CDM: 0.78 },
    RW: { LW: 0.93, ST: 0.86, CAM: 0.88, RB: 0.76 },
    LW: { RW: 0.93, ST: 0.86, CAM: 0.88, LB: 0.76 },
    ST: { CAM: 0.85, RW: 0.85, LW: 0.85 },
  };
  function fam(pos, slot) {
    if (pos === slot) return 1;
    if (pos === 'GK' || slot === 'GK') return 0.25;
    return FAM[pos][slot] || 0.68;
  }

  // ترتيب ملء المراكز (الأصعب تعويضاً أولاً)
  const SLOT_PRIORITY = ['GK', 'CB', 'ST', 'CDM', 'RB', 'LB', 'CM', 'CAM', 'RW', 'LW'];

  const Sel = (FC.Select = {
    FORMATIONS, XY, FORM_LIST, fam,

    randomFormation(rng) {
      return FORM_LIST[rng.weighted(FORM_W)];
    },

    // لاعبو النادي (مع لاعبك إن كان ضمن هذا الفريق). all: يشمل المصابين والموقوفين
    squadIds(state, clubId, all) {
      const club = state.clubs[clubId];
      let ids = club.squad.slice();
      const u = state.user;
      if (u && FC.Game && FC.Game.userTeam(state) === clubId) ids.push(0);
      if (!all && FC.Status) ids = ids.filter((id) => FC.Status.available(state, FC.getP(state, id)));
      return ids;
    },

    // درجة اللاعب في مركز معيّن: التقييم في المركز + الفورمة + اللياقة + الجاهزية + ثقة المدرب + أسلوبه
    score(state, p, slot, rng, big, clubId) {
      const S = FC.BAL.select;
      const BC = FC.BAL.coach;
      let s = FC.Player.ovr(p) * fam(p.pos, slot);
      s += (FC.Player.formOf(p) - 6.7) * S.formWeight;
      const fit = p.id === 0 ? p.fit : p.fit == null ? 100 : p.fit;
      if (fit < S.fitnessLow) s -= (S.fitnessLow - fit) * S.fitnessPenalty * (big ? 0.5 : 1);
      // مزايا لاعبك (الثقة، موهبة الأكاديمية) تنطبق فقط في مركزه أو القريب منه
      if (p.id === 0 && fam(p.pos, slot) >= 0.85) {
        s += (p.trust - 50) * S.trustWeight;
        if (p.team === 'Y') s += S.youthBonus;
        s += ((p.sharp != null ? p.sharp : 75) - 75) * BC.sharpWeight;
      }
      if (clubId != null && FC.Status) s += FC.Status.styleBonus(state, clubId, p);
      if (rng) s += rng.normal(0, S.rotationNoise * (big ? BC.bigGameNoise : 1));
      return s;
    },

    // اختيار التشكيلة: {form, xi:[{pid, slot}], bench:[pid], out:[pid]}
    pick(state, clubId, rng, big) {
      const club = state.clubs[clubId];
      const form = club.form;
      const slots = FORMATIONS[form];
      const pool = Sel.squadIds(state, clubId).map((id) => FC.getP(state, id));
      const used = new Set();
      const xi = new Array(slots.length);
      const order = slots.map((s, i) => i).sort((a, b) => SLOT_PRIORITY.indexOf(slots[a]) - SLOT_PRIORITY.indexOf(slots[b]));
      // نحفظ عشوائية المداورة لكل لاعب حتى تكون متسقة بين المراكز
      const noise = {};
      if (rng) pool.forEach((p) => (noise[p.id] = rng.normal(0, FC.BAL.select.rotationNoise * (big ? FC.BAL.coach.bigGameNoise : 1))));
      for (const si of order) {
        const slot = slots[si];
        let best = null;
        let bestS = -1e9;
        for (const p of pool) {
          if (used.has(p.id)) continue;
          const s = Sel.score(state, p, slot, null, big, clubId) + (noise[p.id] || 0);
          if (s > bestS) {
            bestS = s;
            best = p;
          }
        }
        if (best) {
          used.add(best.id);
          xi[si] = { pid: best.id, slot };
        }
      }
      // الاحتياط: حارس + الأفضل من الباقين
      const rest = pool.filter((p) => !used.has(p.id));
      const bench = [];
      const gk = rest.filter((p) => p.pos === 'GK').sort((a, b) => FC.Player.ovr(b) - FC.Player.ovr(a))[0];
      if (gk) bench.push(gk.id);
      rest
        .filter((p) => p !== gk)
        .sort((a, b) => Sel.score(state, b, b.pos, null, big, clubId) + (noise[b.id] || 0) - (Sel.score(state, a, a.pos, null, big, clubId) + (noise[a.id] || 0)))
        .forEach((p) => {
          if (bench.length < FC.BAL.select.benchSize) bench.push(p.id);
        });
      const inXI = new Set(xi.filter(Boolean).map((x) => x.pid));
      const out = pool.filter((p) => !inXI.has(p.id) && bench.indexOf(p.id) < 0).map((p) => p.id);
      return { form, xi: xi.filter(Boolean), bench, out };
    },

    // دور لاعبك في تشكيلة
    roleOf(pick, pid) {
      if (pick.xi.some((x) => x.pid === pid)) return 'start';
      if (pick.bench.indexOf(pid) >= 0) return 'bench';
      return 'out';
    },

    // لماذا اختارك المدرب أو لم يخترك؟ {role, reasons:[نص], rival}
    explain(state, clubId, pick) {
      const u = state.user;
      const S = FC.BAL.select;
      const out = { role: 'out', reasons: [], rival: null };
      if (u.inj) {
        out.reasons.push('مصاب: ' + u.inj.name);
        return out;
      }
      if (u.ban > 0) {
        out.reasons.push('موقوف ' + (u.ban === 1 ? 'مباراة واحدة' : u.ban + ' مباريات'));
        return out;
      }
      pick = pick || Sel.pick(state, clubId);
      out.role = Sel.roleOf(pick, 0);
      // أقوى منافس في مركزك لم يُختر (إن كنت أساسياً) أو اختير مكانك
      const mine = pick.xi.find((x) => x.pid === 0);
      const slot = mine ? mine.slot : u.pos;
      const cands = pick.xi.filter((x) => x.pid !== 0 && fam(FC.getP(state, x.pid).pos, u.pos) >= 0.85).map((x) => FC.getP(state, x.pid));
      const rival = !mine ? cands.sort((a, b) => Sel.score(state, b, slot, null, false, clubId) - Sel.score(state, a, slot, null, false, clubId))[0] : null;
      out.rival = rival || null;
      const form = FC.Player.formOf(u);
      const fit = u.fit;
      const sharp = u.sharp != null ? u.sharp : 75;
      if (rival) {
        const d = FC.Player.ovr(rival) - FC.Player.ovr(u);
        if (d > 1) out.reasons.push('تقييم ' + FC.Player.fullName(rival) + ' أعلى منك بـ ' + Math.round(d));
        if (FC.Player.formOf(rival) > form + 0.3) out.reasons.push('فورمة ' + rival.ln.replace(/_/g, ' ') + ' أفضل مؤخراً');
      }
      if (u.form.length >= 2 && form >= 7.2) out.reasons.push('فورمتك ممتازة (' + form.toFixed(1) + ')');
      else if (u.form.length >= 2 && form <= 6.3) out.reasons.push('فورمتك الأخيرة ضعيفة (' + form.toFixed(1) + ')');
      if (fit < S.fitnessLow) out.reasons.push('لياقتك منخفضة (' + Math.round(fit) + '%)');
      if (sharp < 60) out.reasons.push('جاهزيتك للمباريات منخفضة (' + Math.round(sharp) + ')');
      else if (sharp >= 90) out.reasons.push('جاهزيتك عالية');
      if (u.trust >= 65) out.reasons.push('المدرب يثق بك (' + Math.round(u.trust) + ')');
      else if (u.trust <= 35) out.reasons.push('ثقة المدرب بك ضعيفة (' + Math.round(u.trust) + ')');
      const c = FC.Status && state.clubs[clubId] && state.clubs[clubId].coach;
      if (c && c.style === 'youth' && u.age <= 21) out.reasons.push('المدرب يؤمن بالشباب');
      if (c && c.style === 'veteran' && u.age < 28) out.reasons.push('المدرب يفضّل أصحاب الخبرة');
      if (!out.reasons.length) out.reasons.push(out.role === 'start' ? 'أنت الخيار الأول في مركزك' : 'المنافسة على مركزك متقاربة');
      return out;
    },

    // منافسوك على مركزك في الفريق (مرتبون حسب التقييم)
    rivals(state, clubId) {
      const u = state.user;
      const line = FC.Player.POS[u.pos].line;
      return Sel.squadIds(state, clubId, true)
        .map((id) => FC.getP(state, id))
        .filter((p) => p.id !== 0 && (p.pos === u.pos || (FC.Player.POS[p.pos].line === line && fam(p.pos, u.pos) >= 0.85)))
        .sort((a, b) => FC.Player.ovr(b) - FC.Player.ovr(a));
    },
  });
})(globalThis);
