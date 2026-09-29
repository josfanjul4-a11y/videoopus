// Renders the whole score offline (OfflineAudioContext) before the film
// starts, masters it in JS, and plays it back as one buffer. The playback
// position is the film's clock, so picture and sound cannot drift apart.
//
// The render has four channels: music L/R and SFX L/R. They are summed for
// playback; the stems are kept for the audio checks (is every cue audible at
// its timestamp, not masked by the music?).

import { makeShared, makeIR } from './synth.js';
import { master } from './master.js';

export async function renderScore(score, { duration, sr = 48000, onProgress = null, withStems = false } = {}) {
  const len = Math.ceil(duration * sr);
  const ctx = new OfflineAudioContext(4, len, sr);
  const sh = makeShared(ctx);
  const musicDry = ctx.createGain(), musicRev = ctx.createGain(), sfxDry = ctx.createGain(), sfxRev = ctx.createGain();
  const conv1 = ctx.createConvolver();
  conv1.normalize = true;
  conv1.buffer = makeIR(ctx, 4.2, 7);
  const conv2 = ctx.createConvolver();
  conv2.normalize = true;
  conv2.buffer = makeIR(ctx, 2.6, 9);
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
  const events = score.events.slice().sort((a, b) => a.t - b.t);
  let k = 0;
  const schedule = (until) => {
    while (k < events.length && events[k].t < until) {
      events[k].fn(ctx, sh, B);
      k++;
    }
  };
  const CH = 2.0, AHEAD = 0.6;
  schedule(CH + AHEAD);
  for (let t = CH; t < duration; t += CH) {
    const tt = t;
    ctx.suspend(tt).then(() => {
      schedule(tt + CH + AHEAD);
      if (onProgress) onProgress(tt / duration);
      ctx.resume();
    });
  }
  const buf = await ctx.startRendering();
  const m = [buf.getChannelData(0), buf.getChannelData(1)];
  const x = [buf.getChannelData(2), buf.getChannelData(3)];
  const L = new Float32Array(len), R = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    L[i] = m[0][i] + x[0][i];
    R[i] = m[1][i] + x[1][i];
  }
  const stems = withStems ? { music: [Float32Array.from(m[0]), Float32Array.from(m[1])], sfx: [Float32Array.from(x[0]), Float32Array.from(x[1])] } : null;
  const report = master([L, R], sr, { target: score.target ?? -14, ceilingDb: -1.2, fadeOutEnd: score.fadeOutEnd ?? duration, fadeOut: score.fadeOut ?? 1.5 });
  if (stems) {
    for (const st of [stems.music, stems.sfx]) for (const c of st) for (let i = 0; i < c.length; i++) c[i] *= report.gain;
  }
  return { L, R, sr, report, stems };
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
