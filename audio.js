// Web Audio sound engine — everything synthesized, zero files.
const SFX = (() => {
  let ctx = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.6;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone({ freq = 440, to = null, dur = 0.2, type = 'sine', vol = 0.3, when = 0, attack = 0.01 }) {
    if (muted) return;
    const c = ensure();
    const t0 = c.currentTime + when;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise({ dur = 0.3, vol = 0.3, freq = 1000, q = 1, type = 'lowpass', sweepTo = null, when = 0 }) {
    if (muted) return;
    const c = ensure();
    const t0 = c.currentTime + when;
    const len = Math.ceil(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t0);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(Math.max(20, sweepTo), t0 + dur);
    f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(master);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  const api = {
    unlock: ensure,
    setMuted(v) {
      muted = v;
      if (master) master.gain.value = v ? 0 : 0.6;
    },
    isMuted: () => muted,

    pop()   { tone({ freq: 300, to: 900, dur: 0.12, type: 'triangle', vol: 0.5 }); tone({ freq: 150, to: 40, dur: 0.15, type: 'sine', vol: 0.4 }); },
    click() { tone({ freq: 700, to: 400, dur: 0.06, type: 'square', vol: 0.2 }); },
    sparkle() {
      [1200, 1600, 2000, 2600].forEach((f, i) =>
        tone({ freq: f, dur: 0.18, type: 'sine', vol: 0.22, when: i * 0.07 }));
      noise({ dur: 0.5, vol: 0.1, freq: 4000, sweepTo: 9000, type: 'highpass', when: 0.05 });
    },
    whoosh() { noise({ dur: 0.45, vol: 0.4, freq: 400, sweepTo: 4000 }); noise({ dur: 0.45, vol: 0.3, freq: 5000, sweepTo: 300, type: 'highpass' }); },
    boing()  { tone({ freq: 160, to: 500, dur: 0.14, type: 'sine', vol: 0.5 }); tone({ freq: 500, to: 120, dur: 0.2, type: 'sine', vol: 0.45, when: 0.12 }); },
    grab()   { tone({ freq: 400, to: 950, dur: 0.14, type: 'square', vol: 0.25 }); api.pop(); },
    clank()  { tone({ freq: 220, to: 190, dur: 0.1, type: 'square', vol: 0.3 }); noise({ dur: 0.15, vol: 0.3, freq: 2500, q: 6, type: 'bandpass' }); },
    bark()   { tone({ freq: 320, to: 140, dur: 0.09, type: 'sawtooth', vol: 0.4 }); tone({ freq: 280, to: 110, dur: 0.12, type: 'sawtooth', vol: 0.4, when: 0.16 }); },
    beep(hi) { tone({ freq: hi ? 950 : 550, dur: 0.16, type: 'square', vol: 0.35 }); },
    lift() {
      noise({ dur: 2.6, vol: 0.55, freq: 90, sweepTo: 260 });
      tone({ freq: 70, to: 200, dur: 2.6, type: 'sawtooth', vol: 0.3 });
      tone({ freq: 130, to: 340, dur: 2.6, type: 'square', vol: 0.1 });
      noise({ dur: 2.6, vol: 0.2, freq: 3000, sweepTo: 8000, type: 'highpass' });
    },
    thud() { tone({ freq: 110, to: 30, dur: 0.35, type: 'sine', vol: 0.7 }); noise({ dur: 0.3, vol: 0.35, freq: 300 }); },
    gasp() { noise({ dur: 0.35, vol: 0.35, freq: 600, sweepTo: 2400, type: 'bandpass', q: 3 }); tone({ freq: 900, to: 1700, dur: 0.3, type: 'sine', vol: 0.2 }); },
    sadTrombone() {
      const notes = [293.66, 277.18, 261.63, 207.56];
      notes.forEach((f, i) =>
        tone({ freq: f, to: f * 0.985, dur: i === 3 ? 0.7 : 0.24, type: 'sawtooth', vol: 0.3, when: i * 0.26 }));
    },
    fanfare() {
      const seq = [[523, 0], [659, 0.12], [784, 0.24], [1046, 0.38]];
      seq.forEach(([f, t]) => {
        tone({ freq: f, dur: 0.5, type: 'square', vol: 0.22, when: t });
        tone({ freq: f / 2, dur: 0.5, type: 'triangle', vol: 0.25, when: t });
      });
      tone({ freq: 1046, to: 1568, dur: 0.8, type: 'square', vol: 0.25, when: 0.55 });
      noise({ dur: 0.6, vol: 0.15, freq: 5000, type: 'highpass', when: 0.55 });
    },
    jumpZoom() {
      tone({ freq: 200, to: 1800, dur: 0.55, type: 'sine', vol: 0.35 });
      noise({ dur: 0.55, vol: 0.25, freq: 300, sweepTo: 6000 });
    },
    pageFlip() { noise({ dur: 0.22, vol: 0.2, freq: 1200, sweepTo: 5000, type: 'highpass' }); },
    nope() { tone({ freq: 200, to: 120, dur: 0.25, type: 'square', vol: 0.3 }); },
  };
  return api;
})();
