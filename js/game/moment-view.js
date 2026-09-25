/* =========================================================
   عرض اللحظة على canvas + التحكم باللمس/الماوس/الكيبورد
   - السحب من الكرة للخلف (مقلاع) ثم الإفلات = تسديد أو تمريرة في المساحة
   - الضغط على زميل = تمريرة أرضية له
   - زر «كرة عالية» وزر «لعب تلقائي»
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC = G.FC || {};
  const U = FC.util;

  const BANNERS = {
    goal: ['هدف!!!', 'gold'],
    goalMate: ['هدف! صناعة رائعة', 'gold'],
    saved: ['تصدٍّ!', ''],
    off: ['خارج المرمى', ''],
    post: ['في القائم!', ''],
    blocked: ['صدّها الدفاع', ''],
    lost: ['فقدت الكرة', 'bad'],
    kept: ['تمريرة ناجحة', 'ok'],
    fizzle: ['ضاعت الهجمة', ''],
  };

  FC.MomentView = {
    active: null,

    // تشغيل لحظة وانتظار نتيجتها
    play(pd, opts) {
      opts = opts || {};
      return new Promise((resolve) => {
        const D = FC.Draw;
        const sc = FC.Moment.create(pd, { auto: false });
        const kitMine = pd.kit.mine;
        const kitOpp = D.clashFix(kitMine, pd.kit.opp);
        const kitGK = D.gkKit(kitOpp);
        const root = document.getElementById('overlay');
        const el = document.createElement('div');
        el.className = 'moment';
        const esc = U.esc;
        el.innerHTML =
          '<div class="m-top">' +
          '<div class="m-clock" dir="ltr">' + esc(pd.clock || '') + "'</div>" +
          '<div class="m-head"><div class="m-title">' + esc(sc.title) + '</div><div class="m-msg">' + esc(sc.msg) + '</div></div>' +
          (pd.teams ? '<div class="m-score"><span>' + esc(pd.teams[0]) + '</span><b dir="ltr">' + pd.score[0] + ' - ' + pd.score[1] + '</b><span>' + esc(pd.teams[1]) + '</span></div>' : '') +
          '</div>' +
          '<div class="m-stage"><canvas></canvas>' +
          '<div class="m-intro"><div class="m-intro-t">' + esc(sc.title) + '</div><div class="m-intro-m">' + esc(sc.msg) + '</div><div class="m-intro-h">اضغط للبدء</div></div>' +
          '<div class="m-banner"></div>' +
          '<div class="m-power"><i></i></div>' +
          '</div>' +
          '<div class="m-bar"><div class="m-timer"><i></i></div>' +
          '<div class="m-btns"><button class="chip" data-k="lob">⤴ كرة عالية</button><button class="chip" data-k="auto">▶ لعب تلقائي</button></div>' +
          '<div class="m-hint">اسحب من الكرة للخلف ثم أفلت للتسديد • اسحب لاعبك للأمام للمراوغة • اضغط على زميل للتمرير</div></div>';
        root.appendChild(el);
        root.classList.add('show');
        const canvas = el.querySelector('canvas');
        let view = D.setup(canvas);
        const cam = D.camera(view.w, view.h, sc.ball.x, sc.ball.y + 8);
        const intro = el.querySelector('.m-intro');
        const banner = el.querySelector('.m-banner');
        const timerBar = el.querySelector('.m-timer i');
        const powerBar = el.querySelector('.m-power');
        const lobBtn = el.querySelector('[data-k=lob]');
        const autoBtn = el.querySelector('[data-k=auto]');
        let started = false;
        let aiming = null;
        let tapMate = null;
        let last = performance.now();
        const introUntil = last + (opts.introMs || 1500);
        let bannerShown = false;
        let closing = false;
        let raf = 0;
        const sparks = [];
        this.active = sc;
        sc._cam = cam;

        function start() {
          if (started) return;
          started = true;
          intro.classList.add('hide');
        }

        // موقع كيان على الشاشة
        const scr = (e) => ({ x: D.sx(cam, e.x), y: D.sy(cam, e.y) });
        function pointerXY(ev) {
          const r = canvas.getBoundingClientRect();
          return { x: ev.clientX - r.left, y: ev.clientY - r.top };
        }

        function onDown(ev) {
          ev.preventDefault();
          if (!started) {
            start();
            return;
          }
          if (sc.result || sc.ball.owner !== sc.user) return;
          const p = pointerXY(ev);
          const bp = scr(sc.ball);
          const up = scr(sc.user);
          if (Math.hypot(p.x - bp.x, p.y - bp.y) < 52 || Math.hypot(p.x - up.x, p.y - up.y) < 40) {
            // السحب للخلف = تسديد/تمرير (مقلاع)، والسحب للأمام = مراوغة بالكرة
            aiming = { x: p.x, y: p.y, x0: p.x, y0: p.y, id: ev.pointerId, mode: null };
            try {
              canvas.setPointerCapture(ev.pointerId);
            } catch (e) {
              /* تجاهل */
            }
            return;
          }
          let best = null;
          let bd = 44;
          sc.mates.forEach((m) => {
            const mp = scr(m);
            const d = Math.hypot(p.x - mp.x, p.y - mp.y);
            if (d < bd) {
              bd = d;
              best = m;
            }
          });
          tapMate = best;
        }
        function onMove(ev) {
          if (!aiming) return;
          const p = pointerXY(ev);
          aiming.x = p.x;
          aiming.y = p.y;
          if (!aiming.mode && Math.hypot(p.x - aiming.x0, p.y - aiming.y0) > 14) aiming.mode = p.y < aiming.y0 ? 'dribble' : 'aim';
          if (aiming.mode === 'dribble' && sc.ball.owner === sc.user && !sc.result) FC.Moment.inputMove(sc, D.mx(cam, p.x), D.my(cam, p.y));
        }
        function aimVec() {
          const bp = scr(sc.ball);
          const vx = bp.x - aiming.x;
          const vy = bp.y - aiming.y;
          const len = Math.hypot(vx, vy);
          return { ang: Math.atan2(-vy, vx), power: U.clamp(len / 115, 0, 1), len };
        }
        function onUp(ev) {
          if (aiming && aiming.mode === 'dribble') {
            aiming = null;
            return;
          }
          if (aiming) {
            const a = aimVec();
            aiming = null;
            if (a.power > 0.1 && !sc.result && sc.ball.owner === sc.user) {
              FC.Moment.inputKick(sc, a.ang, a.power);
              if (FC.Sound) FC.Sound.kick();
            }
            return;
          }
          if (tapMate) {
            const p = pointerXY(ev);
            const mp = scr(tapMate);
            if (Math.hypot(p.x - mp.x, p.y - mp.y) < 60 && !sc.result && sc.ball.owner === sc.user) {
              FC.Moment.inputPass(sc, tapMate);
              if (FC.Sound) FC.Sound.kick(0.6);
            }
            tapMate = null;
          }
        }
        function onKey(ev) {
          if (!started) start();
          if (sc.result || sc.ball.owner !== sc.user) return;
          const k = ev.key;
          if (k === ' ' || k === 'Enter') {
            ev.preventDefault();
            const side = sc.gk && sc.gk.x <= 34 ? 1 : -1;
            FC.Moment.inputKick(sc, Math.atan2(105 - sc.user.y, 34 + side * 2.6 - sc.user.x), 0.8);
            if (FC.Sound) FC.Sound.kick();
          } else if (k >= '1' && k <= '4') {
            const m = sc.mates[parseInt(k, 10) - 1];
            if (m) FC.Moment.inputPass(sc, m);
          } else if (k.indexOf('Arrow') === 0) {
            // مراوغة بالأسهم
            ev.preventDefault();
            const d = { ArrowUp: [0, 1], ArrowDown: [0, -1], ArrowLeft: [-1, 0.4], ArrowRight: [1, 0.4] }[k];
            FC.Moment.inputMove(sc, sc.user.x + d[0] * 5, sc.user.y + d[1] * 5);
          } else if (k === 'l' || k === 'L' || k === 'ل') toggleLob();
          else if (k === 'a' || k === 'A' || k === 'ش') toggleAuto();
        }
        function toggleLob() {
          sc.lofted = !sc.lofted;
          lobBtn.classList.toggle('on', sc.lofted);
        }
        function toggleAuto() {
          start();
          FC.Moment.setAuto(sc, !sc.auto);
          autoBtn.classList.toggle('on', sc.auto);
        }
        lobBtn.addEventListener('click', toggleLob);
        autoBtn.addEventListener('click', toggleAuto);
        canvas.addEventListener('pointerdown', onDown);
        canvas.addEventListener('pointermove', onMove);
        canvas.addEventListener('pointerup', onUp);
        canvas.addEventListener('pointercancel', () => (aiming = null));
        intro.addEventListener('pointerdown', start);
        G.addEventListener('keydown', onKey);
        const onResize = () => {
          view = D.setup(canvas);
          cam.w = view.w;
          cam.h = view.h;
          cam.s = Math.min(view.w / 32, view.h / 40);
        };
        G.addEventListener('resize', onResize);

        function showBanner() {
          bannerShown = true;
          const r = sc.result;
          let key = r.outcome;
          if (key === 'goal' && r.shooter === 'mate') key = 'goalMate';
          if (key === 'off' && sc.shot && sc.shot.post) key = 'post';
          const b = BANNERS[key] || ['', ''];
          let sub = '';
          if (r.weak && r.shooter === 'user') sub = 'بالقدم الضعيفة';
          if (key === 'kept' && sc.stats.kp) sub = 'تمريرة مفتاحية!';
          banner.innerHTML = '<div class="b-t">' + b[0] + '</div>' + (sub ? '<div class="b-s">' + sub + '</div>' : '');
          banner.className = 'm-banner show ' + b[1];
          if (FC.Sound) {
            if (r.outcome === 'goal') FC.Sound.goal();
            else if (r.outcome === 'saved' || r.outcome === 'off') FC.Sound.ooh();
          }
          if (r.outcome === 'goal' && FC.UI && FC.UI.confetti) FC.UI.confetti(90);
        }

        function close() {
          closing = true;
          cancelAnimationFrame(raf);
          G.removeEventListener('keydown', onKey);
          G.removeEventListener('resize', onResize);
          el.classList.add('out');
          setTimeout(() => {
            el.remove();
            if (!root.children.length) root.classList.remove('show');
            FC.MomentView.active = null;
            resolve(sc.result);
          }, 280);
        }

        // الرسم
        function render(dt) {
          const ctx = view.ctx;
          const owner = sc.ball.owner;
          const tgt = aiming ? sc.user : sc.ball;
          const nearGoal = sc.ball.y > 72 || (owner && owner.y > 72);
          D.follow(cam, tgt.x, tgt.y, dt, nearGoal && !sc.deep);
          D.pitch(ctx, cam);
          // خطوط التمرير المقترحة
          const canAct = owner === sc.user && !sc.result && started;
          sc.opps.forEach((e) => D.player(ctx, cam, e, kitOpp));
          if (sc.gk) D.player(ctx, cam, sc.gk, kitGK);
          sc.mates.forEach((e) => D.player(ctx, cam, e, kitMine, { tap: canAct, label: canAct ? e.name : null }));
          D.player(ctx, cam, sc.user, kitMine, { me: true, label: 'أنت' });
          // التصويب
          if (aiming && canAct && aiming.mode !== 'dribble') drawAim(ctx);
          // مسار المراوغة
          if (sc.userMove && canAct && sc.ball.owner === sc.user) {
            const up = scr(sc.user);
            ctx.strokeStyle = 'rgba(126,226,174,0.8)';
            ctx.setLineDash([6, 5]);
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(up.x, up.y);
            ctx.lineTo(D.sx(cam, sc.userMove.x), D.sy(cam, sc.userMove.y));
            ctx.stroke();
            ctx.setLineDash([]);
          }
          D.ball(ctx, cam, sc.ball);
          // شرارات المؤثرات
          for (let i = sparks.length - 1; i >= 0; i--) {
            const s = sparks[i];
            s.life -= dt;
            if (s.life <= 0) {
              sparks.splice(i, 1);
              continue;
            }
            const x = D.sx(cam, s.x);
            const y = D.sy(cam, s.y);
            ctx.strokeStyle = 'rgba(245,240,225,' + s.life * 2 + ')';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, (0.6 - s.life) * 40 + 4, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        function drawAim(ctx) {
          const a = aimVec();
          const bp = scr(sc.ball);
          const info = FC.Moment.aimInfo(sc, a.ang, a.power);
          // الشريط المطاطي
          ctx.strokeStyle = 'rgba(245,240,225,0.5)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(bp.x, bp.y);
          ctx.lineTo(aiming.x, aiming.y);
          ctx.stroke();
          // مخروط الدقة
          const len = (info.kind === 'shot' ? Math.min(info.dist + 3, 45) : 6 + a.power * (sc.lofted ? 45 : 32)) * cam.s;
          const spread = Math.min(0.5, info.sigma * 2);
          const dx = Math.cos(a.ang);
          const dy = -Math.sin(a.ang);
          const col = a.power > 0.86 ? '231,76,60' : a.power > 0.6 ? '242,214,117' : '212,175,55';
          ctx.fillStyle = 'rgba(' + col + ',0.16)';
          ctx.beginPath();
          ctx.moveTo(bp.x, bp.y);
          const ang2 = Math.atan2(dy, dx);
          ctx.arc(bp.x, bp.y, len, ang2 - spread, ang2 + spread);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = 'rgba(' + col + ',0.95)';
          ctx.setLineDash(sc.lofted ? [8, 6] : []);
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(bp.x, bp.y);
          ctx.lineTo(bp.x + dx * len * (0.35 + a.power * 0.65), bp.y + dy * len * (0.35 + a.power * 0.65));
          ctx.stroke();
          ctx.setLineDash([]);
          powerBar.classList.add('show');
          powerBar.querySelector('i').style.height = Math.round(a.power * 100) + '%';
          powerBar.classList.toggle('hot', a.power > 0.86);
          powerBar.dataset.kind = info.kind === 'shot' ? 'تسديد' : sc.lofted ? 'كرة عالية' : 'تمريرة';
        }

        function frame(now) {
          const dtReal = Math.min(0.05, (now - last) / 1000);
          last = now;
          if (!started && now > introUntil) start();
          if (started) {
            let dt = dtReal * (aiming ? FC.BAL.moments.slowMo : 1);
            while (dt > 1e-6) {
              const h = Math.min(dt, 1 / 60);
              FC.Moment.step(sc, h);
              dt -= h;
            }
          }
          if (!aiming) powerBar.classList.remove('show');
          while (sc.fx.length) {
            const f = sc.fx.shift();
            if (f.t === 'save' || f.t === 'block' || f.t === 'tackle' || f.t === 'intercept' || f.t === 'post') sparks.push({ x: f.x, y: f.y, life: 0.6 });
            if (FC.Sound && (f.t === 'kick' || f.t === 'header') && sc.auto) FC.Sound.kick(0.5);
          }
          timerBar.style.width = Math.max(0, 100 * (1 - sc.t / sc.tMax)) + '%';
          render(dtReal);
          if (sc.result && !bannerShown) showBanner();
          if (sc.over && !closing) close();
          else if (!closing) raf = requestAnimationFrame(frame);
        }
        raf = requestAnimationFrame(frame);
      });
    },
  };
})(globalThis);
