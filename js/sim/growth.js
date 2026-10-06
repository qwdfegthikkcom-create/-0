/* =========================================================
   التطور والعمر (القسم 9)
   - لاعبك: تطور أسبوعي بكسور عشرية تتراكم، +1 عندما تعبر السمة رقماً صحيحاً
   - لاعبو الذكاء الاصطناعي: تطور سنوي مبسط بنفس الجدول
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC = G.FC || {};
  const U = FC.util;

  const PHYS = { acc: 1, spd: 1, agi: 1, sta: 1 };
  const MENTAL_GROW = { vis: 1, cmp: 1, apos: 1, lead: 1, gpos: 1 };

  const Gr = (FC.Growth = {
    // مدى التغير بالموسم حسب العمر [أقل، أعلى]
    ageRange(age, isGK) {
      const BG = FC.BAL.growth;
      let a = age;
      if (isGK && age >= 28) a = Math.max(28, age - BG.gkAgeShift);
      for (const row of BG.ageTable) if (a >= row[0] && a <= row[1]) return [row[2], row[3]];
      return [-6, -3];
    },

    // تليين المضاعفات حتى لا تنكسر الواقعية
    soft(x) {
      const BG = FC.BAL.growth;
      return x >= 1 ? 1 + (x - 1) * BG.softUp : Math.pow(x, BG.softDownExp);
    },

    // مضاعفات لاعبك غير التدريب: الدقائق × المرافق × الاحترافية × الصعوبة
    userMult(state) {
      const BG = FC.BAL.growth;
      const u = state.user;
      const share = u.minHist.length ? U.avg(u.minHist) : 0.5;
      const minutesF = U.lerp(BG.minutesNone, BG.minutesFull, U.clamp(share, 0, 1));
      const club = state.clubs[u.club];
      const facF = BG.facilities[U.clamp((club ? club.fac : 3) - 1, 0, 4)];
      const profF = U.lerp(BG.profMin, BG.profMax, (u.hid.prof - 1) / 19);
      const diffF = FC.BAL.diff[state.diff].growth;
      const injF = u.inj ? FC.BAL.growth.injured : 1; // المصاب يتطور أبطأ
      const lifeF = FC.Life ? FC.Life.growthF(state) : 1; // المدرب الشخصي والمعسكرات
      return { minutesF, facF, profF, diffF, injF, lifeF, all: minutesF * facF * profF * diffF * injF * lifeF };
    },

    // مضاعف تدريب سمة هذا الأسبوع
    trainMult(key, wk) {
      const BG = FC.BAL.growth;
      const g = FC.Player.TRAIN_OF[key];
      if (g && wk.tm && wk.tm[g] != null) return wk.tm[g];
      if (FC.Player.GROUP_OF[key] === 'men') return wk.video || wk.mental ? BG.videoMental : BG.untrained;
      return BG.untrained;
    },

    // حصة السمة من التطور حسب أهميتها في مركزك
    relevance(pos, key) {
      const BG = FC.BAL.growth;
      const w = FC.BAL.ovrWeights[FC.Player.POS[pos].role];
      let maxW = 0;
      for (const k in w) maxW = Math.max(maxW, w[k]);
      if (w[key]) return BG.relMin + (1 - BG.relMin) * (w[key] / maxW);
      if (pos === 'GK') return FC.Player.GROUP_OF[key] === 'men' ? BG.relOther : BG.relOtherGK;
      return FC.Player.GROUP_OF[key] === 'gk' ? 0.02 : BG.relOther;
    },

    // تطور لاعبك لأسبوع واحد → قائمة السمات التي زادت +1
    weekUser(state) {
      const BG = FC.BAL.growth;
      const u = state.user;
      const wk = state.wk || {};
      const isGK = u.pos === 'GK';
      const range = Gr.ageRange(u.age, isGK);
      const base = range[0] + (range[1] - range[0]) * u.luck;
      const ovr = FC.Player.ovr(u);
      const mult = Gr.userMult(state);
      const w = FC.BAL.ovrWeights[FC.Player.POS[u.pos].role];
      const keys = FC.Player.KEYS;
      const gains = {};
      if (base > 0) {
        // التباطؤ قرب الإمكانات
        const gap = u.hid.pot - ovr;
        let gapF;
        if (gap > 0) gapF = Math.pow(Math.min(1, gap / BG.gapSoft), BG.gapExp);
        else gapF = u.hid.prof >= BG.overPotProf && ovr < u.hid.pot + BG.overPotMax ? 0.12 : 0;
        let S = 0;
        keys.forEach((k) => (S += (w[k] || 0) * Gr.relevance(u.pos, k)));
        keys.forEach((k) => {
          const F = Gr.soft((mult.all * Gr.trainMult(k, wk)) / BG.refMult);
          gains[k] = (base * gapF * F * Gr.relevance(u.pos, k)) / S / 52;
        });
        // سقف الموسم: الحد الأعلى + 2 فقط
        const planned = keys.reduce((s, k) => s + (w[k] || 0) * gains[k], 0);
        const cap = range[1] + BG.capOver;
        if (u.sg + planned > cap) {
          const f = Math.max(0, cap - u.sg) / planned;
          keys.forEach((k) => (gains[k] *= f));
        }
      } else {
        // التراجع: الظروف الجيدة تخففه قليلاً
        let avgT = 0;
        keys.forEach((k) => (avgT += Gr.trainMult(k, wk)));
        avgT /= keys.length;
        const F = Gr.soft((mult.all * avgT) / BG.refMult);
        const seasonal = Math.min(0, base + U.clamp(F - 1, -1, BG.declineGoodMax));
        let S = 0;
        const dw = {};
        keys.forEach((k) => {
          dw[k] = PHYS[k] ? 2 : FC.Player.GROUP_OF[k] === 'men' ? 0.2 : 0.8;
          S += (w[k] || 0) * dw[k];
        });
        keys.forEach((k) => (gains[k] = (seasonal * dw[k]) / S / 52));
      }
      // انحرافات العمر: تراجع بدني بعد 30، وتحسن ذهني حتى 32–33
      const physStart = BG.physDeclineStart + (isGK ? BG.gkAgeShift : 0);
      keys.forEach((k) => {
        if (PHYS[k] && u.age >= physStart) gains[k] -= (BG.physDeclinePerYear * (u.age - physStart + 1)) / 52;
        if (MENTAL_GROW[k] && u.age >= 24 && u.age <= BG.mentalGrowUntil) gains[k] += BG.mentalGrowPerYear / 52;
      });
      // التطبيق وتسجيل +1
      const ups = [];
      const before = FC.Player.ovr(u);
      keys.forEach((k) => {
        const old = u.attrs[k];
        const nv = U.clamp(old + gains[k], 1, 99);
        u.attrs[k] = nv;
        const d = Math.floor(nv) - Math.floor(old);
        if (d !== 0) ups.push({ k, d, v: Math.floor(nv) });
      });
      u.sg += FC.Player.ovr(u) - before;
      u.maxOvr = Math.max(u.maxOvr || 0, FC.Player.ovr(u));
      return ups;
    },

    // تطور لاعب ذكاء اصطناعي في نهاية الموسم
    yearAI(p, rng, minutesShare) {
      const BG = FC.BAL.growth;
      const BA = FC.BAL.aiGrowth;
      const r = Gr.ageRange(p.age, p.pos === 'GK');
      let d = rng.float(r[0], r[1]);
      if (d > 0) {
        const gap = p.pot - p.ovr;
        const gapF = gap > 0 ? Math.pow(Math.min(1, gap / BG.gapSoft), BG.gapExp) : 0;
        d *= gapF * U.lerp(BA.minutesLow, BA.minutesHigh, U.clamp(minutesShare, 0, 1));
      }
      d += rng.float(-BA.noise, BA.noise) * 0.5;
      let nv = p.ovr + d;
      if (d > 0 && nv > p.pot + 1) nv = Math.max(p.ovr, p.pot + 1);
      p.ovr = U.round1(U.clamp(nv, BA.minOvr, BA.maxOvr));
    },

    // تغيّر الإمكانات في نهاية الموسم (مواسم ممتازة + احترافية عالية)
    seasonPotential(state) {
      const BG = FC.BAL.growth;
      const u = state.user;
      const s = u.season;
      if (s.ap < 10) return 0;
      const avgR = s.rs / s.ap;
      if (avgR >= BG.potUpRating && u.hid.prof >= BG.potUpProf && u.age <= 25 && u.hid.pot < u.hid.pot0 + BG.potMaxShift) {
        u.hid.pot++;
        return 1;
      }
      return 0;
    },
  });
})(globalThis);
