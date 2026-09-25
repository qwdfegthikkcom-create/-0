/* =========================================================
   «هاتفك»: الرسائل (بردود لها أثر)، العروض، العقد، البنك، الوكيل، أخبار الانتقالات
   والتفاوض على العقود (القسم 17 والقسم 19-10)
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC;
  const UI = FC.UI;
  const U = FC.util;
  const esc = U.esc;
  const money = (n) => FC.Econ.fmt(n);

  // التطبيقات (تتوسع في المرحلة 5)
  function apps(st) {
    const offers = FC.Transfer.active(st).length;
    const list = [
      ['msgs', 'الرسائل', '💬', FC.Msg.unread(st)],
      ['offers', 'العروض', '📝', offers],
      ['contract', 'العقد', '📄', 0],
      ['bank', 'البنك', '🏦', 0],
      ['agent', 'الوكيل', '🤝', 0],
      ['market', 'الانتقالات', '🔁', 0],
    ];
    if (FC.PhoneApps) FC.PhoneApps.forEach((a) => list.push([a.id, a.name, a.icon, a.badge ? a.badge(st) : 0]));
    return list;
  }

  // نص المكافآت (غير الصفرية فقط)
  function bonusTxt(b) {
    const parts = [];
    if (b.app) parts.push('مشاركة ' + money(b.app));
    if (b.goal) parts.push('هدف ' + money(b.goal));
    if (b.assist) parts.push('صناعة ' + money(b.assist));
    if (b.cs) parts.push('شباك نظيفة ' + money(b.cs));
    return parts.length ? esc(parts.join(' · ')) : 'لا توجد';
  }

  function header(title, back) {
    return '<div class="ph-h">' + (back ? '<button class="icon-btn small" data-app="home">' + UI.icon('back') + '</button>' : '<span></span>') + '<b>' + esc(title) + '</b><span class="ph-time" dir="ltr">' + new Date().toTimeString().slice(0, 5) + '</span></div>';
  }

  // ================= التطبيقات =================
  const VIEWS = {
    home(st) {
      const u = st.user;
      return (
        header('هاتفك', false) +
        '<div class="ph-wall"><div class="ph-bal"><span>الرصيد</span><b dir="ltr">' + esc(money(u.money || 0)) + '</b></div>' +
        (u.freeAgent ? '<div class="ph-alert">أنت لاعب حر — راجع العروض</div>' : '') +
        '</div>' +
        '<div class="ph-grid">' +
        apps(st).map((a) => '<button class="ph-app" data-app="' + a[0] + '"><i>' + a[2] + (a[3] ? '<em>' + a[3] + '</em>' : '') + '</i><span>' + esc(a[1]) + '</span></button>').join('') +
        '</div>'
      );
    },

    msgs(st, p) {
      const list = st.inbox;
      return (
        header('الرسائل', true) +
        '<div class="ph-list">' +
        (list.length
          ? list
              .map((m) => {
                const open = p.focus === m.id;
                const opts = FC.Phone.options(m);
                return (
                  '<div class="ph-msg' + (m.read ? '' : ' unread') + (open ? ' open' : '') + '" data-msg="' + m.id + '">' +
                  '<div class="pm-h"><span class="pm-from">' + esc(FC.Msg.FROM[m.from] || m.from) + '</span><span class="pm-d">' + FC.Calendar.seasonLabel(m.s) + ' · أ' + (m.wk + 1) + '</span></div>' +
                  '<div class="pm-t">' + esc(m.title) + '</div>' +
                  (open
                    ? '<p class="pm-b">' + esc(m.body) + '</p>' +
                      (m.replyText ? '<p class="pm-reply">أنت: ' + esc(m.replyText) + '</p>' : '') +
                      (opts.length ? '<div class="pm-acts">' + opts.map((o) => '<button class="btn small" data-reply="' + o[0] + '" data-mid="' + m.id + '">' + esc(o[1]) + '</button>').join('') + '</div>' : '') +
                      (m.offer ? '<div class="pm-acts"><button class="btn small gold" data-offer="' + m.offer + '">عرض التفاصيل والتفاوض</button></div>' : '')
                    : '') +
                  '</div>'
                );
              })
              .join('')
          : '<p class="muted">لا توجد رسائل.</p>') +
        '</div>'
      );
    },

    offers(st) {
      const u = st.user;
      const act = FC.Transfer.active(st);
      const old = (st.offers || []).filter((o) => act.indexOf(o) < 0).slice(0, 8);
      const win = FC.Transfer.windowName(st);
      const row = (o, live) => {
        const c = st.clubs[o.club];
        const L = st.leagues[c.lg];
        const typeName = { transfer: 'انتقال', loan: 'إعارة', free: 'انتقال حر', renew: 'تجديد' }[o.type];
        const status = { new: 'جديد', counter: o.agreed ? 'تم الاتفاق' : 'عرض مضاد', accepted: 'مقبول', rejected: 'مرفوض', expired: 'منتهٍ', collapsed: 'انهار', refused: 'رفض ناديك', withdrawn: 'سُحب' }[o.status];
        return (
          '<button class="ph-offer' + (live ? ' live' : '') + '" ' + (live ? 'data-offer="' + o.id + '"' : 'disabled') + '>' + UI.badge(c, 34) +
          '<div><b>' + esc(c.name) + '</b><span>' + esc(L ? L.short || L.name : '') + ' · ' + typeName + ' · ' + esc(FC.Transfer.ROLE_NAME[o.role]) + '</span><span dir="ltr">' + esc(money(o.wage)) + '/أسبوع' + (o.fee ? ' · ' + esc(money(o.fee)) : '') + '</span></div>' +
          '<em class="st-' + o.status + '">' + status + '</em></button>'
        );
      };
      return (
        header('العروض', true) +
        '<div class="ph-note">' + (win ? 'فترة الانتقالات ' + win + ' مفتوحة' : 'فترة الانتقالات مغلقة — فقط عروض التجديد والانتقال الحر') + (u.agent ? ' · وكيلك: ' + esc(u.agent.name) : ' · بدون وكيل (عروض أقل)') + '</div>' +
        '<div class="ph-list">' + (act.length ? act.map((o) => row(o, true)).join('') : '<p class="muted">لا عروض مفتوحة الآن. العروض تصل في فترات الانتقالات حسب أدائك وظهورك.</p>') + '</div>' +
        (old.length ? '<h4 class="ph-sub">عروض سابقة</h4><div class="ph-list">' + old.map((o) => row(o, false)).join('') + '</div>' : '')
      );
    },

    contract(st) {
      const u = st.user;
      const c = u.contract;
      const value = FC.Econ.value(st, u);
      const yl = FC.Transfer.yearsLeft(st);
      if (!c) return header('العقد', true) + '<div class="ph-card"><p>لا يوجد عقد حالياً — أنت لاعب حر.</p><button class="btn gold" data-app="offers">العروض</button></div>';
      const club = st.clubs[c.club];
      return (
        header('العقد', true) +
        '<div class="ph-card">' +
        '<div class="ph-club">' + UI.badge(club, 40) + '<div><b>' + esc(club.name) + '</b><span>' + (c.youth ? 'منحة الأكاديمية' : esc(FC.Transfer.ROLE_NAME[c.role])) + (u.loan ? ' · معار إلى ' + esc(st.clubs[u.club].name) : '') + '</span></div></div>' +
        '<div class="kv"><span>الراتب الأسبوعي</span><b dir="ltr">' + esc(money(c.wage)) + '</b></div>' +
        '<div class="kv"><span>ينتهي</span><b>صيف ' + (c.end + 1) + ' <small class="muted">(' + U.round1(Math.max(0, yl)) + ' سنة)</small></b></div>' +
        '<div class="kv"><span>الشرط الجزائي</span><b dir="ltr">' + (c.release ? esc(money(c.release)) : 'لا يوجد') + '</b></div>' +
        (c.bonus ? '<div class="kv"><span>المكافآت</span><b class="small">' + bonusTxt(c.bonus) + '</b></div>' : '') +
        '<div class="kv"><span>قيمتك السوقية</span><b dir="ltr" class="gold-text">' + esc(money(value)) + '</b></div>' +
        (u.nextContract ? '<p class="ph-alert">اتفاق مبدئي: ستنتقل إلى ' + esc(st.clubs[u.nextContract.club].name) + ' بنهاية الموسم.</p>' : '') +
        '</div>' +
        (u.team === 'F' && !u.loan && !u.listed ? '<div class="ph-card"><p class="muted small">طلب الانتقال يخفض سعرك ويجذب العروض، لكنه يضر بثقة المدرب (−' + FC.BAL.transfer.requestTrust + ').</p><button class="btn ghost" data-act="request">تقديم طلب انتقال</button></div>' : '') +
        (u.listed ? '<p class="ph-note">أنت على قائمة الانتقالات.</p>' : '')
      );
    },

    bank(st) {
      const u = st.user;
      const list = u.bank || [];
      const inc = U.sum(list.filter((t) => t.s === st.season && t.a > 0), (t) => t.a);
      const out = U.sum(list.filter((t) => t.s === st.season && t.a < 0), (t) => t.a);
      return (
        header('البنك', true) +
        '<div class="ph-card ph-bank"><span>الرصيد</span><b dir="ltr">' + esc(money(u.money || 0)) + '</b>' +
        '<div class="row gap small"><span class="up">دخل الموسم ' + esc(money(inc)) + '</span><span class="dn">مصاريف ' + esc(money(-out)) + '</span></div></div>' +
        '<div class="ph-list">' +
        (list.length
          ? list.slice(0, 40).map((t) => '<div class="ph-txn"><span>' + esc(t.t) + '<small>' + FC.Calendar.seasonLabel(t.s) + ' · أ' + (t.w + 1) + '</small></span><b dir="ltr" class="' + (t.a >= 0 ? 'up' : 'dn') + '">' + (t.a >= 0 ? '+' : '') + esc(money(t.a)) + '</b></div>').join('')
          : '<p class="muted">لا حركات بعد.</p>') +
        '</div>'
      );
    },

    agent(st) {
      const u = st.user;
      const a = u.agent;
      return (
        header('الوكيل', true) +
        (a
          ? '<div class="ph-card"><div class="ph-club"><i class="ph-av">🤝</i><div><b>' + esc(a.name) + '</b><span>' + UI.stars(a.stars) + ' · عمولة ' + a.fee + '%</span></div></div><p class="muted small">وكيلك يجلب عروضاً أكثر وأفضل، ويحسّن شروط التفاوض، ويقلل انهيار المفاوضات.</p><button class="btn ghost small" data-act="fire">إنهاء التعاقد</button></div>'
          : '<div class="ph-note">بدون وكيل تصلك عروض أقل. الوكلاء الكبار يقبلون تمثيل اللاعبين المميزين فقط.</div>') +
        '<h4 class="ph-sub">وكلاء متاحون</h4><div class="ph-list">' +
        FC.Transfer.AGENTS.map((ag, i) => {
          const ok = FC.Transfer.agentAccepts(st, ag);
          const mine = a && a.name === ag.name;
          return '<div class="ph-agent"><div><b>' + esc(ag.name) + '</b><span>' + UI.stars(ag.stars) + ' · عمولة ' + ag.fee + '%</span></div>' + (mine ? '<em>وكيلك</em>' : ok ? '<button class="btn small gold" data-hire="' + i + '">تعاقد</button>' : '<em class="muted">لا يهتم بك بعد</em>') + '</div>';
        }).join('') +
        '</div>'
      );
    },

    market(st) {
      const list = (st.tlog || []).slice(0, 40);
      const myLg = FC.Game.userLeague(st);
      return (
        header('الانتقالات', true) +
        '<div class="ph-list">' +
        (list.length
          ? list
              .map((t) => {
                const a = st.clubs[t.from];
                const b = st.clubs[t.to];
                const mine = t.pid === 0;
                const hot = b && a && (b.lg === myLg || a.lg === myLg);
                return '<div class="ph-tr' + (mine ? ' me' : hot ? ' hot' : '') + '"><b>' + esc(t.name.replace(/_/g, ' ')) + '</b><span>' + (a ? UI.badge(a, 16) + ' ' + esc(a.short) : '—') + ' ← ' + (b ? UI.badge(b, 16) + ' ' + esc(b.short) : '') + '</span><em dir="ltr">' + (t.loan ? 'إعارة' : t.fee ? esc(money(t.fee)) : 'حر') + '</em></div>';
              })
              .join('')
          : '<p class="muted">لا صفقات بعد — الأندية تتحرك في فترات الانتقالات.</p>') +
        '</div>'
      );
    },
  };

  UI.screens.phone = {
    chrome: true,
    nav: 'home',
    render(p) {
      const st = FC.State.cur;
      const app = p.app || 'home';
      const view = VIEWS[app] || (FC.PhoneViews && FC.PhoneViews[app]) || VIEWS.home;
      return '<div class="phone"><div class="ph-screen">' + view(st, p) + '</div></div>';
    },
    bind(el, p) {
      const st = FC.State.cur;
      const app = p.app || 'home';
      if (app === 'msgs' && p.focus) {
        const m = st.inbox.find((x) => x.id === p.focus);
        if (m) m.read = true;
      }
      el.addEventListener('click', (ev) => {
        const t = ev.target.closest('[data-app],[data-msg],[data-reply],[data-offer],[data-act],[data-hire]');
        if (!t) return;
        if (FC.Sound) FC.Sound.click();
        if (t.dataset.reply) {
          ev.stopPropagation();
          const r = FC.Phone.reply(st, parseInt(t.dataset.mid, 10), t.dataset.reply);
          if (r) UI.toast('أرسلت ردك', 'ok');
          return UI.go('phone', { app: 'msgs', focus: parseInt(t.dataset.mid, 10) });
        }
        if (t.dataset.offer) return UI.go('nego', { id: parseInt(t.dataset.offer, 10) });
        if (t.dataset.app) return UI.go('phone', { app: t.dataset.app });
        if (t.dataset.msg) {
          const id = parseInt(t.dataset.msg, 10);
          const m = st.inbox.find((x) => x.id === id);
          if (m) m.read = true;
          return UI.go('phone', { app: 'msgs', focus: p.focus === id ? null : id });
        }
        if (t.dataset.hire) {
          if (FC.Transfer.hireAgent(st, parseInt(t.dataset.hire, 10))) UI.toast('تعاقدت مع وكيل جديد', 'ok');
          return UI.go('phone', { app: 'agent' });
        }
        const a = t.dataset.act;
        if (a === 'fire') {
          FC.Transfer.fireAgent(st);
          return UI.go('phone', { app: 'agent' });
        }
        if (a === 'request') {
          UI.modal('طلب انتقال', '<p>سيخفض النادي سعرك وستصلك عروض أكثر، لكن ثقة المدرب ستنخفض ' + FC.BAL.transfer.requestTrust + ' نقطة. متأكد؟</p>', [
            { label: 'نعم، أريد الرحيل', cls: 'danger', value: true },
            { label: 'إلغاء', cls: 'ghost', value: false },
          ]).then((ok) => {
            if (ok && FC.Transfer.requestTransfer(st)) UI.toast('قدّمت طلب الانتقال');
            UI.go('phone', { app: 'contract' });
          });
        }
      });
    },
  };

  // صندوق الرسائل القديم يفتح تطبيق الرسائل
  UI.inbox = function (focusId) {
    UI.go('phone', { app: 'msgs', focus: focusId || null });
  };

  // ================= التفاوض =================
  UI.screens.nego = {
    chrome: true,
    nav: 'home',
    render(p) {
      const st = FC.State.cur;
      const o = FC.Transfer.byId(st, p.id);
      if (!o) return '<div class="panel"><p>العرض غير موجود.</p><button class="btn" data-go="phone">الهاتف</button></div>';
      const u = st.user;
      const c = st.clubs[o.club];
      const L = st.leagues[c.lg];
      const live = o.status === 'new' || o.status === 'counter';
      const ask = p.ask || { wage: o.wage, years: o.years, role: o.role, release: null };
      const R = FC.Transfer.ROLES.filter((r) => r !== 'youth');
      const typeName = { transfer: 'عرض انتقال', loan: 'عرض إعارة', free: 'انتقال حر', renew: 'تجديد العقد' }[o.type];
      const cur = u.contract;
      const cmp = (label, a, b) => '<div class="kv"><span>' + label + '</span><b>' + a + (b ? ' <small class="muted">(' + b + ')</small>' : '') + '</b></div>';
      return (
        '<div class="page-h"><button class="icon-btn" data-go="phone" data-p=\'{"app":"offers"}\'>' + UI.icon('back') + '</button><h2>' + typeName + '</h2></div>' +
        '<div class="panel nego-head"><div class="ph-club">' + UI.badge(c, 56) + '<div><h3>' + esc(c.name) + '</h3><span class="muted">' + esc(L ? L.name : '') + ' · ' + esc(c.city) + ' · مستوى الفريق ' + Math.round(c.lvl) + '</span></div></div>' +
        cmp('الدور', esc(FC.Transfer.ROLE_NAME[o.role]), cur && o.type !== 'renew' ? 'حالياً: ' + esc(FC.Transfer.ROLE_NAME[cur.role] || '') : '') +
        cmp('الراتب الأسبوعي', '<span dir="ltr">' + esc(money(o.wage)) + '</span>', cur ? 'حالياً ' + esc(money(cur.wage)) : '') +
        cmp('المدة', o.years + ' سنوات') +
        (o.fee ? cmp('رسوم الانتقال لناديك', '<span dir="ltr">' + esc(money(o.fee)) + '</span>', 'سعر ناديك ≈ ' + esc(money(FC.Transfer.askPrice(st)))) : '') +
        (o.signOn ? cmp('مكافأة التوقيع', '<span dir="ltr">' + esc(money(o.signOn)) + '</span>') : '') +
        cmp('الشرط الجزائي', o.release ? '<span dir="ltr">' + esc(money(o.release)) + '</span>' : 'لا يوجد') +
        cmp('المكافآت', bonusTxt(o.bonus)) +
        (o.agreed ? '<p class="ph-alert ok">✓ النادي وافق على شروطك — أكّد التوقيع.</p>' : p.msg ? '<p class="ph-alert">' + esc(p.msg) + '</p>' : '') +
        '</div>' +
        (live && !o.agreed
          ? '<div class="panel nego-form"><h3>مطالبك' + (u.agent ? ' (عبر ' + esc(u.agent.name) + ')' : '') + '</h3>' +
            '<div class="nf-row"><span>الراتب الأسبوعي</span><input type="range" min="' + o.wage + '" max="' + Math.round(o.wage * 1.6) + '" step="50" value="' + Math.round(ask.wage) + '" data-f="wage"><b dir="ltr" class="nf-w">' + esc(money(ask.wage)) + '</b></div>' +
            '<div class="nf-row"><span>المدة</span><div class="seg-btns">' + [1, 2, 3, 4, 5].map((y) => '<button class="' + (y === ask.years ? 'on' : '') + '" data-years="' + y + '">' + y + '</button>').join('') + '</div></div>' +
            (o.type !== 'loan' ? '<div class="nf-row"><span>الدور</span><div class="seg-btns">' + R.map((r) => '<button class="' + (r === ask.role ? 'on' : '') + '" data-role="' + r + '">' + esc(FC.Transfer.ROLE_NAME[r]) + '</button>').join('') + '</div></div>' : '') +
            (o.release ? '<label class="nf-row nf-chk"><input type="checkbox" data-f="release"' + (ask.release === 'low' ? ' checked' : '') + '> أطلب شرطاً جزائياً أقل</label>' : '') +
            '<p class="muted small">الطمع الزائد قد يُفشل المفاوضات. ميزانية النادي محدودة' + (u.agent ? '، ووكيلك يحسّن فرصك.' : '. الوكيل يحسّن فرصك.') + ' الجولة ' + (o.rounds + 1) + '.</p>' +
            '</div>'
          : '') +
        (live
          ? '<div class="cta">' +
            (o.agreed ? '<button class="btn gold big" data-act="accept">توقيع العقد</button>' : '<button class="btn gold" data-act="accept">قبول العرض</button><button class="btn" data-act="counter">تفاوض</button>') +
            '<button class="btn ghost" data-act="reject">رفض</button></div>'
          : '<div class="cta"><button class="btn" data-go="phone" data-p=\'{"app":"offers"}\'>العروض</button></div>')
      );
    },
    bind(el, p) {
      const st = FC.State.cur;
      const o = FC.Transfer.byId(st, p.id);
      if (!o) return;
      const ask = p.ask || { wage: o.wage, years: o.years, role: o.role, release: null };
      const wEl = el.querySelector('.nf-w');
      const rng = el.querySelector('input[data-f=wage]');
      if (rng)
        rng.addEventListener('input', () => {
          ask.wage = parseInt(rng.value, 10);
          wEl.textContent = money(ask.wage);
        });
      const chk = el.querySelector('input[data-f=release]');
      if (chk) chk.addEventListener('change', () => (ask.release = chk.checked ? 'low' : null));
      el.addEventListener('click', async (ev) => {
        const t = ev.target.closest('[data-years],[data-role],[data-act]');
        if (!t) return;
        if (t.dataset.years) {
          ask.years = parseInt(t.dataset.years, 10);
          return UI.go('nego', { id: o.id, ask });
        }
        if (t.dataset.role) {
          ask.role = t.dataset.role;
          return UI.go('nego', { id: o.id, ask });
        }
        const a = t.dataset.act;
        let r;
        if (a === 'reject') r = FC.Transfer.respond(st, o.id, 'reject');
        else if (a === 'counter') r = FC.Transfer.respond(st, o.id, 'counter', ask);
        else if (a === 'accept') {
          if (st.user.freeAgent && (o.type === 'free' || o.type === 'transfer')) {
            FC.Transfer.signFree(st, o, FC.rngOf(st));
            r = { ok: true, status: 'done', msg: 'وقّعت مع ' + st.clubs[o.club].name };
          } else r = FC.Transfer.respond(st, o.id, 'accept');
        }
        if (!r) return;
        if (r.status === 'done') {
          UI.toast(r.msg, 'ok');
          if (FC.Sound) FC.Sound.goal(0.4);
          UI.confetti && UI.confetti(80);
          await UI.saveNow(true);
          return UI.go('home');
        }
        UI.toast(r.msg, r.ok ? '' : 'bad');
        UI.go('nego', { id: o.id, ask: { wage: o.wage, years: o.years, role: o.role, release: ask.release }, msg: r.msg });
      });
    },
  };
})(globalThis);
