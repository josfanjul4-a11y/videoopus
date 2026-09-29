// Movement 0 (The Bead) and Movement I (Quickening), ref 3.
import { LineBatch } from '../lines.js';
import { DabSet, MAT } from '../dabs.js';
import { DiscSet, DISC } from '../discs.js';
import { BRUSH, brushLayer } from '../brushes.js';
import { ribbonFromCurve } from '../silk.js';
import { growTree, beadThread } from '../gen.js';
import { paletteAt, PAL } from '../mosaic.js';
import { LIN } from '../palette.js';
import { rng } from '../rng.js';
import { identity, modelTRS } from '../math.js';
import { C, BEATS, prog, ss, pulse } from './cues.js';
import { embryoDabs } from './embryo.js';

const ID = identity();

const ANIM_EMBRYO = `
void animate(inout Dab d) {
  // uP0: condense start, seconds per unit of distance, emissive scale, heartbeat pulse
  // uP1: collapse start, collapse end
  float dist = aAnim.x;
  float t0 = uP0.x + dist * uP0.y;
  float appear = smoothstep(t0, t0 + 0.9, uTime);
  vec3 c = vec3(0.02, -0.05, 0.0);
  d.pos = c + (d.pos - c) * (1.0 + (1.0 - appear) * 0.22);
  d.alpha *= uAlpha * appear;
  d.emissive = aAnim.y * uP0.z * (1.0 + 0.16 * uP0.w);
  float col = smoothstep(uP1.x, uP1.y, uTime);
  d.pos = mix(d.pos, c, col * col);
  d.size *= 1.0 - 0.8 * col;
  d.alpha *= 1.0 - smoothstep(0.75, 1.0, col);
}`;

const ANIM_GLOWCORE = `
void animate(inout Dab d) {
  // uP0: alpha, emissive
  d.alpha *= uAlpha * uP0.x;
  d.emissive = uP0.y * aAnim.y;
  d.size *= aAnim.z > 0.0 ? uP0.z : 1.0;
}`;

const ANIM_CELLS = `
void animate(inout Dab d) {
  // blood cells behind the embryo: appear, breathe with the heartbeat, scatter at birth
  float t0 = aAnim.x;
  d.alpha *= uAlpha * smoothstep(t0, t0 + 1.2, uTime);
  d.size *= 1.0 + 0.06 * uP0.x;
  d.emissive = 0.03 + 0.05 * uP0.x;
  float sc = smoothstep(uP0.y, uP0.y + 3.0, uTime);
  d.pos += normalize(d.pos + vec3(0.001)) * sc * sc * 1.5;
  d.alpha *= 1.0 - sc;
}`;

export function buildBirth(engine) {
  const gl = engine.gl;
  const r = rng(1001);

  // ------------------------------------------------ prologue: bead, thread, circle, cross, grid
  const bead = new DiscSet();
  bead.add({ pos: [0, 0, 0], r: 0.12, type: DISC.BEAD, seed: 1, end: C.cleave2 + 0.04 });
  bead.build(gl);

  const thread = new LineBatch();
  thread.polyline(Array.from({ length: 41 }, (_, i) => [0, -10 + i * 0.5, -0.02]), { width: 1.1, intensity: 0.85, hi: 0.2 });
  thread.build(gl);
  // far threads of the curtain, barely visible (a reward for a second viewing)
  const far = new LineBatch();
  const farDiscs = new DiscSet();
  for (let i = 0; i < 16; i++) {
    const x = -9 + r.next() * 18, z = -8 - r.next() * 26;
    far.polyline(Array.from({ length: 21 }, (_, k) => [x, -14 + k * 1.4, z]), { width: 0.9, intensity: 0.28 });
    for (let k = 0; k < 4; k++) farDiscs.add({ pos: [x, -6 + r.next() * 12, z], r: 0.06 + r.next() * 0.08, type: r.next() < 0.5 ? DISC.BEAD : DISC.PEARL, seed: r.next() * 9 });
  }
  far.build(gl);
  farDiscs.build(gl);

  const circle = new LineBatch();
  circle.circle([0, 0, 0], 0.5, { width: 1.25, intensity: 1.0, hi: 0.3, segments: 180 });
  circle.build(gl);
  const cross = new LineBatch();
  cross.line([-0.5, 0, 0], [0.5, 0, 0], { width: 1.0, intensity: 0.9 });
  cross.build(gl);
  const grid4 = new LineBatch();
  for (const k of [-0.25, 0.25]) {
    const h = Math.sqrt(0.25 - k * k);
    grid4.line([k, -h, 0], [k, h, 0], { width: 0.8, intensity: 0.6 });
    grid4.line([-h, k, 0], [h, k, 0], { width: 0.8, intensity: 0.6 });
  }
  grid4.build(gl);

  // ------------------------------------------------ cleavage: 1 → 2 → 4 → 16 cells in the quadtree
  const cells = new DiscSet();
  const bubblesFromCells = [];
  const two = [[-0.068, 0, 0], [0.068, 0, 0]];
  two.forEach((p) => cells.add({ pos: p, r: 0.092, from: [0, 0, 0], r0: 0.1, type: DISC.CELL, p1: 1, seed: r.next() * 9, t0: C.cleave2 - 0.02, fade: 0.06, moveT: C.cleave2, moveDur: 0.6, end: C.cleave4 + 0.02 }));
  const four = [[-0.066, 0.066, 0], [0.066, 0.066, 0], [-0.066, -0.066, 0], [0.066, -0.066, 0]];
  four.forEach((p) => cells.add({ pos: p, r: 0.07, from: [Math.sign(p[0]) * 0.068, 0, 0], r0: 0.08, type: DISC.CELL, p1: 1, seed: r.next() * 9, t0: C.cleave4 - 0.02, fade: 0.05, moveT: C.cleave4, moveDur: 0.55, end: C.cleave16 + 0.02 }));
  for (let j = 0; j < 4; j++)
    for (let i = 0; i < 4; i++) {
      const p = [(i - 1.5) * 0.068, (1.5 - j) * 0.068, 0];
      const parent = four[(j < 2 ? 0 : 2) + (i < 2 ? 0 : 1)];
      cells.add({ pos: p, r: 0.038, from: parent, r0: 0.05, type: DISC.CELL, p1: 1, seed: r.next() * 9, t0: C.cleave16 - 0.02, fade: 0.05, moveT: C.cleave16, moveDur: 0.5, end: C.cellsDisperse[0] + 0.01 });
      // then they drift out to become bubbles around the embryo
      const a = r.next() * Math.PI * 2, rad = 0.55 + r.next() * 0.9;
      const to = [Math.cos(a) * rad * 1.2, Math.sin(a) * rad * 0.8 + 0.1, -0.4 + r.next() * 0.9];
      cells.add({ pos: to, r: 0.035 + r.next() * 0.06, from: p, r0: 0.038, type: DISC.CELL, p1: 1, seed: r.next() * 9, t0: C.cellsDisperse[0] - 0.01, fade: 0.02, moveT: C.cellsDisperse[0], moveDur: 4.5 + r.next() * 1.5, drift: 0.004 });
      bubblesFromCells.push(to);
    }
  cells.build(gl);

  // ------------------------------------------------ embryo
  const emb = new DabSet();
  embryoDabs(r, 24000).forEach((d) => emb.add(d));
  emb.build(gl, [0, 0, -1]);
  // inner light: large soft dabs inside the body
  const core = new DabSet();
  for (let i = 0; i < 90; i++) {
    const p = [0.02 + r.gauss() * 0.08, -0.03 + r.gauss() * 0.12, r.gauss() * 0.05];
    core.add({ pos: p, size: 0.08 + r.next() * 0.14, layer: brushLayer(BRUSH.DOT, r.int(0, 2)), seed: r.next(), color: [1.0, 0.72, 0.38], mat: MAT.GLOW, anim: [0, 0.6 + r.next() * 0.8, 0, 0] });
  }
  // a wider, soft halo (radial dots only: no stamp edges)
  for (let i = 0; i < 16; i++) {
    const p = [-0.02 + r.gauss() * 0.06, -0.06 + r.gauss() * 0.08, -0.2];
    core.add({ pos: p, size: 0.35 + r.next() * 0.25, layer: brushLayer(BRUSH.DOT, 0), seed: r.next(), color: [0.8, 0.42, 0.16], mat: MAT.GLOW, anim: [0, 0.12, 1, 0] });
  }
  core.build(gl, [0, 0, -1]);

  // blood cells behind (ref 3's crimson and amber cells)
  const blood = new DabSet();
  for (let i = 0; i < 2600; i++) {
    // a lobed tissue mass low behind the embryo, cellular, crimson to maroon
    const lobe = r.int(0, 3);
    const lc = [[-0.18, -0.28, -0.35], [0.12, -0.36, -0.42], [0.3, -0.12, -0.5], [-0.05, -0.05, -0.62]][lobe];
    const p = [lc[0] + r.gauss() * 0.16, lc[1] + r.gauss() * 0.12, lc[2] + r.gauss() * 0.08];
    blood.add({ pos: p, size: 0.012 + Math.pow(r.next(), 2) * 0.05, rot: r.next() * 6.28, aspect: 0.6 + r.next() * 0.4,
      layer: brushLayer(r.next() < 0.5 ? BRUSH.CELL : r.pick([BRUSH.CRACKLE, BRUSH.BLOB]), r.int(0, 2)), seed: r.next(),
      color: paletteAt(PAL.CELLS, 0.15 + r.next() * 0.8), mat: MAT.PAINT, normal: [(p[0] - lc[0]) * 3, (p[1] - lc[1]) * 3, 0.8], anim: [11.5 + r.next() * 3, 0, 0, 0] });
  }
  blood.build(gl, [0, 0, -1]);

  // silk ribbons wrapping the embryo
  const silks = [];
  for (let k = 0; k < 6; k++) {
    const tilt = r.next() * Math.PI, rot = r.next() * Math.PI * 2, th0 = r.next() * Math.PI * 2, span = 2.4 + r.next() * 2.0;
    const rad0 = 0.3 + r.next() * 0.12, rad1 = 0.42 + r.next() * 0.35, h0 = -0.35 + r.next() * 0.2, h1 = 0.2 + r.next() * 0.3;
    const ct = Math.cos(tilt), st = Math.sin(tilt), cr = Math.cos(rot), sr = Math.sin(rot);
    const centre = (s) => {
      const th = th0 + s * span;
      const rr = rad0 + (rad1 - rad0) * s;
      let p = [Math.cos(th) * rr, h0 + (h1 - h0) * s, Math.sin(th) * rr];
      // tilt about x, then rotate about y
      p = [p[0], p[1] * ct - p[2] * st, p[1] * st + p[2] * ct];
      p = [p[0] * cr + p[2] * sr, p[1], -p[0] * sr + p[2] * cr];
      return [p[0] + 0.02, p[1] - 0.04, p[2]];
    };
    const wmul = 0.6 + 0.6 * r.next();
    const rib = ribbonFromCurve({ centre, width: (s) => (0.03 + 0.08 * Math.sin(s * Math.PI)) * wmul, twist: (s) => s * (1.2 + k * 0.4), samples: 240, length: 3 });
    rib.build(gl);
    silks.push({ rib, t0: C.silkUnfurl[0] + k * 0.7, dur: 3.5 + r.next() * 1.5, ph: r.next() * 6 });
  }

  // bubbles
  const bubbles = new DiscSet();
  for (let i = 0; i < 44; i++) {
    const a = r.next() < 0.65 ? r.gauss() * 0.7 : r.next() * Math.PI * 2, rad = 0.5 + Math.pow(r.next(), 0.8) * 1.6;
    const front = r.next() < 0.12;
    const p = [Math.cos(a) * rad * 1.3 + 0.2, Math.sin(a) * rad * 0.85, front ? 0.8 + r.next() * 0.7 : -1.6 + r.next() * 1.9];
    const type = r.next() < 0.1 ? DISC.COIN : r.next() < 0.12 ? DISC.DOT : DISC.BUBBLE;
    bubbles.add({ pos: p, r: (type === DISC.BUBBLE ? 0.018 + Math.pow(r.next(), 2.6) * 0.1 : 0.01 + r.next() * 0.022) * (front ? 1.5 : 1), type, seed: r.next() * 9,
      t0: 11.0 + r.next() * 4, fade: 1.5, sway: 0.02, phase: r.next() * 6, drift: 0.003 + r.next() * 0.006 });
  }
  bubbles.build(gl);

  // the gold tree from the upper left
  const tr = growTree(r, { root: [-2.05, 1.5, -1.0], dir: [0.75, -0.5, 0.35], len: 1.25, depth: 6, speed: 0.42, bend: [0.25, -0.2, 0.1], width: 2.6 });
  const tree = new LineBatch();
  for (const b of tr.branches) tree.polyline(b.pts, { width: b.w0, width1: b.w1, intensity: 0.95, intensity1: 0.7, u0: b.t0 / tr.tMax, u1: b.t1 / tr.tMax, hi: 0.35 });
  tree.build(gl);
  const buds = new DiscSet();
  for (const b of tr.buds) buds.add({ pos: b.pos, r: 0.012 * b.size, type: r.next() < 0.7 ? DISC.DOT : DISC.COIN, seed: r.next() * 9, t0: C.treeGrow[0] + (b.t / tr.tMax) * (C.treeGrow[1] - C.treeGrow[0]), fade: 0.4 });
  buds.build(gl);
  // a blue painterly haze behind the tree
  const haze = new DabSet();
  for (let i = 0; i < 160; i++) {
    const b = tr.branches[r.int(0, tr.branches.length - 1)];
    const p = b.pts[r.int(0, b.pts.length - 1)];
    haze.add({ pos: [p[0] + r.gauss() * 0.2, p[1] + r.gauss() * 0.2, p[2] - 0.3 - r.next() * 0.3], size: 0.12 + r.next() * 0.25, rot: r.next() * 6.28, aspect: 0.4 + r.next() * 0.4,
      layer: brushLayer(r.pick([BRUSH.SMOKE, BRUSH.SMOKE, BRUSH.STROKE]), r.int(0, 2)), seed: r.next(), color: r.pick([LIN.slate, LIN.teal, [0.2, 0.25, 0.4]]).map((c) => c * 0.6), mat: MAT.SMOKE,
      anim: [C.treeGrow[0] + (b.t0 / tr.tMax) * 12, 2.0, 0, 0] });
  }
  haze.build(gl, [0, 0, -1]);

  // hanging bead threads (three groups lowering into place)
  const groups = [];
  const spots = [[[-1.35, -1.6], [1.25, -1.1]], [[-0.55, -2.4], [2.05, -2.0], [0.0, -0.02]], [[-2.1, -1.0], [1.7, 0.9], [2.9, -2.6]]];
  spots.forEach((g, gi) => {
    const lines = new LineBatch(), discs = new DiscSet();
    g.forEach(([x, z]) => beadThread(lines, discs, r, { x, z, y0: -2.8, y1: 6, n: x === 0 ? 3 : 7, rmin: 0.014, rmax: 0.04, kinds: [3, 4, 1, 1, 3], sway: 0 }));
    lines.build(gl);
    discs.build(gl);
    groups.push({ lines, discs, t0: C.threadsDescend[0] + gi * 1.6, center: [g[0][0], 0, g[0][1]] });
  });

  // calibration circles (the AI measuring the new life)
  const calib = new LineBatch();
  [[0.62, 1.0, 0], [0.8, 0.8, [0.01, 0.4, 0]], [1.05, 0.9, 0], [1.4, 0.55, [0.006, 0.5, 0.3]], [1.9, 0.45, 0]].forEach(([rad, inten, dash], i) => {
    calib.circle([0.02, -0.03, -0.05], rad, { width: 1.0, intensity: inten, dash: dash || [0, 1, 0], start: Math.PI / 2 + i, sweep: -Math.PI * 2 * (i === 3 ? 0.7 : 1), u0: i / 5, u1: (i + 1) / 5 });
  });
  calib.build(gl);
  // heartbeat ring (unit circle, drawn scaled per beat)
  const ring = new LineBatch();
  ring.circle([0, 0, 0], 1, { width: 1.1, intensity: 1, segments: 160 });
  ring.build(gl);
  const ringBeats = BEATS.filter((b) => b.t < 33 && b.k % 2 === 0);

  // ------------------------------------------------ items
  function items(t) {
    const out = [];
    const M = (f) => ({ kind: 'matter', ...f });
    const Lk = (f, tag) => ({ kind: 'line', draw: f, tag });
    const pl = pulse(t);
    const growth = 1 + 0.6 * ss(t, C.growth[0], C.growth[1]) + 1.2 * ss(t, C.birthBreak[0], 35.3);
    // prologue
    if (t < C.cleave2 + 0.1) out.push(M({ tag: 'bead',  center: [0, 0, 0], bias: -0.1, draw: (f, R) => R.discs.draw(bead, f, { core: 0.25 + 0.35 * ss(t, 0, 5.5) }) }));
    if (t < 40) out.push(Lk((f, R) => R.lines.draw(thread, { model: ID, alpha: ss(t, 0.2, 2.2) }), 'thread'));
    if (t < 16) {
      out.push(Lk((f, R) => R.lines.draw(far, { model: ID, alpha: 0.22 * ss(t, 1, 4) * (1 - ss(t, 10, 14)) })));
      out.push(M({ center: [0, 0, -20], draw: (f, R) => R.discs.draw(farDiscs, f, { alpha: 0.12 * ss(t, 1, 4) * (1 - ss(t, 10, 14)), core: 0.1 }) }));
    }
    if (t >= C.circleDraw[0] && t < 36) {
      const rv = prog(t, C.circleDraw[0], C.circleDraw[1]);
      out.push(Lk((f, R) => R.lines.draw(circle, { model: ID, reveal: rv, revealHead: 1, alpha: 1 - 0.55 * ss(t, 12, 16) - 0.45 * ss(t, 33, 36) })));
    }
    if (t >= C.crossDraw[0] && t < 13) out.push(Lk((f, R) => R.lines.draw(cross, { model: ID, reveal: prog(t, C.crossDraw[0], C.crossDraw[1]), revealHead: 1, alpha: 1 - ss(t, 10, 12.5) })));
    if (t >= C.cleave16 && t < 13) out.push(Lk((f, R) => R.lines.draw(grid4, { model: ID, reveal: prog(t, C.cleave16, C.cleave16 + 0.5), alpha: 1 - ss(t, 10, 12.5) })));
    if (t >= C.cleave2 - 0.1 && t < 40) out.push(M({ tag: 'cells',  center: [0, 0, 0.05], bias: -0.05, draw: (f, R) => R.discs.draw(cells, f, { cellWarm: 1 - ss(t, C.cellsDisperse[0], C.cellsDisperse[1]) * 0.85, alpha: 1 - ss(t, 34, 38) }) }));
    // embryo and its light
    if (t >= C.embryoCondense[0] - 1 && t < 37) {
      const coreA = ss(t, 9.4, 13) * (1 - ss(t, 35.6, 36.3));
      out.push(M({ tag: 'embryo',  center: [0, 0, -0.1], bias: 0.02, draw: (f, R) => R.dabs.draw(core, ANIM_GLOWCORE, f, { p0: [coreA * 0.4, (0.12 + 0.08 * pl) * growth, 1 - 0.7 * ss(t, 35.3, 36.2), 0], crack: 0, torn: 0, jitter: 0.2, glowAmt: 0 }) }));
      out.push(M({ tag: 'embryo',  center: [0, 0, 0], draw: (f, R) => R.dabs.draw(emb, ANIM_EMBRYO, f, { p0: [C.embryoCondense[0], 8.0, 0.8 * growth, pl], p1: [35.3, 36.15, 0, 0], crack: 0.12, torn: 0.2, jitter: 0.28, facet: 0.12, mosScale: 45, glowAmt: 0.08 }) }));
    }
    if (t >= 11 && t < 38) out.push(M({ tag: 'tissue',  center: [0.1, -0.1, -0.7], draw: (f, R) => R.dabs.draw(blood, ANIM_CELLS, f, { p0: [pl, 33.5, 0, 0], crack: 0.6, torn: 0.4, jitter: 0.7, cellMix: 0.35, mosScale: 70, field: [0.4, -1, 0.9, 0.35], fieldN: [3.0, 0.1, 0.3, PAL.CELLS], glowAmt: 0.6 }) }));
    if (t >= 10.5 && t < 37) {
      for (const s of silks) {
        const head = ss(t, s.t0, s.t0 + s.dur);
        if (head <= 0) continue;
        const peel = ss(t, 33.4, 36.0);
        const model = modelTRS([0, 0, 0], 1 + peel * 1.6, peel * 0.8, 0);
        out.push(M({ tag: 'silk',  center: [0, 0, 0.1], bias: -0.02, draw: (f, R) => R.silk.draw(s.rib, f, { model, colA: [0.9, 0.55, 0.32], colB: [1.8, 1.35, 0.9], fibres: 14, alpha: 0.9 * (1 - peel), reveal: [0, head, 0.03, 0.02], flutter: [0.012, 7, 1.3, s.ph] }) }));
      }
    }
    if (t >= 10.5 && t < 40) out.push(M({ tag: 'bubbles',  center: [0.2, 0, -0.4], bias: 0.1, draw: (f, R) => R.discs.draw(bubbles, f, { alpha: 0.32 * (1 - ss(t, 35, 39)) }) }));
    // tree
    if (t >= C.treeGrow[0] && t < 44) {
      const rv = prog(t, C.treeGrow[0], C.treeGrow[1]);
      const a = 1 - 0.6 * ss(t, 36, 42);
      out.push(M({ tag: 'tree',  center: [-1.6, 1.4, -1.5], draw: (f, R) => R.dabs.draw(haze, ANIM_STATIC_FADE, f, { alpha: 0.22 * a, crack: 0, torn: 0, jitter: 0.4 }) }));
      out.push(Lk((f, R) => R.lines.draw(tree, { model: ID, reveal: rv, revealHead: 1.2, alpha: a }), 'tree'));
      out.push(M({ tag: 'tree',  center: [-1.5, 1.2, -1.2], draw: (f, R) => R.discs.draw(buds, f, { alpha: a }) }));
    }
    // hanging threads lowering into place
    for (const g of groups) {
      if (t < g.t0 - 0.1) continue;
      const drop = 1 - ss(t, g.t0, g.t0 + 4.5);
      const y = drop * drop * 7.5;
      const model = modelTRS([0, y, 0], 1, 0, 0);
      out.push(Lk((f, R) => R.lines.draw(g.lines, { model, alpha: 0.9 }), 'threads'));
      out.push(M({ tag: 'threads',  center: g.center, draw: (f, R) => R.discs.draw(g.discs, f, { model, p0: [0.6, 0, 0, 0] }) }));
    }
    // calibration circles
    if (t >= 14 && t < 38) out.push(Lk((f, R) => R.lines.draw(calib, { model: ID, reveal: prog(t, 14, 18.5), revealHead: 1, alpha: 0.75 * (1 - ss(t, 33, 36.5)) }), 'calib'));
    // heartbeat rings
    for (const b of ringBeats) {
      const a = t - b.t;
      if (a < 0 || a > 1.8) continue;
      const rad = 0.42 + a * 0.9;
      out.push(Lk((f, R) => R.lines.draw(ring, { model: modelTRS([0.02, -0.03, 0], rad, 0, 0), alpha: 0.55 * (1 - a / 1.8) * (1 - a / 1.8) }), 'rings'));
    }
    return out;
  }
  return { items };
}

const ANIM_STATIC_FADE = `
void animate(inout Dab d) {
  d.alpha *= uAlpha * smoothstep(aAnim.x, aAnim.x + aAnim.y, uTime);
}`;
