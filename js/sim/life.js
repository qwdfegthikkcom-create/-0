/* =========================================================
   الحياة خارج الملعب (القسم 17): الشهرة والمتابعون، الأخبار، «نبض» (التواصل الاجتماعي)،
   المقابلات، الرعاة، نمط الحياة والخدمات، الأحداث العشوائية، الغربة، والغريم
   (منطق بدون واجهة — يُختبر في Node)
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC = G.FC || {};
  const U = FC.util;
  const BL = () => FC.BAL.life;
  const T = () => FC.TXT;

  // لهجة الجماهير حسب ثقافة البلد
  const DIALECT = { iraq: 'iraq', gulf: 'gulf', levant: 'levant', egypt: 'egypt', maghreb: 'maghreb' };
  const ARABIC_LG = { IRQ: 1, KSA: 1 };

  // ================= الأحداث العشوائية (نظيفة ومحترمة) =================
  // fx: trust, morale, fame, money (مبلغ)، wage (أسابيع من راتبك)، fit، boost (أسابيع تطور ×1.05)، lang، rumor (أسابيع ظهور أعلى)
  const EVENTS = [
    {
      id: 'mentor', w: 1.2, from: 'mate', title: 'نصيحة من المخضرم',
      ok: (st) => !!Life.veteran(st),
      vars: (st) => { const v = Life.veteran(st); return { m: FC.Player.fullName(v), a: v.age }; },
      text: 'زميلك المخضرم {m} ({a} سنة) اقترب منك بعد التدريب: «لديك موهبة كبيرة، لكن التفاصيل الصغيرة هي ما يصنع النجوم. إن أردت، ابقَ معي بعد التدريب هذا الأسبوع».',
      opts: [
        { t: 'أقبل وأطلب حصصاً إضافية معه', fx: { trust: 1, boost: 4, fit: -3 }, r: 'تعلمت منه أسرار التمركز والتوقيت. ستشعر بالفرق في الأسابيع القادمة.' },
        { t: 'أشكره بلطف', fx: { morale: 1 }, r: 'ابتسم وقال: «الباب مفتوح متى أردت».' },
      ],
    },
    {
      id: 'posRival', w: 1, from: 'coach', title: 'منافسة على المركز',
      ok: (st) => st.user.team === 'F' && !!Life.posRival(st),
      vars: (st) => ({ m: FC.Player.fullName(Life.posRival(st)) }),
      text: 'المدرب أخبرك أن {m} يقدم مستويات قوية في التدريبات، وأن المنافسة على مركزك مفتوحة.',
      opts: [
        { t: 'سأضاعف جهدي في التدريب', fx: { trust: 2, fit: -8 }, r: 'المدرب لاحظ جديتك. التعب واضح، لكن الرسالة وصلت.' },
        { t: 'أطلب حديثاً صريحاً مع المدرب', fx: { trust: -1, morale: 1 }, r: 'المدرب استمع لك، لكنه قال: «الملعب هو من يقرر».' },
        { t: 'أدعم زميلي، المنافسة تفيد الفريق', fx: { morale: 2, trust: 1 }, r: 'روحك الرياضية أعجبت الجميع في غرفة الملابس.' },
      ],
    },
    {
      id: 'family', w: 0.8, from: 'family', title: 'مناسبة عائلية',
      ok: () => true,
      text: 'أخوك يتزوج في نهاية الأسبوع، والعائلة كلها تتمنى حضورك.',
      opts: [
        { t: 'أسافر وأحضر الزفاف', fx: { morale: 6, fit: -4, trust: -1 }, r: 'كانت ليلة جميلة وسط العائلة. عدت بمعنويات عالية.' },
        { t: 'أرسل هدية وأتصل بالفيديو', fx: { morale: 3, wage: -0.5 }, r: 'فرحت العائلة بهديتك ومكالمتك.' },
        { t: 'أبقى مركزاً على التدريب', fx: { morale: -2, trust: 1 }, r: 'العائلة تفهمت، لكنك شعرت بالحنين.' },
      ],
    },
    {
      id: 'charity', w: 0.8, from: 'club', title: 'مباراة خيرية',
      ok: (st) => (st.user.fame || 0) >= 8,
      text: 'دعوة للمشاركة في مباراة خيرية يعود ريعها لدعم مستشفى أطفال في {city}.',
      vars: (st) => ({ city: st.user.city || 'مدينتك' }),
      opts: [
        { t: 'أشارك بكل سرور', fx: { fame: 1.5, morale: 2, fit: -4 }, r: 'الصور مع الأطفال انتشرت في كل مكان. يوم لا يُنسى.' },
        { t: 'أتبرع بدل المشاركة', fx: { fame: 1, wage: -1 }, r: 'تبرعك وصل، والمستشفى شكرك علناً.' },
        { t: 'أعتذر بلطف', fx: {}, r: 'المنظمون تفهموا انشغالك.' },
      ],
    },
    {
      id: 'rumor', w: 1, from: 'media', title: 'إشاعة انتقال',
      ok: (st) => (st.user.fame || 0) >= 10 && st.user.team === 'F' && !!Life.rumorClub(st),
      vars: (st) => ({ c: st.clubs[Life.rumorClub(st)].name }),
      text: 'صحيفة كبرى تقول إن {c} مهتم بضمك، والصحفيون ينتظرون ردك.',
      opts: [
        { t: 'أنفي وأؤكد التزامي بناديي', fx: { trust: 2, morale: 1 }, r: 'الجماهير والمدرب قدّروا كلامك.' },
        { t: '«كل شيء ممكن في كرة القدم»', fx: { fame: 1, trust: -2, rumor: 8 }, r: 'تصريحك أشعل الصحافة… والأندية بدأت تراقبك أكثر.' },
        { t: 'لا تعليق', fx: {}, r: 'الإشاعة ستهدأ وحدها.' },
      ],
    },
    {
      id: 'abroad', w: 2, from: 'family', title: 'الغربة',
      ok: (st) => Life.abroadActive(st),
      text: 'الحياة بعيداً عن الوطن ليست سهلة: لغة جديدة، طعام مختلف، والعائلة بعيدة. تشعر بالوحدة بعد التدريبات.',
      opts: [
        { t: 'أبدأ دروس لغة مكثفة', fx: { lang: 15, wage: -0.2, morale: 1 }, r: 'بدأت تفهم زملاءك أكثر، والتأقلم يتسارع.' },
        { t: 'أدعو عائلتي لزيارتي', fx: { morale: 5, wage: -0.3 }, r: 'زيارة العائلة أعادت لك الدفء.' },
        { t: 'أستكشف المدينة مع زملائي', fx: { morale: 2, trust: 1, lang: 6 }, r: 'تعرفت على المدينة وعلى زملائك أكثر.' },
      ],
    },
    {
      id: 'award', w: 1.2, from: 'league', title: 'ترشيح لجائزة',
      ok: (st) => st.user.team === 'F' && st.user.form.length >= 4 && FC.Player.formOf(st.user) >= 7.5 && FC.Calendar.phase(st.week) === 'season',
      text: 'رابطة الدوري رشحتك لجائزة أفضل لاعب في الشهر بعد مستوياتك الأخيرة!',
      opts: [
        { t: 'أشكر الجماهير على «نبض»', fx: { fame: 2 }, r: 'منشورك حصد تفاعلاً ضخماً.' },
        { t: 'أهدي الترشيح لعائلتي وزملائي', fx: { fame: 1, morale: 3, trust: 1 }, r: 'كلماتك المتواضعة لاقت إعجاب الجميع.' },
      ],
    },
    {
      id: 'school', w: 0.8, from: 'fans', title: 'زيارة مدرسة',
      ok: (st) => (st.user.fame || 0) >= 5,
      text: 'مدرسة ابتدائية في {city} تدعوك لزيارة التلاميذ والحديث عن الرياضة والاجتهاد.',
      vars: (st) => ({ city: st.clubs[FC.Game.userTeam(st)] ? st.clubs[FC.Game.userTeam(st)].city : 'المدينة' }),
      opts: [
        { t: 'أزورهم وأوقّع على قمصانهم', fx: { fame: 1, morale: 3, fit: -2 }, r: 'فرحة الأطفال لا توصف، وأنت أيضاً.' },
        { t: 'أرسل قمصاناً موقّعة', fx: { fame: 0.4, wage: -0.1 }, r: 'المدرسة شكرتك برسالة جميلة.' },
      ],
    },
    {
      id: 'dinner', w: 1, from: 'mate', title: 'عشاء الفريق',
      ok: (st) => st.user.team === 'F',
      text: 'زملاؤك يخططون لعشاء جماعي الليلة لتقوية روح الفريق.',
      opts: [
        { t: 'أنضم إليهم', fx: { morale: 2, trust: 1 }, r: 'ضحكات وأحاديث… الفريق صار أقرب.' },
        { t: 'أفضّل الراحة', fx: { fit: 5, morale: -1 }, r: 'نمت مبكراً واستعدت لياقتك.' },
      ],
    },
    {
      id: 'outOfPos', w: 0.6, from: 'coach', title: 'طلب من المدرب',
      ok: (st) => st.user.team === 'F' && st.user.pos !== 'GK' && FC.Calendar.phase(st.week) === 'season',
      text: 'المدرب يعاني من الغيابات، ويسألك إن كنت مستعداً للعب في مركز غير مركزك عند الحاجة.',
      opts: [
        { t: 'أنا في خدمة الفريق', fx: { trust: 3, morale: -1 }, r: 'المدرب: «هذا ما أحتاجه من لاعبيّ».' },
        { t: 'أفضّل مركزي الأساسي', fx: { trust: -3, morale: 1 }, r: 'المدرب لم يعلّق، لكنه لم يكن سعيداً.' },
      ],
    },
    {
      id: 'youngFan', w: 0.7, from: 'fans', title: 'رسالة من مشجع صغير',
      ok: (st) => (st.user.fame || 0) >= 6,
      text: 'طفل عمره 9 سنوات أرسل لك رسماً لك وأنت تسجل، وكتب: «أريد أن أصبح مثلك».',
      opts: [
        { t: 'أرسل له فيديو شكر', fx: { morale: 3, fame: 0.4 }, r: 'والدته نشرت الفيديو، والطفل لم يتوقف عن القفز فرحاً.' },
        { t: 'أدعوه لحضور التدريب', fx: { morale: 3, fame: 1.2, wage: -0.05 }, r: 'زيارته للتدريب كانت أجمل لحظة في الأسبوع.' },
      ],
    },
    {
      id: 'leader', w: 0.6, from: 'coach', title: 'قيادة الشباب',
      ok: (st) => st.user.team === 'F' && st.user.age >= 26,
      text: 'المدرب يطلب منك رعاية اللاعبين الشباب الجدد ومساعدتهم على التأقلم.',
      opts: [
        { t: 'بكل سرور', fx: { trust: 2, fame: 0.4, fit: -2 }, r: 'الشباب يلتفون حولك، والمدرب يراك قائداً.' },
        { t: 'أفضّل التركيز على نفسي', fx: { trust: -1 }, r: 'المدرب تفهّم، لكنه كان يتوقع أكثر.' },
      ],
    },
    {
      id: 'camp', w: 0.7, from: 'club', title: 'معسكر تدريبي خاص',
      ok: (st) => FC.Calendar.isIntlBreak(st.week + 1) && !(FC.Nat && FC.Nat.userIn(st, FC.Nat.idOf(st.user.nat))),
      text: 'النادي ينظم معسكراً خاصاً خلال التوقف الدولي للاعبين غير المستدعين.',
      opts: [
        { t: 'أشارك في المعسكر', fx: { boost: 3, fit: -5, trust: 1 }, r: 'أسبوع مكثف رفع مستواك البدني والفني.' },
        { t: 'أستغل التوقف للراحة', fx: { fit: 8, morale: 2 }, r: 'عدت بطاقة متجددة.' },
      ],
    },
    {
      id: 'critic', w: 1, from: 'media', title: 'انتقاد إعلامي',
      ok: (st) => st.user.form.length >= 3 && FC.Player.formOf(st.user) <= 6.2 && (st.user.fame || 0) >= 6,
      text: 'محلل تلفزيوني شهير انتقد مستواك بقوة وقال إنك «لا تستحق مكانك».',
      opts: [
        { t: 'أرد بهدوء: الملعب سيجيب', fx: { trust: 1, morale: 1 }, r: 'ردك الهادئ كسب احترام الجماهير.' },
        { t: 'أرد بقوة على «نبض»', fx: { fame: 1.5, trust: -2 }, r: 'ردك صار ترند… والجدل مستمر.' },
        { t: 'أتجاهل الأمر', fx: { morale: -1 }, r: 'حاولت ألا تقرأ التعليقات.' },
      ],
    },
    {
      id: 'shoot', w: 1, from: 'agent', title: 'تصوير إعلان',
      ok: (st) => (st.user.sponsors || []).length > 0,
      vars: (st) => ({ b: st.user.sponsors[0].name }),
      text: 'شركة {b} تطلب يوم تصوير لحملتها الإعلانية الجديدة.',
      opts: [
        { t: 'أحضر التصوير', fx: { wage: 0.3, fame: 0.6, fit: -3 }, r: 'الحملة انطلقت بصورتك في كل مكان.' },
        { t: 'أطلب تأجيله للتركيز على المباريات', fx: { trust: 1 }, r: 'الشركة وافقت على مضض.' },
      ],
    },
  ];

  const Life = (FC.Life = {
    EVENTS,

    // ================= التهيئة =================
    ensure(state) {
      const u = state.user;
      if (!u) return;
      const B = BL();
      if (u.fame == null) u.fame = B.fameStart;
      if (u.followers == null) u.followers = Life.followersOf(u.fame);
      if (!u.sponsors) u.sponsors = [];
      if (!u.spOffers) u.spOffers = [];
      if (!u.life) u.life = { home: 0, car: 0, svc: {}, lang: {}, boost: 0, rumor: 0 };
      if (u.event === undefined) u.event = null;
      if (!state.news) state.news = [];
      if (!state.social) state.social = [];
      if (state.newsSeq == null) state.newsSeq = 0;
      if (!state.rival) Life.makeRival(state, FC.rngOf(state));
    },

    // المتابعون من الشهرة
    followersOf(fame) {
      const B = BL();
      return Math.round(B.followersBase * Math.exp(B.followersK * fame));
    },
    fmtNum(n) {
      if (n >= 1e6) return U.round1(n / 1e6) + ' مليون';
      if (n >= 1e3) return Math.round(n / 1e3) + ' ألف';
      return String(Math.round(n));
    },

    // الشهرة «المستحقة» حسب مستواك ودوريك ومبارياتك الدولية وألقابك (الشهرة تقترب منها ولا تتجاوزها كثيراً)
    fameCap(state) {
      const u = state.user;
      const B = BL().cap;
      const ovr = FC.Player.ovr(u);
      const caps = u.intl ? u.intl.caps : 0;
      const tro = (u.trophies || []).length;
      const vis = Life.visF(state);
      return U.clamp(B.base + (ovr - 55) * B.ovrK * (0.6 + vis * 0.35) + Math.min(B.capsMax, caps * B.capsK) + Math.min(B.trophyMax, tro * B.trophyK), 5, 100);
    },

    // تغيير الشهرة (الزيادة تتباطأ كلما اقتربت من شهرتك المستحقة)
    addFame(state, d) {
      const u = state.user;
      if (!d) return;
      if (d > 0) d *= U.clamp((Life.fameCap(state) + BL().cap.over - (u.fame || 0)) / 12, 0.05, 1) * Math.max(0.15, 1 - u.fame / 115);
      u.fame = U.clamp(U.round1((u.fame || 0) + d), 0, 100);
      u.followers = Math.round(Life.followersOf(u.fame) * (u.trend || 1));
    },

    // معامل ظهور دوري ناديك (أوروبا أعلى من العراق)
    visF(state) {
      const lg = FC.Game.userLeague(state);
      const v = FC.BAL.transfer.leagueVis[lg];
      return v != null ? 0.5 + v : 0.8;
    },

    // ================= الأخبار =================
    news(state, k, key, vars) {
      const rng = FC.rngOf(state);
      const list = T().NEWS[key];
      if (!list) return null;
      state.newsSeq = (state.newsSeq || 0) + 1;
      const n = { id: state.newsSeq, s: state.season, w: state.week, k, h: FC.TXT.fill(FC.TXT.pick(rng, list, 'n_' + key), vars) };
      state.news.unshift(n);
      if (state.news.length > BL().newsMax) state.news.length = BL().newsMax;
      return n;
    },

    // ================= بعد مباراتك =================
    afterMatch(state, m, sum) {
      Life.ensure(state);
      const u = state.user;
      const B = BL();
      const rng = FC.rngOf(state);
      if (!sum.played) return;
      const st = sum.userStats;
      const F = B.fame;
      const S = m.sides[sum.si];
      const O = m.sides[1 - sum.si];
      let d = F.play + st.g * F.goal + st.a * F.assist;
      if (sum.motm === 0) d += F.motm;
      if (sum.rating >= 8) d += F.rating8;
      if (sum.rating < 5.8) d += F.bad;
      if (m.big || m.derby) d *= F.bigMult;
      if (sum.kind === 'nat') d *= F.natMult;
      else if (sum.c && sum.c.indexOf('CL_') === 0) d *= F.contMult;
      d *= Life.visF(state);
      Life.addFame(state, d);
      // «ترند» بعد مباراة استثنائية
      u.trend = sum.rating >= B.trendRating || st.g >= 3 ? 1.12 : 1;
      if (u.trend > 1) u.followers = Math.round(Life.followersOf(u.fame) * u.trend);
      // الأخبار
      const vars = { p: FC.Player.displayName(u), t: S.club.short, o: O.club.short, sc: S.goals + '-' + O.goals, g: u.season.g, n: sum.rating };
      if (st.g >= 3) Life.news(state, 'you', 'youHat', vars);
      else if (sum.rating >= 8.2 && S.goals > O.goals) Life.news(state, 'you', 'youStar', vars);
      else if (st.g > 0 && (u.fame >= 15 || rng.chance(0.4))) Life.news(state, 'you', 'youGoal', vars);
      else if (sum.rating <= 5.6 && S.goals < O.goals && u.fame >= 10) Life.news(state, 'you', 'youBad', vars);
      const total = u.career.g + (u.intl ? u.intl.g : 0);
      const prev = total - st.g;
      [50, 100, 150, 200, 250, 300, 400, 500].forEach((ms) => {
        if (prev < ms && total >= ms) Life.news(state, 'you', 'youMilestone', { p: vars.p, n: ms });
      });
      // منشور بعد المباراة (تختار نبرته) ومقابلة بعد المباريات الكبيرة
      const res = sum.pens ? (sum.pens[sum.si] > sum.pens[1 - sum.si] ? 'win' : 'loss') : S.goals > O.goals ? 'win' : S.goals < O.goals ? 'loss' : 'draw';
      sum.post = { res, g: st.g, r: sum.rating, opp: O.club.short, s: S.goals + '-' + O.goals };
      const big = m.big || m.derby || sum.kind !== 'lg' || sum.rating >= 8;
      if (big || rng.chance(B.interviewChance)) {
        const Q = T().INTERVIEW.q;
        const ctx = sum.kind === 'nat' ? 'nat' : st.g > 0 && rng.chance(0.5) ? 'goal' : sum.kind === 'cup' && rng.chance(0.5) ? 'cup' : res;
        sum.interview = { q: FC.TXT.pick(rng, Q[ctx], 'iq_' + ctx), ctx };
      }
    },

    // منشورك على «نبض»
    post(state, tone, info) {
      Life.ensure(state);
      const u = state.user;
      const B = BL();
      const rng = FC.rngOf(state);
      const P = T().POSTS[tone] || T().POSTS.humble;
      const txt = FC.TXT.pick(rng, P[info.res] || P.win, 'p_' + tone + info.res);
      const fx = B.post[tone] || {};
      Life.addFame(state, fx.fame || 0);
      if (fx.trust) FC.Status.trust(state, fx.trust, 'media');
      // التفاعل: نسبة من المتابعين حسب الأداء
      const perf = U.clamp((info.r || 6.5) - 5.5, 0.3, 4);
      const likes = Math.round(u.followers * rng.float(0.02, 0.05) * perf * (tone === 'fiery' ? 1.4 : 1));
      const post = { id: (state.newsSeq = (state.newsSeq || 0) + 1), s: state.season, w: state.week, tone, txt, likes, trend: (u.trend || 1) > 1, cm: Life.comments(state, rng, info, tone) };
      state.social.unshift(post);
      if (state.social.length > B.socialMax) state.social.length = B.socialMax;
      return post;
    },

    // تعليقات الجماهير (لهجة بلد النادي ولهجة بلدك)
    comments(state, rng, info, tone) {
      const u = state.user;
      const F = T().FANS;
      const club = state.clubs[FC.Game.userTeam(state)];
      const lg = club ? club.lg : null;
      const clubCult = lg && state.leagues[lg] && FC.DATA.nations[state.leagues[lg].nat] ? FC.DATA.nations[state.leagues[lg].nat].cult : 'msa';
      const clubNat = lg && state.leagues[lg] ? state.leagues[lg].nat : u.nat;
      const myCult = FC.DATA.nations[u.nat] ? FC.DATA.nations[u.nat].cult : 'msa';
      const good = (info.r || 6.5) >= 6.6 && info.res !== 'loss';
      const out = [];
      const n = rng.int(3, 5);
      for (let i = 0; i < n; i++) {
        const home = rng.chance(0.55);
        const cult = home ? clubCult : myCult;
        const nat = home ? clubNat : u.nat;
        const d = F[DIALECT[cult]] || F.msa;
        let txt;
        if (tone === 'fiery' && rng.chance(0.4)) txt = rng.pick(F.fiery);
        else txt = rng.pick(good || rng.chance(0.25) ? d.good : d.bad);
        const nm = FC.World.randomName(rng, nat);
        out.push([nm[0] + (rng.chance(0.5) ? '_' + rng.int(7, 99) : ''), txt]);
      }
      return out;
    },

    // إجابتك في المقابلة
    interview(state, tone, q) {
      Life.ensure(state);
      const u = state.user;
      const B = BL();
      const rng = FC.rngOf(state);
      const fx = B.interview[tone] || {};
      const ans = FC.TXT.pick(rng, T().INTERVIEW.a[tone] || T().INTERVIEW.a.humble, 'ia_' + tone);
      Life.addFame(state, (fx.fame || 0) * Life.visF(state));
      if (fx.morale) u.morale = U.clamp(u.morale + fx.morale, 0, 100);
      if (fx.trust) FC.Status.trust(state, fx.trust, 'media');
      const p = FC.Player.displayName(u);
      if (tone === 'fiery') Life.news(state, 'you', 'youFiery', { p });
      else if (u.fame >= 20 || rng.chance(0.3)) Life.news(state, 'you', 'youInterview', { p, q: ans });
      return ans;
    },

    // ================= الحدث الإعلامي في خطة الأسبوع =================
    media(state) {
      Life.ensure(state);
      const u = state.user;
      const B = BL().media;
      const wage = u.contract ? u.contract.wage : 0;
      const pay = Math.max(B.min, Math.round((wage * B.wage + Life.sponsorWeekly(u.fame) * 0.5) / 50) * 50);
      FC.Econ.txn(state, pay, 'media', 'حدث إعلامي وإعلاني');
      Life.addFame(state, B.fame);
      u.morale = U.clamp(u.morale + B.morale, 0, 100);
      return pay;
    },

    // ================= الرعاة =================
    sponsorWeekly(fame) {
      const B = BL().sponsor;
      return Math.round((B.base * Math.exp(B.k * fame)) / 50) * 50;
    },

    // عرض رعاية جديد (فئة غير مستخدمة)
    makeSponsorOffer(state, rng) {
      const u = state.user;
      const used = new Set(u.sponsors.map((s) => s.cat).concat(u.spOffers.map((o) => o.cat)));
      const brands = T().BRANDS.filter((b) => !used.has(b.cat));
      if (!brands.length) return null;
      const b = rng.pick(brands);
      const B = BL().sponsor;
      const conds = ['starter', 'goals', 'fame', 'rating', 'clean'];
      const role = FC.Player.POS[u.pos].role;
      let ck = rng.pick(conds);
      if (ck === 'goals' && (role === 'GK' || role === 'CB')) ck = 'rating';
      const cv = ck === 'goals' ? (role === 'ST' || role === 'W' ? 8 : role === 'CAM' ? 6 : 3) : ck === 'fame' ? Math.max(5, Math.floor(u.fame * 0.8)) : ck === 'rating' ? 6.6 : 0;
      const weekly = Math.round((Life.sponsorWeekly(u.fame) * rng.float(0.8, 1.2)) / 50) * 50;
      const o = { id: b.id + state.season + '_' + state.week, brand: b.id, name: b.name, cat: b.cat, catName: b.catName, icon: b.icon, weekly, ck, cv, seasons: rng.int(B.seasons[0], B.seasons[1]), exp: state.week + B.expire, s: state.season };
      u.spOffers.push(o);
      FC.Msg.add(state, 'agent', 'عرض رعاية من ' + b.name, 'شركة ' + b.name + ' (' + b.catName + ') تعرض عليك ' + FC.Econ.fmt(weekly) + ' أسبوعياً لمدة ' + o.seasons + (o.seasons === 1 ? ' موسم' : ' مواسم') + '. الشرط: ' + Life.condText(o) + '. راجع تطبيق «الرعاة».');
      return o;
    },
    condText(o) {
      return FC.TXT.fill(T().SPONSOR_COND[o.ck] || '', { n: o.cv });
    },

    acceptSponsor(state, id) {
      const u = state.user;
      const i = u.spOffers.findIndex((o) => o.id === id);
      if (i < 0 || u.sponsors.length >= BL().sponsor.max) return false;
      const o = u.spOffers.splice(i, 1)[0];
      u.sponsors.push({ brand: o.brand, name: o.name, cat: o.cat, catName: o.catName, icon: o.icon, weekly: o.weekly, ck: o.ck, cv: o.cv, until: state.season + o.seasons - 1, warn: 0, since: state.season });
      Life.news(state, 'you', 'youSponsor', { p: FC.Player.displayName(u), b: o.name });
      Life.addFame(state, 0.5);
      return true;
    },
    declineSponsor(state, id) {
      const u = state.user;
      u.spOffers = u.spOffers.filter((o) => o.id !== id);
    },

    // هل الشرط متحقق؟
    condOk(state, sp) {
      const u = state.user;
      const s = u.season;
      if (sp.ck === 'starter') return s.ap < 4 || s.st / s.ap >= 0.5;
      if (sp.ck === 'goals') return state.week < 30 || s.g + s.a >= sp.cv;
      if (sp.ck === 'fame') return u.fame >= sp.cv;
      if (sp.ck === 'rating') return s.ap < 4 || s.rs / s.ap >= sp.cv;
      if (sp.ck === 'clean') return !s.rc;
      return true;
    },

    // ================= نمط الحياة =================
    svcCost(state, key) {
      const u = state.user;
      const c = BL().services[key];
      const wage = u.contract ? u.contract.wage : 0;
      return Math.max(c[1], Math.round((wage * c[0]) / 50) * 50);
    },
    has(state, key) {
      const l = state.user && state.user.life;
      return !!(l && l.svc && l.svc[key]);
    },
    setService(state, key, on) {
      Life.ensure(state);
      state.user.life.svc[key] = !!on;
    },
    buy(state, kind, lvl) {
      Life.ensure(state);
      const u = state.user;
      const list = kind === 'home' ? T().HOMES : T().CARS;
      const item = list[lvl];
      if (!item || lvl <= u.life[kind]) return false;
      if ((u.money || 0) < item.price) return false;
      FC.Econ.txn(state, -item.price, 'buy', 'شراء: ' + item.name);
      u.life[kind] = lvl;
      u.morale = U.clamp(u.morale + BL().buyMorale[lvl], 0, 100);
      if (lvl >= 3) Life.addFame(state, 0.6);
      return true;
    },
    growthF(state) {
      const l = state.user && state.user.life;
      if (!l) return 1;
      let f = 1;
      if (l.svc && l.svc.trainer) f *= BL().trainerGrowth;
      if (l.boost > 0) f *= 1.05;
      return f;
    },

    // ================= الغربة =================
    // أول موسم في بلد بلغة مختلفة: معنويات تنخفض حتى تتعلم اللغة
    abroadActive(state) {
      const u = state.user;
      if (!u.life) return false;
      const lg = FC.Game.userLeague(state);
      const L = state.leagues[lg];
      if (!L || L.youth) return false;
      const home = FC.DATA.nations[u.nat] ? FC.DATA.nations[u.nat].cult : '';
      const arab = !!DIALECT[home];
      if (L.nat === u.nat || (arab && ARABIC_LG[L.nat])) return false;
      return (u.life.lang[L.nat] || 0) < 60;
    },

    // ================= الغريم =================
    makeRival(state, rng) {
      const u = state.user;
      const my = FC.DATA.nations[u.nat];
      const big = ['ESP', 'FRA', 'BRA', 'ARG', 'ENG', 'GER', 'POR', 'NED', 'ITA'];
      const same = FC.DATA.nationOrder.filter((k) => k !== u.nat && FC.DATA.nations[k].conf === my.conf && FC.DATA.nations[k].str >= my.str - 6);
      let nat = rng.chance(0.5) && same.length ? rng.pick(same) : rng.pick(big.filter((k) => k !== u.nat));
      // نادٍ من دوري بلده (أو نادٍ مولّد، أو دوري كبير)
      let clubs = Object.values(state.clubs).filter((c) => !c.youth && !c.nt && ((c.lg === nat) || (c.gen && c.nat === nat)));
      if (!clubs.length) clubs = Object.values(state.clubs).filter((c) => !c.youth && !c.nt && !c.gen && c.lg !== FC.Game.userLeague(state) && c.lg !== u.nat);
      const club = rng.pick(clubs);
      const ovr = FC.Player.ovr(u) + rng.float(-1.5, 1.5);
      const pot = Math.round(U.clamp(u.hid.pot + rng.float(-BL().rival.spread, BL().rival.spread), ovr + 5, 94));
      const p = FC.World.makePlayer(state, rng, { nat, pos: u.pos, age: u.age, ovr, pot, club: club.id });
      club.squad.push(p.id);
      p.ce = state.season + 4;
      FC.World.assignNumbers(state, club, rng);
      state.rival = { pid: p.id, hist: [], lastG: 0, lastClub: club.id };
      return p;
    },
    rival(state) {
      return state.rival ? state.players[state.rival.pid] || null : null;
    },
    // أهداف الغريم هذا الموسم (الدوري + الكؤوس)
    rivalGoals(state) {
      const p = Life.rival(state);
      if (!p) return 0;
      let g = p.sG;
      for (const id in state.comps || {}) {
        const c = state.comps[id];
        if (!c.nat && c.sc[p.id]) g += c.sc[p.id][0];
      }
      return g;
    },

    // ================= الأحداث العشوائية =================
    pickEvent(state, rng) {
      const cands = EVENTS.filter((e) => {
        try {
          return e.ok(state);
        } catch (err) {
          return false;
        }
      });
      if (!cands.length) return null;
      const recent = state.user.life.recentEv || [];
      const pool = cands.filter((e) => recent.indexOf(e.id) < 0);
      const list = pool.length ? pool : cands;
      return list[rng.weighted(list.map((e) => e.w))];
    },
    startEvent(state, rng, ev) {
      const u = state.user;
      const vars = ev.vars ? ev.vars(state, rng) : {};
      u.event = { id: ev.id, title: ev.title, text: FC.TXT.fill(ev.text, vars), exp: state.week + BL().events.expire, s: state.season, opts: ev.opts.map((o) => o.t) };
      const r = (u.life.recentEv = u.life.recentEv || []);
      r.push(ev.id);
      if (r.length > 5) r.shift();
      FC.Msg.add(state, ev.from || 'club', ev.title, u.event.text + ' (اختر ردك من الرئيسية)');
    },
    // اختيارك في الحدث
    chooseEvent(state, idx) {
      const u = state.user;
      const e = u.event;
      if (!e) return null;
      const def = EVENTS.find((x) => x.id === e.id);
      const opt = def && def.opts[idx];
      u.event = null;
      if (!opt) return null;
      Life.applyFx(state, opt.fx);
      return opt.r;
    },
    applyFx(state, fx) {
      const u = state.user;
      if (fx.trust) FC.Status.trust(state, fx.trust, 'media');
      if (fx.morale) u.morale = U.clamp(u.morale + fx.morale, 0, 100);
      if (fx.fame) Life.addFame(state, fx.fame);
      if (fx.fit) u.fit = U.clamp(u.fit + fx.fit, 0, 100);
      if (fx.wage) {
        const w = u.contract ? u.contract.wage : 300;
        const amt = Math.round((w * fx.wage) / 10) * 10;
        FC.Econ.txn(state, amt, fx.wage > 0 ? 'media' : 'life', fx.wage > 0 ? 'دخل إعلاني' : 'مصاريف شخصية');
      }
      if (fx.boost) u.life.boost = Math.max(u.life.boost || 0, fx.boost);
      if (fx.rumor) u.life.rumor = Math.max(u.life.rumor || 0, fx.rumor);
      if (fx.lang) {
        const lg = FC.Game.userLeague(state);
        const nat = state.leagues[lg] ? state.leagues[lg].nat : null;
        if (nat) u.life.lang[nat] = Math.min(100, (u.life.lang[nat] || 0) + fx.lang);
      }
    },

    // نادٍ «مهتم» للإشاعات: أقوى من ناديك بقليل
    rumorClub(state) {
      const u = state.user;
      const ovr = FC.Player.ovr(u);
      const cur = FC.Game.userTeam(state);
      let best = null;
      for (const id in state.clubs) {
        const c = state.clubs[id];
        if (c.youth || c.nt || c.gen || c.id === cur) continue;
        if (c.lvl >= ovr && c.lvl <= ovr + 6 && (!best || ((c.id * 7919 + state.week) % 13) > ((best.id * 7919 + state.week) % 13))) best = c;
      }
      return best ? best.id : null;
    },

    veteran(state) {
      const u = state.user;
      const club = state.clubs[FC.Game.userTeam(state)];
      if (!club) return null;
      return club.squad.map((id) => state.players[id]).filter((p) => p && p.age >= 31).sort((a, b) => b.ovr - a.ovr)[0] || null;
    },
    posRival(state) {
      const u = state.user;
      const club = state.clubs[FC.Game.userTeam(state)];
      if (!club) return null;
      return club.squad.map((id) => state.players[id]).filter((p) => p && FC.Select.fam(p.pos, u.pos) >= 0.9 && Math.abs(p.ovr - FC.Player.ovr(u)) <= 4).sort((a, b) => b.ovr - a.ovr)[0] || null;
    },

    // ================= الأسبوع =================
    weekly(state, rng, rep) {
      Life.ensure(state);
      const u = state.user;
      const B = BL();
      // الخدمات الأسبوعية
      const svc = u.life.svc;
      let cost = 0;
      for (const k in svc) if (svc[k]) cost += Life.svcCost(state, k);
      if (cost) FC.Econ.txn(state, -cost, 'life', 'خدمات شخصية أسبوعية');
      if (svc.lang) Life.applyFx(state, { lang: B.abroad.lesson });
      if (u.life.boost > 0) u.life.boost--;
      if (u.life.rumor > 0) u.life.rumor--;
      // دعم المعنويات من البيت والسيارة
      const owned = u.life.home + u.life.car;
      if (owned) u.morale = U.clamp(u.morale + owned * B.ownedMorale, 0, 100);
      // الغربة
      if (Life.abroadActive(state)) {
        const lg = FC.Game.userLeague(state);
        const nat = state.leagues[lg].nat;
        const lang = u.life.lang[nat] || 0;
        u.morale = U.clamp(u.morale - B.abroad.drift * (1 - lang / 60), 0, 100);
        u.life.lang[nat] = Math.min(100, lang + B.abroad.langWeekly);
      }
      // الرعاة: الدخل والشروط
      if (u.sponsors.length) {
        let inc = 0;
        u.sponsors.forEach((sp) => (inc += sp.weekly));
        FC.Econ.txn(state, inc, 'sponsor', 'عقود الرعاية');
        if (state.week % B.sponsor.checkEvery === 0 && FC.Calendar.phase(state.week) === 'season') {
          u.sponsors = u.sponsors.filter((sp) => {
            if (Life.condOk(state, sp)) {
              sp.warn = 0;
              return true;
            }
            sp.warn++;
            if (sp.warn >= 2) {
              FC.Msg.add(state, 'agent', 'انتهاء رعاية ' + sp.name, 'شركة ' + sp.name + ' أنهت عقد الرعاية لعدم تحقق الشرط: ' + Life.condText(sp) + '.');
              return false;
            }
            FC.Msg.add(state, 'agent', 'تحذير من ' + sp.name, 'شركة ' + sp.name + ' تذكّرك بشرط العقد: ' + Life.condText(sp) + '. إن لم يتحقق في المراجعة القادمة سينتهي العقد.');
            return true;
          });
        }
      }
      // عروض رعاية جديدة
      u.spOffers = u.spOffers.filter((o) => o.s === state.season && o.exp >= state.week);
      if (u.fame >= B.sponsor.minFame && u.sponsors.length + u.spOffers.length < B.sponsor.max && rng.chance(B.sponsor.offerChance * (0.6 + u.fame / 60))) Life.makeSponsorOffer(state, rng);
      // الشهرة: تراجع بسيط إن لم تلعب
      const played = state.wk && state.wk.last && state.wk.last.played;
      if (!played && u.fame > 10) Life.addFame(state, -B.fameDecay);
      // فوق الشهرة المستحقة: تراجع تدريجي
      const cap = Life.fameCap(state);
      if (u.fame > cap + B.cap.over) Life.addFame(state, -(u.fame - cap - B.cap.over) * B.cap.decay);
      u.trend = 1;
      u.followers = Life.followersOf(u.fame);
      // حدث عشوائي
      if (u.event && (u.event.s !== state.season || u.event.exp < state.week)) {
        Life.chooseEvent(state, u.event.opts.length - 1);
      }
      if (!u.event && rng.chance(B.events.chance + (Life.abroadActive(state) ? 0.08 : 0))) {
        const ev = Life.pickEvent(state, rng);
        if (ev) Life.startEvent(state, rng, ev);
      }
      // أخبار العالم
      Life.worldNews(state, rng);
    },

    // أخبار الدوري والنادي والانتقالات والغريم
    worldNews(state, rng) {
      const u = state.user;
      const team = FC.Game.userTeam(state);
      const lg = FC.Game.userLeague(state);
      const L = state.leagues[lg];
      if (L && !L.youth && FC.Calendar.phase(state.week) === 'season') {
        // سلسلة ناديك
        const form = FC.Comp.clubForm(state, lg, team, 8);
        let run = 0;
        for (let i = form.length - 1; i >= 0 && form[i] === form[form.length - 1]; i--) run++;
        const lastW = form[form.length - 1];
        const club = state.clubs[team];
        const r = L.roundWeeks.indexOf(state.week);
        if (r >= 0 && run >= 4 && run % 2 === 0 && lastW !== 'D') Life.news(state, 'club', lastW === 'W' ? 'clubStreak' : 'clubCrisis', { t: club.name, n: run });
        // الصدارة والهدافون
        if (r >= 5 && r % 6 === 0) {
          const t = FC.Comp.table(state, lg);
          Life.news(state, 'league', 'leagueTop', { t: state.clubs[t[0].id].name, l: L.name, n: t[0].pts - t[1].pts });
        }
        if (r >= 8 && r % 8 === 4) {
          const top = FC.Comp.leaders(state, lg, 'sG', 1)[0];
          if (top) Life.news(state, 'league', 'leagueScorer', { p: top.pid === 0 ? FC.Player.displayName(u) : FC.Player.fullName(state.players[top.pid]), l: L.name, n: top.v });
        }
      }
      // صفقات كبيرة هذا الأسبوع
      (state.tlog || []).filter((t) => t.s === state.season && t.w === state.week && t.fee >= 25e6).slice(0, 2).forEach((t) => {
        const to = state.clubs[t.to];
        if (to) Life.news(state, 'transfer', 'bigTransfer', { p: t.name.replace(/_/g, ' '), t: to.name, f: FC.Econ.fmt(t.fee) });
      });
      // أبطال المسابقات
      for (const id in state.comps || {}) {
        const c = state.comps[id];
        if (!c.done || c.newsDone || !c.win || c.kind === 'q' || c.kind === 'fr') continue;
        c.newsDone = true;
        if (c.kind === 'cup' && c.lg !== lg) continue;
        Life.news(state, c.nat ? 'intl' : 'league', 'champion', { t: state.clubs[c.win].name, c: c.name });
      }
      // الغريم
      const rv = Life.rival(state);
      const R = state.rival;
      if (rv && R) {
        const g = Life.rivalGoals(state);
        const nm = FC.Player.fullName(rv);
        const rc = state.clubs[rv.club];
        if (rc && R.lastClub !== rv.club) {
          Life.news(state, 'rival', 'rivalTransfer', { r: nm, t: rc.name });
          R.lastClub = rv.club;
        } else if (rc && g - R.lastG >= 2) Life.news(state, 'rival', 'rivalGood', { r: nm, t: rc.short, n: g - R.lastG });
        R.lastG = g;
        if (state.week === 20 || state.week === 40) Life.news(state, 'rival', 'compare', { p: FC.Player.displayName(u), r: nm, g: u.season.g, n: g });
      }
    },

    // بداية موسم جديد
    newSeason(state) {
      Life.ensure(state);
      const u = state.user;
      // عقود الرعاية المنتهية
      u.sponsors = u.sponsors.filter((sp) => {
        if (sp.until >= state.season) return true;
        FC.Msg.add(state, 'agent', 'انتهت رعاية ' + sp.name, 'انتهى عقد الرعاية مع ' + sp.name + '. ستصلك عروض جديدة حسب شهرتك.');
        return false;
      });
      u.spOffers = [];
      if (state.rival) state.rival.lastG = 0;
    },

    // الغريم يبحث عن دقائق لعب: ينتقل كل صيف إلى نادٍ يناسب مستواه (حتى تسير مسيرته بالتوازي معك)
    rivalMove(state, rng) {
      const p = Life.rival(state);
      if (!p || p.age > 33) return;
      const cur = state.clubs[p.club];
      if (!cur) return;
      const gap = cur.lvl - p.ovr;
      if (gap <= 4 && gap >= -3) return;
      // نادٍ مستواه قريب من مستوى الغريم (+1)، يفضَّل دوري بلده ثم الدوريات الكبرى كلما تطور
      const target = p.ovr + 1;
      let best = null;
      let bs = -1e9;
      for (const id in state.clubs) {
        const c = state.clubs[id];
        if (c.youth || c.nt || c.id === p.club) continue;
        const L = state.leagues[c.lg];
        let sc = -Math.abs(c.lvl - target) * 2 + rng.float(0, 2);
        if (c.lg === p.nat || (c.gen && c.nat === p.nat)) sc += 3;
        if (L && L.rep >= 4 && p.ovr >= 76) sc += 3;
        if (c.id === FC.Game.userTeam(state)) sc -= 50;
        if (sc > bs) {
          bs = sc;
          best = c;
        }
      }
      if (best) FC.Transfer.moveAI(state, rng, p, best, Math.round(FC.Econ.value(state, p)));
    },

    // سجل موسم الغريم (قبل تصفير الإحصائيات)
    rivalSeason(state) {
      const rv = Life.rival(state);
      if (!rv || !state.rival) return;
      state.rival.hist.push({ s: state.season, club: rv.club, clubName: state.clubs[rv.club] ? state.clubs[rv.club].name : '', ap: rv.sAp, g: Life.rivalGoals(state), ovr: Math.floor(rv.ovr), caps: rv.iC || 0 });
      if (state.rival.hist.length > 30) state.rival.hist.shift();
    },

    // قرار تلقائي (المحاكاة السريعة والاختبار): أول رد في الحدث، وقبول عرض الرعاية
    autoDecide(state) {
      Life.ensure(state);
      const u = state.user;
      if (u.event) Life.chooseEvent(state, 0);
      if (u.spOffers.length && u.sponsors.length < BL().sponsor.max) Life.acceptSponsor(state, u.spOffers[0].id);
    },
  });
  FC.Fame = Life;
})(globalThis);
