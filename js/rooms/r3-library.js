/* الغرفة ٣: المكتبة — ترتيب الكتب حسب ألوان الزجاج المعشّق وأطوالها */
(() => {
  const COLORS = {
    green: { fill: '#2f6b3a', dark: '#1a3f22', name: 'أخضر' },
    red: { fill: '#8c2626', dark: '#541414', name: 'أحمر' },
    blue: { fill: '#2a4a8c', dark: '#172a52', name: 'أزرق' },
    gold: { fill: '#b8892a', dark: '#6e5014', name: 'ذهبي' }
  };
  const BOOKS = {
    g1: { c: 'green', h: 162 }, g2: { c: 'green', h: 122 },
    r1: { c: 'red', h: 150 }, r2: { c: 'red', h: 112 },
    b1: { c: 'blue', h: 166 }, b2: { c: 'blue', h: 126 },
    y1: { c: 'gold', h: 156 }, y2: { c: 'gold', h: 118 }
  };
  // الحل من اليمين (الخانة ٠) إلى اليسار (الخانة ٧)
  const SOLUTION = ['g1', 'g2', 'r1', 'r2', 'b1', 'b2', 'y1', 'y2'];
  const INIT = ['b2', 'y1', null, 'g2', 'r1', 'y2', 'g1', 'b1']; // الكتاب الأحمر القصير تحت الكرسي
  const SLOT_X = i => 660 - i * 80;   // الخانة ٠ على اليمين
  const SHELF_Y = 330;

  /* ----- الأغراض ----- */
  G.defItem('cane', {
    name: 'عكّاز الجدّ',
    desc: 'عكّاز خشبي طويل بمقبض معقوف. كان جدّك لا يفارقه.',
    icon: `<path d="M18 16 Q18 6 28 6 Q38 6 38 16 L38 20" fill="none" stroke="#e8dcc0" stroke-width="6" stroke-linecap="round"/>
      <path d="M18 16 L46 58" stroke="url(#gWood)" stroke-width="7" stroke-linecap="round"/>
      <path d="M18 16 L46 58" stroke="#8a5a30" stroke-width="2" stroke-linecap="round" opacity=".6"/>
      <rect x="15" y="16" width="8" height="6" fill="url(#gBrass)" transform="rotate(-33 19 19)"/>`
  });
  G.defItem('redBook', {
    name: 'كتاب أحمر قصير',
    desc: 'كتاب قصير بغلاف أحمر، سقط تحت الكرسي. مكانه على أحد الرفوف.',
    icon: `<rect x="18" y="12" width="28" height="42" rx="2" fill="#8c2626" stroke="#3a0d0e" stroke-width="2"/>
      <rect x="18" y="18" width="28" height="4" fill="url(#gGold)"/><rect x="18" y="44" width="28" height="4" fill="url(#gGold)"/>
      ${A.star8(32, 33, 5, 'url(#gGold)', 'none')}`
  });
  G.defItem('magnifier', {
    name: 'عدسة مكبّرة',
    desc: 'عدسة زجاجية في إطار نحاسي بمقبض من الأبنوس، تكبّر الحروف الدقيقة.',
    icon: `<circle cx="26" cy="26" r="17" fill="url(#gMirror)" opacity=".85" stroke="url(#gBrass)" stroke-width="5"/>
      <path d="M17 20 Q20 14 27 13" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M38 38 L56 56" stroke="#1c1008" stroke-width="8" stroke-linecap="round"/>
      <path d="M37 37 L41 41" stroke="url(#gBrass)" stroke-width="8"/>`
  });
  G.defItem('quill', {
    name: 'الريشة الذهبية',
    desc: 'ريشة كتابة ذهبية كان جدّك يوقّع بها. على قصبتها نقش صغير لنجمة ثمانية.',
    icon: `<path d="M50 6 Q30 14 20 40 L16 54 L24 44 Q46 32 50 6Z" fill="url(#gGold)" stroke="#6e4a18" stroke-width="1.5"/>
      <path d="M50 6 L18 52" stroke="#6e4a18" stroke-width="1.5"/>
      <path d="M44 16 L36 18 M40 22 L31 25 M36 28 L27 32" stroke="#fff4c8" stroke-width="1.2" opacity=".7"/>`
  });

  /* ----- رسومات ----- */
  const bookSVG = (id, sel) => {
    const b = BOOKS[id], c = COLORS[b.c], h = b.h;
    return `<g id="bk-${id}" class="book" data-hs="bk:${id}">
      <rect x="-28" y="${-h}" width="56" height="${h}" rx="3" fill="${c.fill}" stroke="${c.dark}" stroke-width="2"/>
      <rect x="-28" y="${-h}" width="10" height="${h}" fill="#fff" opacity=".12"/>
      <rect x="18" y="${-h}" width="10" height="${h}" fill="#000" opacity=".2"/>
      <rect x="-28" y="${-h + 12}" width="56" height="6" fill="url(#gGold)"/>
      <rect x="-28" y="-18" width="56" height="6" fill="url(#gGold)"/>
      ${A.star8(0, -h / 2, 8, 'url(#gGold)', 'none')}
      <rect x="-12" y="${-h + 26}" width="24" height="${Math.max(10, h / 2 - 44)}" rx="2" fill="none" stroke="#f6dc8a" stroke-width="1" opacity=".7"/>
    </g>`;
  };

  const decoBooks = (x0, y, w, seed) => {
    const pal = ['#5a2a1a', '#2d4a3a', '#6b4a22', '#3a2f4a', '#7a3a24', '#2a3a4a', '#6e5a3a', '#4a1f1f'];
    let s = '', x = x0, i = seed;
    while (x < x0 + w - 12) {
      const bw = 10 + (i * 7) % 9, bh = 44 + (i * 13) % 26, col = pal[(i * 5) % pal.length];
      if (x + bw > x0 + w) break;
      if ((i * 11) % 13 === 0) {
        s += `<rect x="${x + 4}" y="${y - bh + 6}" width="${bw}" height="${bh - 4}" fill="${col}" stroke="#1c1008" transform="rotate(-12 ${x + 4} ${y})"/>`;
        x += bw + 10;
      } else {
        s += `<rect x="${x}" y="${y - bh}" width="${bw}" height="${bh}" fill="${col}" stroke="#1c1008" stroke-width="1"/><rect x="${x}" y="${y - bh + 6}" width="${bw}" height="3" fill="#c9a14a" opacity=".6"/>`;
        x += bw + 1;
      }
      i++;
    }
    return s;
  };

  const drawLeftShelves = () => {
    let shelves = '';
    [170, 250, 330, 410].forEach((y, i) => {
      shelves += decoBooks(46, y, 238, 3 + i * 7) + `<rect x="40" y="${y}" width="250" height="10" fill="#4a2e19" stroke="#1c1008"/>`;
    });
    return `<g data-hs="shelvesL" class="hs">
      <rect x="30" y="100" width="270" height="400" fill="url(#gWoodV)" stroke="#1c1008" stroke-width="3"/>
      <rect x="40" y="112" width="250" height="380" fill="#1a100a"/>
      ${shelves}
      <rect x="40" y="420" width="250" height="72" fill="url(#gWoodV)" stroke="#1c1008"/>
      <rect x="52" y="430" width="108" height="52" fill="none" stroke="#c9a14a" stroke-width="1" opacity=".5"/><rect x="170" y="430" width="108" height="52" fill="none" stroke="#c9a14a" stroke-width="1" opacity=".5"/>
      <path d="M26 100 L304 100 L296 86 L34 86Z" fill="#3b2413" stroke="#1c1008"/>
    </g>`;
  };

  const drawBookcase = st => {
    const slots = st.books.map((id, i) => {
      if (!id) return '';
      const b = BOOKS[id], c = COLORS[b.c], x = 556 + (7 - i) * 25.5, h = b.h * 0.5;
      return `<rect x="${x}" y="${392 - h}" width="22" height="${h}" rx="1.5" fill="${c.fill}" stroke="${c.dark}"/><rect x="${x}" y="${392 - h + 5}" width="22" height="3" fill="url(#gGold)"/>`;
    }).join('');
    return `<g>
      <rect x="540" y="108" width="220" height="392" fill="#0a0604"/>
      <g class="nopoint"><path d="M560 480 L740 480 L728 460 L572 460Z M572 460 L728 460 L716 440 L584 440Z M584 440 L716 440 L706 420 L594 420Z" fill="#3a3530" stroke="#1a1714"/>
      <ellipse cx="650" cy="300" rx="70" ry="160" fill="#ffcf80" opacity=".08" filter="url(#fBlur14)"/></g>
      <defs><clipPath id="clipCase"><rect x="520" y="60" width="260" height="450"/></clipPath></defs>
      <g clip-path="url(#clipCase)">
        <g id="bookcase" class="slide-away" style="${st.solved ? 'transform:translateX(250px)' : ''}">
          <rect x="530" y="100" width="240" height="400" fill="url(#gWoodV)" stroke="#1c1008" stroke-width="3"/>
          <rect x="530" y="100" width="240" height="400" fill="url(#pGrainV)"/>
          <path d="M526 100 L774 100 L760 82 Q650 50 540 82Z" fill="#3b2413" stroke="#1c1008"/>
          ${A.star8(650, 80, 12)}
          <rect x="542" y="112" width="216" height="112" fill="#1a100a"/>
          ${decoBooks(546, 214, 210, 21)}
          <rect x="540" y="214" width="220" height="10" fill="#4a2e19" stroke="#1c1008"/>
          <g data-hs="shelf" class="hs">
            <rect x="542" y="232" width="216" height="168" fill="#140c06" stroke="#c9a14a" stroke-width="2"/>
            <path d="M542 232 L758 232" stroke="url(#gGoldH)" stroke-width="4"/>
            ${slots}
            <rect x="540" y="392" width="220" height="10" fill="#4a2e19" stroke="#1c1008"/>
            <rect x="610" y="236" width="80" height="18" rx="3" fill="url(#gBrass)" stroke="#5a3e14"/>
            <path d="M620 245 h60" stroke="#5a3e14" stroke-width="2" stroke-dasharray="3 3"/>
          </g>
          <rect x="542" y="408" width="216" height="84" fill="url(#gWoodV)" stroke="#1c1008"/>
          <rect x="552" y="416" width="94" height="68" fill="none" stroke="#c9a14a" stroke-width="1.2" opacity=".6"/>
          <rect x="654" y="416" width="94" height="68" fill="none" stroke="#c9a14a" stroke-width="1.2" opacity=".6"/>
          ${A.star8(599, 450, 10, 'none', '#c9a14a')}${A.star8(701, 450, 10, 'none', '#c9a14a')}
        </g>
      </g>
    </g>`;
  };

  const drawDesk = st => `
    <g>
      <ellipse cx="415" cy="522" rx="95" ry="8" fill="#000" opacity=".4" class="nopoint"/>
      <rect x="326" y="398" width="178" height="14" rx="3" fill="url(#gWoodV)" stroke="#1c1008" stroke-width="2"/>
      <rect x="336" y="412" width="158" height="34" fill="#3b2413" stroke="#1c1008"/>
      ${[340, 480].map(x => `<rect x="${x}" y="446" width="10" height="72" fill="url(#gWood)" stroke="#1c1008"/>`).join('')}
      <g data-hs="desk" class="hs">
        ${st.deskOpen
          ? `<rect x="370" y="416" width="90" height="26" fill="#140c06"/><path d="M360 440 L470 440 L478 458 L352 458Z" fill="#5a3a22" stroke="#1c1008" stroke-width="2"/><circle cx="415" cy="450" r="3.5" fill="url(#gBrass)"/>`
          : `<rect x="370" y="416" width="90" height="26" rx="2" fill="#5a3a22" stroke="#1c1008" stroke-width="2"/><circle cx="415" cy="429" r="4" fill="url(#gBrass)"/>`}
      </g>
      ${st.deskOpen && !st.magTaken ? `<g data-hs="magPick" class="hs"><circle cx="408" cy="444" r="18" fill="transparent"/><circle cx="400" cy="440" r="9" fill="url(#gMirror)" stroke="url(#gBrass)" stroke-width="3"/><path d="M407 446 L424 452" stroke="#1c1008" stroke-width="4" stroke-linecap="round"/></g>${A.sparkle(410, 432, .8)}` : ''}
      <g data-hs="inkwell" class="hs">
        <rect x="446" y="382" width="24" height="16" rx="3" fill="#1c1008" stroke="url(#gBrass)" stroke-width="2"/>
        <path d="M462 382 L480 350" stroke="#e8dcc0" stroke-width="2"/>
      </g>
      <g data-hs="papers" class="hs"><path d="M346 396 L400 390 L404 398 L350 402Z" fill="url(#gParch)" stroke="#8a6a3a"/></g>
    </g>`;

  const drawWindow3 = st => {
    const ap = A.archPath(930, 112, 128, 250, 76);
    // من اليسار إلى اليمين في الرسم: ذهبي، أزرق، أحمر، أخضر  (أي من اليمين: أخضر، أحمر، أزرق، ذهبي)
    const panes = ['gold', 'blue', 'red', 'green'].map((c, i) => `<rect x="${936 + i * 29}" y="112" width="29" height="250" fill="${COLORS[c].fill}"/>
      <rect x="${936 + i * 29}" y="112" width="29" height="250" fill="#fff" opacity=".25"/>`).join('');
    return `<g>
      <defs><clipPath id="clipW3"><path d="${ap}"/></clipPath></defs>
      <path d="${A.archPath(920, 100, 148, 272, 88)}" fill="url(#gWoodV)" stroke="#1c1008" stroke-width="3"/>
      <g clip-path="url(#clipW3)">
        ${panes}
        <rect x="930" y="112" width="128" height="250" fill="none"/>
        ${[936, 965, 994, 1023, 1052].map(x => `<rect x="${x - 2}" y="112" width="4" height="250" fill="#1c1008"/>`).join('')}
        ${[170, 230, 290].map(y => `<rect x="930" y="${y}" width="128" height="3" fill="#1c1008"/>`).join('')}
        ${[160, 220, 280, 340].map(y => [950, 979, 1008, 1037].map(x => `<circle cx="${x}" cy="${y - 20}" r="6" fill="none" stroke="#1c1008" stroke-width="2"/>`).join('')).join('')}
      </g>
      <rect x="912" y="360" width="164" height="12" rx="2" fill="url(#gWood)" stroke="#1c1008"/>
      ${st.curtainOpen ? `
        <g class="nopoint" opacity=".45">
          ${['gold', 'blue', 'red', 'green'].map((c, i) => `<polygon points="${936 + i * 29},372 ${965 + i * 29},372 ${900 + i * 40 - 120},560 ${860 + i * 40 - 120},560" fill="${COLORS[c].fill}" opacity=".6" filter="url(#fBlur6)"/>`).join('')}
        </g>` : ''}
      <g data-hs="curtain3" class="hs">
        ${st.curtainOpen ? `
          <path d="M910 96 L940 96 Q946 240 928 376 L906 376Z" fill="url(#gVelvetRed)" stroke="#2a0608"/>
          <path d="M1078 96 L1048 96 Q1042 240 1060 376 L1082 376Z" fill="url(#gVelvetRed)" stroke="#2a0608"/>
          <rect data-hs="glass" x="944" y="120" width="100" height="230" fill="transparent"/>`
        : `
          <path d="M906 96 L1082 96 L1082 380 L906 380Z" fill="url(#gVelvetRed)" stroke="#2a0608"/>
          ${[930, 960, 994, 1028, 1058].map(x => `<path d="M${x} 96 Q${x + 5} 240 ${x - 2} 380" stroke="#2a0608" stroke-width="2" fill="none" opacity=".5"/>`).join('')}
          <path d="M906 376 Q950 368 994 376 Q1040 368 1082 376" stroke="url(#gGold)" stroke-width="4" fill="none"/>`}
        <rect x="900" y="90" width="188" height="10" rx="4" fill="url(#gGoldH)"/>
      </g>
    </g>`;
  };

  const drawStand = () => `
    <g data-hs="manuscript" class="hs">
      <rect x="1100" y="350" width="120" height="166" fill="transparent"/>
      <ellipse cx="1160" cy="516" rx="60" ry="7" fill="#000" opacity=".4"/>
      <path d="M1140 512 L1160 420 L1180 512" fill="none" stroke="url(#gWood)" stroke-width="8"/>
      <path d="M1152 512 L1168 512" stroke="#1c1008" stroke-width="3"/>
      <path d="M1100 380 L1160 420 L1220 380 L1216 372 L1160 408 L1104 372Z" fill="#5a3a22" stroke="#1c1008" stroke-width="2"/>
      <path d="M1104 372 Q1130 350 1158 366 L1160 408 Q1132 390 1104 372Z" fill="url(#gParch)" stroke="#8a6a3a"/>
      <path d="M1216 372 Q1190 350 1162 366 L1160 408 Q1188 390 1216 372Z" fill="url(#gParch)" stroke="#8a6a3a"/>
      ${[0, 1, 2, 3].map(i => `<path d="M${1114 + i * 3} ${372 + i * 7} q18 -6 36 2" stroke="#6a4a22" stroke-width="1.2" fill="none"/><path d="M${1168} ${374 + i * 7} q18 -8 36 -2" stroke="#6a4a22" stroke-width="1.2" fill="none"/>`).join('')}
    </g>
    ${A.sparkle(1160, 356, .7, 'd1')}`;

  const drawArmchair = st => `
    <g>
      <ellipse cx="850" cy="524" rx="80" ry="9" fill="#000" opacity=".45" class="nopoint"/>
      ${!st.bookTaken ? `<g data-hs="bookUnder" class="hs"><rect x="814" y="498" width="50" height="26" fill="transparent"/><path d="M820 508 L856 504 L858 514 L822 518Z" fill="#8c2626" stroke="#3a0d0e"/><path d="M822 512 L856 508" stroke="url(#gGold)" stroke-width="2"/></g>` : ''}
      <g data-hs="armchair" class="hs">
        <path d="M790 320 Q790 290 850 290 Q910 290 910 320 L906 430 L794 430Z" fill="#7a2022" stroke="#2a0608" stroke-width="2"/>
        <path d="M806 316 Q850 300 894 316 L890 420 L810 420Z" fill="#8c2a2c"/>
        ${[330, 360, 390].map(y => [826, 850, 874].map(x => `<circle cx="${x}" cy="${y}" r="2.5" fill="#d9b45a"/>`).join('')).join('')}
        <rect x="786" y="420" width="128" height="40" rx="10" fill="#7a2022" stroke="#2a0608" stroke-width="2"/>
        <path d="M776 380 Q776 368 790 368 L798 368 L798 460 L780 460Z" fill="#5a1618" stroke="#2a0608"/>
        <path d="M924 380 Q924 368 910 368 L902 368 L902 460 L920 460Z" fill="#5a1618" stroke="#2a0608"/>
        <rect x="786" y="460" width="128" height="14" fill="url(#gWood)" stroke="#1c1008"/>
        <path d="M792 474 L788 506 M908 474 L912 506" stroke="url(#gWood)" stroke-width="7" stroke-linecap="round"/>
      </g>
    </g>`;

  /* ----- الغرفة ----- */
  G.defRoom({
    id: 'library',
    name: 'المكتبة',
    par: 360,
    relic: 'quill',
    carry: ['magnifier'],
    intro: 'مكتبة جدّك... رائحة الورق القديم تملأ المكان. لا باب هنا، لكن الرفّ الأوسط يبدو مختلفاً عن غيره.',
    doneTitle: 'انفتح الرفّ السرّي!',
    doneText: 'طَق... انزلق الرفّ ببطء داخل الجدار، وظهر خلفه درج حجري ضيّق يهبط نحو عمق الدار. وعلى الدرجة الأولى ريشة ذهبية تلمع.',
    init: () => ({ caneTaken: false, bookTaken: false, bookPlaced: false, deskOpen: false, magTaken: false, read: false, curtainOpen: false, books: INIT.slice(), selBook: null, solved: false }),

    render(st) {
      return `
      <rect x="0" y="90" width="1280" height="360" fill="#2b1a0e"/>
      <rect x="0" y="90" width="1280" height="360" fill="url(#pGrainV)"/>
      ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => `<rect x="${i * 132}" y="100" width="4" height="340" fill="#1c1008" opacity=".6"/>`).join('')}
      ${A.ceiling()}
      ${A.dadoFloor(440, 500)}
      ${A.warmLight(640, 280, 560, 0.4)}
      <!-- مصباح زيتي معلّق -->
      <g class="nopoint">
        <line x1="420" y1="90" x2="420" y2="150" stroke="#2b1a0e" stroke-width="2"/>
        <path d="M404 150 L436 150 L430 186 L410 186Z" fill="url(#gBrass)" stroke="#5a3e14"/>
        <path d="M408 154 L432 154 L428 180 L412 180Z" fill="#ffd98a" opacity=".85"/>
        <circle cx="420" cy="170" r="90" fill="url(#gFlameGlow)" opacity=".5" class="halo"/>
      </g>
      ${drawLeftShelves()}
      ${!st.caneTaken ? `<g data-hs="cane" class="hs">
        <rect x="298" y="256" width="42" height="256" fill="transparent"/>
        <path d="M306 280 Q306 262 320 262 Q334 262 334 276" fill="none" stroke="#e8dcc0" stroke-width="7" stroke-linecap="round"/>
        <path d="M306 280 L316 506" stroke="url(#gWood)" stroke-width="8" stroke-linecap="round"/>
        <rect x="302" y="282" width="10" height="8" fill="url(#gBrass)"/>
      </g>${A.sparkle(320, 272, .8, 'd2')}` : ''}
      <g data-hs="calligraphy" class="hs">
        ${A.frame(346, 150, 140, 100, 10)}
        <rect x="356" y="160" width="120" height="80" fill="#1f3a2e"/>
        <text x="416" y="210" text-anchor="middle" font-size="19" fill="#e8c46a" font-family="Amiri, serif" font-weight="700">ربِّ زدني علماً</text>
      </g>
      ${drawDesk(st)}
      ${drawBookcase(st)}
      ${drawArmchair(st)}
      ${drawWindow3(st)}
      ${drawStand()}
      ${A.motes(560, 150, 480, 320, 16)}
      ${A.vignette()}`;
    },

    click(id, st, el) {
      if (id.startsWith('bk:')) return this.clickBook(id.slice(3), st);
      if (id.startsWith('slot:')) return this.clickSlot(+id.slice(5), st);
      switch (id) {
        case 'shelvesL': G.say('كتب في الفقه والشعر والتاريخ وأخبار الموصل... مرتّبة بعناية فائقة.'); break;
        case 'calligraphy': G.say('لوحة خطّ بالنسخ: «ربِّ زدني علماً». كتبها جدّك بيده.'); break;
        case 'cane': st.caneTaken = true; G.addItem('cane', el); G.update(); break;
        case 'desk':
          if (!st.deskOpen) { st.deskOpen = true; SFX.slide(); G.update(); G.say(st.magTaken ? 'الدرج مفتوح.' : 'فتحت درج المكتب... فيه شيء زجاجي يلمع.'); }
          else G.say('درج المكتب مفتوح.');
          break;
        case 'magPick': st.magTaken = true; G.addItem('magnifier', el); G.update(); break;
        case 'inkwell': G.say('محبرة نحاسية جفّ حبرها، وقلم قصب ما زال فيها.'); break;
        case 'papers': G.say('أوراق حسابات قديمة: «ثمن ورق... أجرة تجليد...». لا شيء مفيد.'); break;
        case 'armchair': G.say(st.bookTaken ? 'كرسي جدّك الأحمر، ما زال يحمل أثر جلوسه.' : 'كرسي مخملي أحمر. تحته كتاب سقط بعيداً... يدك لا تصل إليه.'); break;
        case 'bookUnder': G.say('الكتاب بعيد تحت الكرسي، ويدك لا تصل إليه. تحتاج شيئاً طويلاً.'); break;
        case 'curtain3':
          if (!st.curtainOpen) { st.curtainOpen = true; SFX.rustle(); G.update(); G.say('أزحت الستارة... تسلّل الضوء عبر زجاج معشّق بأربعة ألوان!'); }
          else G.openCU('glass');
          break;
        case 'glass': G.openCU('glass'); break;
        case 'manuscript': G.openCU('manuscript'); break;
        case 'manuscriptCU': G.say(st.read ? 'المخطوطة واضحة الآن.' : 'الحروف دقيقة جداً... تحتاج شيئاً يكبّرها.'); break;
        case 'shelf': G.openCU('shelf'); break;
      }
    },

    use(id, item, st, el) {
      if (item === 'cane' && (id === 'armchair' || id === 'bookUnder')) {
        if (st.bookTaken) { G.say('لا شيء آخر تحت الكرسي.'); return true; }
        st.bookTaken = true; SFX.slide(); G.removeItem('cane'); G.update();
        G.addItem('redBook');
        G.say('سحبت الكتاب بطرف العكّاز من تحت الكرسي. كتاب أحمر قصير!');
        return true;
      }
      if (item === 'magnifier' && (id === 'manuscript' || id === 'manuscriptCU')) {
        st.read = true; SFX.chime(3); G.update();
        if (G.cu !== 'manuscript') G.openCU('manuscript');
        return true;
      }
      if (item === 'redBook' && (id === 'shelf' || id.startsWith('slot:') || id.startsWith('bk:'))) {
        let slot = id.startsWith('slot:') ? +id.slice(5) : st.books.indexOf(null);
        if (st.books[slot]) slot = st.books.indexOf(null);
        st.books[slot] = 'r2'; st.bookPlaced = true; st.selBook = null;
        SFX.thud(); G.removeItem('redBook'); G.save(); G.renderScene();
        if (G.cu !== 'shelf') G.openCU('shelf'); else G.refreshCU(true);
        G.say('أعدت الكتاب الأحمر إلى الرف. الآن اكتملت الكتب الثمانية.');
        this.check(st);
        return true;
      }
      if (item === 'magnifier' && (id === 'shelf' || id.startsWith('bk:') || id === 'glass' || id === 'curtain3')) {
        G.say('لا ترى شيئاً مميّزاً، سوى زخارف دقيقة.'); return true;
      }
      if (item === 'cane' && (id === 'shelf' || id === 'shelvesL')) { G.say('لا حاجة لأن تنكز الكتب بالعكّاز.'); return true; }
      return false;
    },

    placeBooks(st) {
      st.books.forEach((id, i) => {
        if (!id) return;
        const g = document.getElementById('bk-' + id);
        if (g) g.style.transform = `translate(${SLOT_X(i)}px, ${SHELF_Y - (st.selBook === id ? 16 : 0)}px)`;
      });
    },
    clickBook(id, st) {
      if (st.solved) return;
      if (!st.selBook) { st.selBook = id; SFX.tick(); }
      else if (st.selBook === id) { st.selBook = null; SFX.tick(); }
      else {
        const a = st.books.indexOf(st.selBook), b = st.books.indexOf(id);
        st.books[a] = id; st.books[b] = st.selBook; st.selBook = null;
        SFX.slide();
      }
      this.placeBooks(st);
      G.renderScene(); G.save();
      this.check(st);
    },
    clickSlot(i, st) {
      if (st.solved) return;
      if (!st.selBook) { G.say(st.bookPlaced ? 'مكان فارغ على الرف.' : 'مكان فارغ... أحد الكتب ناقص.'); return; }
      const a = st.books.indexOf(st.selBook);
      st.books[a] = null; st.books[i] = st.selBook; st.selBook = null;
      SFX.slide();
      this.placeBooks(st);
      G.refreshCU(true);
      G.renderScene(); G.save();
      this.check(st);
    },
    check(st) {
      if (st.solved || !st.books.every((b, i) => b === SOLUTION[i])) return;
      st.solved = true; G.busy = true; G.save();
      SFX.unlock();
      const cap = document.querySelector('#closeup .cu-caption');
      if (cap) cap.textContent = 'طَق... سُمع صوت آلية تتحرّك خلف الرف!';
      const sh = document.getElementById('shelfCU');
      if (sh) sh.classList.add('solved-flash');
      setTimeout(() => {
        G.closeCU();
        st.solved = false; G.renderScene(); st.solved = true;
        requestAnimationFrame(() => requestAnimationFrame(() => {
          const bc = document.getElementById('bookcase');
          if (bc) bc.style.transform = 'translateX(250px)';
          SFX.creak(); setTimeout(SFX.slide, 700);
        }));
        setTimeout(() => { G.busy = false; G.renderScene(); G.completeRoom(); }, 2300);
      }, 1300);
    },

    closeups: {
      shelf: {
        title: 'رفّ الحكمة',
        manual: true,
        render(st) {
          const empties = st.books.map((b, i) => b ? '' : `<g data-hs="slot:${i}" class="hs"><rect x="${SLOT_X(i) - 32}" y="160" width="64" height="170" fill="#ffffff" opacity=".04" stroke="#f6dc8a" stroke-dasharray="5 5" stroke-width="1.5"/></g>`).join('');
          const books = st.books.map(id => id ? bookSVG(id) : '').join('');
          return `
          <svg id="shelfCU" width="760" height="400" viewBox="0 0 760 400">
            <rect x="0" y="0" width="760" height="400" rx="10" fill="url(#gWoodV)" stroke="#1c1008" stroke-width="3"/>
            <rect x="0" y="0" width="760" height="400" fill="url(#pGrainV)"/>
            <rect x="20" y="130" width="720" height="210" fill="#140c06" stroke="#c9a14a" stroke-width="2"/>
            <rect x="290" y="30" width="180" height="60" rx="8" fill="url(#gBrass)" stroke="#5a3e14" stroke-width="2"/>
            <text x="380" y="70" text-anchor="middle" font-size="28" fill="#3a2412" font-family="Amiri, serif" font-weight="700">رفّ الحكمة</text>
            ${A.star8(250, 60, 12)}${A.star8(510, 60, 12)}
            ${empties}
            ${books}
            <rect x="14" y="330" width="732" height="18" fill="#4a2e19" stroke="#1c1008" stroke-width="2"/>
            <path d="M20 339 h720" stroke="url(#gGoldH)" stroke-width="2"/>
            <text x="672" y="378" text-anchor="middle" font-size="18" fill="#c9a14a" font-family="Amiri, serif">اليمين</text><path d="M700 372 h36 m-8 -6 l8 6 l-8 6" stroke="#c9a14a" stroke-width="2" fill="none"/>
          </svg>
          <div class="cu-caption">${st.bookPlaced ? 'اضغط على كتاب لرفعه، ثم على كتاب آخر لتبديل مكانيهما.' : 'في الرف مكان فارغ... أحد الكتب مفقود.'}</div>`;
        },
        mount(el, st) {
          // ضع الكتب في أماكنها دون حركة، ثم فعّل الحركة
          el.querySelectorAll('.book').forEach(b => { b.style.transition = 'none'; });
          G.room().placeBooks(st);
          requestAnimationFrame(() => el.querySelectorAll('.book').forEach(b => { b.style.transition = ''; }));
        },
        onClose(st) { st.selBook = null; }
      },
      manuscript: {
        title: 'مخطوطة على الرحلة',
        render: st => st.read
          ? `<div class="paper" style="font-size:25px;max-width:640px">
              «الكتب في داري لا تُصفّ عبثاً...<br>
              صُفَّها على <b>رفّ الحكمة</b> كما يصفّ النورُ ألوانه في <b>الشبّاك المعشّق</b>، مبتدئاً من <b>اليمين</b>.<br>
              وإن اجتمع كتابان من لونٍ واحد، فليسبق <b>الأطولُ</b> أخاه.<br>
              عندها يفتح لك الرفّ ما خلفه.»
              <div class="sig">— يونس</div></div>
             <div class="cu-caption">بفضل العدسة، صارت الحروف واضحة.</div>`
          : `<div data-hs="manuscriptCU" class="hs paper" style="font-size:11px;max-width:640px;filter:blur(1.6px);line-height:1.6;opacity:.8">
              «الكتب في داري لا تُصفّ عبثاً... صُفَّها على رفّ الحكمة كما يصفّ النورُ ألوانه في الشبّاك المعشّق، مبتدئاً من اليمين. وإن اجتمع كتابان من لونٍ واحد، فليسبق الأطولُ أخاه. عندها يفتح لك الرفّ ما خلفه.» — يونس
              <br><br>${'ـــــ ـــ ــــــ ــــ ــــــــ ـــ ـــــ '.repeat(6)}</div>
             <div class="cu-caption">الخطّ دقيق جداً وباهت، لا تستطيع قراءته بعينك المجرّدة.</div>`
      },
      glass: {
        title: 'الشبّاك المعشّق',
        render: () => {
          const order = ['gold', 'blue', 'red', 'green'];
          return `<svg width="392" height="410" viewBox="0 0 420 440">
            <defs><clipPath id="clipGlassCU"><path d="${A.archPath(60, 20, 300, 400, 170)}"/></clipPath></defs>
            <path d="${A.archPath(44, 6, 332, 426, 184)}" fill="url(#gWoodV)" stroke="#1c1008" stroke-width="3"/>
            <g clip-path="url(#clipGlassCU)">
              ${order.map((c, i) => `<rect x="${60 + i * 75}" y="20" width="75" height="400" fill="${COLORS[c].fill}"/><rect x="${60 + i * 75}" y="20" width="75" height="400" fill="#fff" opacity=".28"/>`).join('')}
              ${[60, 135, 210, 285, 360].map(x => `<rect x="${x - 3}" y="20" width="6" height="400" fill="#1c1008"/>`).join('')}
              ${[120, 220, 320].map(y => `<rect x="60" y="${y}" width="300" height="5" fill="#1c1008"/>`).join('')}
              ${[70, 170, 270, 370].map(y => order.map((c, i) => A.star8(97 + i * 75, y, 16, 'none', '#1c1008')).join('')).join('')}
            </g>
          </svg>
          <div class="cu-caption">أربعة ألوان يعبرها الضوء، من اليمين: أخضر، أحمر، أزرق، ذهبي.</div>`;
        }
      }
    },

    hintStage(st) {
      if (!st.bookPlaced) return G.has('redBook') ? 'placeBook' : (G.has('cane') ? 'useCane' : 'findBook');
      if (!st.read) return G.has('magnifier') ? 'useMag' : 'findMag';
      if (!st.curtainOpen) return 'curtain';
      return 'sort';
    },
    hints: {
      findBook: [
        'افتح الرفّ المزخرف في المكتبة الوسطى: فيه مكان فارغ، أي أن أحد الكتب ضائع.',
        'انظر تحت الكرسي الأحمر. يدك لن تصل، فابحث عن شيء طويل.',
        'خذ العكّاز المسنود إلى المكتبة اليسرى، واستخدمه على الكرسي لسحب الكتاب، ثم ضعه في الرف.'
      ],
      useCane: [
        'معك عكّاز طويل... هل هناك شيء بعيد لا تصله يدك؟',
        'تحت الكرسي الأحمر كتاب سقط بعيداً.',
        'اختر العكّاز ثم اضغط على الكرسي الأحمر.'
      ],
      placeBook: [
        'الكتاب الأحمر ينقص رفّاً ما في هذه الغرفة.',
        'الرفّ المزخرف في المكتبة الوسطى فيه مكان فارغ.',
        'اختر الكتاب الأحمر ثم اضغط على الرف الأوسط (أو على المكان الفارغ داخله).'
      ],
      findMag: [
        'المخطوطة على الرحلة فيها تعليمات، لكن خطّها دقيق جداً.',
        'تحتاج أداة تكبّر الحروف... الكاتب يحتفظ بأدواته في مكتبه.',
        'افتح درج المكتب الصغير، وخذ العدسة المكبّرة، واستخدمها على المخطوطة.'
      ],
      useMag: [
        'معك عدسة مكبّرة... أين تحتاج أن تقرأ حروفاً دقيقة؟',
        'المخطوطة على الرحلة يمين الغرفة.',
        'اختر العدسة ثم اضغط على المخطوطة.'
      ],
      curtain: [
        'المخطوطة تتحدّث عن ألوان الشبّاك... لكنك لا ترى أي ألوان بعد.',
        'الشبّاك مغطّى بستارة حمراء.',
        'اضغط على الستارة الحمراء لفتحها، وتأمّل ألوان الزجاج من اليمين.'
      ],
      sort: [
        'رتّب الكتب حسب ترتيب ألوان الزجاج المعشّق، مبتدئاً من اليمين.',
        'ألوان الشبّاك من اليمين: أخضر، أحمر، أزرق، ذهبي. وفي كل لون، الكتاب الأطول يأتي أولاً (على اليمين).',
        'من اليمين إلى اليسار: الأخضر الطويل، الأخضر القصير، الأحمر الطويل، الأحمر القصير، الأزرق الطويل، الأزرق القصير، الذهبي الطويل، الذهبي القصير.'
      ]
    },
    onSkip(st) { st.solved = true; st.books = SOLUTION.slice(); st.bookPlaced = true; }
  });
})();
