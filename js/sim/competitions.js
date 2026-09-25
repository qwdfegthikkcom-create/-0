/* =========================================================
   المسابقات: جدولة الدوري ذهاباً وإياباً، الترتيب، الهدافون والصناع
   (الكؤوس والبطولات القارية في المرحلة 4)
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC = G.FC || {};

  const Comp = (FC.Comp = {
    // جدول دوري ذهاباً وإياباً بطريقة الدائرة — كل جولة: [[مضيف، ضيف، أهداف المضيف، أهداف الضيف], ...]
    roundRobin(ids, rng) {
      const arr = rng.shuffle(ids.slice());
      if (arr.length % 2) arr.push(null);
      const n = arr.length;
      const first = [];
      for (let r = 0; r < n - 1; r++) {
        const round = [];
        for (let i = 0; i < n / 2; i++) {
          let h = arr[i];
          let a = arr[n - 1 - i];
          // تبديل الأرض لتوازن المباريات داخل وخارج الأرض
          if ((i === 0 && r % 2 === 1) || (i > 0 && i % 2 === 1)) {
            const t = h;
            h = a;
            a = t;
          }
          if (h != null && a != null) round.push([h, a, -1, -1]);
        }
        first.push(round);
        // تدوير كل الفرق عدا الأول
        arr.splice(1, 0, arr.pop());
      }
      const second = first.map((round) => round.map((f) => [f[1], f[0], -1, -1]));
      return first.concat(second);
    },

    // تجهيز موسم جديد لكل الدوريات
    newSeason(state) {
      const rng = FC.rngOf(state);
      for (const id in state.leagues) Comp.newLeagueSeason(state, state.leagues[id], rng);
    },

    newLeagueSeason(state, L, rng) {
      L.rounds = Comp.roundRobin(L.clubs, rng);
      L.roundWeeks = FC.Calendar.roundWeeks(L.rounds.length);
      L.table = {};
      L.clubs.forEach((c) => (L.table[c] = [0, 0, 0, 0, 0, 0, 0]));
      L.done = false;
    },

    // كل مباريات أسبوع معيّن: [{lg, r, i}]
    weekMatches(state, week) {
      const out = [];
      for (const id in state.leagues) {
        const L = state.leagues[id];
        const r = L.roundWeeks.indexOf(week);
        if (r < 0) continue;
        L.rounds[r].forEach((f, i) => out.push({ lg: id, r, i }));
      }
      return out;
    },

    fixture(state, ref) {
      return state.leagues[ref.lg].rounds[ref.r][ref.i];
    },

    // تسجيل نتيجة وتحديث الترتيب
    record(state, lg, r, i, hg, ag) {
      const L = state.leagues[lg];
      const f = L.rounds[r][i];
      f[2] = hg;
      f[3] = ag;
      const H = L.table[f[0]];
      const A = L.table[f[1]];
      H[0]++; A[0]++;
      H[4] += hg; H[5] += ag;
      A[4] += ag; A[5] += hg;
      if (hg > ag) { H[1]++; A[3]++; H[6] += 3; }
      else if (hg < ag) { A[1]++; H[3]++; A[6] += 3; }
      else { H[2]++; A[2]++; H[6]++; A[6]++; }
    },

    // الترتيب مرتباً: النقاط ثم الفارق ثم الأهداف
    table(state, lg) {
      const L = state.leagues[lg];
      const rows = L.clubs.map((id) => {
        const t = L.table[id];
        return { id, p: t[0], w: t[1], d: t[2], l: t[3], gf: t[4], ga: t[5], gd: t[4] - t[5], pts: t[6] };
      });
      rows.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || state.clubs[b.id].rep - state.clubs[a.id].rep);
      return rows;
    },

    position(state, lg, clubId) {
      return Comp.table(state, lg).findIndex((r) => r.id === clubId) + 1;
    },

    // آخر نتائج نادٍ: ['W','D','L'...] الأحدث أخيراً
    clubForm(state, lg, clubId, n) {
      const L = state.leagues[lg];
      const out = [];
      for (let r = 0; r < L.rounds.length; r++) {
        for (const f of L.rounds[r]) {
          if (f[2] < 0) continue;
          if (f[0] === clubId) out.push(f[2] > f[3] ? 'W' : f[2] < f[3] ? 'L' : 'D');
          else if (f[1] === clubId) out.push(f[3] > f[2] ? 'W' : f[3] < f[2] ? 'L' : 'D');
        }
      }
      return out.slice(-(n || 5));
    },

    // كل مباريات نادٍ في الموسم مع الأسبوع والنتيجة
    clubFixtures(state, clubId) {
      const out = [];
      for (const id in state.leagues) {
        const L = state.leagues[id];
        if (L.clubs.indexOf(clubId) < 0) continue;
        L.rounds.forEach((round, r) => {
          round.forEach((f, i) => {
            if (f[0] === clubId || f[1] === clubId) {
              out.push({ lg: id, r, i, week: L.roundWeeks[r], home: f[0] === clubId, opp: f[0] === clubId ? f[1] : f[0], gf: f[0] === clubId ? f[2] : f[3], ga: f[0] === clubId ? f[3] : f[2] });
            }
          });
        });
      }
      return out.sort((a, b) => a.week - b.week);
    },

    // قائمة الهدافين (key: sG) أو الصناع (sA) في دوري
    leaders(state, lg, key, n) {
      const L = state.leagues[lg];
      const list = [];
      L.clubs.forEach((cid) => {
        state.clubs[cid].squad.forEach((pid) => {
          const p = state.players[pid];
          if (p[key] > 0) list.push({ pid, club: cid, v: p[key], ap: p.sAp });
        });
      });
      const u = state.user;
      const ul = FC.Game ? FC.Game.userLeague(state) : null;
      const uv = key === 'sG' ? u.season.g : u.season.a;
      if (ul === lg && uv > 0) list.push({ pid: 0, club: FC.Game.userTeam(state), v: uv, ap: u.season.ap });
      list.sort((a, b) => b.v - a.v || a.ap - b.ap);
      return list.slice(0, n || 10);
    },

    // هل انتهت كل مباريات الدوري؟
    finished(state, lg) {
      const L = state.leagues[lg];
      return L.rounds.every((round) => round.every((f) => f[2] >= 0));
    },
  });
})(globalThis);
