/* =========================================================
   العقود والانتقالات والإعارات والوكيل (القسم 13)
   - فترتا انتقالات: صيفية (يونيو–أغسطس) وشتوية (يناير)، وخارجها فقط التفاوض على انتقال حر
   - الأندية تلاحظك حسب التقييم والإمكانات والفورمة ومستوى الدوري والوكيل
   - العروض تصلك كرسائل: توافق، ترفض، أو تفاوض (الراتب، المدة، الدور، الشرط الجزائي)
   - ناديك قد يرفض العرض، ويمكنك طلب الانتقال (يضر بثقة المدرب)
   - أندية الذكاء الاصطناعي تشتري وتبيع كل فترة
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC = G.FC || {};
  const U = FC.util;
  const BT = () => FC.BAL.transfer;
  const ROLES = ['key', 'starter', 'rotation', 'bench', 'youth'];
  const ROLE_NAME = { key: 'عنصر لا غنى عنه', starter: 'أساسي', rotation: 'مداورة', bench: 'احتياط', youth: 'موهبة شابة' };

  const Tr = (FC.Transfer = {
    ROLES, ROLE_NAME,

    // ================= الفترات والعقد =================
    inWindow(state, week) {
      const w = week != null ? week : state.week;
      const B = BT();
      return w >= B.summer[0] || w <= B.summer[1] || (w >= B.winter[0] && w <= B.winter[1]);
    },
    windowName(state) {
      const w = state.week;
      const B = BT();
      if (w >= B.winter[0] && w <= B.winter[1]) return 'الشتوية';
      if (w >= B.summer[0] || w <= B.summer[1]) return 'الصيفية';
      return null;
    },
    // السنوات المتبقية في عقدك (كسور)
    yearsLeft(state, c) {
      c = c || state.user.contract;
      if (!c) return 0;
      return c.end - state.season + (52 - state.week) / 52;
    },

    // منحة الأكاديمية في بداية المسيرة
    youthContract(state) {
      const u = state.user;
      u.contract = { club: u.club, wage: FC.BAL.econ.youthStipend, end: state.season + 2, role: 'youth', bonus: { app: 50, goal: 100, assist: 50, cs: 0 }, release: 0, signed: state.season, youth: true };
      if (u.money == null) u.money = FC.BAL.econ.startMoney;
      if (!u.bank) u.bank = [];
    },

    // أول عقد احترافي عند التصعيد
    firstPro(state) {
      const u = state.user;
      const lg = FC.Econ.leagueOf(state, u.club);
      const wage = FC.Econ.wageFor(FC.Player.ovr(u), lg, 'youth');
      u.contract = { club: u.club, wage, end: state.season + 3, role: 'youth', bonus: FC.Econ.bonusFor(wage, u.pos), release: 0, signed: state.season };
      FC.Econ.txn(state, wage * 4, 'sign', 'مكافأة توقيع أول عقد احترافي');
    },

    // دورك المتوقع في نادٍ حسب منافسيك على المركز
    roleIn(state, clubId, ovr, pos) {
      const club = state.clubs[clubId];
      const n = (FC.World.STARTERS[pos] || 1);
      const better = club.squad.map((id) => state.players[id]).filter((p) => p && FC.Select.fam(p.pos, pos) >= 0.9 && p.ovr > ovr).length;
      if (better === 0 && ovr >= club.lvl + 2) return 'key';
      if (better < n) return 'starter';
      if (better < n + 1) return 'rotation';
      return 'bench';
    },

    // ================= لفت الأنظار =================
    visibility(state) {
      const u = state.user;
      const B = BT();
      const ovr = FC.Player.ovr(u);
      let lg = FC.Econ.leagueOf(state, FC.Game.userTeam(state));
      const lv = lg === 'YTH' ? B.leagueVis.YTH : B.leagueVis[lg] != null ? B.leagueVis[lg] : 0.6;
      const form = u.form.length ? FC.Player.formOf(u) : 6.5;
      let v = lv * (0.5 + U.clamp((form - 6.3) / 1.5, 0, 1)) * (0.6 + U.clamp((ovr - 55) / 30, 0, 0.8));
      if (u.age <= 21) v *= 1 + Math.max(0, u.hid.pot - ovr) / 40;
      v *= u.agent ? 0.85 + u.agent.stars * 0.1 : 0.75;
      if (u.listed) v *= 1.5;
      // المنتخب والبطولات القارية تلفت الأنظار (مهم للموهبة العراقية)
      if (u.intl && u.intl.caps) v *= 1 + Math.min(u.intl.caps, 20) * B.intlVis;
      const contMin = (u.log || []).filter((l) => l.k === 'cup' && l.c && l.c.indexOf('CL_') === 0 && l.mn > 0).length;
      if (contMin) v *= 1 + Math.min(contMin, 8) * B.contVis;
      if (FC.Fame && u.fame != null) v *= 1 + u.fame / 200;
      return v;
    },

    // جاذبية الدوري للاعب
    leagueWeight(state, lg, vis) {
      const L = state.leagues[lg];
      const rep = L ? L.rep : 2;
      let w = 0.6 + rep * 0.25;
      // الدوريات الكبرى تحتاج ظهوراً قوياً (الخطوة الوسطى واقعية)
      if (rep >= 4 && vis < BT().bigLeagueVis) w *= 0.25;
      return w;
    },

    // ================= العروض =================
    active(state) {
      return (state.offers || []).filter((o) => o.status === 'new' || o.status === 'counter');
    },
    byId(state, id) {
      return (state.offers || []).find((o) => o.id === id) || null;
    },

    // بناء عرض من نادٍ
    makeOffer(state, rng, clubId, type) {
      const u = state.user;
      const B = BT();
      const club = state.clubs[clubId];
      const ovr = FC.Player.ovr(u);
      const lg = club.lg;
      const role = type === 'renew' ? Tr.roleIn(state, clubId, ovr, u.pos) : Tr.roleIn(state, clubId, ovr, u.pos);
      const value = FC.Econ.value(state, u);
      let wage = FC.Econ.wageFor(ovr, lg, role === 'key' ? 'key' : role) * rng.float(0.9, 1.15);
      if (u.contract && !u.contract.youth && type !== 'loan') wage = Math.max(wage, u.contract.wage * (type === 'renew' ? 1.05 : 1.15));
      wage = Math.round(wage / 50) * 50;
      const years = type === 'loan' ? 1 : u.age <= 23 ? rng.int(4, 5) : u.age <= 28 ? rng.int(3, 4) : u.age <= 31 ? rng.int(2, 3) : rng.int(1, 2);
      const yl = Tr.yearsLeft(state);
      let fee = 0;
      if (type === 'transfer') fee = Math.round((value * Tr.contractF(yl) * rng.float(0.8, 1.05)) / 1e4) * 1e4;
      const release = lg === 'ESP' ? Math.round((value * rng.float(3, 5)) / 1e5) * 1e5 : rng.chance(B.releaseChance) ? Math.round((value * rng.float(2.5, 4)) / 1e5) * 1e5 : 0;
      state.offerSeq = (state.offerSeq || 0) + 1;
      const agentS = u.agent ? u.agent.stars : 0;
      const o = {
        id: state.offerSeq, type, club: clubId, fee, wage, years, role,
        bonus: FC.Econ.bonusFor(wage, u.pos), release, signOn: type === 'loan' ? 0 : Math.round((wage * rng.float(3, 9)) / 100) * 100,
        exp: FC.Calendar.absWeek(state) + (type === 'renew' ? 4 : B.offerWeeks), status: 'new', rounds: 0,
        maxW: Math.round(wage * (B.maxWageMin + agentS * 0.03 + rng.float(0, 0.15))),
        patience: 2 + (u.agent ? 1 : 0), s: state.season, w: state.week,
      };
      if (type === 'free') o.startNext = true;
      (state.offers = state.offers || []).unshift(o);
      if (state.offers.length > 30) state.offers.length = 30;
      return o;
    },

    // معامل مدة العقد المتبقية
    contractF(yl) {
      if (yl <= 0.6) return 0.5;
      if (yl <= 1.6) return 0.8;
      return 1 + Math.min(0.3, (yl - 2) * 0.1);
    },

    // سعر ناديك الحالي لبيعك
    askPrice(state) {
      const u = state.user;
      const imp = { key: 1.35, starter: 1.15, rotation: 1.0, bench: 0.85, youth: 1.1 }[Tr.roleIn(state, u.club, FC.Player.ovr(u), u.pos)] || 1;
      return FC.Econ.value(state, u) * Tr.contractF(Tr.yearsLeft(state)) * imp * (u.listed ? 0.85 : 1);
    },

    // رسالة العرض
    announce(state, rng, o) {
      const u = state.user;
      const club = state.clubs[o.club];
      const L = state.leagues[club.lg];
      const from = u.agent ? 'agent' : 'club';
      const key = { transfer: 'offerIn', loan: 'offerLoan', free: 'offerFree', renew: 'offerRenew' }[o.type];
      const title = { transfer: 'عرض من ' + club.name, loan: 'عرض إعارة: ' + club.name, free: 'عرض انتقال حر: ' + club.name, renew: 'عرض تجديد العقد' }[o.type];
      const m = FC.Msg.add(state, o.type === 'renew' ? 'club' : from, title, FC.TXT.msg(rng, key, { c: club.name, l: L ? L.name : '', r: ROLE_NAME[o.role], w: FC.Econ.fmt(o.wage), f: FC.Econ.fmt(o.fee), y: o.years, a: u.agent ? u.agent.name : '' }), { offer: o.id, big: o.type === 'renew' ? null : 'offer' });
      o.msgId = m.id;
    },

    // ================= الأسبوع =================
    weekly(state, rng) {
      const u = state.user;
      const B = BT();
      const aw = FC.Calendar.absWeek(state);
      // انتهاء صلاحية العروض
      (state.offers || []).forEach((o) => {
        if ((o.status === 'new' || o.status === 'counter') && aw > o.exp) o.status = 'expired';
      });
      // ميزانيات الصيف
      if (state.week === B.summer[0]) FC.Econ.setBudgets(state, rng);
      // عروض لك
      if (!u.loan && !u.nextContract) {
        const yl = Tr.yearsLeft(state);
        const inW = Tr.inWindow(state);
        const preFree = !inW && u.contract && !u.contract.youth && yl <= B.freeMonths / 12 && FC.Calendar.phase(state.week) === 'season';
        if ((inW || preFree) && Tr.active(state).length < B.maxActive && rng.next() < B.offerBase * Tr.visibility(state)) {
          const type = preFree ? 'free' : Tr.pickType(state, rng);
          const cid = Tr.pickClub(state, rng, type);
          if (cid != null) {
            const o = Tr.makeOffer(state, rng, cid, type);
            if (o.type === 'transfer' && state.clubs[cid].budget != null && o.fee > state.clubs[cid].budget) o.status = 'withdrawn';
            else Tr.announce(state, rng, o);
          }
        }
      }
      // اللاعب الحر بلا عروض: عروض جديدة من أندية أصغر
      if (u.freeAgent && !Tr.active(state).length) Tr.freeOffers(state, rng);
      // تجديد العقد من ناديك
      Tr.renewal(state, rng);
      // نصيحة الوكيل كل فترة
      if (u.agent && state.week % 10 === 5) Tr.agentAdvice(state, rng);
      // انتقالات أندية الذكاء الاصطناعي
      if (B.aiWeeks.indexOf(state.week) >= 0) Tr.aiWindow(state, rng, state.week === B.winter[0] + 1);
    },

    // نوع العرض: إعارة للشاب الذي لا يلعب، وإلا انتقال
    pickType(state, rng) {
      const u = state.user;
      const share = u.minHist.length ? U.avg(u.minHist) : 0.5;
      if (u.team === 'F' && u.age <= 22 && share < 0.3 && rng.chance(0.6)) return 'loan';
      return 'transfer';
    },

    // اختيار النادي المهتم
    pickClub(state, rng, type) {
      const u = state.user;
      const ovr = FC.Player.ovr(u);
      const vis = Tr.visibility(state);
      const cur = u.contract ? u.contract.club : u.club;
      const myLg = state.clubs[cur] ? state.clubs[cur].lg : null;
      const ids = [];
      const w = [];
      for (const id in state.clubs) {
        const c = state.clubs[id];
        if (c.youth || c.nt || c.gen || c.id === cur || c.id === u.club) continue;
        let lo = ovr - 5;
        let hi = ovr + 7;
        if (type === 'loan') {
          lo = ovr - 7;
          hi = ovr + 1;
        }
        if (u.team === 'Y') hi = ovr + 10; // موهبة الأكاديمية: عقد احترافي أول
        if (u.freeAgent) lo = ovr - 12; // اللاعب الحر يقبل أندية أصغر
        if (c.lvl < lo || c.lvl > hi) continue;
        let wt = Math.exp(-Math.abs(c.lvl - (ovr + 1)) / 4) * Tr.leagueWeight(state, c.lg, vis) * (c.lg === myLg ? 1.3 : 1) * (c.rep / 60);
        if (u.team === 'Y' && c.lg !== myLg) wt *= 0.3;
        ids.push(c.id);
        w.push(wt);
      }
      if (!ids.length) return null;
      return ids[rng.weighted(w)];
    },

    // عرض تجديد من ناديك
    renewal(state, rng) {
      const u = state.user;
      const B = BT();
      const c = u.contract;
      if (!c || c.youth || u.loan || u.nextContract) return;
      if (B.renewWeeks.indexOf(state.week) < 0) return;
      if (Tr.active(state).some((o) => o.type === 'renew')) return;
      const yl = Tr.yearsLeft(state);
      const fair = FC.Econ.wageFor(FC.Player.ovr(u), FC.Econ.leagueOf(state, c.club), Tr.roleIn(state, c.club, FC.Player.ovr(u), u.pos));
      const underpaid = c.wage < fair * 0.6 && u.trust >= 55;
      if ((yl <= 1.6 && u.trust >= B.renewTrust) || underpaid) {
        const o = Tr.makeOffer(state, rng, c.club, 'renew');
        Tr.announce(state, rng, o);
      }
    },

    // ================= الرد والتفاوض =================
    // action: 'accept' | 'reject' | 'counter' (ask: {wage, years, role, release})
    respond(state, id, action, ask) {
      const o = Tr.byId(state, id);
      const rng = FC.rngOf(state);
      if (!o || (o.status !== 'new' && o.status !== 'counter')) return { ok: false, msg: 'العرض لم يعد متاحاً' };
      if (action === 'reject') {
        o.status = 'rejected';
        return { ok: true, msg: 'رفضت العرض' };
      }
      if (action === 'counter') return Tr.counter(state, o, ask, rng);
      return Tr.accept(state, o, rng);
    },

    counter(state, o, ask, rng) {
      const u = state.user;
      o.rounds++;
      const agentS = u.agent ? u.agent.stars : 0;
      const roleStep = Math.max(0, ROLES.indexOf(o.role) - ROLES.indexOf(ask.role || o.role));
      let greed = (ask.wage || o.wage) / o.maxW + roleStep * 0.12;
      if (ask.release === 'low' && o.release) greed += 0.08;
      if (ask.years && Math.abs(ask.years - o.years) >= 2) greed += 0.05;
      if (greed <= 1) {
        o.wage = Math.round(ask.wage || o.wage);
        o.years = ask.years || o.years;
        if (roleStep) o.role = ask.role;
        if (ask.release === 'low' && o.release) o.release = Math.round(o.release * 0.6 / 1e5) * 1e5;
        o.status = 'counter';
        o.agreed = true;
        return { ok: true, status: 'agreed', msg: 'النادي وافق على شروطك! أكّد التوقيع.' };
      }
      const collapse = greed > 1.15 ? U.clamp(0.35 + (greed - 1.15) * 2 - agentS * 0.05, 0.1, 0.95) : o.rounds > o.patience ? 0.5 : 0;
      if (rng.next() < collapse) {
        o.status = 'collapsed';
        return { ok: true, status: 'collapsed', msg: 'انهارت المفاوضات: النادي انسحب بسبب مطالبك.' };
      }
      // النادي يقترح حلاً وسطاً
      o.wage = Math.round(Math.min(o.maxW, ((ask.wage || o.wage) + o.maxW) / 2 * 0.98) / 50) * 50;
      if (roleStep === 1 && rng.chance(0.5)) o.role = ask.role;
      if (ask.years) o.years = Math.round((ask.years + o.years) / 2);
      o.status = 'counter';
      return { ok: true, status: 'counter', msg: 'النادي قدّم عرضاً مضاداً: ' + FC.Econ.fmt(o.wage) + ' أسبوعياً.' };
    },

    accept(state, o, rng) {
      const u = state.user;
      const club = state.clubs[o.club];
      if (o.type === 'renew') {
        Tr.sign(state, o, o.club);
        o.status = 'accepted';
        FC.Msg.add(state, 'club', 'تجديد العقد', FC.TXT.msg(rng, 'renewed', { c: club.name, y: o.years, w: FC.Econ.fmt(o.wage) }));
        FC.Status.trust(state, 4, 'role');
        return { ok: true, status: 'done', msg: 'وقّعت عقداً جديداً مع ' + club.name };
      }
      if (o.type === 'free') {
        u.nextContract = { offer: o.id, club: o.club };
        o.status = 'accepted';
        FC.Msg.add(state, 'agent', 'اتفاق مبدئي', FC.TXT.msg(rng, 'preContract', { c: club.name }));
        return { ok: true, status: 'done', msg: 'اتفقت مع ' + club.name + ' على الانتقال الحر بنهاية الموسم' };
      }
      if (!Tr.inWindow(state)) return { ok: false, msg: 'فترة الانتقالات مغلقة' };
      if (o.type === 'loan') {
        const role = Tr.roleIn(state, u.club, FC.Player.ovr(u), u.pos);
        if ((role === 'key' || role === 'starter') && u.age > 21 && !rng.chance(0.4)) {
          o.status = 'refused';
          return { ok: true, status: 'refused', msg: 'ناديك رفض إعارتك: أنت مهم للفريق.' };
        }
        Tr.loanOut(state, o, rng);
        return { ok: true, status: 'done', msg: 'انتقلت معاراً إلى ' + club.name };
      }
      // انتقال نهائي: موافقة ناديك الحالي
      const ask = Tr.askPrice(state);
      const rel = u.contract && u.contract.release;
      let fee = o.fee;
      let ok = rel && fee >= rel;
      if (!ok && fee >= ask * 0.95) ok = true;
      if (!ok && (club.budget == null || club.budget >= ask) && rng.chance(0.55)) {
        fee = Math.round(ask / 1e4) * 1e4;
        ok = true;
      }
      if (!ok) {
        o.status = 'refused';
        const cur = state.clubs[u.contract ? u.contract.club : u.club];
        FC.Msg.add(state, 'club', 'ناديك رفض العرض', FC.TXT.msg(rng, 'clubRefused', { c: club.name, f: FC.Econ.fmt(o.fee), a: FC.Econ.fmt(ask), m: cur.name }));
        return { ok: true, status: 'refused', msg: 'ناديك رفض بيعك بهذا المبلغ (يطلب ' + FC.Econ.fmt(ask) + ')' };
      }
      o.fee = fee;
      Tr.moveUser(state, o, rng);
      return { ok: true, status: 'done', msg: 'انتقلت إلى ' + club.name + ' مقابل ' + FC.Econ.fmt(fee) };
    },

    // توقيع العقد
    sign(state, o, clubId) {
      const u = state.user;
      u.contract = { club: clubId, wage: o.wage, end: state.season + o.years - (state.week >= BT().summer[0] ? 0 : 1) + (o.startNext ? 1 : 0), role: o.role, bonus: o.bonus, release: o.release, signed: state.season };
      if (o.signOn) FC.Econ.txn(state, o.signOn, 'sign', 'مكافأة التوقيع');
    },

    // نقل لاعبك إلى نادٍ جديد
    moveUser(state, o, rng) {
      const u = state.user;
      const oldId = u.contract ? u.contract.club : u.club;
      const old = state.clubs[oldId];
      const club = state.clubs[o.club];
      if (o.fee) {
        if (club.budget != null) club.budget -= o.fee;
        if (old && old.budget != null) old.budget += o.fee;
      }
      Tr.sign(state, o, o.club);
      o.status = 'accepted';
      (u.clubHist = u.clubHist || []).push({ club: o.club, s: state.season, w: state.week, fee: o.fee || 0, type: o.type });
      u.club = o.club;
      u.team = 'F';
      u.num = 0;
      u.listed = false;
      u.loan = null;
      u.captain = false;
      u.joinSeason = state.season;
      u.trust = FC.BAL.coach.newTrust + ({ key: 12, starter: 6, rotation: 0, bench: -6, youth: -3 }[o.role] || 0);
      u.trustLog = [];
      u.morale = U.clamp(u.morale + 6, 0, 100);
      if (u.form.length > 2) u.form = u.form.slice(-2);
      FC.World.assignNumbers(state, club, rng);
      Tr.logUser(state, oldId, o);
      FC.Msg.add(state, 'club', 'مرحباً بك في ' + club.name, FC.TXT.msg(rng, 'transferDone', { c: club.name, n: u.num, f: o.fee ? FC.Econ.fmt(o.fee) : 'انتقال حر', r: ROLE_NAME[o.role] }), { big: 'transfer' });
      if (old && club.lg !== old.lg && state.leagues[club.lg] && state.leagues[club.lg].nat !== u.nat) {
        u.abroad = { s: state.season, w: state.week }; // الغربة (تُستخدم في أحداث المرحلة 5)
      }
      // باقي العروض تُلغى
      Tr.active(state).forEach((x) => (x.status = 'expired'));
    },

    // الإعارة
    loanOut(state, o, rng) {
      const u = state.user;
      const club = state.clubs[o.club];
      o.status = 'accepted';
      u.loan = { parent: u.contract ? u.contract.club : u.club, until: state.season + (state.week >= BT().summer[0] ? 1 : 0), wage: u.contract ? u.contract.wage : 0 };
      (u.clubHist = u.clubHist || []).push({ club: o.club, s: state.season, w: state.week, fee: 0, type: 'loan' });
      u.club = o.club;
      u.team = 'F';
      u.num = 0;
      u.trust = FC.BAL.coach.newTrust + 5;
      u.trustLog = [];
      u.captain = false;
      FC.World.assignNumbers(state, club, rng);
      FC.Msg.add(state, 'club', 'إعارة إلى ' + club.name, FC.TXT.msg(rng, 'loanDone', { c: club.name, n: u.num }), { big: 'transfer' });
      Tr.active(state).forEach((x) => (x.status = 'expired'));
    },

    // سجل انتقالك في أخبار الانتقالات
    logUser(state, from, o) {
      (state.tlog = state.tlog || []).unshift({ s: state.season, w: state.week, pid: 0, name: FC.Player.fullName(state.user), from, to: o.club, fee: o.fee || 0, loan: o.type === 'loan' });
      if (state.tlog.length > 150) state.tlog.length = 150;
    },

    // طلب الانتقال (يضر بثقة المدرب ويخفض سعرك)
    requestTransfer(state) {
      const u = state.user;
      if (u.listed || u.team === 'Y' || u.loan) return false;
      u.listed = true;
      FC.Status.trust(state, -BT().requestTrust, 'role');
      u.morale = U.clamp(u.morale - 3, 0, 100);
      FC.Msg.add(state, 'club', 'طلب الانتقال', FC.TXT.msg(FC.rngOf(state), 'requestTransfer', {}));
      return true;
    },

    // ================= نهاية الموسم =================
    // عند الانتقال لموسم جديد: الإعارات تعود، والعقود المنتهية، والاتفاقات المسبقة
    rollover(state, rng) {
      const u = state.user;
      if (u.loan && state.season >= u.loan.until) {
        const back = state.clubs[u.loan.parent];
        u.club = u.loan.parent;
        u.loan = null;
        u.num = 0;
        u.trust = Math.max(u.trust, 45);
        FC.World.assignNumbers(state, back, rng);
        FC.Msg.add(state, 'club', 'العودة من الإعارة', FC.TXT.msg(rng, 'loanBack', { c: back.name }));
      }
      if (u.nextContract) {
        const o = Tr.byId(state, u.nextContract.offer);
        u.nextContract = null;
        if (o) {
          o.fee = 0;
          o.startNext = false;
          Tr.moveUser(state, o, rng);
          return;
        }
      }
      const c = u.contract;
      if (!c) return;
      if (c.youth) {
        if (c.end < state.season) c.end = state.season + 1; // منحة الأكاديمية تتجدد حتى التصعيد
        return;
      }
      if (c.end < state.season) {
        // انتهى العقد: لاعب حر
        u.contract = null;
        u.freeAgent = true;
        FC.Msg.add(state, 'agent', 'أنت لاعب حر', FC.TXT.msg(rng, 'freeAgent', {}), { big: 'free' });
        Tr.freeOffers(state, rng);
      }
    },

    // عروض فورية للاعب الحر
    freeOffers(state, rng) {
      const u = state.user;
      const n = 2 + (u.agent ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const cid = Tr.pickClub(state, rng, 'transfer');
        if (cid == null) continue;
        const o = Tr.makeOffer(state, rng, cid, 'transfer');
        o.fee = 0;
        o.type = 'free';
        o.startNext = false;
        o.exp = FC.Calendar.absWeek(state) + 6;
        Tr.announce(state, rng, o);
      }
      // ناديك السابق يعرض عودتك إن كانت الثقة مقبولة
      const prev = u.clubHist && u.clubHist.length ? u.clubHist[u.clubHist.length - 1].club : u.club;
      if (state.clubs[prev] && !state.clubs[prev].youth && u.trust >= 30) {
        const o = Tr.makeOffer(state, rng, prev, 'transfer');
        o.fee = 0;
        o.type = 'free';
        o.wage = Math.round(o.wage * 0.9);
        o.exp = FC.Calendar.absWeek(state) + 6;
        Tr.announce(state, rng, o);
      }
    },

    // قبول العرض الحر كلاعب حر (بدون انتظار نهاية الموسم)
    signFree(state, o, rng) {
      o.fee = 0;
      Tr.moveUser(state, o, rng);
      state.user.freeAgent = false;
    },

    // نصيحة من وكيلك حسب وضعك
    agentAdvice(state, rng) {
      const u = state.user;
      const share = u.minHist.length ? U.avg(u.minHist) : 0.5;
      const yl = Tr.yearsLeft(state);
      let key;
      if (u.contract && !u.contract.youth && yl <= 1.2) key = 'advContract';
      else if (share < 0.3 && u.age <= 22) key = 'advLoan';
      else if (u.form.length >= 3 && FC.Player.formOf(u) >= 7.2) key = 'advHot';
      else key = 'advGeneral';
      FC.Msg.add(state, 'agent', 'نصيحة من وكيلك', FC.TXT.msg(rng, key, { v: FC.Econ.fmt(FC.Econ.value(state, u)) }), { reply: 'agentAdvice' });
    },

    // ================= الوكلاء =================
    AGENTS: [
      { name: 'سامر الخطيب', stars: 1, fee: 5 },
      { name: 'نادر العلي', stars: 2, fee: 6 },
      { name: 'ماركو فيرّاري', stars: 3, fee: 7 },
      { name: 'جوزيه مينديش', stars: 4, fee: 8 },
      { name: 'الأخوان حداد', stars: 5, fee: 10 },
    ],
    // هل يقبل الوكيل تمثيلك؟ (الوكلاء الكبار يريدون لاعبين كباراً)
    agentAccepts(state, a) {
      const u = state.user;
      const ovr = FC.Player.ovr(u);
      const need = [0, 50, 60, 70, 78][a.stars - 1];
      return ovr + Math.max(0, u.hid.pot - ovr) * 0.3 + (u.fame || 0) * 0.1 >= need;
    },
    hireAgent(state, i) {
      const a = Tr.AGENTS[i];
      if (!a || !Tr.agentAccepts(state, a)) return false;
      state.user.agent = Object.assign({ since: state.season }, a);
      FC.Msg.add(state, 'agent', 'وكيلك الجديد', FC.TXT.msg(FC.rngOf(state), 'agentHired', { a: a.name, s: a.stars, f: a.fee }));
      return true;
    },
    fireAgent(state) {
      state.user.agent = null;
    },

    // ================= انتقالات الذكاء الاصطناعي =================
    aiWindow(state, rng, winter) {
      const B = BT();
      const BW = FC.BAL.world;
      const clubs = Object.values(state.clubs).filter((c) => !c.youth && !c.nt);
      let moves = 0;
      clubs.sort((a, b) => (b.budget || 0) - (a.budget || 0));
      const all = Object.values(state.players);
      clubs.forEach((C) => {
        if (!rng.chance(winter ? B.aiBuyWinter : B.aiBuySummer)) return;
        if (C.budget != null && C.budget < 1e5) return;
        // المركز الأضعف مقارنة بمستوى النادي
        const pick = FC.Select.pick(state, C.id);
        let weak = null;
        pick.xi.forEach((x) => {
          if (x.pid === 0) return;
          const p = state.players[x.pid];
          if (!p) return;
          const gap = p.ovr - C.lvl;
          if (gap < -B.aiWeakGap && (!weak || gap < weak.gap)) weak = { slot: x.slot, p, gap };
        });
        if (!weak) return;
        const needOvr = weak.p.ovr + 3;
        let best = null;
        let bs = -1e9;
        for (let i = 0; i < all.length; i++) {
          const q = all[i];
          if (!q || q.club === C.id || q.ovr < needOvr || q.age > 30 || q.inj > 0) continue;
          const from = state.clubs[q.club];
          if (!from || from.youth || from.lvl >= C.lvl - 1) continue;
          if (FC.Select.fam(q.pos, weak.slot) < 0.9) continue;
          const price = FC.Econ.value(state, q) * Tr.contractF((q.ce || state.season + 2) - state.season + 0.5);
          if (C.budget != null && price > C.budget) continue;
          const s = q.ovr - needOvr + (from.lg === C.lg ? 1 : 0) - price / 5e7 + rng.float(0, 2);
          if (s > bs) {
            bs = s;
            best = { q, price };
          }
        }
        if (!best) return;
        Tr.moveAI(state, rng, best.q, C, best.price);
        moves++;
        // المشتري يخفف الزيادة، والبائع يعوّض بموهبة لاحقاً
        if (C.squad.length > BW.squadMax) Tr.releaseWorst(state, C);
      });
      // الأندية التي نقصت: مواهب جديدة
      clubs.forEach((c) => {
        const L = FC.Cups ? FC.Cups.leagueFor(state, c) : state.leagues[c.lg];
        while (c.squad.length < BW.squadMin) FC.Regens.newTalent(state, rng, c, L);
      });
      return moves;
    },

    moveAI(state, rng, p, to, fee) {
      const from = state.clubs[p.club];
      state.tcount = state.tcount || {};
      state.tcount[state.season] = (state.tcount[state.season] || 0) + 1;
      if (from) {
        from.squad.splice(from.squad.indexOf(p.id), 1);
        if (from.budget != null) from.budget += fee;
      }
      if (to.budget != null) to.budget -= fee;
      to.squad.push(p.id);
      (state.tlog = state.tlog || []).unshift({ s: state.season, w: state.week, pid: p.id, name: FC.Player.fullName(p), from: p.club, to: to.id, fee: Math.round(fee) });
      if (state.tlog.length > 150) state.tlog.length = 150;
      p.club = to.id;
      p.num = 0;
      p.ce = state.season + rng.int(2, 5);
      FC.World.assignNumbers(state, to, rng);
    },

    // تسريح الأضعف (الأكبر سناً) عند زيادة التشكيلة
    releaseWorst(state, club) {
      const worst = club.squad.map((id) => state.players[id]).sort((a, b) => a.ovr - a.age * 0.3 - (b.ovr - b.age * 0.3))[0];
      if (!worst) return;
      club.squad.splice(club.squad.indexOf(worst.id), 1);
      delete state.players[worst.id];
    },

    // ================= اللعب التلقائي =================
    // قرار تلقائي (للمحاكاة السريعة والاختبار): يقبل العرض المفيد لمسيرتك
    autoDecide(state, rng) {
      const u = state.user;
      const offers = Tr.active(state);
      if (!offers.length) return null;
      const cur = state.clubs[u.contract ? u.contract.club : u.club];
      const share = u.minHist.length ? U.avg(u.minHist) : 0.5;
      let best = null;
      let bs = -1e9;
      offers.forEach((o) => {
        const c = state.clubs[o.club];
        let s = (c.lvl - (cur && !cur.youth ? cur.lvl : c.lvl - 3)) + (o.role === 'key' ? 3 : o.role === 'starter' ? 2 : o.role === 'rotation' ? 0 : -3) + Math.log(o.wage / Math.max(100, u.contract ? u.contract.wage : 100));
        if (o.type === 'loan') s = share < 0.3 ? 2 : -5;
        if (o.type === 'renew') s = 1.5 + (u.freeAgent ? 5 : 0);
        if (u.freeAgent) s += 5;
        if (s > bs) {
          bs = s;
          best = o;
        }
      });
      if (!best || (bs < 1.5 && !u.freeAgent)) {
        offers.forEach((o) => {
          if (FC.Calendar.absWeek(state) >= o.exp) o.status = 'rejected';
        });
        return null;
      }
      if (u.freeAgent && best.type === 'free') {
        Tr.signFree(state, best, rng);
        return best;
      }
      return Tr.accept(state, best, rng);
    },
  });
})(globalThis);
