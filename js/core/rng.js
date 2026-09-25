/* =========================================================
   مولّد الأرقام العشوائية بـ seed (mulberry32)
   الحالة رقم واحد 32-بت يُحفظ داخل ملف الحفظ، فتتكرر النتائج نفسها
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC = G.FC || {};

  class RNG {
    constructor(seed) {
      this.s = (seed >>> 0) || 0x9e3779b9;
    }
    // رقم عشوائي بين 0 و 1
    next() {
      let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    // رقم عشري بين a و b
    float(a, b) {
      return a + (b - a) * this.next();
    }
    // رقم صحيح بين a و b (شاملاً الطرفين)
    int(a, b) {
      return a + Math.floor(this.next() * (b - a + 1));
    }
    // صح بنسبة p
    chance(p) {
      return this.next() < p;
    }
    // عنصر عشوائي من مصفوفة
    pick(arr) {
      return arr[Math.floor(this.next() * arr.length)];
    }
    // توزيع طبيعي (Box–Muller)
    normal(mu, sd) {
      const u = 1 - this.next();
      const v = this.next();
      return (mu || 0) + (sd == null ? 1 : sd) * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }
    // توزيع Poisson (خوارزمية Knuth — مناسبة للقيم الصغيرة)
    poisson(l) {
      const L = Math.exp(-l);
      let k = 0;
      let p = 1;
      do {
        k++;
        p *= this.next();
      } while (p > L && k < 50);
      return k - 1;
    }
    // اختيار فهرس حسب أوزان
    weighted(ws) {
      let total = 0;
      for (let i = 0; i < ws.length; i++) total += ws[i];
      if (total <= 0) return Math.floor(this.next() * ws.length);
      let r = this.next() * total;
      for (let i = 0; i < ws.length; i++) {
        r -= ws[i];
        if (r < 0) return i;
      }
      return ws.length - 1;
    }
    // خلط مصفوفة في مكانها
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(this.next() * (i + 1));
        const t = arr[i];
        arr[i] = arr[j];
        arr[j] = t;
      }
      return arr;
    }
  }
  FC.RNG = RNG;

  // تجزئة حتمية لعدة أرقام → رقم 32-بت (لاشتقاق قيم ثابتة لكل لاعب دون تخزينها)
  FC.hash = function (a, b, c) {
    let h = 0x811c9dc5 ^ (a | 0);
    h = Math.imul(h ^ (b | 0), 0x01000193);
    h = Math.imul(h ^ (c | 0), 0x01000193);
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return h >>> 0;
  };
  // تجزئة حتمية → رقم بين 0 و 1
  FC.hashFloat = (a, b, c) => FC.hash(a, b, c) / 4294967296;

  // مولّد الحالة الحالية (يُنشأ من الرقم المحفوظ في الحالة)
  FC.rngOf = function (state) {
    if (!state._rng) state._rng = new RNG(state.rngState);
    return state._rng;
  };
})(globalThis);
