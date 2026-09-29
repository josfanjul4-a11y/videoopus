// Entry point: start screen, playback loop, debug switches.
//   ?t=SECONDS  start at that time
//   ?freeze     render a single still at t (no audio, no loop)
//   ?debug      overlay: time, movement, fps, resolution scale
//   ?bench      run the film silently and report frame times per movement
//   ?w=&h=      force the canvas size (tools)
//   ?spike=NAME render a technique spike instead of the film (development)

import { createEngine } from './engine.js';
import { spikes } from './spikes.js';

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

async function boot() {
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
