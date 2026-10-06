/* =========================================================
   ألعاب التدريب المصغّرة الباقية (القسم 8) — كل لعبة 40 ثانية تقريباً
   - تمرير: مرّر لزملاء يتحركون عبر البوابة المضيئة وتجنب المدافعين
   - مراوغة: قُد لاعبك بين الأقماع والمدافعين حتى خط النهاية
   - سرعة ولياقة: توقيت وإيقاع (اضغط عندما يدخل المؤشر المنطقة الخضراء)
   - دفاع: تمركز أمام المهاجم واضغط «افتكاك» في اللحظة المناسبة
   - رأسيات: اقفز في التوقيت الصحيح للعرضيات ووجّه الرأسية
   - حراسة: ارتمِ نحو مكان التسديدة قبل وصولها
   - كرات ثابتة: ركلات حرة فوق الجدار بانحناء، وركلات جزاء
   منطقة النجاح أوسع كلما ارتفعت سماتك، والنتيجة تحدد مضاعف التطور ×0.6 → ×1.6
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC = G.FC || {};
  const U = FC.util;
  const hyp = Math.hypot;

  // مهارة اللاعب لمجموعة سمات (0..1 تقريباً حول 50→0، 90→1)
  function skillOf(user, keys, w) {
    let s = 0;
    let t = 0;
    keys.forEach((k, i) => {
      const ww = w ? w[i] : 1;
      s += user.attrs[k] * ww;
      t += ww;
    });
    return U.clamp((s / t - 40) / 50, 0, 1.2);
  }

  // ================= الإطار المشترك =================
  // def: {title, hint, intro, good, init(api), update(dt, api), draw(ctx, api), down(p, api), move(p, api), up(p, api), btns:[[k,label]], btn(k, api), summary(api)}
  function run(def, user) {
    return new Promise((resolve) => {
      const BT = FC.BAL.train;
      const root = document.getElementById('overlay');
      const el = document.createElement('div');
      el.className = 'moment training';
      const dur = def.duration || BT.duration;
      el.innerHTML =
        '<div class="m-top"><div class="m-clock t-time" dir="ltr">' + dur + '</div>' +
        '<div class="m-head"><div class="m-title">' + U.esc(def.title) + '</div><div class="m-msg">' + U.esc(def.hint) + '</div></div>' +
        '<div class="m-score"><span>النقاط</span><b class="t-score" dir="ltr">0</b></div></div>' +
        '<div class="m-stage"><canvas></canvas>' +
        '<div class="m-intro"><div class="m-intro-t">' + U.esc(def.title) + '</div><div class="m-intro-m">' + def.intro + '</div><div class="m-intro-h">اضغط للبدء</div></div>' +
        '<div class="m-banner"></div><div class="t-end"></div></div>' +
        '<div class="m-bar"><div class="m-timer"><i></i></div><div class="m-btns">' +
        (def.btns || []).map((b) => '<button class="chip gold-chip" data-b="' + b[0] + '">' + b[1] + '</button>').join('') +
        '<button class="chip" data-k="stop">إنهاء مبكراً</button></div>' +
        '<div class="m-hint">' + U.esc(def.foot || 'كلما ارتفعت سماتك اتسعت منطقة النجاح') + '</div></div>';
      root.appendChild(el);
      root.classList.add('show');
      const canvas = el.querySelector('canvas');
      let view = FC.Draw.setup(canvas);
      const tEl = el.querySelector('.t-time');
      const sEl = el.querySelector('.t-score');
      const banner = el.querySelector('.m-banner');
      const timerBar = el.querySelector('.m-timer i');
      const intro = el.querySelector('.m-intro');
      const endBox = el.querySelector('.t-end');
      let raf = 0;
      let last = performance.now();
      const api = {
        rng: new FC.RNG((Date.now() & 0xffffffff) >>> 0),
        user,
        score: 0,
        time: 0,
        started: false,
        over: false,
        stats: { tries: 0, ok: 0, best: 0 },
        get w() {
          return view.w;
        },
        get h() {
          return view.h;
        },
        add(n, txt, cls) {
          api.score = Math.max(0, api.score + n);
          sEl.textContent = api.score;
          if (txt) api.flash(txt, cls);
        },
        flash(txt, cls) {
          banner.innerHTML = '<div class="b-t">' + txt + '</div>';
          banner.className = 'm-banner show small ' + (cls || '');
          clearTimeout(api._ft);
          api._ft = setTimeout(() => banner.classList.remove('show'), 650);
        },
        sound(k, v) {
          if (FC.Sound && FC.Sound[k]) FC.Sound[k](v);
        },
        finish,
      };
      function start() {
        if (api.started) return;
        api.started = true;
        intro.classList.add('hide');
      }
      function pxy(ev) {
        const r = canvas.getBoundingClientRect();
        return { x: ev.clientX - r.left, y: ev.clientY - r.top };
      }
      canvas.addEventListener('pointerdown', (ev) => {
        ev.preventDefault();
        if (!api.started) return start();
        if (api.over) return;
        try {
          canvas.setPointerCapture(ev.pointerId);
        } catch (e) {
          /* تجاهل */
        }
        if (def.down) def.down(pxy(ev), api);
      });
      canvas.addEventListener('pointermove', (ev) => {
        if (api.started && !api.over && def.move) def.move(pxy(ev), api, ev.buttons > 0 || ev.pointerType === 'touch');
      });
      canvas.addEventListener('pointerup', (ev) => {
        if (api.started && !api.over && def.up) def.up(pxy(ev), api);
      });
      intro.addEventListener('pointerdown', start);
      el.querySelectorAll('[data-b]').forEach((b) =>
        b.addEventListener('pointerdown', (ev) => {
          ev.preventDefault();
          if (!api.started) return start();
          if (!api.over && def.btn) def.btn(b.dataset.b, api);
        })
      );
      el.querySelector('[data-k=stop]').addEventListener('click', () => finish());
      const onKey = (ev) => {
        if (!api.started) {
          if (ev.code === 'Space' || ev.code === 'Enter') start();
          return;
        }
        if (api.over || !def.key) return;
        if (def.key(ev.code, api)) ev.preventDefault();
      };
      G.addEventListener('keydown', onKey);
      const onResize = () => (view = FC.Draw.setup(canvas));
      G.addEventListener('resize', onResize);
      if (def.init) def.init(api);

      function finish() {
        if (api.over) return;
        api.over = true;
        const good = def.good || BT.goodScore;
        const mult = FC.Training.multFromScore((api.score / good) * BT.goodScore);
        const stars = api.score >= good ? 3 : api.score >= good * 0.6 ? 2 : api.score >= good * 0.3 ? 1 : 0;
        const sum = def.summary ? def.summary(api) : [['المحاولات / الناجحة', api.stats.tries + ' / ' + api.stats.ok]];
        endBox.innerHTML =
          '<div class="t-card"><div class="t-h">انتهى التدريب</div>' +
          '<div class="t-stars">' + '★'.repeat(stars) + '<span>' + '★'.repeat(3 - stars) + '</span></div>' +
          '<div class="t-row"><span>النقاط</span><b dir="ltr">' + api.score + '</b></div>' +
          sum.map((r) => '<div class="t-row"><span>' + r[0] + '</span><b dir="ltr">' + r[1] + '</b></div>').join('') +
          '<div class="t-mult">مضاعف تطور ' + U.esc(def.group) + ' هذا الأسبوع <b dir="ltr">×' + mult.toFixed(1) + '</b></div>' +
          '<button class="btn gold t-ok">متابعة</button></div>';
        endBox.classList.add('show');
        endBox.querySelector('.t-ok').addEventListener('click', () => {
          cancelAnimationFrame(raf);
          G.removeEventListener('resize', onResize);
          G.removeEventListener('keydown', onKey);
          el.classList.add('out');
          setTimeout(() => {
            el.remove();
            if (!root.children.length) root.classList.remove('show');
            resolve({ score: api.score, mult });
          }, 250);
        });
      }
      function frame(now) {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (api.started && !api.over) {
          api.time += dt;
          if (def.update) def.update(dt, api);
          const left = Math.max(0, dur - api.time);
          tEl.textContent = Math.ceil(left);
          timerBar.style.width = (100 * left) / dur + '%';
          if (left <= 0 && !(def.busy && def.busy(api))) finish();
        }
        const ctx = view.ctx;
        ctx.clearRect(0, 0, view.w, view.h);
        def.draw(ctx, api, dt);
        raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);
    });
  }

  // ================= أدوات رسم =================
  function grass(ctx, w, h) {
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = i % 2 ? '#10653f' : '#0e5a3a';
      ctx.fillRect(0, (i * h) / 12, w, h / 12 + 1);
    }
    const g = ctx.createRadialGradient(w / 2, h * 0.4, 10, w / 2, h * 0.4, Math.max(w, h));
    g.addColorStop(0, 'rgba(255,255,230,0.06)');
    g.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  function dot(ctx, x, y, r, col, stroke) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  // لاعب من الأعلى: ظل + جسم + رقم
  function man(ctx, x, y, r, col, num, me) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(x + r * 0.25, y + r * 0.35, r, r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    if (me) {
      ctx.strokeStyle = 'rgba(242,214,117,0.85)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, r + 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, FC.Draw.lighten(col, 0.35));
    g.addColorStop(1, col);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    if (num != null) {
      ctx.fillStyle = '#fff';
      ctx.font = '700 ' + Math.round(r * 1.0) + 'px Tajawal, Tahoma, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(num), x, y + 1);
    }
  }
  function ball(ctx, x, y, r, lift) {
    lift = lift || 0;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(x + lift * 0.3, y + r * 0.6, r, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    const g = ctx.createRadialGradient(x - r * 0.3, y - lift - r * 0.3, r * 0.1, x, y - lift, r);
    g.addColorStop(0, '#fff');
    g.addColorStop(1, '#c9ced2');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y - lift, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1b1b1b';
    ctx.beginPath();
    ctx.arc(x + r * 0.1, y - lift, r * 0.32, 0, Math.PI * 2);
    ctx.fill();
  }
  function cone(ctx, x, y, s) {
    ctx.fillStyle = '#ff8f3d';
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.lineTo(x - s * 0.6, y + s * 0.5);
    ctx.lineTo(x + s * 0.6, y + s * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(x - s * 0.35, y - s * 0.2, s * 0.7, s * 0.18);
  }
  // لاعب من الأمام (للجدار والحارس): القدمان عند y، m = بكسل لكل متر
  function frontMan(ctx, x, y, m, shirt, arms) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(x, y, 0.35 * m, 0.08 * m, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1b1b1b';
    ctx.fillRect(x - 0.22 * m, y - 0.72 * m, 0.18 * m, 0.72 * m);
    ctx.fillRect(x + 0.04 * m, y - 0.72 * m, 0.18 * m, 0.72 * m);
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(x - 0.25 * m, y - 0.95 * m, 0.5 * m, 0.26 * m);
    ctx.fillStyle = shirt;
    ctx.fillRect(x - 0.27 * m, y - 1.48 * m, 0.54 * m, 0.56 * m);
    ctx.strokeStyle = shirt;
    ctx.lineWidth = Math.max(3, 0.11 * m);
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (arms === 'up') {
      ctx.moveTo(x - 0.25 * m, y - 1.4 * m);
      ctx.lineTo(x - 0.6 * m, y - 1.85 * m);
      ctx.moveTo(x + 0.25 * m, y - 1.4 * m);
      ctx.lineTo(x + 0.6 * m, y - 1.85 * m);
    } else {
      // الجدار: الأيدي أمام الجسم
      ctx.moveTo(x - 0.24 * m, y - 1.4 * m);
      ctx.lineTo(x - 0.05 * m, y - 0.95 * m);
      ctx.moveTo(x + 0.24 * m, y - 1.4 * m);
      ctx.lineTo(x + 0.05 * m, y - 0.95 * m);
    }
    ctx.stroke();
    dot(ctx, x, y - 1.64 * m, 0.15 * m, '#e0ac7e');
  }
  function text(ctx, t, x, y, size, col) {
    ctx.fillStyle = col || '#f5f0e1';
    ctx.font = '700 ' + size + 'px Tajawal, Tahoma, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t, x, y);
  }

  // ================= 1) التمرير =================
  function passGame(user) {
    const sk = skillOf(user, ['spas', 'vis', 'lpas'], [0.5, 0.3, 0.2]);
    let mates = [];
    let defs = [];
    let gate = null;
    let ballO = null; // الكرة المتحركة
    let me = { x: 0.5, y: 0.86 };
    let wait = 0;
    return {
      group: 'التمرير', title: 'تدريب التمرير', hint: 'اضغط على زميل لتمرر له — عبر البوابة المضيئة = 3 نقاط',
      intro: 'مرّر لزملائك المتحركين بالضغط عليهم.<br>التمريرة التي تعبر <b>البوابة المضيئة</b> = 3 نقاط، والتمريرة الناجحة = نقطة.<br>المدافعون يقطعون التمريرات القريبة منهم!',
      good: 30,
      init(api) {
        const r = api.rng;
        mates = [0, 1, 2].map((i) => ({ x: 0.2 + i * 0.3, y: r.float(0.18, 0.5), vx: r.float(-0.12, 0.12), vy: r.float(-0.06, 0.06), num: [7, 9, 10][i] }));
        defs = [0, 1].map((i) => ({ x: 0.3 + i * 0.4, y: 0.6, vx: (i ? -1 : 1) * 0.1, num: 4 + i }));
        newGate(api);
      },
      update(dt, api) {
        const r = api.rng;
        mates.forEach((m) => {
          m.x += m.vx * dt;
          m.y += m.vy * dt;
          if (m.x < 0.08 || m.x > 0.92) m.vx = -m.vx;
          if (m.y < 0.12 || m.y > 0.52) m.vy = -m.vy;
          if (r.chance(dt * 0.4)) m.vx = r.float(-0.16, 0.16);
        });
        defs.forEach((d) => {
          // المدافع يقترب من خط التمرير الأقرب
          d.x += d.vx * dt * (1.3 - sk * 0.4);
          if (d.x < 0.1 || d.x > 0.9) d.vx = -d.vx;
          d.y = 0.62 + Math.sin(api.time * 1.3 + d.num) * 0.05;
        });
        if (ballO) {
          ballO.t += dt;
          const k = Math.min(1, ballO.t / ballO.T);
          ballO.x = ballO.x0 + (ballO.tx - ballO.x0) * k;
          ballO.y = ballO.y0 + (ballO.ty - ballO.y0) * k;
          // القطع
          for (const d of defs) {
            if (!ballO.cut && hyp((d.x - ballO.x) * api.w, (d.y - ballO.y) * api.h) < 18 + (1 - sk) * 10) {
              ballO.cut = true;
              api.flash('قُطعت!', 'bad');
              api.sound('ooh');
              wait = 0.7;
              ballO = null;
              return;
            }
          }
          if (gate && !ballO.gate) {
            const gx = gate.x * api.w;
            const gy = gate.y * api.h;
            if (Math.abs(ballO.y * api.h - gy) < 8 && Math.abs(ballO.x * api.w - gx) < gate.w * api.w * 0.5) ballO.gate = true;
          }
          if (k >= 1) {
            const m = ballO.m;
            const miss = hyp((m.x - ballO.tx) * api.w, (m.y - ballO.ty) * api.h);
            if (miss < 28 + sk * 16) {
              api.stats.ok++;
              if (ballO.gate) {
                api.add(3, 'عبر البوابة! +3', 'gold');
                newGate(api);
              } else api.add(1, 'تمريرة ناجحة +1', 'ok');
              api.sound('kick', 0.4);
            } else api.flash('تمريرة غير دقيقة', '');
            ballO = null;
            wait = 0.35;
          }
        } else if (wait > 0) wait -= dt;
      },
      busy: () => !!ballO,
      down(p, api) {
        if (ballO || wait > 0) return;
        let best = null;
        let bd = 60;
        mates.forEach((m) => {
          const d = hyp(m.x * api.w - p.x, m.y * api.h - p.y);
          if (d < bd) {
            bd = d;
            best = m;
          }
        });
        if (!best) return;
        const r = api.rng;
        const lead = 0.45;
        const err = (1.15 - sk) * 0.03;
        const tx = best.x + best.vx * lead + r.normal(0, err);
        const ty = best.y + best.vy * lead + r.normal(0, err);
        const dist = hyp((tx - me.x) * api.w, (ty - me.y) * api.h);
        ballO = { x0: me.x, y0: me.y, x: me.x, y: me.y, tx, ty, t: 0, T: Math.max(0.35, dist / (520 + sk * 200)), m: best };
        api.stats.tries++;
        api.sound('kick', 0.5);
      },
      draw(ctx, api) {
        const w = api.w;
        const h = api.h;
        grass(ctx, w, h);
        if (gate) {
          const gx = gate.x * w;
          const gy = gate.y * h;
          const gw = gate.w * w;
          ctx.fillStyle = 'rgba(242,214,117,0.16)';
          ctx.fillRect(gx - gw / 2, gy - 6, gw, 12);
          cone(ctx, gx - gw / 2, gy, 10);
          cone(ctx, gx + gw / 2, gy, 10);
        }
        const R = Math.max(10, Math.min(w, h) * 0.028);
        defs.forEach((d) => man(ctx, d.x * w, d.y * h, R, '#c0392b', d.num));
        mates.forEach((m) => man(ctx, m.x * w, m.y * h, R, '#1f6fd1', m.num));
        man(ctx, me.x * w, me.y * h, R, '#1f6fd1', 8, true);
        if (ballO) ball(ctx, ballO.x * w, ballO.y * h, R * 0.45);
        else ball(ctx, me.x * w, me.y * h - R * 1.2, R * 0.45);
      },
      summary: (api) => [['التمريرات / الناجحة', api.stats.tries + ' / ' + api.stats.ok]],
    };
    function newGate(api) {
      const r = api.rng;
      gate = { x: r.float(0.25, 0.75), y: r.float(0.56, 0.74), w: 0.1 + sk * 0.05 };
    }
  }

  // ================= 2) المراوغة =================
  function dribbleGame(user) {
    const sk = skillOf(user, ['dri', 'agi', 'ctl', 'bal'], [0.4, 0.25, 0.25, 0.1]);
    let P = { x: 0.5, y: 0.9 };
    let tgt = { x: 0.5, y: 0.9 };
    let cones = [];
    let defs = [];
    let gates = [];
    let lost = 0;
    let runs = 0;
    function setup(api) {
      const r = api.rng;
      P = { x: 0.5, y: 0.92 };
      tgt = { x: 0.5, y: 0.92 };
      cones = [];
      for (let i = 0; i < 5; i++) cones.push({ x: 0.3 + (i % 2) * 0.4 + r.float(-0.05, 0.05), y: 0.78 - i * 0.12 });
      defs = [{ x: r.float(0.3, 0.7), y: 0.45, vx: 0.18 }, { x: r.float(0.3, 0.7), y: 0.25, vx: -0.22 }];
      gates = [{ x: r.float(0.25, 0.75), y: 0.55, hit: false }, { x: r.float(0.25, 0.75), y: 0.33, hit: false }];
    }
    return {
      group: 'المراوغة', title: 'تدريب المراوغة', hint: 'اسحب لتقود لاعبك بين الأقماع والمدافعين حتى الخط العلوي',
      intro: 'حرّك إصبعك (أو الأسهم) لتقود لاعبك بالكرة.<br>الوصول إلى <b>الخط العلوي</b> = 5 نقاط، وكل <b>بوابة ذهبية</b> = 2.<br>لمس القمع −1، والمدافع يفتك الكرة!',
      good: 30,
      init: setup,
      update(dt, api) {
        if (lost > 0) {
          lost -= dt;
          if (lost <= 0) setup(api);
          return;
        }
        const k = api.keys || {};
        if (k.left || k.right || k.up || k.down) {
          tgt.x = P.x + ((k.right ? 1 : 0) - (k.left ? 1 : 0)) * 0.2;
          tgt.y = P.y + ((k.down ? 1 : 0) - (k.up ? 1 : 0)) * 0.2;
        }
        const sp = (0.22 + sk * 0.12) * dt;
        const dx = tgt.x - P.x;
        const dy = tgt.y - P.y;
        const d = hyp(dx, dy);
        if (d > 0.005) {
          P.x += (dx / d) * Math.min(sp, d);
          P.y += (dy / d) * Math.min(sp * 1.3, d);
        }
        P.x = U.clamp(P.x, 0.05, 0.95);
        P.y = U.clamp(P.y, 0.04, 0.96);
        const w = api.w;
        const h = api.h;
        const rr = Math.min(w, h) * 0.028;
        const hit = rr * (1.35 - sk * 0.35);
        cones.forEach((c) => {
          if (!c.hitT && hyp((c.x - P.x) * w, (c.y - P.y) * h) < hit) {
            c.hitT = api.time;
            api.add(-1, 'لمست القمع −1', 'bad');
          }
        });
        gates.forEach((g) => {
          if (!g.hit && Math.abs((g.y - P.y) * h) < 10 && Math.abs((g.x - P.x) * w) < w * (0.06 + sk * 0.03)) {
            g.hit = true;
            api.add(2, 'بوابة +2', 'gold');
          }
        });
        defs.forEach((dd) => {
          // المدافع ينجذب نحوك
          dd.x += dd.vx * dt;
          dd.x += (P.x - dd.x) * dt * (0.9 - sk * 0.35);
          if (dd.x < 0.08 || dd.x > 0.92) dd.vx = -dd.vx;
          if (!(dd.cool > api.time) && hyp((dd.x - P.x) * w, (dd.y - P.y) * h) < rr * (2.1 - sk * 0.6)) {
            dd.cool = api.time + 1;
            if (api.rng.chance(0.55 - sk * 0.3)) {
              lost = 0.9;
              api.flash('افتك الكرة!', 'bad');
              api.sound('ooh');
            } else api.flash('تجاوزته!', 'ok');
          }
        });
        if (P.y <= 0.07) {
          runs++;
          api.stats.ok++;
          api.add(5, 'وصلت! +5', 'gold');
          api.sound('goal', 0.4);
          setup(api);
        }
      },
      down(p, api) {
        tgt = { x: p.x / api.w, y: p.y / api.h };
      },
      move(p, api, pressed) {
        if (pressed) tgt = { x: p.x / api.w, y: p.y / api.h };
      },
      key(code, api) {
        api.keys = api.keys || {};
        const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
        if (!map[code]) return false;
        api.keys[map[code]] = true;
        clearTimeout(api._kt);
        api._kt = setTimeout(() => (api.keys = {}), 180);
        return true;
      },
      draw(ctx, api) {
        const w = api.w;
        const h = api.h;
        grass(ctx, w, h);
        ctx.strokeStyle = 'rgba(242,214,117,0.8)';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 8]);
        ctx.beginPath();
        ctx.moveTo(0, 0.06 * h);
        ctx.lineTo(w, 0.06 * h);
        ctx.stroke();
        ctx.setLineDash([]);
        text(ctx, 'خط النهاية', w / 2, 0.03 * h, 13, '#f2d675');
        const R = Math.max(10, Math.min(w, h) * 0.028);
        gates.forEach((g) => {
          if (g.hit) return;
          const gw = w * (0.06 + sk * 0.03);
          ctx.fillStyle = 'rgba(242,214,117,0.22)';
          ctx.fillRect(g.x * w - gw, g.y * h - 5, gw * 2, 10);
          dot(ctx, g.x * w - gw, g.y * h, 5, '#f2d675');
          dot(ctx, g.x * w + gw, g.y * h, 5, '#f2d675');
        });
        cones.forEach((c) => cone(ctx, c.x * w, c.y * h, c.hitT && api.time - c.hitT < 0.5 ? 14 : 11));
        defs.forEach((d) => man(ctx, d.x * w, d.y * h, R, '#c0392b', 5));
        man(ctx, P.x * w, P.y * h, R, '#1f6fd1', 10, true);
        if (lost <= 0) ball(ctx, P.x * w, P.y * h - R * 1.25, R * 0.45);
      },
      summary: () => [['الوصول لخط النهاية', runs]],
    };
  }

  // ================= 3) السرعة واللياقة =================
  function fitnessGame(user) {
    const sk = skillOf(user, ['acc', 'spd', 'sta'], [0.4, 0.35, 0.25]);
    let pos = 0;
    let dir = 1;
    let speed = 0.9;
    let zone = { c: 0.5, w: 0.16 };
    let dist = 0;
    let streak = 0;
    let fb = 0;
    function newZone(api) {
      zone = { c: api.rng.float(0.2, 0.8), w: U.clamp(0.1 + sk * 0.1 - streak * 0.004, 0.07, 0.24) };
    }
    return {
      group: 'السرعة واللياقة', title: 'تدريب السرعة', hint: 'اضغط عندما يدخل المؤشر المنطقة الخضراء',
      intro: 'المؤشر يتحرك ذهاباً وإياباً.<br>اضغط (أو المسافة) عندما يكون داخل <b>المنطقة الخضراء</b> لتنطلق أسرع.<br>الضغط الخاطئ يوقف السلسلة، والسلسلة الطويلة تزيد النقاط.',
      good: 44,
      init: newZone,
      update(dt) {
        pos += dir * speed * dt;
        if (pos > 1) {
          pos = 1;
          dir = -1;
        } else if (pos < 0) {
          pos = 0;
          dir = 1;
        }
        if (fb > 0) fb -= dt;
      },
      down(p, api) {
        this.tap(api);
      },
      key(code, api) {
        if (code !== 'Space' && code !== 'Enter') return false;
        this.tap(api);
        return true;
      },
      tap(api) {
        api.stats.tries++;
        const d = Math.abs(pos - zone.c);
        if (d <= zone.w / 2) {
          streak++;
          api.stats.ok++;
          api.stats.best = Math.max(api.stats.best, streak);
          const perfect = d <= zone.w / 6;
          api.add((perfect ? 2 : 1) + Math.floor(streak / 5), perfect ? 'ممتاز!' : 'جيد', perfect ? 'gold' : 'ok');
          dist += perfect ? 12 : 8;
          speed = Math.min(2.4, speed + 0.05);
          fb = 0.25;
          newZone(api);
        } else {
          streak = 0;
          speed = Math.max(0.9, speed - 0.2);
          api.flash('توقيت خاطئ', 'bad');
        }
      },
      draw(ctx, api) {
        const w = api.w;
        const h = api.h;
        // مضمار
        ctx.fillStyle = '#7a2e22';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 6; i++) {
          ctx.strokeStyle = 'rgba(255,255,255,0.35)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, h * 0.2 + i * h * 0.08);
          ctx.lineTo(w, h * 0.2 + i * h * 0.08);
          ctx.stroke();
        }
        // خطوط المسافة المتحركة
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        for (let i = 0; i < 8; i++) {
          const x = w - ((dist * 6 + i * w * 0.18) % (w * 1.2));
          ctx.beginPath();
          ctx.moveTo(x, h * 0.2);
          ctx.lineTo(x, h * 0.6);
          ctx.stroke();
        }
        // العدّاء
        const rx = w * 0.3;
        const ry = h * 0.44;
        const ph = api.time * (6 + speed * 4);
        ctx.strokeStyle = '#1f6fd1';
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx + Math.sin(ph) * 16, ry + 34);
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - Math.sin(ph) * 16, ry + 34);
        ctx.stroke();
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx + 4, ry - 30);
        ctx.stroke();
        dot(ctx, rx + 6, ry - 42, 9, '#e8b894');
        text(ctx, Math.round(dist) + ' م', w * 0.7, h * 0.12, 20, '#f2d675');
        text(ctx, 'السلسلة ×' + streak, w * 0.3, h * 0.12, 16);
        // شريط التوقيت
        const bx = w * 0.08;
        const bw = w * 0.84;
        const by = h * 0.74;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(bx, by, bw, 26);
        ctx.fillStyle = fb > 0 ? '#7ee2ae' : '#3fbf7f';
        ctx.fillRect(bx + (zone.c - zone.w / 2) * bw, by, zone.w * bw, 26);
        ctx.fillStyle = 'rgba(242,214,117,0.9)';
        ctx.fillRect(bx + (zone.c - zone.w / 6) * bw, by + 8, (zone.w / 3) * bw, 10);
        ctx.fillStyle = '#fff';
        ctx.fillRect(bx + pos * bw - 3, by - 8, 6, 42);
      },
      summary: (api) => [['الضربات / الناجحة', api.stats.tries + ' / ' + api.stats.ok], ['أطول سلسلة', api.stats.best]],
    };
  }

  // ================= 4) الدفاع =================
  function defendGame(user) {
    const sk = skillOf(user, ['tak', 'dawa', 'sld', 'intc'], [0.4, 0.3, 0.15, 0.15]);
    let me = { x: 0.5, y: 0.72 };
    let tx = 0.5;
    let att = null;
    let pause = 0;
    let wins = 0;
    let beaten = 0;
    function spawn(api) {
      const r = api.rng;
      att = { x: r.float(0.25, 0.75), y: 0.05, vx: 0, sp: r.float(0.22, 0.3) + api.time * 0.002, fake: r.float(0.35, 0.55), faked: false };
    }
    function range(api) {
      return Math.min(api.w, api.h) * (0.07 + sk * 0.035);
    }
    return {
      group: 'الدفاع', title: 'تدريب الدفاع', hint: 'تحرّك أمام المهاجم واضغط «افتكاك» عندما يدخل دائرتك',
      intro: 'اسحب يميناً ويساراً لتقف أمام المهاجم.<br>اضغط <b>«افتكاك»</b> (أو المسافة) عندما يدخل <b>الدائرة الذهبية</b> = 2 نقطة.<br>إذا وقفت في طريقه تماماً يصطدم بك = نقطة. التدخل المتأخر من الخلف = خطأ −1.',
      good: 24,
      btns: [['tackle', 'افتكاك']],
      init: spawn,
      update(dt, api) {
        if (pause > 0) {
          pause -= dt;
          if (pause <= 0) spawn(api);
          return;
        }
        me.x += U.clamp(tx - me.x, -1, 1) * Math.min(1, dt * (4 + sk * 3));
        const a = att;
        a.y += a.sp * dt;
        // المراوغة: يغير اتجاهه عندما يقترب
        if (!a.faked && a.y > a.fake) {
          a.faked = true;
          a.vx = (a.x < me.x ? -1 : 1) * api.rng.float(0.15, 0.3) * (api.rng.chance(0.4) ? -1 : 1);
        }
        a.x = U.clamp(a.x + a.vx * dt, 0.08, 0.92);
        const w = api.w;
        const h = api.h;
        const d = hyp((a.x - me.x) * w, (a.y - me.y) * h);
        if (d < Math.min(w, h) * 0.035 && a.y < me.y) {
          wins++;
          api.stats.ok++;
          api.add(1, 'صددته بجسمك +1', 'ok');
          pause = 0.6;
          return;
        }
        if (a.y > 0.95) {
          beaten++;
          api.flash('تجاوزك المهاجم', 'bad');
          pause = 0.6;
        }
      },
      btn(k, api) {
        this.tackle(api);
      },
      key(code, api) {
        if (code === 'Space') {
          this.tackle(api);
          return true;
        }
        if (code === 'ArrowLeft') tx = U.clamp(me.x - 0.12, 0.05, 0.95);
        else if (code === 'ArrowRight') tx = U.clamp(me.x + 0.12, 0.05, 0.95);
        else return false;
        return true;
      },
      tackle(api) {
        if (pause > 0 || !att) return;
        api.stats.tries++;
        const w = api.w;
        const h = api.h;
        const d = hyp((att.x - me.x) * w, (att.y - me.y) * h);
        if (att.y > me.y + 0.02) {
          api.add(-1, 'خطأ من الخلف! −1', 'bad');
          api.sound('whistle', 1);
          pause = 0.7;
          return;
        }
        if (d <= range(api)) {
          wins++;
          api.stats.ok++;
          api.add(2, 'افتكاك نظيف +2', 'gold');
          api.sound('kick', 0.6);
          pause = 0.6;
        } else api.flash(d < range(api) * 1.8 ? 'مبكر قليلاً' : 'بعيد جداً', '');
      },
      down(p, api) {
        tx = U.clamp(p.x / api.w, 0.05, 0.95);
      },
      move(p, api, pressed) {
        if (pressed) tx = U.clamp(p.x / api.w, 0.05, 0.95);
      },
      draw(ctx, api) {
        const w = api.w;
        const h = api.h;
        grass(ctx, w, h);
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 2;
        ctx.strokeRect(w * 0.2, h * 0.9, w * 0.6, h * 0.12);
        const R = Math.max(10, Math.min(w, h) * 0.03);
        ctx.strokeStyle = 'rgba(242,214,117,0.7)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(me.x * w, me.y * h, range(api), 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        man(ctx, me.x * w, me.y * h, R, '#1f6fd1', 4, true);
        if (att && pause <= 0) {
          man(ctx, att.x * w, att.y * h, R, '#c0392b', 9);
          ball(ctx, att.x * w, att.y * h + R * 1.2, R * 0.45);
        }
      },
      summary: () => [['افتكاك وصد / تجاوزك', wins + ' / ' + beaten]],
    };
  }

  // ================= 5) الرأسيات =================
  function headingGame(user) {
    const sk = skillOf(user, ['hea', 'jmp', 'str'], [0.55, 0.3, 0.15]);
    let cross = null;
    let jump = null;
    let pause = 0;
    let goals = 0;
    let aimHigh = true;
    function spawn(api) {
      const r = api.rng;
      const from = r.chance(0.5) ? -1 : 1;
      cross = { t: 0, T: r.float(1.1, 1.5) - sk * 0.1, from, apexT: r.float(0.55, 0.7) };
      aimHigh = r.chance(0.5);
    }
    // موضع الكرة الطبيعي (0..1 من عرض الشاشة، الارتفاع بالمتر)
    function ballAt(k) {
      const x = cross.from < 0 ? -0.05 + k * 0.55 : 1.05 - k * 0.55;
      const z = 0.6 + Math.sin(Math.min(1, k) * Math.PI * 0.95) * 3.1 - Math.max(0, k - 0.75) * 3;
      return { x, z };
    }
    function headZ() {
      if (!jump) return 1.75;
      const k = jump.t / jump.T;
      return 1.75 + Math.sin(Math.min(1, k) * Math.PI) * (0.5 + sk * 0.35);
    }
    return {
      group: 'الرأسيات', title: 'تدريب الرأسيات', hint: 'اقفز (اضغط) في التوقيت الصحيح لتلتقي الكرة برأسك',
      intro: 'العرضيات تأتي من الجانبين.<br>اضغط <b>للقفز</b> بحيث تلتقي الكرة برأسك في أعلى القفزة.<br>الرأسية الدقيقة نحو المرمى = 3 نقاط، ولمس الكرة = نقطة.',
      good: 26,
      init: spawn,
      update(dt, api) {
        if (pause > 0) {
          pause -= dt;
          if (pause <= 0) spawn(api);
          return;
        }
        cross.t += dt;
        if (jump) {
          jump.t += dt;
          if (jump.t > jump.T) jump = null;
        }
        const k = cross.t / cross.T;
        const b = ballAt(k);
        // الالتقاء عند منتصف الشاشة
        if (!cross.done && Math.abs(b.x - 0.5) < 0.035) {
          cross.done = true;
          api.stats.tries++;
          const dz = Math.abs(b.z - headZ() - 0.1);
          const win = 0.28 + sk * 0.22;
          if (jump && dz < win) {
            api.stats.ok++;
            const acc = api.rng.chance(0.45 + sk * 0.4 - dz);
            if (acc) {
              goals++;
              api.add(3, 'رأسية في الشباك! +3', 'gold');
              api.sound('goal', 0.4);
            } else api.add(1, 'لمستها +1', 'ok');
          } else api.flash(jump ? (b.z > headZ() ? 'قفزت مبكراً' : 'تأخرت') : 'لم تقفز', '');
          pause = 0.8;
        }
        if (k > 1.4) {
          pause = 0.3;
        }
      },
      busy: () => cross && !cross.done && pause <= 0,
      down(p, api) {
        this.jumpNow(api);
      },
      key(code, api) {
        if (code !== 'Space') return false;
        this.jumpNow(api);
        return true;
      },
      jumpNow() {
        if (!jump && pause <= 0) jump = { t: 0, T: 0.55 };
      },
      draw(ctx, api) {
        const w = api.w;
        const h = api.h;
        const sky = ctx.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, '#05070d');
        sky.addColorStop(0.62, '#152238');
        sky.addColorStop(0.62, '#0e5a3a');
        sky.addColorStop(1, '#10653f');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h);
        const base = h * 0.8;
        const m = Math.min(h * 0.12, w * 0.1);
        // المرمى في الخلفية
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 3;
        ctx.strokeRect(w * 0.35, h * 0.62 - 1.2 * m, w * 0.3, 1.2 * m);
        // اللاعب
        const hz = headZ();
        const px = w * 0.5;
        const py = base - (hz - 1.75) * m;
        ctx.strokeStyle = '#1f6fd1';
        ctx.lineCap = 'round';
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px, py - 0.75 * m);
        ctx.stroke();
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px - 10, py + 0.8 * m);
        ctx.moveTo(px, py);
        ctx.lineTo(px + 10, py + 0.8 * m);
        ctx.stroke();
        dot(ctx, px, py - 0.95 * m, 0.17 * m, '#e8b894', '#f2d675');
        // الكرة
        if (cross && pause <= 0) {
          const b = ballAt(cross.t / cross.T);
          ball(ctx, b.x * w, base + 0.8 * m, Math.max(5, 0.12 * m), (b.z + 0.1) * m);
          // مؤشر نقطة الالتقاء
          ctx.strokeStyle = 'rgba(242,214,117,0.4)';
          ctx.setLineDash([4, 6]);
          ctx.beginPath();
          ctx.moveTo(px, 0);
          ctx.lineTo(px, base);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        text(ctx, 'الأهداف ' + goals, w * 0.5, h * 0.08, 16, '#f2d675');
      },
      summary: (api) => [['العرضيات / اللمسات / الأهداف', api.stats.tries + ' / ' + api.stats.ok + ' / ' + goals]],
    };
  }

  // ================= 6) الحراسة =================
  function keeperGame(user) {
    const sk = skillOf(user, ['gdiv', 'gref', 'ghan', 'gpos'], [0.3, 0.35, 0.2, 0.15]);
    const GW = 7.32;
    const GH = 2.44;
    let shot = null;
    let dive = null;
    let pause = 0;
    let saves = 0;
    let conceded = 0;
    function spawn(api) {
      const r = api.rng;
      const x = r.float(-GW / 2 + 0.3, GW / 2 - 0.3);
      const z = r.float(0.15, GH - 0.2);
      shot = { t: 0, T: r.float(0.75, 1.15) + sk * 0.15 - Math.min(0.25, api.time * 0.004), x, z };
      dive = null;
    }
    function geo(api) {
      const w = api.w;
      const h = api.h;
      const m = Math.min((w * 0.9) / GW, h * 0.3);
      return { m, cx: w / 2, base: h * 0.58 };
    }
    return {
      group: 'الحراسة', title: 'تدريب الحراسة', hint: 'اضغط على المكان الذي ستصل إليه الكرة لترتمي نحوه',
      intro: 'التسديدات تأتي نحو مرماك.<br>اضغط على <b>المكان</b> الذي ستصله الكرة قبل وصولها لترتمي.<br>الإمساك = 3 نقاط، الإبعاد = 2. الارتماء المبكر جداً يكشف اتجاهك!',
      good: 36,
      init: spawn,
      update(dt, api) {
        if (pause > 0) {
          pause -= dt;
          if (pause <= 0) spawn(api);
          return;
        }
        shot.t += dt;
        if (shot.t >= shot.T) {
          api.stats.tries++;
          const reach = 0.75 + sk * 0.55;
          const d = dive ? hyp(dive.x - shot.x, (dive.z - shot.z) * 0.8) : hyp(shot.x, shot.z - 1);
          const early = dive && dive.at < shot.T * 0.25;
          if (d < reach * (early ? 0.6 : 1)) {
            saves++;
            api.stats.ok++;
            if (d < reach * 0.45) api.add(3, 'أمسكتها! +3', 'gold');
            else api.add(2, 'أبعدتها +2', 'ok');
            api.sound('ooh');
          } else {
            conceded++;
            api.flash('هدف', 'bad');
            api.sound('net');
          }
          pause = 0.7;
        }
      },
      busy: () => shot && pause <= 0,
      down(p, api) {
        if (!shot || pause > 0 || dive) return;
        const g = geo(api);
        dive = { x: U.clamp((p.x - g.cx) / g.m, -GW / 2 - 0.5, GW / 2 + 0.5), z: U.clamp((g.base - p.y) / g.m, 0, GH + 0.3), at: shot.t };
      },
      draw(ctx, api) {
        const w = api.w;
        const h = api.h;
        const g = geo(api);
        const sky = ctx.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, '#05070d');
        sky.addColorStop(0.58, '#121a2c');
        sky.addColorStop(0.58, '#0b4a30');
        sky.addColorStop(1, '#10653f');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h);
        const x0 = g.cx - (GW / 2) * g.m;
        const x1 = g.cx + (GW / 2) * g.m;
        const y0 = g.base - GH * g.m;
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(x0, y0, x1 - x0, g.base - y0);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = Math.max(4, g.m * 0.12);
        ctx.beginPath();
        ctx.moveTo(x0, g.base);
        ctx.lineTo(x0, y0);
        ctx.lineTo(x1, y0);
        ctx.lineTo(x1, g.base);
        ctx.stroke();
        // الحارس (أنت)
        const kx = dive ? dive.x : 0;
        const kz = dive ? dive.z : 0.9;
        const k = dive && shot ? U.clamp((shot.t - dive.at) / 0.25, 0, 1) : 0;
        const bx = g.cx + kx * k * g.m;
        const by = g.base - (dive ? (kz - 0.9) * k : 0) * g.m;
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(dive ? Math.sign(kx) * k * 1.1 : 0);
        ctx.fillStyle = '#c6ff00';
        ctx.fillRect(-0.28 * g.m, -1.45 * g.m, 0.56 * g.m, 0.75 * g.m);
        ctx.fillStyle = '#1b1b1b';
        ctx.fillRect(-0.26 * g.m, -0.7 * g.m, 0.22 * g.m, 0.7 * g.m);
        ctx.fillRect(0.04 * g.m, -0.7 * g.m, 0.22 * g.m, 0.7 * g.m);
        dot(ctx, 0, -1.62 * g.m, 0.16 * g.m, '#e8b894');
        ctx.restore();
        // الكرة تقترب (تكبر)
        if (shot && pause <= 0) {
          const e = U.clamp(shot.t / shot.T, 0, 1);
          const sx = g.cx + shot.x * g.m * e;
          const sy = h * 0.95 + (g.base - shot.z * g.m - h * 0.95) * e;
          ball(ctx, sx, sy, 5 + (1 - e) * 22);
        }
        text(ctx, 'تصديات ' + saves + ' · أهداف ' + conceded, w / 2, h * 0.08, 15, '#f2d675');
      },
      summary: () => [['التصديات / الأهداف', saves + ' / ' + conceded]],
    };
  }

  // ================= 7) الكرات الثابتة =================
  function setpieceGame(user) {
    const sk = skillOf(user, ['cur', 'pen', 'lng', 'fin'], [0.45, 0.25, 0.2, 0.1]);
    const GW = 7.32;
    const GH = 2.44;
    let aiming = null;
    let flight = null;
    let pause = 0;
    let n = 0;
    let wall = true;
    let targets = [];
    let goals = 0;
    let gkX = 0;
    function geo(api) {
      const w = api.w;
      const h = api.h;
      const m = Math.min((w * 0.86) / GW, h * 0.26);
      return { m, cx: w / 2, base: h * 0.42, spot: { x: w / 2, y: h * 0.86 } };
    }
    function reset(api) {
      const r = api.rng;
      n++;
      wall = n % 3 !== 0; // كل ثالثة ركلة جزاء
      const tr = 0.45 + sk * 0.3;
      targets = [{ x: (r.chance(0.5) ? 1 : -1) * r.float(2.3, GW / 2 - tr), z: r.float(1.2, GH - tr), r: tr }];
      gkX = wall ? r.float(-0.8, 0.8) : 0;
    }
    return {
      group: 'الكرات الثابتة', title: 'تدريب الكرات الثابتة', hint: 'اسحب للخلف ثم أفلت — الانحراف الجانبي يعطي الكرة انحناءً',
      intro: 'ركلات حرة فوق <b>الجدار</b>، وكل ثالثة <b>ركلة جزاء</b>.<br>اسحب من الكرة للخلف: الطول = القوة والارتفاع، والانحراف الجانبي = الانحناء.<br>الهدف المضيء = 3 نقاط، والهدف العادي = نقطة.',
      good: 22,
      init: reset,
      update(dt, api) {
        if (pause > 0) {
          pause -= dt;
          if (pause <= 0) reset(api);
          return;
        }
        if (!flight) return;
        flight.t += dt;
        if (flight.t >= flight.T) {
          const f = flight;
          flight = null;
          pause = 0.8;
          api.stats.tries++;
          if (f.blocked) return api.flash('ارتطمت بالجدار', '');
          const inGoal = Math.abs(f.x) < GW / 2 - 0.08 && f.z > 0 && f.z < GH - 0.05;
          if (!inGoal) return api.flash(f.z >= GH ? 'فوق العارضة' : 'خارج المرمى', '');
          const gkReach = wall ? 1.25 : 0.9;
          const gkPos = wall ? gkX : api.rng.chance(0.45) ? Math.sign(f.x) * 2.2 : -Math.sign(f.x) * 2.2;
          if (Math.abs(f.x - gkPos) < gkReach && api.rng.chance(0.8 - sk * 0.25)) {
            api.sound('ooh');
            return api.flash('تصدّى الحارس', '');
          }
          goals++;
          api.stats.ok++;
          if (hyp(f.x - targets[0].x, f.z - targets[0].z) < targets[0].r) api.add(3, 'في المقص! +3', 'gold');
          else api.add(1, 'هدف +1', 'ok');
          api.sound('net');
        }
      },
      busy: () => !!flight,
      down(p, api) {
        if (flight || pause > 0) return;
        const g = geo(api);
        if (hyp(p.x - g.spot.x, p.y - g.spot.y) < 90) aiming = { x0: p.x, y0: p.y, x: p.x, y: p.y };
      },
      move(p) {
        if (aiming) {
          aiming.x = p.x;
          aiming.y = p.y;
        }
      },
      up(p, api) {
        if (!aiming) return;
        const a = aiming;
        aiming = null;
        const dy = a.y - a.y0;
        const dx = a.x - a.x0;
        const power = U.clamp(dy / 150, 0, 1);
        if (power < 0.1) return;
        const r = api.rng;
        const sig = 0.35 * Math.exp(-1.2 * sk);
        const curve = U.clamp(-dx / 60, -1.2, 1.2) * (0.6 + sk * 0.6);
        const aimX = U.clamp(-dx / 40, -5, 5);
        const x = aimX + curve * 1.4 + r.normal(0, sig);
        const z = 0.3 + power * 2.6 + r.normal(0, sig * 0.8);
        // الجدار: الكرة تعبره في منتصف المسافة
        const midZ = z * 0.55 + power * 0.9;
        const blocked = wall && Math.abs(aimX * 0.5) < 1.6 && midZ < 2.05;
        flight = { t: 0, T: 0.7, x, z, aimX, curve, blocked };
        api.sound('kick', 0.8);
      },
      draw(ctx, api) {
        const w = api.w;
        const h = api.h;
        const g = geo(api);
        const sky = ctx.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, '#05070d');
        sky.addColorStop(0.42, '#121a2c');
        sky.addColorStop(0.42, '#0b4a30');
        sky.addColorStop(1, '#10653f');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h);
        const x0 = g.cx - (GW / 2) * g.m;
        const x1 = g.cx + (GW / 2) * g.m;
        const y0 = g.base - GH * g.m;
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(x0, y0, x1 - x0, g.base - y0);
        targets.forEach((t) => {
          ctx.fillStyle = 'rgba(242,214,117,0.3)';
          ctx.beginPath();
          ctx.arc(g.cx + t.x * g.m, g.base - t.z * g.m, t.r * g.m, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#f2d675';
          ctx.lineWidth = 2;
          ctx.stroke();
        });
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = Math.max(4, g.m * 0.1);
        ctx.beginPath();
        ctx.moveTo(x0, g.base);
        ctx.lineTo(x0, y0);
        ctx.lineTo(x1, y0);
        ctx.lineTo(x1, g.base);
        ctx.stroke();
        // الحارس
        frontMan(ctx, g.cx + gkX * g.m, g.base, g.m * 0.9, '#c6ff00', 'up');
        // الجدار (أقرب إلى الكاميرا فيبدو أكبر)
        if (wall) {
          const wm = g.m * 1.25;
          for (let i = -2; i <= 1; i++) frontMan(ctx, g.cx + (i + 0.5) * 0.62 * wm, h * 0.66, wm, '#c0392b');
        } else text(ctx, 'ركلة جزاء', w / 2, h * 0.62, 18, '#f2d675');
        // الكرة
        if (flight) {
          const k = U.clamp(flight.t / flight.T, 0, 1);
          const fx = flight.aimX * k + (flight.x - flight.aimX) * k * k;
          const tx = g.cx + fx * g.m;
          const tyEnd = flight.blocked ? h * 0.6 : g.base - flight.z * g.m;
          const kk = flight.blocked ? Math.min(1, k * 1.8) : k;
          const x = g.spot.x + (tx - g.spot.x) * kk;
          const y = g.spot.y + (tyEnd - g.spot.y) * kk;
          ball(ctx, x, y, 14 - 8 * kk);
        } else if (pause <= 0) ball(ctx, g.spot.x, g.spot.y, 14);
        if (aiming) {
          ctx.strokeStyle = 'rgba(245,240,225,0.6)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(g.spot.x, g.spot.y);
          ctx.lineTo(aiming.x, aiming.y);
          ctx.stroke();
          const power = U.clamp((aiming.y - aiming.y0) / 150, 0, 1);
          ctx.fillStyle = 'rgba(0,0,0,0.4)';
          ctx.fillRect(w - 26, h - 160, 12, 120);
          ctx.fillStyle = power > 0.85 ? '#e74c3c' : '#D4AF37';
          ctx.fillRect(w - 26, h - 40 - 120 * power, 12, 120 * power);
        }
        text(ctx, 'الأهداف ' + goals, w / 2, h * 0.06, 15, '#f2d675');
      },
      summary: (api) => [['الركلات / الأهداف', api.stats.tries + ' / ' + goals]],
    };
  }

  const MAKERS = { pass: passGame, dribble: dribbleGame, fitness: fitnessGame, defend: defendGame, heading: headingGame, keeper: keeperGame, setpiece: setpieceGame };
  const baseShoot = FC.Training.play;
  Object.keys(MAKERS).forEach((k) => (FC.Training.GAMES[k] = true));
  FC.Training.play = function (kind, user) {
    if (MAKERS[kind]) return run(MAKERS[kind](user), user);
    return baseShoot.call(FC.Training, kind, user);
  };
  FC.Training.run = run;
  // أدوات الرسم مشتركة مع اللحظات الخاصة
  FC.Training.draw = { grass, dot, man, ball, cone, frontMan, text };
})(globalThis);
