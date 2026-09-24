/* الغرفة ١: الدهليز — قفل أرقام مخفية في تفاصيل الغرفة */
(() => {
  const CODE = [7, 5, 2, 3]; // الساعة، الطيور، الشبابيك المضيئة، الشموع المشتعلة

  /* ----- الأغراض ----- */
  G.defItem('smallKey', {
    name: 'مفتاح صغير',
    desc: 'مفتاح نحاسي صغير، مقبضه منقوش بنجمة ثمانية.',
    icon: `<circle cx="20" cy="20" r="11" fill="none" stroke="url(#gBrass)" stroke-width="6"/>
      ${A.star8(20, 20, 4, '#7d5a1c', 'none')}
      <path d="M28 28 L54 54" stroke="url(#gBrass)" stroke-width="6" stroke-linecap="round"/>
      <path d="M44 44 L38 50 M50 50 L45 55" stroke="#b8863a" stroke-width="5" stroke-linecap="round"/>`
  });
  G.defItem('note1', {
    name: 'رسالة الجدّ',
    desc: 'ورقة مطوية بخط جدّك. افحصها لقراءتها.',
    icon: `<path d="M12 10 L50 6 L54 52 L16 58Z" fill="url(#gParch)" stroke="#8a6a3a" stroke-width="1.5"/>
      <path d="M20 18 L45 15 M21 26 L46 23 M22 34 L47 31 M23 42 L40 40" stroke="#6a4a22" stroke-width="2" stroke-linecap="round"/>
      <circle cx="44" cy="48" r="6" fill="#8a1c1c"/><circle cx="44" cy="48" r="3" fill="#b83030"/>`,
    read: `يا من دخلت داري...<br>
      قفل الباب لا يعرف إلا ما يراه النور. على كل قرص رمز، وكل رمز يسأل عن عدد:
      <ul>
        <li><b>الساعة:</b> عند أي ساعة توقّف الزمن في هذا الدهليز؟</li>
        <li><b>الطير:</b> كم طيراً يحلّق في اللوحة؟ لكن الغبار يخفي الكثير.</li>
        <li><b>الشبّاك:</b> لا تعدّ إلا الشبابيك التي يدخل منها الضوء.</li>
        <li><b>الشمعة:</b> لا تعدّ إلا ما يحترق منها.</li>
      </ul>
      <div class="sig">— يونس</div>`
  });
  G.defItem('cloth', {
    name: 'قطعة قماش',
    desc: 'قطعة قماش قطنية نظيفة، تصلح لمسح الغبار.',
    icon: `<path d="M10 22 Q20 14 32 20 Q44 26 54 18 L56 44 Q44 52 32 46 Q20 40 8 48Z" fill="#efe3c6" stroke="#a8946a" stroke-width="1.5"/>
      <path d="M12 30 Q22 23 32 28 Q44 34 55 27 M10 38 Q22 31 32 36 Q44 42 55 35" stroke="#b2463a" stroke-width="2" fill="none"/>
      <path d="M8 48 l-2 6 M14 45 l-1 6 M20 43 l-1 6" stroke="#a8946a" stroke-width="1.5"/>`
  });
  G.defItem('crescent', {
    name: 'الهلال النحاسي',
    desc: 'قطعة نحاسية ثقيلة على شكل هلال، في ظهرها نقش دقيق لنجمة. تبدو جزءاً من شيء أكبر.',
    icon: `<path d="M40 8 A24 24 0 1 0 40 56 A30 30 0 0 1 40 8Z" fill="url(#gGold)" stroke="#6e4a18" stroke-width="2"/>
      <circle cx="18" cy="24" r="2" fill="#fff4c8"/>`
  });

  /* ----- رسومات مشتركة بين المشهد والتقريب ----- */
  const bird = (x, y, s = 1) => `<path d="M${x - 9 * s},${y} Q${x - 4 * s},${y - 6 * s} ${x},${y} Q${x + 4 * s},${y - 6 * s} ${x + 9 * s},${y}" fill="none" stroke="#2b1a10" stroke-width="${2.6}" stroke-linecap="round"/>`;
  const paintingArt = (dusty) => `
    <defs>
      <linearGradient id="gPaintSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9b86c"/><stop offset=".7" stop-color="#f2cf8e"/><stop offset="1" stop-color="#d98c55"/></linearGradient>
      <linearGradient id="gRiver" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5b7d86"/><stop offset="1" stop-color="#2e4a52"/></linearGradient>
    </defs>
    <rect width="400" height="280" fill="url(#gPaintSky)"/>
    <circle cx="320" cy="150" r="30" fill="#fff0c0" opacity=".9"/>
    <!-- المدينة -->
    <path d="M0 215 L0 190 L30 190 L30 175 L62 175 L62 195 L90 195 L90 170 L120 170 L120 200 L150 200 L150 185 L175 185 L175 205 L240 205 L240 180 L270 180 L270 195 L300 195 L300 172 L340 172 L340 198 L370 198 L370 185 L400 185 L400 215Z" fill="#7a5a3e"/>
    <path d="M40 176 Q62 138 84 176Z" fill="#5d7f7a"/><rect x="60" y="130" width="3" height="12" fill="#5d7f7a"/>
    <path d="M300 173 Q320 145 340 173Z" fill="#6f5238"/>
    <!-- المنارة الحدباء -->
    <g transform="rotate(5 205 205)">
      <rect x="194" y="70" width="22" height="135" fill="#a8744a"/>
      ${[85, 100, 115, 130, 145, 160, 175, 190].map(y => `<rect x="194" y="${y}" width="22" height="4" fill="#7a4e2c"/>`).join('')}
      <rect x="190" y="62" width="30" height="10" fill="#8a5a36"/>
      <path d="M198 62 Q205 40 212 62Z" fill="#a8744a"/>
      <rect x="185" y="195" width="40" height="14" fill="#8a5a36"/>
    </g>
    <!-- دجلة -->
    <rect y="212" width="400" height="68" fill="url(#gRiver)"/>
    <path d="M10 232 q15 -5 30 0 t30 0 M120 248 q15 -5 30 0 t30 0 M250 236 q15 -5 30 0 t30 0 M60 262 q15 -5 30 0 t30 0 M300 262 q15 -5 30 0 t30 0" stroke="#a9c3c6" stroke-width="2" fill="none" opacity=".7"/>
    <!-- القارب -->
    <path d="M140 238 L190 238 L182 248 L148 248Z" fill="#3b2413"/><line x1="165" y1="238" x2="165" y2="214" stroke="#3b2413" stroke-width="2"/>
    <!-- الطيور الخمسة -->
    ${bird(70, 70)}${bird(112, 48, 1.1)}${bird(150, 92, .9)}${bird(262, 60, 1.2)}${bird(330, 96, .95)}
    ${dusty ? `<rect width="400" height="280" fill="#7d6d55" opacity=".86"/>
      <rect width="400" height="280" filter="url(#fDust)" opacity=".9"/>
      <path d="M190 60 L220 60 L225 210 L185 210Z" fill="#6d5c45" opacity=".35"/>` : ''}`;

  const clockArt = (cx, cy, r) => {
    let nums = '';
    for (let i = 1; i <= 12; i++) {
      const a = (i * 30 - 90) * Math.PI / 180;
      nums += `<text x="${cx + Math.cos(a) * r * 0.76}" y="${cy + Math.sin(a) * r * 0.76}" font-size="${r * 0.22}" text-anchor="middle" dominant-baseline="central" fill="#2b1a10" font-family="Amiri, serif" font-weight="700">${A.num(i)}</text>`;
    }
    // عقرب الساعات على ٧، والدقائق على ١٢
    const ha = (7 * 30 - 90) * Math.PI / 180;
    return `
      <circle cx="${cx}" cy="${cy}" r="${r + r * 0.12}" fill="url(#gGold)" stroke="#4a3210" stroke-width="2"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="#f3e6c8" stroke="#8a6420" stroke-width="1.5"/>
      <circle cx="${cx}" cy="${cy}" r="${r * 0.55}" fill="none" stroke="#c9a14a" stroke-width="${r * 0.02}" opacity=".7"/>
      ${nums}
      <line x1="${cx}" y1="${cy}" x2="${cx + Math.cos(ha) * r * 0.48}" y2="${cy + Math.sin(ha) * r * 0.48}" stroke="#1c1008" stroke-width="${r * 0.08}" stroke-linecap="round"/>
      <line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - r * 0.72}" stroke="#1c1008" stroke-width="${r * 0.045}" stroke-linecap="round"/>
      <circle cx="${cx}" cy="${cy}" r="${r * 0.07}" fill="#8a6420"/>`;
  };

  /* رموز الأقراص */
  const ICONS = [
    (x, y) => `<circle cx="${x}" cy="${y}" r="17" fill="none" stroke="#3a2412" stroke-width="3"/><path d="M${x} ${y - 11} V${y} L${x + 8} ${y + 5}" stroke="#3a2412" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    (x, y) => `<path d="M${x - 20},${y + 2} Q${x - 10},${y - 14} ${x},${y + 2} Q${x + 10},${y - 14} ${x + 20},${y + 2}" stroke="#3a2412" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
    (x, y) => `<path d="${A.archPath(x - 13, y - 19, 26, 38, 14)}" fill="none" stroke="#3a2412" stroke-width="3"/><path d="M${x} ${y - 10} V${y + 19} M${x - 13} ${y + 4} H${x + 13}" stroke="#3a2412" stroke-width="2"/>`,
    (x, y) => `<rect x="${x - 5}" y="${y - 6}" width="10" height="24" fill="none" stroke="#3a2412" stroke-width="3"/><path d="M${x},${y - 20} C${x + 6},${y - 13} ${x + 5},${y - 9} ${x},${y - 8} C${x - 5},${y - 9} ${x - 6},${y - 13} ${x},${y - 20}Z" fill="#3a2412"/>`
  ];
  const ICON_NAMES = ['الساعة', 'الطير', 'الشبّاك', 'الشمعة'];

  /* ----- مكوّنات المشهد ----- */
  const drawDoor = st => {
    const ap = A.archPath(566, 160, 148, 340, 90);
    const studs = xs => [220, 270, 320, 420, 470].map(y => xs.map(x => `<circle cx="${x}" cy="${y}" r="3.2" fill="url(#gBrass)"/>`).join('')).join('');
    const panel = (x, w) => `
      <rect x="${x}" y="160" width="${w}" height="340" fill="url(#gWoodV)"/>
      <rect x="${x}" y="160" width="${w}" height="340" fill="url(#pGrainV)"/>
      <rect x="${x + 8}" y="200" width="${w - 16}" height="120" fill="none" stroke="#2b1a0e" stroke-width="3"/>
      <rect x="${x + 8}" y="340" width="${w - 16}" height="140" fill="none" stroke="#2b1a0e" stroke-width="3"/>
      <rect x="${x + 14}" y="206" width="${w - 28}" height="108" fill="none" stroke="#8a5a30" stroke-width="1" opacity=".6"/>
      <rect x="${x + 14}" y="346" width="${w - 28}" height="128" fill="none" stroke="#8a5a30" stroke-width="1" opacity=".6"/>`;
    return `
    <g id="door1" class="${st.doorOpen ? 'door-open' : ''}">
      <path d="${A.archPath(528, 116, 224, 384, 132)}" fill="url(#gMarble)" stroke="#5a6568" stroke-width="3"/>
      <path d="${A.archPath(544, 134, 192, 366, 114)}" fill="url(#pCarve)" stroke="#6f7b7e" stroke-width="2"/>
      <path d="${A.archPath(544, 134, 192, 366, 114)}" fill="none" stroke="#dfe6e6" stroke-width="1.5" opacity=".6"/>
      <text x="640" y="152" font-size="13" text-anchor="middle" fill="#4b5457" font-family="Amiri, serif" font-weight="700">ما شاء الله</text>
      <defs><clipPath id="clipDoor1"><path d="${ap}"/></clipPath></defs>
      <g clip-path="url(#clipDoor1)">
        <rect x="560" y="150" width="160" height="360" fill="#140a04"/>
        <g class="door-light">
          <rect x="560" y="150" width="160" height="360" fill="#2b4a3c"/>
          <ellipse cx="640" cy="330" rx="70" ry="160" fill="#bfe0d0" opacity=".25" filter="url(#fBlur14)"/>
          ${A.sparkle(620, 280, 1)}${A.sparkle(665, 360, .8, 'd1')}${A.sparkle(640, 220, .7, 'd2')}
        </g>
        <g class="door-leaf l">${panel(566, 74)}${studs([582, 622])}<rect x="632" y="160" width="8" height="340" fill="#1c1008"/><circle cx="612" cy="300" r="10" fill="none" stroke="url(#gBrass)" stroke-width="4"/></g>
        <g class="door-leaf r">${panel(640, 74)}${studs([658, 698])}<circle cx="668" cy="300" r="10" fill="none" stroke="url(#gBrass)" stroke-width="4"/></g>
      </g>
      <path d="${ap}" fill="none" stroke="#1c1008" stroke-width="4"/>
      ${st.doorOpen ? '' : `
      <rect data-hs="door" class="hs-area hs" x="566" y="170" width="148" height="320"/>
      <g data-hs="lock" class="hs">
        <path d="M626 346 L626 330 Q640 310 654 330 L654 346" fill="none" stroke="#9aa3a6" stroke-width="6"/>
        <rect x="614" y="344" width="52" height="44" rx="6" fill="url(#gBrass)" stroke="#4a3210" stroke-width="2"/>
        ${[0, 1, 2, 3].map(i => `<rect x="${620 + i * 11}" y="356" width="8" height="18" rx="2" fill="#3a2412"/><rect x="${621 + i * 11}" y="362" width="6" height="5" fill="#d9b45a"/>`).join('')}
      </g>`}
    </g>`;
  };

  const drawClock = () => `
    <g data-hs="clock" class="hs">
      <path d="M796 132 Q840 96 884 132Z" fill="url(#gWoodV)" stroke="#1c1008" stroke-width="2"/>
      ${A.star8(840, 120, 7)}
      <rect x="794" y="130" width="92" height="90" rx="6" fill="url(#gWoodV)" stroke="#1c1008" stroke-width="2"/>
      ${clockArt(840, 175, 32)}
      <path d="M808 220 L872 220 L866 340 L814 340Z" fill="url(#gWoodV)" stroke="#1c1008" stroke-width="2"/>
      <rect x="822" y="230" width="36" height="96" rx="4" fill="#1a100a" stroke="#c9a14a" stroke-width="1.5"/>
      <line x1="840" y1="232" x2="840" y2="300" stroke="#c9a14a" stroke-width="2"/>
      <circle cx="840" cy="306" r="9" fill="url(#gGold)"/>
      <path d="M812 340 L868 340 L860 354 L820 354Z" fill="#2b1a0e"/>
    </g>`;

  const drawCandelabra = () => {
    // صينية نحاسية عليها خمسة شمعدانات منفصلة بأطوال مختلفة
    const xs = [262, 284, 306, 328, 350], tops = [372, 352, 362, 346, 368], lit = [true, false, true, false, true];
    let c = '';
    xs.forEach((x, i) => {
      const cup = tops[i], ct = cup - 30;
      c += `<path d="M${x - 9} 404 Q${x} 394 ${x + 9} 404Z" fill="url(#gBrass)" stroke="#6e4a18" stroke-width="1"/>
        <rect x="${x - 2.5}" y="${cup}" width="5" height="${400 - cup}" fill="url(#gBrass)"/>
        <ellipse cx="${x}" cy="${(cup + 400) / 2}" rx="4.5" ry="2.5" fill="url(#gBrass)"/>
        <path d="M${x - 8} ${cup} L${x + 8} ${cup} L${x + 5} ${cup + 5} L${x - 5} ${cup + 5}Z" fill="url(#gBrass)" stroke="#6e4a18" stroke-width=".8"/>
        <rect x="${x - 4}" y="${ct}" width="8" height="30" rx="2" fill="#f1e6cc" stroke="#b8a888" stroke-width="1"/>
        <rect x="${x - 4}" y="${ct}" width="3" height="30" fill="#fff" opacity=".4"/>
        <line x1="${x}" y1="${ct}" x2="${x}" y2="${ct - (lit[i] ? 3 : 5)}" stroke="#1c1008" stroke-width="1.5"/>`;
      if (lit[i]) c += A.flame(x, ct - 3, 0.75, ['', 'f2', 'f3'][i % 3]);
    });
    return `<g data-hs="candles" class="hs">
      <ellipse cx="306" cy="405" rx="58" ry="6" fill="url(#gBrass)" stroke="#6e4a18" stroke-width="1.2"/>
      ${c}
    </g>`;
  };

  const drawBox = st => {
    const base = `<rect x="382" y="380" width="78" height="30" rx="3" fill="url(#gWoodV)" stroke="#1c1008" stroke-width="2"/>
      <rect x="382" y="380" width="78" height="30" fill="url(#pGrain)"/>
      <path d="M382 386 h8 v-6 M460 386 h-8 v-6 M382 404 h8 v6 M460 404 h-8 v6" stroke="url(#gBrass)" stroke-width="3" fill="none"/>`;
    if (!st.boxOpen) {
      return `<g data-hs="box" class="hs">
        <path d="M380 380 L462 380 L458 364 L384 364Z" fill="#5a3a22" stroke="#1c1008" stroke-width="2"/>
        <path d="M392 372 h58" stroke="url(#gBrass)" stroke-width="2"/>
        ${base}
        <rect x="414" y="384" width="14" height="16" rx="2" fill="url(#gBrass)"/>
        <circle cx="421" cy="390" r="2.5" fill="#1c1008"/><rect x="420" y="391" width="2" height="6" fill="#1c1008"/>
      </g>`;
    }
    return `<g>
      <path d="M384 380 L458 380 L464 346 L390 346Z" fill="#4a2e19" stroke="#1c1008" stroke-width="2"/>
      <path d="M392 376 L456 376 L460 352 L396 352Z" fill="#6b1f24"/>
      <g data-hs="box" class="hs">${base}
      <rect x="386" y="380" width="70" height="8" fill="#3a0f12"/></g>
      ${!st.noteTaken ? `<g data-hs="note" class="hs"><circle cx="409" cy="383" r="15" fill="transparent"/><path d="M394 382 L420 376 L424 388 L398 392Z" fill="url(#gParch)" stroke="#8a6a3a"/></g>${A.sparkle(410, 378, .7)}` : ''}
      ${!st.crescentTaken ? `<g data-hs="crescent" class="hs"><circle cx="442" cy="382" r="14" fill="transparent"/><path d="M446 372 A10 10 0 1 0 446 392 A13 13 0 0 1 446 372Z" fill="url(#gGold)" stroke="#6e4a18"/></g>${A.sparkle(444, 376, .7, 'd1')}` : ''}
    </g>`;
  };

  const drawRug = st => {
    const pts = st.rugLifted ? '380,522 900,522 900,556 846,612 380,612' : '380,522 900,522 900,612 380,612';
    return `<g>
      <defs><clipPath id="clipRug"><polygon points="${pts}"/></clipPath></defs>
      <g data-hs="rug" class="hs">
        <polygon points="${pts}" fill="#6e1a1c" stroke="#3a0d0e" stroke-width="2"/>
        <g clip-path="url(#clipRug)">
          <rect x="388" y="528" width="504" height="78" fill="none" stroke="#c9a14a" stroke-width="5"/>
          <rect x="398" y="536" width="484" height="62" fill="none" stroke="#1f4a36" stroke-width="7"/>
          <rect x="398" y="536" width="484" height="62" fill="none" stroke="#c9a14a" stroke-width="1.5" stroke-dasharray="6 5"/>
          <path d="M640 546 L700 567 L640 588 L580 567Z" fill="#1f4a36" stroke="#c9a14a" stroke-width="2"/>
          <path d="M640 555 L672 567 L640 579 L608 567Z" fill="#8a2a2a" stroke="#e6c67a" stroke-width="1.5"/>
          ${[450, 520, 760, 830].map(x => `<path d="M${x} 556 l10 11 l-10 11 l-10 -11Z" fill="#c9a14a" opacity=".8"/>`).join('')}
        </g>
        ${[...Array(27)].map((_, i) => `<line x1="${380}" y1="${524 + i * 3.4}" x2="${372}" y2="${524 + i * 3.4}" stroke="#d9c9a0" stroke-width="1.2"/>`).join('')}
        ${st.rugLifted ? `<polygon points="900,556 846,612 836,572" fill="#b8a07a" stroke="#6e5a3a" stroke-width="1.5"/>
           <path d="M900 556 L836 572 L846 612" fill="none" stroke="#8a7650" stroke-width="1"/>` : ''}
      </g>
      ${st.rugLifted && !st.keyTaken ? `<g data-hs="key" class="hs">
          <circle cx="884" cy="594" r="18" fill="transparent"/>
          <circle cx="872" cy="594" r="6" fill="none" stroke="url(#gBrass)" stroke-width="3.5"/>
          <path d="M878 594 L898 594 M892 594 v5 M896 594 v4" stroke="url(#gBrass)" stroke-width="3.5"/>
        </g>${A.sparkle(884, 588, .9)}` : ''}
    </g>`;
  };

  /* ----- الغرفة ----- */
  G.defRoom({
    id: 'entrance',
    name: 'الدهليز',
    par: 240,
    relic: 'crescent',
    carry: [],
    intro: 'دهليز الدار... الباب الوحيد أمامك مقفل بقفل نحاسي ذي أربعة أقراص. تفحّص كل شيء بعناية.',
    doneTitle: 'انفتح الباب!',
    doneText: 'صرّ الباب الخشبي وانفتح على قاعة معتمة، جدرانها تلمع كأنها مرصّعة بالنجوم...',
    init: () => ({ rugLifted: false, keyTaken: false, boxOpen: false, noteTaken: false, crescentTaken: false, clothTaken: false, dusty: true, dials: [0, 0, 0, 0], doorOpen: false }),

    render(st) {
      return `
      <rect x="0" y="90" width="1280" height="360" fill="url(#gPlaster)"/>
      <rect x="0" y="90" width="1280" height="360" fill="url(#pPlasterTex)"/>
      ${A.ceiling()}
      ${A.dadoFloor(440, 500)}
      ${A.warmLight(640, 300, 520, 0.55)}

      <!-- الشبابيك -->
      <g data-hs="winA" class="hs">${A.window(70, 130, 120, 250, true)}</g>
      <g data-hs="winB" class="hs">${A.window(930, 130, 120, 250, true)}</g>
      <g data-hs="winC" class="hs">${A.window(1100, 130, 120, 250, false)}
        <g><rect x="1092" y="200" width="136" height="16" rx="2" fill="#6b4a2a" stroke="#2b1a0e" transform="rotate(-8 1160 208)"/>
        <rect x="1092" y="270" width="136" height="16" rx="2" fill="#5e4024" stroke="#2b1a0e" transform="rotate(6 1160 278)"/>
        <rect x="1092" y="330" width="136" height="16" rx="2" fill="#6b4a2a" stroke="#2b1a0e" transform="rotate(-4 1160 338)"/>
        ${[[1104, 206], [1214, 196], [1104, 272], [1214, 284], [1104, 340], [1214, 334]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.5" fill="#1c1008"/>`).join('')}</g>
      </g>
      ${A.rays(80, 380, 100, 90, 230)}
      ${A.rays(940, 380, 100, -60, 230)}
      ${A.motes(80, 150, 200, 300, 10)}${A.motes(900, 150, 200, 300, 10)}

      <!-- اللوحة -->
      <g data-hs="painting" class="hs">
        ${A.frame(240, 130, 230, 160, 12)}
        <svg x="252" y="142" width="206" height="136" viewBox="0 0 400 280" preserveAspectRatio="none">${paintingArt(st.dusty)}</svg>
      </g>

      ${drawClock()}
      <ellipse cx="840" cy="175" rx="60" ry="60" fill="url(#gWarm)" class="nopoint" opacity=".3"/>

      ${drawDoor(st)}

      <!-- الحِبّ الفخاري -->
      <g data-hs="jar" class="hs">
        <ellipse cx="130" cy="560" rx="40" ry="8" fill="#000" opacity=".35"/>
        <path d="M110 470 Q86 478 90 515 Q96 556 130 560 Q164 556 170 515 Q174 478 150 470Z" fill="#9a5a34" stroke="#4a2410" stroke-width="2"/>
        <rect x="112" y="460" width="36" height="12" rx="3" fill="#8a4a28" stroke="#4a2410" stroke-width="2"/>
        <path d="M96 500 Q130 510 164 500" stroke="#c98a5a" stroke-width="2" fill="none"/>
        <path d="M98 512 Q130 522 162 512" stroke="#5a2a10" stroke-width="1.5" fill="none" stroke-dasharray="4 4"/>
        <path d="M104 482 Q100 510 112 540" stroke="#c98a5a" stroke-width="3" fill="none" opacity=".5"/>
      </g>

      <!-- الطاولة -->
      <g>
        <ellipse cx="360" cy="545" rx="140" ry="10" fill="#000" opacity=".35" class="nopoint"/>
        <rect x="228" y="408" width="264" height="14" rx="3" fill="url(#gWoodV)" stroke="#1c1008" stroke-width="2"/>
        <rect x="236" y="422" width="248" height="20" fill="#3b2413" stroke="#1c1008" stroke-width="1.5"/>
        <path d="M250 432 h220" stroke="#c9a14a" stroke-width="1.5" stroke-dasharray="3 5"/>
        ${[246, 466].map(x => `<path d="M${x} 442 L${x + 8} 442 L${x + 7} 470 Q${x + 12} 480 ${x + 7} 490 L${x + 6} 540 L${x + 2} 540 L${x + 1} 490 Q${x - 4} 480 ${x + 1} 470Z" fill="url(#gWood)" stroke="#1c1008" stroke-width="1.5"/>`).join('')}
      </g>
      ${drawCandelabra()}
      ${drawBox(st)}

      <!-- الديوان تحت الشبابيك -->
      <g data-hs="bench" class="hs">
        <rect x="915" y="455" width="320" height="50" fill="url(#gWoodV)" stroke="#1c1008" stroke-width="2"/>
        <rect x="915" y="455" width="320" height="50" fill="url(#pGrain)"/>
        ${[935, 1015, 1095, 1175].map(x => `<path d="M${x} 468 h40 v26 h-40Z" fill="none" stroke="#c9a14a" stroke-width="1.2" opacity=".6"/>`).join('')}
        <rect x="912" y="430" width="326" height="28" rx="10" fill="url(#gVelvet)" stroke="#0e2218" stroke-width="2"/>
        <rect x="930" y="392" width="90" height="44" rx="16" fill="#2d6444" stroke="#0e2218" stroke-width="2"/>
        <rect x="1130" y="392" width="90" height="44" rx="16" fill="#2d6444" stroke="#0e2218" stroke-width="2"/>
        <path d="M945 414 h60 M1145 414 h60" stroke="#c9a14a" stroke-width="2" stroke-dasharray="4 4"/>
      </g>
      ${!st.clothTaken ? `<g data-hs="cloth" class="hs">
        <path d="M1036 432 Q1050 420 1066 428 Q1082 436 1098 426 L1102 444 Q1086 452 1068 446 Q1050 440 1034 448Z" fill="#efe3c6" stroke="#a8946a" stroke-width="1.5"/>
        <path d="M1038 438 Q1052 428 1066 434 Q1082 442 1100 434" stroke="#b2463a" stroke-width="2" fill="none"/>
      </g>${A.sparkle(1068, 424, .9, 'd2')}` : ''}

      ${drawRug(st)}
      ${A.vignette()}`;
    },

    click(id, st, el) {
      switch (id) {
        case 'winA': case 'winB':
          G.say('شبّاك خشبي بشبكة منقوشة على طراز الشناشيل، يتسلّل منه نور العصر الدافئ.'); break;
        case 'winC':
          G.say('هذا الشبّاك مسدود بألواح خشبية مسمّرة بإحكام... لا يدخل منه أي نور.'); break;
        case 'painting': G.openCU('painting'); break;
        case 'clock': G.openCU('clock'); break;
        case 'candles': G.say('شمعدان نحاسي قديم بخمس شمعات. بعضها ما زال مشتعلاً وبعضها انطفأ منذ زمن.'); break;
        case 'jar': SFX.thud(); G.say('حِبّ فخاري قديم لتبريد الماء... طرقت عليه فرنّ فارغاً.'); break;
        case 'bench': G.say('ديوان خشبي بوسائد مخملية خضراء، كان جدّك يجلس عليه ليشرب الشاي.'); break;
        case 'door': G.say('باب خشبي ثقيل في إطار من المرمر الموصلي المنقوش. عليه قفل نحاسي بأربعة أقراص.'); break;
        case 'lock': G.openCU('lock'); break;
        case 'rug':
          if (!st.rugLifted) { st.rugLifted = true; SFX.rustle(); G.update(); G.say(st.keyTaken ? 'رفعت طرف السجادة.' : 'رفعت طرف السجادة... هناك شيء يلمع تحت الزاوية!'); }
          else G.say('سجادة موصلية حمراء منسوجة باليد، طرفها مرفوع.');
          break;
        case 'key':
          st.keyTaken = true; G.addItem('smallKey', el); G.update(); break;
        case 'box':
          if (!st.boxOpen) { SFX.error(); G.say('صندوق خشبي صغير مطعّم بالنحاس، مقفل. له ثقب مفتاح صغير.'); }
          else G.say(st.noteTaken && st.crescentTaken ? 'الصندوق فارغ الآن، مبطّن بقماش أحمر.' : 'الصندوق مفتوح، وفي داخله أشياء.');
          break;
        case 'note':
          st.noteTaken = true; G.addItem('note1', el); G.update();
          setTimeout(() => G.say('وجدت رسالة بخط جدّك! اضغط عليها مرتين في شريط الأغراض (أو زر «افحص») لقراءتها.', 6000), 1200);
          break;
        case 'crescent':
          st.crescentTaken = true; G.addItem('crescent', el); G.update(); break;
        case 'cloth':
          st.clothTaken = true; G.addItem('cloth', el); G.update(); break;
        default:
          if (id.startsWith('dial')) this.turnDial(id, st);
          else if (id === 'pull') this.tryLock(st);
      }
    },

    use(id, item, st, el) {
      if (item === 'smallKey' && id === 'box') {
        st.boxOpen = true; SFX.unlock(); G.removeItem('smallKey'); G.update();
        G.say('انفتح الصندوق! في داخله ورقة مطوية وقطعة نحاسية لامعة.');
        return true;
      }
      if (item === 'cloth' && (id === 'painting' || id === 'paintingCU')) {
        if (!st.dusty) { G.say('اللوحة نظيفة بالفعل.'); return true; }
        st.dusty = false; SFX.wipe(); G.removeItem('cloth'); G.update();
        G.say('مسحت الغبار عن اللوحة... ظهرت المنارة الحدباء ودجلة، وطيور تحلّق في السماء.');
        return true;
      }
      if (item === 'cloth' && (id === 'clock' || id === 'box' || id === 'door' || id === 'lock')) {
        G.say('لا يوجد غبار كثير هنا. لكن ربما هناك شيء أكثر اتّساخاً في الغرفة.'); return true;
      }
      if (item === 'smallKey' && (id === 'lock' || id === 'door')) {
        G.say('المفتاح صغير جداً على هذا القفل، ثم إن القفل لا ثقب له، بل أقراص أرقام.'); return true;
      }
      return false;
    },

    turnDial(id, st) {
      const m = id.match(/dial(Up|Down)(\d)/);
      if (!m) return;
      const i = +m[2];
      st.dials[i] = (st.dials[i] + (m[1] === 'Up' ? 1 : 9)) % 10;
      SFX.tick();
      const t = document.getElementById('dialNum' + i);
      if (t) {
        t.textContent = A.num(st.dials[i]);
        t.style.transition = 'none'; t.style.transform = `translateY(${m[1] === 'Up' ? 10 : -10}px)`; t.style.opacity = '.3';
        requestAnimationFrame(() => { t.style.transition = 'transform .18s, opacity .18s'; t.style.transform = ''; t.style.opacity = '1'; });
      }
      G.save();
    },

    tryLock(st) {
      const ok = st.dials.every((d, i) => d === CODE[i]);
      const body = document.querySelector('#lockBody');
      if (!ok) {
        SFX.error();
        if (body) { body.classList.remove('shake'); void body.getBoundingClientRect(); body.classList.add('shake'); }
        document.querySelector('.cu-caption').textContent = 'القفل لا يتحرّك... الأرقام غير صحيحة.';
        return;
      }
      G.busy = true;
      SFX.unlock();
      const sh = document.querySelector('#lockShackle');
      if (sh) sh.style.transform = 'translateY(-40px)';
      document.querySelector('.cu-caption').textContent = 'طَق! انفتح القفل.';
      if (body) body.classList.add('solved-flash');
      setTimeout(() => {
        G.closeCU();
        const door = document.getElementById('door1');
        if (door) {
          door.querySelectorAll('[data-hs="lock"],[data-hs="door"]').forEach(e => e.remove());
          door.classList.add('door-open');
        }
        SFX.creak();
        setTimeout(() => {
          st.doorOpen = true; G.busy = false; G.save();
          G.completeRoom();
        }, 1800);
      }, 1100);
    },

    closeups: {
      painting: {
        title: 'لوحة زيتية قديمة',
        render: st => `
          <svg width="600" height="412" viewBox="0 0 640 440">
            <g data-hs="paintingCU" class="hs no-glow">
              ${A.frame(0, 0, 640, 440, 22)}
              <svg x="22" y="22" width="596" height="396" viewBox="0 0 400 280" preserveAspectRatio="none">${paintingArt(st.dusty)}</svg>
            </g>
          </svg>
          <div class="cu-caption">${st.dusty ? 'اللوحة مغطّاة بطبقة سميكة من الغبار، بالكاد تُرى المنارة من تحتها.' : 'الموصل القديمة: المنارة الحدباء، ودجلة، وطيور تحلّق في سماء العصر.'}</div>`
      },
      clock: {
        title: 'ساعة الحائط',
        render: () => `
          <svg width="392" height="410" viewBox="0 0 420 440">
            <path d="M40 90 Q210 -10 380 90Z" fill="url(#gWoodV)" stroke="#1c1008" stroke-width="3"/>
            ${A.star8(210, 60, 16)}
            <rect x="30" y="86" width="360" height="330" rx="18" fill="url(#gWoodV)" stroke="#1c1008" stroke-width="3"/>
            <rect x="30" y="86" width="360" height="330" rx="18" fill="url(#pGrain)"/>
            ${clockArt(210, 250, 140)}
            <path d="M200 408 L220 408 L214 430 L206 430Z" fill="#c9a14a"/>
          </svg>
          <div class="cu-caption">الساعة متوقّفة. عقاربها لا تتحرّك منذ زمن طويل.</div>`
      },
      lock: {
        title: 'القفل النحاسي',
        manual: true,
        render: st => {
          // الأقراص من اليمين إلى اليسار: الساعة، الطير، الشبّاك، الشمعة
          const xs = [520, 400, 280, 160];
          const dials = xs.map((x, i) => `
            <g>
              <circle cx="${x}" cy="92" r="30" fill="#e8c878" stroke="#6e4a18" stroke-width="2"/>
              ${ICONS[i](x, 92)}
              <text x="${x}" y="142" text-anchor="middle" font-size="17" fill="#3a2412" font-family="Amiri, serif" font-weight="700">${ICON_NAMES[i]}</text>
              <g data-hs="dialUp${i}" class="hs dial-btn"><rect x="${x - 34}" y="152" width="68" height="36" fill="transparent"/><polygon points="${x},156 ${x + 22},182 ${x - 22},182" fill="#3a2412"/></g>
              <rect x="${x - 38}" y="194" width="76" height="86" rx="10" fill="#1c1008" stroke="#6e4a18" stroke-width="3"/>
              <rect x="${x - 32}" y="200" width="64" height="74" rx="6" fill="url(#gParch)"/>
              <rect x="${x - 32}" y="200" width="64" height="16" fill="#000" opacity=".2"/><rect x="${x - 32}" y="258" width="64" height="16" fill="#000" opacity=".2"/>
              <text id="dialNum${i}" x="${x}" y="252" text-anchor="middle" font-size="56" fill="#2b1a10" font-family="Amiri, serif" font-weight="700" style="transform-box:fill-box">${A.num(st.dials[i])}</text>
              <g data-hs="dialDown${i}" class="hs dial-btn"><rect x="${x - 34}" y="286" width="68" height="36" fill="transparent"/><polygon points="${x},318 ${x + 22},292 ${x - 22},292" fill="#3a2412"/></g>
            </g>`).join('');
          return `
          <svg width="620" height="428" viewBox="0 0 680 470">
            <g id="lockShackle" style="transition:transform .5s">
              <path d="M200 60 L200 30 Q200 -30 340 -30 Q480 -30 480 30 L480 60" fill="none" stroke="#9aa3a6" stroke-width="26" transform="translate(0 44)"/>
            </g>
            <g id="lockBody">
              <rect x="80" y="40" width="520" height="310" rx="30" fill="url(#gBrass)" stroke="#4a3210" stroke-width="4"/>
              <rect x="96" y="56" width="488" height="278" rx="22" fill="none" stroke="#fff0b8" stroke-opacity=".5" stroke-width="2"/>
              ${dials}
            </g>
            <g data-hs="pull" class="hs">
              <rect x="250" y="376" width="180" height="56" rx="28" fill="url(#gWoodV)" stroke="#d9b45a" stroke-width="2"/>
              <text x="340" y="412" text-anchor="middle" font-size="24" fill="#f6dc8a" font-family="Reem Kufi, Amiri, serif">اسحب القفل</text>
            </g>
          </svg>
          <div class="cu-caption">اضغط على الأسهم لتدوير الأقراص، ثم اسحب القفل.</div>`;
        }
      }
    },

    hintStage(st) {
      if (!st.boxOpen) return st.keyTaken ? 'haveKey' : 'findKey';
      if (!st.noteTaken) return 'takeNote';
      if (st.dusty) return 'dust';
      return 'code';
    },
    hints: {
      findKey: [
        'الصندوق الصغير على الطاولة مقفل، وربما فيه ما يشرح لغز القفل. مفتاحه ليس بعيداً.',
        'الناس في البيوت القديمة كانوا يخبّئون المفاتيح في أماكن يمشون فوقها كل يوم.',
        'ارفع طرف السجادة الحمراء أمام الباب، والتقط المفتاح الصغير، ثم استخدمه على الصندوق.'
      ],
      haveKey: [
        'معك مفتاح صغير... ما الشيء المقفل في هذه الغرفة غير الباب؟',
        'الصندوق الخشبي الصغير على الطاولة له ثقب مفتاح.',
        'اضغط على المفتاح في شريط الأغراض ثم اضغط على الصندوق (أو اسحبه إليه).'
      ],
      takeNote: [
        'في الصندوق المفتوح شيء مكتوب.',
        'خذ الورقة من الصندوق ثم افحصها من شريط الأغراض.',
        'اضغط على الورقة داخل الصندوق، ثم اضغط عليها مرتين في شريط الأغراض لقراءتها.'
      ],
      dust: [
        'اقرأ رسالة الجدّ جيداً: كل رمز على القفل يسأل عن عدد شيء في الغرفة.',
        'الطيور في اللوحة مخفية تحت الغبار. تحتاج شيئاً تمسح به.',
        'خذ قطعة القماش من فوق الديوان الأخضر واستخدمها على اللوحة.'
      ],
      code: [
        'عُدّ ما يطلبه كل رمز: ساعة توقّف الزمن، طيور اللوحة، الشبابيك المضيئة فقط، والشموع المشتعلة فقط.',
        'الساعة متوقفة عند السابعة، وفي اللوحة خمسة طيور. شبّاك واحد مسدود بالألواح، وشمعتان مطفأتان.',
        'الأقراص هي: الساعة ٧، الطير ٥، الشبّاك ٢، الشمعة ٣. ثم اضغط «اسحب القفل».'
      ]
    },
    onSkip(st) { st.doorOpen = true; }
  });
})();
