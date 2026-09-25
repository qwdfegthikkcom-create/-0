/* =========================================================
   جوائز نهاية الموسم (القسم 14):
   - جوائز كل دوري (نهاية الدوري): أفضل لاعب، الهداف، أفضل شاب (21 وأقل)، تشكيلة الموسم، أفضل لاعب في ناديك
   - الجوائز العالمية (بعد بطولات الصيف): «الكرة الذهبية» (أفضل 30)، أفضل لاعب تحت 21 عالمياً، أفضل حارس
   التقييم: متوسط التقييم × المشاركة + الأهداف والصناعة حسب المركز + نجاح الفريق والألقاب + (عالمياً) قوة الدوري والجودة والشهرة
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC = G.FC || {};
  const U = FC.util;
  const BA = () => FC.BAL.awards;

  const Aw = (FC.Awards = {
    // أهداف وصناعة الكؤوس والقارية لكل لاعب هذا الموسم
    cupStats(state) {
      const out = {};
      for (const id in state.comps || {}) {
        const c = state.comps[id];
        if (c.nat) continue;
        for (const pid in c.sc) {
          const r = (out[pid] = out[pid] || [0, 0]);
          r[0] += c.sc[pid][0];
          r[1] += c.sc[pid][1];
        }
      }
      return out;
    },

    // ألقاب الموسم لكل فريق: {clubId: ['league','cup','cont'...]} ولاعبو المنتخبات الفائزة
    trophies(state, snap) {
      const t = {};
      const add = (id, k) => (t[id] = t[id] || []).push(k);
      if (snap && snap.champs) for (const lg in snap.champs) if (!(state.leagues[lg] && state.leagues[lg].youth)) add(snap.champs[lg], 'league');
      const nt = new Set();
      for (const id in state.comps || {}) {
        const c = state.comps[id];
        if (!c.win) continue;
        if (c.kind === 'cup') add(c.win, 'cup');
        else if (c.kind === 'cont') add(c.win, 'cont');
        else if (c.kind === 'nt') {
          const club = state.clubs[c.win];
          (club ? club.awayIds || club.squad : []).forEach((pid) => nt.add(pid));
          if (club) club.squad.forEach((pid) => nt.add(pid));
          t['nt_' + c.win] = c.id;
        }
      }
      return { clubs: t, ntPlayers: nt, ntComp: (pid) => {
        for (const id in state.comps || {}) {
          const c = state.comps[id];
          if (c.kind === 'nt' && c.win && state.clubs[c.win] && state.clubs[c.win].squad.indexOf(pid) >= 0) return c.id;
        }
        return null;
      } };
    },

    // سطر موسم لاعب (لاعبك أو لاعب ذكاء اصطناعي)
    line(state, p, cup) {
      if (p.id === 0) {
        const u = state.user;
        if (u.retired) return null;
        const s = u.season;
        const sl = s.lg || s;
        const team = FC.Game.userTeam(state);
        const club = state.clubs[team];
        return { pid: 0, p, club: team, lg: club ? club.lg : null, pos: u.pos, age: u.age, ap: sl.ap, apAll: s.ap, avg: s.ap ? s.rs / s.ap : 0, g: s.g, a: s.a, lgG: sl.g, ovr: FC.Player.ovr(u) };
      }
      const club = state.clubs[p.club];
      if (!club || club.youth || club.nt) return null;
      const cs = cup[p.id] || [0, 0];
      return { pid: p.id, p, club: p.club, lg: club.lg, pos: p.pos, age: p.age, ap: p.sAp, apAll: p.sAp, avg: p.sAp ? p.sRs / p.sAp : 0, g: p.sG + cs[0], a: p.sA + cs[1], lgG: p.sG, ovr: p.ovr };
    },

    // درجة الموسم
    score(state, L, ctx, global) {
      const B = BA();
      const role = FC.Player.POS[L.pos].role;
      const lg = state.leagues[L.lg];
      const rounds = lg ? lg.rounds.length : 34;
      let v = (L.avg - 6.4) * B.ratingK * Math.min(1, L.ap / (rounds * 0.75));
      v += L.g * B.gW[role] + L.a * B.aW[role];
      // نجاح الفريق
      const pos = lg && ctx.pos[L.lg] ? ctx.pos[L.lg].indexOf(L.club) + 1 : 0;
      if (pos === 1) v += B.champ;
      else if (pos > 0 && pos <= 3) v += B.top3;
      const tr = ctx.tr.clubs[L.club] || [];
      if (tr.indexOf('cup') >= 0) v += B.cup;
      if (tr.indexOf('cont') >= 0) v += B.cont;
      if (global) {
        const vis = FC.BAL.transfer.leagueVis[L.lg];
        v *= 0.45 + (vis != null ? vis : 0.3) * 0.55;
        v += (L.ovr - 75) * B.ovrK;
        const ntc = ctx.tr.ntPlayers.has(L.pid) ? ctx.tr.ntComp(L.pid) : null;
        if (ntc) v += ntc === 'WC' ? B.wc : B.intl;
        if (L.pid === 0) v += (state.user.fame || 0) * B.famK;
        else v += Math.max(0, (L.ovr - 70) * 1.2 * (vis != null ? vis : 0.3)) * B.famK;
      }
      return v;
    },

    // سياق الموسم: الترتيب النهائي والألقاب
    ctx(state, snap) {
      const pos = {};
      for (const id in state.leagues) if (!state.leagues[id].youth) pos[id] = FC.Comp.table(state, id).map((r) => r.id);
      return { pos, tr: Aw.trophies(state, snap), cup: Aw.cupStats(state) };
    },

    // كل المرشحين في دوري (أو العالم)
    candidates(state, ctx, lgId) {
      const out = [];
      const lg = lgId ? state.leagues[lgId] : null;
      const minAp = (r) => Math.max(8, r * BA().minApShare);
      const push = (p) => {
        const L = Aw.line(state, p, ctx.cup);
        if (!L || (lgId && L.lg !== lgId)) return;
        const Lg = state.leagues[L.lg];
        if (!Lg || Lg.youth) return;
        if (L.ap < minAp(Lg.rounds.length)) return;
        out.push(L);
      };
      if (lg) lg.clubs.forEach((cid) => state.clubs[cid].squad.forEach((pid) => push(state.players[pid])));
      else for (const id in state.players) push(state.players[id]);
      push(state.user);
      return out;
    },

    name(state, pid) {
      const p = FC.getP(state, pid);
      return p ? (pid === 0 ? FC.Player.displayName(p) : FC.Player.fullName(p)) : '';
    },
    rec(state, L, v) {
      const c = state.clubs[L.club];
      return { pid: L.pid, name: Aw.name(state, L.pid), club: L.club, clubName: c ? c.short : '', nat: L.p.nat, g: L.g, a: L.a, avg: U.round1(L.avg) };
    },

    // تشكيلة الموسم 4-3-3
    tots(state, list) {
      const slots = [['GK', ['GK']], ['RB', ['RB']], ['CB', ['CB']], ['CB', ['CB']], ['LB', ['LB']], ['MID', ['CDM', 'CM', 'CAM']], ['MID', ['CDM', 'CM', 'CAM']], ['MID', ['CAM', 'CM', 'CDM']], ['RW', ['RW', 'LW']], ['ST', ['ST']], ['LW', ['LW', 'RW']]];
      const used = new Set();
      return slots.map((s) => {
        const best = list.filter((x) => !used.has(x.L.pid) && s[1].indexOf(x.L.pos) >= 0).sort((a, b) => b.v - a.v)[0] ||
          list.filter((x) => !used.has(x.L.pid) && s[1].some((q) => FC.Select.fam(x.L.pos, q) >= 0.85)).sort((a, b) => b.v - a.v)[0];
        if (!best) return null;
        used.add(best.L.pid);
        return Object.assign(Aw.rec(state, best.L, best.v), { slot: s[0] });
      }).filter(Boolean);
    },

    // ================= جوائز الدوريات (نهاية الدوري) =================
    leagueAwards(state, snap) {
      const ctx = Aw.ctx(state, snap);
      const out = {};
      for (const lgId in state.leagues) {
        const Lg = state.leagues[lgId];
        if (Lg.youth) continue;
        const list = Aw.candidates(state, ctx, lgId).map((L) => ({ L, v: Aw.score(state, L, ctx, false) }));
        if (!list.length) continue;
        list.sort((a, b) => b.v - a.v);
        const young = list.filter((x) => x.L.age <= BA().youngAge)[0];
        const top = FC.Comp.leaders(state, lgId, 'sG', 1)[0];
        const gk = list.filter((x) => x.L.pos === 'GK')[0];
        out[lgId] = {
          poty: Aw.rec(state, list[0].L, list[0].v),
          young: young ? Aw.rec(state, young.L, young.v) : null,
          top: top ? { pid: top.pid, name: Aw.name(state, top.pid), club: top.club, clubName: state.clubs[top.club] ? state.clubs[top.club].short : '', g: top.v, nat: FC.getP(state, top.pid).nat } : null,
          gk: gk ? Aw.rec(state, gk.L, gk.v) : null,
          tots: Aw.tots(state, list),
        };
      }
      // أفضل لاعب في ناديك
      const team = FC.Game.userTeam(state);
      const club = state.clubs[team];
      if (club && !club.youth && !state.user.retired) {
        const mine = Aw.candidates(state, ctx, club.lg).filter((L) => L.club === team).map((L) => ({ L, v: Aw.score(state, L, ctx, false) })).sort((a, b) => b.v - a.v)[0];
        if (mine) out.club = Object.assign(Aw.rec(state, mine.L, mine.v), { team });
      }
      if (snap) snap.awards = out;
      Aw.giveUser(state, out, false);
      return out;
    },

    // تقليص سجل الجوائز القديمة (يبقى الأبطال فقط) حتى لا يكبر الحفظ
    prune(state) {
      const keep = BA().keepFull;
      (state.history.seasons || []).forEach((h) => {
        if (h.season > state.season - keep || h.pruned) return;
        h.pruned = true;
        if (h.awards) {
          for (const lg in h.awards) {
            const a = h.awards[lg];
            if (lg === 'club') continue;
            h.awards[lg] = { poty: a.poty, top: a.top, young: a.young, tots: [], gk: a.gk };
          }
        }
        if (h.global && h.global.ballon) h.global.ballon = h.global.ballon.slice(0, 10);
      });
    },

    // ================= الجوائز العالمية (بعد بطولات الصيف) =================
    globalAwards(state) {
      const snap = (state.history.seasons || []).find((s) => s.season === state.season);
      const ctx = Aw.ctx(state, snap);
      const list = Aw.candidates(state, ctx, null).map((L) => ({ L, v: Aw.score(state, L, ctx, true) }));
      list.sort((a, b) => b.v - a.v);
      const ballon = list.slice(0, 30).map((x, i) => Object.assign(Aw.rec(state, x.L, x.v), { rank: i + 1 }));
      const boy = list.filter((x) => x.L.age <= BA().youngAge)[0];
      const gk = list.filter((x) => x.L.pos === 'GK')[0];
      const out = { ballon, boy: boy ? Aw.rec(state, boy.L, boy.v) : null, gk: gk ? Aw.rec(state, gk.L, gk.v) : null, userRank: list.findIndex((x) => x.L.pid === 0) + 1 };
      if (snap) snap.global = out;
      Aw.giveUser(state, out, true);
      Aw.prune(state);
      return out;
    },

    // جوائزك: السجل والرسائل والشهرة
    giveUser(state, out, global) {
      const u = state.user;
      if (u.retired) return;
      const rng = FC.rngOf(state);
      const F = BA().fame;
      const aw = (u.awards = u.awards || []);
      const add = (k, name, extra) => {
        aw.push(Object.assign({ s: state.season, k, name }, extra || {}));
        if (FC.Life && F[k]) FC.Life.addFame(state, F[k]);
      };
      const lgName = (lg) => (state.leagues[lg] ? state.leagues[lg].name : '');
      if (!global) {
        for (const lg in out) {
          if (lg === 'club') continue;
          const a = out[lg];
          if (a.poty && a.poty.pid === 0) add('poty', 'أفضل لاعب في ' + lgName(lg), { lg });
          if (a.top && a.top.pid === 0) add('top', 'هداف ' + lgName(lg), { lg, g: a.top.g });
          if (a.young && a.young.pid === 0) add('young', 'أفضل لاعب شاب في ' + lgName(lg), { lg });
          if (a.gk && a.gk.pid === 0 && u.pos === 'GK') add('lgk', 'أفضل حارس في ' + lgName(lg), { lg });
          if (a.tots.some((x) => x.pid === 0)) add('tots', 'تشكيلة موسم ' + lgName(lg), { lg });
        }
        if (out.club && out.club.pid === 0) add('club', 'أفضل لاعب في ' + (state.clubs[out.club.team] ? state.clubs[out.club.team].name : 'النادي'));
        const mine = aw.filter((x) => x.s === state.season && !x.global);
        if (mine.length) FC.Msg.add(state, 'league', 'جوائز نهاية الموسم', 'مبروك! حصدت: ' + mine.map((x) => x.name).join('، ') + '.', { big: 'award' });
      } else {
        const r = out.userRank;
        if (r === 1) add('ballon', 'الكرة الذهبية', { global: true, rank: 1 });
        else if (r > 0 && r <= 3) add('ballon3', 'المركز ' + r + ' في الكرة الذهبية', { global: true, rank: r });
        else if (r > 0 && r <= 10) add('ballon10', 'المركز ' + r + ' في الكرة الذهبية', { global: true, rank: r });
        else if (r > 0 && r <= 30) add('ballon30', 'ضمن أفضل 30 (المركز ' + r + ')', { global: true, rank: r });
        if (out.boy && out.boy.pid === 0) add('boy', 'أفضل لاعب تحت 21 في العالم', { global: true });
        if (out.gk && out.gk.pid === 0) add('wgk', 'أفضل حارس في العالم', { global: true });
        const w = out.ballon[0];
        FC.Msg.add(state, 'news', 'الكرة الذهبية ' + (state.season + 1), (r === 1 ? 'أنت الفائز بالكرة الذهبية! أفضل لاعب في العالم!' : 'الفائز: ' + w.name + ' (' + w.clubName + ').' + (r > 0 && r <= 30 ? ' حللت في المركز ' + r + '.' : '')), r > 0 && r <= 3 ? { big: 'award' } : null);
      }
    },
  });
})(globalThis);
