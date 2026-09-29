// Instruments and sound effects, all synthesised with Web Audio nodes.
// Every function schedules one event on a context at time t (seconds) into a
// destination node. Noise comes from seeded buffers, so the render is
// deterministic.

import { rng } from '../rng.js';

export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---------------------------------------------------------------- shared data
export function makeShared(ctx) {
  const sr = ctx.sampleRate;
  const r = rng(909);
  const noise = ctx.createBuffer(1, sr * 4, sr);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = r.next() * 2 - 1;
  // pink-ish noise for breath and air
  const pink = ctx.createBuffer(1, sr * 4, sr);
  const p = pink.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < p.length; i++) {
    const w = d[i];
    b0 = 0.99765 * b0 + w * 0.099046;
    b1 = 0.963 * b1 + w * 0.2965164;
    b2 = 0.57 * b2 + w * 1.0526913;
    p[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
  }
  const wave = (amps, phases = null) => {
    const real = new Float32Array(amps.length + 1), imag = new Float32Array(amps.length + 1);
    amps.forEach((a, i) => {
      const ph = phases ? phases[i] : 0;
      real[i + 1] = a * Math.sin(ph);
      imag[i + 1] = a * Math.cos(ph);
    });
    return ctx.createPeriodicWave(real, imag, { disableNormalization: true });
  };
  // felt piano: harmonics falling ~1/n^1.3 with a hammer-position notch near 7-8
  const pianoAmps = [];
  for (let n = 1; n <= 16; n++) pianoAmps.push((1 / Math.pow(n, 1.35)) * (n === 7 || n === 8 ? 0.3 : 1));
  const norm = (a) => {
    const s = a.reduce((x, y) => x + y, 0);
    return a.map((x) => x / s);
  };
  // bowed string: a sawtooth with a softened top (Helmholtz motion, rounded corner)
  const bowAmps = Array.from({ length: 48 }, (_, i) => (1 / (i + 1)) * Math.exp(-(i + 1) / 26));
  // glottal source: steeper tilt, a slight emphasis near the 2nd-4th harmonics
  const glotAmps = Array.from({ length: 40 }, (_, i) => Math.pow(i + 1, -1.25) * (i >= 1 && i <= 3 ? 1.15 : 1));
  return {
    noise,
    pink,
    rnd: r,
    pianoWave: wave(norm(pianoAmps)),
    stringWave: wave(norm(bowAmps)),
    celloWave: wave(norm(Array.from({ length: 36 }, (_, i) => (1 / (i + 1)) * Math.exp(-(i + 1) / 20) * (i % 2 === 0 ? 1 : 0.7)))),
    choirWave: wave(norm(glotAmps)),
  };
}

function env(g, t, a, peak, d, sustain, rel, end) {
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.setTargetAtTime(peak * sustain, t + a, d);
  g.gain.setTargetAtTime(0, end, rel);
}

function noiseSrc(ctx, sh, t, dur, buf = null, offset = null) {
  const s = ctx.createBufferSource();
  s.buffer = buf ?? sh.noise;
  s.loop = true;
  const off = offset ?? sh.rnd.next() * 3;
  s.start(t, off);
  s.stop(t + dur);
  return s;
}

function panner(ctx, pan) {
  const p = ctx.createStereoPanner();
  p.pan.value = Math.max(-1, Math.min(1, pan));
  return p;
}

// ------------------------------------------------------------------ piano
// Additive stiff-string model: partials f_n = n f0 sqrt(1 + B n^2), amplitudes
// shaped by the hammer's strike position and the velocity, each partial with
// its own two-stage decay (prompt sound, then aftersound; high partials die
// first), unison strings beating on the low partials, a hammer knock, and
// dampers on key release. vel 0..1, dur = how long the key is held.
export function piano(ctx, sh, out, t, midi, vel = 0.6, dur = 1.5, pan = 0) {
  const r = sh.rnd;
  const f0 = mtof(midi);
  const B = 0.00028 * Math.pow(2, (midi - 60) / 18);
  const x0 = 1 / (8.3 + r.next() * 0.4);
  const T1 = Math.max(0.35, 1.6 - (midi - 48) * 0.025);   // prompt decay, s
  const T2 = Math.max(1.4, 12 - (midi - 36) * 0.14);        // aftersound, s
  const rel = t + Math.min(dur, T2) + 0.02;
  const stopAt = rel + 0.9;
  const pn = panner(ctx, pan + (midi - 64) * 0.012);
  const sum = ctx.createGain();
  sum.gain.value = 0.2;
  sum.connect(pn).connect(out);
  const tilt = 1.35 - 0.6 * vel;
  for (let n = 1; n <= 10; n++) {
    const fn = n * f0 * Math.sqrt(1 + B * n * n);
    if (fn > 10000) break;
    const comb = 0.25 + 0.75 * Math.abs(Math.sin(Math.PI * n * x0));
    const a = comb * Math.pow(n, -tilt) * vel;
    if (a < 0.012) continue;
    const t1 = T1 / (1 + 0.35 * (n - 1));
    const t2 = T2 / (1 + 0.22 * (n - 1));
    const addOsc = (freq, amp) => {
      const o = ctx.createOscillator();
      o.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(amp, t + 0.0015 + 0.001 * n / 10);
      g.gain.setTargetAtTime(amp * 0.32, t + 0.003, t1 / 3);
      g.gain.setTargetAtTime(0, t + t1, t2 / 6.9);
      g.gain.setTargetAtTime(0, rel, 0.07 + 0.05 / n);
      o.connect(g).connect(sum);
      o.start(t);
      o.stop(stopAt);
    };
    addOsc(fn, a);
    // a second string, a cent or so apart: the slow beating of a real unison
    if (n <= 2) addOsc(fn * (1 + (0.4 + 0.8 * r.next()) * 5.8e-4 * (r.next() < 0.5 ? -1 : 1)), a * 0.55);
  }
  // hammer: felt knock and a short, pitched noise burst
  const n = noiseSrc(ctx, sh, t, 0.08);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = Math.min(6000, f0 * 3.2);
  bp.Q.value = 1.6;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.07 * vel * vel, t);
  ng.gain.setTargetAtTime(0, t + 0.002, 0.008);
  n.connect(bp).connect(ng).connect(pn);
  const k = ctx.createOscillator();
  k.frequency.setValueAtTime(140, t);
  k.frequency.exponentialRampToValueAtTime(70, t + 0.04);
  const kg = ctx.createGain();
  kg.gain.setValueAtTime(0.05 * vel, t);
  kg.gain.setTargetAtTime(0, t + 0.002, 0.018);
  k.connect(kg).connect(pn);
  k.start(t);
  k.stop(t + 0.3);
}

// ------------------------------------------------------------------ celesta / music box
// Struck steel bars over wooden resonators: a strong fundamental with a slow
// beat (two bars never agree exactly), weak upper modes that die fast, and a
// small metallic strike.
export function celesta(ctx, sh, out, t, midi, vel = 0.5, pan = 0) {
  const r = sh.rnd;
  const f = mtof(midi);
  const pn = panner(ctx, pan);
  pn.connect(out);
  const parts = [[1, 1, 2.6], [1.0012 + r.next() * 0.001, 0.45, 2.2], [2.0, 0.08, 0.8], [3.93, 0.18, 0.28], [9.9, 0.05, 0.05]];
  parts.forEach(([ratio, amp, dec]) => {
    const o = ctx.createOscillator();
    o.frequency.value = f * ratio;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel * amp * 0.26, t + 0.0015);
    g.gain.setTargetAtTime(0, t + 0.0015, dec / 2.2);
    o.connect(g).connect(pn);
    o.start(t);
    o.stop(t + dec * 3 + 0.1);
  });
  const n = noiseSrc(ctx, sh, t, 0.03);
  const hp = ctx.createBiquadFilter();
  hp.type = 'bandpass';
  hp.frequency.value = Math.min(9000, f * 6);
  hp.Q.value = 2.5;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(vel * 0.05, t);
  ng.gain.setTargetAtTime(0, t, 0.004);
  n.connect(hp).connect(ng).connect(pn);
}

// ------------------------------------------------------------------ marimba / pizzicato
export function marimba(ctx, sh, out, t, midi, vel = 0.5, pan = 0) {
  const f = mtof(midi);
  const pn = panner(ctx, pan);
  pn.connect(out);
  [[1, 1, 0.45], [3.93, 0.25, 0.08], [9.2, 0.06, 0.02]].forEach(([ratio, amp, dec]) => {
    const o = ctx.createOscillator();
    o.frequency.value = f * ratio;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel * amp * 0.32, t + 0.003);
    g.gain.setTargetAtTime(0, t + 0.003, dec);
    o.connect(g).connect(pn);
    o.start(t);
    o.stop(t + dec * 7 + 0.05);
  });
}

export function pizz(ctx, sh, out, t, midi, vel = 0.5, pan = 0) {
  const f = mtof(midi);
  const o = ctx.createOscillator();
  o.setPeriodicWave(sh.stringWave);
  o.frequency.value = f;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(f * 6, t);
  lp.frequency.setTargetAtTime(f * 1.5, t, 0.08);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vel * 0.35, t + 0.004);
  g.gain.setTargetAtTime(0, t + 0.004, 0.18);
  o.connect(lp).connect(g).connect(panner(ctx, pan)).connect(out);
  o.start(t);
  o.stop(t + 1.2);
}

// ------------------------------------------------------------------ strings ensemble
// A section of players, each with their own slight detune, entry and
// vibrato (which starts after the note speaks), through the resonances of a
// wooden body and a little bow noise.
export function strings(ctx, sh, out, t, midi, vel = 0.4, dur = 3, pan = 0, attack = 0.6, release = 1.4) {
  const r = sh.rnd;
  const f = mtof(midi);
  const pn = panner(ctx, pan);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1800 + vel * 3200 + f * 0.8;
  lp.Q.value = 0.3;
  const b1 = ctx.createBiquadFilter();
  b1.type = 'peaking'; b1.frequency.value = midi < 55 ? 220 : 380; b1.Q.value = 1.4; b1.gain.value = 4;
  const b2 = ctx.createBiquadFilter();
  b2.type = 'peaking'; b2.frequency.value = 1150; b2.Q.value = 1.1; b2.gain.value = -3;
  const b3 = ctx.createBiquadFilter();
  b3.type = 'peaking'; b3.frequency.value = 2900; b3.Q.value = 1.3; b3.gain.value = 2.5;
  const g = ctx.createGain();
  env(g, t, attack, vel * 0.16, 1.2, 0.88, release * 0.4, t + dur);
  lp.connect(b1).connect(b2).connect(b3).connect(g).connect(pn).connect(out);
  const stopAt = t + dur + release * 2.5;
  const players = midi < 50 ? 2 : 3;
  for (let k = 0; k < players; k++) {
    const o = ctx.createOscillator();
    o.setPeriodicWave(sh.stringWave);
    o.frequency.value = f;
    o.detune.value = (k - (players - 1) / 2) * 5 + (r.next() - 0.5) * 5;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 4.8 + r.next() * 1.4;
    const lg = ctx.createGain();
    lg.gain.setValueAtTime(0, t);
    lg.gain.linearRampToValueAtTime(0, t + 0.2 + r.next() * 0.3);
    lg.gain.linearRampToValueAtTime(4 + r.next() * 5, t + 0.9 + r.next() * 0.4);
    lfo.connect(lg).connect(o.detune);
    const vg = ctx.createGain();
    const d0 = r.next() * 0.05;
    vg.gain.setValueAtTime(0, t);
    vg.gain.linearRampToValueAtTime(1 / players, t + d0 + 0.05);
    o.connect(vg).connect(lp);
    o.start(t);
    lfo.start(t);
    o.stop(stopAt);
    lfo.stop(stopAt);
  }
  // bow noise, following the envelope
  const n = noiseSrc(ctx, sh, t, dur + release * 2);
  const nb = ctx.createBiquadFilter();
  nb.type = 'bandpass';
  nb.frequency.value = Math.min(5000, f * 5);
  nb.Q.value = 1.2;
  const ng = ctx.createGain();
  env(ng, t, attack * 0.7, vel * 0.006, 0.5, 0.6, release * 0.4, t + dur);
  n.connect(nb).connect(ng).connect(pn);
}

// ------------------------------------------------------------------ cello (the partner)
export function cello(ctx, sh, out, t, midi, vel = 0.5, dur = 1.5, pan = 0) {
  const r = sh.rnd;
  const f = mtof(midi);
  const o = ctx.createOscillator();
  o.setPeriodicWave(sh.celloWave);
  // the finger lands slightly flat and settles
  o.frequency.setValueAtTime(f * 0.988, t);
  o.frequency.setTargetAtTime(f, t, 0.035);
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 5.3 + r.next() * 0.5;
  const lg = ctx.createGain();
  lg.gain.setValueAtTime(0, t);
  lg.gain.linearRampToValueAtTime(0, t + 0.3);
  lg.gain.linearRampToValueAtTime(16, t + 0.9);
  lfo.connect(lg).connect(o.detune);
  const peaks = [[110, 5, 1.0], [205, 6, 1.4], [420, 4, 1.6], [1250, 3, 1.4], [2800, -4, 1.0]];
  let node = o;
  for (const [fr, gdb, q] of peaks) {
    const b = ctx.createBiquadFilter();
    b.type = 'peaking'; b.frequency.value = fr; b.gain.value = gdb; b.Q.value = q;
    node.connect(b);
    node = b;
  }
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 2400 + vel * 1800;
  const g = ctx.createGain();
  env(g, t, 0.16, vel * 0.2, 0.7, 0.82, 0.22, t + dur);
  const pn = panner(ctx, pan);
  node.connect(lp).connect(g).connect(pn).connect(out);
  const stopAt = t + dur + 1.5;
  o.start(t); lfo.start(t); o.stop(stopAt); lfo.stop(stopAt);
  const n = noiseSrc(ctx, sh, t, dur + 0.5);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = Math.min(4000, f * 4); bp.Q.value = 1.5;
  const ng = ctx.createGain();
  env(ng, t, 0.08, vel * 0.014, 0.35, 0.5, 0.2, t + dur);
  n.connect(bp).connect(ng).connect(pn);
}

// ------------------------------------------------------------------ glass choir (the AI's voice)
// Formant synthesis: a glottal source (with vibrato that arrives late and a
// slow drift) filtered by four vowel formants, breath through the same
// formants, and a faint pure tone an octave up: a choir that is a little too
// clean, which is the point.
const VOWELS = {
  oo: [[330, 1, 70], [700, 0.35, 80], [2450, 0.12, 120], [3350, 0.06, 140]],
  ah: [[760, 1, 80], [1180, 0.55, 90], [2800, 0.2, 120], [3800, 0.08, 140]],
};
export function choir(ctx, sh, out, t, midi, vel = 0.4, dur = 3, pan = 0, vowel = 0) {
  const r = sh.rnd;
  const f = mtof(midi);
  const pn = panner(ctx, pan);
  const g = ctx.createGain();
  env(g, t, 0.7, vel * 0.5, 1.5, 0.9, 0.9, t + dur);
  g.connect(pn).connect(out);
  const bank = ctx.createGain();
  bank.gain.value = 1;
  const F = VOWELS.oo.map((a, i) => {
    const b = VOWELS.ah[i];
    return [a[0] + (b[0] - a[0]) * vowel, a[1] + (b[1] - a[1]) * vowel, a[2] + (b[2] - a[2]) * vowel];
  });
  const src = ctx.createGain();
  for (const [fr, amp, bw] of F) {
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = fr;
    bp.Q.value = fr / bw;
    const ag = ctx.createGain();
    ag.gain.value = amp * 2.2;
    src.connect(bp).connect(ag).connect(g);
  }
  const stopAt = t + dur + 3;
  for (let k = 0; k < 2; k++) {
    const o = ctx.createOscillator();
    o.setPeriodicWave(sh.choirWave);
    o.frequency.value = f;
    o.detune.value = (k - 0.5) * 7 + (r.next() - 0.5) * 3;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.0 + r.next() * 0.8;
    const lg = ctx.createGain();
    lg.gain.setValueAtTime(0, t);
    lg.gain.linearRampToValueAtTime(0, t + 0.5);
    lg.gain.linearRampToValueAtTime(10 + r.next() * 6, t + 1.4);
    lfo.connect(lg).connect(o.detune);
    const vg = ctx.createGain();
    vg.gain.value = 0.5;
    o.connect(vg).connect(src);
    o.start(t); lfo.start(t); o.stop(stopAt); lfo.stop(stopAt);
  }
  // breath
  const n = noiseSrc(ctx, sh, t, dur + 2, sh.pink);
  const ng = ctx.createGain();
  ng.gain.value = 0.06;
  n.connect(ng).connect(src);
  // the glass: a faint pure tone an octave up
  const gl = ctx.createOscillator();
  gl.frequency.value = f * 2;
  const gg = ctx.createGain();
  env(gg, t, 1.2, vel * 0.02, 2, 0.9, 1.2, t + dur);
  gl.connect(gg).connect(pn);
  gl.start(t); gl.stop(stopAt);
}

// ------------------------------------------------------------------ bells (the AI counting)
export function bell(ctx, sh, out, t, midi, vel = 0.5, pan = 0, length = 1) {
  const f = mtof(midi);
  const pn = panner(ctx, pan);
  pn.connect(out);
  const parts = [[0.5, 0.35, 5], [1, 0.6, 3.2], [1.19, 0.3, 2.2], [1.5, 0.2, 1.8], [2, 0.32, 1.6], [2.51, 0.12, 0.9], [3.0, 0.08, 0.6], [4.16, 0.05, 0.35]];
  parts.forEach(([ratio, amp, dec]) => {
    const o = ctx.createOscillator();
    o.frequency.value = f * ratio;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel * amp * 0.22, t + 0.003);
    g.gain.setTargetAtTime(0, t + 0.003, dec * 0.5 * length);
    o.connect(g).connect(pn);
    o.start(t);
    o.stop(t + dec * 3 * length + 0.1);
  });
  const n = noiseSrc(ctx, sh, t, 0.03);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = 3000;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(vel * 0.04, t);
  ng.gain.setTargetAtTime(0, t, 0.006);
  n.connect(hp).connect(ng).connect(pn);
}

// ------------------------------------------------------------------ drones and beds
export function drone(ctx, sh, out, t, midi, vel, dur, attack = 2, release = 2) {
  const f = mtof(midi);
  const g = ctx.createGain();
  env(g, t, attack, vel * 0.2, 1, 1, release * 0.4, t + dur);
  g.connect(out);
  [0, 0.3].forEach((dc, k) => {
    const o = ctx.createOscillator();
    o.type = k === 0 ? 'sine' : 'triangle';
    o.frequency.value = f * (k === 0 ? 1 : 2);
    o.detune.value = dc;
    const gg = ctx.createGain();
    gg.gain.value = k === 0 ? 1 : 0.15;
    o.connect(gg).connect(g);
    o.start(t); o.stop(t + dur + release * 3);
  });
}

export function air(ctx, sh, out, t, dur, vel = 0.3, freq = 800, q = 0.7, attack = 1, release = 1) {
  const n = noiseSrc(ctx, sh, t, dur + release * 3, sh.pink);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = q;
  const g = ctx.createGain();
  env(g, t, attack, vel * 0.25, 1, 1, release * 0.4, t + dur);
  n.connect(bp).connect(g).connect(out);
  return { filter: bp, gain: g };
}

// ------------------------------------------------------------------ heartbeat
// kind: 'adult' | 'fetal' | 'half' (only the first sound)
export function heartbeat(ctx, sh, out, t, vel = 0.7, kind = 'adult') {
  const fetal = kind === 'fetal';
  const thump = (tt, v, f0, f1, dec) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f0, tt);
    o.frequency.exponentialRampToValueAtTime(f1, tt + 0.07);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, tt);
    g.gain.linearRampToValueAtTime(v, tt + 0.006);
    g.gain.setTargetAtTime(0, tt + 0.006, dec);
    o.connect(g).connect(out);
    o.start(tt); o.stop(tt + dec * 8);
    // soft click of the valve
    const n = noiseSrc(ctx, sh, tt, 0.05);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = fetal ? 500 : 260;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(v * (fetal ? 0.5 : 0.35), tt);
    ng.gain.setTargetAtTime(0, tt, 0.018);
    n.connect(lp).connect(ng).connect(out);
  };
  if (fetal) {
    thump(t, vel * 0.5, 140, 70, 0.045);
    thump(t + 0.11, vel * 0.35, 150, 80, 0.035);
    // the whoosh of fetal blood flow
    const n = noiseSrc(ctx, sh, t, 0.3, sh.pink);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 320; bp.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel * 0.25, t + 0.04);
    g.gain.setTargetAtTime(0, t + 0.05, 0.06);
    n.connect(bp).connect(g).connect(out);
  } else {
    thump(t, vel, 95, 44, 0.07);
    if (kind !== 'half') thump(t + 0.19, vel * 0.62, 110, 52, 0.05);
  }
}

// ------------------------------------------------------------------ sound effects
export function whistle(ctx, sh, out, t, dur, f0, f1, vel = 0.2, pan = 0) {
  const o = ctx.createOscillator();
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const o2 = ctx.createOscillator();
  o2.frequency.setValueAtTime(f0 * 2.01, t);
  o2.frequency.exponentialRampToValueAtTime(f1 * 2.01, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vel * 0.12, t + dur * 0.3);
  g.gain.linearRampToValueAtTime(vel * 0.1, t + dur * 0.8);
  g.gain.setTargetAtTime(0, t + dur, 0.2);
  const g2 = ctx.createGain();
  g2.gain.value = 0.25;
  const pn = panner(ctx, pan);
  o.connect(g); o2.connect(g2).connect(g);
  g.connect(pn).connect(out);
  o.start(t); o2.start(t); o.stop(t + dur + 1.5); o2.stop(t + dur + 1.5);
}

export function tick(ctx, sh, out, t, vel = 0.4, freq = 3200, pan = 0) {
  const n = noiseSrc(ctx, sh, t, 0.08);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = 8;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vel * 0.5, t);
  g.gain.setTargetAtTime(0, t, 0.012);
  n.connect(bp).connect(g).connect(panner(ctx, pan)).connect(out);
  const o = ctx.createOscillator();
  o.frequency.value = freq * 0.5;
  const og = ctx.createGain();
  og.gain.setValueAtTime(vel * 0.06, t);
  og.gain.setTargetAtTime(0, t, 0.05);
  o.connect(og).connect(out);
  o.start(t); o.stop(t + 0.4);
}

// wet pluck of a cell dividing
export function cellPluck(ctx, sh, out, t, midi, vel = 0.5, pan = 0) {
  const f = mtof(midi);
  const o = ctx.createOscillator();
  o.frequency.setValueAtTime(f * 0.7, t);
  o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vel * 0.25, t + 0.005);
  g.gain.setTargetAtTime(0, t + 0.005, 0.25);
  const pn = panner(ctx, pan);
  o.connect(g).connect(pn).connect(out);
  o.start(t); o.stop(t + 2);
  // bubble
  const b = ctx.createOscillator();
  b.frequency.setValueAtTime(f * 1.5, t + 0.02);
  b.frequency.exponentialRampToValueAtTime(f * 3, t + 0.09);
  const bg = ctx.createGain();
  bg.gain.setValueAtTime(0, t + 0.02);
  bg.gain.linearRampToValueAtTime(vel * 0.06, t + 0.03);
  bg.gain.setTargetAtTime(0, t + 0.05, 0.03);
  b.connect(bg).connect(pn);
  b.start(t + 0.02); b.stop(t + 0.4);
}

export function whoosh(ctx, sh, out, t, dur, vel = 0.4, f0 = 200, f1 = 3000, pan = 0) {
  const n = noiseSrc(ctx, sh, t, dur + 1, sh.pink);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 1.3;
  bp.frequency.setValueAtTime(f0, t);
  bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vel * 0.5, t + dur * 0.85);
  g.gain.setTargetAtTime(0, t + dur, 0.25);
  n.connect(bp).connect(g).connect(panner(ctx, pan)).connect(out);
}

export function splash(ctx, sh, out, t, vel = 0.4, pan = 0, pitch = 400) {
  const n = noiseSrc(ctx, sh, t, 0.5);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(pitch * 6, t);
  lp.frequency.setTargetAtTime(pitch, t, 0.05);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vel * 0.35, t + 0.008);
  g.gain.setTargetAtTime(0, t + 0.01, 0.07);
  const pn = panner(ctx, pan);
  n.connect(lp).connect(g).connect(pn).connect(out);
  const o = ctx.createOscillator();
  o.frequency.setValueAtTime(pitch * 0.5, t);
  o.frequency.exponentialRampToValueAtTime(pitch * 0.25, t + 0.12);
  const og = ctx.createGain();
  og.gain.setValueAtTime(vel * 0.15, t);
  og.gain.setTargetAtTime(0, t, 0.05);
  o.connect(og).connect(pn);
  o.start(t); o.stop(t + 0.5);
}

// granular glass: many tiny pings (fragments, flakes)
export function grains(ctx, sh, out, t, dur, density, vel, notes, pan = 0, spread = 0.8) {
  const r = sh.rnd;
  const n = Math.round(dur * density);
  for (let k = 0; k < n; k++) {
    const tt = t + r.next() * dur;
    const m = notes[Math.floor(r.next() * notes.length)] + 12 * Math.floor(r.next() * 2);
    const o = ctx.createOscillator();
    o.frequency.value = mtof(m);
    const g = ctx.createGain();
    const v = vel * (0.4 + 0.6 * r.next());
    g.gain.setValueAtTime(0, tt);
    g.gain.linearRampToValueAtTime(v * 0.08, tt + 0.002);
    g.gain.setTargetAtTime(0, tt + 0.002, 0.03 + r.next() * 0.12);
    o.connect(g).connect(panner(ctx, pan + (r.next() - 0.5) * spread)).connect(out);
    o.start(tt); o.stop(tt + 0.8);
  }
}

// drip plink
export function drip(ctx, sh, out, t, vel = 0.3, pan = 0) {
  const o = ctx.createOscillator();
  o.frequency.setValueAtTime(1400, t);
  o.frequency.exponentialRampToValueAtTime(600, t + 0.06);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vel * 0.1, t + 0.003);
  g.gain.setTargetAtTime(0, t + 0.003, 0.04);
  o.connect(g).connect(panner(ctx, pan)).connect(out);
  o.start(t); o.stop(t + 0.4);
}

// procedural stereo impulse response: pre-delay, a cluster of early
// reflections, then a dense tail whose high frequencies die first
export function makeIR(ctx, seconds = 4, seed = 7) {
  const sr = ctx.sampleRate;
  const len = Math.round(sr * seconds);
  const ir = ctx.createBuffer(2, len, sr);
  const r = rng(seed);
  const pre = Math.round(0.014 * sr);
  const taps = Array.from({ length: 14 }, () => [0.004 + r.next() * 0.075, (0.5 + r.next() * 0.5) * 0.7]);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    // tail: three bands of noise with their own decay, summed
    let l1 = 0, l2 = 0;
    for (let i = pre; i < len; i++) {
      const tt = (i - pre) / sr;
      const w = r.next() * 2 - 1;
      l1 += (w - l1) * 0.08;             // low band
      l2 += (w - l2) * 0.35;             // low-mid band
      const hi = w - l2, mid = l2 - l1, lo = l1;
      const env = (a) => Math.exp(-tt * 6.9 / a);
      const build = Math.min(1, tt / 0.06);
      d[i] = (lo * 1.6 * env(seconds) + mid * 1.1 * env(seconds * 0.8) + hi * 0.55 * env(seconds * 0.42)) * build;
    }
    for (const [dt, a] of taps) {
      const i = pre + Math.round((dt + (ch ? 0.0007 : 0)) * sr);
      if (i < len) d[i] += a * (ch ? (r.next() < 0.5 ? -1 : 1) : 1) * (1 - dt * 8);
    }
  }
  return ir;
}
