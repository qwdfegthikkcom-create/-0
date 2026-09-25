/* =========================================================
   اللاعب: السمات، المراكز، التقييم العام، إنشاء لاعبك
   - لاعبك يملك 35 سمة كاملة بكسور عشرية
   - لاعبو الذكاء الاصطناعي يملكون تقييماً عاماً فقط، وسماتهم تُشتق حتمياً
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC = G.FC || {};
  const U = FC.util;

  // [المفتاح، المجموعة، الاسم بالعربي]
  const ATTRS = [
    ['acc', 'pac', 'التسارع'], ['spd', 'pac', 'السرعة القصوى'],
    ['fin', 'sho', 'الإنهاء'], ['pow', 'sho', 'قوة التسديد'], ['lng', 'sho', 'التسديد البعيد'], ['apos', 'sho', 'التمركز الهجومي'], ['vol', 'sho', 'الكرات الطائرة'], ['pen', 'sho', 'ركلات الجزاء'],
    ['spas', 'pas', 'التمرير القصير'], ['lpas', 'pas', 'التمرير الطويل'], ['vis', 'pas', 'الرؤية'], ['cro', 'pas', 'العرضيات'], ['cur', 'pas', 'الانحناء'],
    ['dri', 'dri', 'المراوغة'], ['ctl', 'dri', 'التحكم بالكرة'], ['agi', 'dri', 'الرشاقة'], ['bal', 'dri', 'التوازن'],
    ['dawa', 'def', 'الوعي الدفاعي'], ['tak', 'def', 'الافتكاك'], ['sld', 'def', 'التدخل الانزلاقي'], ['intc', 'def', 'قطع الكرات'], ['hea', 'def', 'الرأسيات'],
    ['sta', 'phy', 'التحمل'], ['str', 'phy', 'القوة'], ['jmp', 'phy', 'القفز'], ['agg', 'phy', 'الشراسة'],
    ['cmp', 'men', 'الهدوء'], ['rea', 'men', 'ردة الفعل'], ['tmw', 'men', 'الالتزام الجماعي'], ['lead', 'men', 'القيادة'],
    ['gdiv', 'gk', 'الارتماء'], ['ghan', 'gk', 'الإمساك'], ['gkic', 'gk', 'الركل'], ['gref', 'gk', 'ردة فعل الحارس'], ['gpos', 'gk', 'تمركز الحارس'],
  ];
  const GROUPS = { pac: 'السرعة', sho: 'التسديد', pas: 'التمرير', dri: 'المراوغة', def: 'الدفاع', phy: 'البدنية', men: 'الذهنية', gk: 'الحراسة' };
  const GROUP_LIST = Object.keys(GROUPS);
  const KEYS = ATTRS.map((a) => a[0]);
  const GROUP_OF = {};
  const LABEL = {};
  const INDEX = {};
  ATTRS.forEach((a, i) => {
    GROUP_OF[a[0]] = a[1];
    LABEL[a[0]] = a[2];
    INDEX[a[0]] = i;
  });

  // المراكز: الاسم الكامل، الاسم المختصر، الدور (لأوزان التوازن)، الخط
  const POS = {
    GK: { name: 'حارس مرمى', short: 'حارس', role: 'GK', line: 'GK' },
    CB: { name: 'قلب دفاع', short: 'قلب دفاع', role: 'CB', line: 'DEF' },
    RB: { name: 'ظهير أيمن', short: 'ظهير أيمن', role: 'FB', line: 'DEF' },
    LB: { name: 'ظهير أيسر', short: 'ظهير أيسر', role: 'FB', line: 'DEF' },
    CDM: { name: 'وسط دفاعي', short: 'ارتكاز', role: 'CDM', line: 'MID' },
    CM: { name: 'وسط', short: 'وسط', role: 'CM', line: 'MID' },
    CAM: { name: 'وسط هجومي', short: 'صانع ألعاب', role: 'CAM', line: 'MID' },
    RW: { name: 'جناح أيمن', short: 'جناح أيمن', role: 'W', line: 'ATT' },
    LW: { name: 'جناح أيسر', short: 'جناح أيسر', role: 'W', line: 'ATT' },
    ST: { name: 'مهاجم', short: 'مهاجم', role: 'ST', line: 'ATT' },
  };
  const POS_ORDER = ['GK', 'CB', 'RB', 'LB', 'CDM', 'CM', 'CAM', 'RW', 'LW', 'ST'];

  // مجموعات التدريب الفردي (القسم 8) وسماتها
  const TRAIN = {
    shoot: { name: 'تسديد', attrs: ['fin', 'pow', 'lng', 'apos', 'vol'] },
    pass: { name: 'تمرير', attrs: ['spas', 'lpas', 'vis', 'cro'] },
    dribble: { name: 'مراوغة', attrs: ['dri', 'ctl', 'agi', 'bal'] },
    fitness: { name: 'سرعة ولياقة', attrs: ['acc', 'spd', 'sta', 'str'] },
    defend: { name: 'دفاع', attrs: ['dawa', 'tak', 'sld', 'intc', 'agg'] },
    heading: { name: 'رأسيات', attrs: ['hea', 'jmp'] },
    keeper: { name: 'حراسة', attrs: ['gdiv', 'ghan', 'gkic', 'gref', 'gpos'] },
    setpiece: { name: 'كرات ثابتة', attrs: ['cur', 'pen'] },
  };
  const TRAIN_OF = {};
  for (const g in TRAIN) TRAIN[g].attrs.forEach((k) => (TRAIN_OF[k] = g));

  // حقول لاعب الذكاء الاصطناعي بالترتيب (للحفظ المضغوط)
  const AI_FIELDS = ['id', 'fn', 'ln', 'nat', 'age', 'pos', 'ovr', 'pot', 'club', 'num', 'ht', 'ft', 'fm', 'fit', 'sAp', 'sSt', 'sMn', 'sG', 'sA', 'sRs', 'sYc', 'sRc', 'cAp', 'cG', 'cA', 'inj', 'ban', 'yk'];

  // أثر الطول والوزن على السمات
  function bodyAdj(key, ht, wt) {
    const dh = ((ht || 180) - FC.BAL.create.heightRef) / 10;
    const dw = ((wt || 75) - FC.BAL.create.weightRef) / 10;
    switch (key) {
      case 'hea': return 3 * dh;
      case 'jmp': return 2 * dh;
      case 'str': return 3 * dh + 3 * dw;
      case 'acc': return -2 * dh - 1.2 * dw;
      case 'spd': return -1 * dh - 0.8 * dw;
      case 'agi': return -3 * dh - 1.2 * dw;
      case 'bal': return -2 * dh;
      default: return 0;
    }
  }

  const P = (FC.Player = {
    ATTRS, KEYS, GROUPS, GROUP_LIST, GROUP_OF, LABEL, INDEX, POS, POS_ORDER, TRAIN, TRAIN_OF, AI_FIELDS,

    role: (pos) => POS[pos].role,

    // حساب التقييم العام من السمات حسب المركز
    ovrOf(attrs, pos) {
      const w = FC.BAL.ovrWeights[POS[pos].role];
      let s = 0;
      for (const k in w) s += w[k] * attrs[k];
      return s;
    },

    // التقييم العام لأي لاعب
    ovr(p) {
      return p.id === 0 ? P.ovrOf(p.attrs, p.pos) : p.ovr;
    },

    // قيمة سمة لأي لاعب (لاعبك: مخزّنة، الذكاء الاصطناعي: مشتقة حتمياً)
    attr(p, key) {
      if (p.attrs) return p.attrs[key];
      return P.aiAttr(p, key);
    },

    // اشتقاق سمة لاعب ذكاء اصطناعي من تقييمه ومركزه ورقمه
    aiAttr(p, key) {
      const B = FC.BAL;
      const role = POS[p.pos].role;
      const grp = GROUP_OF[key];
      const w = B.ovrWeights[role][key] || 0;
      let v = p.ovr + (w > 0 ? 0 : B.aiGroupOffset[role][grp]);
      v += (FC.hashFloat(p.id, GROUP_LIST.indexOf(grp), 11) - 0.5) * 2 * B.aiGroupSpread;
      v += (FC.hashFloat(p.id, INDEX[key], 23) - 0.5) * 2 * B.aiAttrSpread;
      v += bodyAdj(key, p.ht, 75 + (p.ht - 180) * 0.6);
      if (grp === 'pac' && p.age > 29) v -= (p.age - 29) * 1.5;
      if (grp === 'men' && p.age < 22) v -= (22 - p.age) * 1.2;
      return U.clamp(v, 1, 99);
    },

    // الإحصائيات الست على البطاقة
    cardStats(p) {
      const a = (k) => P.attr(p, k);
      if (p.pos === 'GK') {
        return [
          ['ارتماء', a('gdiv')], ['إمساك', a('ghan')], ['ركل', a('gkic')],
          ['رد فعل', a('gref')], ['سرعة', 0.45 * a('acc') + 0.55 * a('spd')], ['تمركز', a('gpos')],
        ].map((x) => [x[0], Math.floor(x[1])]);
      }
      return [
        ['سرعة', 0.45 * a('acc') + 0.55 * a('spd')],
        ['تسديد', 0.4 * a('fin') + 0.2 * a('pow') + 0.2 * a('lng') + 0.1 * a('apos') + 0.05 * a('vol') + 0.05 * a('pen')],
        ['تمرير', 0.35 * a('spas') + 0.2 * a('vis') + 0.15 * a('lpas') + 0.2 * a('cro') + 0.1 * a('cur')],
        ['مراوغة', 0.5 * a('dri') + 0.3 * a('ctl') + 0.1 * a('agi') + 0.1 * a('bal')],
        ['دفاع', 0.3 * a('dawa') + 0.3 * a('tak') + 0.2 * a('intc') + 0.1 * a('sld') + 0.1 * a('hea')],
        ['بدني', 0.3 * a('sta') + 0.4 * a('str') + 0.1 * a('jmp') + 0.2 * a('agg')],
      ].map((x) => [x[0], Math.floor(x[1])]);
    },

    // فئة البطاقة حسب التقييم
    tier(ovr) {
      if (ovr >= 85) return 'special';
      if (ovr >= 75) return 'gold';
      if (ovr >= 65) return 'silver';
      return 'bronze';
    },

    fullName: (p) => p.fn + ' ' + p.ln,
    // الاسم المعروض (اللقب إن وُجد)
    displayName: (p) => (p.nick ? p.nick : p.fn + ' ' + p.ln),
    // اسم مختصر للتعليق
    shortName: (p) => (p.nick ? p.nick : p.ln),

    // تقدير الكشافين للإمكانات (يضيق مع الوقت)
    potRange(state, u) {
      const C = FC.BAL.create;
      const seasons = state.season - state.startSeason + state.week / 52;
      const width = Math.max(C.scoutWidthMin, C.scoutWidthStart - seasons * C.scoutShrinkPerSeason);
      const center = u.hid.pot + u.scoutBias * (width / C.scoutWidthStart);
      const lo = Math.max(Math.floor(P.ovr(u)), Math.round(center - width / 2));
      const hi = Math.min(99, Math.max(lo + 1, Math.round(center + width / 2)));
      return [lo, hi];
    },

    // فورمة لاعبك (متوسط آخر 5 تقييمات)
    formOf(p) {
      if (p.id !== 0) return p.fm || 6.7;
      return p.form.length ? U.avg(p.form) : 6.7;
    },

    // إنشاء لاعبك من بيانات المعالج
    createUser(setup, rng) {
      const B = FC.BAL;
      const C = B.create;
      const role = POS[setup.pos].role;
      const target = rng.int(C.ovrMin, C.ovrMax);
      const w = B.ovrWeights[role];
      const attrs = {};
      KEYS.forEach((k) => {
        const grp = GROUP_OF[k];
        let v = target + (w[k] ? 0 : B.aiGroupOffset[role][grp]);
        v += rng.normal(0, C.attrNoise) + bodyAdj(k, setup.ht, setup.wt);
        attrs[k] = U.clamp(v, 5, 95);
      });
      // ضبط السمات حتى يساوي التقييم العام الرقم المستهدف بالضبط
      for (let it = 0; it < 4; it++) {
        const d = target + 0.5 - P.ovrOf(attrs, setup.pos);
        for (const k in w) attrs[k] = U.clamp(attrs[k] + d, 5, 95);
      }
      const pc = C.pot[setup.diff] || C.pot.real;
      let pot = Math.round(U.clamp(rng.normal(pc.mu, pc.sd), pc.min, pc.max));
      if (setup.legacy) pot = Math.min(pc.max + 2, pot + 3);
      const wf = [1, 2, 3, 4, 5][rng.weighted([5, 25, 45, 20, 5])];
      const skBase = role === 'W' || role === 'CAM' ? [2, 10, 40, 35, 13] : role === 'ST' ? [5, 25, 45, 20, 5] : [15, 40, 35, 9, 1];
      const sk = role === 'GK' ? 1 : [1, 2, 3, 4, 5][rng.weighted(skBase)];
      return {
        id: 0,
        fn: setup.fn,
        ln: setup.ln,
        nick: setup.nick || '',
        nat: setup.nat,
        city: setup.city,
        pos: setup.pos,
        foot: setup.foot,
        ht: setup.ht,
        wt: setup.wt,
        face: setup.face,
        age: C.age,
        attrs,
        hid: {
          pot,
          pot0: pot,
          inj: rng.int(3, 16),
          cons: rng.int(6, 16),
          big: rng.int(5, 16),
          prof: rng.int(8, 17),
          wf,
          sk,
        },
        scoutBias: rng.normal(0, 2.5),
        club: 0,
        team: 'Y',
        num: 0,
        fit: 100,
        morale: B.status.moraleStart,
        trust: B.status.trustStart,
        form: [],
        minHist: [],
        luck: rng.next(),
        sg: 0, // مكسب التقييم هذا الموسم
        season: P.emptySeason(),
        career: { ap: 0, g: 0, a: 0, mn: 0, motm: 0 },
        history: [],
        log: [],
        seasonStartAttrs: U.clone(attrs),
        lastUps: [],
        maxOvr: target,
        sharp: B.inj.sharpStart, // الجاهزية
        inj: null, // الإصابة الحالية
        injHist: [],
        ban: 0, // مباريات الإيقاف المتبقية
        reinj: 0, // أسابيع خطر تجدد الإصابة
        trustLog: [], // أسباب تغيّر ثقة المدرب
        captain: false,
      };
    },

    // إحصائيات موسم فارغة للاعبك
    emptySeason() {
      return { ap: 0, st: 0, mn: 0, g: 0, a: 0, rs: 0, yc: 0, ycCount: 0, rc: 0, sh: 0, sot: 0, kp: 0, pas: 0, pasOk: 0, drb: 0, tk: 0, int: 0, sv: 0, cs: 0, motm: 0 };
    },

    // إضافة حقول ناقصة عند تحميل حفظ قديم
    fillDefaults(state) {
      for (const id in state.players) {
        const p = state.players[id];
        if (p.fm == null) p.fm = 6.7;
        if (p.fit == null) p.fit = 100;
        if (p.inj == null) p.inj = 0;
        if (p.ban == null) p.ban = 0;
        if (p.yk == null) p.yk = 0;
      }
      const u = state.user;
      if (u) {
        if (u.sharp == null) u.sharp = FC.BAL.inj.sharpStart;
        if (u.inj === undefined) u.inj = null;
        if (u.ban == null) u.ban = 0;
        if (u.reinj == null) u.reinj = 0;
        if (!u.trustLog) u.trustLog = [];
        if (u.captain == null) u.captain = false;
        if (u.joinSeason == null) u.joinSeason = state.startSeason != null ? state.startSeason : state.season;
        if (!u.injHist) u.injHist = [];
        if (u.season && u.season.ycCount == null) u.season.ycCount = 0;
      }
    },
  });
})(globalThis);
