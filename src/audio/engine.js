// Renders the whole score offline (OfflineAudioContext) before the film
// starts, masters it in JS, and plays it back as one buffer. The playback
// position is the film's clock, so picture and sound cannot drift apart.
//
// The render has four channels: music L/R and SFX L/R. They are summed for
// playback; the stems are kept for the audio checks (is every cue audible at
// its timestamp, not masked by the music?).

import { makeShared, makeIR } from './synth.js';
import { master } from './master.js';
import { rng } from '../rng.js';

function makeGraph(ctx) {
  const sh = makeShared(ctx);
  const musicDry = ctx.createGain(), musicRev = ctx.createGain(), sfxDry = ctx.createGain(), sfxRev = ctx.createGain();
  const conv1 = ctx.createConvolver();
  conv1.normalize = true;
  conv1.buffer = makeIR(ctx, 3.4, 7);
  const conv2 = ctx.createConvolver();
  conv2.normalize = true;
  conv2.buffer = makeIR(ctx, 1.8, 9);
  const musicSum = ctx.createGain(), sfxSum = ctx.createGain();
  musicDry.connect(musicSum);
  musicRev.connect(conv1).connect(musicSum);
  sfxDry.connect(sfxSum);
  sfxRev.connect(conv2).connect(sfxSum);
  const merger = ctx.createChannelMerger(4);
  const s1 = ctx.createChannelSplitter(2), s2 = ctx.createChannelSplitter(2);
  musicSum.connect(s1);
  sfxSum.connect(s2);
  s1.connect(merger, 0, 0);
  s1.connect(merger, 1, 1);
  s2.connect(merger, 0, 2);
  s2.connect(merger, 1, 3);
  merger.connect(ctx.destination);
  const bus = (dry, rev, dryGain, sendGain) => {
    const g = ctx.createGain();
    const d = ctx.createGain();
    d.gain.value = dryGain;
    const s = ctx.createGain();
    s.gain.value = sendGain;
    g.connect(d).connect(dry);
    g.connect(s).connect(rev);
    return g;
  };
  const B = {
    piano: bus(musicDry, musicRev, 0.85, 0.32),
    celesta: bus(musicDry, musicRev, 0.7, 0.5),
    strings: bus(musicDry, musicRev, 0.75, 0.45),
    cello: bus(musicDry, musicRev, 0.8, 0.35),
    choir: bus(musicDry, musicRev, 0.55, 0.7),
    bells: bus(musicDry, musicRev, 0.6, 0.6),
    low: bus(musicDry, musicRev, 0.9, 0.2),
    heart: bus(sfxDry, sfxRev, 0.95, 0.12),
    sfx: bus(sfxDry, sfxRev, 0.7, 0.45),
    air: bus(sfxDry, sfxRev, 0.6, 0.5),
  };
  return { sh, B };
}

// Render the events of one time window [t0, t1) into a context starting at
// `origin` (the pre-roll lets earlier notes ring into the window).
async function renderWindow(events, origin, t1, sr, progress) {
  const len = Math.ceil((t1 - origin) * sr);
  const ctx = new OfflineAudioContext(4, len, sr);
  const { sh, B } = makeGraph(ctx);
  for (const e of events) {
    sh.rnd = rng(7919 * (e.id + 1));
    e.fn(ctx, sh, B, origin);
  }
  if (progress) for (let t = 2; t < t1 - origin; t += 2) ctx.suspend(t).then(() => { progress(t / (t1 - origin)); ctx.resume(); });
  return ctx.startRendering();
}

// Events carry absolute film times. A window's context starts at `origin`, so
// each event runs against a proxy of the context whose nodes shift every
// scheduled time by -origin (see timeShift below). Windows render in
// parallel; each event gets its own seeded RNG, so a note rendered in two
// overlapping windows is bit-identical in both.

export async function renderScore(score, { duration, sr = 48000, onProgress = null, withStems = false, chunks = null } = {}) {
  const len = Math.ceil(duration * sr);
  const events = score.events.map((e, i) => ({ ...e, id: i })).sort((a, b) => a.t - b.t);
  const K = chunks ?? Math.max(2, Math.min(8, (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 4));
  const PRE = 10;
  const jobs = [];
  const prog = new Float32Array(K + 1);
  const report = () => onProgress && onProgress(prog.reduce((a, b) => a + b, 0) / (K + 1));
  const bounds = Array.from({ length: K + 1 }, (_, k) => (duration * k) / K);
  for (let k = 0; k < K; k++) {
    const a = bounds[k], b = bounds[k + 1];
    const origin = Math.max(0, a - PRE);
    const evs = events.filter((e) => !e.long && e.t >= origin && e.t < b).map((e) => ({ id: e.id, fn: (c, sh, B) => e.fn(timeShift(c, origin), sh, B) }));
    jobs.push(renderWindow(evs, origin, b, sr, (p) => { prog[k] = p; report(); }).then((buf) => ({ buf, a, b, origin })));
  }
  const longEv = events.filter((e) => e.long).map((e) => ({ id: e.id, fn: (c, sh, B) => e.fn(timeShift(c, 0), sh, B) }));
  jobs.push(renderWindow(longEv, 0, duration, sr, (p) => { prog[K] = p; report(); }).then((buf) => ({ buf, a: 0, b: duration, origin: 0, long: true })));
  const tr0 = performance.now();
  const parts = await Promise.all(jobs);
  const tRender = performance.now() - tr0;
  const m = [new Float32Array(len), new Float32Array(len)];
  const x = [new Float32Array(len), new Float32Array(len)];
  for (const p of parts) {
    const from = Math.round((p.a - p.origin) * sr), to = Math.round((p.b - p.origin) * sr), at = Math.round(p.a * sr);
    for (let ch = 0; ch < 4; ch++) {
      const src = p.buf.getChannelData(ch);
      const dst = ch < 2 ? m[ch] : x[ch - 2];
      const n = Math.min(to - from, len - at, src.length - from);
      for (let i = 0; i < n; i++) dst[at + i] += src[from + i];
    }
  }
  // the dynamics curve (smooth, per 10 ms, interpolated)
  if (score.fader) {
    const step = Math.round(sr / 100);
    for (let i0 = 0; i0 < len; i0 += step) {
      const g0 = Math.pow(10, score.fader(i0 / sr) / 20), g1 = Math.pow(10, score.fader((i0 + step) / sr) / 20);
      const n = Math.min(step, len - i0);
      for (let j = 0; j < n; j++) {
        const g = g0 + ((g1 - g0) * j) / step;
        m[0][i0 + j] *= g; m[1][i0 + j] *= g; x[0][i0 + j] *= g; x[1][i0 + j] *= g;
      }
    }
  }
  const L = new Float32Array(len), R = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    L[i] = m[0][i] + x[0][i];
    R[i] = m[1][i] + x[1][i];
  }
  const tm0 = performance.now();
  const rep = master([L, R], sr, { target: score.target ?? -14, ceilingDb: -1.2, fadeOutEnd: score.fadeOutEnd ?? duration, fadeOut: score.fadeOut ?? 1.5 });
  rep.timing = { render: tRender, master: performance.now() - tm0, chunks: K };
  const stems = withStems ? { music: m, sfx: x } : null;
  if (stems) for (const st of [stems.music, stems.sfx]) for (const c of st) for (let i = 0; i < c.length; i++) c[i] *= rep.gain;
  return { L, R, sr, report: rep, stems };
}

// The synth functions schedule at absolute film times. Inside a window whose
// context starts at `origin`, every AudioNode start/stop and AudioParam
// automation time must be shifted by -origin. We wrap the context so that the
// node factories return nodes whose time-taking methods are shifted.
function timeShift(ctx, origin) {
  if (origin === 0) return ctx;
  const shiftParam = (p) => {
    if (!p || p.__shifted) return p;
    for (const k of ['setValueAtTime', 'linearRampToValueAtTime', 'exponentialRampToValueAtTime', 'setTargetAtTime', 'cancelScheduledValues']) {
      const f = p[k].bind(p);
      p[k] = (v, t, ...rest) => (k === 'cancelScheduledValues' ? f(Math.max(0, v - origin)) : f(v, Math.max(0, t - origin), ...rest));
    }
    p.__shifted = true;
    return p;
  };
  const wrapNode = (n) => {
    for (const key of Object.keys(Object.getPrototypeOf(n)).concat(['frequency', 'detune', 'gain', 'Q', 'pan', 'playbackRate', 'offset'])) {
      const v = n[key];
      if (v instanceof AudioParam) shiftParam(v);
    }
    if (typeof n.start === 'function') {
      const st = n.start.bind(n);
      n.start = (t = 0, ...rest) => st(Math.max(0, t - origin), ...rest);
    }
    if (typeof n.stop === 'function') {
      const sp = n.stop.bind(n);
      n.stop = (t = 0) => sp(Math.max(0, t - origin));
    }
    return n;
  };
  return new Proxy(ctx, {
    get(target, prop) {
      const v = target[prop];
      if (typeof v === 'function' && String(prop).startsWith('create')) return (...args) => wrapNode(v.apply(target, args));
      return typeof v === 'function' ? v.bind(target) : v;
    },
  });
}

// Playback of a rendered score on a live AudioContext.
export function createPlayer(rendered) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: rendered.sr, latencyHint: 'playback' });
  const buf = ctx.createBuffer(2, rendered.L.length, rendered.sr);
  buf.copyToChannel(rendered.L, 0);
  buf.copyToChannel(rendered.R, 1);
  let src = null, t0 = 0, offset = 0;
  return {
    ctx,
    start(at = 0) {
      src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      offset = at;
      t0 = ctx.currentTime + 0.05;
      src.start(t0, at);
    },
    // film time from the audio clock
    time() {
      return offset + Math.max(0, ctx.currentTime - t0 - (ctx.outputLatency || 0));
    },
    stop() {
      if (src) src.stop();
    },
  };
}
