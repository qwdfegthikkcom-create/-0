/* =========================================================
   الاعتزال والمواهب الجديدة (نسخة مبسطة — تتوسع في المرحلة 6)
   كل موسم يعتزل الكبار وتظهر مواهب جديدة في الأكاديميات حتى يبقى العالم حياً
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC = G.FC || {};
  const U = FC.util;

  const R = (FC.Regens = {
    // هل يعتزل هذا اللاعب هذا الصيف؟
    retires(p, club, rng) {
      const BR = FC.BAL.regens;
      const extra = p.pos === 'GK' ? BR.gkExtra : 0;
      if (p.age >= BR.retireForce + extra) return true;
      if (p.age < BR.retireStart + extra) return false;
      let pr = BR.retireBase + (p.age - BR.retireStart - extra) * BR.retireStep;
      if (p.ovr < club.lvl - 12) pr += 0.2;
      return rng.chance(U.clamp(pr, 0, 1));
    },

    // تشغيل الاعتزال والتجديد لكل الأندية الكبيرة
    run(state, rng) {
      const BW = FC.BAL.world;
      let retired = 0;
      let born = 0;
      for (const id in state.clubs) {
        const club = state.clubs[id];
        if (club.youth || club.nt) continue;
        const L = FC.Cups ? FC.Cups.leagueFor(state, club) : state.leagues[club.lg];
        const rv = state.rival ? state.rival.pid : -1;
        club.squad = club.squad.filter((pid) => {
          const p = state.players[pid];
          // الغريم يكمل مسيرته حتى 35 على الأقل
          if (pid === rv && p.age < 35) return true;
          if (R.retires(p, club, rng)) {
            delete state.players[pid];
            retired++;
            return false;
          }
          return true;
        });
        // تقليص التشكيلة الزائدة (يغادر الأضعف والأكبر)
        while (club.squad.length > BW.squadMax) {
          const worst = club.squad.map((pid) => state.players[pid]).filter((p) => p.id !== rv).sort((a, b) => a.ovr - a.age * 0.3 - (b.ovr - b.age * 0.3))[0];
          club.squad.splice(club.squad.indexOf(worst.id), 1);
          delete state.players[worst.id];
        }
        // مواهب جديدة للمراكز الناقصة
        while (club.squad.length < BW.squadMin + 1) {
          R.newTalent(state, rng, club, L);
          born++;
        }
        FC.World.assignNumbers(state, club, rng);
      }
      return { retired, born };
    },

    // المركز الأكثر نقصاً في التشكيلة
    neededPos(state, club) {
      const shape = FC.BAL.world.squadShape;
      const have = {};
      club.squad.forEach((pid) => {
        const pos = state.players[pid].pos;
        have[pos] = (have[pos] || 0) + 1;
      });
      let best = 'CM';
      let bestD = -99;
      for (const pos in shape) {
        const d = shape[pos][0] - (have[pos] || 0);
        if (d > bestD) {
          bestD = d;
          best = pos;
        }
      }
      return best;
    },

    // موهبة جديدة من الأكاديمية
    newTalent(state, rng, club, L) {
      const BR = FC.BAL.regens;
      const pos = R.neededPos(state, club);
      const age = rng.int(BR.newAge[0], BR.newAge[1]);
      const ovr = club.lvl - rng.float(BR.newOvrGap[0], BR.newOvrGap[1]);
      let pot;
      if (rng.chance(BR.wonderChance)) pot = rng.int(87, 94);
      else pot = Math.round(U.clamp(club.lvl + rng.normal(BR.potMean, BR.potSd), ovr + 3, 92));
      const p = FC.World.makePlayer(state, rng, { nat: FC.World.pickNat(rng, L), pos, age, ovr, pot, club: club.id });
      club.squad.push(p.id);
      return p;
    },

    // تجديد فريق شباب: خروج من تجاوز 18 ودخول مواهب جديدة
    refreshYouth(state, rng) {
      const Y = state.leagues.YTH;
      if (!Y) return;
      const BY = FC.BAL.world.youth;
      Y.clubs.forEach((cid) => {
        const yc = state.clubs[cid];
        yc.squad = yc.squad.filter((pid) => {
          const p = state.players[pid];
          if (p.age > BY.ageMax) {
            delete state.players[pid];
            return false;
          }
          return true;
        });
        FC.World.fillYouthSquad(state, rng, yc, Y);
      });
    },
  });
})(globalThis);
