// Technique spikes (development only). Each returns a scene: { shot(t), items(t, frame, R) }.
import { LineBatch } from './lines.js';
import { DabSet, MAT, ANIM_STATIC } from './dabs.js';
import { BRUSH, brushLayer } from './brushes.js';
import { LIN } from './palette.js';
import { rng } from './rng.js';
import { identity } from './math.js';
import { paintAlongCurve, splashTongues, dripsBelow, spray, starLines, beadThread } from './gen.js';
import { DiscSet, DISC } from './discs.js';
import { ribbonFromCurve } from './silk.js';
import { PAL } from './mosaic.js';

const ID = identity();
const ANIM_WASH = `
void animate(inout Dab d) {
  d.alpha *= uAlpha;
  if (aColor.a * 255.0 > 1.5 && aColor.a * 255.0 < 2.5) d.emissive = 1.6;
}`;

function baseShot(pos, target, fov = 32) {
  return {
    cam: { pos, target, fov, aperture: 0.0, focus: 5 },
    grade: { exposure: 1.0, bloomGain: 0.35, lineGain: 1.0, grain: 0.04, vignette: 0.3, bgAmt: 0.7 },
    light: { keyDir: [-0.55, 0.65, 0.5], keyCol: [1.0, 0.92, 0.8], amb: [0.10, 0.09, 0.10], rim: [0, 0, 0], glowWorld: [0, 0, 0], glowRadius: 1, glowCol: [0, 0, 0] },
  };
}

function linesSpike(engine) {
  const gl = engine.gl;
  const b = new LineBatch();
  // concentric circles of uneven spacing (ref 1 star)
  const r = rng(7);
  let rad = 0.18;
  for (let i = 0; i < 16; i++) {
    b.circle([-1.2, 0, 0], rad, { width: 1.1 + r.next() * 0.4, intensity: 0.5 + r.next() * 0.5 });
    rad += 0.05 + r.next() * 0.16;
  }
  // radial rays
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2 + r.next() * 0.05;
    const r0 = 0.1 + r.next() * 0.2, r1 = 0.5 + r.next() * 1.4;
    b.line([-1.2 + Math.cos(a) * r0, Math.sin(a) * r0, 0], [-1.2 + Math.cos(a) * r1, Math.sin(a) * r1, 0], { width: 0.9, intensity: 0.35 });
  }
  // vertical threads at various depths
  for (let i = 0; i < 9; i++) {
    const x = -2.4 + i * 0.62 + r.next() * 0.2, z = -2 + r.next() * 3;
    const pts = [];
    for (let k = 0; k <= 40; k++) pts.push([x, -3 + k * 0.15, z]);
    b.polyline(pts, { width: 1.0 + r.next() * 0.3, intensity: 0.7 });
  }
  // a dotted arc and a dashed circle
  b.circle([1.4, 0.2, -0.5], 1.1, { dash: [0.012, 0.35, 0], width: 1.6, intensity: 0.9 });
  b.circle([1.4, 0.2, -0.5], 1.35, { start: 2.0, sweep: -2.6, width: 1.0, intensity: 0.8, hi: 0.6 });
  // a grid (ref 2)
  for (let i = 0; i <= 6; i++) {
    b.line([0.6 + i * 0.25, -1.6, 0.4], [0.6 + i * 0.25, -0.1, 0.4], { width: 0.8, intensity: 0.4 });
    b.line([0.6, -1.6 + i * 0.25, 0.4], [2.1, -1.6 + i * 0.25, 0.4], { width: 0.8, intensity: 0.4 });
  }
  b.build(gl);

  // beads on the threads: dot dabs in gold
  const beads = new DabSet();
  const r2 = rng(3);
  for (let i = 0; i < 60; i++) {
    beads.add({ pos: [-2.4 + (i % 9) * 0.62, -2.6 + r2.next() * 5, -2 + r2.next() * 3], size: 0.02 + r2.next() * 0.05, layer: brushLayer(BRUSH.DOT, 0), color: LIN.gold, mat: MAT.GOLD, anim: [0, 0, 0, 0], seed: r2.next() });
  }
  beads.build(gl, [0, 0, -1]);

  return {
    shot: (t) => baseShot([0.3 * Math.sin(t * 0.3), 0.1, 5.2], [0, 0, 0], 38),
    items: (t) => [
      { kind: 'line', draw: (f, R) => R.lines.draw(b, { model: ID, reveal: t < 0 ? 1 : Math.min(1, 0.3 + t * 0.2), revealHead: 1 }) },
      { kind: 'matter', center: beads.center, draw: (f, R) => R.dabs.draw(beads, ANIM_STATIC, f, {}) },
    ],
  };
}

// S2: flow-aligned masses of cellular paint around a wave (ref 1's left half)
function paintSpike(engine) {
  const gl = engine.gl;
  const set = new DabSet();
  const r = rng(11);
  const wave = (x) => Math.sin(x * 1.1) * 0.35 + Math.sin(x * 2.3 + 1) * 0.08;
  const dwave = (x) => Math.cos(x * 1.1) * 0.385 + Math.cos(x * 2.3 + 1) * 0.184;
  // main mass: dabs elongated along the flow, thick in the middle, torn at the edges
  const N = 14000;
  for (let i = 0; i < N; i++) {
    const x = -3.3 + r.next() * 6.6;
    const env = 0.35 + 0.65 * Math.exp(-Math.pow((x - 0.2) / 2.2, 2));
    const up = Math.abs(r.gauss()) * 0.55 * env;
    const down = -Math.abs(r.gauss()) * 0.35 * env;
    const side = r.next() < 0.58 ? up : down;
    const y = wave(x) + side;
    const z = r.gauss() * 0.35 * env;
    // flow direction: along the wave, lifting up in the upper part
    const tx = 1, ty = dwave(x) + side * 0.9 * (0.5 + r.gauss() * 0.4);
    const edge = Math.min(1, Math.abs(side) / (0.6 * env + 0.05));
    const size = (0.07 + 0.16 * Math.pow(r.next(), 1.6)) * (1.0 - 0.6 * edge);
    const kind = r.weighted([3, 3, 2, 2, 1]);
    const layer = [BRUSH.BLOB2, BRUSH.SMEAR, BRUSH.CRACKLE, BRUSH.BLOB, BRUSH.STROKE][kind];
    set.add({
      pos: [x, y, z], size, rot: r.gauss() * 0.25, aspect: 0.35 + r.next() * 0.35,
      layer: brushLayer(layer, r.int(0, 2)), seed: r.next(), color: LIN.gold, mat: r.next() < 0.05 ? MAT.GOLD : MAT.PAINT,
      normal: [r.gauss() * 0.2, side * 2.2 + r.gauss() * 0.2, 0.8 + z * 1.5], tangent: [tx, ty, 0], anim: [0, 0, 0, 0],
    });
  }
  // splash tongues thrown upward and forward, breaking into flakes
  for (let k = 0; k < 26; k++) {
    const x0 = -3 + r.next() * 6.2, y0 = wave(x0) + 0.2;
    const ang = 0.5 + r.next() * 0.9, len = 0.4 + r.next() * 0.9;
    const n = 60 + r.int(0, 80);
    for (let i = 0; i < n; i++) {
      const s = Math.pow(r.next(), 0.8);
      const a = ang + s * 0.8 * (r.next() - 0.3);
      const px = x0 + Math.cos(a) * len * s * 0.8 + s * 0.3, py = y0 + Math.sin(a) * len * s;
      set.add({
        pos: [px, py, r.gauss() * 0.25], size: (0.05 + 0.07 * r.next()) * (1 - s * 0.75), rot: r.gauss() * 0.4, aspect: 0.4 + r.next() * 0.4,
        layer: brushLayer(s > 0.7 ? BRUSH.FLECK : r.pick([BRUSH.BLOB2, BRUSH.CRACKLE, BRUSH.SMEAR]), r.int(0, 2)), seed: r.next(),
        color: LIN.gold, mat: r.next() < 0.1 ? MAT.GOLD : MAT.PAINT, normal: [0, 0.3, 1], tangent: [Math.cos(a), Math.sin(a), 0], anim: [0, 0, 0, 0],
      });
    }
  }
  set.build(gl, [0, 0, -1]);
  // drips: vertical streaks hanging from the underside, broken, varied widths
  const drips = new DabSet();
  for (let i = 0; i < 420; i++) {
    const x = -3.2 + r.next() * 6.4;
    const env = 0.35 + 0.65 * Math.exp(-Math.pow((x - 0.2) / 2.2, 2));
    const top = wave(x) - 0.12 - 0.25 * env * r.next();
    const len = (0.15 + Math.pow(r.next(), 1.8) * 1.6) * env;
    const kind = r.next();
    if (kind < 0.55) {
      drips.add({ pos: [x, top - len * 0.5, r.gauss() * 0.25], size: len * 0.5, aspect: 0.025 + r.next() * 0.06, layer: brushLayer(BRUSH.DRIP, r.int(0, 2)), seed: r.next(), color: LIN.gold, anim: [0, 0, 0, 0], normal: [0, 0, 1] });
    } else if (kind < 0.8) {
      // a column of small rectangles (tags / chips)
      const n = 2 + r.int(0, 5);
      let y = top;
      const wdt = 0.02 + r.next() * 0.035;
      for (let k = 0; k < n; k++) {
        const hgt = wdt * (1.2 + r.next() * 2.5);
        drips.add({ pos: [x, y - hgt, r.gauss() * 0.2], size: hgt, aspect: wdt / hgt, layer: brushLayer(BRUSH.RECT, r.int(0, 2)), seed: r.next(), color: LIN.gold, anim: [0, 0, 0, 0], normal: [0, 0, 1] });
        y -= hgt * 2 + 0.01 + r.next() * 0.05;
      }
    } else {
      drips.add({ pos: [x, top - len * 0.4, r.gauss() * 0.25], size: len * 0.4, aspect: 0.08 + r.next() * 0.1, layer: brushLayer(BRUSH.SLAB, r.int(0, 2)), seed: r.next(), color: LIN.gold, anim: [0, 0, 0, 0], normal: [0, 0, 1] });
    }
  }
  drips.build(gl, [0, 0, -1]);
  // spray: specks concentrated around the mass
  const specks = new DabSet();
  for (let i = 0; i < 2600; i++) {
    const x = -3.5 + r.next() * 7;
    const y = wave(x) + r.gauss() * 0.55 + 0.15;
    specks.add({ pos: [x, y, r.gauss() * 0.6], size: 0.005 + Math.pow(r.next(), 3) * 0.03, layer: brushLayer(r.next() < 0.7 ? BRUSH.DOT : BRUSH.FLECK, r.int(0, 2)), seed: r.next(), color: r.pick([LIN.goldHi, LIN.bone, LIN.gold, LIN.amber]), mat: MAT.GOLD, anim: [0, 0, 0, 0] });
  }
  specks.build(gl, [0, 0, -1]);
  const field = { mosScale: 26, cellMix: 1, field: [1, 0, 0.12, 0.28], fieldN: [1.1, 0.10, 0.16, 0], facet: 0.5, torn: 0.7, jitter: 1 };
  return {
    shot: (t) => {
      const s = baseShot([0, 0.05, 6.2], [0, 0.05, 0], 40);
      s.cam.aperture = 0.003;
      s.cam.focus = 6.2;
      return s;
    },
    items: () => [
      { kind: 'matter', center: [0, -0.8, 0], draw: (f, R) => R.dabs.draw(drips, ANIM_STATIC, f, { ...field, torn: 0.3, crack: 0.8 }) },
      { kind: 'matter', center: set.center, draw: (f, R) => R.dabs.draw(set, ANIM_STATIC, f, field) },
      { kind: 'matter', center: [0, 0, 0.5], draw: (f, R) => R.dabs.draw(specks, ANIM_STATIC, f, { jitter: 0.5, torn: 0 }) },
    ],
  };
}


// Style frame: ref 1's composition end to end (star, ribbon, paint, threads).
function frame1Spike(engine) {
  const gl = engine.gl;
  const r = rng(21);
  const L = 8.5;
  const curve = (s) => {
    const x = s * L;
    return [x, 0.32 * Math.sin(x * 0.9 - 0.4) + 0.1 * Math.sin(x * 2.1) - 0.05 * x * 0.1, 0.35 * Math.sin(x * 0.6 + 1.0)];
  };
  const env = (s) => 0.25 + 0.75 * Math.sin(Math.min(1, s * 1.15) * Math.PI) ** 0.7;
  // paint
  const paint = new DabSet();
  paintAlongCurve(paint, r, { curve, s0: 0.03, s1: 1, count: 22000, thick: (s) => 0.62 * env(s), depth: (s) => 0.35 * env(s), sizeMin: 0.05, sizeMax: 0.19 });
  splashTongues(paint, r, { curve, s0: 0.05, s1: 0.9, count: 30, len: 0.9, per: 80 });
  paint.build(gl, [0, 0, -1]);
  const drips = new DabSet();
  dripsBelow(drips, r, { curve, s0: 0.05, s1: 1, count: 520, env, maxLen: 2.0, gap: 0.25 });
  // tall slabs above the far end (ref 1 top right)
  for (let i = 0; i < 22; i++) {
    const x = 6.2 + r.next() * 2.6, h = 0.3 + r.next() * 0.9;
    drips.add({ pos: [x, 0.9 + h * 0.5 + r.next() * 0.6, -0.4 + r.gauss() * 0.3], size: h * 0.5, aspect: 0.08 + r.next() * 0.12, layer: brushLayer(BRUSH.SLAB, r.int(0, 2)), seed: r.next(), color: LIN.bone, anim: [0, 0, 0, 0], normal: [0, 0, 1], extra: [1, 3, 0, 0] });
  }
  drips.build(gl, [0, 0, -1]);
  // soft washes behind the mosaic: glazes of the same palette, like thinned paint and smoke
  const wash = new DabSet();
  for (let i = 0; i < 700; i++) {
    const sv = r.next(), c = curve(sv);
    const e = env(sv);
    wash.add({ pos: [c[0] + r.gauss() * 0.2, c[1] + r.gauss() * 0.45 * e + 0.05, c[2] - 0.35 + r.gauss() * 0.2], size: 0.25 + r.next() * 0.5 * e, rot: r.gauss() * 0.4, aspect: 0.5 + r.next() * 0.5,
      layer: brushLayer(BRUSH.SMOKE, r.int(0, 2)), seed: r.next(), color: LIN.gold, mat: MAT.SMOKE, anim: [0, 0, 0, 0], tangent: [1, 0, 0], normal: [0, 0, 1] });
  }
  // glow along the silk
  for (let i = 0; i < 300; i++) {
    const sv = Math.pow(r.next(), 1.4), c = curve(sv);
    wash.add({ pos: [c[0], c[1] + r.gauss() * 0.03, c[2] + 0.05], size: 0.08 + r.next() * 0.12 * (1 - sv), layer: brushLayer(BRUSH.DOT, 0), seed: r.next(), color: [1, 0.85, 0.6], mat: MAT.GLOW, anim: [0, 0, 0, 0] });
  }
  wash.build(gl, [0, 0, -1]);
  const specks = new DabSet();
  spray(specks, r, { curve, count: 3500, spread: 0.7, depth: 0.7 });
  specks.build(gl, [0, 0, -1]);
  // star core glow and the fragmented "tunnel" paint between its rings
  const star = new DabSet();
  for (let i = 0; i < 900; i++) {
    const a = r.next() * 6.283, rad = 0.12 + Math.pow(r.next(), 0.7) * 1.0;
    const p = [Math.cos(a) * rad, Math.sin(a) * rad, -0.25 + r.gauss() * 0.1];
    star.add({ pos: p, size: 0.03 + r.next() * 0.06, rot: a + 1.57, aspect: 0.3 + r.next() * 0.4, layer: brushLayer(r.pick([BRUSH.CRACKLE, BRUSH.SMEAR, BRUSH.FLECK]), r.int(0, 2)), seed: r.next(), color: r.pick([LIN.gold, LIN.bone, LIN.ash, LIN.goldHi]), mat: r.next() < 0.3 ? MAT.GOLD : MAT.PAINT, normal: [Math.cos(a), Math.sin(a), 1], anim: [0, 0, 0, 0] });
  }
  for (let i = 0; i < 260; i++) {
    const rad = Math.pow(r.next(), 2) * 0.22, a = r.next() * 6.283;
    star.add({ pos: [Math.cos(a) * rad, Math.sin(a) * rad, 0.02], size: 0.05 + r.next() * 0.1, layer: brushLayer(BRUSH.DOT, r.int(0, 2)), seed: r.next(), color: [1, 0.86, 0.6], mat: MAT.GLOW, anim: [0, 0, 0, 0] });
  }
  star.build(gl, [0, 0, -1]);
  const lines = new LineBatch();
  starLines(lines, r, [0, 0, 0], { rings: 26, step: 0.055, rays: 90, rayLen: 1.3 });
  // ribbon filaments as hairlines riding the silk
  for (let k = 0; k < 7; k++) {
    const off = (k - 3) * 0.018 + r.gauss() * 0.01, zo = r.gauss() * 0.02;
    const pts = [];
    for (let i = 0; i <= 300; i++) {
      const s = i / 300, c = curve(s);
      pts.push([c[0], c[1] + off * (1 + 2 * s) + 0.03 * Math.sin(s * 30 + k), c[2] + zo]);
    }
    lines.polyline(pts, { width: 0.8 + r.next() * 0.5, intensity: 0.6, intensity1: 0.25, hi: 0.8 });
  }
  // great arcs
  lines.circle([3.6, -0.2, -1.2], 2.6, { start: 2.6, sweep: -2.2, width: 1.2, intensity: 0.7 });
  lines.circle([2.2, 0.4, -2.0], 3.4, { start: -0.9, sweep: -1.6, width: 1.0, intensity: 0.5 });
  lines.circle([6.3, 0.3, -0.6], 1.3, { dash: [0.008, 0.35, 0], width: 1.8, intensity: 0.8 });
  lines.circle([4.6, -1.5, -0.5], 0.55, { width: 1.0, intensity: 0.6 });
  lines.circle([4.6, -1.5, -0.5], 0.35, { width: 1.0, intensity: 0.5 });
  const discs = new DiscSet();
  for (const [x, z, y0, y1] of [[0, 0.05, -3.2, 3.2], [1.7, -0.4, -2.6, 3.2], [3.7, 0.3, -3.2, 3.2], [5.5, -0.8, -2.2, 3.2], [7.3, -0.2, -3.2, 3.2], [8.4, 0.4, -1.5, 3.2]]) {
    beadThread(lines, discs, r, { x, z, y0, y1, n: 9, rmin: 0.018, rmax: 0.05 });
  }
  discs.add({ pos: [3.3, 1.55, -0.6], r: 0.2, type: DISC.MOON, p1: -0.2, p2: 1, seed: 3 });
  discs.add({ pos: [5.4, -0.1, 0.4], r: 0.11, type: DISC.MOON, p1: 0.55, p2: -1, seed: 5 });
  discs.add({ pos: [8.0, 1.4, -0.3], r: 0.12, type: DISC.MOON, p1: 0.0, p2: 1, seed: 7 });
  lines.build(gl);
  discs.build(gl);
  // silk
  const silk = ribbonFromCurve({ centre: curve, width: (s) => 0.1 + 0.16 * Math.sin(Math.min(1, s * 3) * Math.PI / 2), twist: (s) => s * 5.0, samples: 500, length: L });
  silk.build(gl);
  const silk2 = ribbonFromCurve({ centre: (s) => { const c = curve(s); return [c[0], c[1] + 0.06 * Math.sin(s * 12), c[2] + 0.05]; }, width: (s) => 0.06 + 0.08 * s, twist: (s) => 1 + s * 7.0, samples: 500, length: L });
  silk2.build(gl);
  const field = { mosScale: 16, cellMix: 1, field: [1, 0, 0.105, 0.02], fieldN: [0.9, 0.06, 0.18, PAL.LIFE], facet: 0.5, torn: 0.7, jitter: 1 };
  return {
    shot: () => {
      const s = baseShot([3.5, 0.15, 7.6], [3.5, 0.0, 0], 36);
      s.cam.aperture = 0.0025;
      s.cam.focus = 7.6;
      s.light.glowWorld = [0, 0, 0.2];
      s.light.glowRadius = 0.9;
      s.light.glowCol = [2.2, 1.5, 0.8];
      s.grade.bloomGain = 0.32;
      s.grade.saturation = 0.9;
      return s;
    },
    items: () => [
      { kind: 'matter', center: [4, -1.2, 0], draw: (f, R) => R.dabs.draw(drips, ANIM_STATIC, f, { ...field, cellMix: 0.85, torn: 0.3, crack: 0.8 }) },
      { kind: 'matter', center: [4, 0, -0.35], bias: 0.5, draw: (f, R) => R.dabs.draw(wash, ANIM_WASH, f, { ...field, cellMix: 1, crack: 0, torn: 0, jitter: 0.4, alpha: 0.55 }) },
      { kind: 'matter', center: [0, 0, -0.3], draw: (f, R) => R.dabs.draw(star, ANIM_STATIC, f, { jitter: 0.6, torn: 0.3 }) },
      { kind: 'matter', center: paint.center, draw: (f, R) => R.dabs.draw(paint, ANIM_STATIC, f, field) },
      { kind: 'matter', center: [4, 0, 0.1], bias: -0.01, draw: (f, R) => { R.silk.draw(silk, f, { colA: [0.9, 0.75, 0.55], colB: [1.6, 1.4, 1.1], fibres: 16, alpha: 0.9 }); R.silk.draw(silk2, f, { colA: [0.8, 0.7, 0.6], colB: [1.4, 1.3, 1.1], fibres: 8, alpha: 0.7 }); } },
      { kind: 'matter', center: discs.center, bias: -0.2, draw: (f, R) => R.discs.draw(discs, f, {}) },
      { kind: 'matter', center: [4, 0, 0.6], draw: (f, R) => R.dabs.draw(specks, ANIM_STATIC, f, { jitter: 0.5, torn: 0 }) },
      { kind: 'line', draw: (f, R) => R.lines.draw(lines, { model: ID }) },
    ],
  };
}

export const spikes = { lines: linesSpike, paint: paintSpike, frame1: frame1Spike };
