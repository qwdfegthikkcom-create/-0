/* =========================================================
   الحالة الحالية للعبة + الرسائل
   الحالة كائن بيانات عادي (بدون DOM) — كل ما يبدأ بـ _ لا يُحفظ
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC = G.FC || {};

  FC.State = {
    cur: null, // الحالة المفتوحة الآن
    slot: 1, // خانة الحفظ الحالية

    // تعيين حالة جديدة كحالة حالية
    set(state, slot) {
      this.cur = state;
      if (slot) this.slot = slot;
      FC.Events.emit('state', state);
    },
  };

  // الحصول على لاعب بالرقم (0 = لاعبك)
  FC.getP = function (state, id) {
    return id === 0 ? state.user : state.players[id];
  };

  // الحصول على نادٍ بالرقم
  FC.getClub = function (state, id) {
    return state.clubs[id];
  };

  // ============ الرسائل (تصبح تطبيقاً في الهاتف بالمرحلة 3) ============
  FC.Msg = {
    // إضافة رسالة جديدة إلى صندوق الوارد
    add(state, from, title, body, extra) {
      state.msgSeq = (state.msgSeq || 0) + 1;
      const m = {
        id: state.msgSeq,
        w: FC.Calendar.absWeek(state),
        s: state.season,
        wk: state.week,
        from: from,
        title: title,
        body: body,
        read: false,
      };
      if (extra) Object.assign(m, extra);
      state.inbox.unshift(m);
      if (state.inbox.length > FC.BAL.ui.inboxMax) state.inbox.length = FC.BAL.ui.inboxMax;
      return m;
    },
    unread(state) {
      return state.inbox.filter((m) => !m.read).length;
    },
  };

  // أسماء المرسلين
  FC.Msg.FROM = {
    coach: 'المدرب',
    club: 'إدارة النادي',
    family: 'العائلة',
    scout: 'قسم الكشافين',
    academy: 'مدير الأكاديمية',
    league: 'رابطة الدوري',
    mate: 'زميل',
    medical: 'الجهاز الطبي',
    agent: 'وكيلك',
    bank: 'البنك',
    media: 'الإعلام',
    fans: 'الجماهير',
    nat: 'الاتحاد',
    news: 'أخبار الكرة',
  };
})(globalThis);
