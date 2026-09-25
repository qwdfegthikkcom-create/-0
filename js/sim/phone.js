/* =========================================================
   منطق الهاتف: الردود على الرسائل وتأثيرها (بدون واجهة)
   كل رسالة قد تحمل «reply»: مجموعة ردود، لكل رد أثر على الثقة والمعنويات...
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC = G.FC || {};
  const U = FC.util;

  // مجموعات الردود: [المفتاح، النص، الأثر]
  const REPLIES = {
    coachPraise: [
      ['humble', 'شكراً مدرب، الفضل للفريق.', { trust: 2, morale: 1 }],
      ['hungry', 'وسأقدم أكثر، أريد أن أكون الأفضل.', { trust: 3, morale: 2 }],
    ],
    coachWarn: [
      ['accept', 'معك حق، سأعمل بجد في التدريب.', { trust: 3 }],
      ['argue', 'أحتاج ثقة أكبر حتى أظهر مستواي.', { trust: -3, morale: 2 }],
    ],
    coachBench: [
      ['patient', 'أفهم. سأنتظر فرصتي وأستغلها.', { trust: 3, morale: -1 }],
      ['demand', 'أستحق دقائق أكثر، وأريد اللعب.', { trust: -4, morale: 3 }],
    ],
    family: [
      ['warm', 'أحبكم، أنتم سبب نجاحي ❤', { morale: 3 }],
      ['short', 'شكراً، مشغول بالتدريب الآن.', { morale: -1 }],
    ],
    agentAdvice: [
      ['follow', 'موافق، نفّذ ما تراه مناسباً.', { morale: 1 }],
      ['ignore', 'لا، أريد البقاء مركزاً على ناديي.', { trust: 1 }],
    ],
    mate: [
      ['join', 'بالتأكيد، أنا معكم!', { morale: 2, trust: 1 }],
      ['decline', 'شكراً، سأرتاح هذه المرة.', { morale: -1 }],
    ],
  };

  const Ph = (FC.Phone = {
    REPLIES,

    // الردود المتاحة لرسالة
    options(m) {
      return m && m.reply && !m.replied ? REPLIES[m.reply] || [] : [];
    },

    // تطبيق رد
    reply(state, msgId, key) {
      const m = state.inbox.find((x) => x.id === msgId);
      if (!m || m.replied) return null;
      const opt = (REPLIES[m.reply] || []).find((r) => r[0] === key);
      if (!opt) return null;
      const u = state.user;
      const fx = opt[2];
      if (fx.trust) FC.Status.trust(state, fx.trust, m.reply === 'agentAdvice' ? 'role' : 'media');
      if (fx.morale) u.morale = U.clamp(u.morale + fx.morale, 0, 100);
      if (fx.fame && u.fame != null) u.fame = U.clamp(u.fame + fx.fame, 0, 100);
      m.replied = key;
      m.replyText = opt[1];
      m.read = true;
      return opt;
    },
  });
})(globalThis);
