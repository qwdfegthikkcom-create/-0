/* =========================================================
   حالة اللاعبين (القسمان 11 و12):
   - الإصابات بأنواعها ومددها الواقعية + العودة المبكرة + الأثر الدائم
   - البطاقات والإيقافات (5 صفراء = مباراة، 10 = مباراتان، الحمراء 1–3)
   - الجاهزية (ترتفع باللعب وتنخفض بدونه)
   - ثقة المدرب مع أسبابها، والمدرب نفسه (أسلوبه، إقالته، المدرب الجديد)
   - شارة القيادة
   كل ذلك بدون واجهة حتى يُختبر في Node
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC = G.FC || {};
  const U = FC.util;
  const BI = () => FC.BAL.inj;
  const BS = () => FC.BAL.status;

  // أساليب المدربين وأثرها على الاختيار
  const STYLES = {
    balanced: { name: 'متوازن', desc: 'يختار الأفضل في كل مركز دون تحيز' },
    youth: { name: 'يؤمن بالشباب', desc: 'يمنح اللاعبين حتى 21 سنة فرصاً أكثر' },
    veteran: { name: 'يعتمد على الخبرة', desc: 'يفضّل أصحاب الخبرة (28 سنة فأكثر)' },
    form: { name: 'يكافئ الفورمة', desc: 'الفورمة الأخيرة تهمه أكثر من الاسم' },
  };
  const TRUST_KINDS = { perf: 'الأداء في المباريات', train: 'الجدية في التدريب', disc: 'الانضباط', media: 'التصريحات والإعلام', role: 'قرارات أخرى' };

  const St = (FC.Status = {
    STYLES, TRUST_KINDS,

    // ================= الإصابات =================

    // مضاعف خطر الإصابة للاعبك (لياقة، قابلية، عمر، علاج طبيعي، تجدد الإصابة)
    riskMult(state, p, fit) {
      const B = BI();
      let k = 1;
      const f = fit != null ? fit : p.fit != null ? p.fit : 100;
      if (f < B.fitLow) k *= 1 + (B.fitLow - f) / B.fitK;
      if (p.age > B.ageFrom) k *= 1 + (p.age - B.ageFrom) * B.ageK;
      if (p.id === 0) {
        k *= B.proneMin + (p.hid.inj / 20) * (B.proneMax - B.proneMin);
        if (state.wk && state.wk.physio) k *= B.physioMult;
        if (p.reinj > 0) k *= B.reinjMult;
      }
      return k;
    },

    // إنشاء إصابة: يعيد {k, name, days, total, perm}
    make(rng, severe) {
      const B = BI();
      const T = B.types;
      const w = T.map((t) => (severe && t[2] < 7 ? t[4] * 0.3 : t[4]));
      const t = T[rng.weighted(w)];
      const days = rng.int(t[2], t[3]);
      return { k: t[0], name: t[1], days, total: days, perm: rng.chance(t[5]) };
    },

    // إصابة لاعب ذكاء اصطناعي (بالأسابيع)
    injureAI(p, rng) {
      const inj = St.make(rng);
      p.inj = Math.max(p.inj || 0, Math.ceil(inj.days / 7));
      return inj;
    },

    // إصابة لاعبك
    injureUser(state, rng, where) {
      const u = state.user;
      const inj = St.make(rng);
      inj.where = where || 'match';
      inj.season = state.season;
      inj.week = state.week;
      u.inj = inj;
      u.reinj = 0;
      (u.injHist = u.injHist || []).push({ s: state.season, w: state.week, k: inj.k, d: inj.days });
      if (u.injHist.length > 30) u.injHist.shift();
      const weeks = Math.max(1, Math.round(inj.days / 7));
      FC.Msg.add(state, 'medical', 'تقرير طبي: ' + inj.name, FC.TXT.msg(rng, 'injury', { i: inj.name, d: St.durationText(inj.days), w: weeks }), { big: inj.days >= 21 ? 'injury' : null });
      return inj;
    },

    // «3 أيام» أو «أسبوعان» أو «4 أشهر»
    durationText(days) {
      if (days < 7) return days + ' أيام';
      const w = Math.round(days / 7);
      if (w < 9) return w === 1 ? 'أسبوع' : w === 2 ? 'أسبوعان' : w + ' أسابيع';
      const mo = Math.round(days / 30);
      return mo === 1 ? 'شهر' : mo === 2 ? 'شهران' : mo + ' أشهر';
    },

    // احتمال إصابة لاعب في دقيقة لعب
    perMinute(state, p, fit) {
      return (BI().matchPer90 / 90) * St.riskMult(state, p, fit);
    },

    // دقيقة في محرك الإحصاء: إصابات محتملة للفريقين
    matchMinute(state, m, ev, rng) {
      m.sides.forEach((S, si) => {
        const on = S.xi.filter((x) => x.on);
        const ps = on.map((x) => St.perMinute(state, x.p, x.pid === 0 && m.user ? m.user.fit : x.p.fit));
        const tot = U.sum(ps);
        if (rng.next() >= tot) return;
        const x = on[rng.weighted(ps)];
        St.matchInjury(state, m, S, x, ev, rng);
      });
    },

    // إصابة داخل المباراة: الخروج (إن أمكن) وتسجيل الإصابة
    matchInjury(state, m, S, x, ev, rng) {
      x.injured = true;
      const nm = x.pid === 0 ? FC.Player.displayName(x.p) : x.p.ln;
      if (x.pid === 0) St.injureUser(state, rng, 'match');
      else St.injureAI(x.p, rng);
      if (m.live) FC.Match.say(m, ev, rng, x.pid === 0 ? 'user' : 'info', x.pid === 0 ? 'userInjured' : 'injury', { p: nm, t: S.club.short }, x.pid === 0 ? 2 : 1);
      const ins = S.bench.filter((b) => b.in < 0 && (b.p.pos === 'GK') === (x.role === 'GK') && b.pid !== 0);
      if (S.subsLeft > 0 && ins.length) {
        FC.Match.doSub(state, m, S, x, FC.Match.bestFor(ins, x.slot), ev, rng);
        S.subPlan.pop();
      } else if (x.pid === 0 && m.user) {
        // لا تبديلات متبقية: تخرج ويكمل فريقك بعشرة
        x.on = false;
        x.out = m.min;
        m.user.state = 'off';
        FC.Match.updateRates(m);
      }
    },

    // إصابة في التدريب (المكثف أكثر خطراً)
    trainingRisk(state, rng, intensity) {
      const u = state.user;
      if (u.inj) return null;
      const p = (BI().train[intensity] || 0) * St.riskMult(state, u, u.fit);
      if (rng.next() < p) return St.injureUser(state, rng, 'train');
      return null;
    },

    // الاستشفاء الأسبوعي لإصابتك
    weeklyUser(state, rng) {
      const u = state.user;
      const B = BI();
      if (u.reinj > 0) u.reinj--;
      if (!u.inj) return;
      const inj = u.inj;
      inj.days -= 7 + (state.wk && state.wk.physio ? B.physioDays : 0);
      if (inj.days <= 0) return St.heal(state, rng, false);
      // عرض العودة المبكرة من الجهاز الطبي
      if (!inj.offer && inj.total >= B.earlyMinTotal && inj.days <= B.earlyMaxLeft) {
        inj.offer = true;
        FC.Msg.add(state, 'medical', 'عرض العودة المبكرة', FC.TXT.msg(rng, 'earlyReturn', { d: St.durationText(inj.days) }));
      }
    },

    // انتهاء الإصابة (أو قبول العودة المبكرة)
    heal(state, rng, early) {
      const u = state.user;
      const inj = u.inj;
      if (!inj) return;
      const B = BI();
      u.inj = null;
      u.sharp = Math.min(u.sharp != null ? u.sharp : 70, early ? B.sharpAfterEarly : B.sharpAfter);
      if (early) u.reinj = B.reinjWeeks;
      let txt = FC.TXT.msg(rng, early ? 'backEarly' : 'backFit', { i: inj.name });
      // أثر دائم للإصابات الطويلة
      if (inj.perm && inj.total >= B.permFrom) {
        const loss = rng.int(B.permLoss[0], B.permLoss[1]);
        ['spd', 'acc', 'agi'].forEach((k) => (u.attrs[k] = Math.max(5, u.attrs[k] - loss * rng.float(0.6, 1))));
        if (inj.total >= B.potFrom) u.hid.pot = Math.max(u.hid.pot0 - 3, u.hid.pot - rng.int(1, 3));
        txt += ' ' + FC.TXT.msg(rng, 'injuryPerm', {});
      }
      FC.Msg.add(state, 'medical', early ? 'عودة مبكرة' : 'شُفيت من الإصابة', txt);
    },

    // قرار العودة المبكرة
    earlyReturn(state, accept) {
      const u = state.user;
      if (!u.inj || !u.inj.offer) return false;
      if (accept) St.heal(state, FC.rngOf(state), true);
      else {
        u.inj.offer = false;
        u.inj.declined = true;
      }
      return true;
    },

    // هل اللاعب متاح للمباراة؟
    available(state, p) {
      if (p.id === 0) return !p.inj && !(p.ban > 0);
      return !(p.inj > 0) && !(p.ban > 0);
    },

    // ================= البطاقات والإيقافات =================

    // بعد كل مباراة رسمية: خصم الإيقافات القديمة ثم إضافة الجديدة (للذكاء الاصطناعي)
    afterMatchAI(state, m, rng) {
      if (!m.ref) return;
      const B = BI();
      m.sides.forEach((S) => {
        const club = state.clubs[S.id];
        if (!club) return;
        const inMatch = new Set(S.all.map((x) => x.pid));
        club.squad.forEach((pid) => {
          const p = state.players[pid];
          if (p && p.ban > 0 && !inMatch.has(pid)) p.ban--;
        });
        S.all.forEach((x) => {
          if (x.pid === 0 || x.in < 0) return;
          const p = x.p;
          // اللياقة بعد المباراة
          const mins = FC.Match.minutes(m, x);
          p.fit = Math.max(B.aiFitMin, (p.fit == null ? 100 : p.fit) - (mins / 90) * B.aiFitDrain);
          const ban = St.banFor(rng, x, (p.yk || 0));
          if (x.yc === 1 && !x.rc) p.yk = (p.yk || 0) + 1;
          if (ban) p.ban = (p.ban || 0) + ban;
        });
      });
    },

    // عدد مباريات الإيقاف من مباراة واحدة (prevY: الصفراء المتراكمة قبلها)
    banFor(rng, x, prevY) {
      const B = BI();
      if (x.rc) return x.yc >= 2 ? 1 : B.redBan[rng.weighted(B.redBanW)];
      if (x.yc === 1) {
        const n = prevY + 1;
        if (n % B.yellowLimit === 0) return n / B.yellowLimit;
      }
      return 0;
    },

    // إيقافك بعد مباراتك (أو خصمه إن غبت عنها)
    afterMatchUser(state, m, rng) {
      const u = state.user;
      const mu = m.user;
      const x = mu && mu.x && mu.x.in >= 0 ? mu.x : null;
      if (!m.ref) return;
      if (!x) {
        if (u.ban > 0) {
          u.ban--;
          if (!u.ban) FC.Msg.add(state, 'club', 'انتهى الإيقاف', FC.TXT.msg(rng, 'banOver', {}));
        }
        return;
      }
      const prev = u.season.ycCount || 0;
      const ban = St.banFor(rng, x, prev);
      if (x.yc === 1 && !x.rc) u.season.ycCount = prev + 1;
      if (ban) {
        u.ban = (u.ban || 0) + ban;
        const why = x.rc ? (x.yc >= 2 ? 'second' : 'red') : 'yellows';
        FC.Msg.add(state, 'club', 'إيقاف ' + (ban === 1 ? 'مباراة' : ban === 2 ? 'مباراتين' : ban + ' مباريات'), FC.TXT.msg(rng, 'ban_' + why, { n: ban, y: u.season.ycCount || 0 }));
        St.trust(state, why === 'yellows' ? -2 : -5, 'disc');
      }
    },

    // ================= الجاهزية =================
    sharpAfterMatch(u, mins) {
      const B = BI();
      u.sharp = U.clamp((u.sharp != null ? u.sharp : 70) + (mins / 90) * B.sharpGain, B.sharpMin, 100);
    },
    sharpWeekly(state) {
      const u = state.user;
      const B = BI();
      const played = state.wk && state.wk.last && state.wk.last.played;
      if (!played) u.sharp = U.clamp((u.sharp != null ? u.sharp : 70) - (u.inj ? B.sharpLossInj : B.sharpLoss), B.sharpMin, 100);
    },

    // ================= ثقة المدرب وأسبابها =================
    trust(state, d, kind) {
      const u = state.user;
      if (!d) return;
      u.trust = U.clamp(u.trust + d, 0, 100);
      const log = (u.trustLog = u.trustLog || []);
      const w = state.season * 100 + state.week;
      const last = log[log.length - 1];
      if (last && last.w === w && last.k === kind) last.d = U.round1(last.d + d);
      else log.push({ w, k: kind, d: U.round1(d) });
      if (log.length > 24) log.shift();
    },
    // ملخص الأسباب: [{k, name, d}] مرتبة حسب الأثر
    trustReasons(state) {
      const log = state.user.trustLog || [];
      const sum = {};
      log.slice(-12).forEach((e) => (sum[e.k] = (sum[e.k] || 0) + e.d));
      return Object.keys(sum)
        .map((k) => ({ k, name: TRUST_KINDS[k] || k, d: U.round1(sum[k]) }))
        .filter((r) => Math.abs(r.d) >= 0.5)
        .sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
    },

    // ================= المدرب =================
    coachOf(state, clubId) {
      const club = state.clubs[clubId];
      if (!club) return null;
      if (!club.coach) {
        const h = ((clubId * 2654435761) >>> 0) % 1000;
        const rng = new FC.RNG(h + 77);
        const nat = state.leagues[club.lg] ? state.leagues[club.lg].nat : 'IRQ';
        const nm = FC.World.randomName(rng, rng.chance(0.7) ? nat : 'ESP');
        const keys = Object.keys(STYLES);
        club.coach = { fn: nm[0], ln: nm[1], age: rng.int(38, 64), style: keys[rng.weighted([46, 18, 18, 18])], since: state.season - rng.int(0, 3), sinceW: 0 };
      }
      return club.coach;
    },
    coachName(c) {
      return c ? (c.fn + ' ' + c.ln).replace(/_/g, ' ') : '';
    },

    // مراجعة أسبوعية: إقالة مدرب ناديك بعد سلسلة نتائج سيئة
    coachReview(state, rng) {
      const u = state.user;
      if (u.team === 'Y' || FC.Calendar.phase(state.week) !== 'season') return;
      const B = FC.BAL.coach;
      const cid = u.club;
      const club = state.clubs[cid];
      const L = state.leagues[club.lg];
      if (!L) return;
      const c = St.coachOf(state, cid);
      const tenure = (state.season - c.since) * 52 + state.week - (c.sinceW || 0);
      if (tenure < B.minWeeks) return;
      const form = FC.Comp.clubForm(state, club.lg, cid, B.window);
      if (form.length < B.window) return;
      const pts = form.reduce((s, r) => s + (r === 'W' ? 3 : r === 'D' ? 1 : 0), 0);
      const pos = FC.Comp.position(state, club.lg, cid);
      // الترتيب المتوقع حسب مستوى النادي
      const exp = L.clubs.slice().sort((a, b) => state.clubs[b].lvl - state.clubs[a].lvl).indexOf(cid) + 1;
      if (pts > B.maxPts || pos < exp + B.posGap) return;
      if (!rng.chance(B.chance)) return;
      St.newCoach(state, rng, cid, c);
    },

    newCoach(state, rng, cid, old) {
      const club = state.clubs[cid];
      const L = state.leagues[club.lg];
      const nm = FC.World.randomName(rng, rng.chance(0.6) ? L.nat : ['ESP', 'ITA', 'POR', 'GER', 'FRA', 'BRA'][rng.int(0, 5)]);
      const keys = Object.keys(STYLES);
      club.coach = { fn: nm[0], ln: nm[1], age: rng.int(38, 62), style: keys[rng.int(0, keys.length - 1)], since: state.season, sinceW: state.week };
      const u = state.user;
      const nt = FC.BAL.coach.newTrust;
      const d = nt + rng.int(-6, 6) - u.trust;
      St.trust(state, d, 'role');
      FC.Msg.add(state, 'club', 'إقالة المدرب', FC.TXT.msg(rng, 'coachSacked', { o: St.coachName(old), c: club.name }));
      FC.Msg.add(state, 'coach', 'المدرب الجديد', FC.TXT.msg(rng, 'coachNew', { n: St.coachName(club.coach), s: STYLES[club.coach.style].name, d: STYLES[club.coach.style].desc }));
    },

    // أثر أسلوب المدرب على درجة لاعب
    styleBonus(state, clubId, p) {
      const club = state.clubs[clubId];
      const c = club && club.coach;
      if (!c) return 0;
      const B = FC.BAL.coach;
      if (c.style === 'youth' && p.age <= 21) return B.styleBonus;
      if (c.style === 'veteran' && p.age >= 28) return B.styleBonus;
      if (c.style === 'form') return (FC.Player.formOf(p) - 6.7) * B.formExtra;
      return 0;
    },

    // ================= شارة القيادة =================
    capScore(state, p, clubId) {
      const lead = FC.Player.attr(p, 'lead');
      const years = p.id === 0 ? Math.max(0, state.season - (state.user.joinSeason != null ? state.user.joinSeason : state.startSeason)) : Math.min(8, Math.max(0, p.age - 20) * 0.6);
      return lead * 0.6 + years * 3 + FC.Player.ovr(p) * 0.3 + (p.id === 0 ? state.user.trust * 0.05 : 2.5);
    },
    // تعيين قائد الفريق الأول لناديك (بداية الموسم ومنتصفه)
    captainReview(state, rng) {
      const u = state.user;
      if (u.team === 'Y') return;
      const club = state.clubs[u.club];
      const ids = FC.Select.squadIds(state, u.club, true);
      let best = null;
      let bs = -1;
      ids.forEach((id) => {
        const p = FC.getP(state, id);
        if (!p) return;
        const s = St.capScore(state, p, u.club);
        if (s > bs) {
          bs = s;
          best = id;
        }
      });
      const was = club.capt;
      club.capt = best;
      if (best === 0 && was !== 0) {
        u.captain = true;
        u.morale = U.clamp(u.morale + 5, 0, 100);
        St.trust(state, 4, 'role');
        FC.Msg.add(state, 'coach', 'شارة القيادة!', FC.TXT.msg(rng, 'captain', { c: club.name }), { big: 'captain' });
      } else if (best !== 0 && was === 0) {
        u.captain = false;
        FC.Msg.add(state, 'coach', 'قائد جديد للفريق', FC.TXT.msg(rng, 'captainLost', { p: FC.Player.fullName(state.players[best]) }));
      }
      u.captain = best === 0;
    },

    // ================= الأسبوع =================
    // لاعبو الذكاء الاصطناعي: الاستشفاء وتقدم علاج الإصابات
    weeklyAI(state) {
      const B = BI();
      for (const id in state.players) {
        const p = state.players[id];
        if (p.inj > 0) p.inj--;
        if (p.fit == null || p.fit < 100) p.fit = Math.min(100, (p.fit == null ? 100 : p.fit) + B.aiFitWeekly);
      }
    },

    // بداية موسم جديد: تصفير البطاقات المتراكمة
    newSeason(state) {
      for (const id in state.players) {
        const p = state.players[id];
        p.yk = 0;
      }
    },
  });
})(globalThis);
