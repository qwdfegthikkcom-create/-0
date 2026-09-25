/* =========================================================
   اختبار الواقعية (القسم 20)
   التشغيل:  node tests/sim-check.js            ← 20 موسماً
             node tests/sim-check.js --quick    ← 5 مواسم (أسرع)
   يطبع النتائج ويقارنها بأهداف القسم 2 (PASS/FAIL)، ويخرج برمز 1 إذا فشل أي اختبار
   ========================================================= */
'use strict';
const FC = require('./load-engine');
const U = FC.util;

const args = process.argv.slice(2);
const QUICK = args.includes('--quick');
const SEASONS = (() => {
  const i = args.indexOf('--seasons');
  return i >= 0 ? parseInt(args[i + 1], 10) : QUICK ? 5 : 20;
})();

const results = [];
function check(name, value, lo, hi, fmt, note) {
  const ok = value >= lo && value <= hi;
  results.push({ name, value, lo, hi, ok, fmt, note });
}
function skip(name, why) {
  results.push({ name, skip: why });
}
const f1 = (v) => v.toFixed(1);
const f2 = (v) => v.toFixed(2);
const pct = (v) => (v * 100).toFixed(1) + '%';

// ====================== 1) محاكاة العالم ======================
console.log('\n=== محاكاة ' + SEASONS + ' موسماً لكل الدوريات ===');
const stats = { matches: 0, goals: 0, home: 0, draw: 0, away: 0, yellow: 0, red: 0, starterRatings: [], ratings8: 0, ratings10: 0, byLeague: {} };
const origFinish = FC.Match.finish;
FC.Match.finish = function (state, m) {
  const out = origFinish.call(this, state, m);
  const lg = m.ref ? m.ref.lg : '?';
  if (lg === 'YTH') return out;
  const hg = m.sides[0].goals;
  const ag = m.sides[1].goals;
  stats.matches++;
  stats.goals += hg + ag;
  if (hg > ag) stats.home++;
  else if (hg === ag) stats.draw++;
  else stats.away++;
  const L = (stats.byLeague[lg] = stats.byLeague[lg] || { n: 0, g: 0 });
  L.n++;
  L.g += hg + ag;
  m.sides.forEach((S) =>
    S.all.forEach((x) => {
      stats.yellow += x.yc >= 2 ? 1 : x.yc;
      stats.red += x.rc;
      if (x.start && x.pid !== 0 && x.in >= 0) {
        stats.starterRatings.push(x.rt);
        if (x.rt >= 8) stats.ratings8++;
        if (x.rt >= 10) stats.ratings10++;
      }
    })
  );
  return out;
};

const state = FC.Game.newCareer({ fn: 'علي', ln: 'حسين', nat: 'IRQ', city: 'بغداد', pos: 'ST', foot: 'R', ht: 181, wt: 74, face: {}, diff: 'real', seed: 20260 });
const STRONG = ['ENG', 'ESP', 'GER', 'ITA', 'FRA'];
const topScorers = {};
const peakStrikers = [];
const avgStrikers = [];
const leagueStart = {};
const retireAges = [];
let maxWeekMs = 0;
let sumWeekMs = 0;
let weeks = 0;

// متوسط أفضل 11 لاعباً لكل دوري (لقياس ثبات العالم)
function leagueLevel(lg) {
  const L = state.leagues[lg];
  return U.avg(L.clubs, (cid) => {
    const top = state.clubs[cid].squad.map((id) => state.players[id].ovr).sort((a, b) => b - a).slice(0, 11);
    return U.avg(top);
  });
}
FC.DATA.leagueOrder.forEach((lg) => (leagueStart[lg] = leagueLevel(lg)));

// تسجيل الإصابات والإيقافات
const injStats = { ai: 0, days: 0, user: 0, bans: 0 };
const origInjAI = FC.Status.injureAI;
FC.Status.injureAI = function (p, rng) {
  const inj = origInjAI.call(this, p, rng);
  injStats.ai++;
  injStats.days += inj.days;
  return inj;
};
const origInjUser = FC.Status.injureUser;
FC.Status.injureUser = function (st, rng, where) {
  injStats.user++;
  return origInjUser.call(this, st, rng, where);
};
const origBan = FC.Status.banFor;
FC.Status.banFor = function (rng, x, prev) {
  const b = origBan.call(this, rng, x, prev);
  if (b) injStats.bans++;
  return b;
};

// تسجيل أعمار المعتزلين
const origRetires = FC.Regens.retires;
FC.Regens.retires = function (p, club, rng) {
  const r = origRetires.call(this, p, club, rng);
  if (r) retireAges.push({ age: p.age, gk: p.pos === 'GK' });
  return r;
};

const careerLines = [];
for (let s = 0; s < SEASONS; s++) {
  for (let w = 0; w < FC.Calendar.WEEKS; w++) {
    // قبل نهاية الموسم: جمع الهدافين
    if (state.week === FC.BAL.cal.seasonEndWeek) {
      FC.DATA.leagueOrder.forEach((lg) => {
        const top = FC.Comp.leaders(state, lg, 'sG', 1)[0];
        (topScorers[lg] = topScorers[lg] || []).push(top ? top.v : 0);
        // المهاجمون الموهوبون في الذروة والمهاجمون العاديون
        const L = state.leagues[lg];
        const rounds = L.rounds.length;
        L.clubs.forEach((cid) => {
          const club = state.clubs[cid];
          club.squad.forEach((pid) => {
            const p = state.players[pid];
            if (p.pos !== 'ST' || p.sSt < rounds * 0.6) return;
            const per50 = (p.sG / p.sAp) * 50; // «كل البطولات» ≈ 50 مباراة
            if (STRONG.includes(lg) && p.ovr >= 85 && p.age >= 27 && p.age <= 30) peakStrikers.push(per50);
            if (Math.abs(p.ovr - club.lvl) <= 2 && STRONG.includes(lg)) avgStrikers.push(per50 * (40 / 50));
          });
        });
      });
      const u = state.user;
      careerLines.push({ season: state.season, age: u.age, team: u.team, club: state.clubs[FC.Game.userTeam(state)].name, ap: u.season.ap, st: u.season.st, g: u.season.g, a: u.season.a, avg: u.season.ap ? u.season.rs / u.season.ap : 0, ovr: FC.Player.ovr(u) });
    }
    const t0 = process.hrtime.bigint();
    FC.Game.autoWeek(state);
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    if (ms > maxWeekMs && state.week !== 0) maxWeekMs = ms;
    sumWeekMs += ms;
    weeks++;
  }
  process.stdout.write('.');
}
console.log('');
FC.Match.finish = origFinish;
FC.Regens.retires = origRetires;

const gpm = stats.goals / stats.matches;
check('متوسط الأهداف في المباراة', gpm, 2.5, 3.0, f2);
check('فوز صاحب الأرض', stats.home / stats.matches, 0.41, 0.49, pct, '≈45%');
check('التعادل', stats.draw / stats.matches, 0.21, 0.29, pct, '≈25%');
check('فوز الضيف', stats.away / stats.matches, 0.26, 0.34, pct, '≈30%');
const strongTops = [].concat(...STRONG.map((lg) => topScorers[lg] || []));
check('متوسط هداف الدوري القوي', U.avg(strongTops), 20, 30, f1);
check('نسبة المواسم التي يتجاوز فيها الهداف 35 هدفاً', strongTops.filter((g) => g > 35).length / strongTops.length, 0, 0.08, pct, 'نادر جداً');
check('متوسط تقييم اللاعب الأساسي', U.avg(stats.starterRatings), 6.6, 7.1, f2);
check('نسبة تقييمات 8+ (استثنائية)', stats.ratings8 / stats.starterRatings.length, 0.02, 0.12, pct);
check('نسبة تقييم 10 (نادرة جداً)', stats.ratings10 / stats.starterRatings.length, 0, 0.002, (v) => (v * 100).toFixed(3) + '%');
check('البطاقات الصفراء في المباراة', stats.yellow / stats.matches, 3.5, 5, f2);
check('البطاقات الحمراء في المباراة', stats.red / stats.matches, 0.1, 0.2, f2);
if (peakStrikers.length) check('مهاجم موهوب في ذروته (أهداف/موسم كل البطولات)', U.avg(peakStrikers), 20, 35, f1, 'عينة ' + peakStrikers.length);
else skip('مهاجم موهوب في ذروته', 'لا توجد عينة');
check('مهاجم عادي (أهداف/موسم)', U.avg(avgStrikers), 8, 15, f1, 'عينة ' + avgStrikers.length);
check('أبطأ أسبوع محاكاة (ms)', maxWeekMs, 0, 300, f1, 'المتوسط ' + f1(sumWeekMs / weeks) + 'ms');
const outfieldRet = retireAges.filter((r) => !r.gk).map((r) => r.age);
const gkRet = retireAges.filter((r) => r.gk).map((r) => r.age);
check('متوسط عمر الاعتزال (لاعبو الميدان)', U.avg(outfieldRet), 33, 38, f1, 'عينة ' + outfieldRet.length);
if (gkRet.length) check('متوسط عمر اعتزال الحراس', U.avg(gkRet), 35, 40, f1);
let drift = 0;
FC.DATA.leagueOrder.forEach((lg) => (drift = Math.max(drift, Math.abs(leagueLevel(lg) - leagueStart[lg]))));
check('ثبات مستوى الدوريات (أكبر انحراف)', drift, 0, 3.5, f2, 'مستوى أفضل 11 بين أول وآخر موسم');
check('الإصابات لكل فريق في المباراة', injStats.ai / (stats.matches * 2), 0.18, 0.5, f2, 'متوسط الغياب ' + f1(injStats.days / Math.max(1, injStats.ai)) + ' يوماً');
check('متوسط مدة الإصابة (أيام)', injStats.days / Math.max(1, injStats.ai), 10, 35, f1);
check('إصاباتك في الموسم (مسيرة تلقائية)', injStats.user / SEASONS, 0.3, 3, f2);
check('الإيقافات لكل فريق في الموسم', injStats.bans / (stats.matches * 2 / 34), 3, 14, f1, 'تقريبي لـ 34 مباراة');
FC.Status.injureAI = origInjAI;
FC.Status.injureUser = origInjUser;
FC.Status.banFor = origBan;
skip('عينات القيم السوقية', 'المرحلة 3');

console.log('\nالأهداف لكل دوري:');
FC.DATA.leagueOrder.forEach((lg) => {
  const L = stats.byLeague[lg];
  const tops = topScorers[lg] || [];
  console.log('  ' + lg.padEnd(4) + ' أهداف/مباراة ' + f2(L.g / L.n) + ' | هداف الموسم: متوسط ' + f1(U.avg(tops)) + ' (أعلى ' + Math.max.apply(null, tops) + ')');
});

// ====================== 2) منحنى تطور 100 شاب ======================
console.log('\n=== منحنى تطور 100 شاب (ظروف عادية: لعب منتظم + تدريب تلقائي) ===');
function growthCurve(n, conditions) {
  const rng = new FC.RNG(777 + (conditions.seed || 0));
  const byAge = {};
  const deltas = {};
  const maxDelta = {};
  for (let i = 0; i < n; i++) {
    const pos = FC.Player.POS_ORDER[i % 10];
    const u = FC.Player.createUser({ fn: 'x', ln: 'y', nat: 'IRQ', city: '', pos, foot: 'R', ht: 180, wt: 75, face: {}, diff: 'real' }, rng);
    const fake = { user: u, clubs: { 1: { fac: conditions.fac } }, diff: 'real', wk: null };
    u.club = 1;
    u.hid.prof = conditions.prof || u.hid.prof;
    u.minHist = new Array(8).fill(conditions.minutes);
    for (let age = 16; age <= 38; age++) {
      u.age = age;
      u.sg = 0;
      u.luck = rng.next();
      const start = FC.Player.ovr(u);
      const gapStart = u.hid.pot - start;
      (byAge[age] = byAge[age] || []).push(start);
      for (let w = 0; w < 52; w++) {
        fake.wk = { tm: {}, video: conditions.video };
        const role = FC.Player.POS[pos].role;
        FC.Game.DEFAULT_TRAIN[role].forEach((g) => (fake.wk.tm[g] = conditions.train));
        FC.Growth.weekUser(fake);
      }
      const d = FC.Player.ovr(u) - start;
      if (gapStart >= FC.BAL.growth.gapSoft || age >= 28) (deltas[age] = deltas[age] || []).push(d);
      maxDelta[age] = Math.max(maxDelta[age] == null ? -99 : maxDelta[age], d);
    }
  }
  return { byAge, deltas, maxDelta };
}
const normal = growthCurve(100, { fac: 3, minutes: 1, train: 1.0, video: false });
const line = [];
for (let age = 16; age <= 38; age++) line.push(age + ':' + f1(U.avg(normal.byAge[age])));
console.log('  متوسط التقييم حسب العمر: ' + line.join('  '));
const table = FC.BAL.growth.ageTable;
table.forEach((row) => {
  const ds = [];
  for (let a = row[0]; a <= Math.min(row[1], 37); a++) if (normal.deltas[a]) ds.push(...normal.deltas[a]);
  if (ds.length) check('التطور بالموسم لعمر ' + row[0] + '–' + (row[1] > 90 ? '+' : row[1]), U.avg(ds), row[2] - 0.5, row[3] + 0.5, f2, 'الجدول ' + row[2] + ' إلى ' + row[3]);
});
let peakAge = 16;
let peakV = 0;
for (let age = 16; age <= 38; age++) {
  const v = U.avg(normal.byAge[age]);
  if (v > peakV) {
    peakV = v;
    peakAge = age;
  }
}
check('عمر الذروة', peakAge, 27, 30, (v) => String(v));
const best = growthCurve(40, { fac: 5, minutes: 1, train: 1.6 * 1.35, video: true, prof: 20, seed: 1 });
let worstOver = -99;
table.forEach((row) => {
  for (let a = row[0]; a <= Math.min(row[1], 30); a++) if (best.maxDelta[a] != null) worstOver = Math.max(worstOver, best.maxDelta[a] - row[3]);
});
check('أفضل الظروف لا تتجاوز الحد الأعلى بأكثر من +2', worstOver, -99, 2.05, f2);

// ====================== 3) اختبار اللحظات ======================
console.log('\n=== اختبار محرك اللحظات (لاعب افتراضي متوسط المهارة) ===');
if (FC.Moment && FC.Moment.selfTest) {
  const mt = FC.Moment.selfTest(QUICK ? 600 : 2000);
  check('تحويل الانفراد/الفرصة المحققة', mt.big, 0.35, 0.5, pct, 'عينة ' + mt.n);
  check('تحويل التسديد من بعيد', mt.long, 0.03, 0.07, pct);
  check('تحويل نصف الفرصة داخل المنطقة', mt.half, 0.08, 0.2, pct);
  check('نجاح الكرة البينية (تصل للزميل)', mt.through, 0.5, 0.95, pct);
  check('تحويل الزميل بعد بينية ناجحة', mt.throughConv, 0.3, 0.55, pct);
  check('لاعب 85 أدق من لاعب 55 في الانفراد', mt.big85 - mt.big55, 0.08, 1, pct, '85: ' + pct(mt.big85) + ' / 55: ' + pct(mt.big55));
} else skip('محرك اللحظات', 'غير محمّل');
skip('تحويل ركلات الجزاء (75–80%)', 'المرحلة 2');
skip('تحويل الرأسيات (10–20%)', 'المرحلة 2');

// ====================== 3ب) المباراة الكاملة (تتحكم بلاعبك) ======================
console.log('\n=== المباراة الكاملة: 22 لاعباً بذكاء اصطناعي، لاعبك تلقائي ===');
if (FC.Full) {
  const fs0 = FC.Game.newCareer({ fn: 'سامي', ln: 'نوري', nat: 'IRQ', city: 'البصرة', pos: 'ST', foot: 'R', ht: 180, wt: 74, face: {}, diff: 'real', seed: 4242 });
  const want = QUICK ? 8 : 20;
  const F = { n: 0, goals: 0, sh: 0, sot: 0, pas: 0, pasOk: 0, yc: 0, rc: 0, ms: 0, userR: [], aiR: [], consistent: 0 };
  for (let g = 0; g < 400 && F.n < want; g++) {
    if (FC.Game.userFixtureRef(fs0) && !fs0.wk.played) {
      const m = FC.Game.startMatch(fs0, 'full');
      if (m.user && m.user.state === 'on') {
        const t0 = Date.now();
        const fm = FC.Full.create(fs0, m, { auto: true, length: FC.BAL.full.defaultLength });
        FC.Full.runHeadless(fm, 1 / 30);
        F.ms += Date.now() - t0;
        FC.Full.writeBack(fm, true);
        const sum = FC.Game.completeMatch(fs0, m);
        F.n++;
        F.goals += m.sides[0].goals + m.sides[1].goals;
        fm.teams.forEach((T) => {
          F.sh += T.st.sh;
          F.sot += T.st.sot;
          F.pas += T.st.pas;
          F.pasOk += T.st.pasOk;
        });
        fm.all.forEach((e) => {
          F.yc += e.st.yc;
          F.rc += e.st.rc;
        });
        if (sum.rating != null) F.userR.push(sum.rating);
        m.sides.forEach((S) => S.all.forEach((x) => x.pid !== 0 && x.start && F.aiR.push(x.rt)));
        // الأهداف المسجلة للاعبين = نتيجة المباراة (باستثناء الأهداف العكسية)
        const ok = m.sides.every((S, i) => U.sum(S.all, (x) => x.g) <= S.goals && S.goals === fm.teams[i].score);
        if (ok) F.consistent++;
      }
    }
    FC.Game.endWeek(fs0);
  }
  const n = F.n || 1;
  check('المباراة الكاملة: متوسط الأهداف', F.goals / n, 1.8, 3.6, f2, 'عينة ' + F.n + ' مباراة');
  check('المباراة الكاملة: تسديدات الفريق', F.sh / n / 2, 5, 14, f1);
  check('المباراة الكاملة: نسبة التسديد على المرمى', F.sot / Math.max(1, F.sh), 0.3, 0.66, pct);
  check('المباراة الكاملة: دقة التمرير', F.pasOk / Math.max(1, F.pas), 0.6, 0.9, pct);
  check('المباراة الكاملة: البطاقات الصفراء', F.yc / n, 0.5, 4.5, f2);
  check('المباراة الكاملة: متوسط تقييمك (تلقائي)', U.avg(F.userR), 5.8, 7.8, f2);
  check('المباراة الكاملة: متوسط تقييم الأساسيين', U.avg(F.aiR), 6.4, 7.2, f2);
  check('المباراة الكاملة: تطابق الأهداف والنتيجة', F.consistent / n, 1, 1, pct);
  check('المباراة الكاملة: زمن محاكاة المباراة (ms)', F.ms / n, 0, 3000, f1);
  // عبث بالتحكم: مدخلات عشوائية لحارس ومهاجم دون أخطاء
  let fuzzOk = 0;
  ['ST', 'GK'].forEach((pos, k) => {
    const st2 = FC.Game.newCareer({ fn: 'x', ln: 'y', nat: 'IRQ', city: '', pos, foot: 'R', ht: 185, wt: 78, face: {}, diff: 'real', seed: 77 + k });
    for (let g = 0; g < 60; g++) {
      const ref = FC.Game.userFixtureRef(st2);
      if (ref && !st2.wk.played) {
        // نضمن أن لاعبك أساسي في مركزه (للاختبار فقط)
        const club = FC.Game.userTeam(st2);
        const pk = FC.Select.pick(st2, club, FC.rngOf(st2));
        if (!pk.xi.some((x) => x.pid === 0)) {
          pk.bench = pk.bench.filter((id) => id !== 0);
          const slotI = pk.xi.findIndex((x) => FC.Player.POS[x.slot].role === FC.Player.POS[pos].role);
          pk.bench.push(pk.xi[slotI].pid);
          pk.xi[slotI] = { pid: 0, slot: pk.xi[slotI].slot };
        }
        const m = FC.Match.create(st2, ref.home, ref.away, ref, { live: true, mode: 'full', pickH: ref.home === club ? pk : null, pickA: ref.away === club ? pk : null });
        if (m.user && m.user.state === 'on') {
          try {
            const fm = FC.Full.create(st2, m, { auto: false, length: 6 });
            const r = new FC.RNG(9);
            const acts = ['pass', 'through', 'lob', 'shootStart', 'shootEnd', 'tackle', 'slide', 'dive'];
            let i = 0;
            while (!fm.over && i++ < 60000) {
              if (i % 15 === 0) {
                const a = r.float(0, 6.3);
                FC.Full.setInput(fm, Math.cos(a), Math.sin(a), r.chance(0.2) ? 0 : 1, r.chance(0.3));
              }
              if (i % 20 === 0) FC.Full.act(fm, acts[r.int(0, acts.length - 1)]);
              FC.Full.step(fm, 1 / 60);
            }
            FC.Full.writeBack(fm, true);
            FC.Game.completeMatch(st2, m);
            if (fm.over) fuzzOk++;
          } catch (e) {
            console.log('  خطأ في العبث: ' + e.stack);
          }
          break;
        }
      }
      FC.Game.endWeek(st2);
    }
  });
  check('المباراة الكاملة: مدخلات عشوائية (مهاجم وحارس) بلا أخطاء', fuzzOk, 2, 2, (v) => String(v));
} else skip('المباراة الكاملة', 'غير محمّلة');

// ====================== 4) مسيرة كاملة تلقائية ======================
console.log('\n=== مسيرتك في وضع اللعب التلقائي ===');
console.log('  الموسم   العمر  الفريق                     م   أس  هـ  ص  تقييم  OVR');
careerLines.forEach((c) => {
  console.log('  ' + FC.Calendar.seasonLabel(c.season) + '  ' + String(c.age).padStart(4) + '   ' + (c.team === 'Y' ? '(شباب) ' : '') + c.club.padEnd(20) + String(c.ap).padStart(4) + String(c.st).padStart(4) + String(c.g).padStart(4) + String(c.a).padStart(4) + '   ' + f2(c.avg) + '  ' + f1(c.ovr));
});
const peakCareer = Math.max.apply(null, careerLines.map((c) => c.ovr));
check('أعلى تقييم في مسيرتك ≤ الإمكانات + 2', peakCareer, 0, state.user.hid.pot + 2.5, f1, 'الإمكانات ' + state.user.hid.pot);

// ====================== 5) الحفظ والتحميل ======================
const json = FC.Save.exportText(state);
const back = FC.Save.importText(json);
const same = JSON.stringify(FC.Save.serialize(back)) === JSON.stringify(FC.Save.serialize(state));
check('الحفظ ثم التحميل يعيد الحالة نفسها', same ? 1 : 0, 1, 1, (v) => (v ? 'نعم' : 'لا'), 'الحجم ' + Math.round(json.length / 1024) + 'KB قبل الضغط');
// نفس البذرة ⇐ نفس النتائج بعد التحميل
const a = FC.Save.importText(json);
const b = FC.Save.importText(json);
for (let i = 0; i < 3; i++) {
  FC.Game.autoWeek(a);
  FC.Game.autoWeek(b);
}
check('الحتمية بعد التحميل (نفس النتائج)', JSON.stringify(FC.Save.serialize(a)) === JSON.stringify(FC.Save.serialize(b)) ? 1 : 0, 1, 1, (v) => (v ? 'نعم' : 'لا'));

// ====================== الطباعة ======================
console.log('\n=== النتائج ===');
let fails = 0;
results.forEach((r) => {
  if (r.skip) {
    console.log('  SKIP  ' + r.name + ' — ' + r.skip);
    return;
  }
  if (!r.ok) fails++;
  const range = r.fmt(r.lo) + ' … ' + (r.hi > 1e5 ? '∞' : r.fmt(r.hi));
  console.log('  ' + (r.ok ? 'PASS' : 'FAIL') + '  ' + r.name + ': ' + r.fmt(r.value) + '   [' + range + ']' + (r.note ? '  (' + r.note + ')' : ''));
});
console.log('\n' + (fails ? '❌ فشل ' + fails + ' اختبار' : '✅ كل الاختبارات نجحت'));
process.exit(fails ? 1 : 0);
