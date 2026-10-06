/* =========================================================
   التقويم الموحد لكل الدوريات
   الموسم = 52 أسبوعاً، الأسبوع 0 = أول سبت في يوليو من سنة بداية الموسم
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC = G.FC || {};

  const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const DAY = 86400000;

  const Cal = (FC.Calendar = {
    WEEKS: 52,
    MONTHS,
    DAYS,

    // أول سبت في يوليو من السنة
    firstSaturday(year) {
      const d = new Date(Date.UTC(year, 6, 1));
      const add = (6 - d.getUTCDay() + 7) % 7;
      return new Date(Date.UTC(year, 6, 1 + add));
    },

    // تاريخ يوم معيّن من أسبوع معيّن (dayOffset: 0 = السبت)
    weekDate(season, week, dayOffset) {
      return new Date(Cal.firstSaturday(season).getTime() + (week * 7 + (dayOffset || 0)) * DAY);
    },

    // «السبت 15 أغسطس 2026»
    fmt(d, noDay) {
      const s = d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
      return noDay ? s : DAYS[d.getUTCDay()] + ' ' + s;
    },

    // «15 أغسطس»
    fmtShort(d) {
      return d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()];
    },

    // «2026/27»
    seasonLabel(season) {
      return season + '/' + String((season + 1) % 100).padStart(2, '0');
    },

    // مرحلة الموسم: تحضيري / الموسم / العطلة الصيفية
    phase(week) {
      const c = FC.BAL.cal;
      if (week < c.leagueStart) return 'pre';
      if (week <= c.leagueEnd) return 'season';
      return 'summer';
    },

    phaseLabel(week) {
      return { pre: 'فترة الإعداد', season: 'الموسم', summer: 'العطلة الصيفية' }[Cal.phase(week)];
    },

    // هل هذا الأسبوع توقف دولي؟
    isIntlBreak(week) {
      return FC.BAL.cal.intlBreaks.indexOf(week) >= 0;
    },

    // كل الأسابيع المتاحة لجولات الدوري
    leagueSlots() {
      const c = FC.BAL.cal;
      const out = [];
      for (let w = c.leagueStart; w <= c.leagueEnd; w++) if (c.intlBreaks.indexOf(w) < 0) out.push(w);
      return out;
    },

    // توزيع عدد جولات على الأسابيع المتاحة بالتساوي
    roundWeeks(nRounds) {
      const slots = Cal.leagueSlots();
      if (nRounds >= slots.length) return slots.slice(0, nRounds);
      const out = [];
      const step = (slots.length - 1) / (nRounds - 1);
      for (let r = 0; r < nRounds; r++) out.push(slots[Math.round(r * step)]);
      return out;
    },

    // رقم أسبوع مطلق منذ بداية المسيرة (للرسائل والترتيب الزمني)
    absWeek(state) {
      return (state.season - state.startSeason) * Cal.WEEKS + state.week;
    },
  });
})(globalThis);
