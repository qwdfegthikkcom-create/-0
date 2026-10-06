/* =========================================================
   عرض اللحظات الخاصة على canvas (وضع اللحظات):
   ركلة جزاء، ركلة حرة، رأسية، تصدي الحارس، صد جزاء، مواجهة دفاعية، إبعاد عرضية
   المنطق والنتائج في special-core.js — هنا الرسم والإدخال فقط
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC = G.FC || {};
  const U = FC.util;
  const hyp = Math.hypot;
  const GW = 7.32;
  const GH = 2.44;

  const INFO = {
    sp_pen: ['ركلة جزاء!', 'اسحب من الكرة للخلف: الاتجاه = الزاوية، الطول = القوة والارتفاع'],
    sp_fk: ['ركلة حرة مباشرة', 'اسحب للخلف ثم أفلت — الانحراف الجانبي يلفّ الكرة حول الجدار'],
    sp_header: ['عرضية في المنطقة!', 'اضغط للقفز في اللحظة المناسبة — يسار/يمين الشاشة يحدد الزاوية'],
    sp_gk: ['تسديدة نحو مرماك!', 'اضغط على المكان الذي ستصله الكرة لترتمي نحوه'],
    sp_pensave: ['ركلة جزاء ضدك', 'اختر جهة الارتماء: اضغط يسار المرمى أو وسطه أو يمينه'],
    sp_defend: ['مواجهة 1 ضد 1', 'تحرّك أمام المهاجم واضغط «افتكاك» عندما يدخل دائرتك'],
    sp_clear: ['عرضية نحو منطقتك', 'اضغط للقفز وإبعاد الكرة برأسك في التوقيت الصحيح'],
  };

  FC.SpecialView = {
    play(pd) {
      return new Promise((resolve) => {
        const D = FC.Training.draw;
        const Core = FC.SpecialCore;
        const rng = new FC.RNG(pd.seed || 7);
        const info = INFO[pd.scen] || ['لحظة', ''];
        const root = document.getElementById('overlay');
        const el = document.createElement('div');
        el.className = 'moment';
        const esc = U.esc;
        const isDefBtn = pd.scen === 'sp_defend';
        el.innerHTML =
          '<div class="m-top"><div class="m-clock" dir="ltr">' + esc(pd.clock || '') + "'</div>" +
          '<div class="m-head"><div class="m-title">' + esc(info[0]) + '</div><div class="m-msg">' + esc(info[1]) + '</div></div>' +
          (pd.teams ? '<div class="m-score"><span>' + esc(pd.teams[0]) + '</span><b dir="ltr">' + pd.score[0] + ' - ' + pd.score[1] + '</b><span>' + esc(pd.teams[1]) + '</span></div>' : '') +
          '</div>' +
          '<div class="m-stage"><canvas></canvas>' +
          '<div class="m-intro"><div class="m-intro-t">' + esc(info[0]) + '</div><div class="m-intro-m">' + esc(info[1]) + '</div><div class="m-intro-h">اضغط للبدء</div></div>' +
          '<div class="m-banner"></div></div>' +
          '<div class="m-bar"><div class="m-timer"><i></i></div><div class="m-btns">' +
          (isDefBtn ? '<button class="chip gold-chip" data-k="tackle">افتكاك</button>' : '') +
          '<button class="chip" data-k="auto">▶ لعب تلقائي</button></div>' +
          '<div class="m-hint">' + esc(info[1]) + '</div></div>';
        root.appendChild(el);
        root.classList.add('show');
        const canvas = el.querySelector('canvas');
        let view = FC.Draw.setup(canvas);
        const intro = el.querySelector('.m-intro');
        const banner = el.querySelector('.m-banner');
        const timerBar = el.querySelector('.m-timer i');
        const kitMine = pd.kit.mine;
        const kitOpp = FC.Draw.clashFix(kitMine, pd.kit.opp);
        const gkKit = FC.Draw.gkKit(pd.scen === 'sp_gk' || pd.scen === 'sp_pensave' ? kitOpp : kitOpp);
        let started = false;
        let t = 0; // زمن المشهد بعد البدء
        let done = null; // النتيجة النهائية
        let doneT = 0;
        let raf = 0;
        let last = performance.now();
        const LIMIT = 9; // مهلة الإدخال قبل اللعب التلقائي
        const S = {}; // حالة المشهد

        function flash(txt, cls, sub) {
          banner.innerHTML = '<div class="b-t">' + txt + '</div>' + (sub ? '<div class="b-s">' + sub + '</div>' : '');
          banner.className = 'm-banner show ' + (cls || '');
        }
        function finish(res, txt, cls, sub) {
          if (done) return;
          done = res;
          doneT = t;
          flash(txt, cls, sub);
          if (FC.Sound) {
            if (cls === 'gold') FC.Sound.goal(0.9);
            else if (res.outcome === 'saved' || res.outcome === 'won' || res.outcome === 'cleared') FC.Sound.ooh();
          }
        }
        function close() {
          cancelAnimationFrame(raf);
          G.removeEventListener('resize', onResize);
          G.removeEventListener('keydown', onKey);
          el.classList.add('out');
          setTimeout(() => {
            el.remove();
            if (!root.children.length) root.classList.remove('show');
            resolve(done);
          }, 250);
        }
        function start() {
          if (started) return;
          started = true;
          intro.classList.add('hide');
        }
        function pxy(ev) {
          const r = canvas.getBoundingClientRect();
          return { x: ev.clientX - r.left, y: ev.clientY - r.top };
        }
        // لعب تلقائي: نتيجة «اللاعب المتوسط» من المنطق
        function autoPlay() {
          if (done) return;
          const r = Core.auto(pd, rng);
          const txt = labelOf(r);
          finish(r, txt[0], txt[1]);
          S.autoShow = true;
        }
        function labelOf(r) {
          const o = r.outcome;
          if (r.shooter) return o === 'goal' ? ['هدف!!!', 'gold'] : o === 'saved' ? ['تصدّى الحارس', ''] : o === 'blocked' ? ['ارتطمت بالجدار', ''] : o === 'miss' ? ['لم تلمس الكرة', 'bad'] : ['خارج المرمى', 'bad'];
          if (pd.scen === 'sp_gk' || pd.scen === 'sp_pensave') return o === 'saved' ? ['تصدٍّ رائع!', 'gold'] : o === 'off' ? ['خارج المرمى', 'ok'] : ['هدف للخصم', 'bad'];
          return o === 'won' ? ['افتكاك نظيف!', 'gold'] : o === 'cleared' ? ['أبعدتها!', 'gold'] : o === 'foul' ? ['خطأ!', 'bad'] : o === 'missed' ? ['فاتتك العرضية', 'bad'] : ['تجاوزك', 'bad'];
        }

        // ============ هندسة المنظر الأمامي (جزاء، حرة، حارس) ============
        function front() {
          const w = view.w;
          const h = view.h;
          const m = Math.min((w * 0.86) / GW, h * 0.24);
          return { w, h, m, cx: w / 2, base: h * 0.44, spot: { x: w / 2, y: h * 0.86 } };
        }
        function drawFront(g, wall) {
          const ctx = view.ctx;
          const sky = ctx.createLinearGradient(0, 0, 0, g.h);
          sky.addColorStop(0, '#05070d');
          sky.addColorStop(0.44, '#121a2c');
          sky.addColorStop(0.44, '#0b4a30');
          sky.addColorStop(1, '#10653f');
          ctx.fillStyle = sky;
          ctx.fillRect(0, 0, g.w, g.h);
          // جمهور خافت
          ctx.fillStyle = 'rgba(245,240,225,0.06)';
          for (let i = 0; i < 120; i++) ctx.fillRect((i * 97) % g.w, ((i * 53) % (g.base * 0.55)) + 6, 2, 2);
          const x0 = g.cx - (GW / 2) * g.m;
          const x1 = g.cx + (GW / 2) * g.m;
          const y0 = g.base - GH * g.m;
          ctx.fillStyle = 'rgba(255,255,255,0.05)';
          ctx.fillRect(x0, y0, x1 - x0, g.base - y0);
          ctx.strokeStyle = 'rgba(255,255,255,0.14)';
          ctx.lineWidth = 1;
          for (let x = x0; x <= x1; x += g.m * 0.3) {
            ctx.beginPath();
            ctx.moveTo(x, y0);
            ctx.lineTo(x, g.base);
            ctx.stroke();
          }
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = Math.max(4, g.m * 0.1);
          ctx.beginPath();
          ctx.moveTo(x0, g.base);
          ctx.lineTo(x0, y0);
          ctx.lineTo(x1, y0);
          ctx.lineTo(x1, g.base);
          ctx.stroke();
          // نقطة الجزاء وخطوط المنطقة
          ctx.strokeStyle = 'rgba(255,255,255,0.5)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, g.base + (g.h - g.base) * 0.25);
          ctx.lineTo(g.w, g.base + (g.h - g.base) * 0.25);
          ctx.stroke();
          if (wall) {
            const wm = g.m * 1.25;
            for (let i = -2; i <= 1; i++) D.frontMan(ctx, g.cx + (i + 0.5) * 0.62 * wm, g.h * 0.66, wm, kitOpp[0]);
          }
        }
        // الحارس (أمامي) مع ارتماء نحو (tx, tz) بنسبة k
        function drawGK(g, tx, tz, k, kit) {
          const ctx = view.ctx;
          const x = g.cx + tx * k * g.m;
          const y = g.base - Math.max(0, tz - 0.9) * k * g.m;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(Math.sign(tx) * Math.min(1, Math.abs(tx) / 2) * k * 1.2);
          ctx.translate(-x, -y);
          D.frontMan(ctx, x, y, g.m * 0.9, kit[0], 'up');
          ctx.restore();
        }

        // ============ المشاهد ============
        const scenes = {
          // ---- ركلة جزاء / ركلة حرة (أنت المسدد) ----
          sp_pen: shootScene(false),
          sp_fk: shootScene(true),
          // ---- رأسية / إبعاد ----
          sp_header: airScene(false),
          sp_clear: airScene(true),
          // ---- تصدي الحارس ----
          sp_gk: {
            init() {
              S.shot = Core.gkShot(pd, rng);
              S.wait = 0.8;
            },
            down(p) {
              if (S.dive || S.shotT == null) return;
              const g = front();
              S.dive = { x: U.clamp((p.x - g.cx) / g.m, -GW / 2 - 0.6, GW / 2 + 0.6), z: U.clamp((g.base - p.y) / g.m, 0, GH + 0.3), at: t - S.wait };
            },
            update() {
              const tt = t - S.wait;
              S.shotT = tt >= 0 ? tt : null;
              if (!done && tt >= S.shot.T) {
                const r = Core.gkSave(pd.me, pd.opps[0], S.shot, S.dive ? { x: S.dive.x, z: S.dive.z, at: S.dive.at } : { none: true }, rng, pd.diff, pd.type);
                const res = { def: true, outcome: r.outcome, catch: r.catch };
                const l = labelOf(res);
                finish(res, r.catch ? 'أمسكتها!' : l[0], l[1]);
              }
            },
            draw() {
              const g = front();
              drawFront(g, false);
              const ctx = view.ctx;
              const k = S.dive && S.shotT != null ? U.clamp((S.shotT - S.dive.at) / 0.22, 0, 1) : 0;
              drawGK(g, S.dive ? S.dive.x : 0, S.dive ? S.dive.z : 0.9, k, kitMine.map(() => '#c6ff00'));
              // المسدد يقترب ثم الكرة
              if (S.shotT == null) {
                D.frontMan(ctx, g.cx + 30 - t * 20, g.h * 0.9, g.m * 1.5, kitOpp[0], null);
                D.ball(ctx, g.cx, g.h * 0.93, 18);
              } else {
                const e = U.clamp(S.shotT / S.shot.T, 0, 1);
                const sx = g.cx + S.shot.x * g.m * e;
                const sy = g.h * 0.93 + (g.base - S.shot.z * g.m - g.h * 0.93) * e;
                D.ball(ctx, sx, sy, 5 + (1 - e) * 20);
              }
            },
          },
          // ---- صد ركلة جزاء ----
          sp_pensave: {
            init() {
              S.kickAt = 1.4;
            },
            down(p) {
              if (S.choice != null) return;
              const g = front();
              const x = (p.x - g.cx) / g.m;
              S.choice = Math.abs(x) < 1 ? 0 : Math.sign(x);
              S.early = t < S.kickAt - 0.35;
            },
            key(code) {
              if (S.choice != null) return false;
              const map = { ArrowLeft: -1, ArrowUp: 0, ArrowDown: 0, ArrowRight: 1 };
              if (!(code in map)) return false;
              S.choice = map[code];
              S.early = t < S.kickAt - 0.35;
              return true;
            },
            update() {
              if (!S.res && t >= S.kickAt + 0.05) {
                S.res = Core.penSave(pd.me, pd.opps[0], { side: S.choice != null ? S.choice : [-1, 0, 1][rng.int(0, 2)], early: !!S.early }, rng);
                if (S.choice == null) S.choice = 0;
              }
              if (S.res && !done && t >= S.kickAt + 0.6) {
                const res = { def: true, outcome: S.res.outcome };
                const l = labelOf(res);
                finish(res, l[0], l[1]);
              }
            },
            draw() {
              const g = front();
              drawFront(g, false);
              const ctx = view.ctx;
              const k = S.choice != null && t > S.kickAt ? U.clamp((t - S.kickAt) / 0.3, 0, 1) : 0;
              drawGK(g, (S.choice || 0) * 2.3, 1.1, k, ['#c6ff00']);
              const run = U.clamp(t / S.kickAt, 0, 1);
              D.frontMan(ctx, g.cx - 50 + run * 40, g.h * 0.93 - run * 30, g.m * 1.5, kitOpp[0], null);
              if (!S.res) D.ball(ctx, g.cx, g.h * 0.8, 14);
              else {
                const e = U.clamp((t - S.kickAt) / 0.5, 0, 1);
                D.ball(ctx, g.cx + S.res.x * g.m * e, g.h * 0.8 + (g.base - S.res.z * g.m - g.h * 0.8) * e, 14 - 8 * e);
              }
              // مناطق الاختيار
              if (S.choice == null && t < S.kickAt) {
                ctx.fillStyle = 'rgba(242,214,117,0.08)';
                ctx.fillRect(g.cx - (GW / 2) * g.m, g.base - GH * g.m, GW * g.m, GH * g.m);
                D.text(ctx, '◀ يسار', g.cx - 2.4 * g.m, g.base - 1.2 * g.m, 14, '#f2d675');
                D.text(ctx, 'وسط', g.cx, g.base - 1.9 * g.m, 14, '#f2d675');
                D.text(ctx, 'يمين ▶', g.cx + 2.4 * g.m, g.base - 1.2 * g.m, 14, '#f2d675');
              }
            },
          },
          // ---- مواجهة دفاعية ----
          sp_defend: {
            init() {
              S.me = { x: 0.5 };
              S.tx = 0.5;
              S.att = { x: rng.float(0.3, 0.7), y: 0.08, vx: 0, sp: 0.2 + rng.float(0, 0.06), cut: rng.float(0.42, 0.58) };
              S.meY = 0.7;
            },
            down(p) {
              S.tx = U.clamp(p.x / view.w, 0.05, 0.95);
            },
            move(p, pressed) {
              if (pressed) S.tx = U.clamp(p.x / view.w, 0.05, 0.95);
            },
            key(code) {
              if (code === 'Space') {
                this.tackle();
                return true;
              }
              if (code === 'ArrowLeft') S.tx = U.clamp(S.me.x - 0.12, 0.05, 0.95);
              else if (code === 'ArrowRight') S.tx = U.clamp(S.me.x + 0.12, 0.05, 0.95);
              else return false;
              return true;
            },
            btn(k) {
              if (k === 'tackle') this.tackle();
            },
            tackle() {
              if (done || S.tk) return;
              const a = S.att;
              // التوقيت المثالي عندما يصل المهاجم إلى مسافة ~0.07 من ارتفاع الشاشة
              const dy = S.meY - a.y;
              const err = (0.08 - dy) / a.sp; // موجب = متأخر
              const off = U.clamp(Math.abs(a.x - S.me.x) / 0.18, 0, 1);
              S.tk = { t, err, off };
              const r = Core.defend(pd.me, pd.opps[0], { err, off }, rng, pd.diff);
              const res = { def: true, outcome: r.outcome };
              const l = labelOf(res);
              finish(res, l[0], l[1]);
            },
            update(dt) {
              S.me.x += U.clamp(S.tx - S.me.x, -1, 1) * Math.min(1, dt * 5);
              const a = S.att;
              if (done && S.tk && done.outcome === 'won') return;
              a.y += a.sp * dt;
              if (a.y > a.cut && !a.faked) {
                a.faked = true;
                a.vx = (a.x < S.me.x ? -1 : 1) * rng.float(0.12, 0.25);
              }
              a.x = U.clamp(a.x + a.vx * dt, 0.08, 0.92);
              if (!done && a.y > S.meY + 0.03) {
                const r = Core.defend(pd.me, pd.opps[0], { none: true, off: U.clamp(Math.abs(a.x - S.me.x) / 0.18, 0, 1) }, rng, pd.diff);
                const res = { def: true, outcome: r.outcome };
                const l = labelOf(res);
                finish(res, l[0], l[1]);
              }
            },
            draw() {
              const ctx = view.ctx;
              const w = view.w;
              const h = view.h;
              D.grass(ctx, w, h);
              // منطقة الجزاء أسفل الشاشة
              ctx.strokeStyle = 'rgba(255,255,255,0.7)';
              ctx.lineWidth = 2;
              ctx.strokeRect(w * 0.15, h * 0.84, w * 0.7, h * 0.2);
              ctx.strokeRect(w * 0.35, h * 0.95, w * 0.3, h * 0.1);
              const R = Math.max(11, Math.min(w, h) * 0.032);
              const range = Math.min(w, h) * 0.1;
              ctx.strokeStyle = 'rgba(242,214,117,0.7)';
              ctx.setLineDash([5, 5]);
              ctx.beginPath();
              ctx.arc(S.me.x * w, S.meY * h, range, 0, Math.PI * 2);
              ctx.stroke();
              ctx.setLineDash([]);
              D.man(ctx, S.me.x * w, S.meY * h, R, kitMine[0], pd.me.num, true);
              const a = S.att;
              D.man(ctx, a.x * w, a.y * h, R, kitOpp[0], pd.opps[0] ? pd.opps[0].num : 9);
              const own = done && done.outcome === 'won';
              D.ball(ctx, (own ? S.me.x : a.x) * w, (own ? S.meY - 0.04 : a.y + 0.035) * h, R * 0.45);
            },
          },
        };

        // مشهد التسديد (جزاء أو حرة)
        function shootScene(wall) {
          return {
            init() {
              const r = rng;
              S.target = wall ? { x: (r.chance(0.5) ? 1 : -1) * r.float(2.3, 3.2), z: r.float(1.4, 2.0) } : null;
            },
            down(p) {
              if (S.flight || done) return;
              const g = front();
              if (hyp(p.x - g.spot.x, p.y - g.spot.y) < 110) S.aim = { x0: p.x, y0: p.y, x: p.x, y: p.y };
            },
            move(p) {
              if (S.aim) {
                S.aim.x = p.x;
                S.aim.y = p.y;
              }
            },
            up() {
              if (!S.aim || done) return;
              const a = S.aim;
              S.aim = null;
              const dx = a.x - a.x0;
              const dy = a.y - a.y0;
              const power = U.clamp(dy / 150, 0, 1);
              if (power < 0.08) return;
              const x = U.clamp(-dx / 38, -4.5, 4.5);
              const z = 0.2 + power * 2.3;
              let r;
              let res;
              if (wall) {
                r = Core.fk(pd.me, pd.gk, { x, z, curve: U.clamp(-dx / 80, -1, 1), power }, rng, pd.diff);
                res = { shooter: 'user', outcome: r.outcome, shotType: 'fk' };
              } else {
                r = Core.pen(pd.me, pd.gk, { x, z, power }, rng, pd.diff);
                res = { shooter: 'user', outcome: r.outcome === 'goal' ? 'goal' : r.outcome === 'saved' ? 'saved' : 'off', shotType: 'pen' };
              }
              S.flight = { t0: t, r, res };
              if (FC.Sound) FC.Sound.kick(1);
            },
            update() {
              if (S.flight && !done && t - S.flight.t0 > 0.62) {
                const l = labelOf(S.flight.res);
                finish(S.flight.res, S.flight.r.post ? 'في القائم!' : l[0], l[1]);
              }
            },
            draw() {
              const g = front();
              drawFront(g, wall);
              const ctx = view.ctx;
              if (S.target) {
                ctx.strokeStyle = 'rgba(242,214,117,0.5)';
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.arc(g.cx + S.target.x * g.m, g.base - S.target.z * g.m, 0.5 * g.m, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
              }
              const f = S.flight;
              const gkK = f ? U.clamp((t - f.t0 - 0.12) / 0.3, 0, 1) : 0;
              const gkx = f ? (f.r.gkX != null ? f.r.gkX : f.res.outcome === 'saved' ? f.r.x : -Math.sign(f.r.x || 1) * 1.5) : 0;
              const gkz = f ? (f.r.gkZ != null ? f.r.gkZ : f.r.z || 1) : 0.9;
              drawGK(g, gkx, gkz, gkK, ['#c6ff00']);
              if (f) {
                const k = U.clamp((t - f.t0) / 0.55, 0, 1);
                const blocked = f.res.outcome === 'blocked';
                const tx = g.cx + (f.r.x || 0) * g.m;
                const ty = blocked ? g.h * 0.6 : g.base - (f.r.z || 0.5) * g.m;
                const kk = blocked ? Math.min(1, k * 1.7) : k;
                const bx = g.spot.x + (tx - g.spot.x) * kk + (wall ? Math.sin(kk * Math.PI) * -(f.r.x || 0) * g.m * 0.25 : 0);
                const by = g.spot.y + (ty - g.spot.y) * kk - Math.sin(kk * Math.PI) * (wall ? 40 : 10);
                D.ball(ctx, bx, by, 15 - 9 * kk);
              } else D.ball(ctx, g.spot.x, g.spot.y, 15);
              if (S.aim) {
                ctx.strokeStyle = 'rgba(245,240,225,0.6)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(g.spot.x, g.spot.y);
                ctx.lineTo(S.aim.x, S.aim.y);
                ctx.stroke();
                const dx = S.aim.x - S.aim.x0;
                const power = U.clamp((S.aim.y - S.aim.y0) / 150, 0, 1);
                const ax = g.cx + U.clamp(-dx / 38, -4.5, 4.5) * g.m;
                const az = g.base - (0.2 + power * 2.3) * g.m;
                ctx.strokeStyle = power > 0.9 ? 'rgba(231,76,60,0.95)' : 'rgba(242,214,117,0.95)';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.arc(ax, az, 10, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillStyle = 'rgba(0,0,0,0.4)';
                ctx.fillRect(g.w - 26, g.h - 160, 12, 120);
                ctx.fillStyle = power > 0.9 ? '#e74c3c' : '#D4AF37';
                ctx.fillRect(g.w - 26, g.h - 40 - 120 * power, 12, 120 * power);
              }
            },
          };
        }

        // مشهد الكرات الهوائية (رأسية هجومية أو إبعاد)
        function airScene(defend) {
          const JT = 0.55;
          return {
            init() {
              S.from = rng.chance(0.5) ? -1 : 1;
              S.T = rng.float(1.2, 1.5);
              S.wait = 0.5;
            },
            ballAt(k) {
              const x = S.from < 0 ? -0.05 + k * 0.55 : 1.05 - k * 0.55;
              const z = 0.8 + Math.sin(Math.min(1, k) * Math.PI * 0.8) * 3 - Math.max(0, k - 0.85) * 2;
              return { x, z };
            },
            head(sk) {
              if (!S.jump) return 1.75;
              const k = (t - S.jump) / JT;
              return 1.75 + (k > 0 && k < 1 ? Math.sin(k * Math.PI) * (0.55 + sk * 0.3) : 0);
            },
            down(p) {
              this.jumpNow(p.x < view.w / 2 ? -1 : 1);
            },
            key(code) {
              if (code !== 'Space' && code !== 'ArrowLeft' && code !== 'ArrowRight') return false;
              this.jumpNow(code === 'ArrowLeft' ? -1 : 1);
              return true;
            },
            jumpNow(side) {
              if (S.jump != null || done) return;
              S.jump = t;
              S.aim = side;
            },
            update() {
              const tt = t - S.wait;
              if (tt < 0 || done) return;
              if (tt >= S.T && !S.res) {
                // لحظة وصول الكرة: خطأ التوقيت = زمن القفز − (زمن الوصول − نصف القفزة)
                const ideal = S.wait + S.T - JT / 2;
                const input = S.jump == null ? { none: true, err: 9 } : { err: S.jump - ideal, aim: S.aim };
                if (defend) S.res = Object.assign({ def: true }, Core.clear(pd.me, pd.opps[0], input, rng));
                else {
                  const r = Core.header(pd.me, pd.gk, input.none ? { err: 9 } : input, rng, pd.diff);
                  S.res = { shooter: 'user', outcome: r.contact ? r.outcome : 'miss', shotType: 'header', r };
                }
                const l = labelOf(S.res);
                let txt = l[0];
                if (!defend && S.res.r && !S.res.r.contact) txt = S.res.r.outcome === 'early' ? 'قفزت مبكراً' : 'تأخرت في القفز';
                finish(S.res, txt, l[1]);
              }
            },
            draw() {
              const ctx = view.ctx;
              const w = view.w;
              const h = view.h;
              const sky = ctx.createLinearGradient(0, 0, 0, h);
              sky.addColorStop(0, '#05070d');
              sky.addColorStop(0.62, '#152238');
              sky.addColorStop(0.62, '#0e5a3a');
              sky.addColorStop(1, '#10653f');
              ctx.fillStyle = sky;
              ctx.fillRect(0, 0, w, h);
              const m = Math.min(h * 0.11, w * 0.1);
              const ground = h * 0.84;
              // المرمى في الخلفية (مرمى الخصم أو مرماك)
              ctx.strokeStyle = 'rgba(255,255,255,0.8)';
              ctx.lineWidth = 3;
              ctx.strokeRect(w * 0.33, h * 0.62 - 1.1 * m, w * 0.34, 1.1 * m);
              D.frontMan(ctx, w / 2 + (defend ? 0 : 12), h * 0.62, m * 0.55, defend ? '#c6ff00' : '#c6ff00', 'up');
              // الخصم بجانبك
              const sk = 0.5;
              const hz = this.head(sk);
              const px = w * 0.5;
              const py = ground - (hz - 1.75) * m;
              D.frontMan(ctx, px + (defend ? 0.5 : -0.55) * m, ground - (S.jump != null ? Math.max(0, (hz - 1.75) * 0.6) * m : 0), m, kitOpp[0], null);
              D.frontMan(ctx, px, py, m, kitMine[0], S.jump != null ? 'up' : null);
              ctx.strokeStyle = '#f2d675';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(px, py - 1.64 * m, 0.2 * m, 0, Math.PI * 2);
              ctx.stroke();
              const tt = t - S.wait;
              if (tt >= 0) {
                const k = tt / S.T;
                let b = this.ballAt(Math.min(k, 1));
                let bx = b.x * w;
                let bz = b.z;
                if (done && k > 1) {
                  const e = Math.min(1, (k - 1) * 2.5);
                  const good = done.outcome === 'goal' || done.outcome === 'saved' || done.outcome === 'cleared';
                  if (good) {
                    bx = w / 2 + (defend ? (S.from > 0 ? -1 : 1) * e * w * 0.5 : (S.aim || 1) * e * w * 0.12);
                    bz = hz + 0.1 + (defend ? e * 2 : e * -0.8);
                  } else {
                    b = this.ballAt(Math.min(1.6, k));
                    bx = b.x * w;
                    bz = Math.max(0.1, b.z);
                  }
                }
                D.ball(ctx, bx, ground, Math.max(5, 0.13 * m), bz * m);
              }
            },
          };
        }

        const sc = scenes[pd.scen];
        if (!sc) {
          // نوع غير معروف: لعب تلقائي فوري
          done = Core.auto(pd, rng);
          setTimeout(close, 10);
          return;
        }
        sc.init();

        canvas.addEventListener('pointerdown', (ev) => {
          ev.preventDefault();
          if (!started) return start();
          if (done) return;
          try {
            canvas.setPointerCapture(ev.pointerId);
          } catch (e) {
            /* تجاهل */
          }
          if (sc.down) sc.down(pxy(ev));
        });
        canvas.addEventListener('pointermove', (ev) => {
          if (started && !done && sc.move) sc.move(pxy(ev), ev.buttons > 0 || ev.pointerType === 'touch');
        });
        canvas.addEventListener('pointerup', (ev) => {
          if (started && !done && sc.up) sc.up(pxy(ev));
        });
        intro.addEventListener('pointerdown', start);
        el.querySelectorAll('[data-k]').forEach((b) =>
          b.addEventListener('pointerdown', (ev) => {
            ev.preventDefault();
            const k = b.dataset.k;
            if (k === 'auto') {
              start();
              return autoPlay();
            }
            if (!started) return start();
            if (sc.btn) sc.btn(k);
          })
        );
        const onKey = (ev) => {
          if (!started) {
            if (ev.code === 'Space' || ev.code === 'Enter') start();
            return;
          }
          if (ev.code === 'KeyA') return autoPlay();
          if (!done && sc.key && sc.key(ev.code)) ev.preventDefault();
        };
        G.addEventListener('keydown', onKey);
        const onResize = () => (view = FC.Draw.setup(canvas));
        G.addEventListener('resize', onResize);

        function frame(now) {
          const dt = Math.min(0.05, (now - last) / 1000);
          last = now;
          if (started) {
            t += dt;
            if (!done) {
              if (sc.update) sc.update(dt);
              timerBar.style.width = Math.max(0, 100 - (100 * t) / LIMIT) + '%';
              if (t > LIMIT && !done) autoPlay();
            } else {
              if (sc.update && !S.autoShow) sc.update(dt);
              if (t - doneT > 1.6) return close();
            }
          }
          const ctx = view.ctx;
          ctx.clearRect(0, 0, view.w, view.h);
          sc.draw();
          raf = requestAnimationFrame(frame);
        }
        raf = requestAnimationFrame(frame);
      });
    },
  };
})(globalThis);
