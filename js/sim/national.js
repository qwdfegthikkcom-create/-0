/* =========================================================
   المنتخبات الوطنية (القسم 15)
   كل منتخب «فريق» خاص في state.clubs (nt: true) قائمته تتجدد قبل كل فترة دولية:
   أفضل ~24 لاعباً من الجنسية حسب المركز (التقييم + الفورمة + الخبرة الدولية)
   الدورة كل 4 سنوات: تصفيات كأس العالم ثم البطولة صيفاً، كأس أوروبا وكوبا أمريكا صيفاً،
   كأس آسيا وكأس أفريقيا في يناير (فيغيب اللاعبون المستدعون عن أنديتهم)
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC = G.FC || {};
  const U = FC.util;
  const BN = () => FC.BAL.nat;

  const NT_BASE = 5001; // أرقام المنتخبات
  const CONFS = ['UEFA', 'AFC', 'CAF', 'CONMEBOL', 'CONCACAF'];
  const KO_NAMES = { 16: 'دور الـ16', 8: 'ربع النهائي', 4: 'نصف النهائي', 2: 'النهائي' };

  const Nat = (FC.Nat = {
    NT_BASE,

    idOf(code) {
      const i = FC.DATA.nationOrder.indexOf(code);
      return i < 0 ? null : NT_BASE + i;
    },
    codeOf(state, id) {
      const c = state.clubs[id];
      return c && c.nt ? c.nat : null;
    },
    confTeams(conf) {
      return FC.DATA.nationOrder.filter((k) => FC.DATA.nations[k].conf === conf).map(Nat.idOf);
    },

    // إنشاء المنتخبات مرة واحدة
    ensure(state) {
      if (state.ntDone) return;
      const rng = FC.rngOf(state);
      FC.DATA.nationOrder.forEach((code) => {
        const N = FC.DATA.nations[code];
        const id = Nat.idOf(code);
        const kit = FC.DATA.ntKits[code] || ['#f4f4f4', '#111111'];
        const nm = FC.World.randomName(rng, rng.chance(0.75) ? code : rng.pick(['ESP', 'POR', 'ITA', 'GER', 'NED', 'FRA']));
        state.clubs[id] = {
          id, nt: true, nat: code, lg: null, name: 'منتخب ' + N.name, short: N.name, city: N.cities[0], c1: kit[0], c2: kit[1],
          rep: N.str, cap: 60, fac: 5, lvl: N.str - 10, form: FC.Select.randomFormation(rng), squad: [], rival: null, capt: null,
          coach: { fn: nm[0], ln: nm[1], age: rng.int(42, 66), style: 'balanced', since: state.season, sinceW: 0 },
        };
      });
      state.ntDone = true;
      state.natQ = state.natQ || {};
    },

    // ================= مخزون اللاعبين حسب الجنسية =================
    pool(state) {
      const out = {};
      const minAge = BN().minAge;
      for (const id in state.players) {
        const p = state.players[id];
        if (p.age < minAge) continue;
        (out[p.nat] = out[p.nat] || []).push(p);
      }
      return out;
    },

    // درجة لاعب في الاستدعاء
    callScore(state, p) {
      const B = BN();
      const isUser = p.id === 0;
      const club = state.clubs[isUser ? FC.Game.userTeam(state) : p.club];
      let s = FC.Player.ovr(p) + (FC.Player.formOf(p) - 6.7) * B.formW;
      s += (isUser ? (p.intl ? p.intl.caps : 0) : p.iC || 0) * B.capsW;
      if (club && club.youth) s -= B.youthPenalty;
      if (isUser && p.freeAgent) s -= 2;
      return s;
    },

    // اختيار قائمة منتخب (مصفوفة أرقام، 0 = لاعبك)
    selectSquad(state, code, pool) {
      const B = BN();
      const u = state.user;
      let cands = (pool[code] || []).filter((p) => !(p.inj > 0));
      if (u.nat === code && !u.inj && u.age >= B.minAge && !u.retired) cands = cands.concat([u]);
      const score = new Map();
      cands.forEach((p) => score.set(p, Nat.callScore(state, p)));
      cands.sort((a, b) => score.get(b) - score.get(a));
      const picked = new Set();
      const quota = B.squad;
      // حسب المركز أولاً
      for (const pos in quota) {
        let n = quota[pos];
        for (const p of cands) {
          if (!n) break;
          if (!picked.has(p) && p.pos === pos) {
            picked.add(p);
            n--;
          }
        }
        // مراكز ناقصة: الأقرب توافقاً
        for (const p of cands) {
          if (!n) break;
          if (!picked.has(p) && FC.Select.fam(p.pos, pos) >= 0.84) {
            picked.add(p);
            n--;
          }
        }
      }
      const total = U.sum(Object.values(quota));
      for (const p of cands) {
        if (picked.size >= total) break;
        if (!picked.has(p) && (p.pos !== 'GK' || [...picked].filter((x) => x.pos === 'GK').length < 3)) picked.add(p);
      }
      return [...picked].map((p) => p.id);
    },

    // قوة المنتخب: متوسط أفضل 11 (للقرعة والعرض)
    power(state, id) {
      const club = state.clubs[id];
      if (!club) return 0;
      if (club.pw && club.pwS === state.season) return club.pw;
      const pool = state._ntPool && state._ntPoolW === Nat.stamp(state) ? state._ntPool : (state._ntPool = Nat.pool(state));
      state._ntPoolW = Nat.stamp(state);
      const ids = (club.squad.length ? club.squad : Nat.selectSquad(state, club.nat, pool)).filter((pid) => FC.getP(state, pid));
      const vals = ids.map((pid) => FC.Player.ovr(FC.getP(state, pid))).sort((a, b) => b - a).slice(0, 11);
      club.pw = U.round1(vals.length ? U.avg(vals) : 45);
      club.pwS = state.season;
      return club.pw;
    },
    stamp(state) {
      return state.season * 100 + state.week;
    },

    // ================= مسابقات الموسم =================
    newSeason(state, rng) {
      Nat.ensure(state);
      const B = BN();
      const y = state.season % 4;
      state.natQ = {};
      // تنظيف القوائم من المعتزلين وتصفير القوة المحسوبة
      FC.DATA.nationOrder.forEach((code) => {
        const c = state.clubs[Nat.idOf(code)];
        if (!c) return;
        c.pw = null;
        c.squad = c.squad.filter((pid) => FC.getP(state, pid));
        if (c.capt != null && c.squad.indexOf(c.capt) < 0) c.capt = null;
      });
      // المباريات الودية لمنتخبك تُضاف عند الاستدعاء
      FC.Cups.make(state, rng, { id: 'FRI', kind: 'fr', nat: true, name: FC.DATA.natComps.FRI.name, short: 'ودية', teams: [], stages: [{ k: 'fr', n: 'ودية' }] });
      if (y === B.cycle.WC) {
        for (const conf of CONFS) {
          const q = B.wcq[conf];
          Nat.makeQual(state, rng, 'WCQ_' + conf, 'تصفيات كأس العالم — ' + Nat.confName(conf), Nat.confTeams(conf), q);
        }
      }
      if (y === B.cycle.EURO) Nat.makeQual(state, rng, 'EUROQ', FC.DATA.natComps.EUROQ.name, Nat.confTeams('UEFA'), B.euroq);
      if (y === B.cycle.AFCON) Nat.makeQual(state, rng, 'AFCONQ', FC.DATA.natComps.AFCONQ.name, Nat.confTeams('CAF'), B.afconq);
      if (y === B.cycle.ASIA) Nat.makeTournament(state, rng, 'ASIA', Nat.confTeams('AFC'), 'winter');
      if (y === B.cycle.COPA) {
        const invited = Nat.confTeams('AFC').sort((a, b) => FC.DATA.nations[Nat.codeOf(state, b)].str - FC.DATA.nations[Nat.codeOf(state, a)].str).slice(0, 2);
        Nat.makeTournament(state, rng, 'COPA', Nat.confTeams('CONMEBOL').concat(Nat.confTeams('CONCACAF'), invited), 'summer');
      }
    },

    confName(conf) {
      return { UEFA: 'أوروبا', AFC: 'آسيا', CAF: 'أفريقيا', CONMEBOL: 'أمريكا الجنوبية', CONCACAF: 'أمريكا الشمالية' }[conf] || conf;
    },

    // تصفيات: مجموعات دوري (ذهاب فقط أو ذهاب وإياب)
    makeQual(state, rng, id, name, teams, q) {
      const B = BN();
      return FC.Cups.make(state, rng, {
        id, kind: 'q', nat: true, conf: id.replace(/^WCQ_/, ''), name, short: name, teams,
        stages: [{ k: 'grp', n: 'التصفيات', nG: q.groups, legs: q.legs, adv: q.adv, w: B.qualSlots, seeded: true, final: true }],
      });
    },

    // بطولة نهائية: مجموعات من 4 ثم خروج المغلوب
    makeTournament(state, rng, key, teams, season) {
      const B = BN();
      const W = B[season];
      const n = teams.length;
      const nG = n / 4;
      let bracket = nG * 2;
      let thirds = 0;
      if (nG === 3) {
        thirds = 2;
        bracket = 8;
      }
      const stages = [{ k: 'grp', n: 'دور المجموعات', nG, legs: 1, adv: 2, thirds, w: W.grp, seeded: true, sep: key === 'WC', neutral: true }];
      let k = 0;
      for (let b = bracket; b >= 2; b /= 2) {
        stages.push({ k: 'ko', n: KO_NAMES[b] || 'دور الـ' + b, legs: 1, w: [W.ko[Math.min(k, W.ko.length - 1)]], big: true, neutral: true, final: b === 2 });
        k++;
      }
      // المستضيف: أحد المشاركين (الأقوى أرجح)
      const host = teams[rng.weighted(teams.map((t) => Math.exp((FC.DATA.nations[Nat.codeOf(state, t)].str - 70) / 8)))];
      const def = FC.DATA.natComps[key];
      const c = FC.Cups.make(state, rng, { id: key, kind: 'nt', nat: true, name: def.name, short: def.short, teams, stages, host });
      c.season2 = season;
      return c;
    },

    // ================= أحداث المسابقات =================
    onFinished(state, c) {
      const rng = FC.rngOf(state);
      const u = state.user;
      const my = Nat.idOf(u.nat);
      if (c.kind === 'q') {
        const st = c.stages[0];
        state.natQ[c.id] = st.qual.slice();
        if (c.teams.indexOf(my) >= 0) {
          const ok = st.qual.indexOf(my) >= 0;
          const target = c.id.indexOf('WCQ') === 0 ? 'كأس العالم' : c.id === 'EUROQ' ? 'كأس أوروبا' : 'كأس أفريقيا';
          FC.Msg.add(state, 'nat', ok ? 'التأهل إلى ' + target + '!' : 'وداع التصفيات', FC.TXT.msg(rng, ok ? 'ntQualified' : 'ntFailed', { t: FC.DATA.nations[u.nat].name, c: target }), ok ? { big: 'qualified' } : null);
        }
        // هل اكتملت كل تصفيات البطولة؟
        const wcq = CONFS.map((k) => 'WCQ_' + k);
        if (c.id.indexOf('WCQ_') === 0 && wcq.every((k) => state.natQ[k])) {
          let teams = [];
          wcq.forEach((k) => (teams = teams.concat(state.natQ[k])));
          if (teams.length === 32) Nat.makeTournament(state, rng, 'WC', teams, 'summer');
        }
        if (c.id === 'EUROQ' && state.natQ.EUROQ.length === 12) Nat.makeTournament(state, rng, 'EURO', state.natQ.EUROQ, 'summer');
        if (c.id === 'AFCONQ' && state.natQ.AFCONQ.length === 8) Nat.makeTournament(state, rng, 'AFCON', state.natQ.AFCONQ, 'winter');
        return;
      }
      if (c.kind === 'nt') {
        // انتهت البطولة: يعود الجميع إلى أنديتهم
        c.teams.forEach((id) => Nat.release(state, id));
        const u2 = state.user;
        if (u2.intl && c.uIn) {
          const res = FC.Cups.statusOf(state, c, my);
          (u2.intl.tourn = u2.intl.tourn || []).push({ s: state.season, id: c.id, name: c.name, res: res ? res.txt : '', played: Nat.userIn(state, my) });
        }
      }
    },

    // المنتخبات الخارجة من البطولة: يعود لاعبوها إلى أنديتهم
    onEliminated(state, c, elim) {
      if (c.kind !== 'nt') return;
      const rng = FC.rngOf(state);
      const my = Nat.idOf(state.user.nat);
      c.out = (c.out || []).concat(elim);
      elim.forEach((id) => {
        if (id === my && Nat.userIn(state, my)) {
          const st = c.stages[c.cur];
          FC.Msg.add(state, 'nat', 'وداع ' + c.name, FC.TXT.msg(rng, 'tournOut', { c: c.name, s: st.n }));
        }
        Nat.release(state, id);
      });
    },

    release(state, ntId) {
      const club = state.clubs[ntId];
      if (!club) return;
      (club.awayIds || club.squad).forEach((pid) => {
        if (pid === 0) state.user.away = false;
        else if (state.players[pid]) state.players[pid].away = 0;
      });
      club.awayIds = null;
    },

    // المنتخبات المشاركة حالياً في بطولة بدأت (قوائمها ثابتة حتى الخروج)
    inRunningTournament(state, id, week) {
      for (const cid in state.comps || {}) {
        const c = state.comps[cid];
        if (c.kind !== 'nt' || c.done || c.teams.indexOf(id) < 0) continue;
        if (c.stages[0].w[0][0] < week && (c.out || []).indexOf(id) < 0) return true;
      }
      return false;
    },

    // ================= الاستدعاءات =================
    // الأسابيع الدولية لهذا الموسم (للودّيات)
    windowWeeks(state) {
      const B = BN();
      const w = B.windows.slice();
      const summerT = ['WC', 'EURO', 'COPA'].some((k) => state.comps && state.comps[k]);
      if (!summerT) w.push(B.juneWindow);
      return w;
    },

    // مباريات المنتخبات في أسبوع
    natFixtures(state, week) {
      return (state.fx || []).filter((fx) => fx.w === week && state.comps[fx.c] && state.comps[fx.c].nat);
    },

    // قبل الأسبوع الدولي: استدعاء قوائم كل المنتخبات التي تلعب
    callUps(state, week) {
      Nat.ensure(state);
      const rng = FC.rngOf(state);
      const u = state.user;
      const pool = Nat.pool(state);
      state._ntPool = pool;
      state._ntPoolW = Nat.stamp(state);
      const my = Nat.idOf(u.nat);
      const wasIn = Nat.userIn(state, my);
      const isWindow = Nat.windowWeeks(state).indexOf(week) >= 0;
      // منتخبك أولاً (حتى نعرف هل نحتاج مباريات ودية)
      const myClub = state.clubs[my];
      let calledMe = false;
      const myFixed = Nat.inRunningTournament(state, my, week);
      if (myClub && !myFixed && (isWindow || Nat.natFixtures(state, week).some((fx) => fx.h === my || fx.a === my))) {
        myClub.squad = Nat.selectSquad(state, u.nat, pool);
        calledMe = myClub.squad.indexOf(0) >= 0;
        if (calledMe && isWindow) Nat.addFriendlies(state, rng, my, week);
      }
      // كل المنتخبات التي لها مباريات هذا الأسبوع
      const busy = new Set();
      Nat.natFixtures(state, week).forEach((fx) => {
        busy.add(fx.h);
        busy.add(fx.a);
      });
      busy.forEach((id) => {
        if (id === my && myClub && (myClub.squad.length || myFixed)) return;
        if (Nat.inRunningTournament(state, id, week)) return;
        const club = state.clubs[id];
        if (club) club.squad = Nat.selectSquad(state, club.nat, pool);
      });
      busy.forEach((id) => Nat.pickCaptain(state, id));
      // بطولة تبدأ هذا الأسبوع: يغيب المستدعون عن أنديتهم
      for (const cid in state.comps) {
        const c = state.comps[cid];
        if (c.kind !== 'nt' || c.done) continue;
        const first = c.stages[0].w[0][0];
        if (first !== week) continue;
        c.teams.forEach((id) => {
          const club = state.clubs[id];
          club.awayIds = club.squad.slice();
          club.squad.forEach((pid) => {
            if (pid === 0) {
              u.away = true;
              c.uIn = true;
            } else if (state.players[pid]) state.players[pid].away = 1;
          });
        });
      }
      if (!myFixed) Nat.userCallMsg(state, rng, my, calledMe, wasIn, week);
      // حماية: لا غياب بلا بطولة جارية
      if (u.away && !Nat.inRunningTournament(state, my, week + 1) && !Object.values(state.comps).some((c) => c.kind === 'nt' && !c.done && c.stages[0].w[0][0] === week)) u.away = false;
    },

    // رسالة الاستدعاء (أو الاستبعاد بعد استدعاء سابق)
    userCallMsg(state, rng, my, calledMe, wasIn, week) {
      const u = state.user;
      u.intl = u.intl || Nat.emptyIntl();
      const club = state.clubs[my];
      if (!club) return;
      const fx = (state.fx || []).filter((f) => (f.h === my || f.a === my) && f.w === week && f.hg < 0);
      if (calledMe) {
        u.intl.calls++;
        const opp = fx.map((f) => state.clubs[f.h === my ? f.a : f.h].short).join(' و');
        const first = u.intl.calls === 1;
        FC.Msg.add(state, 'nat', first ? 'أول استدعاء دولي!' : 'استدعاء للمنتخب', FC.TXT.msg(rng, first ? 'ntFirstCall' : 'ntCall', { t: club.short, o: opp || 'مباريات ودية', co: FC.Status.coachName(club.coach) }), first ? { big: 'ntcall' } : null);
        if (club.capt === 0 && !u.intl.capt) {
          u.intl.capt = true;
          FC.Msg.add(state, 'nat', 'قائد المنتخب!', FC.TXT.msg(rng, 'ntCaptain', { t: club.short }), { big: 'captain' });
        } else if (club.capt !== 0 && u.intl.capt) u.intl.capt = false;
      } else if (wasIn && fx.length) {
        FC.Msg.add(state, 'nat', 'خارج القائمة', FC.TXT.msg(rng, 'ntDropped', { t: club.short }));
      }
    },

    // مباريات ودية لمنتخبك في أيام الفترة الدولية الخالية
    addFriendlies(state, rng, my, week) {
      const c = state.comps.FRI;
      if (!c) return;
      const all = FC.DATA.nationOrder.map(Nat.idOf);
      [0, 1].forEach((d) => {
        const busy = new Set();
        (state.fx || []).forEach((fx) => {
          if (fx.w === week && fx.d === d && state.comps[fx.c] && state.comps[fx.c].nat) {
            busy.add(fx.h);
            busy.add(fx.a);
          }
        });
        if (busy.has(my)) return;
        // لا نواجه منتخباً نلعب ضده في نفس الأسبوع
        const already = new Set();
        (state.fx || []).forEach((fx) => {
          if (fx.w === week && (fx.h === my || fx.a === my)) already.add(fx.h === my ? fx.a : fx.h);
        });
        const free = all.filter((id) => id !== my && !busy.has(id) && !already.has(id));
        if (!free.length) return;
        // الخصم: قريب في القوة غالباً
        const myStr = FC.DATA.nations[state.clubs[my].nat].str;
        const opp = free[rng.weighted(free.map((id) => Math.exp(-Math.abs(FC.DATA.nations[state.clubs[id].nat].str - myStr) / 8)))];
        const home = rng.chance(0.5);
        if (c.teams.indexOf(my) < 0) c.teams.push(my);
        if (c.teams.indexOf(opp) < 0) c.teams.push(opp);
        FC.Cups.addFx(state, c, 0, { g: -1, t: -1, l: 0, w: [week, d], h: home ? my : opp, a: home ? opp : my, n: false });
      });
    },

    // قائد المنتخب: الخبرة الدولية + التقييم + العمر
    pickCaptain(state, id) {
      const club = state.clubs[id];
      if (!club || !club.squad.length) return;
      const B = BN();
      let best = null;
      let bs = -1e9;
      club.squad.forEach((pid) => {
        const p = FC.getP(state, pid);
        const caps = pid === 0 ? (p.intl ? p.intl.caps : 0) : p.iC || 0;
        const s = FC.Player.ovr(p) + caps * B.captainCaps + Math.min(8, Math.max(0, p.age - 23)) * 0.6;
        if (s > bs) {
          bs = s;
          best = pid;
        }
      });
      club.capt = best;
    },

    // ================= لاعبك =================
    emptyIntl() {
      return { caps: 0, g: 0, a: 0, mn: 0, rs: 0, calls: 0, capt: false, debut: null, tourn: [] };
    },
    // هل أنت ضمن قائمة المنتخب؟
    userIn(state, ntId) {
      const c = state.clubs[ntId];
      return !!(c && c.nt && c.squad.indexOf(0) >= 0);
    },
    userNt(state) {
      const id = Nat.idOf(state.user.nat);
      return Nat.userIn(state, id) ? id : null;
    },
  });
})(globalThis);
