/* =========================================================
   رسم المباراة الكاملة بمنظور ثلاثي الأبعاد (بدون مكتبات)
   - كاميرا حقيقية: موضع + نقطة نظر + بُعد بؤري، مع قص الأشياء خلف الكاميرا
   - كاميرتان: «تلفزيونية» من جانب الملعب، و«خلف اللاعب» مثل وضع احترف
   - الملعب: عشب مخطط، خطوط، مرميان بشباك، لوحات إعلانية، مدرجات بجمهور وأضواء
   - اللاعبون: أجسام مرسومة بحركة جري، انزلاق، سقوط، ارتماء الحارس
   الإحداثيات بالمتر: x طول الملعب 0–105، y عرضه 0–68، z الارتفاع
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC = G.FC || {};
  const U = FC.util;

  const L = 105;
  const W = 68;
  const GY = 34;
  const POST = 3.66;
  const BAR = 2.44;
  const NEAR = 0.6;
  const hyp = Math.hypot;
  const SKINS = ['#f6d7c3', '#e8b894', '#d39b6f', '#b57a4f', '#8d5a36', '#5e3a22'];
  const HAIRS = ['#141414', '#3b2314', '#6b4423', '#a0703a', '#d8b36a'];

  // لون ثابت لكل لاعب ذكاء اصطناعي (بشرة وشعر) من رقمه
  function looks(e) {
    if (e.isUser && e.p.face) {
      const f = e.p.face;
      return { skin: SKINS[f.skin || 0] || SKINS[1], hair: HAIRS[f.hairCol || 0] || HAIRS[0], bald: f.hair === 0 };
    }
    const h = ((e.pid || 0) * 2654435761) >>> 0;
    return { skin: SKINS[h % 6], hair: HAIRS[(h >> 4) % 5], bald: (h >> 9) % 11 === 0 };
  }

  function rgba(hex, a) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((q) => q + q).join('') : h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function shade(hex, t) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((q) => q + q).join('') : h, 16);
    const f = (v) => Math.round(U.clamp(t < 0 ? v * (1 + t) : v + (255 - v) * t, 0, 255));
    return 'rgb(' + f((n >> 16) & 255) + ',' + f((n >> 8) & 255) + ',' + f(n & 255) + ')';
  }

  // ================= الكاميرا =================
  function basis(R) {
    const c = R.cam;
    let fx = c.tx - c.x;
    let fy = c.ty - c.y;
    let fz = c.tz - c.z;
    const fl = Math.sqrt(fx * fx + fy * fy + fz * fz) || 1;
    fx /= fl;
    fy /= fl;
    fz /= fl;
    let rx = fy;
    let ry = -fx;
    const rl = hyp(rx, ry) || 1;
    rx /= rl;
    ry /= rl;
    // الأعلى = اليمين × الأمام
    const ux = ry * fz;
    const uy = -rx * fz;
    const uz = rx * fy - ry * fx;
    R.B = { fx, fy, fz, rx, ry, ux, uy, uz, f: R.focal, cx: R.w / 2, cy: R.h * R.cyK };
  }
  function toCam(R, x, y, z) {
    const B = R.B;
    const c = R.cam;
    const dx = x - c.x;
    const dy = y - c.y;
    const dz = z - c.z;
    return [dx * B.rx + dy * B.ry, dx * B.ux + dy * B.uy + dz * B.uz, dx * B.fx + dy * B.fy + dz * B.fz];
  }
  function proj(R, p) {
    const s = R.B.f / p[2];
    return [R.B.cx + p[0] * s, R.B.cy - p[1] * s, s];
  }
  // نقطة من العالم إلى الشاشة (أو null إن كانت خلف الكاميرا)
  function P(R, x, y, z) {
    const c = toCam(R, x, y, z || 0);
    if (c[2] < NEAR) return null;
    return proj(R, c);
  }
  // قص مضلع أمام المستوى القريب
  function clipNear(poly) {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      const ina = a[2] >= NEAR;
      const inb = b[2] >= NEAR;
      if (ina) out.push(a);
      if (ina !== inb) {
        const t = (NEAR - a[2]) / (b[2] - a[2]);
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, NEAR]);
      }
    }
    return out;
  }
  function pathPoly(R, pts) {
    const cam = clipNear(pts.map((p) => toCam(R, p[0], p[1], p[2] || 0)));
    if (cam.length < 3) return false;
    const ctx = R.ctx;
    ctx.beginPath();
    cam.forEach((c, i) => {
      const s = proj(R, c);
      if (i) ctx.lineTo(s[0], s[1]);
      else ctx.moveTo(s[0], s[1]);
    });
    ctx.closePath();
    return true;
  }
  function fillPoly(R, pts, style) {
    if (pathPoly(R, pts)) {
      R.ctx.fillStyle = style;
      R.ctx.fill();
    }
  }
  // قطعة مستقيمة (تُضاف إلى المسار الحالي)
  function seg(R, a, b) {
    let ca = toCam(R, a[0], a[1], a[2] || 0);
    let cb = toCam(R, b[0], b[1], b[2] || 0);
    if (ca[2] < NEAR && cb[2] < NEAR) return;
    if (ca[2] < NEAR || cb[2] < NEAR) {
      const t = (NEAR - ca[2]) / (cb[2] - ca[2]);
      const m = [ca[0] + (cb[0] - ca[0]) * t, ca[1] + (cb[1] - ca[1]) * t, NEAR];
      if (ca[2] < NEAR) ca = m;
      else cb = m;
    }
    const sa = proj(R, ca);
    const sb = proj(R, cb);
    R.ctx.moveTo(sa[0], sa[1]);
    R.ctx.lineTo(sb[0], sb[1]);
  }
  function arc(R, cx, cy, r, a0, a1, n) {
    let prev = null;
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      const p = [cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0];
      if (prev) seg(R, prev, p);
      prev = p;
    }
  }

  // ================= متابعة الكاميرا =================
  const MODES = ['tv', 'pro', 'wide'];
  function updateCam(R, fm, dt) {
    const b = fm.ball;
    const land = R.w >= R.h * 1.05;
    const k = 1 - Math.exp(-dt * (R.snap ? 60 : 3.2));
    R.snap = false;
    let want;
    const u = fm.user && !fm.user.off ? fm.user : null;
    // اتجاه «الأعلى» في الوضع العمودي: نحو مرمى الخصم لفريقك
    const mySi = fm.m.user ? fm.m.user.si : 0;
    const dir = fm.teams[mySi].dir;
    if (R.mode === 'pro' && u) {
      // خلف لاعبك باتجاه مرمى الخصم
      const d = u.T.dir;
      const ax = u.x * 0.72 + b.x * 0.28;
      const ay = u.y * 0.72 + b.y * 0.28;
      if (land) {
        want = { x: ax - d * 14, y: ay * 0.8 + GY * 0.2, z: 10, tx: ax + d * 15, ty: ay * 0.9 + GY * 0.1, tz: 0 };
        R.visW = 40;
        R.cyK = 0.46;
      } else {
        want = { x: ax - d * 11, y: ay * 0.85 + GY * 0.15, z: 15, tx: ax + d * 11, ty: ay, tz: 0 };
        R.visW = 30;
        R.cyK = 0.47;
      }
    } else if (!land) {
      // الوضع العمودي: كاميرا عالية من خلف فريقك (طول الملعب عمودي على الشاشة)
      const wide = R.mode === 'wide';
      const ax = U.clamp(b.x, 8, L - 8);
      const ay = GY + (b.y - GY) * 0.75;
      const back = wide ? 22 : 16;
      want = { x: ax - dir * back, y: ay, z: wide ? 34 : 24, tx: ax + dir * (wide ? 8 : 6), ty: ay, tz: 0 };
      R.visW = wide ? 50 : 38;
      R.cyK = 0.48;
    } else {
      // تلفزيونية من جانب الملعب
      const wide = R.mode === 'wide';
      const dist = 50 * (wide ? 1.35 : 1);
      const el = 0.42;
      const tx = U.clamp(b.x, 17, L - 17);
      const ty = GY + (b.y - GY) * 0.38;
      want = { x: tx, y: ty - dist * Math.cos(el), z: dist * Math.sin(el), tx, ty: ty + 3, tz: 0 };
      R.visW = 44 * (wide ? 1.35 : 1);
      R.cyK = 0.56;
    }
    const c = R.cam;
    ['x', 'y', 'z', 'tx', 'ty', 'tz'].forEach((q) => (c[q] += (want[q] - c[q]) * k));
    const dist = hyp(c.tx - c.x, c.ty - c.y, c.tz - c.z);
    R.focal = (R.w * dist) / R.visW;
    // اهتزاز خفيف عند الهدف
    if (R.shake > 0) {
      R.shake -= dt;
      c.z += Math.sin(R.t * 60) * 0.15 * R.shake;
    }
    basis(R);
  }

  // ================= الخلفية والمدرجات =================
  function crowdPattern(R) {
    const cv = document.createElement('canvas');
    cv.width = 160;
    cv.height = 80;
    const g = cv.getContext('2d');
    g.fillStyle = '#10141f';
    g.fillRect(0, 0, 160, 80);
    const cols = ['#e9e4d8', '#c9333a', '#2b5fb8', '#f0c541', '#1a1a1a', '#e8b894', '#8d5a36', '#2e7d4f', '#ffffff'];
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let row = 0; row < 16; row++) {
      for (let i = 0; i < 40; i++) {
        const x = i * 4 + (row % 2) * 2 + rnd();
        const y = row * 5 + rnd();
        g.fillStyle = cols[Math.floor(rnd() * cols.length)];
        g.globalAlpha = 0.55 + rnd() * 0.45;
        g.fillRect(x, y, 2.4, 2.2);
        g.fillStyle = '#e8b894';
        g.fillRect(x + 0.4, y - 1.4, 1.6, 1.4);
      }
    }
    g.globalAlpha = 1;
    return R.ctx.createPattern(cv, 'repeat');
  }

  function drawSky(R) {
    const ctx = R.ctx;
    const g = ctx.createLinearGradient(0, 0, 0, R.h);
    g.addColorStop(0, '#05070d');
    g.addColorStop(0.5, '#0b1220');
    g.addColorStop(1, '#101a2c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, R.w, R.h);
  }

  function drawStands(R) {
    const ctx = R.ctx;
    if (!R.crowd) R.crowd = crowdPattern(R);
    // أربع مدرجات مائلة حول الملعب
    const H = 24;
    const o = 9;
    const sides = [
      [[-o, W + o, 0], [L + o, W + o, 0], [L + o + 12, W + o + 22, H], [-o - 12, W + o + 22, H]],
      [[L + o, -o, 0], [L + o, W + o, 0], [L + o + 22, W + o + 12, H], [L + o + 22, -o - 12, H]],
      [[-o, -o, 0], [-o, W + o, 0], [-o - 22, W + o + 12, H], [-o - 22, -o - 12, H]],
      [[-o, -o, 0], [L + o, -o, 0], [L + o + 12, -o - 22, H], [-o - 12, -o - 22, H]],
    ];
    sides.forEach((q) => {
      if (!pathPoly(R, q)) return;
      ctx.fillStyle = R.crowd;
      ctx.fill();
      ctx.fillStyle = 'rgba(8,12,22,0.35)';
      ctx.fill();
    });
    // حافة سقف المدرجات
    ctx.strokeStyle = 'rgba(210,220,255,0.18)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    seg(R, [-o - 12, W + o + 22, H], [L + o + 12, W + o + 22, H]);
    seg(R, [L + o + 22, -o - 12, H], [L + o + 22, W + o + 12, H]);
    seg(R, [-o - 22, -o - 12, H], [-o - 22, W + o + 12, H]);
    ctx.stroke();
    // ومضات كاميرات الجمهور
    const t = R.t;
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 10; i++) {
      const ph = Math.sin(t * 3.1 + i * 12.7);
      if (ph < 0.985) continue;
      const x = ((i * 37.3) % 120) - 8;
      const p = P(R, x, W + o + 4 + (i % 4) * 4, 4 + (i % 4) * 4);
      if (p) {
        ctx.globalAlpha = (ph - 0.985) * 60;
        ctx.beginPath();
        ctx.arc(p[0], p[1], 1.5 + p[2] * 0.05, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawGround(R) {
    // المساحة حول الملعب
    fillPoly(R, [[-9, -9], [L + 9, -9], [L + 9, W + 9], [-9, W + 9]], '#0b4a2f');
    // العشب المخطط
    const n = 18;
    const w = L / n;
    for (let i = 0; i < n; i++) {
      fillPoly(R, [[i * w, -2], [(i + 1) * w, -2], [(i + 1) * w, W + 2], [i * w, W + 2]], i % 2 ? '#15784a' : '#12693f');
    }
  }

  function drawLines(R) {
    const ctx = R.ctx;
    ctx.strokeStyle = 'rgba(255,255,255,0.86)';
    ctx.lineWidth = Math.max(1, R.focal / 900);
    ctx.lineCap = 'round';
    ctx.beginPath();
    seg(R, [0, 0], [L, 0]);
    seg(R, [L, 0], [L, W]);
    seg(R, [L, W], [0, W]);
    seg(R, [0, W], [0, 0]);
    seg(R, [L / 2, 0], [L / 2, W]);
    arc(R, L / 2, GY, 9.15, 0, Math.PI * 2, 40);
    [0, L].forEach((gx) => {
      const d = gx === 0 ? 1 : -1;
      // منطقة الجزاء ومنطقة المرمى
      seg(R, [gx, GY - 20.16], [gx + d * 16.5, GY - 20.16]);
      seg(R, [gx + d * 16.5, GY - 20.16], [gx + d * 16.5, GY + 20.16]);
      seg(R, [gx + d * 16.5, GY + 20.16], [gx, GY + 20.16]);
      seg(R, [gx, GY - 9.16], [gx + d * 5.5, GY - 9.16]);
      seg(R, [gx + d * 5.5, GY - 9.16], [gx + d * 5.5, GY + 9.16]);
      seg(R, [gx + d * 5.5, GY + 9.16], [gx, GY + 9.16]);
      // قوس المنطقة
      const a = Math.acos(5.5 / 9.15);
      if (d > 0) arc(R, gx + 11, GY, 9.15, -a, a, 14);
      else arc(R, gx - 11, GY, 9.15, Math.PI - a, Math.PI + a, 14);
      // أقواس الركنيات
      arc(R, gx, 0, 1, d > 0 ? 0 : Math.PI / 2, d > 0 ? Math.PI / 2 : Math.PI, 5);
      arc(R, gx, W, 1, d > 0 ? -Math.PI / 2 : Math.PI, d > 0 ? 0 : Math.PI * 1.5, 5);
    });
    ctx.stroke();
    // نقاط الجزاء والمنتصف
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    [[L / 2, GY], [11, GY], [L - 11, GY]].forEach((q) => {
      const p = P(R, q[0], q[1], 0);
      if (!p) return;
      ctx.beginPath();
      ctx.ellipse(p[0], p[1], Math.max(1.2, p[2] * 0.2), Math.max(0.8, p[2] * 0.09), 0, 0, Math.PI * 2);
      ctx.fill();
    });
    // رايات الركنيات
    [[0, 0], [L, 0], [0, W], [L, W]].forEach((q) => {
      const a = P(R, q[0], q[1], 0);
      const b = P(R, q[0], q[1], 1.5);
      if (!a || !b) return;
      ctx.strokeStyle = '#ddd';
      ctx.lineWidth = Math.max(1, a[2] * 0.04);
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
      ctx.fillStyle = '#f2d675';
      ctx.beginPath();
      ctx.moveTo(b[0], b[1]);
      ctx.lineTo(b[0] + b[2] * 0.35, b[1] + b[2] * 0.12);
      ctx.lineTo(b[0], b[1] + b[2] * 0.25);
      ctx.fill();
    });
  }

  // لوحات إعلانية حول الملعب
  const ADS = ['مسيرة نجم', 'ليلة النهائي', 'دوري الأبطال', 'نجم المستقبل', 'الذهب', 'ملعب الأحلام'];
  function drawBoards(R, clubs) {
    const ctx = R.ctx;
    const h = 0.95;
    const runs = [
      { a: [0, W + 4], b: [L, W + 4] },
      { a: [L + 5, -2], b: [L + 5, W + 2] },
      { a: [-5, W + 2], b: [-5, -2] },
    ];
    if (R.mode === 'pro') runs.push({ a: [L, -4], b: [0, -4] });
    let k = 0;
    runs.forEach((r) => {
      const len = hyp(r.b[0] - r.a[0], r.b[1] - r.a[1]);
      const n = Math.max(1, Math.round(len / 12));
      for (let i = 0; i < n; i++) {
        const t0 = i / n;
        const t1 = (i + 1) / n;
        const x0 = r.a[0] + (r.b[0] - r.a[0]) * t0;
        const y0 = r.a[1] + (r.b[1] - r.a[1]) * t0;
        const x1 = r.a[0] + (r.b[0] - r.a[0]) * t1;
        const y1 = r.a[1] + (r.b[1] - r.a[1]) * t1;
        const col = k % 3 === 0 ? clubs[0].c1 : k % 3 === 1 ? '#0d1a33' : clubs[1].c1;
        k++;
        if (!pathPoly(R, [[x0, y0, 0], [x1, y1, 0], [x1, y1, h], [x0, y0, h]])) continue;
        ctx.fillStyle = col;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();
        // نص اللوحة (تقريبي: في منتصف اللوحة بحجم المسافة)
        const mid = P(R, (x0 + x1) / 2, (y0 + y1) / 2, h / 2);
        const pa = P(R, x0, y0, h / 2);
        const pb = P(R, x1, y1, h / 2);
        if (mid && pa && pb && mid[2] > 4) {
          const wpx = Math.abs(pb[0] - pa[0]);
          if (wpx > 40) {
            ctx.save();
            ctx.fillStyle = col === '#0d1a33' ? '#f2d675' : U.luma(col) > 0.6 ? '#111' : '#fff';
            ctx.font = '700 ' + Math.min(26, Math.max(7, mid[2] * 0.62)) + 'px Tajawal, Tahoma, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(ADS[(i + k) % ADS.length], mid[0], mid[1], wpx * 0.9);
            ctx.restore();
          }
        }
      }
    });
  }

  // المرمى: قائمان وعارضة وشباك
  function drawGoal(R, gx) {
    const ctx = R.ctx;
    const d = gx === 0 ? -1 : 1;
    const back = gx + d * 2.2;
    const y0 = GY - POST;
    const y1 = GY + POST;
    // الشباك (نصف شفافة)
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) {
      const y = y0 + ((y1 - y0) * i) / 10;
      seg(R, [gx, y, BAR], [back, y, BAR * 0.7]);
      seg(R, [back, y, BAR * 0.7], [back, y, 0]);
    }
    for (let j = 0; j <= 4; j++) {
      const z = (BAR * 0.7 * j) / 4;
      seg(R, [back, y0, z], [back, y1, z]);
    }
    for (let j = 0; j <= 3; j++) {
      const x = gx + ((back - gx) * j) / 3;
      const z = BAR - (BAR * 0.3 * j) / 3;
      seg(R, [x, y0, z], [x, y1, z]);
      seg(R, [x, y0, 0], [x, y0, z]);
      seg(R, [x, y1, 0], [x, y1, z]);
    }
    ctx.stroke();
    // القائمان والعارضة
    const p = P(R, gx, GY, BAR);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1.5, (p ? p[2] : 10) * 0.12);
    ctx.beginPath();
    seg(R, [gx, y0, 0], [gx, y0, BAR]);
    seg(R, [gx, y0, BAR], [gx, y1, BAR]);
    seg(R, [gx, y1, BAR], [gx, y1, 0]);
    ctx.stroke();
  }

  // ================= اللاعبون =================
  function drawShadow(R, x, y, r, a) {
    const p = P(R, x, y, 0);
    if (!p) return;
    const ctx = R.ctx;
    ctx.fillStyle = 'rgba(0,0,0,' + a + ')';
    ctx.beginPath();
    ctx.ellipse(p[0], p[1], Math.max(1, r * p[2]), Math.max(0.6, r * p[2] * 0.4), 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function kitOf(R, e) {
    const k = R.kits[e.si];
    return e.isGK ? R.gk[e.si] : k;
  }

  // رسم جسم لاعب عند نقطة القدمين
  function drawMan(R, e, fm) {
    const ctx = R.ctx;
    const p = P(R, e.x, e.y, 0);
    if (!p) return;
    const s = p[2];
    if (p[0] < -60 || p[0] > R.w + 60 || p[1] < -200 || p[1] > R.h + 120) return;
    const kit = kitOf(R, e);
    const look = e.look || (e.look = looks(e));
    const B = R.B;
    // اتجاه الوجه بالنسبة للكاميرا
    const fcx = Math.cos(e.face) * B.rx + Math.sin(e.face) * B.ry; // يمين/يسار الشاشة
    const fcz = Math.cos(e.face) * B.fx + Math.sin(e.face) * B.fy; // بعيداً عن الكاميرا
    const sp = hyp(e.vx, e.vy);
    const ph = e.anim * 1.7;
    const amp = Math.min(1, sp / 5.5) * 0.36;
    const x = p[0];
    const y = p[1];
    const lw = Math.max(1.2, 0.17 * s);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // وضعيات خاصة: انزلاق، سقوط، ارتماء
    let rot = 0;
    let lift = 0;
    if (e.slide) rot = (fcx >= 0 ? 1 : -1) * 1.25;
    else if (e.down > 0) rot = (fcx >= 0 ? 1 : -1) * 1.45;
    else if (e.isGK && e.dive && fm.t >= e.dive.at && fm.t < e.dive.until) {
      const dy = e.dive.ty - e.y;
      const scr = dy * B.ry + 0 * B.rx; // اتجاه الارتماء على الشاشة
      rot = (scr >= 0 ? 1 : -1) * 1.1;
      lift = 0.35;
    }
    ctx.save();
    ctx.translate(x, y - lift * s);
    if (rot) {
      ctx.rotate(rot);
      ctx.translate(0, 0.25 * s);
    }
    const hip = -0.92 * s;
    const sh = -1.42 * s;
    const side = Math.abs(fcx) > 0.5;
    // الساقان
    const sock = kit[2] || kit[1];
    for (let i = -1; i <= 1; i += 2) {
      const sw = Math.sin(ph + (i > 0 ? 0 : Math.PI)) * amp;
      const fx = side ? sw * Math.sign(fcx) * s : i * 0.12 * s + sw * 0.25 * s * Math.sign(fcx || 1);
      const fy = side ? 0 : -Math.max(0, sw) * 0.18 * s * (fcz > 0 ? -1 : 1);
      const hx = i * 0.1 * s;
      const kx = (hx + fx) / 2 + (side ? Math.sign(fcx) * 0.08 * s : 0);
      const ky = hip * 0.45 - Math.abs(sw) * 0.12 * s;
      ctx.strokeStyle = sock;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(hx, hip);
      ctx.lineTo(kx, ky);
      ctx.lineTo(fx, fy - 0.04 * s);
      ctx.stroke();
      // الحذاء
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.ellipse(fx + (side ? Math.sign(fcx) * 0.06 * s : 0), fy - 0.03 * s, Math.max(1, 0.11 * s), Math.max(0.8, 0.05 * s), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // الشورت
    ctx.fillStyle = kit[1];
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(-0.23 * s, hip - 0.12 * s, 0.46 * s, 0.3 * s, 0.06 * s) : ctx.rect(-0.23 * s, hip - 0.12 * s, 0.46 * s, 0.3 * s);
    ctx.fill();
    // الذراعان
    const armSw = Math.sin(ph) * amp * 0.8;
    const celebrate = e.celebrate && fm.t < e.celebrate;
    ctx.strokeStyle = kit[0];
    ctx.lineWidth = lw * 0.85;
    for (let i = -1; i <= 1; i += 2) {
      const ax = i * 0.26 * s;
      let hx;
      let hy;
      if (celebrate) {
        hx = i * 0.42 * s;
        hy = sh - 0.55 * s;
      } else if (e.isGK && rot && e.dive) {
        hx = i * 0.1 * s;
        hy = sh - 0.62 * s;
      } else {
        hx = ax + (side ? -armSw * Math.sign(fcx) * i * s : i * 0.05 * s);
        hy = sh + 0.55 * s - Math.abs(armSw) * 0.1 * s;
      }
      ctx.beginPath();
      ctx.moveTo(ax, sh + 0.05 * s);
      ctx.lineTo(hx, hy);
      ctx.stroke();
      ctx.fillStyle = e.isGK ? '#f5f5f5' : look.skin;
      ctx.beginPath();
      ctx.arc(hx, hy, Math.max(0.8, 0.055 * s), 0, Math.PI * 2);
      ctx.fill();
    }
    // الجذع
    const tw = 0.5 * s;
    const grd = ctx.createLinearGradient(-tw / 2, 0, tw / 2, 0);
    grd.addColorStop(0, shade(kit[0], -0.25));
    grd.addColorStop(0.5, kit[0]);
    grd.addColorStop(1, shade(kit[0], -0.35));
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.moveTo(-0.22 * s, hip - 0.08 * s);
    ctx.lineTo(0.22 * s, hip - 0.08 * s);
    ctx.lineTo(0.27 * s, sh + 0.02 * s);
    ctx.quadraticCurveTo(0, sh - 0.1 * s, -0.27 * s, sh + 0.02 * s);
    ctx.closePath();
    ctx.fill();
    // الرقم على الظهر (عندما يبتعد عن الكاميرا)
    if (s > 11 && fcz > 0.25) {
      ctx.fillStyle = kit[1] === kit[0] ? '#fff' : kit[1];
      ctx.font = '700 ' + (0.3 * s) + 'px Tahoma, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(e.num || ''), 0, (hip + sh) / 2);
    } else if (s > 11) {
      // ياقة
      ctx.strokeStyle = kit[1];
      ctx.lineWidth = Math.max(1, 0.04 * s);
      ctx.beginPath();
      ctx.arc(0, sh + 0.02 * s, 0.08 * s, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
    // الرأس
    const hy = sh - 0.2 * s;
    const hr = Math.max(1.3, 0.12 * s);
    ctx.fillStyle = look.skin;
    ctx.beginPath();
    ctx.arc(0, hy, hr, 0, Math.PI * 2);
    ctx.fill();
    if (!look.bald) {
      ctx.fillStyle = look.hair;
      ctx.beginPath();
      if (fcz > 0.3) ctx.arc(0, hy, hr, 0, Math.PI * 2);
      else ctx.arc(0, hy - hr * 0.1, hr, Math.PI * 1.02, Math.PI * 1.98);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawBall(R, b) {
    const ctx = R.ctx;
    drawShadow(R, b.x, b.y, 0.16 + Math.min(0.2, b.z * 0.05), Math.max(0.12, 0.45 - b.z * 0.08));
    const p = P(R, b.x, b.y, b.z + 0.11);
    if (!p) return;
    const r = Math.max(2.2, 0.11 * p[2]);
    const g = ctx.createRadialGradient(p[0] - r * 0.35, p[1] - r * 0.35, r * 0.1, p[0], p[1], r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, '#b9bcc4');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p[0], p[1], r, 0, Math.PI * 2);
    ctx.fill();
    if (r > 3.5) {
      const a = (b.x + b.y) * 1.3;
      ctx.fillStyle = '#23252b';
      ctx.beginPath();
      ctx.arc(p[0] + Math.cos(a) * r * 0.4, p[1] + Math.sin(a) * r * 0.4, r * 0.3, 0, Math.PI * 2);
      ctx.arc(p[0] + Math.cos(a + 2.4) * r * 0.55, p[1] + Math.sin(a + 2.4) * r * 0.55, r * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // حلقة تحت لاعبك وسهم فوقه، ومؤشر حامل الكرة
  function drawMarkers(R, fm) {
    const ctx = R.ctx;
    const u = fm.user;
    const c = fm.ball.owner;
    if (c && c !== u && !c.off) ring(R, c.x, c.y, 0.75, 'rgba(255,255,255,0.55)', 1.5);
    if (u && !u.off) {
      const pulse = 0.85 + Math.sin(R.t * 6) * 0.08;
      ring(R, u.x, u.y, 0.95 * pulse, '#f2d675', 2.5);
      // سهم اتجاه الحركة
      const p = P(R, u.x, u.y, 2.25);
      if (p) {
        const s = Math.max(6, p[2] * 0.28);
        ctx.fillStyle = '#f2d675';
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p[0], p[1] + s * 0.9);
        ctx.lineTo(p[0] - s * 0.55, p[1]);
        ctx.lineTo(p[0] + s * 0.55, p[1]);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // الاسم والطاقة
        ctx.font = '700 ' + U.clamp(p[2] * 0.3, 10, 15) + 'px Tajawal, Tahoma, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        const nm = u.name;
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.strokeText(nm, p[0], p[1] - 3);
        ctx.fillStyle = '#fff';
        ctx.fillText(nm, p[0], p[1] - 3);
        const bw = 34;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(p[0] - bw / 2, p[1] - 22 - U.clamp(p[2] * 0.3, 10, 15), bw, 4);
        ctx.fillStyle = u.sta > 0.5 ? '#3fbf7f' : u.sta > 0.3 ? '#e0b04a' : '#e05a5a';
        ctx.fillRect(p[0] - bw / 2, p[1] - 22 - U.clamp(p[2] * 0.3, 10, 15), bw * u.sta, 4);
      }
      // مؤشر التمريرة القادمة لك
      const b = fm.ball;
      if (!b.owner && b.passTarget === u) ring(R, b.x, b.y, 0.5, 'rgba(242,214,117,0.8)', 1.5);
    }
  }
  function ring(R, x, y, r, col, w) {
    const ctx = R.ctx;
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.beginPath();
    arc(R, x, y, r, 0, Math.PI * 2, 18);
    ctx.stroke();
  }

  // خريطة مصغرة (رادار)
  function drawRadar(R, fm) {
    const ctx = R.ctx;
    const land = R.w >= R.h * 1.05;
    const w = land ? Math.min(140, R.w * 0.17) : Math.min(120, R.h * 0.15);
    const h = (w * W) / L;
    const x0 = land ? (R.w - w) / 2 : 10;
    const y0 = land ? R.h - h - 8 : R.radarTop || 140;
    ctx.fillStyle = 'rgba(6,20,14,0.5)';
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    if (land) {
      ctx.fillRect(x0, y0, w, h);
      ctx.strokeRect(x0, y0, w, h);
      ctx.beginPath();
      ctx.moveTo(x0 + w / 2, y0);
      ctx.lineTo(x0 + w / 2, y0 + h);
      ctx.stroke();
    }
    // اتجاه الرادار: أفقياً مثل الكاميرا التلفزيونية، وعمودياً (هجوم فريقك للأعلى) في الوضع العمودي
    let X = (x) => x0 + (x / L) * w;
    let Y = (y) => y0 + h - (y / W) * h;
    if (!land) {
      const dir = fm.teams[fm.m.user ? fm.m.user.si : 0].dir;
      const rw = (w * W) / L;
      const rh = w;
      const X2 = (x, y) => x0 + (dir > 0 ? (W - y) / W : y / W) * rw;
      const Y2 = (x) => y0 + (dir > 0 ? (L - x) / L : x / L) * rh;
      ctx.fillRect(x0, y0, rw, rh);
      ctx.strokeRect(x0, y0, rw, rh);
      ctx.beginPath();
      ctx.moveTo(x0, y0 + rh / 2);
      ctx.lineTo(x0 + rw, y0 + rh / 2);
      ctx.stroke();
      dots(ctx, fm, R, (e) => X2(e.x, e.y), (e) => Y2(e.x));
      return;
    }
    dots(ctx, fm, R, (e) => X(e.x), (e) => Y(e.y));
  }
  function dots(ctx, fm, R, fx, fy) {
    fm.all.forEach((e) => {
      if (e.off) return;
      const k = kitOf(R, e);
      ctx.fillStyle = e.isUser ? '#f2d675' : k[0];
      ctx.strokeStyle = e.isUser ? '#000' : 'rgba(0,0,0,0.6)';
      ctx.beginPath();
      ctx.arc(fx(e), fy(e), e.isUser ? 3.6 : 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(fx(fm.ball), fy(fm.ball), 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // تأثيرات بسيطة (غبار الانزلاق، شرارة التسديد)
  function drawFx(R) {
    const ctx = R.ctx;
    R.parts = R.parts.filter((q) => R.t - q.t0 < q.life);
    R.parts.forEach((q) => {
      const k = (R.t - q.t0) / q.life;
      const p = P(R, q.x, q.y, q.z || 0);
      if (!p) return;
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = q.col;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(p[0], p[1], p[2] * (0.3 + k * 1.2), p[2] * (0.12 + k * 0.45), 0, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
  }

  // توهج الأضواء والتظليل
  function drawLights(R) {
    const ctx = R.ctx;
    const g = ctx.createRadialGradient(R.w / 2, R.h * 0.45, Math.min(R.w, R.h) * 0.3, R.w / 2, R.h * 0.45, Math.max(R.w, R.h) * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.38)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, R.w, R.h);
  }

  // ================= الواجهة العامة =================
  function create(canvas) {
    const R = {
      canvas, ctx: canvas.getContext('2d'), w: 1, h: 1, dpr: 1,
      mode: 'tv', cam: { x: L / 2, y: -30, z: 22, tx: L / 2, ty: GY, tz: 0 }, focal: 800, cyK: 0.5, visW: 44,
      kits: null, gk: null, crowd: null, t: 0, parts: [], shake: 0, snap: true, radarBottom: 150,
    };
    R.resize = function () {
      const dpr = Math.min(2, G.devicePixelRatio || 1);
      const r = canvas.getBoundingClientRect();
      R.w = Math.max(1, r.width);
      R.h = Math.max(1, r.height);
      R.dpr = dpr;
      canvas.width = Math.round(R.w * dpr);
      canvas.height = Math.round(R.h * dpr);
      R.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      R.crowd = null;
      R.snap = true;
    };
    R.setMode = function (m) {
      R.mode = MODES.includes(m) ? m : 'tv';
    };
    R.nextMode = function () {
      R.mode = MODES[(MODES.indexOf(R.mode) + 1) % MODES.length];
      return R.mode;
    };
    // ألوان الفريقين والحارسين
    R.setKits = function (fm) {
      const D = FC.Draw;
      const c0 = fm.teams[0].club;
      const c1 = fm.teams[1].club;
      const k0 = [c0.c1, c0.c2, c0.c2];
      const k1raw = [c1.c1, c1.c2, c1.c2];
      const k1 = D && D.clashFix ? D.clashFix(k0, k1raw) : k1raw;
      R.kits = [k0, [k1[0], k1[1], k1[1]]];
      const g0 = D && D.gkKit ? D.gkKit(R.kits[1]) : ['#c6ff00', '#1b1b1b'];
      const g1 = D && D.gkKit ? D.gkKit(R.kits[0]) : ['#ff7043', '#1b1b1b'];
      R.gk = [[g0[0], g0[1], g0[1]], [g1[0] === g0[0] ? '#00e5ff' : g1[0], g1[1], g1[1]]];
    };
    // تحويل اتجاه على الشاشة (للأعلى = بعيداً) إلى اتجاه في الملعب
    R.dirFromScreen = function (sx, sy) {
      const B = R.B;
      if (!B) return [sx, -sy];
      let fx = B.fx;
      let fy = B.fy;
      const fl = hyp(fx, fy) || 1;
      fx /= fl;
      fy /= fl;
      const x = B.rx * sx + fx * -sy;
      const y = B.ry * sx + fy * -sy;
      return [x, y];
    };
    // استهلاك تأثيرات المحرك
    R.fx = function (fm) {
      fm.fx.forEach((f) => {
        if (f.t === 'tackle' || f.t === 'foul') R.parts.push({ x: f.x, y: f.y, t0: R.t, life: 0.5, col: 'rgba(210,230,190,0.7)' });
        if (f.t === 'save' || f.t === 'block') R.parts.push({ x: f.x, y: f.y, z: 1, t0: R.t, life: 0.45, col: 'rgba(255,255,255,0.8)' });
        if (f.t === 'goal') R.shake = 0.8;
      });
    };
    R.draw = function (fm, dt) {
      R.t += dt;
      if (!R.kits) R.setKits(fm);
      updateCam(R, fm, dt);
      drawSky(R);
      drawStands(R);
      drawGround(R);
      drawLines(R);
      drawBoards(R, [fm.teams[0].club, fm.teams[1].club]);
      // المرمى الأبعد أولاً
      const d0 = toCam(R, 0, GY, 1)[2];
      const d1 = toCam(R, L, GY, 1)[2];
      const goals = d0 > d1 ? [0, L] : [L, 0];
      drawGoal(R, goals[0]);
      // الظلال ثم الأجسام مرتبة حسب البعد
      const list = fm.all.filter((e) => !e.off);
      list.forEach((e) => drawShadow(R, e.x, e.y, 0.42, 0.32));
      drawMarkers(R, fm);
      const items = list.map((e) => ({ e, d: toCam(R, e.x, e.y, 0)[2] }));
      items.push({ ball: true, d: toCam(R, fm.ball.x, fm.ball.y, 0)[2] - 0.2 });
      items.sort((a, b) => b.d - a.d);
      const nearGoalD = toCam(R, goals[1], GY, 1)[2];
      let goalDone = false;
      items.forEach((it) => {
        if (!goalDone && it.d < nearGoalD) {
          drawGoal(R, goals[1]);
          goalDone = true;
        }
        if (it.d < NEAR) return;
        if (it.ball) drawBall(R, fm.ball);
        else drawMan(R, it.e, fm);
      });
      if (!goalDone) drawGoal(R, goals[1]);
      drawFx(R);
      drawLights(R);
      drawRadar(R, fm);
    };
    return R;
  }

  FC.FullRender = { create, MODES };
})(globalThis);
