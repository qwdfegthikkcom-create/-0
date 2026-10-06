/* =========================================================
   أدوات الرسم على canvas: الملعب، اللاعبون، الكرة، الكاميرا
   الإحداثيات بالمتر (x عرض 0–68، y طول 0–105) وتُحوَّل إلى بكسلات عبر الكاميرا
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC = G.FC || {};
  const U = FC.util;
  const W = 68;
  const L = 105;

  const D = (FC.Draw = {
    // تجهيز canvas بدقة الشاشة
    setup(canvas) {
      const dpr = Math.min(2, G.devicePixelRatio || 1);
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { ctx, w: r.width, h: r.height, dpr };
    },

    // كاميرا جديدة
    camera(w, h, x, y) {
      const s = Math.min(w / 32, h / 40);
      return { x, y, s, w, h };
    },

    // تحويل متر → بكسل
    sx: (c, x) => c.w / 2 + (x - c.x) * c.s,
    sy: (c, y) => c.h / 2 - (y - c.y) * c.s,
    // تحويل بكسل → متر
    mx: (c, px) => c.x + (px - c.w / 2) / c.s,
    my: (c, py) => c.y - (py - c.h / 2) / c.s,

    // متابعة ناعمة لهدف (مع إبقاء المرمى ظاهراً)
    follow(c, tx, ty, dt, keepGoal) {
      const vw = c.w / c.s;
      const vh = c.h / c.s;
      let cx = U.clamp(tx, vw / 2 - 4, W - vw / 2 + 4);
      let cy = ty + vh * 0.12;
      if (keepGoal) cy = Math.max(cy, Math.min(L + 5 - vh / 2, ty + vh * 0.3));
      cy = Math.min(cy, L + 6 - vh / 2);
      cy = Math.max(cy, vh / 2 - 6);
      const k = 1 - Math.exp(-dt * 4);
      c.x += (cx - c.x) * k;
      c.y += (cy - c.y) * k;
    },

    // الملعب: عشب بخطوط، خطوط بيضاء، مرميان بشباك
    pitch(ctx, c) {
      const sx = (x) => D.sx(c, x);
      const sy = (y) => D.sy(c, y);
      // المدرجات حول الملعب
      ctx.fillStyle = '#07140e';
      ctx.fillRect(0, 0, c.w, c.h);
      // العشب المخطط
      const stripe = 5.25;
      for (let i = 0; i < 20; i++) {
        const y0 = i * stripe;
        ctx.fillStyle = i % 2 ? '#10653f' : '#0e5a3a';
        const top = sy(y0 + stripe);
        ctx.fillRect(sx(-3), top, (W + 6) * c.s, stripe * c.s + 1);
      }
      // لمعان خفيف في الوسط (إضاءة الملعب)
      const g = ctx.createRadialGradient(c.w / 2, c.h * 0.4, 10, c.w / 2, c.h * 0.4, Math.max(c.w, c.h));
      g.addColorStop(0, 'rgba(255,255,230,0.07)');
      g.addColorStop(1, 'rgba(0,0,0,0.25)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, c.w, c.h);
      ctx.strokeStyle = 'rgba(255,255,255,0.78)';
      ctx.lineWidth = Math.max(1.2, 0.12 * c.s);
      ctx.strokeRect(sx(0), sy(L), W * c.s, L * c.s);
      ctx.beginPath();
      ctx.moveTo(sx(0), sy(L / 2));
      ctx.lineTo(sx(W), sy(L / 2));
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(sx(34), sy(L / 2), 9.15 * c.s, 0, Math.PI * 2);
      ctx.stroke();
      [0, 1].forEach((end) => {
        const dir = end ? -1 : 1;
        const gy = end ? L : 0;
        // منطقة الجزاء ومنطقة المرمى
        ctx.strokeRect(sx(34 - 20.16), sy(end ? L : 16.5), 40.32 * c.s, 16.5 * c.s);
        ctx.strokeRect(sx(34 - 9.16), sy(end ? L : 5.5), 18.32 * c.s, 5.5 * c.s);
        // نقطة الجزاء والقوس
        const py = gy + dir * 11;
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath();
        ctx.arc(sx(34), sy(py), 0.25 * c.s, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        const a0 = Math.acos(5.5 / 9.15);
        if (end) ctx.arc(sx(34), sy(py), 9.15 * c.s, a0, Math.PI - a0);
        else ctx.arc(sx(34), sy(py), 9.15 * c.s, Math.PI + a0, 2 * Math.PI - a0);
        ctx.stroke();
        D.goal(ctx, c, end);
      });
    },

    // المرمى والشباك
    goal(ctx, c, top) {
      const sx = (x) => D.sx(c, x);
      const sy = (y) => D.sy(c, y);
      const y0 = top ? L : 0;
      const depth = top ? 2 : -2;
      const x0 = sx(34 - 3.66);
      const x1 = sx(34 + 3.66);
      const ya = sy(y0);
      const yb = sy(y0 + depth);
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(x0, Math.min(ya, yb), x1 - x0, Math.abs(yb - ya));
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1;
      const step = Math.max(4, 0.5 * c.s);
      for (let x = x0; x <= x1; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, ya);
        ctx.lineTo(x, yb);
        ctx.stroke();
      }
      for (let y = Math.min(ya, yb); y <= Math.max(ya, yb); y += step) {
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.lineTo(x1, y);
        ctx.stroke();
      }
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(2, 0.2 * c.s);
      ctx.beginPath();
      ctx.moveTo(x0, ya);
      ctx.lineTo(x0, yb);
      ctx.lineTo(x1, yb);
      ctx.lineTo(x1, ya);
      ctx.stroke();
      ctx.restore();
    },

    // لاعب: ظل، قميص بلون الفريق، رقم، اتجاه النظر
    player(ctx, c, e, kit, opts) {
      opts = opts || {};
      const x = D.sx(c, e.x);
      const y = D.sy(c, e.y);
      const r = Math.max(6, 0.82 * c.s);
      // ظل
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(x + r * 0.25, y + r * 0.35, r * 1.02, r * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      // توهج لاعبك
      if (opts.me) {
        const t = (G.performance ? G.performance.now() : Date.now()) / 400;
        ctx.strokeStyle = 'rgba(212,175,55,' + (0.55 + 0.35 * Math.sin(t)) + ')';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, r + 5 + Math.sin(t) * 1.5, 0, Math.PI * 2);
        ctx.stroke();
      } else if (opts.tap) {
        ctx.strokeStyle = 'rgba(245,240,225,0.45)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(x, y, r + 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      // الجسم
      const grd = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
      grd.addColorStop(0, D.lighten(kit[0], 0.35));
      grd.addColorStop(1, kit[0]);
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = U.luma(kit[0]) > 0.7 ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // اتجاه النظر
      const f = e.face != null ? e.face : Math.PI / 2;
      const fx = x + Math.cos(f) * r * 0.95;
      const fy = y - Math.sin(f) * r * 0.95;
      ctx.fillStyle = kit[1];
      ctx.beginPath();
      ctx.arc(fx, fy, Math.max(1.8, r * 0.22), 0, Math.PI * 2);
      ctx.fill();
      // الرقم
      ctx.fillStyle = kit[1];
      ctx.font = '700 ' + Math.round(r * 1.05) + 'px Tajawal, Tahoma, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(e.num || ''), x, y + 1);
      if (opts.label) {
        ctx.font = '700 ' + Math.max(10, Math.round(r * 0.95)) + 'px Tajawal, Tahoma, sans-serif';
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        const tw = ctx.measureText(opts.label).width + 8;
        ctx.fillRect(x - tw / 2, y - r - 18, tw, 15);
        ctx.fillStyle = opts.me ? '#F2D675' : '#F5F0E1';
        ctx.fillText(opts.label, x, y - r - 10);
      }
    },

    // الكرة مع الظل والارتفاع
    ball(ctx, c, b) {
      const x = D.sx(c, b.x);
      const y = D.sy(c, b.y);
      const r = Math.max(3.5, 0.34 * c.s) * (1 + b.z * 0.09);
      const lift = b.z * c.s * 0.55;
      ctx.fillStyle = 'rgba(0,0,0,' + U.clamp(0.4 - b.z * 0.05, 0.12, 0.4) + ')';
      ctx.beginPath();
      ctx.ellipse(x + b.z * 1.5, y + 1, r * (1 + b.z * 0.05), r * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      const by = y - lift;
      const g = ctx.createRadialGradient(x - r * 0.35, by - r * 0.35, r * 0.1, x, by, r);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(1, '#cfd3d6');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, by, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1b1b1b';
      ctx.beginPath();
      ctx.arc(x + r * 0.15, by + r * 0.05, r * 0.33, 0, Math.PI * 2);
      ctx.fill();
    },

    // تفتيح لون
    lighten(hex, t) {
      const h = hex.replace('#', '');
      const n = parseInt(h.length === 3 ? h.split('').map((q) => q + q).join('') : h, 16);
      const f = (v) => Math.round(v + (255 - v) * t);
      return 'rgb(' + f((n >> 16) & 255) + ',' + f((n >> 8) & 255) + ',' + f(n & 255) + ')';
    },

    // اختيار لون الحارس المختلف عن الفريقين
    gkKit(kitOpp) {
      const opts = [['#c6ff00', '#1b1b1b'], ['#ff7043', '#1b1b1b'], ['#00e5ff', '#1b1b1b'], ['#e040fb', '#ffffff']];
      return opts.find((k) => Math.abs(U.luma(k[0]) - U.luma(kitOpp[0])) > 0.15) || opts[0];
    },

    // ألوان مختلفة إذا تشابه قميصا الفريقين
    clashFix(mine, opp) {
      const d = Math.abs(U.luma(mine[0]) - U.luma(opp[0]));
      if (d < 0.12 && mine[0].toLowerCase() !== opp[0].toLowerCase()) return opp;
      if (mine[0].toLowerCase() === opp[0].toLowerCase() || d < 0.12) return [opp[1], opp[0]];
      return opp;
    },
  });
})(globalThis);
