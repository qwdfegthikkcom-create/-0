/* =========================================================
   خطة الأسبوع: تدريب الفريق تلقائي + 2–3 نشاطات شخصية بطاقة محدودة
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC;
  const UI = FC.UI;
  const U = FC.util;
  const esc = U.esc;

  let plan = null; // الخطة قيد الإعداد
  let pick = null; // إعداد التدريب الفردي المفتوح

  const INT_NAMES = { light: 'خفيف', mid: 'متوسط', hard: 'مكثف' };

  function cost(it) {
    return FC.Game.activityCost(it);
  }
  function used() {
    return plan.reduce((s, it) => s + cost(it), 0);
  }
  function label(it) {
    if (it.k === 'train') {
      const g = FC.Player.TRAIN[it.g];
      return 'تدريب فردي: ' + g.name + ' (' + INT_NAMES[it.int] + ')' + (it.mult != null ? ' — لعبت ×' + it.mult.toFixed(1) : ' — تلقائي ×1.0');
    }
    return { physio: 'علاج طبيعي واستشفاء', rest: 'راحة كاملة', video: 'تحليل فيديو المباريات', family: 'وقت مع العائلة والأصدقاء' }[it.k];
  }

  UI.screens.week = {
    chrome: true,
    nav: 'week',
    render() {
      const st = FC.State.cur;
      const W = FC.BAL.week;
      const u = st.user;
      if (st.wk.planned) {
        const fx = FC.Game.userFixtureRef(st);
        plan = null;
        return (
          '<div class="page-h"><h2>خطة الأسبوع</h2><span class="muted">' + esc(UI.date(st)) + '</span></div>' +
          '<div class="panel"><h3>✓ تم اعتماد خطة هذا الأسبوع</h3><ul class="plan-list">' +
          (st.wk.plan.length ? st.wk.plan.map((it) => '<li>' + esc(label(it)) + '</li>').join('') : '<li class="muted">تدريب الفريق فقط</li>') +
          '</ul>' + UI.meter('اللياقة', u.fit) + '</div>' +
          '<div class="cta">' +
          (fx && !st.wk.played ? '<button class="btn gold big" data-go="matchPre">' + UI.icon('whistle') + ' إلى المباراة</button>' : '<button class="btn gold big" data-act="endweek">' + UI.icon('play') + ' إنهاء الأسبوع</button>') +
          '</div>'
        );
      }
      if (!plan) plan = [];
      const left = W.energy - used();
      const role = FC.Player.POS[u.pos].role;
      const groups = Object.keys(FC.Player.TRAIN).filter((g) => (role === 'GK' ? true : g !== 'keeper'));
      let trainBox = '';
      if (pick) {
        trainBox =
          '<div class="panel train-box"><h3>تدريب فردي</h3>' +
          '<div class="opt-btns groups">' + groups.map((g) => '<button class="' + (g === pick.g ? 'on' : '') + '" data-g="' + g + '">' + esc(FC.Player.TRAIN[g].name) + (FC.Training.GAMES[g] ? ' 🎯' : '') + '</button>').join('') + '</div>' +
          '<p class="muted small">السمات: ' + FC.Player.TRAIN[pick.g].attrs.map((k) => FC.Player.LABEL[k]).join('، ') + '</p>' +
          '<div class="seg"><span>الشدة</span><div class="seg-btns">' +
          ['light', 'mid', 'hard'].map((k) => '<button class="' + (k === pick.int ? 'on' : '') + '" data-int="' + k + '">' + INT_NAMES[k] + ' <small dir="ltr">×' + FC.BAL.growth.intensity[k] + '</small></button>').join('') +
          '</div></div>' +
          '<p class="muted small">تكلفة الطاقة ' + W.train[pick.int].energy + ' · اللياقة ' + W.train[pick.int].fit + (pick.int === 'hard' ? ' · المكثف يرفع ثقة المدرب ويستهلك لياقتك' : '') + '</p>' +
          '<div class="row gap">' +
          (FC.Training.GAMES[pick.g] ? '<button class="btn gold" data-act="game">🎯 العب التدريب</button>' : '') +
          '<button class="btn" data-act="auto">تدريب تلقائي ×1.0</button>' +
          '<button class="btn ghost" data-act="cancel">إلغاء</button></div></div>';
      }
      const inj = u.inj;
      const acts = [
        ['train', 'تدريب فردي', inj ? 'غير متاح أثناء الإصابة' : 'لعبة مصغّرة أو تلقائي — يسرّع تطور مجموعة سمات', W.train.mid.energy + '+'],
        ['physio', 'علاج طبيعي واستشفاء', inj ? 'يسرّع الشفاء ' + FC.BAL.inj.physioDays + ' أيام' : '+' + W.physio.fit + ' لياقة ويخفض خطر الإصابة', W.physio.energy],
        ['rest', 'راحة كاملة', '+' + W.rest.fit + ' لياقة، معنويات أفضل قليلاً', W.rest.energy],
        ['video', 'تحليل فيديو', 'تحسن ذهني بسيط + ثقة المدرب', W.video.energy],
        ['family', 'العائلة والأصدقاء', '+' + W.family.morale + ' معنويات', W.family.energy],
      ];
      return (
        '<div class="page-h"><h2>خطة الأسبوع</h2><span class="muted">' + esc(UI.date(st)) + '</span></div>' +
        '<div class="panel energy">' + UI.meter('الطاقة المتبقية', left, left > 40 ? 'good' : left > 15 ? 'mid' : 'low') +
        '<p class="muted small">✓ تدريب الفريق تلقائي كل أسبوع. اختر حتى ' + W.maxActivities + ' نشاطات شخصية.' + (inj ? ' <b>أنت مصاب (' + esc(inj.name) + ')</b>: ركّز على العلاج الطبيعي.' : u.fit < FC.BAL.inj.fitLow ? ' لياقتك منخفضة: التدريب المكثف يرفع خطر الإصابة.' : '') + '</p></div>' +
        '<div class="acts">' +
        acts.map((a) => '<button class="act panel" data-add="' + a[0] + '"' + (plan.length >= W.maxActivities || (a[0] === 'train' && inj) ? ' disabled' : '') + '><b>' + a[1] + '</b><span>' + a[2] + '</span><i>طاقة ' + a[3] + '</i></button>').join('') +
        '</div>' +
        trainBox +
        '<div class="panel"><h3>خطتك (' + plan.length + '/' + W.maxActivities + ')</h3>' +
        (plan.length ? '<ul class="plan-list">' + plan.map((it, i) => '<li><span>' + esc(label(it)) + '</span><button class="icon-btn small" data-rm="' + i + '">' + UI.icon('close') + '</button></li>').join('') + '</ul>' : '<p class="muted">لم تختر نشاطات بعد.</p>') +
        '</div>' +
        '<div class="cta"><button class="btn gold big" data-act="confirm">اعتماد الخطة</button></div>'
      );
    },
    bind(el) {
      const st = FC.State.cur;
      const W = FC.BAL.week;
      const rer = () => UI.go('week');
      el.addEventListener('click', async (ev) => {
        const t = ev.target.closest('button');
        if (!t) return;
        if (t.dataset.act === 'endweek') return UI.endWeek();
        if (t.dataset.add) {
          const k = t.dataset.add;
          if (plan.length >= W.maxActivities) return;
          if (k === 'train') {
            const role = FC.Player.POS[st.user.pos].role;
            pick = { k: 'train', g: FC.Game.DEFAULT_TRAIN[role][0], int: 'mid', mult: null };
            return rer();
          }
          const it = { k };
          if (plan.some((x) => x.k === k)) return UI.toast('هذا النشاط مضاف بالفعل');
          if (cost(it) > W.energy - used()) return UI.toast('لا تكفي الطاقة', 'bad');
          plan.push(it);
          return rer();
        }
        if (t.dataset.g) {
          pick.g = t.dataset.g;
          return rer();
        }
        if (t.dataset.int) {
          pick.int = t.dataset.int;
          return rer();
        }
        if (t.dataset.rm) {
          plan.splice(parseInt(t.dataset.rm, 10), 1);
          return rer();
        }
        const a = t.dataset.act;
        if (a === 'cancel') {
          pick = null;
          return rer();
        }
        if (a === 'auto' || a === 'game') {
          if (cost(pick) > W.energy - used()) return UI.toast('لا تكفي الطاقة لهذه الشدة', 'bad');
          if (plan.some((x) => x.k === 'train' && x.g === pick.g)) return UI.toast('هذه المجموعة مضافة بالفعل');
          const it = Object.assign({}, pick);
          if (a === 'game') {
            const res = await FC.Training.play(pick.g, st.user);
            it.mult = res.mult;
          }
          plan.push(it);
          pick = null;
          return rer();
        }
        if (a === 'confirm') {
          FC.Game.applyPlan(st, plan);
          plan = null;
          pick = null;
          UI.toast('تم اعتماد خطة الأسبوع', 'ok');
          const fx = FC.Game.userFixtureRef(st);
          UI.go(fx && !st.wk.played ? 'matchPre' : 'week');
        }
      });
    },
  };
})(globalThis);
