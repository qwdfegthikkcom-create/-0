/* الغرفة ٢: قاعة المرايا — توجيه شعاع الضوء بتدوير المرايا */
(() => {
  const W = 7, H = 5;
  const START = { x: 0, y: 1, d: 'E' };            // القنديل يرسل الضوء شرقاً في الصف الثاني
  const TARGET = { x: W, y: 3, d: 'E' };           // البلّورة على الجدار المقابل في الصف الرابع
  const PILLARS = ['0,2', '2,2', '4,0'];
  const FIXED = { '2,0': '/', '6,0': '/' };
  const STAND = '2,3';
  // عدد أرباع الدورات الابتدائي لكل مرآة (زوجي = «\»، فردي = «/»)
  const INIT_ROT = { '1,1': 1, '1,3': 1, '2,4': 1, '4,2': 0, '4,3': 1, '6,2': 1, '6,4': 0, '1,4': 0 };
  const STAND_ROT = 1;
  const SOLUTION = { '1,1': '\\', '1,3': '\\', '2,3': '\\', '2,4': '\\', '6,4': '/', '6,2': '\\', '4,2': '/', '4,3': '\\' };

  const DIR = { E: [1, 0], W: [-1, 0], N: [0, -1], S: [0, 1] };
  const SLASH = { E: 'N', N: 'E', W: 'S', S: 'W' };
  const BACK = { E: 'S', S: 'E', W: 'N', N: 'W' };
  const ori = n => (n % 2 ? '/' : '\\');

  /* اتجاه المرآة في خلية معيّنة (أو null إن لم توجد) */
  const mirrorAt = (st, k, useSolution) => {
    if (FIXED[k]) return FIXED[k];
    if (k === STAND && !st.piecePlaced) return null;
    if (useSolution) return SOLUTION[k] || (st.rot[k] != null ? ori(st.rot[k]) : null);
    return st.rot[k] != null ? ori(st.rot[k]) : null;
  };

  /* تتبّع الشعاع — يعيد النقاط بوحدات الشبكة ونتيجة المسار */
  const trace = (st, useSolution) => {
    let x = START.x, y = START.y, d = START.d;
    const pts = [[-0.55, y + 0.5]];
    const seen = new Set();
    while (true) {
      if (x < 0 || y < 0 || x >= W || y >= H) {
        const [dx, dy] = DIR[d];
        const px = x + 0.5 - dx * 0.5 + dx * 0.25, py = y + 0.5 - dy * 0.5 + dy * 0.25;
        pts.push([px, py]);
        const hit = x === TARGET.x && y === TARGET.y && d === TARGET.d;
        return { pts, hit, end: 'wall' };
      }
      const k = x + ',' + y;
      if (seen.has(k + d)) { pts.push([x + 0.5, y + 0.5]); return { pts, hit: false, end: 'loop' }; }
      seen.add(k + d);
      if (PILLARS.includes(k)) {
        const [dx, dy] = DIR[d];
        pts.push([x + 0.5 - dx * 0.36, y + 0.5 - dy * 0.36]);
        return { pts, hit: false, end: 'pillar' };
      }
      const m = mirrorAt(st, k, useSolution);
      if (m) { pts.push([x + 0.5, y + 0.5]); d = m === '/' ? SLASH[d] : BACK[d]; }
      x += DIR[d][0]; y += DIR[d][1];
    }
  };

  /* ----- الأغراض ----- */
  G.defItem('matches', {
    name: 'علبة كبريت',
    desc: 'علبة كبريت قديمة، ما زالت فيها بضعة أعواد.',
    icon: `<rect x="10" y="22" width="44" height="28" rx="3" fill="#c9a14a" stroke="#5a3e14" stroke-width="2"/>
      <rect x="14" y="26" width="36" height="20" fill="#8a1c1c"/>
      ${A.star8(32, 36, 6, '#f6dc8a', 'none')}
      <path d="M22 22 L30 6 M30 22 L38 8" stroke="#e8d4a8" stroke-width="3" stroke-linecap="round"/>
      <circle cx="30" cy="6" r="3" fill="#b82020"/><circle cx="38" cy="8" r="3" fill="#b82020"/>`
  });
  G.defItem('mirrorPiece', {
    name: 'مرآة مستديرة',
    desc: 'مرآة صغيرة في إطار نحاسي، لها قاعدة تُركَّب عليها. تبدو كأنها قطعة ناقصة من شيء ما.',
    icon: `<circle cx="32" cy="30" r="22" fill="url(#gBrass)" stroke="#5a3e14" stroke-width="2"/>
      <circle cx="32" cy="30" r="16" fill="url(#gMirror)"/>
      <path d="M22 24 L30 16" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/>
      <rect x="27" y="50" width="10" height="10" fill="url(#gBrass)" stroke="#5a3e14"/>`
  });
  G.defItem('sunCrystal', {
    name: 'بلّورة الشمس',
    desc: 'بلّورة صافية ما زالت دافئة، كأنها تحتفظ بشيء من الضوء في داخلها.',
    icon: `<path d="M32 4 L50 22 L42 58 L22 58 L14 22Z" fill="url(#gCrystal)" stroke="#1d3850" stroke-width="2"/>
      <path d="M32 4 L32 58 M14 22 L50 22 M22 58 L32 22 L42 58" stroke="#e8f6ff" stroke-width="1.2" opacity=".6" fill="none"/>
      <circle cx="32" cy="30" r="10" fill="#fff2b0" opacity=".45"/>`
  });

  /* ----- إسقاط شبكة المنصّة على المشهد ----- */
  const proj = (u, v) => {
    const t = v / H, y = 452 + t * 148;
    const l = 420 - 90 * t, r = 860 + 90 * t;
    return [l + (r - l) * u / W, y];
  };

  const drawPlatform = st => {
    let grid = '';
    for (let i = 0; i <= W; i++) { const a = proj(i, 0), b = proj(i, H); grid += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`; }
    for (let j = 0; j <= H; j++) { const a = proj(0, j), b = proj(W, j); grid += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`; }
    const [tl, tr, br, bl] = [proj(0, 0), proj(W, 0), proj(W, H), proj(0, H)];
    let objs = '';
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const k = x + ',' + y, c = proj(x + 0.5, y + 0.5), s = 0.7 + y * 0.07;
      if (PILLARS.includes(k)) objs += `<ellipse cx="${c[0]}" cy="${c[1] + 4}" rx="${13 * s}" ry="${6 * s}" fill="#000" opacity=".4"/><rect x="${c[0] - 9 * s}" y="${c[1] - 26 * s}" width="${18 * s}" height="${28 * s}" fill="url(#gMarbleH)"/><ellipse cx="${c[0]}" cy="${c[1] - 26 * s}" rx="${9 * s}" ry="${4 * s}" fill="#d8dfdf"/>`;
      const m = mirrorAt(st, k);
      if (m || k === STAND) objs += `<ellipse cx="${c[0]}" cy="${c[1]}" rx="${11 * s}" ry="${5 * s}" fill="${FIXED[k] ? '#6e5a3a' : 'url(#gBrass)'}"/>`;
      if (m) {
        const a = proj(x + 0.5 + (m === '/' ? 0.28 : -0.28), y + 0.5 - 0.28), b = proj(x + 0.5 + (m === '/' ? -0.28 : 0.28), y + 0.5 + 0.28);
        objs += `<line x1="${a[0]}" y1="${a[1] - 8 * s}" x2="${b[0]}" y2="${b[1] - 8 * s}" stroke="#e8f1f3" stroke-width="${5 * s}" stroke-linecap="round"/><line x1="${a[0]}" y1="${a[1] - 8 * s}" x2="${b[0]}" y2="${b[1] - 8 * s}" stroke="#5a7078" stroke-width="${1.5 * s}"/>`;
      }
    }
    let beam = '';
    if (st.lampLit) {
      const pts = trace(st).pts.map(([u, v]) => proj(u, v).join(',')).join(' ');
      beam = `<polyline points="${pts}" fill="none" stroke="#ffcf6a" stroke-width="9" opacity=".45" filter="url(#fBlur3)"/><polyline points="${pts}" fill="none" stroke="#fff6d0" stroke-width="2.5" stroke-linejoin="round"/>`;
    }
    const rc = proj(W + 0.35, 3.5);
    return `<g data-hs="board" class="hs">
      <polygon points="${tl} ${tr} ${br} ${bl}" fill="url(#gMarble)" stroke="#4b5457" stroke-width="2"/>
      <polygon points="${bl} ${br} ${br[0]},${br[1] + 14} ${bl[0]},${bl[1] + 14}" fill="#6f7b7e"/>
      <g stroke="#56616a" stroke-width="1.2" opacity=".8">${grid}</g>
      ${objs}
      <g class="nopoint">${beam}</g>
      <path d="M${rc[0] - 10} ${rc[1]} L${rc[0]} ${rc[1] - 22} L${rc[0] + 10} ${rc[1]} L${rc[0]} ${rc[1] + 8}Z" fill="${st.solved ? 'url(#gCrystalLit)' : 'url(#gCrystal)'}" stroke="#1d3850"/>
      ${st.solved ? `<circle cx="${rc[0]}" cy="${rc[1] - 8}" r="26" fill="url(#gFlameGlow)" class="halo nopoint"/>` : ''}
    </g>`;
  };

  const drawLamp = (x, y, lit, s = 1) => `
    <path d="M${x - 16 * s} ${y + 34 * s} L${x + 16 * s} ${y + 34 * s} L${x + 10 * s} ${y + 26 * s} L${x - 10 * s} ${y + 26 * s}Z" fill="url(#gBrass)" stroke="#5a3e14"/>
    <path d="M${x - 13 * s} ${y + 26 * s} L${x - 10 * s} ${y - 12 * s} L${x + 10 * s} ${y - 12 * s} L${x + 13 * s} ${y + 26 * s}Z" fill="${lit ? '#ffd98a' : '#2a2a2a'}" opacity="${lit ? 0.9 : 0.8}" stroke="#5a3e14" stroke-width="2"/>
    <path d="M${x - 11 * s} ${y + 6 * s} H${x + 11 * s} M${x} ${y - 12 * s} V${y + 26 * s}" stroke="#5a3e14" stroke-width="${1.5 * s}"/>
    <path d="M${x - 14 * s} ${y - 12 * s} L${x} ${y - 28 * s} L${x + 14 * s} ${y - 12 * s}Z" fill="url(#gBrass)" stroke="#5a3e14"/>
    <circle cx="${x}" cy="${y - 32 * s}" r="${4 * s}" fill="none" stroke="url(#gBrass)" stroke-width="${2 * s}"/>
    ${lit ? A.flame(x, y + 20 * s, 0.9 * s) : ''}`;

  const drawDoor2 = st => {
    const ap = A.archPath(1034, 190, 132, 310, 80);
    const leaf = (x, w) => `
      <rect x="${x}" y="190" width="${w}" height="310" fill="#1f4a36"/>
      <rect x="${x}" y="190" width="${w}" height="310" fill="url(#pGrainV)"/>
      <rect x="${x + 8}" y="250" width="${w - 16}" height="100" fill="none" stroke="#c9a14a" stroke-width="2"/>
      <rect x="${x + 8}" y="365" width="${w - 16}" height="120" fill="none" stroke="#c9a14a" stroke-width="2"/>
      ${A.star8(x + w / 2, 300, 12, 'none', '#c9a14a')}
      ${A.star8(x + w / 2, 425, 14, 'none', '#c9a14a')}`;
    return `<g id="door2" class="${st.doorOpen ? 'door-open' : ''}">
      <path d="${A.archPath(1000, 108, 200, 392, 122)}" fill="url(#gMarble)" stroke="#5a6568" stroke-width="3"/>
      <path d="${A.archPath(1016, 126, 168, 374, 104)}" fill="url(#pCarve)" stroke="#6f7b7e" stroke-width="2"/>
      <defs><clipPath id="clipDoor2"><path d="${ap}"/></clipPath></defs>
      <g clip-path="url(#clipDoor2)">
        <rect x="1030" y="180" width="140" height="330" fill="#140a04"/>
        <g class="door-light">
          <rect x="1030" y="180" width="140" height="330" fill="#3a2a18"/>
          <rect x="1050" y="250" width="16" height="250" fill="#6a4a2a"/><rect x="1080" y="230" width="16" height="270" fill="#6a4a2a"/><rect x="1110" y="250" width="16" height="250" fill="#6a4a2a"/><rect x="1140" y="240" width="16" height="260" fill="#6a4a2a"/>
          <ellipse cx="1100" cy="350" rx="60" ry="150" fill="#ffd98a" opacity=".25" filter="url(#fBlur14)"/>
        </g>
        <g class="door-leaf l">${leaf(1034, 66)}<circle cx="1088" cy="330" r="7" fill="none" stroke="url(#gBrass)" stroke-width="3"/></g>
        <g class="door-leaf r">${leaf(1100, 66)}<rect x="1098" y="190" width="4" height="310" fill="#0e2218"/><circle cx="1112" cy="330" r="7" fill="none" stroke="url(#gBrass)" stroke-width="3"/></g>
      </g>
      <path d="${ap}" fill="none" stroke="#1c1008" stroke-width="4"/>
      ${st.doorOpen ? '' : `<rect data-hs="door2" class="hs-area hs" x="1034" y="200" width="132" height="296"/>`}
      <g data-hs="eye" class="hs">
        <circle cx="1100" cy="152" r="24" fill="url(#gGold)" stroke="#4a3210" stroke-width="2"/>
        ${st.doorOpen ? `<circle cx="1100" cy="152" r="15" fill="#1a100a"/>` :
          `<path d="M1100 134 L1114 148 L1108 168 L1092 168 L1086 148Z" fill="${st.solved ? 'url(#gCrystalLit)' : 'url(#gCrystal)'}" stroke="#1d3850" stroke-width="1.5"/>`}
      </g>
      ${st.solved && !st.doorOpen ? `<circle cx="1100" cy="152" r="50" fill="url(#gFlameGlow)" class="halo nopoint"/>` : ''}
    </g>`;
  };

  const drawCurtain = st => {
    const ap = A.archPath(548, 118, 184, 290, 110);
    return `<g>
      <path d="${A.archPath(536, 106, 208, 306, 122)}" fill="url(#gGold)" stroke="#4a3210" stroke-width="2"/>
      <path d="${ap}" fill="#0c1a13"/>
      <path d="${A.archPath(580, 170, 120, 232, 70)}" fill="url(#pMosaic)" opacity=".5"/>
      <rect x="590" y="330" width="100" height="10" fill="url(#gWood)" stroke="#1c1008"/>
      ${st.curtainOpen && !st.pieceTaken ? `<g data-hs="piece" class="hs">
          <rect x="634" y="316" width="12" height="16" fill="url(#gBrass)"/>
          <circle cx="640" cy="298" r="22" fill="url(#gBrass)" stroke="#5a3e14" stroke-width="2"/>
          <circle cx="640" cy="298" r="16" fill="url(#gMirror)"/>
          <path d="M630 290 L638 282" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
        </g>${A.sparkle(656, 284, 1)}${A.sparkle(626, 310, .7, 'd1')}` : ''}
      <g data-hs="curtain" class="hs">
        ${st.curtainOpen ? `
          <path d="M548 118 L580 118 Q590 250 572 408 L548 408Z" fill="url(#gVelvet)" stroke="#0a1a12"/>
          <path d="M732 118 L700 118 Q690 250 708 408 L732 408Z" fill="url(#gVelvet)" stroke="#0a1a12"/>
          <path d="M556 270 Q575 262 586 272" stroke="url(#gGold)" stroke-width="5" fill="none"/>
          <path d="M724 270 Q705 262 694 272" stroke="url(#gGold)" stroke-width="5" fill="none"/>`
        : `
          <path d="M548 118 L732 118 L732 408 L548 408Z" fill="url(#gVelvet)" stroke="#0a1a12"/>
          ${[570, 600, 630, 660, 690, 715].map(x => `<path d="M${x} 118 Q${x + 6} 260 ${x - 2} 408" stroke="#0a1a12" stroke-width="2" fill="none" opacity=".5"/>`).join('')}
          <path d="M548 404 Q590 396 640 404 Q690 396 732 404" stroke="url(#gGold)" stroke-width="4" fill="none"/>`}
        <rect x="536" y="112" width="208" height="10" rx="4" fill="url(#gGoldH)"/>
      </g>
    </g>`;
  };

  const drawDresser = st => `
    <g>
      <ellipse cx="165" cy="512" rx="105" ry="8" fill="#000" opacity=".4" class="nopoint"/>
      <rect x="70" y="330" width="190" height="175" rx="4" fill="url(#gWoodV)" stroke="#1c1008" stroke-width="2"/>
      <rect x="70" y="330" width="190" height="175" fill="url(#pGrain)"/>
      <rect x="62" y="322" width="206" height="14" rx="3" fill="#4a2e19" stroke="#1c1008" stroke-width="2"/>
      <g data-hs="drawer1" class="hs">
        ${st.drawerOpen ? `
          <rect x="82" y="350" width="166" height="58" fill="#1a100a"/>
          <path d="M72 406 L258 406 L266 426 L64 426Z" fill="#6a4326" stroke="#1c1008" stroke-width="2"/>
          <path d="M82 350 L248 350 L258 406 L72 406Z" fill="#2b1a0e" stroke="#1c1008"/>
          <circle cx="165" cy="416" r="4" fill="url(#gBrass)"/>`
        : `<rect x="82" y="350" width="166" height="58" rx="3" fill="#5a3a22" stroke="#1c1008" stroke-width="2"/>
          <rect x="90" y="358" width="150" height="42" fill="none" stroke="#c9a14a" stroke-width="1" opacity=".5"/>
          <circle cx="165" cy="379" r="5" fill="url(#gBrass)"/>`}
      </g>
      ${st.drawerOpen && !st.matchesTaken ? `<g data-hs="matchbox" class="hs"><circle cx="158" cy="395" r="20" fill="transparent"/>
        <rect x="140" y="386" width="36" height="18" rx="2" fill="#c9a14a" stroke="#5a3e14"/><rect x="144" y="389" width="28" height="12" fill="#8a1c1c"/>
      </g>${A.sparkle(172, 384, .8)}` : ''}
      <g data-hs="drawer2" class="hs">
        <rect x="82" y="${st.drawerOpen ? 432 : 420}" width="166" height="${st.drawerOpen ? 62 : 74}" rx="3" fill="#5a3a22" stroke="#1c1008" stroke-width="2"/>
        <circle cx="165" cy="${st.drawerOpen ? 463 : 457}" r="5" fill="url(#gBrass)"/>
      </g>
      <g data-hs="wallMirror" class="hs">
        <path d="${A.archPath(100, 122, 130, 190, 70)}" fill="url(#gGold)" stroke="#4a3210" stroke-width="2"/>
        <path d="${A.archPath(112, 136, 106, 166, 58)}" fill="url(#gMirror)"/>
        <path d="M130 180 L160 150 M140 210 L185 165" stroke="#fff" stroke-width="4" opacity=".35" class="glint"/>
      </g>
    </g>`;

  const mosaicNiche = (x, y, w, h, id) => `
    <g data-hs="${id}" class="hs">
      <path d="${A.archPath(x, y, w, h, w * 0.6)}" fill="url(#gGold)" stroke="#4a3210" stroke-width="2"/>
      <path d="${A.archPath(x + 8, y + 10, w - 16, h - 14, (w - 16) * 0.6)}" fill="url(#pMosaic)"/>
      <path d="${A.archPath(x + 8, y + 10, w - 16, h - 14, (w - 16) * 0.6)}" fill="#0c1a13" opacity=".35"/>
      ${A.star8(x + w / 2, y + h * 0.45, w * 0.22, 'url(#gMirror)', '#4a6068')}
    </g>`;

  /* ----- الغرفة ----- */
  G.defRoom({
    id: 'mirrors',
    name: 'قاعة المرايا',
    par: 300,
    relic: 'sunCrystal',
    carry: ['matches'],
    intro: 'قاعة معتمة، جدرانها مرصّعة بقطع المرايا. وسطها منصّة رخامية عليها مرايا صغيرة، وفي أعلى الباب بلّورة مطفأة.',
    doneTitle: 'أبصرت عين الباب!',
    doneText: 'اشتعلت البلّورة بنور ذهبي، ودار الباب الأخضر على مفصلاته... وسقطت البلّورة الدافئة في يدك.',
    init: () => ({ drawerOpen: false, matchesTaken: false, lampLit: false, curtainOpen: false, pieceTaken: false, piecePlaced: false, rot: Object.assign({}, INIT_ROT), showPath: false, solved: false, doorOpen: false }),

    render(st) {
      return `
      <rect x="0" y="90" width="1280" height="360" fill="url(#gPlasterGreen)"/>
      <rect x="0" y="90" width="1280" height="360" fill="url(#pPlasterTex)"/>
      ${A.ceiling()}
      ${A.dadoFloor(440, 500)}
      ${mosaicNiche(372, 130, 110, 270, 'mosaic')}
      ${mosaicNiche(806, 126, 110, 150, 'mosaic')}
      <g data-hs="plaque" class="hs">
        <rect x="792" y="292" width="138" height="92" rx="6" fill="url(#gMarble)" stroke="#4b5457" stroke-width="3"/>
        <rect x="800" y="300" width="122" height="76" rx="3" fill="none" stroke="#6f7b7e" stroke-width="1.5"/>
        ${[318, 336, 354].map((y, i) => `<path d="M${812 + i * 6} ${y} q20 -6 40 0 t40 0" stroke="#3a4448" stroke-width="2.5" fill="none" opacity=".75"/>`).join('')}
      </g>
      ${drawDresser(st)}
      ${drawCurtain(st)}
      ${drawDoor2(st)}
      ${drawPlatform(st)}
      <g data-hs="lamp" class="hs">
        <rect x="358" y="505" width="30" height="18" fill="url(#gMarbleH)" stroke="#4b5457"/>
        ${drawLamp(373, 468, st.lampLit, 1)}
      </g>
      ${st.lampLit ? A.warmLight(380, 470, 360, 0.9) : ''}
      <rect class="nopoint" x="0" y="0" width="1280" height="620" fill="#02060a" opacity="${st.lampLit ? 0.12 : 0.5}" style="transition:opacity 1.2s"/>
      ${st.lampLit ? '' : `<g class="nopoint">${A.sparkle(430, 250, .8)}${A.sparkle(850, 190, .7, 'd1')}${A.sparkle(165, 190, .9, 'd2')}</g>`}
      ${A.vignette()}`;
    },

    click(id, st, el) {
      if (id.startsWith('m:')) return this.rotateMirror(id.slice(2), st);
      switch (id) {
        case 'board': G.openCU('board'); break;
        case 'lamp': case 'lampCU':
          G.say(st.lampLit ? 'القنديل مشتعل، ونوره يسري فوق المنصّة.' : 'قنديل نحاسي مطفأ عند طرف المنصّة. فيه زيت، لكن لا شيء تشعله به.'); break;
        case 'drawer1':
          if (!st.drawerOpen) { st.drawerOpen = true; SFX.slide(); G.update(); G.say(st.matchesTaken ? 'الدرج مفتوح.' : 'فتحت الدرج العلوي... في داخله علبة صغيرة.'); }
          else G.say('الدرج العلوي مفتوح.');
          break;
        case 'matchbox': st.matchesTaken = true; G.addItem('matches', el); G.update(); break;
        case 'drawer2': SFX.slide(); G.say('الدرج السفلي لا يحوي إلا مشطاً خشبياً قديماً ومنديلاً مطرّزاً... من أغراض جدّتك.'); break;
        case 'wallMirror': G.say('ترى وجهك المتعب في المرآة القديمة، وخلفك تلمع آلاف القطع الصغيرة في الجدران.'); break;
        case 'mosaic': G.say('فسيفساء من قطع المرايا الصغيرة، تعكس كل بصيص ضوء. كانت هذه قاعة الضيوف.'); break;
        case 'plaque': G.openCU('plaque'); break;
        case 'curtain':
          if (!st.curtainOpen) { st.curtainOpen = true; SFX.rustle(); G.update(); G.say(st.pieceTaken ? 'فتحت الستارة.' : 'أزحت الستارة المخملية... في الطاق مرآة صغيرة مستديرة!'); }
          else G.say('طاق مزخرف خلف الستارة الخضراء.');
          break;
        case 'piece': st.pieceTaken = true; G.addItem('mirrorPiece', el); G.update(); break;
        case 'stand': G.say('قاعدة نحاسية فارغة... يبدو أن مرآتها مفقودة.'); break;
        case 'fixed': SFX.error(); G.say('هذه المرآة مثبّتة بمسامير، لا يمكن تدويرها.'); break;
        case 'pillar': G.say('عمود حجري صغير. الضوء لا يعبر الحجر.'); break;
        case 'crystalCU': case 'eye': G.say(st.solved ? 'البلّورة تتوهّج بالنور.' : 'بلّورة صافية مطفأة... كأنها عين تنتظر أن تبصر النور.'); break;
        case 'door2': G.say('باب خشبي أخضر بلا قفل ولا مقبض. في أعلاه بلّورة كأنها عين.'); break;
      }
    },

    use(id, item, st, el) {
      if (item === 'matches' && (id === 'lamp' || id === 'lampCU')) {
        if (st.lampLit) { G.say('القنديل مشتعل بالفعل.'); return true; }
        st.lampLit = true; SFX.match(); G.update();
        if (G.cu === 'board') G.refreshCU(true);
        setTimeout(() => SFX.chime(4), 400);
        G.say('أشعلت القنديل... انطلق شعاع ذهبي فوق المنصّة وارتدّ عن المرايا!');
        this.checkSolved(st);
        return true;
      }
      if (item === 'mirrorPiece' && (id === 'stand' || id === 'board')) {
        st.piecePlaced = true; st.rot[STAND] = STAND_ROT;
        SFX.unlock(); G.removeItem('mirrorPiece'); G.update();
        if (G.cu === 'board') G.refreshCU(true);
        G.say('ركّبت المرآة المستديرة على القاعدة الفارغة. تستقرّ في مكانها بطقّة.');
        this.checkSolved(st);
        return true;
      }
      if (item === 'mirrorPiece' && id.startsWith('m:')) { G.say('هذه القاعدة فيها مرآة بالفعل. ابحث عن القاعدة الفارغة.'); return true; }
      if (item === 'matches' && (id === 'curtain' || id === 'plaque')) { G.say('لا! لا تحرق بيت جدّك.'); return true; }
      return false;
    },

    rotateMirror(k, st) {
      if (st.solved || FIXED[k]) return;
      st.rot[k] = (st.rot[k] || 0) + 1;
      SFX.rotate();
      const g = document.getElementById('mr-' + k.replace(',', '-'));
      if (g) g.style.transform = `rotate(${45 + st.rot[k] * 90}deg)`;
      this.drawBeamCU(st);
      G.renderScene();
      G.save();
      this.checkSolved(st);
    },

    beamSVG(st) {
      if (!st.lampLit) return '';
      const P = ([u, v]) => `${105 + u * 70},${40 + v * 70}`;
      const r = trace(st);
      const pts = r.pts.map(P).join(' ');
      const last = r.pts[r.pts.length - 1];
      let guide = '';
      if (st.showPath && !r.hit) {
        guide = `<polyline points="${trace(Object.assign({}, st, { piecePlaced: true }), true).pts.map(P).join(' ')}" fill="none" stroke="#f6dc8a" stroke-width="3" stroke-dasharray="3 9" stroke-linecap="round" opacity=".75"/>`;
      }
      return `${guide}
        <polyline points="${pts}" fill="none" stroke="#ffb640" stroke-width="16" opacity=".35" filter="url(#fBlur6)" stroke-linejoin="round"/>
        <polyline points="${pts}" fill="none" stroke="#ffe7a0" stroke-width="6" opacity=".9" stroke-linejoin="round"/>
        <polyline class="beam-core" points="${pts}" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round"/>
        <circle cx="${P(last).split(',')[0]}" cy="${P(last).split(',')[1]}" r="14" fill="url(#gFlameGlow)"/>`;
    },
    drawBeamCU(st) {
      const g = document.getElementById('beamCU');
      if (g) g.innerHTML = this.beamSVG(st);
      const cr = document.getElementById('crystalCU');
      if (cr) cr.setAttribute('fill', trace(st).hit && st.lampLit ? 'url(#gCrystalLit)' : 'url(#gCrystal)');
    },

    checkSolved(st) {
      if (st.solved || !st.lampLit || !st.piecePlaced) return;
      if (!trace(st).hit) return;
      st.solved = true;
      G.busy = true;
      G.save();
      SFX.success();
      const glow = document.getElementById('crystalGlow');
      if (glow) glow.style.opacity = '1';
      const cap = document.querySelector('#closeup .cu-caption');
      if (cap) cap.textContent = 'وصل الشعاع إلى البلّورة!';
      setTimeout(() => {
        G.closeCU();
        G.renderScene();
        setTimeout(() => {
          const door = document.getElementById('door2');
          if (door) { door.querySelectorAll('[data-hs="door2"]').forEach(e => e.remove()); door.classList.add('door-open'); }
          SFX.creak();
          setTimeout(() => { st.doorOpen = true; G.busy = false; G.save(); G.completeRoom(); }, 1800);
        }, 900);
      }, 1400);
    },

    closeups: {
      board: {
        title: 'منصّة المرايا',
        manual: true,
        render(st) {
          const room = G.room();
          let cells = '';
          for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const cx = 105 + x * 70 + 35, cy = 40 + y * 70 + 35, k = x + ',' + y;
            cells += `<rect x="${cx - 35}" y="${cy - 35}" width="70" height="70" fill="${(x + y) % 2 ? '#a9b3b5' : '#bcc5c6'}" stroke="#6f7b7e" stroke-width="1"/>`;
            if (PILLARS.includes(k)) {
              cells += `<g data-hs="pillar" class="hs"><circle cx="${cx}" cy="${cy + 3}" r="27" fill="#000" opacity=".3"/><circle cx="${cx}" cy="${cy}" r="26" fill="url(#gMarbleH)" stroke="#4b5457" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="18" fill="none" stroke="#6f7b7e" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="8" fill="#dfe6e6"/></g>`;
            } else if (FIXED[k]) {
              const n = FIXED[k] === '/' ? 1 : 0;
              cells += `<g data-hs="fixed" class="hs"><circle cx="${cx}" cy="${cy}" r="25" fill="#5a4a32" stroke="#2b1a0e" stroke-width="2"/>
                <g transform="translate(${cx} ${cy}) rotate(${45 + n * 90})"><rect x="-29" y="-4" width="58" height="8" rx="2" fill="url(#gMirror)" stroke="#2b3a40" stroke-width="1.5"/></g>
                ${[[-16, -16], [16, 16], [16, -16], [-16, 16]].map(([a, b]) => `<circle cx="${cx + a}" cy="${cy + b}" r="3" fill="#2b1a0e"/>`).join('')}</g>`;
            } else if (k === STAND && !st.piecePlaced) {
              cells += `<g data-hs="stand" class="hs"><circle cx="${cx}" cy="${cy}" r="25" fill="url(#gBrass)" stroke="#5a3e14" stroke-width="2"/><rect x="${cx - 6}" y="${cy - 6}" width="12" height="12" fill="#2b1a0e"/>
                <circle cx="${cx}" cy="${cy}" r="30" fill="none" stroke="#f6dc8a" stroke-width="2" stroke-dasharray="4 5" class="halo"/></g>`;
            } else if (st.rot[k] != null) {
              const round = k === STAND;
              cells += `<g data-hs="m:${k}" class="hs"><circle cx="${cx}" cy="${cy}" r="25" fill="url(#gBrass)" stroke="#5a3e14" stroke-width="2"/>
                <circle cx="${cx}" cy="${cy}" r="5" fill="#5a3e14"/>
                <g transform="translate(${cx} ${cy})"><g id="mr-${k.replace(',', '-')}" class="mirror-rot" style="transform:rotate(${45 + st.rot[k] * 90}deg)">
                  <rect x="-31" y="-5" width="62" height="10" rx="${round ? 5 : 2}" fill="url(#gMirror)" stroke="#2b3a40" stroke-width="1.5"/>
                  <rect x="-31" y="3" width="62" height="3" fill="#3b2413"/>
                </g></g></g>`;
            }
          }
          const ly = 40 + 1.5 * 70, ty = 40 + 3.5 * 70;
          return `
          <svg width="720" height="430" viewBox="0 0 720 430">
            <rect x="80" y="16" width="540" height="398" rx="12" fill="url(#gMarble)" stroke="#4b5457" stroke-width="3"/>
            <rect x="92" y="28" width="516" height="374" rx="6" fill="url(#pCarve)" opacity=".6"/>
            ${cells}
            <rect x="105" y="40" width="490" height="350" fill="none" stroke="#4b5457" stroke-width="3"/>
            <g data-hs="lampCU" class="hs">${drawLamp(58, ly - 6, st.lampLit, 1.25)}</g>
            <g id="beamCU" class="beam">${room.beamSVG(st)}</g>
            <g data-hs="crystalCU" class="hs">
              <circle id="crystalGlow" cx="640" cy="${ty}" r="46" fill="url(#gFlameGlow)" opacity="${st.solved ? 1 : 0}" style="transition:opacity .6s"/>
              <rect x="618" y="${ty - 30}" width="44" height="60" rx="8" fill="url(#gGold)" stroke="#4a3210" stroke-width="2"/>
              <path id="crystalCU" d="M640 ${ty - 22} L654 ${ty - 6} L648 ${ty + 20} L632 ${ty + 20} L626 ${ty - 6}Z" fill="${st.solved ? 'url(#gCrystalLit)' : 'url(#gCrystal)'}" stroke="#1d3850" stroke-width="1.5"/>
            </g>
          </svg>
          <div class="cu-caption">${!st.lampLit ? 'القنديل مطفأ... لا ضوء يسري بين المرايا.' : !st.piecePlaced ? 'إحدى القواعد النحاسية فارغة بلا مرآة.' : 'اضغط على مرآة لتدويرها. أوصل الشعاع إلى البلّورة.'}</div>`;
        }
      },
      plaque: {
        title: 'لوح رخامي منقوش',
        render: () => `<div class="paper" style="text-align:center;font-size:26px;background:linear-gradient(180deg,#d4dbdb,#a9b3b5);color:#2b3538;box-shadow:inset 0 0 30px rgba(40,50,55,.5)">
          «النورُ يمضي مستقيماً ما لم تردّه مرآة،<br>ولا يعبرُ الحجر.<br>وعينُ الباب لا تنفتح حتى تُبصر النور.»</div>`
      }
    },

    hintStage(st) {
      if (!st.lampLit) return G.has('matches') ? 'haveMatches' : 'findMatches';
      if (!st.piecePlaced) return G.has('mirrorPiece') ? 'havePiece' : 'findPiece';
      return 'beam';
    },
    hints: {
      findMatches: [
        'المرايا لا تنفع بلا ضوء. القنديل النحاسي عند طرف المنصّة مطفأ.',
        'ابحث في أثاث الغرفة عن شيء تُشعل به القنديل.',
        'افتح الدرج العلوي للخزانة الخشبية على اليسار، وخذ علبة الكبريت، ثم استخدمها على القنديل.'
      ],
      haveMatches: [
        'معك علبة كبريت... ما الشيء الذي يحتاج أن يُشعَل هنا؟',
        'القنديل عند طرف المنصّة الرخامية.',
        'اختر الكبريت من شريط الأغراض، ثم اضغط على القنديل.'
      ],
      findPiece: [
        'انظر إلى المنصّة عن قرب: إحدى القواعد النحاسية بلا مرآة.',
        'المرآة الناقصة مخبّأة في هذه القاعة، خلف شيء يُسدَل.',
        'أزح الستارة الخضراء في وسط الجدار، وخذ المرآة المستديرة، ثم ضعها على القاعدة الفارغة في المنصّة.'
      ],
      havePiece: [
        'معك مرآة مستديرة لها قاعدة... أين مكانها؟',
        'في منصّة المرايا قاعدة نحاسية فارغة.',
        'افتح المنصّة، واختر المرآة من شريط الأغراض، ثم اضغط على القاعدة الفارغة.'
      ],
      beam: [
        'تتبّع الشعاع من القنديل. كل ضغطة تدير المرآة ربع دورة فتغيّر اتجاه الضوء. المرايا المثبّتة بالمسامير لا تتحرك، والأعمدة الحجرية تحجب الضوء.',
        'البلّورة في الصف الرابع من الأعلى على الجهة المقابلة للقنديل. الطريق الصحيح ينزل أولاً، ويمرّ بالمرآة التي ركّبتها بنفسك، ثم يلتفّ في أسفل المنصّة.',
        'رُسم الآن الطريق الصحيح بخط ذهبي منقّط على المنصّة. أدر المرايا التي على الخط حتى يطابقه الشعاع.'
      ]
    },
    onHint(key, lvl, st) {
      if (key === 'beam' && lvl >= 3) { st.showPath = true; if (G.cu === 'board') this.drawBeamCU(st); }
    },
    onSkip(st) { st.solved = true; st.doorOpen = true; }
  });
})();
