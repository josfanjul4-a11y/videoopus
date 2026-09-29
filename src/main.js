// Entry point: start screen, playback loop, debug switches.
//   ?t=SECONDS  start at that time
//   ?freeze     render a single still at t (no audio, no loop)
//   ?debug      overlay: time, movement, fps, resolution scale
//   ?bench      play the film silently and report frame times per movement
//   ?w=&h=      force the canvas size (tools)
//   ?spike=NAME render a technique spike instead of the film (development)
//   ?solo=tags  draw only items with these tags (development)

import { createEngine } from './engine.js';
import { spikes } from './spikes.js';
import { buildFilm } from './film/film.js';
import { renderScore, createPlayer } from './audio/engine.js';
import { testScore } from './audio/testscore.js';
import { filmScore } from './audio/score.js';
import { DURATION, MOVEMENTS, movementAt } from './film/cues.js';
import { LineBatch } from './lines.js';
import { strokeText } from './film/glyphs.js';
import { identity } from './math.js';

const params = new URLSearchParams(location.search);
// artifact viewers only pass a bare #anchor, so #debug and #bench work too
const hash = (location.hash || '').replace('#', '');
if (hash === 'debug' || hash === 'bench') params.set(hash, '');
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
window.__renderAudio = async (name = 'film') => {
  const score = name === 'test' ? testScore() : filmScore();
  const t0 = performance.now();
  const res = await renderScore(score, { duration: score.duration, withStems: true });
  const ms = performance.now() - t0;
  window.__audio = { L: res.L, R: res.R, mL: res.stems.music[0], mR: res.stems.music[1], xL: res.stems.sfx[0], xR: res.stems.sfx[1] };
  const r = res.report;
  return { sr: res.sr, length: res.L.length, renderMs: ms, timing: r.timing, before: r.before, gain: r.gain, integrated: r.integrated, truePeak: r.truePeak };
};
window.__audioChunk = (key, start, len) => {
  const a = window.__audio[key].subarray(start, start + len);
  const u8 = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
};

// A small scene for the start screen: the title and a circle that fills as
// the score renders, then a quiet "click" prompt.
function startScene(engine, getProgress) {
  const gl = engine.gl;
  const ID = identity();
  const title = new LineBatch();
  strokeText(title, 'HELD', [0, 0.12, 0], 0.2, { width: 1.4, spacing: 0.62 });
  title.build(gl);
  const ring = new LineBatch();
  ring.circle([0, -0.3, 0], 0.07, { width: 1.1, intensity: 0.9, segments: 96 });
  ring.build(gl);
  const prompt = new LineBatch();
  strokeText(prompt, 'CLICK', [0, -0.52, 0], 0.045, { width: 1.0, spacing: 0.5, intensity: 0.7 });
  prompt.build(gl);
  const t0 = performance.now();
  return {
    shot: () => ({
      cam: { pos: [0, 0, 3], target: [0, 0, 0], fov: 30, aperture: 0 },
      light: { keyDir: [0, 0, 1], keyCol: [1, 1, 1], amb: [0.1, 0.1, 0.1], rim: [0, 0, 0], glowWorld: [0, 0, 0], glowRadius: 1, glowCol: [0, 0, 0] },
      grade: { exposure: 1, bloomGain: 0.3, fade: Math.min(1, (performance.now() - t0) / 1200) },
    }),
    items: () => {
      const p = getProgress();
      const out = [
        { kind: 'line', draw: (f, R) => R.lines.draw(title, { model: ID, reveal: Math.min(1, (performance.now() - t0) / 2200), revealHead: 1.2 }) },
        { kind: 'line', draw: (f, R) => R.lines.draw(ring, { model: ID, reveal: p, revealHead: 1, alpha: 0.8 }) },
      ];
      if (p >= 1) out.push({ kind: 'line', draw: (f, R) => R.lines.draw(prompt, { model: ID, alpha: 0.5 + 0.2 * Math.sin(performance.now() / 700) }) });
      return out;
    },
  };
}

// Debug overlay text in front of the camera (drawn with the stroke font).
function debugOverlay(engine) {
  const gl = engine.gl;
  let batch = null, last = '';
  return (scene, info) => {
    const txt = info;
    if (txt !== last) {
      batch = new LineBatch();
      strokeText(batch, txt, [0, 0, 0], 1, { width: 1.1, spacing: 0.3, align: 'left' });
      batch.build(gl);
      last = txt;
    }
    return {
      shot: scene.shot,
      items: (t, frame, R) => {
        const items = scene.items(t, frame, R);
        const v = frame.view;
        // camera-to-world: text sits 1 unit ahead of the camera, top-left
        const h = Math.tan(((frame.fov ?? 34) * Math.PI) / 360);
        const aspect = frame.res[0] / frame.res[1];
        const s = h * 0.05;
        const inv = new Float32Array([
          v[0] * s, v[4] * s, v[8] * s, 0,
          v[1] * s, v[5] * s, v[9] * s, 0,
          v[2] * s, v[6] * s, v[10] * s, 0,
          0, 0, 0, 1,
        ]);
        const cam = frame.camPos;
        const right = [v[0], v[4], v[8]], up = [v[1], v[5], v[9]], back = [v[2], v[6], v[10]];
        const o = [0, 1, 2].map((i) => cam[i] - back[i] * 1 + right[i] * (-h * aspect * 0.95) + up[i] * (h * 0.9));
        inv[12] = o[0];
        inv[13] = o[1];
        inv[14] = o[2];
        items.push({ kind: 'line', draw: (f, R) => R.lines.draw(batch, { model: inv, occlude: 0 }) });
        return items;
      },
    };
  };
}

async function boot() {
  if (params.has('audio')) {
    window.__ready = true;
    return;
  }
  const canvas = document.getElementById('c');
  sizeCanvas(canvas);
  const engine = createEngine(canvas);
  const film = OPT.spike ? spikes[OPT.spike](engine) : buildFilm(engine);
  const shotFov = (scene) => ({
    shot: scene.shot,
    items: (t, frame, R) => {
      frame.fov = scene.shot(t).cam.fov;
      return scene.items(t, frame, R);
    },
  });
  window.__renderAt = (t, scale = OPT.scale) => {
    engine.render(film, t, scale);
    return canvas.toDataURL('image/png');
  };
  window.__ready = true;
  if (OPT.freeze) {
    engine.render(film, OPT.t, OPT.scale);
    return;
  }
  const overlay = OPT.debug ? debugOverlay(engine) : null;

  // dynamic resolution: react to missed frames, recover slowly
  let scale = OPT.scale, ema = 16.7, lastAdj = 0, lastT = performance.now(), frames = 0, fpsT = performance.now(), fps = 60;
  const adapt = (now) => {
    const dt = now - lastT;
    lastT = now;
    ema = ema * 0.9 + Math.min(dt, 50) * 0.1;
    frames++;
    if (now - fpsT > 500) {
      fps = (frames * 1000) / (now - fpsT);
      frames = 0;
      fpsT = now;
    }
    if (now - lastAdj > 600) {
      if (ema > 18.5 && scale > 0.6) { scale = Math.max(0.6, scale - 0.07); lastAdj = now; }
      else if (ema < 16.9 && scale < 1) { scale = Math.min(1, scale + 0.03); lastAdj = now; }
    }
  };

  if (OPT.bench) return bench(engine, film, adapt);

  // start screen while the score renders
  let progress = 0, rendered = null;
  const renderStart = performance.now();
  const audioJob = renderScore(filmScore(), { duration: DURATION, onProgress: (p) => (progress = Math.min(0.99, p)) }).then((r) => {
    rendered = r;
    progress = 1;
    console.log(`score rendered in ${((performance.now() - renderStart) / 1000).toFixed(1)} s, ${r.report.integrated.toFixed(2)} LUFS, true peak ${(20 * Math.log10(r.report.truePeak)).toFixed(2)} dBTP`);
  });
  const start = startScene(engine, () => progress);
  let player = null, playing = false;
  window.__state = () => ({ progress, playing, t: player ? player.time() : 0, scale, fps, audio: player ? player.ctx.state : 'none' });
  const loop = (now) => {
    adapt(now);
    if (!playing) {
      engine.render(start, 0, 1);
    } else {
      const t = player.time();
      if (t > DURATION + 0.5) {
        playing = false;
        document.body.classList.remove('playing');
      } else {
        const scene = overlay ? overlay(shotFov(film), `T ${t.toFixed(2)}  ${movementAt(t)}  FPS ${fps.toFixed(0)}  S ${scale.toFixed(2)}`) : film;
        engine.render(scene, t, scale);
      }
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  const go = async () => {
    if (playing || progress < 1) return;
    await audioJob;
    if (!player) player = createPlayer(rendered);
    if (player.ctx.state === 'suspended') await player.ctx.resume();
    player.start(OPT.t);
    playing = true;
    document.body.classList.add('playing');
    // fullscreen is optional: some viewers refuse it
    try {
      const fs = document.documentElement.requestFullscreen?.();
      if (fs && fs.catch) fs.catch(() => {});
    } catch (e) {
      /* stay windowed */
    }
  };
  canvas.addEventListener('click', go);
  window.addEventListener('resize', () => sizeCanvas(canvas));
  window.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') go(); });
}

// ?bench: play the whole film silently at real time and report frame-time
// percentiles per movement (CPU frame interval, and GPU time where the
// timer-query extension is available).
function bench(engine, film, adapt) {
  const gl = engine.gl, ext = engine.ext.timer;
  const stats = MOVEMENTS.map((m) => ({ name: m[0], dt: [], gpu: [] }));
  const queries = [];
  const t0 = performance.now() + 500;
  let prev = performance.now();
  const loop = (now) => {
    const t = (now - t0) / 1000;
    const dt = now - prev;
    prev = now;
    if (t >= 0 && t <= DURATION) {
      const mi = MOVEMENTS.findIndex((m) => t < m[2]);
      let q = null;
      if (ext) {
        q = gl.createQuery();
        gl.beginQuery(ext.TIME_ELAPSED_EXT, q);
      }
      engine.render(film, t, OPT.scale);
      if (q) {
        gl.endQuery(ext.TIME_ELAPSED_EXT);
        queries.push({ q, mi });
      }
      stats[mi].dt.push(dt);
    }
    for (let i = queries.length - 1; i >= 0; i--) {
      const { q, mi } = queries[i];
      if (gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE) && !gl.getParameter(ext.GPU_DISJOINT_EXT)) {
        stats[mi].gpu.push(gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6);
        gl.deleteQuery(q);
        queries.splice(i, 1);
      }
    }
    if (t > DURATION + 1) {
      const pct = (a, p) => (a.length ? a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))] : NaN);
      const res = stats.map((s) => ({ movement: s.name, frames: s.dt.length, p50: +pct(s.dt, 0.5).toFixed(2), p95: +pct(s.dt, 0.95).toFixed(2), p99: +pct(s.dt, 0.99).toFixed(2), gpuP50: +pct(s.gpu, 0.5).toFixed(2), gpuP95: +pct(s.gpu, 0.95).toFixed(2) }));
      window.__bench = res;
      console.table(res);
      document.title = 'HELD bench done';
      // show the result on screen with the stroke font
      const lines = res.map((x) => `${x.movement.split(' ')[0]} P50 ${x.p50} P95 ${x.p95} GPU ${isNaN(x.gpuP50) ? '-' : x.gpuP50}`);
      const ID = identity();
      const batch = new LineBatch();
      lines.forEach((l, i) => strokeText(batch, l, [-1.1, 0.5 - i * 0.2, 0], 0.08, { width: 1.2, spacing: 0.3, align: 'left' }));
      batch.build(gl);
      const show = {
        shot: () => ({ cam: { pos: [0, 0, 3], target: [0, 0, 0], fov: 40, aperture: 0 }, light: { keyDir: [0, 0, 1], keyCol: [1, 1, 1], amb: [0.1, 0.1, 0.1], rim: [0, 0, 0], glowWorld: [0, 0, 0], glowRadius: 1, glowCol: [0, 0, 0] }, grade: { fade: 1 } }),
        items: () => [{ kind: 'line', draw: (f, R) => R.lines.draw(batch, { model: ID }) }],
      };
      const hold = () => { engine.render(show, 0, 1); requestAnimationFrame(hold); };
      requestAnimationFrame(hold);
      return;
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

boot().catch((e) => {
  console.error(e);
  window.__error = String(e && e.stack ? e.stack : e);
});
