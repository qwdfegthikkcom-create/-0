/* =========================================================
   أصوات مولّدة بـ Web Audio API (بدون ملفات): صافرة، ركلة، هدير الجمهور، نقرة
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC = G.FC || {};
  let ctx = null;
  let noiseBuf = null;

  function ac() {
    if (!FC.Sound.enabled) return null;
    try {
      if (!ctx) {
        const A = G.AudioContext || G.webkitAudioContext;
        if (!A) return null;
        ctx = new A();
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (e) {
      return null;
    }
  }
  // ضوضاء بيضاء (لهدير الجمهور)
  function noise(c) {
    if (noiseBuf) return noiseBuf;
    noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }
  function tone(c, freq, t0, dur, type, vol) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
    return o;
  }
  function crowd(c, dur, vol, freq) {
    const src = c.createBufferSource();
    src.buffer = noise(c);
    src.loop = true;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq || 700;
    f.Q.value = 0.6;
    const g = c.createGain();
    const t = c.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(c.destination);
    src.start(t);
    src.stop(t + dur + 0.1);
  }

  FC.Sound = {
    enabled: true,
    // صافرة الحكم (n مرات)
    whistle(n) {
      const c = ac();
      if (!c) return;
      for (let i = 0; i < (n || 1); i++) {
        const t = c.currentTime + i * 0.32;
        const o = tone(c, 2900, t, i === (n || 1) - 1 ? 0.5 : 0.22, 'sine', 0.12);
        const lfo = c.createOscillator();
        const lg = c.createGain();
        lfo.frequency.value = 38;
        lg.gain.value = 120;
        lfo.connect(lg).connect(o.frequency);
        lfo.start(t);
        lfo.stop(t + 0.6);
      }
    },
    // ركلة الكرة
    kick(v) {
      const c = ac();
      if (!c) return;
      const t = c.currentTime;
      const o = c.createOscillator();
      const g = c.createGain();
      o.frequency.setValueAtTime(160, t);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      g.gain.setValueAtTime((v || 1) * 0.35, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      o.connect(g).connect(c.destination);
      o.start(t);
      o.stop(t + 0.16);
    },
    // هدير الجمهور عند الهدف
    goal(v) {
      const c = ac();
      if (!c) return;
      crowd(c, 2.6, (v || 1) * 0.35, 650);
      crowd(c, 2.2, (v || 1) * 0.18, 1400);
    },
    // «أوووه» من الجمهور
    ooh() {
      const c = ac();
      if (!c) return;
      crowd(c, 1.2, 0.14, 420);
    },
    // اهتزاز الشباك
    net() {
      const c = ac();
      if (!c) return;
      crowd(c, 0.4, 0.12, 2400);
    },
    // نقرة الأزرار
    click() {
      const c = ac();
      if (!c) return;
      tone(c, 880, c.currentTime, 0.05, 'triangle', 0.05);
    },
  };
})(globalThis);
