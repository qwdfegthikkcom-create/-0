/* =========================================================
   شاشة المباراة الكاملة: تتحكم بلاعبك طوال المباراة
   - اللمس: عصا تحكم عائمة يساراً + أزرار يميناً (تسديد بالضغط المطوّل، تمرير، بينية، عالية، ركض)
   - الكيبورد: الأسهم للحركة، S تمرير، D تسديد (اضغط مطولاً)، W بينية، A عالية/عرضية، Shift ركض،
     C تغيير الكاميرا، Esc إيقاف مؤقت
   - بدون الكرة: «اطلب الكرة»، «افتكاك» (ضغط على حامل الكرة)، «انزلاق»
   - الحارس: «ارتماء» باتجاه العصا، «خروج» نحو الكرة
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC = G.FC || {};
  const U = FC.util;
  const STEP = 1 / 60;

  // تسميات الأزرار حسب الحالة
  function labels(fm) {
    const u = fm.user;
    if (!u || u.off) return null;
    const has = fm.ball.owner === u;
    if (u.isGK) {
      if (has) return { shoot: 'ركلة', pass: 'تمرير', through: '—', lob: 'ركلة' };
      return { shoot: 'ارتماء', pass: 'اطلب', through: 'خروج', lob: 'ضغط' };
    }
    if (has) return { shoot: 'تسديد', pass: 'تمرير', through: 'بينية', lob: 'عالية' };
    return { shoot: 'افتكاك', pass: 'اطلب الكرة', through: 'انزلاق', lob: 'ضغط' };
  }

  function statRow(a, name, b) {
    return '<div class="fm-st"><b>' + a + '</b><span>' + name + '</span><b>' + b + '</b></div>';
  }

  FC.FullView = {
    // تشغيل المباراة داخل عنصر host؛ تعود بوعد: {how: 'ft' | 'sim'}
    start(host, state, m, opts) {
      opts = opts || {};
      const esc = U.esc;
      return new Promise((resolve) => {
        const fm = FC.Full.create(state, m, { length: opts.length, auto: false, assist: opts.assist !== false });
        FC.FullView.cur = fm; // للفحص والاختبار
        const T0 = fm.teams[0];
        const T1 = fm.teams[1];
        const mySi = m.user ? m.user.si : 0;
        const touch = G.matchMedia && G.matchMedia('(pointer: coarse)').matches;
        const el = document.createElement('div');
        el.className = 'fm';
        el.innerHTML =
          '<canvas class="fm-c"></canvas>' +
          '<div class="fm-top">' +
          '<div class="fm-sb"><span class="fm-t"><i style="background:' + esc(T0.club.c1) + '"></i>' + esc(T0.club.short) + '</span>' +
          '<b class="fm-sc" dir="rtl"><span class="s0">0</span> - <span class="s1">0</span></b>' +
          '<span class="fm-t">' + esc(T1.club.short) + '<i style="background:' + esc(T1.club.c1) + '"></i></span>' +
          '<span class="fm-clk" dir="ltr">0\'</span></div>' +
          '<div class="fm-tb"><button class="fm-ib" data-a="cam" aria-label="الكاميرا">🎥</button><button class="fm-ib" data-a="pause" aria-label="إيقاف مؤقت">⏸</button></div>' +
          '</div>' +
          '<div class="fm-me"></div>' +
          '<div class="fm-tick"></div>' +
          '<div class="fm-banner"></div>' +
          '<div class="fm-joy hidden"><i class="fm-jb"></i><i class="fm-jk"></i></div>' +
          '<div class="fm-btns">' +
          '<button class="fm-b b-lob" data-b="lob"><span>عالية</span></button>' +
          '<button class="fm-b b-through" data-b="through"><span>بينية</span></button>' +
          '<button class="fm-b b-pass" data-b="pass"><span>تمرير</span></button>' +
          '<button class="fm-b b-shoot" data-b="shoot"><span>تسديد</span><i class="fm-pw"><i></i></i></button>' +
          '<button class="fm-b b-sprint" data-b="sprint"><span>ركض</span></button>' +
          '</div>' +
          '<div class="fm-joyzone"></div>' +
          '<div class="fm-ov hidden"></div>';
        host.appendChild(el);
        const canvas = el.querySelector('.fm-c');
        const R = FC.FullRender.create(canvas);
        const camPref = opts.cam && opts.cam !== 'auto' ? opts.cam : null;
        R.resize();
        R.setMode(camPref || (R.w >= R.h ? 'tv' : 'pro'));
        const $ = (q) => el.querySelector(q);
        const s0 = $('.s0');
        const s1 = $('.s1');
        const clk = $('.fm-clk');
        const me = $('.fm-me');
        const tick = $('.fm-tick');
        const banner = $('.fm-banner');
        const ov = $('.fm-ov');
        const joy = $('.fm-joy');
        const jk = $('.fm-jk');
        const pw = $('.fm-pw i');
        const btns = {};
        el.querySelectorAll('[data-b]').forEach((b) => (btns[b.dataset.b] = b));
        if (!touch) el.classList.add('kb');

        let alive = true;
        let paused = true; // يبدأ بشاشة «ابدأ»
        let acc = 0;
        let last = performance.now();
        let feedSeen = 0;
        let tickUntil = 0;
        let lastHalf = fm.half;
        let offShown = false;
        let lastLabels = '';
        let lastScore = '0-0';
        const input = { jx: 0, jy: 0, jmag: 0, keys: {}, sprint: false, sprintKey: false };

        // ============ الإدخال ============
        function pushInput() {
          let sx = input.jx;
          let sy = input.jy;
          let mag = input.jmag;
          const k = input.keys;
          const kx = (k.ArrowRight ? 1 : 0) - (k.ArrowLeft ? 1 : 0);
          const ky = (k.ArrowDown ? 1 : 0) - (k.ArrowUp ? 1 : 0);
          if (kx || ky) {
            const l = Math.hypot(kx, ky);
            sx = kx / l;
            sy = ky / l;
            mag = 1;
          }
          const d = mag > 0 ? R.dirFromScreen(sx, sy) : [0, 0];
          const l = Math.hypot(d[0], d[1]) || 1;
          FC.Full.setInput(fm, d[0] / l, d[1] / l, mag, input.sprint || input.sprintKey);
        }
        function press(b, down) {
          if (paused) return;
          const L2 = labels(fm);
          if (b === 'sprint') {
            input.sprint = down;
            return;
          }
          if (!L2) return;
          if (b === 'shoot') {
            if (down) {
              FC.Full.act(fm, 'shootStart');
              charging = fm.ball.owner === fm.user || (fm.dead && fm.dead.taker === fm.user);
            } else {
              FC.Full.act(fm, 'shootEnd');
              charging = false;
            }
            return;
          }
          if (!down) return;
          if (b === 'lob' && L2.lob === 'ضغط') FC.Full.act(fm, 'tackle');
          else FC.Full.act(fm, b);
        }
        let charging = false;

        // أزرار اللمس (مع دعم الضغط المتعدد)
        Object.keys(btns).forEach((k) => {
          const b = btns[k];
          b.addEventListener('pointerdown', (ev) => {
            ev.preventDefault();
            b.setPointerCapture && b.setPointerCapture(ev.pointerId);
            b.classList.add('on');
            press(k, true);
          });
          const up = (ev) => {
            if (!b.classList.contains('on')) return;
            b.classList.remove('on');
            press(k, false);
          };
          b.addEventListener('pointerup', up);
          b.addEventListener('pointercancel', up);
          b.addEventListener('lostpointercapture', up);
        });

        // عصا التحكم العائمة
        const zone = $('.fm-joyzone');
        let joyId = null;
        let jox = 0;
        let joy0 = 0;
        const JR = 52;
        zone.addEventListener('pointerdown', (ev) => {
          if (joyId !== null) return;
          ev.preventDefault();
          joyId = ev.pointerId;
          zone.setPointerCapture && zone.setPointerCapture(ev.pointerId);
          const r = el.getBoundingClientRect();
          jox = ev.clientX - r.left;
          joy0 = ev.clientY - r.top;
          joy.style.left = jox + 'px';
          joy.style.top = joy0 + 'px';
          joy.classList.remove('hidden');
          jk.style.transform = 'translate(-50%,-50%)';
        });
        zone.addEventListener('pointermove', (ev) => {
          if (ev.pointerId !== joyId) return;
          const r = el.getBoundingClientRect();
          let dx = ev.clientX - r.left - jox;
          let dy = ev.clientY - r.top - joy0;
          const l = Math.hypot(dx, dy);
          if (l > JR) {
            dx = (dx / l) * JR;
            dy = (dy / l) * JR;
          }
          jk.style.transform = 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px))';
          const mag = Math.min(1, l / JR);
          input.jmag = mag < 0.15 ? 0 : mag;
          input.jx = l ? dx / Math.min(l, JR) : 0;
          input.jy = l ? dy / Math.min(l, JR) : 0;
        });
        const joyEnd = (ev) => {
          if (ev.pointerId !== joyId) return;
          joyId = null;
          input.jmag = 0;
          joy.classList.add('hidden');
        };
        zone.addEventListener('pointerup', joyEnd);
        zone.addEventListener('pointercancel', joyEnd);

        // الكيبورد
        const KEYB = { KeyS: 'pass', KeyD: 'shoot', Space: 'shoot', KeyW: 'through', KeyA: 'lob', KeyX: 'pass', KeyZ: 'lob' };
        function onKey(ev, down) {
          if (!alive) return;
          const c = ev.code;
          if (c.startsWith('Arrow')) {
            input.keys[c] = down;
            ev.preventDefault();
            return;
          }
          if (c === 'ShiftLeft' || c === 'ShiftRight' || c === 'KeyE') {
            input.sprintKey = down;
            return;
          }
          if (down && (c === 'Escape' || c === 'KeyP')) {
            ev.preventDefault();
            if (!ov.classList.contains('hidden') && ov.dataset.kind === 'pause') resume();
            else if (!paused) pauseMenu();
            return;
          }
          if (down && c === 'KeyC') return switchCam();
          const b = KEYB[c];
          if (!b) return;
          ev.preventDefault();
          if (down && ev.repeat) return;
          if (!down && b !== 'shoot') return;
          press(b, down);
        }
        const kd = (ev) => onKey(ev, true);
        const ku = (ev) => onKey(ev, false);
        G.addEventListener('keydown', kd);
        G.addEventListener('keyup', ku);

        const onResize = () => R.resize();
        G.addEventListener('resize', onResize);
        const onVis = () => {
          if (document.hidden && !paused) pauseMenu();
        };
        document.addEventListener('visibilitychange', onVis);

        el.addEventListener('click', (ev) => {
          const t = ev.target.closest('[data-a]');
          if (!t) return;
          if (FC.Sound) FC.Sound.click();
          const a = t.dataset.a;
          if (a === 'pause') pauseMenu();
          if (a === 'cam') switchCam();
          if (a === 'resume') resume();
          if (a === 'start') resume();
          if (a === 'camSet') {
            R.setMode(t.dataset.v);
            R.snap = true;
            savePref({ cam: t.dataset.v });
            ov.querySelectorAll('[data-a=camSet]').forEach((b) => b.classList.toggle('on', b === t));
          }
          if (a === 'auto') {
            FC.Full.setAuto(fm, !fm.auto);
            pauseMenu();
          }
          if (a === 'assist') {
            fm.assist = !fm.assist;
            savePref({ assist: fm.assist });
            pauseMenu();
          }
          if (a === 'help') showHelp();
          if (a === 'sim') simRest();
          if (a === 'watch') {
            // متابعة كمشاهد
            resume();
          }
          if (a === 'ft') finish('ft');
          if (a === 'h2') resume();
        });

        function savePref(p) {
          const s = FC.Save.loadSettings();
          Object.assign(s, p);
          FC.Save.saveSettings(s);
        }
        function switchCam() {
          const md = R.nextMode();
          savePref({ cam: md });
          flashTick({ tv: 'الكاميرا التلفزيونية', pro: 'كاميرا خلف اللاعب', wide: 'الكاميرا الواسعة' }[md]);
        }

        // ============ النوافذ ============
        function overlay(kind, html) {
          paused = true;
          ov.dataset.kind = kind;
          ov.innerHTML = '<div class="fm-card">' + html + '</div>';
          ov.classList.remove('hidden');
          if (FC.Sound) FC.Sound.ambient(0.25);
        }
        function resume() {
          ov.classList.add('hidden');
          paused = false;
          last = performance.now();
          if (FC.Sound) FC.Sound.ambient(1);
        }
        function statsHtml() {
          const tot = T0.st.poss + T1.st.poss || 1;
          const p0 = Math.round((100 * T0.st.poss) / tot);
          return (
            '<div class="fm-stats">' +
            statRow(p0 + '%', 'الاستحواذ', 100 - p0 + '%') +
            statRow(T0.st.sh + ' (' + T0.st.sot + ')', 'التسديدات (على المرمى)', T1.st.sh + ' (' + T1.st.sot + ')') +
            statRow(T0.st.pas, 'التمريرات', T1.st.pas) +
            statRow(T0.st.corners, 'الركنيات', T1.st.corners) +
            statRow(T0.st.fouls, 'الأخطاء', T1.st.fouls) +
            statRow(T0.st.off, 'التسلل', T1.st.off) +
            '</div>'
          );
        }
        function scoreHtml() {
          return '<div class="fm-big"><span>' + esc(T0.club.short) + '</span><b dir="rtl">' + T0.score + ' - ' + T1.score + '</b><span>' + esc(T1.club.short) + '</span></div>';
        }
        function myHtml() {
          const u = fm.user;
          if (!u) return '';
          const s = u.st;
          return '<p class="fm-mine">تقييمك الآن: <b>' + FC.Full.liveRating(fm, u).toFixed(1) + '</b> · أهداف ' + s.g + ' · صناعة ' + s.a + ' · تسديدات ' + s.sh + ' · تمريرات ' + s.pasOk + '/' + s.pas + '</p>';
        }
        function camChips() {
          return '<div class="fm-seg">' + [['tv', 'تلفزيونية'], ['pro', 'خلف اللاعب'], ['wide', 'واسعة']].map((c) => '<button class="' + (R.mode === c[0] ? 'on' : '') + '" data-a="camSet" data-v="' + c[0] + '">' + c[1] + '</button>').join('') + '</div>';
        }
        function pauseMenu() {
          overlay(
            'pause',
            '<h3>إيقاف مؤقت</h3>' + scoreHtml() + myHtml() +
              '<div class="fm-row"><span>الكاميرا</span>' + camChips() + '</div>' +
              '<div class="fm-acts">' +
              '<button class="btn gold" data-a="resume">استئناف</button>' +
              '<button class="btn" data-a="assist">التمركز التلقائي: ' + (fm.assist ? 'مفعّل' : 'متوقف') + '</button>' +
              (fm.user && !fm.user.off ? '<button class="btn" data-a="auto">لاعبك تلقائي: ' + (fm.auto ? 'مفعّل' : 'متوقف') + '</button>' : '') +
              '<button class="btn ghost" data-a="help">طريقة اللعب</button>' +
              '<button class="btn ghost" data-a="sim">محاكاة بقية المباراة</button>' +
              '</div>' + statsHtml()
          );
        }
        function helpHtml() {
          return (
            '<div class="fm-help">' +
            (touch
              ? '<p><b>الحركة:</b> اسحب بإصبعك في أي مكان على يسار الشاشة (عصا تحكم).</p>' +
                '<p><b>مع الكرة:</b> تمرير · بينية · عالية/عرضية · <b>تسديد</b> (اضغط مطولاً للقوة، ووجّه بالعصا نحو الزاوية) · اضغط «ركض» مع الحركة للسرعة.</p>'
              : '<p><b>الحركة:</b> الأسهم · <b>Shift</b> ركض.</p>' +
                '<p><b>مع الكرة:</b> <b>S</b> تمرير · <b>W</b> بينية · <b>A</b> عالية/عرضية · <b>D</b> أو المسافة تسديد (اضغط مطولاً للقوة، ووجّه بالأسهم).</p>') +
            '<p><b>بدون الكرة:</b> «اطلب الكرة» ليمرر لك زميلك · «افتكاك» ينقض على حامل الكرة · «انزلاق» تدخل قوي (احذر البطاقات).</p>' +
            '<p><b>الحارس:</b> «ارتماء» نحو اتجاه العصا · «خروج» نحو الكرة. في الجزاء: اختر الاتجاه ثم اضغط.</p>' +
            '<p class="muted small">إذا تركت التحكم لحظات يتمركز لاعبك تلقائياً. ' + (touch ? '' : 'C تغيير الكاميرا · Esc إيقاف مؤقت.') + '</p>' +
            '</div>'
          );
        }
        function showHelp() {
          overlay('pause', '<h3>طريقة اللعب</h3>' + helpHtml() + '<div class="fm-acts"><button class="btn gold" data-a="resume">متابعة</button></div>');
        }
        function simRest() {
          alive = false;
          cleanup();
          FC.Full.writeBack(fm, false);
          resolve({ how: 'sim', fm });
        }
        function finish(how) {
          alive = false;
          cleanup();
          FC.Full.writeBack(fm, true);
          resolve({ how, fm });
        }
        function cleanup() {
          G.removeEventListener('keydown', kd);
          G.removeEventListener('keyup', ku);
          G.removeEventListener('resize', onResize);
          document.removeEventListener('visibilitychange', onVis);
          if (FC.Sound) FC.Sound.ambient(0);
          el.remove();
        }
        function flashTick(txt, cls) {
          tick.textContent = txt;
          tick.className = 'fm-tick show' + (cls ? ' ' + cls : '');
          tickUntil = performance.now() + 3600;
        }

        // ============ متابعة أحداث المحرك ============
        function events() {
          // التعليق
          while (feedSeen < fm.feed.length) {
            const f = fm.feed[feedSeen++];
            if (!f.txt) continue;
            if (f.t === 'goal') {
              if (FC.Sound) FC.Sound.goal(f.si === mySi ? 1 : 0.55);
              if (f.si === mySi && FC.UI && FC.UI.confetti) FC.UI.confetti(f.pid === 0 ? 150 : 60);
              fm.all.forEach((e) => {
                if (e.si === f.si && !e.off) e.celebrate = fm.t + 2.4;
              });
            }
            if (f.t === 'card' && FC.Sound) FC.Sound.whistle(1);
            flashTick(f.txt, f.t === 'goal' ? 'goal' : f.t === 'card' ? 'card' : f.pid === 0 ? 'mine' : '');
          }
          if (fm.feed.length < feedSeen) feedSeen = fm.feed.length;
          // أصوات الركل والتصدي
          fm.fx.forEach((f) => {
            if (!FC.Sound) return;
            if (f.t === 'kick') FC.Sound.kick(f.kind === 'shot' ? 1 : 0.45);
            if (f.t === 'save') FC.Sound.ooh();
            if (f.t === 'foul') FC.Sound.whistle(1);
            if (f.t === 'goal') FC.Sound.net();
          });
          R.fx(fm);
          fm.fx.length = 0;
          // لافتة كبيرة
          if (fm.banner && fm.t < fm.banner.until) {
            if (banner.dataset.txt !== fm.banner.txt) {
              banner.dataset.txt = fm.banner.txt;
              banner.textContent = fm.banner.txt;
              banner.className = 'fm-banner show' + (fm.banner.goal ? (fm.banner.si === mySi ? ' good' : ' bad') : '');
            }
          } else if (banner.classList.contains('show')) {
            banner.className = 'fm-banner';
            banner.dataset.txt = '';
          }
          // نهاية الشوط الأول
          if (fm.half !== lastHalf) {
            lastHalf = fm.half;
            if (FC.Sound) FC.Sound.whistle(2);
            overlay('ht', '<h3>نهاية الشوط الأول</h3>' + scoreHtml() + myHtml() + statsHtml() + '<div class="fm-acts"><button class="btn gold" data-a="h2">ابدأ الشوط الثاني</button><button class="btn ghost" data-a="sim">محاكاة بقية المباراة</button></div>');
            return;
          }
          // خروجك من الملعب
          if (fm.userOff && !offShown) {
            offShown = true;
            const k = fm.userOff;
            const inj = state.user.inj;
            const title = k === 'red' ? 'طُردت من المباراة! 🟥' : k === 'inj' ? 'أصبت! 🚑' : 'المدرب قرر استبدالك';
            const note = k === 'red' ? 'ستغيب عن المباراة القادمة على الأقل. فريقك يكمل بعشرة لاعبين.' : k === 'inj' ? 'التشخيص الأولي: ' + (inj ? inj.name + ' — غياب متوقع ' + FC.Status.durationText(inj.days) : 'إصابة') + '.' : 'أحسنت المجهود، زميلك يكمل مكانك.';
            overlay('off', '<h3>' + title + '</h3>' + scoreHtml() + myHtml() + '<p class="muted">' + esc(note) + '</p><div class="fm-acts"><button class="btn gold" data-a="watch">شاهد بقية المباراة</button><button class="btn ghost" data-a="sim">محاكاة البقية</button></div>');
            return;
          }
          // نهاية المباراة
          if (fm.over && ov.dataset.kind !== 'ft') {
            if (FC.Sound) FC.Sound.whistle(3);
            // تعادل في مباراة إقصائية: تستمر إلى الأشواط الإضافية
            const ag = m.agg || [0, 0];
            const extra = m.ko && T0.score + ag[0] === T1.score + ag[1];
            overlay('ft', '<h3>' + (extra ? 'التعادل بعد 90 دقيقة!' : 'نهاية المباراة') + '</h3>' + scoreHtml() + myHtml() + (extra ? '<p class="muted">مباراة خروج المغلوب: أشواط إضافية (30 دقيقة) ثم ركلات ترجيح إن استمر التعادل.</p>' : statsHtml()) + '<div class="fm-acts"><button class="btn gold" data-a="ft">' + (extra ? 'إلى الأشواط الإضافية' : 'ملخص المباراة') + '</button></div>');
          }
        }

        function hud() {
          s0.textContent = T0.score;
          s1.textContent = T1.score;
          const sc = T0.score + '-' + T1.score;
          if (sc !== lastScore) {
            lastScore = sc;
            const b = $('.fm-sc');
            b.classList.remove('pop');
            void b.offsetWidth;
            b.classList.add('pop');
          }
          clk.textContent = FC.Full.clock(fm) + "'";
          const u = fm.user;
          if (u && !u.off) {
            me.innerHTML = '<b>' + esc(u.name) + '</b><span class="fm-rt">' + FC.Full.liveRating(fm, u).toFixed(1) + '</span><i class="fm-sta"><i style="width:' + Math.round(u.sta * 100) + '%"></i></i>' + (fm.auto ? '<em>تلقائي</em>' : '');
          } else {
            const mu = m.user;
            me.innerHTML = mu && mu.state === 'bench' ? '<b>أنت على الدكة</b>' : u && u.off ? '<b>خارج الملعب</b>' : '<b>تشاهد من المدرجات</b>';
          }
          if (performance.now() > tickUntil && tick.classList.contains('show')) tick.className = 'fm-tick';
          // تسميات الأزرار
          const L2 = labels(fm);
          const key = L2 ? L2.shoot + L2.pass + L2.through + L2.lob : 'none';
          if (key !== lastLabels) {
            lastLabels = key;
            el.classList.toggle('noctl', !L2 || fm.auto);
            if (L2) ['shoot', 'pass', 'through', 'lob'].forEach((k) => (btns[k].querySelector('span').textContent = L2[k]));
          }
          el.classList.toggle('noctl', !L2 || fm.auto);
          // مؤشر قوة التسديد
          if (fm.charge && charging) {
            const k = U.clamp((fm.t - fm.charge.t0) / 0.9, 0, 1);
            pw.parentNode.classList.add('show');
            pw.style.width = Math.round(k * 100) + '%';
          } else pw.parentNode.classList.remove('show');
        }

        function frame(now) {
          if (!alive) return;
          const dt = Math.min(0.1, (now - last) / 1000);
          last = now;
          if (!paused) {
            pushInput();
            acc += dt;
            let n = 0;
            while (acc >= STEP && n++ < 8) {
              FC.Full.step(fm, STEP);
              acc -= STEP;
            }
            if (acc > STEP) acc = 0;
          }
          events();
          R.draw(fm, paused ? 0.016 : dt);
          hud();
          requestAnimationFrame(frame);
        }

        // شاشة البداية
        const mu = m.user;
        const status = !mu || !mu.x ? 'out' : mu.state;
        overlay(
          'start',
          '<h3>' + esc(T0.club.name) + ' × ' + esc(T1.club.name) + '</h3>' +
            '<p class="muted">مدة المباراة ' + (opts.length || FC.BAL.full.defaultLength) + ' دقيقة حقيقية · ' + (status === 'on' ? 'أنت أساسي — تتحكم بلاعبك طوال المباراة' : status === 'bench' ? 'أنت على الدكة — قد يُدخلك المدرب في الشوط الثاني' : 'لست في القائمة — تشاهد من المدرجات') + '</p>' +
            helpHtml() +
            '<div class="fm-row"><span>الكاميرا</span>' + camChips() + '</div>' +
            '<div class="fm-acts"><button class="btn gold big" data-a="start">صافرة البداية</button>' + (status !== 'on' ? '<button class="btn ghost" data-a="sim">محاكاة المباراة</button>' : '') + '</div>'
        );
        ov.addEventListener('click', (ev) => {
          const t = ev.target.closest('[data-a=start]');
          if (t && FC.Sound) FC.Sound.whistle(1);
        });
        requestAnimationFrame(frame);
      });
    },
  };
})(globalThis);
