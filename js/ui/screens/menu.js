/* =========================================================
   القائمة الرئيسية (ملعب ليلي بأضواء متحركة) + شاشة الحفظ والتحميل
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC;
  const UI = FC.UI;
  const esc = FC.util.esc;

  // خلفية الملعب الليلي
  const STADIUM =
    '<div class="stadium" aria-hidden="true">' +
    '<div class="sky"></div><div class="stands"></div>' +
    '<div class="light l1"><i></i></div><div class="light l2"><i></i></div><div class="light l3"><i></i></div><div class="light l4"><i></i></div>' +
    '<div class="beam b1"></div><div class="beam b2"></div><div class="beam b3"></div>' +
    '<div class="field"><div class="fl-line"></div><div class="fl-circle"></div></div>' +
    '<div class="flashes">' + Array.from({ length: 14 }, (_, i) => '<i style="--d:' + (i * 0.37).toFixed(2) + 's;--x:' + ((i * 37) % 100) + '%;--y:' + (20 + ((i * 23) % 30)) + '%"></i>').join('') + '</div>' +
    '</div>';

  UI.screens.menu = {
    render() {
      return (
        STADIUM +
        '<div class="menu-wrap">' +
        '<div class="logo"><div class="logo-ball">' + UI.icon('ball') + '</div><h1 class="gold-text">مسيرة نجم</h1><p>من أكاديمية الشباب إلى المجد</p></div>' +
        '<div class="menu-btns">' +
        '<button class="btn gold big" data-act="new">مسيرة جديدة</button>' +
        '<button class="btn big hidden" data-act="continue">متابعة</button>' +
        '<button class="btn big" data-go="saves">تحميل</button>' +
        '<button class="btn big ghost" data-go="settings">الإعدادات</button>' +
        '</div>' +
        '<div class="menu-foot">المرحلة 2 + المباراة الكاملة ثلاثية الأبعاد</div>' +
        '</div>'
      );
    },
    bind(el) {
      // زر المتابعة يظهر إذا وُجد حفظ
      const last = FC.Save.lastSlot();
      const contBtn = el.querySelector('[data-act=continue]');
      FC.Save.list().then((slots) => {
        const s = slots.find((x) => x.slot === last && x.meta) || slots.filter((x) => x.meta).sort((a, b) => b.meta.savedAt - a.meta.savedAt)[0];
        if (s) {
          contBtn.classList.remove('hidden');
          contBtn.innerHTML = 'متابعة <small>' + esc(s.meta.name) + ' · ' + esc(s.meta.club) + '</small>';
          contBtn.dataset.slot = s.slot;
        }
      });
      el.querySelector('[data-act=new]').addEventListener('click', () => UI.go('create'));
      contBtn.addEventListener('click', () => UI.loadSlot(parseInt(contBtn.dataset.slot, 10)));
    },
  };

  // تحميل خانة وفتح المسيرة
  UI.loadSlot = async function (slot) {
    try {
      const st = await FC.Save.load(slot);
      if (!st) return UI.toast('الخانة فارغة', 'bad');
      FC.State.set(st, slot);
      UI.go('home');
      UI.toast('تم تحميل المسيرة', 'ok');
    } catch (e) {
      console.error(e);
      UI.toast('تعذّر التحميل: ' + e.message, 'bad');
    }
  };

  // ================= الحفظ والتحميل =================
  UI.screens.saves = {
    render(p) {
      return (
        '<div class="page">' +
        '<div class="page-h"><button class="icon-btn" data-act="back">' + UI.icon('back') + '</button><h2>الحفظ والتحميل</h2></div>' +
        '<div class="slots"><div class="muted">جارٍ القراءة…</div></div>' +
        '<div class="panel"><h3>ملف الحفظ</h3><p class="muted">صدّر مسيرتك كملف JSON أو استورد ملفاً سابقاً.</p>' +
        '<div class="row gap">' +
        (FC.State.cur ? '<button class="btn" data-act="export">تصدير المسيرة الحالية</button>' : '') +
        '<label class="btn ghost file-btn">استيراد ملف<input type="file" accept=".json,application/json" hidden></label>' +
        '<button class="btn ghost" data-act="paste">لصق نص حفظ</button>' +
        '</div></div>' +
        '<p class="muted small">طريقة التخزين: <span class="be"></span></p>' +
        '</div>'
      );
    },
    bind(el, p) {
      const inGame = !!FC.State.cur;
      const back = () => (p.from ? UI.go(p.from) : UI.go(inGame ? 'home' : 'menu'));
      el.querySelector('[data-act=back]').addEventListener('click', back);
      const draw = async () => {
        const slots = await FC.Save.list();
        el.querySelector('.be').textContent = { idb: 'IndexedDB', ls: 'localStorage', mem: 'ذاكرة مؤقتة (لن يُحفظ بعد الإغلاق)' }[FC.Save.backend()] || '—';
        el.querySelector('.slots').innerHTML = slots
          .map((s) => {
            const m = s.meta;
            const cur = inGame && FC.State.slot === s.slot;
            return (
              '<div class="slot panel' + (cur ? ' cur' : '') + '">' +
              '<div class="slot-n">' + s.slot + '</div>' +
              (m
                ? '<div class="slot-i"><b>' + esc(m.name) + '</b><span>' + esc(m.club) + (m.team === 'Y' ? ' (الشباب)' : '') + ' · ' + esc(FC.Player.POS[m.pos].short) + ' · ' + m.ovr + '</span>' +
                  '<span class="muted">' + FC.Calendar.seasonLabel(m.season) + ' · الأسبوع ' + (m.week + 1) + ' · ' + new Date(m.savedAt).toLocaleString('ar', { dateStyle: 'short', timeStyle: 'short' }) + '</span></div>'
                : '<div class="slot-i"><b class="muted">خانة فارغة</b></div>') +
              '<div class="slot-a">' +
              (m ? '<button class="btn small gold" data-load="' + s.slot + '">تحميل</button>' : '') +
              (inGame ? '<button class="btn small" data-save="' + s.slot + '">حفظ هنا</button>' : '') +
              (m ? '<button class="btn small ghost" data-del="' + s.slot + '">حذف</button>' : '') +
              '</div></div>'
            );
          })
          .join('');
      };
      draw();
      el.addEventListener('click', async (ev) => {
        const t = ev.target.closest('button');
        if (!t) return;
        if (t.dataset.load) UI.loadSlot(parseInt(t.dataset.load, 10));
        if (t.dataset.save) {
          FC.State.slot = parseInt(t.dataset.save, 10);
          await UI.saveNow();
          draw();
        }
        if (t.dataset.del) {
          const ok = await UI.modal('حذف الحفظ', '<p>هل تريد حذف الخانة ' + t.dataset.del + ' نهائياً؟</p>', [
            { label: 'حذف', cls: 'danger', value: true },
            { label: 'إلغاء', cls: 'ghost', value: false },
          ]);
          if (ok) {
            await FC.Save.remove(parseInt(t.dataset.del, 10));
            draw();
          }
        }
        if (t.dataset.act === 'export') UI.exportSave();
        if (t.dataset.act === 'paste') {
          const v = await UI.modal('لصق نص حفظ', '<textarea class="save-text" id="paste-save" placeholder="الصق نص الحفظ هنا"></textarea>', [
            { label: 'استيراد', cls: 'gold', value: 'ok' },
            { label: 'إلغاء', cls: 'ghost', value: null },
          ], {
            onOpen(m) {
              const ta = m.querySelector('#paste-save');
              ta.addEventListener('input', () => (pasted = ta.value));
            },
          });
          if (v === 'ok' && pasted.trim()) await importText(pasted);
          pasted = '';
        }
      });
      let pasted = '';
      // استيراد نص حفظ إلى أول خانة فارغة (أو الخانة الحالية)
      async function importText(txt) {
        try {
          const st = FC.Save.importText(txt);
          const slots = await FC.Save.list();
          const empty = slots.find((s) => !s.meta);
          const slot = empty ? empty.slot : inGame ? FC.State.slot : 1;
          await FC.Save.save(slot, st);
          UI.toast('تم الاستيراد إلى الخانة ' + slot, 'ok');
          draw();
        } catch (e) {
          UI.toast('نص غير صالح: ' + e.message, 'bad');
        }
      }
      el.querySelector('input[type=file]').addEventListener('change', async (ev) => {
        const f = ev.target.files[0];
        if (!f) return;
        await importText(await f.text());
        ev.target.value = '';
      });
    },
  };

  // تنزيل ملف الحفظ
  // هل تعمل اللعبة داخل إطار (صفحة مستضافة)؟ هناك يمنع المتصفح تنزيل الملفات
  function framed() {
    try {
      return G.self !== G.top;
    } catch (e) {
      return true;
    }
  }

  UI.exportSave = function () {
    const st = FC.State.cur;
    if (!st) return;
    const text = FC.Save.exportText(st);
    if (framed()) {
      UI.modal(
        'تصدير المسيرة',
        '<p class="muted small">انسخ هذا النص واحفظه عندك. لاستعادته: «الحفظ والتحميل» ← «لصق نص حفظ».</p>' +
          '<textarea class="save-text" readonly>' + esc(text) + '</textarea>' +
          '<button class="btn gold" data-copy>نسخ النص</button>',
        [],
        {
          onOpen(el) {
            const ta = el.querySelector('.save-text');
            el.querySelector('[data-copy]').addEventListener('click', () => {
              const fallback = () => {
                ta.focus();
                ta.select();
                UI.toast('النص محدد: انسخه يدوياً');
              };
              try {
                navigator.clipboard.writeText(text).then(() => UI.toast('تم نسخ نص الحفظ', 'ok'), fallback);
              } catch (e) {
                fallback();
              }
            });
          },
        }
      );
      return;
    }
    const blob = new Blob([text], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'masirat-najm-' + st.user.ln + '-' + st.season + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 500);
    UI.toast('تم تنزيل ملف الحفظ', 'ok');
  };
})(globalThis);
