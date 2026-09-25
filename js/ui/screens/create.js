/* =========================================================
   معالج إنشاء اللاعب: الهوية ← المركز والجسم ← الشكل ← الصعوبة ← الملخص
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC;
  const UI = FC.UI;
  const U = FC.util;
  const esc = U.esc;

  let draft = null;
  let preview = null; // الحالة المولّدة للملخص

  function newDraft() {
    return {
      step: 1, fn: '', ln: '', nick: '', nat: 'IRQ', city: 'بغداد', startLeague: null,
      pos: 'ST', foot: 'R', ht: 180, wt: 74,
      face: { skin: 2, hair: 2, hairCol: 0, beard: 0 },
      diff: 'real', seed: (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0,
    };
  }

  const STEPS = ['الهوية', 'المركز', 'الشكل', 'الصعوبة', 'الملخص'];
  // مواقع المراكز على الملعب المصغّر
  const PITCH_POS = { ST: [50, 12], LW: [18, 22], RW: [82, 22], CAM: [50, 32], CM: [50, 50], CDM: [50, 64], LB: [14, 70], RB: [86, 70], CB: [50, 78], GK: [50, 92] };

  function hasLeague(nat) {
    return FC.DATA.leagues.some((l) => l.nat === nat);
  }

  function stepIdentity(d) {
    const n = FC.DATA.nations[d.nat];
    return (
      '<div class="panel form">' +
      '<label>الاسم الأول<input name="fn" maxlength="16" value="' + esc(d.fn) + '" placeholder="مثال: علي" autocomplete="off"></label>' +
      '<label>اسم العائلة أو الأب<input name="ln" maxlength="18" value="' + esc(d.ln) + '" placeholder="مثال: حسين" autocomplete="off"></label>' +
      '<label>اللقب (اختياري)<input name="nick" maxlength="14" value="' + esc(d.nick) + '" placeholder="مثال: الصاروخ" autocomplete="off"></label>' +
      '<label>الجنسية<button class="select-btn" data-act="nat">' + UI.flag(d.nat, 16) + '<span>' + esc(n.name) + '</span><i>▾</i></button></label>' +
      '<label>مدينة الولادة<select name="city">' + n.cities.map((c) => '<option' + (c === d.city ? ' selected' : '') + '>' + esc(c) + '</option>').join('') + '</select></label>' +
      (hasLeague(d.nat)
        ? '<p class="muted small">ستبدأ في فريق الشباب لنادٍ صغير أو متوسط في دوري ' + esc(n.name) + '.</p>'
        : '<label>دوري البداية (لا يوجد دوري لبلدك في اللعبة)<select name="startLeague">' +
          FC.DATA.leagues.map((l) => '<option value="' + l.id + '"' + (l.id === (d.startLeague || 'KSA') ? ' selected' : '') + '>' + esc(l.name) + '</option>').join('') +
          '</select></label>') +
      '</div>'
    );
  }

  function stepPosition(d) {
    const role = FC.Player.POS[d.pos].role;
    const dh = d.ht - 180;
    let eff = [];
    if (dh >= 5) eff = ['+ الرأسيات والقفز والقوة', '− السرعة والرشاقة قليلاً'];
    else if (dh <= -5) eff = ['+ السرعة والرشاقة', '− الرأسيات والقوة'];
    else eff = ['طول متوازن'];
    return (
      '<div class="panel"><h3>المركز</h3><div class="mini-pitch">' +
      Object.keys(PITCH_POS)
        .map((p) => '<button class="pos-btn' + (p === d.pos ? ' on' : '') + '" data-pos="' + p + '" style="left:' + PITCH_POS[p][0] + '%;top:' + PITCH_POS[p][1] + '%">' + esc(FC.Player.POS[p].short) + '</button>')
        .join('') +
      '</div><p class="pos-desc">' + esc(FC.Player.POS[d.pos].name) + (role === 'GK' ? ' — لحظات الحراسة الكاملة تأتي في المرحلة 2' : '') + '</p></div>' +
      '<div class="panel form">' +
      '<div class="seg"><span>القدم المفضلة</span><div class="seg-btns"><button data-foot="R" class="' + (d.foot === 'R' ? 'on' : '') + '">اليمنى</button><button data-foot="L" class="' + (d.foot === 'L' ? 'on' : '') + '">اليسرى</button></div></div>' +
      '<label>الطول: <b>' + d.ht + ' سم</b><input type="range" name="ht" min="160" max="200" value="' + d.ht + '"></label>' +
      '<label>الوزن: <b>' + d.wt + ' كغ</b><input type="range" name="wt" min="55" max="100" value="' + d.wt + '"></label>' +
      '<p class="muted small">' + eff.join(' · ') + '</p>' +
      '</div>'
    );
  }

  function swatches(list, key, cur) {
    return '<div class="swatches">' + list.map((c, i) => '<button class="sw' + (i === cur ? ' on' : '') + '" data-face="' + key + '" data-v="' + i + '" style="background:' + c + '" aria-label="' + (i + 1) + '"></button>').join('') + '</div>';
  }
  function opts(list, key, cur) {
    return '<div class="opt-btns">' + list.map((n, i) => '<button class="' + (i === cur ? 'on' : '') + '" data-face="' + key + '" data-v="' + i + '">' + esc(n) + '</button>').join('') + '</div>';
  }
  function stepLook(d) {
    const f = d.face;
    return (
      '<div class="panel look"><div class="look-prev">' + UI.face(f, '#1f4e9e', 150) + '</div>' +
      '<div class="look-ctl">' +
      '<h4>لون البشرة</h4>' + swatches(UI.SKINS, 'skin', f.skin) +
      '<h4>قصة الشعر</h4>' + opts(UI.HAIRS, 'hair', f.hair) +
      '<h4>لون الشعر</h4>' + swatches(UI.HAIRCOLS, 'hairCol', f.hairCol) +
      '<h4>اللحية</h4>' + opts(UI.BEARDS, 'beard', f.beard) +
      '<button class="btn ghost small" data-act="randface">🎲 شكل عشوائي</button>' +
      '</div></div>'
    );
  }
  function stepDiff(d) {
    const cards = [
      ['easy', 'سهل', 'إمكانات عالية (82–94)، تطور أسرع، لحظات أسهل، اهتمام أكبر من الأندية.'],
      ['real', 'واقعي', 'التجربة المقصودة: إمكانات 65–92 (غالباً 74–84)، كل شيء يتصرف مثل كرة القدم الحقيقية.'],
      ['hard', 'صعب', 'إمكانات 60–88، تطور أبطأ، حراس ومدافعون أسرع رد فعل، والطريق إلى القمة طويل.'],
    ];
    return '<div class="diff-cards">' + cards.map((c) => '<button class="diff panel' + (c[0] === d.diff ? ' on' : '') + '" data-diff="' + c[0] + '"><b>' + c[1] + '</b><span>' + c[2] + '</span></button>').join('') + '</div>';
  }
  function stepSummary(d) {
    preview = FC.Game.newCareer(Object.assign({}, d));
    const st = preview;
    const u = st.user;
    const club = st.clubs[u.club];
    const pr = FC.Player.potRange(st, u);
    const L = st.leagues[club.lg];
    return (
      '<div class="summary">' +
      UI.card(u, { club, shine: true }) +
      '<div class="panel sum-info">' +
      '<h3>' + esc(FC.Player.fullName(u)) + (u.nick ? ' «' + esc(u.nick) + '»' : '') + '</h3>' +
      '<div class="kv"><span>العمر</span><b>16</b></div>' +
      '<div class="kv"><span>المركز</span><b>' + esc(FC.Player.POS[u.pos].name) + '</b></div>' +
      '<div class="kv"><span>النادي</span><b>' + UI.badge(club, 20) + ' أكاديمية ' + esc(club.name) + '</b></div>' +
      '<div class="kv"><span>الدوري</span><b>' + esc(L.name) + '</b></div>' +
      '<div class="kv"><span>تقدير الكشافين للإمكانات</span><b dir="ltr">' + pr[0] + '–' + pr[1] + '</b></div>' +
      '<div class="kv"><span>القدم الضعيفة</span><b>' + UI.stars(u.hid.wf) + '</b></div>' +
      '<div class="kv"><span>المهارات</span><b>' + UI.stars(u.hid.sk) + '</b></div>' +
      '<p class="muted small">ستبدأ مع فريق الشباب. تطور بسرعة وسيطلبك الفريق الأول.</p>' +
      '</div></div>'
    );
  }

  UI.screens.create = {
    render() {
      if (!draft) draft = newDraft();
      const d = draft;
      const body = [stepIdentity, stepPosition, stepLook, stepDiff, stepSummary][d.step - 1](d);
      return (
        '<div class="page create">' +
        '<div class="page-h"><button class="icon-btn" data-act="back">' + UI.icon('back') + '</button><h2>مسيرة جديدة</h2></div>' +
        '<div class="steps">' + STEPS.map((s, i) => '<div class="stp' + (i + 1 === d.step ? ' on' : i + 1 < d.step ? ' done' : '') + '"><i>' + (i + 1) + '</i><span>' + s + '</span></div>').join('') + '</div>' +
        '<div class="create-body">' + body + '</div>' +
        '<div class="create-foot">' +
        (d.step > 1 ? '<button class="btn ghost" data-act="prev">السابق</button>' : '<span></span>') +
        (d.step < 5 ? '<button class="btn gold" data-act="next">التالي</button>' : '<button class="btn gold big" data-act="start">ابدأ المسيرة</button>') +
        '</div></div>'
      );
    },
    bind(el) {
      const d = draft;
      const rerender = () => UI.go('create');
      // حفظ الحقول النصية فوراً
      el.querySelectorAll('input[name], select[name]').forEach((inp) => {
        inp.addEventListener('input', () => {
          const k = inp.name;
          if (k === 'ht' || k === 'wt') {
            d[k] = parseInt(inp.value, 10);
            const b = inp.parentElement.querySelector('b');
            b.textContent = d[k] + (k === 'ht' ? ' سم' : ' كغ');
          } else d[k] = inp.value.trim();
        });
        if (inp.type === 'range') inp.addEventListener('change', rerender);
      });
      el.addEventListener('click', async (ev) => {
        const t = ev.target.closest('button');
        if (!t) return;
        if (FC.Sound) FC.Sound.click();
        if (t.dataset.act === 'back') {
          draft = null;
          return UI.go('menu');
        }
        if (t.dataset.act === 'prev') {
          d.step--;
          return rerender();
        }
        if (t.dataset.act === 'next') {
          if (d.step === 1) {
            if (!d.fn || !d.ln) return UI.toast('اكتب الاسم الأول واسم العائلة', 'bad');
            if (!hasLeague(d.nat) && !d.startLeague) d.startLeague = 'KSA';
          }
          d.step++;
          return rerender();
        }
        if (t.dataset.act === 'nat') {
          const html =
            '<div class="nat-grid">' +
            FC.DATA.nationOrder.map((c) => '<button class="nat' + (c === d.nat ? ' on' : '') + '" data-n="' + c + '">' + UI.flag(c, 18) + '<span>' + esc(FC.DATA.nations[c].name) + '</span></button>').join('') +
            '</div>';
          UI.modal('اختر الجنسية', html, [], {
            cls: 'wide',
            onOpen(m) {
              m.querySelectorAll('.nat').forEach((b) =>
                b.addEventListener('click', () => {
                  d.nat = b.dataset.n;
                  d.city = FC.DATA.nations[d.nat].cities[0];
                  d.startLeague = hasLeague(d.nat) ? null : 'KSA';
                  m.querySelector('[data-v="__close"]').click();
                  rerender();
                })
              );
            },
          });
          return;
        }
        if (t.dataset.pos) {
          d.pos = t.dataset.pos;
          if ((d.pos === 'LB' || d.pos === 'LW') && d.foot === 'R') d.foot = 'L';
          return rerender();
        }
        if (t.dataset.foot) {
          d.foot = t.dataset.foot;
          return rerender();
        }
        if (t.dataset.face) {
          d.face[t.dataset.face] = parseInt(t.dataset.v, 10);
          return rerender();
        }
        if (t.dataset.act === 'randface') {
          d.face = { skin: Math.floor(Math.random() * 6), hair: Math.floor(Math.random() * 8), hairCol: Math.floor(Math.random() * 5), beard: Math.floor(Math.random() * 5) };
          return rerender();
        }
        if (t.dataset.diff) {
          d.diff = t.dataset.diff;
          return rerender();
        }
        if (t.dataset.act === 'start') {
          const st = preview || FC.Game.newCareer(Object.assign({}, d));
          const slots = await FC.Save.list();
          let slot = (slots.find((s) => !s.meta) || {}).slot;
          if (!slot) {
            slot = await UI.modal(
              'كل الخانات ممتلئة',
              '<p>اختر خانة لاستبدالها بالمسيرة الجديدة:</p>',
              slots.map((s) => ({ label: s.slot + ': ' + s.meta.name, value: s.slot }))
            );
            if (!slot) return;
          }
          FC.State.set(st, slot);
          draft = null;
          preview = null;
          await UI.saveNow(true);
          UI.go('home');
          setTimeout(() => UI.intro && UI.intro(), 400);
        }
      });
    },
  };
})(globalThis);
