// Entry point: start screen, playback loop, debug switches.
//   ?t=SECONDS  start at that time
//   ?freeze     render a single still at t (no audio, no loop)
//   ?debug      overlay: time, movement, fps, resolution scale
//   ?bench      run the film silently and report frame times per movement
//   ?w=&h=      force the canvas size (tools)
//   ?spike=NAME render a technique spike instead of the film (development)

import { createEngine } from './engine.js';
import { spikes } from './spikes.js';
import { renderScore } from './audio/engine.js';
import { testScore } from './audio/testscore.js';

const params = new URLSearchParams(location.search);
const OPT = {
  t: parseFloat(params.get('t') ?? '0') || 0,
  freeze: params.has('freeze'),
  debug: params.has('debug'),
  bench: params.has('bench'),
  w: parseInt(params.get('w') ?? '0', 10),
  h: parseInt(params.get('h') ?? '0', 10),
  spike: params.get('spike'),
  scale: parseFloat(params.get('scale') ?? '1') || 1,
};

function sizeCanvas(canvas) {
  let w, h;
  if (OPT.w && OPT.h) {
    w = OPT.w;
    h = OPT.h;
  } else {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const vw = window.innerWidth, vh = window.innerHeight;
    const cw = Math.min(vw, (vh * 16) / 9), ch = (cw * 9) / 16;
    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';
    w = Math.min(1920, Math.round(cw * dpr));
    h = Math.round((w * 9) / 16);
  }
  canvas.width = w;
  canvas.height = h;
}

// Offline audio render for the tools: window.__renderAudio(name) then fetch
// channels with window.__audioChunk(key, start, length) as base64 Float32.
window.__renderAudio = async (name = 'test') => {
  const score = name === 'test' ? testScore() : null;
  const t0 = performance.now();
  const res = await renderScore(score, { duration: score.duration, withStems: true });
  const ms = performance.now() - t0;
  window.__audio = { L: res.L, R: res.R, mL: res.stems.music[0], mR: res.stems.music[1], xL: res.stems.sfx[0], xR: res.stems.sfx[1] };
  const r = res.report;
  return { sr: res.sr, length: res.L.length, renderMs: ms, before: r.before, gain: r.gain, integrated: r.integrated, truePeak: r.truePeak };
};
window.__audioChunk = (key, start, len) => {
  const a = window.__audio[key].subarray(start, start + len);
  const u8 = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
};

async function boot() {
  if (params.has('audio')) {
    window.__ready = true;
    return;
  }
  const canvas = document.getElementById('c');
  sizeCanvas(canvas);
  const engine = createEngine(canvas);
  const scene = OPT.spike ? spikes[OPT.spike](engine) : null;
  if (!scene) throw new Error('film not built yet');
  window.__renderAt = (t, scale = OPT.scale) => {
    engine.render(scene, t, scale);
    return canvas.toDataURL('image/png');
  };
  window.__ready = true;
  if (OPT.freeze) {
    engine.render(scene, OPT.t, OPT.scale);
    return;
  }
  const t0 = performance.now();
  const loop = () => {
    const t = OPT.t + (performance.now() - t0) / 1000;
    engine.render(scene, t, OPT.scale);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

boot().catch((e) => {
  console.error(e);
  window.__error = String(e && e.stack ? e.stack : e);
});
