/* =========================================================
   ألعاب التدريب المصغّرة (canvas)
   المرحلة 1: تدريب التسديد — أهداف في زوايا المرمى، سحب للتصويب مع شريط قوة، والحارس يتحرك
   النتيجة تحدد مضاعف تطور مجموعة السمات هذا الأسبوع (من ×0.6 إلى ×1.6)
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC = G.FC || {};
  const U = FC.util;

  const GOAL_W = 7.32;
  const GOAL_H = 2.44;

  FC.Training = {
    // الألعاب المتوفرة في هذه المرحلة
    GAMES: { shoot: true },

    // مضاعف التطور من النقاط
    multFromScore(score) {
      const BG = FC.BAL.growth;
      return U.round1(BG.gameMin + (BG.gameMax - BG.gameMin) * U.clamp(score / FC.BAL.train.goodScore, 0, 1));
    },

    // تشغيل لعبة تدريب ← وعد بالنتيجة {score, mult}
    play(kind, user) {
      return FC.Training.shoot(user);
    },

    // تدريب التسديد
    shoot(user) {
      return new Promise((resolve) => {
        const BT = FC.BAL.train;
        const a = user.attrs;
        const skill = 0.45 * a.fin + 0.2 * a.pow + 0.2 * a.lng + 0.15 * a.cur;
        const targetR = BT.targetBase + BT.targetK * (skill - 50);
        const sigma = 0.55 * Math.exp(-0.022 * (skill - 50));
        const root = document.getElementById('overlay');
        const el = document.createElement('div');
        el.className = 'moment training';
        el.innerHTML =
          '<div class="m-top"><div class="m-clock t-time" dir="ltr">40</div>' +
          '<div class="m-head"><div class="m-title">تدريب التسديد</div><div class="m-msg">اسحب الكرة للأسفل وصوّب نحو الأهداف المضيئة</div></div>' +
          '<div class="m-score"><span>النقاط</span><b class="t-score" dir="ltr">0</b></div></div>' +
          '<div class="m-stage"><canvas></canvas>' +
          '<div class="m-intro"><div class="m-intro-t">تدريب التسديد</div><div class="m-intro-m">الهدف المضيء = 3 نقاط، الهدف العادي = نقطة.<br>اسحب للأسفل أكثر = تسديدة أعلى وأقوى. الحارس يتحرك!</div><div class="m-intro-h">اضغط للبدء</div></div>' +
          '<div class="m-banner"></div><div class="t-end"></div></div>' +
          '<div class="m-bar"><div class="m-timer"><i></i></div><div class="m-btns"><button class="chip" data-k="stop">إنهاء مبكراً</button></div>' +
          '<div class="m-hint">اسحب من الكرة للخلف ثم أفلت • كلما ارتفعت سماتك اتسعت الأهداف</div></div>';
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
        const rng = new FC.RNG((Date.now() & 0xffffffff) >>> 0);
        const dur = BT.duration;
        let started = false;
        let over = false;
        let time = 0;
        let score = 0;
        let shots = 0;
        let hits = 0;
        let goals = 0;
        let aiming = null;
        let flight = null;
        let pause = 0;
        let last = performance.now();
        let raf = 0;
        const gk = { x: 0, v: 1.4, dive: 0, diveX: 0 };
        let ballX = 0;
        const targets = [];

        // هندسة المشهد
        function geo() {
          const w = view.w;
          const h = view.h;
          const gw = Math.min(w * 0.86, h * 1.05);
          const m = gw / GOAL_W;
          const top = h * 0.2;
          return { w, h, m, cx: w / 2, top, base: top + GOAL_H * m, spotY: h * 0.84 };
        }
        const gx = (g, x) => g.cx + x * g.m;
        const gy = (g, z) => g.base - z * g.m;

        function newTarget() {
          const side = rng.chance(0.5) ? 1 : -1;
          const x = side * rng.float(1.4, GOAL_W / 2 - targetR - 0.05);
          const z = rng.float(targetR + 0.05, GOAL_H - targetR - 0.05);
          return { x, z, r: targetR, pulse: rng.next() * 6 };
        }
        targets.push(newTarget(), newTarget());
        function resetBall() {
          ballX = rng.float(-0.22, 0.22);
        }
        resetBall();

        function start() {
          if (started) return;
          started = true;
          intro.classList.add('hide');
        }
        function pxy(ev) {
          const r = canvas.getBoundingClientRect();
          return { x: ev.clientX - r.left, y: ev.clientY - r.top };
        }
        function ballPos(g) {
          return { x: g.cx + ballX * g.w, y: g.spotY };
        }
        function aimOf(g) {
          const bp = ballPos(g);
          const vx = bp.x - aiming.x;
          const vy = aiming.y - bp.y;
          const power = U.clamp(vy / 140, 0, 1);
          const ax = U.clamp((vx / 95) * 3.9 + ballX * 2, -5.5, 5.5);
          const az = 0.12 + power * 2.55;
          return { ax, az, power };
        }
        canvas.addEventListener('pointerdown', (ev) => {
          ev.preventDefault();
          if (!started) return start();
          if (over || flight || pause > 0) return;
          const g = geo();
          const p = pxy(ev);
          const bp = ballPos(g);
          if (Math.hypot(p.x - bp.x, p.y - bp.y) < 80) {
            aiming = p;
            try {
              canvas.setPointerCapture(ev.pointerId);
            } catch (e) {
              /* تجاهل */
            }
          }
        });
        canvas.addEventListener('pointermove', (ev) => {
          if (aiming) aiming = pxy(ev);
        });
        canvas.addEventListener('pointerup', () => {
          if (!aiming) return;
          const g = geo();
          const a = aimOf(g);
          aiming = null;
          if (a.power < 0.08) return;
          const tx = a.ax + rng.normal(0, sigma);
          const tz = a.az + rng.normal(0, sigma * 0.7);
          flight = { t: 0, dur: 0.55 - a.power * 0.2, tx, tz, react: 0.22 + rng.float(0, 0.12) };
          shots++;
          if (FC.Sound) FC.Sound.kick();
        });
        intro.addEventListener('pointerdown', start);
        el.querySelector('[data-k=stop]').addEventListener('click', () => finish());
        const onResize = () => (view = FC.Draw.setup(canvas));
        G.addEventListener('resize', onResize);

        function flash(txt, cls) {
          banner.innerHTML = '<div class="b-t">' + txt + '</div>';
          banner.className = 'm-banner show small ' + (cls || '');
          setTimeout(() => banner.classList.remove('show'), 650);
        }

        // حسم التسديدة عند وصولها لخط المرمى
        function resolveShot(f) {
          const inGoal = Math.abs(f.tx) < GOAL_W / 2 - 0.08 && f.tz > 0 && f.tz < GOAL_H - 0.06;
          if (!inGoal) {
            flash('خارج المرمى');
            if (FC.Sound) FC.Sound.ooh();
            return;
          }
          const reach = 0.55 + 0.75 + (gk.dive ? 0.9 : 0);
          if (Math.abs(f.tx - gk.x) < reach && f.tz < 2.25 && rng.chance(0.85)) {
            flash('تصدّى الحارس');
            if (FC.Sound) FC.Sound.ooh();
            return;
          }
          goals++;
          let hit = -1;
          targets.forEach((t, i) => {
            if (Math.hypot(t.x - f.tx, t.z - f.tz) <= t.r) hit = i;
          });
          if (hit >= 0) {
            score += 3;
            hits++;
            targets[hit] = newTarget();
            flash('ممتاز! +3', 'gold');
            if (FC.Sound) FC.Sound.goal(0.5);
          } else {
            score += 1;
            flash('هدف +1', 'ok');
            if (FC.Sound) FC.Sound.net();
          }
          sEl.textContent = score;
        }

        function finish() {
          if (over) return;
          over = true;
          const mult = FC.Training.multFromScore(score);
          const stars = score >= BT.goodScore ? 3 : score >= BT.goodScore * 0.6 ? 2 : score >= BT.goodScore * 0.3 ? 1 : 0;
          endBox.innerHTML =
            '<div class="t-card"><div class="t-h">انتهى التدريب</div>' +
            '<div class="t-stars">' + '★'.repeat(stars) + '<span>' + '★'.repeat(3 - stars) + '</span></div>' +
            '<div class="t-row"><span>النقاط</span><b dir="ltr">' + score + '</b></div>' +
            '<div class="t-row"><span>التسديدات / الأهداف / الإصابات الدقيقة</span><b dir="ltr">' + shots + ' / ' + goals + ' / ' + hits + '</b></div>' +
            '<div class="t-mult">مضاعف تطور التسديد هذا الأسبوع <b dir="ltr">×' + mult.toFixed(1) + '</b></div>' +
            '<button class="btn gold t-ok">متابعة</button></div>';
          endBox.classList.add('show');
          endBox.querySelector('.t-ok').addEventListener('click', () => {
            cancelAnimationFrame(raf);
            G.removeEventListener('resize', onResize);
            el.classList.add('out');
            setTimeout(() => {
              el.remove();
              if (!root.children.length) root.classList.remove('show');
              resolve({ score, mult, shots, goals, hits });
            }, 250);
          });
        }

        // الرسم
        function draw(dt) {
          const ctx = view.ctx;
          const g = geo();
          // السماء والمدرجات
          const sky = ctx.createLinearGradient(0, 0, 0, g.base);
          sky.addColorStop(0, '#05070d');
          sky.addColorStop(1, '#121a2c');
          ctx.fillStyle = sky;
          ctx.fillRect(0, 0, g.w, g.h);
          ctx.fillStyle = 'rgba(245,240,225,0.06)';
          for (let i = 0; i < 90; i++) {
            const x = (i * 97) % g.w;
            const y = ((i * 53) % (g.top * 0.9)) + 4;
            ctx.fillRect(x, y, 2, 2);
          }
          // العشب
          const grass = ctx.createLinearGradient(0, g.base, 0, g.h);
          grass.addColorStop(0, '#0b4a30');
          grass.addColorStop(1, '#10653f');
          ctx.fillStyle = grass;
          ctx.fillRect(0, g.base, g.w, g.h - g.base);
          ctx.strokeStyle = 'rgba(255,255,255,0.7)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, g.base);
          ctx.lineTo(g.w, g.base);
          ctx.stroke();
          // الشباك
          const x0 = gx(g, -GOAL_W / 2);
          const x1 = gx(g, GOAL_W / 2);
          const y0 = gy(g, GOAL_H);
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
          for (let y = y0; y <= g.base; y += g.m * 0.3) {
            ctx.beginPath();
            ctx.moveTo(x0, y);
            ctx.lineTo(x1, y);
            ctx.stroke();
          }
          // الأهداف المضيئة
          targets.forEach((t) => {
            t.pulse += dt * 4;
            const r = t.r * g.m;
            const cx = gx(g, t.x);
            const cy = gy(g, t.z);
            const grd = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
            grd.addColorStop(0, 'rgba(242,214,117,0.55)');
            grd.addColorStop(1, 'rgba(212,175,55,0.12)');
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(242,214,117,' + (0.6 + 0.3 * Math.sin(t.pulse)) + ')';
            ctx.lineWidth = 2.5;
            ctx.stroke();
          });
          // القائمان والعارضة
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = Math.max(4, g.m * 0.12);
          ctx.beginPath();
          ctx.moveTo(x0, g.base);
          ctx.lineTo(x0, y0);
          ctx.lineTo(x1, y0);
          ctx.lineTo(x1, g.base);
          ctx.stroke();
          // الحارس (منظر أمامي)
          const kx = gx(g, gk.x);
          const lean = gk.dive ? gk.diveDir * 0.9 : 0;
          ctx.save();
          ctx.translate(kx, g.base);
          ctx.rotate(lean);
          ctx.fillStyle = '#c6ff00';
          ctx.fillRect(-0.28 * g.m, -1.45 * g.m, 0.56 * g.m, 0.75 * g.m);
          ctx.fillStyle = '#1b1b1b';
          ctx.fillRect(-0.26 * g.m, -0.7 * g.m, 0.22 * g.m, 0.7 * g.m);
          ctx.fillRect(0.04 * g.m, -0.7 * g.m, 0.22 * g.m, 0.7 * g.m);
          ctx.fillStyle = '#c69c6d';
          ctx.beginPath();
          ctx.arc(0, -1.62 * g.m, 0.16 * g.m, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#c6ff00';
          ctx.lineWidth = Math.max(3, 0.12 * g.m);
          ctx.beginPath();
          ctx.moveTo(-0.28 * g.m, -1.35 * g.m);
          ctx.lineTo(-0.75 * g.m, -1.75 * g.m);
          ctx.moveTo(0.28 * g.m, -1.35 * g.m);
          ctx.lineTo(0.75 * g.m, -1.75 * g.m);
          ctx.stroke();
          ctx.restore();
          // الكرة
          const bp = ballPos(g);
          if (flight) {
            const k = U.clamp(flight.t / flight.dur, 0, 1);
            const e = 1 - (1 - k) * (1 - k);
            const tx = gx(g, flight.tx);
            const ty = gy(g, flight.tz);
            const x = bp.x + (tx - bp.x) * e;
            const y = bp.y + (ty - bp.y) * e - Math.sin(k * Math.PI) * 30 * (flight.tz / 2);
            const r = 16 - 10 * e;
            drawBall(ctx, x, y, r);
          } else if (!over) {
            drawBall(ctx, bp.x, bp.y, 16);
          }
          // التصويب
          if (aiming) {
            const a = aimOf(g);
            ctx.strokeStyle = 'rgba(245,240,225,0.5)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(bp.x, bp.y);
            ctx.lineTo(aiming.x, aiming.y);
            ctx.stroke();
            const rx = gx(g, a.ax);
            const ry = gy(g, a.az);
            const col = a.az > GOAL_H ? '231,76,60' : '242,214,117';
            ctx.strokeStyle = 'rgba(' + col + ',0.95)';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(rx, ry, Math.max(6, sigma * g.m), 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(rx - 8, ry);
            ctx.lineTo(rx + 8, ry);
            ctx.moveTo(rx, ry - 8);
            ctx.lineTo(rx, ry + 8);
            ctx.stroke();
            // شريط القوة
            const bh = 120;
            const bx = g.w - 26;
            const by = g.h - 40 - bh;
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fillRect(bx, by, 12, bh);
            const grd = ctx.createLinearGradient(0, by + bh, 0, by);
            grd.addColorStop(0, '#2e7d32');
            grd.addColorStop(0.62, '#D4AF37');
            grd.addColorStop(0.9, '#e74c3c');
            ctx.fillStyle = grd;
            ctx.fillRect(bx, by + bh * (1 - a.power), 12, bh * a.power);
          }
        }
        function drawBall(ctx, x, y, r) {
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.beginPath();
          ctx.ellipse(x, y + r * 0.9, r, r * 0.35, 0, 0, Math.PI * 2);
          ctx.fill();
          const g2 = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
          g2.addColorStop(0, '#fff');
          g2.addColorStop(1, '#c9ced2');
          ctx.fillStyle = g2;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#1b1b1b';
          ctx.beginPath();
          ctx.arc(x + r * 0.1, y, r * 0.32, 0, Math.PI * 2);
          ctx.fill();
        }

        function frame(now) {
          const dt = Math.min(0.05, (now - last) / 1000);
          last = now;
          if (started && !over) {
            time += dt;
            // حركة الحارس
            if (!gk.dive) {
              gk.x += gk.v * dt;
              if (Math.abs(gk.x) > 2.1 || rng.chance(dt * 0.6)) gk.v = -gk.v * rng.float(0.8, 1.25);
              gk.v = U.clamp(gk.v, -2.4, 2.4);
              if (Math.abs(gk.v) < 0.8) gk.v = Math.sign(gk.v || 1) * 1.2;
              gk.x = U.clamp(gk.x, -2.2, 2.2);
            }
            if (flight) {
              flight.t += dt;
              if (!gk.dive && flight.t > flight.react) {
                gk.dive = 1;
                gk.diveDir = Math.sign(flight.tx - gk.x) || 1;
                gk.diveTo = U.clamp(flight.tx, gk.x - 1.3, gk.x + 1.3);
              }
              if (gk.dive) gk.x += (gk.diveTo - gk.x) * Math.min(1, dt * 9);
              if (flight.t >= flight.dur) {
                resolveShot(flight);
                flight = null;
                pause = 0.55;
              }
            } else if (pause > 0) {
              pause -= dt;
              if (pause <= 0) {
                gk.dive = 0;
                resetBall();
              }
            }
            const left = Math.max(0, dur - time);
            tEl.textContent = Math.ceil(left);
            timerBar.style.width = (100 * left) / dur + '%';
            if (left <= 0 && !flight) finish();
          }
          draw(dt);
          raf = requestAnimationFrame(frame);
        }
        raf = requestAnimationFrame(frame);
      });
    },
  };
})(globalThis);
