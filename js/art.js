/* رسوم مشتركة (SVG) بستايل البيوت الموصلية */
const A = {};

A.defs = () => `
<svg id="global-defs" width="0" height="0" style="position:absolute" aria-hidden="true">
<defs>
  <linearGradient id="gGold" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fbe7a6"/><stop offset=".45" stop-color="#d4a94e"/><stop offset="1" stop-color="#7d5a1c"/>
  </linearGradient>
  <linearGradient id="gGoldH" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#8a6420"/><stop offset=".5" stop-color="#f3d68a"/><stop offset="1" stop-color="#8a6420"/>
  </linearGradient>
  <linearGradient id="gBrass" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#f0cf7a"/><stop offset=".5" stop-color="#b8863a"/><stop offset="1" stop-color="#6e4a18"/>
  </linearGradient>
  <linearGradient id="gWood" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#4a2e19"/><stop offset=".5" stop-color="#6e4628"/><stop offset="1" stop-color="#4a2e19"/>
  </linearGradient>
  <linearGradient id="gWoodV" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#6a4326"/><stop offset="1" stop-color="#3b2413"/>
  </linearGradient>
  <linearGradient id="gWoodDark" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#3a2415"/><stop offset="1" stop-color="#1e120a"/>
  </linearGradient>
  <linearGradient id="gMarble" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#c3cbcc"/><stop offset=".6" stop-color="#9aa6a8"/><stop offset="1" stop-color="#7a8688"/>
  </linearGradient>
  <linearGradient id="gMarbleH" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#8f9b9e"/><stop offset=".5" stop-color="#c8d0d0"/><stop offset="1" stop-color="#8f9b9e"/>
  </linearGradient>
  <linearGradient id="gPlaster" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#b89868"/><stop offset=".5" stop-color="#cdb088"/><stop offset="1" stop-color="#a88a5e"/>
  </linearGradient>
  <linearGradient id="gPlasterGreen" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#1c3329"/><stop offset=".55" stop-color="#2a4a3b"/><stop offset="1" stop-color="#1a2e25"/>
  </linearGradient>
  <linearGradient id="gFloor" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#6d6a62"/><stop offset="1" stop-color="#3e3a33"/>
  </linearGradient>
  <linearGradient id="gSky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fff0c4"/><stop offset="1" stop-color="#f0b964"/>
  </linearGradient>
  <linearGradient id="gRay" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ffe2a0" stop-opacity=".45"/><stop offset="1" stop-color="#ffe2a0" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="gVelvet" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#173826"/><stop offset=".25" stop-color="#2d6444"/><stop offset=".5" stop-color="#173826"/><stop offset=".75" stop-color="#2d6444"/><stop offset="1" stop-color="#173826"/>
  </linearGradient>
  <linearGradient id="gVelvetRed" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#4a0f12"/><stop offset=".25" stop-color="#8a2226"/><stop offset=".5" stop-color="#4a0f12"/><stop offset=".75" stop-color="#8a2226"/><stop offset="1" stop-color="#4a0f12"/>
  </linearGradient>
  <linearGradient id="gMirror" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#e8f1f3"/><stop offset=".35" stop-color="#9fb4bb"/><stop offset=".55" stop-color="#d9e6e9"/><stop offset="1" stop-color="#6d858d"/>
  </linearGradient>
  <linearGradient id="gParch" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#f1e0b4"/><stop offset="1" stop-color="#d4b97e"/>
  </linearGradient>
  <radialGradient id="gWarm">
    <stop offset="0" stop-color="#ffcf80" stop-opacity=".55"/><stop offset="1" stop-color="#ffcf80" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="gFlameGlow">
    <stop offset="0" stop-color="#ffd27a" stop-opacity=".9"/><stop offset=".4" stop-color="#ff9a3a" stop-opacity=".35"/><stop offset="1" stop-color="#ff9a3a" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="gFlame" cx=".5" cy=".7" r=".6">
    <stop offset="0" stop-color="#fffbe0"/><stop offset=".35" stop-color="#ffd35a"/><stop offset=".8" stop-color="#ff7a1a"/><stop offset="1" stop-color="#ff5a00" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="gVignette" cx=".5" cy=".45" r=".78">
    <stop offset=".55" stop-color="#0a0502" stop-opacity="0"/><stop offset="1" stop-color="#0a0502" stop-opacity=".82"/>
  </radialGradient>
  <radialGradient id="gCrystal" cx=".4" cy=".35" r=".7">
    <stop offset="0" stop-color="#ffffff"/><stop offset=".3" stop-color="#bfe8ff"/><stop offset=".7" stop-color="#4a86b0"/><stop offset="1" stop-color="#1d3850"/>
  </radialGradient>
  <radialGradient id="gCrystalLit" cx=".5" cy=".5" r=".6">
    <stop offset="0" stop-color="#ffffff"/><stop offset=".4" stop-color="#fff2b0"/><stop offset=".8" stop-color="#ffb640"/><stop offset="1" stop-color="#b86a10"/>
  </radialGradient>

  <!-- بلاط النجمة الثمانية -->
  <pattern id="pStar" width="80" height="80" patternUnits="userSpaceOnUse">
    <rect width="80" height="80" fill="#5e5a52"/>
    <g fill="#77736a" stroke="#3a362f" stroke-width="1.5">
      <rect x="22" y="22" width="36" height="36"/>
      <rect x="22" y="22" width="36" height="36" transform="rotate(45 40 40)"/>
    </g>
    <circle cx="40" cy="40" r="9" fill="#8e6b35" stroke="#3a362f" stroke-width="1.2"/>
    <g fill="#4c4840">
      <path d="M0 0 L12 0 L0 12Z M80 0 L68 0 L80 12Z M0 80 L12 80 L0 68Z M80 80 L68 80 L80 68Z"/>
    </g>
    <path d="M0 40 L8 40 M72 40 L80 40 M40 0 L40 8 M40 72 L40 80" stroke="#3a362f" stroke-width="1.5"/>
  </pattern>
  <!-- شبكة المشربية (الشناشيل) -->
  <pattern id="pLattice" width="16" height="16" patternUnits="userSpaceOnUse">
    <path d="M0 8 L8 0 L16 8 L8 16Z" fill="none" stroke="#4a2c16" stroke-width="3"/>
    <circle cx="8" cy="8" r="2" fill="#4a2c16"/>
    <circle cx="0" cy="0" r="1.6" fill="#4a2c16"/><circle cx="16" cy="0" r="1.6" fill="#4a2c16"/>
    <circle cx="0" cy="16" r="1.6" fill="#4a2c16"/><circle cx="16" cy="16" r="1.6" fill="#4a2c16"/>
  </pattern>
  <pattern id="pGrain" width="140" height="14" patternUnits="userSpaceOnUse">
    <path d="M0 4 Q35 1 70 5 T140 4" fill="none" stroke="#000" stroke-opacity=".14" stroke-width="1"/>
    <path d="M0 10 Q40 13 80 9 T140 11" fill="none" stroke="#fff" stroke-opacity=".05" stroke-width="1"/>
  </pattern>
  <pattern id="pGrainV" width="14" height="140" patternUnits="userSpaceOnUse">
    <path d="M4 0 Q1 35 5 70 T4 140" fill="none" stroke="#000" stroke-opacity=".16" stroke-width="1"/>
    <path d="M10 0 Q13 40 9 80 T11 140" fill="none" stroke="#fff" stroke-opacity=".05" stroke-width="1"/>
  </pattern>
  <pattern id="pFrieze" width="36" height="22" patternUnits="userSpaceOnUse">
    <rect width="36" height="22" fill="#2a1a0e"/>
    <path d="M0 22 L0 12 Q0 3 9 3 Q18 3 18 12 L18 22 M18 22 L18 12 Q18 3 27 3 Q36 3 36 12 L36 22" fill="none" stroke="#c9a14a" stroke-width="1.6"/>
    <circle cx="9" cy="13" r="2" fill="#c9a14a"/><circle cx="27" cy="13" r="2" fill="#c9a14a"/>
  </pattern>
  <pattern id="pCarve" width="30" height="30" patternUnits="userSpaceOnUse">
    <path d="M15 2 L28 15 L15 28 L2 15Z" fill="none" stroke="#6f7b7e" stroke-width="1.5"/>
    <circle cx="15" cy="15" r="4" fill="none" stroke="#6f7b7e" stroke-width="1.2"/>
  </pattern>
  <pattern id="pPlasterTex" width="200" height="200" patternUnits="userSpaceOnUse">
    <circle cx="30" cy="40" r="24" fill="#000" fill-opacity=".03"/>
    <circle cx="140" cy="90" r="40" fill="#fff" fill-opacity=".025"/>
    <circle cx="90" cy="170" r="30" fill="#000" fill-opacity=".035"/>
    <path d="M10 120 q20 -6 40 2" stroke="#000" stroke-opacity=".06" fill="none"/>
  </pattern>
  <pattern id="pMosaic" width="14" height="14" patternUnits="userSpaceOnUse">
    <rect width="14" height="14" fill="#8fa9b0"/>
    <path d="M7 0 L14 7 L7 14 L0 7Z" fill="#d3e3e6"/>
    <path d="M7 3 L11 7 L7 11 L3 7Z" fill="#a8c1c7"/>
  </pattern>

  <filter id="fGlow" x="-25%" y="-25%" width="150%" height="150%">
    <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="b"/>
    <feFlood flood-color="#ffd27a" flood-opacity="1"/>
    <feComposite in2="b" operator="in" result="g"/>
    <feMerge><feMergeNode in="g"/><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="fBlur6" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
  <filter id="fBlur3" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
  <filter id="fBlur14" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>
  <filter id="fShadow" x="-20%" y="-20%" width="140%" height="150%">
    <feDropShadow dx="0" dy="6" stdDeviation="5" flood-color="#000" flood-opacity=".6"/>
  </filter>
  <filter id="fDust">
    <feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="3" seed="4"/>
    <feColorMatrix values="0 0 0 0 .55  0 0 0 0 .48  0 0 0 0 .38  0 0 0 -1.1 1.25"/>
  </filter>
</defs>
</svg>`;

/* قوس مدبّب إسلامي */
A.archPath = (x, y, w, h, ah) => {
  ah = ah || w * 0.6;
  const b = y + h, s = y + ah, m = x + w / 2;
  return `M${x},${b} L${x},${s} C${x},${y + ah * 0.35} ${x + w * 0.28},${y + ah * 0.08} ${m},${y} C${x + w * 0.72},${y + ah * 0.08} ${x + w},${y + ah * 0.35} ${x + w},${s} L${x + w},${b} Z`;
};

/* السقف الخشبي مع الإفريز الذهبي */
A.ceiling = (W = 1280) => {
  let beams = '';
  for (let x = 0; x < W; x += 80) beams += `<rect x="${x}" y="0" width="30" height="62" fill="#1f130a"/><rect x="${x + 2}" y="0" width="4" height="62" fill="#3b2614" opacity=".6"/>`;
  return `<g class="nopoint">
    <rect x="0" y="0" width="${W}" height="64" fill="url(#gWoodDark)"/>
    <rect x="0" y="0" width="${W}" height="64" fill="url(#pGrain)"/>
    ${beams}
    <rect x="0" y="60" width="${W}" height="6" fill="#140b05"/>
    <rect x="0" y="66" width="${W}" height="22" fill="url(#pFrieze)"/>
    <rect x="0" y="66" width="${W}" height="2" fill="#d9b45a" opacity=".7"/>
    <rect x="0" y="86" width="${W}" height="3" fill="#d9b45a" opacity=".6"/>
    <rect x="0" y="89" width="${W}" height="8" fill="#000" opacity=".25"/>
  </g>`;
};

/* الإزار الرخامي (المرمر الموصلي) والأرضية */
A.dadoFloor = (dadoY = 440, floorY = 500, W = 1280, H = 620) => `
  <g class="nopoint">
    <rect x="0" y="${dadoY}" width="${W}" height="${floorY - dadoY}" fill="url(#gMarble)"/>
    <rect x="0" y="${dadoY + 8}" width="${W}" height="${floorY - dadoY - 16}" fill="url(#pCarve)" opacity=".7"/>
    <rect x="0" y="${dadoY}" width="${W}" height="4" fill="#dfe6e6"/>
    <rect x="0" y="${dadoY + 4}" width="${W}" height="3" fill="#5d686b"/>
    <rect x="0" y="${floorY - 5}" width="${W}" height="5" fill="#4b5457"/>
    <rect x="0" y="${floorY}" width="${W}" height="${H - floorY}" fill="url(#pStar)"/>
    <rect x="0" y="${floorY}" width="${W}" height="${H - floorY}" fill="url(#gFloor)" opacity=".55"/>
    <rect x="0" y="${floorY}" width="${W}" height="14" fill="#000" opacity=".3"/>
  </g>`;

A.vignette = (W = 1280, H = 620) => `<rect class="nopoint" x="0" y="0" width="${W}" height="${H}" fill="url(#gVignette)"/>`;

A.warmLight = (cx, cy, r, op = 1) => `<ellipse class="nopoint halo" cx="${cx}" cy="${cy}" rx="${r}" ry="${r * 0.8}" fill="url(#gWarm)" opacity="${op}"/>`;

A.flame = (x, y, s = 1, cls = '') => `
  <g class="nopoint">
    <circle cx="${x}" cy="${y - 6 * s}" r="${26 * s}" fill="url(#gFlameGlow)" class="halo"/>
    <path class="flame ${cls}" d="M${x},${y - 20 * s} C${x + 6 * s},${y - 10 * s} ${x + 6 * s},${y} ${x},${y + 2 * s} C${x - 6 * s},${y} ${x - 6 * s},${y - 10 * s} ${x},${y - 20 * s}Z" fill="url(#gFlame)"/>
  </g>`;

A.sparkle = (x, y, s = 1, d = '') => `
  <path class="sparkle ${d}" d="M${x},${y - 9 * s} L${x + 2 * s},${y - 2 * s} L${x + 9 * s},${y} L${x + 2 * s},${y + 2 * s} L${x},${y + 9 * s} L${x - 2 * s},${y + 2 * s} L${x - 9 * s},${y} L${x - 2 * s},${y - 2 * s}Z" fill="#fff6d0"/>`;

A.motes = (x, y, w, h, n = 14) => {
  let s = '';
  for (let i = 0; i < n; i++) {
    const cx = x + ((i * 97) % w), cy = y + ((i * 53) % h), r = 1 + (i % 3) * 0.6;
    s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#ffe9b8" style="animation-delay:${(i * 0.83) % 12}s;animation-duration:${9 + (i % 5)}s"/>`;
  }
  return `<g class="dust-motes nopoint">${s}</g>`;
};

/* شبّاك خشبي بشبكة شناشيل */
A.window = (x, y, w, h, lit = true) => {
  const ap = A.archPath(x, y, w, h, w * 0.55);
  const ip = A.archPath(x + 10, y + 12, w - 20, h - 22, (w - 20) * 0.55);
  const id = 'clipW' + x + '_' + y;
  return `
  <g>
    <defs><clipPath id="${id}"><path d="${ip}"/></clipPath></defs>
    <path d="${ap}" fill="url(#gWoodV)" stroke="#1c1008" stroke-width="3"/>
    <path d="${ap}" fill="url(#pGrainV)"/>
    <g clip-path="url(#${id})">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${lit ? 'url(#gSky)' : '#1a100a'}"/>
      ${lit ? `<ellipse cx="${x + w / 2}" cy="${y + h * 0.4}" rx="${w * 0.6}" ry="${h * 0.5}" fill="#fff" opacity=".35" filter="url(#fBlur6)"/>` : ''}
      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#pLattice)"/>
      <rect x="${x + w / 2 - 3}" y="${y}" width="6" height="${h}" fill="#3b2413"/>
      <rect x="${x}" y="${y + h * 0.55}" width="${w}" height="6" fill="#3b2413"/>
    </g>
    <path d="${ip}" fill="none" stroke="#c9a14a" stroke-width="1.5" opacity=".7"/>
    <rect x="${x - 8}" y="${y + h - 4}" width="${w + 16}" height="12" rx="2" fill="url(#gWood)" stroke="#1c1008"/>
  </g>`;
};

/* شعاع ضوء يسقط من شبّاك */
A.rays = (x, y, w, dx, len) => `
  <polygon class="nopoint" points="${x},${y} ${x + w},${y} ${x + w + dx},${y + len} ${x + dx - w * 0.3},${y + len}" fill="url(#gRay)" opacity=".8"/>`;

/* إطار ذهبي مزخرف */
A.frame = (x, y, w, h, t = 12) => `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#gGold)" stroke="#4a3210" stroke-width="2" rx="3"/>
  <rect x="${x + t * 0.35}" y="${y + t * 0.35}" width="${w - t * 0.7}" height="${h - t * 0.7}" fill="none" stroke="#fff0b8" stroke-opacity=".6" stroke-width="1.2"/>
  <rect x="${x + t}" y="${y + t}" width="${w - 2 * t}" height="${h - 2 * t}" fill="#2a1a0e" stroke="#5a3e14" stroke-width="2"/>
  <circle cx="${x + t / 2}" cy="${y + t / 2}" r="${t * 0.3}" fill="#fff0b8"/><circle cx="${x + w - t / 2}" cy="${y + t / 2}" r="${t * 0.3}" fill="#fff0b8"/>
  <circle cx="${x + t / 2}" cy="${y + h - t / 2}" r="${t * 0.3}" fill="#fff0b8"/><circle cx="${x + w - t / 2}" cy="${y + h - t / 2}" r="${t * 0.3}" fill="#fff0b8"/>`;

/* نجمة ثمانية زخرفية */
A.star8 = (cx, cy, r, fill = 'url(#gGold)', stroke = '#5a3e14') => {
  const s = r * 0.72;
  return `<g><rect x="${cx - s}" y="${cy - s}" width="${2 * s}" height="${2 * s}" fill="${fill}" stroke="${stroke}"/>
    <rect x="${cx - s}" y="${cy - s}" width="${2 * s}" height="${2 * s}" fill="${fill}" stroke="${stroke}" transform="rotate(45 ${cx} ${cy})"/></g>`;
};

/* الأرقام الهندية (العربية المشرقية) */
A.num = n => String(n).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);

/* فن شاشة البداية: واجهة بيت موصلي ليلاً */
A.startArt = () => {
  let stars = '';
  for (let i = 0; i < 70; i++) {
    const x = (i * 173) % 1280, y = (i * 67) % 260, r = 0.6 + (i % 4) * 0.4;
    stars += `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff5d8" opacity="${0.3 + (i % 5) * 0.14}" class="${i % 3 ? '' : 'glint'}" style="animation-delay:${i % 7}s"/>`;
  }
  const arches = [60, 250, 890, 1080].map(x => `
    <path d="${A.archPath(x, 300, 140, 300, 90)}" fill="#1a0f07" stroke="#8f9b9e" stroke-width="10"/>
    <path d="${A.archPath(x + 14, 318, 112, 282, 72)}" fill="#26170b"/>
    <ellipse cx="${x + 70}" cy="${470}" rx="60" ry="90" fill="url(#gWarm)" opacity=".5"/>`).join('');
  return `<svg viewBox="0 0 1280 720" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="gNight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050a14"/><stop offset=".6" stop-color="#1a1a24"/><stop offset="1" stop-color="#2b1d10"/></linearGradient>
      <linearGradient id="gFacade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4d4034"/><stop offset="1" stop-color="#2a2019"/></linearGradient>
    </defs>
    <rect width="1280" height="720" fill="url(#gNight)"/>
    ${stars}
    <circle cx="1080" cy="110" r="46" fill="#f6e8c0" opacity=".92"/>
    <circle cx="1100" cy="100" r="44" fill="#0a0f1c"/>
    <!-- المنارة الحدباء -->
    <g opacity=".75" transform="translate(170 40) rotate(4 30 240)">
      <rect x="10" y="40" width="40" height="220" fill="#2a2420"/>
      <rect x="4" y="30" width="52" height="16" fill="#3a3028"/>
      ${[70, 100, 130, 160, 190, 220].map(y => `<rect x="10" y="${y}" width="40" height="6" fill="#4b3f33"/>`).join('')}
      <path d="M20 30 Q30 0 40 30Z" fill="#2a2420"/>
    </g>
    <rect x="0" y="250" width="1280" height="470" fill="url(#gFacade)"/>
    <rect x="0" y="250" width="1280" height="14" fill="#8f9b9e"/>
    <rect x="0" y="264" width="1280" height="22" fill="url(#pFrieze)" opacity=".8"/>
    <!-- الشناشيل -->
    <g>
      <rect x="440" y="150" width="400" height="130" fill="url(#gWoodV)" stroke="#140b05" stroke-width="4"/>
      <rect x="455" y="165" width="370" height="100" fill="#f0b964" opacity=".85"/>
      <rect x="455" y="165" width="370" height="100" fill="url(#pLattice)"/>
      ${[0, 1, 2, 3].map(i => `<rect x="${455 + i * 92.5 + 88}" y="165" width="6" height="100" fill="#3b2413"/>`).join('')}
      <path d="M430 150 L850 150 L830 128 L450 128Z" fill="#3b2413"/>
      <path d="M440 280 L840 280 L800 312 L480 312Z" fill="#2b1a0e"/>
    </g>
    ${arches}
    <!-- الباب الرئيسي -->
    <path d="${A.archPath(540, 330, 200, 300, 120)}" fill="#8f9b9e" stroke="#5a6568" stroke-width="3"/>
    <path d="${A.archPath(556, 346, 168, 284, 100)}" fill="url(#pCarve)" opacity=".8"/>
    <path d="${A.archPath(572, 364, 136, 266, 80)}" fill="url(#gWoodV)" stroke="#140b05" stroke-width="3"/>
    <rect x="638" y="420" width="4" height="210" fill="#1c1008"/>
    ${[450, 500, 550, 600].map(y => [590, 620, 660, 690].map(x => `<circle cx="${x}" cy="${y}" r="3.5" fill="url(#gBrass)"/>`).join('')).join('')}
    <!-- فوانيس -->
    ${[505, 775].map(x => `<g><line x1="${x}" y1="330" x2="${x}" y2="360" stroke="#2b1a0e" stroke-width="2"/>
      <path d="M${x - 14},360 L${x + 14},360 L${x + 10},400 L${x - 10},400Z" fill="#6e4a18" opacity=".9"/>
      <path d="M${x - 10},364 L${x + 10},364 L${x + 7},396 L${x - 7},396Z" fill="#ffd27a"/>
      <circle cx="${x}" cy="380" r="60" fill="url(#gFlameGlow)" class="halo"/></g>`).join('')}
    <rect x="0" y="630" width="1280" height="90" fill="#1a130d"/>
    <rect width="1280" height="720" fill="url(#gVignette)"/>
    <rect width="1280" height="720" fill="#000" opacity=".25"/>
    <ellipse cx="640" cy="330" rx="470" ry="150" fill="#0a0502" opacity=".55" filter="url(#fBlur14)"/>
  </svg>`;
};
