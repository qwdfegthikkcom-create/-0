/* =========================================================
   عناصر الواجهة المشتركة: أيقونات، أعلام SVG، وجه SVG مولّد، شعار النادي،
   بطاقة اللاعب الفاخرة، الأشرطة، النوافذ، الإشعارات، الكونفيتي
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC = G.FC || {};
  const U = FC.util;
  const esc = U.esc;

  const UI = (FC.UI = FC.UI || {});
  UI.screens = UI.screens || {};

  // ================= أيقونات SVG بسيطة =================
  const ICONS = {
    home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    week: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    club: '<path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z"/>',
    trophy: '<path d="M7 4h10v4a5 5 0 0 1-10 0zM4 5h3v2a3 3 0 0 1-3-2zM20 5h-3v2a3 3 0 0 0 3-2zM10 14h4v3h3v3H7v-3h3z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    ball: '<circle cx="12" cy="12" r="9"/><path d="M12 7l4 3-1.5 5h-5L8 10z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    play: '<path d="M7 4l13 8-13 8z"/>',
    fast: '<path d="M3 5l8 7-8 7zM12 5l8 7-8 7z"/>',
    save: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/>',
    back: '<path d="M9 5l7 7-7 7"/>',
    up: '<path d="M12 5l6 7H6z"/>',
    star: '<path d="M12 2l3 7 7 .6-5.3 4.6 1.7 7L12 17l-6.4 3.8 1.7-7L2 9.6 9 9z"/>',
    whistle: '<circle cx="9" cy="14" r="6"/><path d="M13 10l8-4v5h-6"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
  };
  UI.icon = (name, cls) => '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';

  // ================= الأعلام =================
  function starPath(cx, cy, r) {
    let d = '';
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? r * 0.42 : r;
      d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rr).toFixed(2) + ' ' + (cy + Math.sin(a) * rr).toFixed(2);
    }
    return d + 'Z';
  }
  function stripes(list, vertical) {
    const items = list.map((c) => (Array.isArray(c) ? c : [c, 1]));
    const total = items.reduce((s, c) => s + c[1], 0);
    let pos = 0;
    let out = '';
    items.forEach((c) => {
      const size = ((vertical ? 30 : 20) * c[1]) / total;
      out += vertical ? '<rect x="' + pos + '" y="0" width="' + (size + 0.05) + '" height="20" fill="' + c[0] + '"/>' : '<rect x="0" y="' + pos + '" width="30" height="' + (size + 0.05) + '" fill="' + c[0] + '"/>';
      pos += size;
    });
    return out;
  }
  // رسم علم من طبقاته
  UI.flag = function (code, size) {
    const n = FC.DATA.nations[code];
    const h = size || 16;
    if (!n) return '';
    let s = '';
    n.flag.forEach((L) => {
      const t = L[0];
      if (t === 'h') s += stripes(L[1], false);
      else if (t === 'v') s += stripes(L[1], true);
      else if (t === 'bg') s += '<rect width="30" height="20" fill="' + L[1] + '"/>';
      else if (t === 'rect') s += '<rect x="' + L[1] + '" y="' + L[2] + '" width="' + L[3] + '" height="' + L[4] + '" fill="' + L[5] + '"/>';
      else if (t === 'tri') s += '<path d="M0 0L' + L[2] + ' 10L0 20Z" fill="' + L[1] + '"/>';
      else if (t === 'trap') s += '<path d="M0 0L' + L[2] + ' 6.67V13.33L0 20Z" fill="' + L[1] + '"/>';
      else if (t === 'star') s += '<path d="' + starPath(L[1], L[2], L[3]) + '" fill="' + L[4] + '"/>';
      else if (t === 'circle') s += '<circle cx="' + L[1] + '" cy="' + L[2] + '" r="' + L[3] + '" fill="' + L[4] + '"/>';
      else if (t === 'cres') s += '<circle cx="' + L[1] + '" cy="' + L[2] + '" r="' + L[3] + '" fill="' + L[4] + '"/><circle cx="' + L[5] + '" cy="' + L[2] + '" r="' + L[3] * 0.82 + '" fill="' + L[6] + '"/>';
      else if (t === 'cross') s += '<rect x="' + (15 - L[2] / 2) + '" y="0" width="' + L[2] + '" height="20" fill="' + L[1] + '"/><rect x="0" y="' + (10 - L[2] / 2) + '" width="30" height="' + L[2] + '" fill="' + L[1] + '"/>';
      else if (t === 'nordic') s += '<rect x="' + (10.5 - L[2] / 2) + '" y="0" width="' + L[2] + '" height="20" fill="' + L[1] + '"/><rect x="0" y="' + (10 - L[2] / 2) + '" width="30" height="' + L[2] + '" fill="' + L[1] + '"/>';
      else if (t === 'serr') {
        let d = 'M30 0H' + L[2];
        const teeth = L[3];
        const step = 20 / teeth;
        for (let i = 0; i < teeth; i++) d += 'L' + (L[2] - 2.2) + ' ' + (i * step + step / 2).toFixed(2) + 'L' + L[2] + ' ' + ((i + 1) * step).toFixed(2);
        s += '<path d="' + d + 'H30Z" fill="' + L[1] + '"/>';
      } else if (t === 'diamond') s += '<path d="M15 2L28 10L15 18L2 10Z" fill="' + L[1] + '"/>';
      else if (t === 'cedar') s += '<path d="M' + L[1] + ' ' + (L[2] - L[3]) + 'L' + (L[1] + L[3] * 0.9) + ' ' + (L[2] + L[3] * 0.7) + 'H' + (L[1] - L[3] * 0.9) + 'Z" fill="' + L[4] + '"/>';
      else if (t === 'checker') {
        const c = L[3] / 4;
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) s += '<rect x="' + (L[1] - L[3] / 2 + i * c) + '" y="' + (L[2] - L[3] / 2 + j * c) + '" width="' + c + '" height="' + c + '" fill="' + ((i + j) % 2 ? '#ffffff' : '#ff0000') + '"/>';
      } else if (t === 'stripes') {
        const k = 20 / L[1];
        for (let i = 0; i < L[1]; i++) s += '<rect x="0" y="' + i * k + '" width="30" height="' + (k + 0.05) + '" fill="' + (i % 2 ? L[3] : L[2]) + '"/>';
      } else if (t === 'yy') s += '<circle cx="' + L[1] + '" cy="' + L[2] + '" r="' + L[3] + '" fill="#cd2e3a"/><path d="M' + (L[1] - L[3]) + ' ' + L[2] + 'A' + L[3] + ' ' + L[3] + ' 0 0 0 ' + (L[1] + L[3]) + ' ' + L[2] + 'Z" fill="#0047a0"/>';
      else if (t === 'text') s += '<text x="15" y="' + (L[4] || 10) + '" font-size="' + L[3] + '" fill="' + L[2] + '" text-anchor="middle" dominant-baseline="middle" font-family="Tajawal,Tahoma,sans-serif" font-weight="700">' + esc(L[1]) + '</text>';
    });
    return '<svg class="flag" viewBox="0 0 30 20" width="' + h * 1.5 + '" height="' + h + '" role="img" aria-label="' + esc(n.name) + '">' + s + '<rect width="30" height="20" fill="none" stroke="rgba(0,0,0,.25)" stroke-width=".6"/></svg>';
  };

  // ================= الوجه المولّد =================
  UI.SKINS = ['#f6d7c3', '#e8b894', '#d39b6f', '#b57a4f', '#8d5a36', '#5e3a22'];
  UI.HAIRCOLS = ['#141414', '#3b2314', '#6b4423', '#a0703a', '#d8b36a', '#8a8a8a'];
  UI.HAIRS = ['أصلع', 'قصير جداً', 'قصير', 'مفروق', 'مجعد', 'أفرو', 'طويل', 'فيد'];
  UI.BEARDS = ['بدون', 'خفيفة', 'قصيرة', 'كاملة', 'سكسوكة'];

  UI.face = function (f, shirt, size) {
    f = f || { skin: 2, hair: 2, hairCol: 0, beard: 0 };
    const sk = UI.SKINS[f.skin || 0];
    const hc = UI.HAIRCOLS[f.hairCol || 0];
    const shirtC = shirt || '#1f4e9e';
    let hair = '';
    switch (f.hair) {
      case 1: hair = '<path d="M30 40c0-14 9-22 20-22s20 8 20 22c-3-6-10-10-20-10s-17 4-20 10z" fill="' + hc + '" opacity=".75"/>'; break;
      case 2: hair = '<path d="M29 42c-1-17 9-26 21-26s22 9 21 26c-3-8-9-12-21-12s-18 4-21 12z" fill="' + hc + '"/>'; break;
      case 3: hair = '<path d="M28 44c-2-19 9-29 22-29 14 0 24 10 22 29-2-9-8-14-16-15-6 3-14 3-20 1-4 3-7 8-8 14z" fill="' + hc + '"/>'; break;
      case 4: hair = '<g fill="' + hc + '">' + [30, 38, 46, 54, 62, 70].map((x, i) => '<circle cx="' + x + '" cy="' + (26 - (i % 2) * 3) + '" r="7"/>').join('') + '<path d="M28 40c0-12 8-18 22-18s22 6 22 18c-4-6-12-8-22-8s-18 2-22 8z"/></g>'; break;
      case 5: hair = '<path d="M22 46c-6-24 8-38 28-38s34 14 28 38c-2-10-6-16-10-18-8 3-28 3-36 0-4 2-8 8-10 18z" fill="' + hc + '"/>'; break;
      case 6: hair = '<path d="M27 58c-4-26 6-42 23-42s27 16 23 42c-2-6-3-18-6-24-8 2-26 2-34 0-3 6-4 18-6 24z" fill="' + hc + '"/>'; break;
      case 7: hair = '<path d="M42 30c0-10 3-15 8-15s8 5 8 15z" fill="' + hc + '"/><path d="M30 40c1-8 5-12 10-13v6c-4 1-7 4-10 7zM70 40c-1-8-5-12-10-13v6c4 1 7 4 10 7z" fill="' + hc + '" opacity=".5"/>'; break;
      default: hair = '';
    }
    let beard = '';
    switch (f.beard) {
      case 1: beard = '<path d="M33 52c2 14 8 20 17 20s15-6 17-20c-2 8-8 13-17 13s-15-5-17-13z" fill="' + hc + '" opacity=".35"/>'; break;
      case 2: beard = '<path d="M32 50c1 16 8 23 18 23s17-7 18-23c-3 7-8 10-18 10s-15-3-18-10z" fill="' + hc + '" opacity=".8"/>'; break;
      case 3: beard = '<path d="M30 46c0 20 8 30 20 30s20-10 20-30c-3 9-9 13-20 13s-17-4-20-13z" fill="' + hc + '"/>'; break;
      case 4: beard = '<path d="M44 62c1 7 3 11 6 11s5-4 6-11c-2 2-4 3-6 3s-4-1-6-3z" fill="' + hc + '"/><path d="M42 58c3-2 13-2 16 0" stroke="' + hc + '" stroke-width="2.5" fill="none"/>'; break;
      default: beard = '';
    }
    return (
      '<svg class="face" viewBox="0 0 100 100" width="' + (size || 96) + '" height="' + (size || 96) + '" aria-hidden="true">' +
      '<path d="M10 100c2-16 16-24 40-24s38 8 40 24z" fill="' + shirtC + '"/>' +
      '<path d="M40 76h20l-3 8h-14z" fill="rgba(0,0,0,.18)"/>' +
      '<rect x="42" y="62" width="16" height="16" rx="5" fill="' + sk + '"/>' +
      '<ellipse cx="29.5" cy="47" rx="4" ry="6" fill="' + sk + '"/><ellipse cx="70.5" cy="47" rx="4" ry="6" fill="' + sk + '"/>' +
      '<ellipse cx="50" cy="44" rx="20" ry="24" fill="' + sk + '"/>' +
      '<ellipse cx="50" cy="44" rx="20" ry="24" fill="url(#fshade)" opacity=".25"/>' +
      '<defs><radialGradient id="fshade" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient></defs>' +
      hair +
      '<path d="M38 38.5q4-3 8 0M54 38.5q4-3 8 0" stroke="' + hc + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="42" cy="44" rx="3" ry="2.2" fill="#fff"/><ellipse cx="58" cy="44" rx="3" ry="2.2" fill="#fff"/>' +
      '<circle cx="42.3" cy="44.2" r="1.5" fill="#2b1a10"/><circle cx="58.3" cy="44.2" r="1.5" fill="#2b1a10"/>' +
      '<path d="M50 46v8l-3 2" stroke="rgba(0,0,0,.25)" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
      '<path d="M44 60q6 4 12 0" stroke="#7a3b2e" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      beard +
      '</svg>'
    );
  };

  // ================= شعار النادي =================
  UI.badge = function (club, size) {
    if (!club) return '';
    const s = size || 28;
    const letter = esc((club.short || club.name).replace(/^ش\.\s*/, '').trim().charAt(0));
    const txt = U.luma(club.c1) > 0.6 ? '#111' : '#fff';
    return (
      '<svg class="badge" viewBox="0 0 40 46" width="' + s * 0.87 + '" height="' + s + '" aria-label="' + esc(club.name) + '">' +
      '<path d="M20 1l18 6v14c0 12-8 20-18 24C10 41 2 33 2 21V7z" fill="' + club.c1 + '" stroke="#D4AF37" stroke-width="1.6"/>' +
      '<path d="M2 21h36c0 3-.6 6-1.6 8H3.6C2.6 27 2 24 2 21z" fill="' + club.c2 + '" opacity=".9"/>' +
      '<text x="20" y="16" font-size="15" text-anchor="middle" dominant-baseline="middle" fill="' + txt + '" font-family="Reem Kufi,Tajawal,sans-serif" font-weight="700">' + letter + '</text>' +
      (club.youth ? '<text x="20" y="36" font-size="7" text-anchor="middle" fill="' + txt + '" font-family="Tajawal,sans-serif" font-weight="700">U19</text>' : '') +
      '</svg>'
    );
  };

  // ================= بطاقة اللاعب الفاخرة =================
  UI.card = function (p, opts) {
    opts = opts || {};
    const ovr = Math.floor(FC.Player.ovr(p));
    const tier = FC.Player.tier(ovr);
    const club = opts.club;
    const stats = FC.Player.cardStats(p);
    return (
      '<div class="pcard tier-' + tier + (opts.shine ? ' shine' : '') + (opts.small ? ' small' : '') + '">' +
      '<div class="pc-bg"></div>' +
      '<div class="pc-top"><div class="pc-ovr">' + ovr + '</div><div class="pc-pos">' + esc(FC.Player.POS[p.pos].short) + '</div>' +
      '<div class="pc-flag">' + UI.flag(p.nat, 13) + '</div>' + (club ? '<div class="pc-club">' + UI.badge(club, 22) + '</div>' : '') + '</div>' +
      '<div class="pc-face">' + UI.face(p.face, club ? club.c1 : '#1f4e9e', opts.small ? 70 : 92) + '</div>' +
      '<div class="pc-name">' + esc(p.nick || p.ln || p.fn) + '</div>' +
      '<div class="pc-stats">' + stats.map((s) => '<div><b>' + s[1] + '</b><span>' + s[0] + '</span></div>').join('') + '</div>' +
      '</div>'
    );
  };

  // ================= أشرطة ومؤشرات =================
  UI.meter = function (label, v, cls) {
    const val = Math.round(U.clamp(v, 0, 100));
    const c = cls || (val >= 70 ? 'good' : val >= 45 ? 'mid' : 'low');
    return '<div class="meter ' + c + '"><div class="m-lbl"><span>' + label + '</span><b>' + val + '</b></div><div class="m-track"><i style="width:' + val + '%"></i></div></div>';
  };
  UI.stars = function (n, max) {
    let s = '';
    for (let i = 0; i < (max || 5); i++) s += '<span class="st' + (i < n ? ' on' : '') + '">★</span>';
    return '<span class="stars">' + s + '</span>';
  };
  // رقاقة تقييم مباراة ملونة
  UI.rating = function (r, big) {
    if (r == null) return '<span class="rt none">—</span>';
    const c = r >= 8 ? 'r8' : r >= 7 ? 'r7' : r >= 6.5 ? 'r65' : r >= 6 ? 'r6' : 'r5';
    return '<span class="rt ' + c + (big ? ' big' : '') + '">' + r.toFixed(1) + '</span>';
  };
  // النتيجة داخل عنصر ltr حتى لا تنقلب
  UI.score = (a, b) => '<span class="score" dir="ltr">' + a + ' - ' + b + '</span>';
  // حرف نتيجة: ف / ت / خ
  UI.formChip = (r) => '<span class="fc fc-' + r + '">' + { W: 'ف', D: 'ت', L: 'خ' }[r] + '</span>';
  UI.roleChip = (role) => {
    const m = { start: ['أساسي', 'ok'], bench: ['احتياط', 'mid'], out: ['خارج القائمة', 'bad'] }[role] || ['—', ''];
    return '<span class="chip-tag ' + m[1] + '">' + m[0] + '</span>';
  };

  // مخطط رادار SVG للإحصائيات الست
  UI.radar = function (stats, size) {
    const n = stats.length;
    const S = size || 200;
    const c = S / 2;
    const R = S * 0.36;
    const pt = (i, v) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      return [c + Math.cos(a) * R * v, c + Math.sin(a) * R * v];
    };
    let grid = '';
    [0.25, 0.5, 0.75, 1].forEach((k) => {
      grid += '<polygon points="' + stats.map((s, i) => pt(i, k).join(',')).join(' ') + '" fill="none" stroke="rgba(245,240,225,.12)"/>';
    });
    const axes = stats.map((s, i) => '<line x1="' + c + '" y1="' + c + '" x2="' + pt(i, 1)[0] + '" y2="' + pt(i, 1)[1] + '" stroke="rgba(245,240,225,.12)"/>').join('');
    const poly = stats.map((s, i) => pt(i, U.clamp(s[1] / 99, 0.05, 1)).join(',')).join(' ');
    const labels = stats
      .map((s, i) => {
        const p = pt(i, 1.22);
        return '<text x="' + p[0] + '" y="' + p[1] + '" text-anchor="middle" dominant-baseline="middle" font-size="11" fill="#F5F0E1" font-family="Tajawal,sans-serif">' + esc(s[0]) + ' ' + s[1] + '</text>';
      })
      .join('');
    return '<svg class="radar" viewBox="0 0 ' + S + ' ' + S + '" width="100%" style="max-width:' + S * 1.3 + 'px">' + grid + axes + '<polygon points="' + poly + '" fill="rgba(212,175,55,.28)" stroke="#D4AF37" stroke-width="2"/>' + labels + '</svg>';
  };

  // ================= نوافذ وإشعارات =================
  UI.toast = function (msg, cls) {
    const t = document.getElementById('toast');
    const d = document.createElement('div');
    d.className = 'toast-item ' + (cls || '');
    d.textContent = msg;
    t.appendChild(d);
    setTimeout(() => d.classList.add('show'), 10);
    setTimeout(() => {
      d.classList.remove('show');
      setTimeout(() => d.remove(), 300);
    }, 2400);
  };

  // نافذة منبثقة: buttons = [{label, cls, value}] ← وعد بالقيمة المختارة
  UI.modal = function (title, html, buttons, opts) {
    opts = opts || {};
    return new Promise((resolve) => {
      const root = document.getElementById('overlay');
      const el = document.createElement('div');
      el.className = 'modal-wrap';
      el.innerHTML =
        '<div class="modal ' + (opts.cls || '') + '"><div class="modal-h"><h3>' + esc(title) + '</h3>' +
        (opts.noClose ? '' : '<button class="icon-btn" data-v="__close" aria-label="إغلاق">' + UI.icon('close') + '</button>') +
        '</div><div class="modal-b">' + html + '</div>' +
        (buttons && buttons.length ? '<div class="modal-f">' + buttons.map((b, i) => '<button class="btn ' + (b.cls || '') + '" data-i="' + i + '">' + esc(b.label) + '</button>').join('') + '</div>' : '') +
        '</div>';
      root.appendChild(el);
      root.classList.add('show');
      requestAnimationFrame(() => el.classList.add('show'));
      const done = (v) => {
        el.classList.remove('show');
        setTimeout(() => {
          el.remove();
          if (!root.children.length) root.classList.remove('show');
        }, 220);
        resolve(v);
      };
      el.addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-i]');
        if (b) {
          if (FC.Sound) FC.Sound.click();
          return done(buttons[parseInt(b.dataset.i, 10)].value);
        }
        if (ev.target.closest('[data-v="__close"]') || (ev.target === el && !opts.noClose)) done(null);
      });
      if (opts.onOpen) opts.onOpen(el);
    });
  };

  // ================= كونفيتي ذهبي =================
  UI.confetti = function (n) {
    const cv = document.getElementById('fx');
    if (!cv) return;
    const d = FC.Draw.setup(cv);
    const ctx = d.ctx;
    const cols = ['#D4AF37', '#F2D675', '#F5F0E1', '#b8871f', '#fff3c4'];
    const parts = [];
    for (let i = 0; i < (n || 120); i++) {
      parts.push({ x: Math.random() * d.w, y: -20 - Math.random() * d.h * 0.4, vx: (Math.random() - 0.5) * 60, vy: 80 + Math.random() * 160, r: 3 + Math.random() * 5, a: Math.random() * 6, va: (Math.random() - 0.5) * 10, c: cols[i % cols.length] });
    }
    let last = performance.now();
    const t0 = last;
    cv.classList.add('on');
    function f(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, d.w, d.h);
      parts.forEach((p) => {
        p.x += p.vx * dt + Math.sin(now / 300 + p.a) * 0.6;
        p.y += p.vy * dt;
        p.a += p.va * dt;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.a);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.r, -p.r * 0.4, p.r * 2, p.r * 0.8);
        ctx.restore();
      });
      if (now - t0 < 2600) requestAnimationFrame(f);
      else {
        ctx.clearRect(0, 0, d.w, d.h);
        cv.classList.remove('on');
      }
    }
    requestAnimationFrame(f);
  };

  // ================= أدوات عامة للواجهة =================
  UI.S = () => FC.State.cur;
  UI.club = (id) => FC.State.cur.clubs[id];
  UI.pname = (p) => (p.id === 0 ? FC.Player.displayName(p) : p.fn + ' ' + p.ln);
  UI.date = (st) => FC.Calendar.fmt(FC.Calendar.weekDate(st.season, st.week));
  UI.weekDate = (st, w) => FC.Calendar.fmtShort(FC.Calendar.weekDate(st.season, w));
})(globalThis);
