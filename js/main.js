/* تشغيل اللعبة وربط الواجهة */
(() => {
  document.body.insertAdjacentHTML('afterbegin', A.defs());
  $('#start-art').innerHTML = A.startArt();

  /* ملاءمة المقاس لشاشة اللابتوب */
  const fit = () => {
    G.scale = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
    $('#stage').style.transform = `scale(${G.scale})`;
  };
  window.addEventListener('resize', fit);
  fit();

  /* زر الكتم */
  const muteIcon = () => {
    $('#btn-mute').innerHTML = SFX.muted
      ? '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  };
  muteIcon();
  $('#btn-mute').onclick = () => { SFX.init(); SFX.toggleMute(); muteIcon(); };

  /* شاشة البداية */
  const refreshStart = () => {
    const s = G.load();
    $('#btn-continue').disabled = !s;
    if (s) {
      const r = G.rooms[Math.min(s.roomIndex, G.rooms.length - 1)];
      $('#save-info').textContent = s.finished ? 'لقد أنهيت الجزء المتاح — يمكنك مشاهدة النتيجة' : `تقدّم محفوظ: ${r ? r.name : ''}`;
    } else $('#save-info').textContent = '';
  };
  refreshStart();

  const intro = () => {
    G.dialog({
      html: `<h2>رسالة من الموصل</h2>
        <div class="paper">
        «إلى حفيدي العزيز...<br>
        تركتُ لك دارنا القديمة في محلّة رأس الكور، قرب نهر دجلة.<br>
        لم أترك لك ذهباً، بل تركتُ لك ما هو أثمن منه، مخبّأً في قلب الدار.<br>
        ستجد الطريق إليه إن نظرت جيداً... كما علّمتك حين كنت صغيراً.»
        <div class="sig">— جدّك، الحاج يونس النقّاش</div></div>
        <p>دخلتَ الدهليز المظلم... فانصفق الباب الخشبي خلفك بقوة. لا طريق إلا إلى الأمام.</p>`,
      buttons: [{ label: 'ادخل الدار', onClick: () => G.fade(() => { G.showScreen('game'); G.enterRoom(); }) }]
    });
  };

  const startNew = () => {
    G.clearSave();
    G.state = G.newState();
    SFX.startMusic();
    intro();
  };

  $('#btn-new').onclick = () => {
    SFX.init(); SFX.click();
    if (G.load()) {
      G.dialog({
        html: `<h3>بدء لعبة جديدة؟</h3><p>سيُمحى تقدّمك المحفوظ.</p>`,
        buttons: [{ label: 'نعم، ابدأ من جديد', onClick: startNew }, { label: 'إلغاء', cls: 'btn-wood' }]
      });
    } else startNew();
  };
  $('#btn-continue').onclick = () => {
    SFX.init(); SFX.click();
    const s = G.load();
    if (!s) return;
    G.state = s;
    if (G.state.roomIndex >= G.rooms.length) G.state.roomIndex = G.rooms.length - 1;
    SFX.startMusic();
    if (s.finished) { G.fade(() => G.showEnd()); return; }
    G.fade(() => {
      G.showScreen('game');
      if (G.stat().done) { G.enterRoom(); G.active = false; G.nextRoom(); }
      else G.enterRoom();
    });
  };
  $('#btn-end-menu').onclick = () => { SFX.click(); G.fade(() => { G.showScreen('screen-start'); refreshStart(); }); };

  /* الواجهة العلوية */
  $('#btn-hint').onclick = () => { SFX.click(); G.showHints(); };
  $('#btn-menu').onclick = () => {
    SFX.click();
    G.dialog({
      html: `<h3>القائمة</h3><p>تقدّمك محفوظ تلقائياً.</p>`,
      buttons: [
        { label: 'تابع اللعب' },
        { label: 'الشاشة الرئيسية', cls: 'btn-wood', onClick: () => { G.save(); G.active = false; G.closeCU(); G.fade(() => { G.showScreen('screen-start'); refreshStart(); }); } }
      ]
    });
  };

  /* النقر على العناصر التفاعلية (المشهد والنوافذ المقرّبة) */
  $('#game').addEventListener('click', e => {
    if (e.target.closest('#inv') || e.target.closest('#hud')) return;
    if (e.target.closest('.cu-close')) { SFX.click(); G.closeCU(); return; }
    const hs = e.target.closest('[data-hs]');
    if (hs) { G.interact(hs.dataset.hs, hs); return; }
    // النقر على الخلفية المعتمة يغلق النافذة المقرّبة
    if (e.target.id === 'closeup') { G.closeCU(); }
  });
  $('#game').addEventListener('contextmenu', e => { e.preventDefault(); if (G.sel) G.select(null); });

  /* شريط الأغراض: نقرة للاختيار، أو سحب وإفلات على الأشياء */
  let drag = null;
  $('#inv-slots').addEventListener('pointerdown', e => {
    const slot = e.target.closest('.slot.filled');
    if (!slot || !G.active) return;
    drag = { id: slot.dataset.item, x: e.clientX, y: e.clientY, moving: false };
    slot.setPointerCapture(e.pointerId);
  });
  $('#inv-slots').addEventListener('pointermove', e => {
    if (!drag) return;
    if (!drag.moving && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 8) {
      drag.moving = true;
      const g = $('#drag-ghost');
      g.innerHTML = G.itemIcon(drag.id);
      g.style.display = 'block';
      $('#cursor-item').style.display = 'none';
    }
    if (drag.moving) {
      const p = G.toStage(e.clientX, e.clientY);
      const g = $('#drag-ghost');
      g.style.left = p.x + 'px'; g.style.top = p.y + 'px';
    }
  });
  $('#inv-slots').addEventListener('pointerup', e => {
    if (!drag) return;
    const d = drag; drag = null;
    if (d.moving) {
      $('#drag-ghost').style.display = 'none';
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const hs = el && el.closest('[data-hs]');
      if (hs) { G.select(d.id); G.interact(hs.dataset.hs, hs); }
      else G.select(G.sel);
    } else {
      SFX.click();
      if (G.sel === d.id) G.select(null);
      else { G.select(d.id); G.say(`${G.items[d.id].name}: ${G.items[d.id].desc}<br><small style="color:#c9b07a">اضغط على شيء في الغرفة لاستخدامه عليه.</small>`); }
    }
  });
  $('#inv-slots').addEventListener('dblclick', e => {
    const slot = e.target.closest('.slot.filled');
    if (slot) { G.select(null); G.examine(slot.dataset.item); }
  });
  $('#btn-examine').onclick = () => { if (G.sel) { const id = G.sel; G.select(null); G.examine(id); } };

  /* الغرض المختار يتبع المؤشّر */
  $('#stage').addEventListener('pointermove', e => {
    if (!G.sel) return;
    const p = G.toStage(e.clientX, e.clientY);
    const c = $('#cursor-item');
    c.style.left = p.x + 'px'; c.style.top = p.y + 'px';
  });

  /* لوحة المفاتيح */
  window.addEventListener('keydown', e => {
    if (e.code === 'Escape') {
      if (G.dialogOpen) return;
      if (G.sel) G.select(null);
      else if (G.cu) G.closeCU();
    }
    // أمر التجربة المخفي: N ينقلك للغرفة التالية
    if (e.code === 'KeyN' && !e.ctrlKey && !e.metaKey && !e.altKey) G.skipRoom();
  });

  setInterval(G.tick, 1000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) G.save(); });
  window.addEventListener('beforeunload', () => G.save());
})();
