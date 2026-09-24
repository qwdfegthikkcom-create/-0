/* محرّك اللعبة: الحالة، الأغراض، التفاعل، الحفظ، التلميحات */
const G = {
  rooms: [],
  items: {},
  state: null,
  sel: null,        // الغرض المختار حالياً
  cu: null,         // اسم النافذة المقرّبة المفتوحة
  active: false,    // هل اللعب جارٍ
  busy: false,      // أثناء الرسوم المتحركة المهمة
  scale: 1,
  SAVE_KEY: 'mosul-escape-save-v1',
  TOTAL_ROOMS: 6,
};

const $ = s => document.querySelector(s);

/* ---------- التعريفات ---------- */
G.defItem = (id, def) => { G.items[id] = def; };
G.defRoom = room => { G.rooms.push(room); };

/* ---------- الحالة ---------- */
G.newState = () => ({ v: 1, roomIndex: 0, inv: [], rs: {}, stats: {}, hint: {}, finished: false });
G.room = () => G.rooms[G.state.roomIndex];
G.rs = () => {
  const r = G.room();
  if (!G.state.rs[r.id]) G.state.rs[r.id] = r.init();
  return G.state.rs[r.id];
};
G.stat = (id) => {
  id = id || G.room().id;
  return G.state.stats[id] || (G.state.stats[id] = { time: 0, hints: 0, stars: 0, done: false });
};

G.save = () => {
  if (!G.state) return;
  try { localStorage.setItem(G.SAVE_KEY, JSON.stringify(G.state)); } catch (e) {}
};
G.load = () => {
  try {
    const s = JSON.parse(localStorage.getItem(G.SAVE_KEY));
    if (s && s.v === 1 && typeof s.roomIndex === 'number') return s;
  } catch (e) {}
  return null;
};
G.clearSave = () => { try { localStorage.removeItem(G.SAVE_KEY); } catch (e) {} };

/* ---------- الأدوات ---------- */
G.fmtTime = s => {
  s = Math.max(0, Math.floor(s));
  const m = Math.floor(s / 60), r = s % 60;
  return String(m).padStart(2, '0') + ':' + String(r).padStart(2, '0');
};
G.toStage = (clientX, clientY) => {
  const r = $('#stage').getBoundingClientRect();
  return { x: (clientX - r.left) / G.scale, y: (clientY - r.top) / G.scale };
};
G.rectInStage = el => {
  const r = el.getBoundingClientRect();
  const a = G.toStage(r.left, r.top), b = G.toStage(r.right, r.bottom);
  return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
};
G.itemIcon = id => {
  const it = G.items[id];
  return `<svg viewBox="0 0 64 64">${it ? it.icon : ''}</svg>`;
};

/* ---------- الرسائل ---------- */
let msgTimer = null;
G.say = (text, ms) => {
  const m = $('#msg');
  m.innerHTML = text;
  m.classList.add('show');
  clearTimeout(msgTimer);
  msgTimer = setTimeout(() => m.classList.remove('show'), ms || Math.max(3500, text.length * 75));
};
G.hideMsg = () => { clearTimeout(msgTimer); $('#msg').classList.remove('show'); };

/* ---------- شريط الأغراض ---------- */
G.has = id => G.state.inv.includes(id);
G.addItem = (id, fromEl) => {
  if (G.has(id)) return;
  G.state.inv.push(id);
  SFX.pick();
  G.renderInv(id);
  G.save();
  if (fromEl) G.flyToInv(id, fromEl);
  const it = G.items[id];
  if (it) setTimeout(() => G.say(`حصلت على: <b style="color:#f6dc8a">${it.name}</b>`), 50);
};
G.removeItem = id => {
  G.state.inv = G.state.inv.filter(x => x !== id);
  if (G.sel === id) G.select(null);
  G.renderInv();
  G.save();
};
G.renderInv = newId => {
  const box = $('#inv-slots');
  const n = Math.max(9, G.state.inv.length);
  let h = '';
  for (let i = 0; i < n; i++) {
    const id = G.state.inv[i];
    if (id) {
      h += `<div class="slot filled ${G.sel === id ? 'selected' : ''} ${id === newId ? 'new' : ''}" data-item="${id}" title="${G.items[id].name}">${G.itemIcon(id)}</div>`;
    } else h += `<div class="slot"></div>`;
  }
  box.innerHTML = h;
  G.renderInvInfo();
};
G.renderInvInfo = () => {
  const info = $('#inv-info');
  if (G.sel) {
    $('#inv-name').textContent = G.items[G.sel].name;
    info.classList.add('has');
  } else {
    $('#inv-name').textContent = '';
    info.classList.remove('has');
  }
};
G.select = id => {
  G.sel = id;
  document.querySelectorAll('.slot.filled').forEach(s => s.classList.toggle('selected', s.dataset.item === id));
  G.renderInvInfo();
  $('#game').classList.toggle('using', !!id);
  const c = $('#cursor-item');
  if (id) { c.innerHTML = G.itemIcon(id); c.style.display = 'block'; }
  else c.style.display = 'none';
};
G.flyToInv = (id, fromEl) => {
  const slot = document.querySelector(`.slot[data-item="${id}"]`);
  if (!slot || !fromEl.getBoundingClientRect) return;
  const a = G.rectInStage(fromEl), b = G.rectInStage(slot);
  const f = document.createElement('div');
  f.style.cssText = `position:absolute;left:${a.cx - 30}px;top:${a.cy - 30}px;width:60px;height:60px;z-index:300;pointer-events:none;transition:all .8s cubic-bezier(.5,-0.3,.4,1);filter:drop-shadow(0 0 12px rgba(255,210,120,.9))`;
  f.innerHTML = G.itemIcon(id);
  f.firstChild.style.cssText = 'width:100%;height:100%';
  $('#stage').appendChild(f);
  slot.style.opacity = '0';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    f.style.left = (b.cx - 30) + 'px'; f.style.top = (b.cy - 30) + 'px'; f.style.transform = 'scale(.9)';
  }));
  setTimeout(() => { f.remove(); slot.style.opacity = ''; slot.classList.remove('new'); void slot.offsetWidth; slot.classList.add('new'); }, 820);
};
G.examine = id => {
  const it = G.items[id];
  if (!it) return;
  SFX.click();
  if (it.read) {
    G.dialog({ html: `<h3>${it.name}</h3><div class="paper">${it.read}</div>`, buttons: [{ label: 'حسناً' }] });
  } else {
    G.dialog({
      html: `<div style="width:130px;height:130px;margin:0 auto">${G.itemIcon(id).replace('<svg', '<svg style="width:100%;height:100%;filter:drop-shadow(0 0 14px rgba(255,210,120,.5))"')}</div><h3>${it.name}</h3><p>${it.desc}</p>`,
      buttons: [{ label: 'حسناً' }]
    });
  }
};

/* ---------- المشهد والنوافذ المقرّبة ---------- */
G.renderScene = (enter) => {
  const r = G.room(), st = G.rs();
  const sc = $('#scene');
  sc.innerHTML = `<svg viewBox="0 0 1280 620" xmlns="http://www.w3.org/2000/svg">${r.render(st)}</svg>`;
  if (enter) { sc.classList.remove('scene-enter'); void sc.offsetWidth; sc.classList.add('scene-enter'); }
};
G.update = () => {
  G.renderScene();
  G.refreshCU();
  G.save();
};
G.openCU = name => {
  const r = G.room(), c = r.closeups && r.closeups[name];
  if (!c) return;
  G.cu = name;
  G.hideMsg();
  const o = $('#closeup');
  o.querySelector('.cu-title').textContent = typeof c.title === 'function' ? c.title(G.rs()) : c.title;
  G.refreshCU(true);
  o.classList.add('open');
};
G.refreshCU = (force) => {
  if (!G.cu) return;
  const r = G.room(), c = r.closeups[G.cu], st = G.rs();
  if (c.manual && !force) { if (c.sync) c.sync($('#closeup .cu-body'), st); return; }
  const body = $('#closeup .cu-body');
  body.innerHTML = c.render(st);
  if (c.mount) c.mount(body, st);
};
G.closeCU = () => {
  if (!G.cu) return;
  const r = G.room(), c = r.closeups[G.cu];
  if (c && c.onClose) c.onClose(G.rs());
  G.cu = null;
  $('#closeup').classList.remove('open');
  $('#closeup .cu-body').innerHTML = '';
};

/* ---------- التفاعل ---------- */
G.interact = (id, el) => {
  if (!G.active || G.busy) return;
  const r = G.room(), st = G.rs(), item = G.sel;
  if (item) {
    G.select(null);
    const ok = r.use && r.use(id, item, st, el);
    if (!ok) {
      SFX.error();
      G.say(`${G.items[item].name}؟ لا يبدو أنه يفيد هنا.`);
    }
  } else {
    SFX.click();
    r.click(id, st, el);
  }
};

/* ---------- الحوار ---------- */
G.dialogOpen = false;
G.dialog = ({ html, buttons }) => {
  const d = $('#dlg');
  d.querySelector('.dlg-body').innerHTML = html;
  const bb = d.querySelector('.dlg-buttons');
  bb.innerHTML = '';
  (buttons || [{ label: 'حسناً' }]).forEach(b => {
    const btn = document.createElement('button');
    btn.className = 'btn ' + (b.cls || 'btn-gold');
    btn.textContent = b.label;
    btn.onclick = () => {
      SFX.click();
      if (!b.keep) G.closeDialog();
      if (b.onClick) b.onClick();
    };
    bb.appendChild(btn);
  });
  d.classList.remove('open'); void d.offsetWidth;
  d.classList.add('open');
  G.dialogOpen = true;
};
G.closeDialog = () => { $('#dlg').classList.remove('open'); G.dialogOpen = false; };

/* ---------- التلميحات ---------- */
G.showHints = () => {
  if (!G.active || G.busy) return;
  const r = G.room(), st = G.rs();
  const key = r.hintStage(st);
  const set = r.hints[key] || [];
  let h = G.state.hint[r.id];
  if (!h || h.key !== key) h = G.state.hint[r.id] = { key, lvl: 0 };
  const labels = ['التلميح الأول', 'التلميح الثاني', 'التلميح الثالث'];
  const list = set.slice(0, h.lvl).map((t, i) => `<li><b>${labels[i]}:</b>${t}</li>`).join('');
  const buttons = [];
  if (h.lvl < set.length) {
    buttons.push({
      label: h.lvl === 0 ? 'اكشف تلميحاً' : 'تلميح أوضح', keep: true,
      onClick: () => {
        h.lvl++; G.stat().hints++;
        SFX.chime(h.lvl + 2);
        if (r.onHint) r.onHint(key, h.lvl, st);
        G.hud(); G.save();
        G.showHints();
      }
    });
  }
  buttons.push({ label: 'رجوع', cls: 'btn-wood' });
  G.dialog({
    html: `<h2>تلميحات</h2>
      ${list ? `<ul class="hint-list">${list}</ul>` : `<p>هل أنت عالق؟ التلميح الأول خفيف، والثاني أوضح، والثالث يكاد يعطيك الحل.</p>`}
      <p class="hint-note">${h.lvl < set.length ? 'كل تلميح جديد يُحتسب ويؤثر على النجوم في نهاية الغرفة.' : 'استُخدمت كل تلميحات هذه المرحلة.'}</p>`,
    buttons
  });
};

/* ---------- الواجهة العلوية والوقت ---------- */
G.hud = () => {
  if (!G.state) return;
  const s = G.stat();
  $('#hud-room').textContent = G.room().name;
  $('#hud-time').textContent = G.fmtTime(s.time);
  $('#hud-hints').textContent = A.num(s.hints);
};
G.tick = () => {
  if (!G.active || G.dialogOpen || document.hidden) return;
  const s = G.stat();
  if (s.done) return;
  s.time++;
  $('#hud-time').textContent = G.fmtTime(s.time);
  if (s.time % 5 === 0) G.save();
  // نبض زر التلميح إذا طال التوقف
  $('#btn-hint').classList.toggle('pulse', s.time > G.room().par * 1.3 && s.hints < 3);
};

G.calcStars = (s, par) => {
  let n = 3;
  if (s.hints >= 1) n--;
  if (s.hints >= 4) n--;
  if (s.time > par) n--;
  return Math.max(1, n);
};

/* ---------- الانتقال بين الغرف ---------- */
G.fade = (fn) => {
  const f = $('#fade');
  f.classList.add('on');
  setTimeout(() => { fn(); setTimeout(() => f.classList.remove('on'), 80); }, 750);
};
G.enterRoom = () => {
  G.closeCU(); G.closeDialog(); G.select(null); G.hideMsg();
  G.busy = false;
  const r = G.room();
  G.rs();
  G.hud();
  G.renderInv();
  G.renderScene(true);
  G.active = true;
  G.save();
  if (r.intro && !G.stat().introShown) {
    G.stat().introShown = true;
    setTimeout(() => G.say(r.intro, 7000), 900);
  }
};
G.completeRoom = () => {
  const r = G.room(), s = G.stat();
  if (s.done) return;
  s.done = true;
  s.stars = G.calcStars(s, r.par);
  G.closeCU();
  G.select(null);
  G.hideMsg();
  if (r.relic && !G.has(r.relic)) { G.state.inv.push(r.relic); G.renderInv(r.relic); }
  G.save();
  SFX.success();
  setTimeout(() => {
    const it = r.relic && G.items[r.relic];
    G.dialog({
      html: `<h2>${r.doneTitle || 'أحسنت!'}</h2>
        <div class="stars">${[1, 2, 3].map(i => `<span class="${i <= s.stars ? 'on' : ''}">★</span>`).join('')}</div>
        <div class="stat-row"><span>الوقت: <b>${G.fmtTime(s.time)}</b></span><span>التلميحات: <b>${A.num(s.hints)}</b></span></div>
        ${r.doneText ? `<p>${r.doneText}</p>` : ''}
        ${it ? `<div class="relic-got">${G.itemIcon(r.relic)}<span>وجدت أثراً من آثار الجدّ: <b>${it.name}</b></span></div>` : ''}`,
      buttons: [{ label: G.state.roomIndex + 1 < G.rooms.length ? 'الغرفة التالية' : 'تابع', onClick: G.nextRoom }]
    });
    SFX.fanfare();
  }, 900);
};
G.nextRoom = () => {
  G.active = false;
  G.fade(() => {
    G.state.roomIndex++;
    if (G.state.roomIndex >= G.rooms.length) {
      G.state.roomIndex = G.rooms.length - 1;
      G.state.finished = true;
      G.save();
      G.showEnd();
    } else {
      G.enterRoom();
    }
  });
};
/* أمر التجربة المخفي: الانتقال للغرفة التالية مباشرة */
G.skipRoom = () => {
  if (!G.active || G.busy) return;
  const r = G.room(), st = G.rs(), s = G.stat();
  G.closeCU(); G.closeDialog();
  if (r.onSkip) r.onSkip(st);
  (r.carry || []).forEach(id => { if (!G.has(id)) G.state.inv.push(id); });
  if (r.relic && !G.has(r.relic)) G.state.inv.push(r.relic);
  s.done = true; s.skipped = true; s.stars = 0;
  G.save();
  G.nextRoom();
};

/* ---------- الشاشات ---------- */
G.showScreen = id => {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
};
G.showEnd = () => {
  G.active = false;
  G.showScreen('screen-end');
  const partial = G.rooms.length < G.TOTAL_ROOMS;
  $('#end-title').textContent = partial ? 'نهاية الجزء الأول' : 'خرجت من الدار!';
  $('#end-story').innerHTML = partial
    ? `مرّ الشعاع من المرايا، وانفتح رفّ الكتب عن ممرٍّ ضيّق يهبط نحو عمق البيت...<br>
       في يدك الآن ثلاثة آثار تركها جدّك: <b>الهلال النحاسي</b> و<b>بلّورة الشمس</b> و<b>الريشة الذهبية</b>.<br>
       بقيت غرفة القاشاني، وغرفة المقام، والسرداب... <b>يتبع.</b>`
    : (G.endStory || '');
  let rows = '', total = 0, stars = 0;
  G.rooms.forEach(r => {
    const s = G.state.stats[r.id];
    if (!s || !s.done) return;
    total += s.time; stars += s.stars;
    rows += `<tr><td>${r.name}</td><td>${G.fmtTime(s.time)}</td><td>${A.num(s.hints)}</td><td class="st">${s.skipped ? 'تخطٍّ' : '★'.repeat(s.stars) + '☆'.repeat(3 - s.stars)}</td></tr>`;
  });
  $('#end-stats').innerHTML = `<table><tr><th>الغرفة</th><th>الوقت</th><th>التلميحات</th><th>النجوم</th></tr>${rows}
    <tr><th>المجموع</th><th>${G.fmtTime(total)}</th><th></th><th>${A.num(stars)} ★</th></tr></table>`;
};
