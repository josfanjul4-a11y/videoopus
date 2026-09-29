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
  return {
    noise,
    pink,
    rnd: r,
    pianoWave: wave(norm(pianoAmps)),
    stringWave: wave(norm(Array.from({ length: 24 }, (_, i) => 1 / (i + 1)))),
    celloWave: wave(norm(Array.from({ length: 20 }, (_, i) => (1 / (i + 1)) * (i % 2 === 0 ? 1 : 0.55)))),
    choirWave: wave(norm([1, 0.28, 0.12, 0.05, 0.02])),
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
// vel 0..1, dur = how long the key is held
export function piano(ctx, sh, out, t, midi, vel = 0.6, dur = 1.5, pan = 0) {
  const f = mtof(midi);
  const decay = Math.max(1.2, 9 - (midi - 36) * 0.09);
  const end = t + Math.min(dur, decay) + 0.05;
  const stopAt = end + 1.6;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.Q.value = 0.4;
  const bright = 900 + vel * 3800 + f * 1.5;
  lp.frequency.setValueAtTime(bright, t);
  lp.frequency.setTargetAtTime(500 + f * 1.2, t + 0.01, 0.35 + (1 - vel) * 0.2);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vel * 0.42, t + 0.004);
  g.gain.setTargetAtTime(vel * 0.2, t + 0.004, 0.25);
  g.gain.setTargetAtTime(0.0001, t + 0.5, decay * 0.35);
  g.gain.setTargetAtTime(0, end, 0.18);
  const pn = panner(ctx, pan);
  lp.connect(g).connect(pn).connect(out);
  const det = [-2.2, 0.4, 2.6];
  det.forEach((c) => {
    const o = ctx.createOscillator();
    o.setPeriodicWave(sh.pianoWave);
    o.frequency.value = f;
    o.detune.value = c + (midi - 60) * 0.18; // a hint of stretch tuning
    o.connect(lp);
    o.start(t);
    o.stop(stopAt);
  });
  // felt thump
  const n = noiseSrc(ctx, sh, t, 0.06);
  const nf = ctx.createBiquadFilter();
  nf.type = 'lowpass';
  nf.frequency.value = 900 + vel * 900;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(vel * 0.05, t);
  ng.gain.setTargetAtTime(0, t + 0.003, 0.012);
  n.connect(nf).connect(ng).connect(pn);
}

// ------------------------------------------------------------------ celesta / music box
export function celesta(ctx, sh, out, t, midi, vel = 0.5, pan = 0) {
  const f = mtof(midi);
  const pn = panner(ctx, pan);
  pn.connect(out);
  const parts = [[1, 1, 2.2], [2, 0.12, 0.7], [4.02, 0.22, 0.25], [9.8, 0.05, 0.06]];
  parts.forEach(([ratio, amp, dec]) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f * ratio;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel * amp * 0.3, t + 0.002);
    g.gain.setTargetAtTime(0, t + 0.002, dec);
    o.connect(g).connect(pn);
    o.start(t);
    o.stop(t + dec * 6 + 0.1);
  });
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
export function strings(ctx, sh, out, t, midi, vel = 0.4, dur = 3, pan = 0, attack = 0.6, release = 1.4) {
  const f = mtof(midi);
  const pn = panner(ctx, pan);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1200 + vel * 2600;
  lp.Q.value = 0.5;
  const body = ctx.createBiquadFilter();
  body.type = 'peaking';
  body.frequency.value = 420;
  body.gain.value = 3;
  const g = ctx.createGain();
  env(g, t, attack, vel * 0.16, 1.2, 0.85, release * 0.4, t + dur);
  lp.connect(body).connect(g).connect(pn).connect(out);
  const stopAt = t + dur + release * 2.5;
  for (let k = 0; k < 5; k++) {
    const o = ctx.createOscillator();
    o.setPeriodicWave(sh.stringWave);
    o.frequency.value = f;
    o.detune.value = (k - 2) * 7 + (sh.rnd.next() - 0.5) * 4;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 4.6 + sh.rnd.next() * 1.2;
    const lg = ctx.createGain();
    lg.gain.value = 5 + sh.rnd.next() * 3;
    lfo.connect(lg).connect(o.detune);
    o.connect(lp);
    o.start(t);
    lfo.start(t);
    o.stop(stopAt);
    lfo.stop(stopAt);
  }
}

// ------------------------------------------------------------------ cello (the partner)
export function cello(ctx, sh, out, t, midi, vel = 0.5, dur = 1.5, pan = 0) {
  const f = mtof(midi);
  const o = ctx.createOscillator();
  o.setPeriodicWave(sh.celloWave);
  o.frequency.value = f;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 5.2;
  const lg = ctx.createGain();
  lg.gain.setValueAtTime(0, t);
  lg.gain.linearRampToValueAtTime(0, t + 0.25);
  lg.gain.linearRampToValueAtTime(14, t + 0.7);
  lfo.connect(lg).connect(o.detune);
  const f1 = ctx.createBiquadFilter();
  f1.type = 'peaking'; f1.frequency.value = 260; f1.gain.value = 6; f1.Q.value = 1.2;
  const f2 = ctx.createBiquadFilter();
  f2.type = 'peaking'; f2.frequency.value = 620; f2.gain.value = 4; f2.Q.value = 1.4;
  const f3 = ctx.createBiquadFilter();
  f3.type = 'peaking'; f3.frequency.value = 1250; f3.gain.value = 3; f3.Q.value = 1.6;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 2600 + vel * 1500;
  const g = ctx.createGain();
  env(g, t, 0.18, vel * 0.2, 0.6, 0.8, 0.25, t + dur);
  const pn = panner(ctx, pan);
  o.connect(f1).connect(f2).connect(f3).connect(lp).connect(g).connect(pn).connect(out);
  const stopAt = t + dur + 1.5;
  o.start(t); lfo.start(t); o.stop(stopAt); lfo.stop(stopAt);
  // bow noise
  const n = noiseSrc(ctx, sh, t, dur + 0.5);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = f * 3; bp.Q.value = 2;
  const ng = ctx.createGain();
  env(ng, t, 0.1, vel * 0.012, 0.4, 0.6, 0.2, t + dur);
  n.connect(bp).connect(ng).connect(pn);
}

// ------------------------------------------------------------------ glass choir (the AI's voice)
export function choir(ctx, sh, out, t, midi, vel = 0.4, dur = 3, pan = 0, vowel = 0) {
  const f = mtof(midi);
  const pn = panner(ctx, pan);
  const g = ctx.createGain();
  env(g, t, 0.9, vel * 0.18, 1.5, 0.9, 0.9, t + dur);
  // vowel formants: "oo" (vowel 0) to "ah" (vowel 1)
  const F1 = 330 + vowel * 400, F2 = 850 + vowel * 400;
  const b1 = ctx.createBiquadFilter();
  b1.type = 'bandpass'; b1.frequency.value = F1; b1.Q.value = 3;
  const b2 = ctx.createBiquadFilter();
  b2.type = 'bandpass'; b2.frequency.value = F2; b2.Q.value = 4;
  const dry = ctx.createGain();
  dry.gain.value = 0.35;
  const mix = ctx.createGain();
  mix.gain.value = 1.4;
  b1.connect(mix); b2.connect(mix); dry.connect(mix);
  mix.connect(g).connect(pn).connect(out);
  const stopAt = t + dur + 3;
  for (let k = 0; k < 3; k++) {
    const o = ctx.createOscillator();
    o.setPeriodicWave(sh.choirWave);
    o.frequency.value = f;
    o.detune.value = (k - 1) * 6;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 4.2 + k * 0.37;
    const lg = ctx.createGain();
    lg.gain.value = 9;
    lfo.connect(lg).connect(o.detune);
    o.connect(b1); o.connect(b2); o.connect(dry);
    o.start(t); lfo.start(t); o.stop(stopAt); lfo.stop(stopAt);
  }
  // glass layer: pure sines beating slowly an octave up
  [0, 1.5].forEach((dc) => {
    const o = ctx.createOscillator();
    o.frequency.value = f * 2;
    o.detune.value = dc;
    const gg = ctx.createGain();
    env(gg, t, 1.2, vel * 0.03, 2, 0.9, 1.2, t + dur);
    o.connect(gg).connect(pn);
    o.start(t); o.stop(stopAt);
  });
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

// procedural stereo impulse response: decaying noise that darkens with time
export function makeIR(ctx, seconds = 4, seed = 7) {
  const sr = ctx.sampleRate;
  const len = Math.round(sr * seconds);
  const ir = ctx.createBuffer(2, len, sr);
  const r = rng(seed);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const tt = i / sr;
      const decay = Math.exp(-tt * (6.9 / seconds));
      // damping: a one-pole lowpass closing over time
      const a = Math.min(0.97, 0.15 + tt * 0.35);
      lp = lp * a + (r.next() * 2 - 1) * (1 - a);
      const early = tt < 0.08 ? (r.next() < 0.004 ? (r.next() * 2 - 1) * 3 : 0) : 0;
      d[i] = (lp * 2.2 + early) * decay * (tt < 0.02 ? tt / 0.02 : 1);
    }
  }
  return ir;
}
