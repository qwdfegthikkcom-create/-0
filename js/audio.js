/* أصوات اللعبة — كلها مولّدة بـ Web Audio API بدون ملفات */
const SFX = (() => {
  let ctx = null, master = null, sfxBus = null, musicBus = null, reverb = null;
  let muted = false;
  try { muted = localStorage.getItem('mosul-muted') === '1'; } catch (e) {}
  let musicTimer = null, musicOn = false, droneNodes = [];

  // مقام الحجاز على ري: ري، مي♭، فا#، صول، لا، سي♭، دو
  const HIJAZ = [293.66, 311.13, 369.99, 392.0, 440.0, 466.16, 523.25, 587.33];

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.8; sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.0; musicBus.connect(master);
    // صدى بسيط (reverb) مولّد
    reverb = ctx.createConvolver();
    const len = ctx.sampleRate * 2.6, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    reverb.buffer = ir;
    const revGain = ctx.createGain(); revGain.gain.value = 0.35;
    reverb.connect(revGain); revGain.connect(master);
  }

  function now() { return ctx.currentTime; }

  function tone(freq, dur, opt = {}) {
    if (!ctx) return;
    const t = now() + (opt.delay || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = opt.type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (opt.slide) o.frequency.exponentialRampToValueAtTime(opt.slide, t + dur);
    const vol = opt.vol == null ? 0.25 : opt.vol;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (opt.attack || 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = o;
    if (opt.filter) {
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = opt.filter;
      o.connect(f); node = f;
    }
    node.connect(g);
    g.connect(opt.bus || sfxBus);
    if (opt.wet) g.connect(reverb);
    o.start(t); o.stop(t + dur + 0.05);
  }

  function noise(dur, opt = {}) {
    if (!ctx) return;
    const t = now() + (opt.delay || 0);
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = opt.ftype || 'bandpass';
    f.frequency.setValueAtTime(opt.freq || 1200, t);
    if (opt.freqTo) f.frequency.exponentialRampToValueAtTime(opt.freqTo, t + dur);
    f.Q.value = opt.q || 1;
    const g = ctx.createGain();
    const vol = opt.vol == null ? 0.2 : opt.vol;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (opt.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(sfxBus);
    if (opt.wet) g.connect(reverb);
    src.start(t); src.stop(t + dur + 0.05);
  }

  const api = {
    init,
    get muted() { return muted; },
    toggleMute() {
      muted = !muted;
      try { localStorage.setItem('mosul-muted', muted ? '1' : '0'); } catch (e) {}
      if (master) master.gain.setTargetAtTime(muted ? 0 : 1, now(), 0.05);
      return muted;
    },
    click() { noise(0.04, { freq: 2400, q: 3, vol: 0.18 }); tone(1400, 0.05, { type: 'triangle', vol: 0.05 }); },
    tick() { noise(0.03, { freq: 3200, q: 6, vol: 0.14 }); },
    hover() { tone(1800, 0.06, { vol: 0.02 }); },
    pick() {
      tone(880, 0.25, { type: 'triangle', vol: 0.12, wet: true });
      tone(1318.5, 0.35, { type: 'triangle', vol: 0.1, delay: 0.08, wet: true });
    },
    error() {
      tone(140, 0.25, { type: 'sawtooth', vol: 0.09, filter: 600 });
      tone(110, 0.3, { type: 'sawtooth', vol: 0.08, filter: 500, delay: 0.12 });
    },
    unlock() {
      noise(0.05, { freq: 1800, q: 4, vol: 0.3 });
      noise(0.07, { freq: 900, q: 3, vol: 0.3, delay: 0.12 });
      tone(660, 0.5, { type: 'triangle', vol: 0.12, delay: 0.2, wet: true });
      tone(990, 0.6, { type: 'triangle', vol: 0.1, delay: 0.28, wet: true });
    },
    creak() {
      noise(1.4, { freq: 300, freqTo: 900, q: 12, vol: 0.18, attack: 0.2 });
      tone(90, 1.2, { type: 'sawtooth', vol: 0.04, filter: 300, slide: 70 });
    },
    wipe() { noise(0.5, { freq: 3000, freqTo: 1200, q: 0.8, vol: 0.12, attack: 0.1 }); noise(0.4, { freq: 2500, q: 0.8, vol: 0.1, delay: 0.45 }); },
    rustle() { noise(0.6, { freq: 1500, freqTo: 600, q: 0.7, vol: 0.14, attack: 0.08 }); },
    slide() { noise(0.45, { freq: 500, freqTo: 250, q: 2, vol: 0.2, attack: 0.05 }); },
    thud() { tone(90, 0.3, { vol: 0.3, slide: 50 }); noise(0.15, { freq: 300, vol: 0.2 }); },
    match() { noise(0.25, { freq: 4000, freqTo: 1500, q: 1, vol: 0.2 }); noise(0.8, { freq: 800, q: 0.5, vol: 0.06, delay: 0.2, attack: 0.1 }); },
    rotate() { noise(0.12, { freq: 1100, q: 5, vol: 0.14 }); tone(520, 0.08, { type: 'square', vol: 0.02, delay: 0.05, filter: 1200 }); },
    chime(i = 0) { const f = HIJAZ[i % HIJAZ.length] * 2; tone(f, 0.9, { type: 'sine', vol: 0.12, wet: true }); tone(f * 2, 0.5, { vol: 0.03, wet: true }); },
    success() {
      const seq = [0, 2, 4, 7];
      seq.forEach((n, i) => tone(HIJAZ[n] * 2, 0.9, { type: 'triangle', vol: 0.13, delay: i * 0.12, wet: true }));
      tone(HIJAZ[0], 1.6, { type: 'sine', vol: 0.12, delay: 0.1, wet: true });
    },
    fanfare() {
      const seq = [0, 2, 3, 4, 7, 4, 7];
      seq.forEach((n, i) => tone(HIJAZ[n] * 2, 0.7, { type: 'triangle', vol: 0.12, delay: i * 0.14, wet: true }));
      [0, 4, 7].forEach(n => tone(HIJAZ[n], 2.2, { type: 'sine', vol: 0.07, delay: 1.0, wet: true }));
    },
    startMusic() {
      if (!ctx || musicOn) return;
      musicOn = true;
      musicBus.gain.cancelScheduledValues(now());
      musicBus.gain.setTargetAtTime(0.55, now(), 2.5);
      // طنين هادئ خلفي (درون)
      [[73.42, 'sawtooth', 0.035], [110.0, 'sawtooth', 0.02], [146.83, 'sine', 0.05]].forEach(([f, type, v], i) => {
        const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
        o.type = type; o.frequency.value = f; o.detune.value = (i - 1) * 6;
        lp.type = 'lowpass'; lp.frequency.value = 380;
        const lfo = ctx.createOscillator(), lg = ctx.createGain();
        lfo.frequency.value = 0.07 + i * 0.03; lg.gain.value = v * 0.5;
        lfo.connect(lg); lg.connect(g.gain);
        g.gain.value = v;
        o.connect(lp); lp.connect(g); g.connect(musicBus); g.connect(reverb);
        o.start(); lfo.start();
        droneNodes.push(o, lfo);
      });
      // نغمات متفرقة كأنها عود بعيد
      let step = 0;
      const phrase = [0, 1, 2, 1, 0, 3, 2, 1, 0, 4, 3, 2, 1, 2, 1, 0];
      const play = () => {
        if (!musicOn) return;
        const n = phrase[step % phrase.length] + (Math.random() < 0.15 ? 1 : 0);
        const f = HIJAZ[n % HIJAZ.length];
        tone(f, 1.8, { type: 'triangle', vol: 0.05, bus: musicBus, wet: true, filter: 1800 });
        tone(f * 2, 0.6, { type: 'sine', vol: 0.012, bus: musicBus });
        step++;
        musicTimer = setTimeout(play, 900 + Math.random() * 1600 + (step % 8 === 0 ? 2500 : 0));
      };
      musicTimer = setTimeout(play, 1500);
    },
    stopMusic() {
      if (!ctx || !musicOn) return;
      musicOn = false;
      clearTimeout(musicTimer);
      musicBus.gain.setTargetAtTime(0, now(), 0.6);
      const nodes = droneNodes; droneNodes = [];
      setTimeout(() => nodes.forEach(n => { try { n.stop(); } catch (e) {} }), 2500);
    }
  };
  return api;
})();
