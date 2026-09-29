// Movements III (Shedding, ref 2) and IV (Kept).
import { LineBatch } from '../lines.js';
import { DabSet, MAT } from '../dabs.js';
import { DiscSet, DISC } from '../discs.js';
import { BRUSH, brushLayer } from '../brushes.js';
import { ribbonFromCurve } from '../silk.js';
import { paintAlongCurve } from '../gen.js';
import { buildShed, ANIM_SHED_SQUARE, ANIM_SHED_DUST } from '../shed.js';
import { paletteAt, PAL } from '../mosaic.js';
import { LIN } from '../palette.js';
import { rng } from '../rng.js';
import { identity, modelTRS } from '../math.js';
import { C, BEATS, prog, ss, pulse } from './cues.js';
import { FIG, MOSAIC, BEAD_END, BEAD_R, LIFE_LEN, lifeAt } from './world.js';
import { figureDabs, profileContour } from '../figure.js';
import { strokeText } from './glyphs.js';

const ID = identity();

// figure dabs: rise from the ribbon's end into the figure, then shed (Haar)
const ANIM_FIGURE = `
uniform vec4 uShedF;
void animate(inout Dab d) {
  // aAnim: quantisation time, cell centre xyz; aExtra: start offset from the rest position (packed), rise order
  vec3 from = d.pos + (aExtra.xyz - 0.5) * vec3(8.0, 3.0, 2.0);
  float tr = uP0.x + aExtra.w * (uP0.y - uP0.x);
  float r = smoothstep(tr, tr + 1.4, uTime);
  float re = r * r * (3.0 - 2.0 * r);
  vec3 rest = d.pos;
  d.pos = mix(from, rest, re);
  d.size *= 0.4 + 0.6 * re;
  d.alpha *= uAlpha * smoothstep(tr - 0.3, tr + 0.3, uTime);
  // shedding: collapse into the cell centre
  float tq = aAnim.x;
  vec3 Cc = aAnim.yzw;
  float f = clamp((uTime - tq) / uShedF.x, 0.0, 1.0);
  d.pos = mix(d.pos, Cc, f * f);
  d.size *= 1.0 - 0.85 * f;
  d.alpha *= 1.0 - smoothstep(0.55, 1.0, f);
}`;

const ANIM_GLOWP = `
void animate(inout Dab d) {
  d.alpha *= uAlpha * uP0.x;
  d.emissive = uP0.y;
}`;

export function buildDeath(engine) {
  const gl = engine.gl;
  const r = rng(3003);
  const off = FIG;

  // ------------------------------------------------ the figure (head and shoulders) + drapery
  const dabs = figureDabs(r, 26000, off);
  // drapery: marble strands falling away down and right from the shoulders
  const drapeSet = [];
  const collector = { add: (d) => drapeSet.push(d) };
  for (let k = 0; k < 9; k++) {
    const y0 = 0.72 + k * 0.035 + r.next() * 0.03, z0 = (r.next() - 0.5) * 0.45, ph = r.next() * 6, drop = 0.35 + r.next() * 0.5, len = 1.2 + r.next() * 1.4;
    const x0 = 0.02 + k * 0.03;
    const curve = (s) => [off[0] + x0 + s * len, off[1] + y0 - s * drop - s * s * 0.3 + Math.sin(s * 3 + ph) * 0.05 * s, off[2] + z0 + Math.sin(s * 2 + ph) * 0.1 * s];
    paintAlongCurve(collector, r, { curve, count: 700, thick: (s) => 0.12 * (1 - s * 0.6), depth: () => 0.06, sizeMin: 0.035, sizeMax: 0.1, goldFrac: 0.06, color: LIN.bone, brushW: [1, 6, 0, 1, 5] });
  }
  drapeSet.forEach((d) => {
    d.color = paletteAt(PAL.FIGURE, 0.1 + r.next() * 0.6);
    d.mat = d.mat === MAT.GOLD ? MAT.GOLD : MAT.MARBLE;
  });
  const all = [...dabs, ...drapeSet];
  // rise order: from the ribbon's end, bottom first, the face last
  all.forEach((d) => {
    const hgt = Math.min(1, Math.max(0, (d.pos[1] - off[1] - 0.2) / 1.8));
    const fromLife = lifeAt(LIFE_LEN - 2.5 + r.next() * 2.5);
    const dx = fromLife[0] - d.pos[0], dy = fromLife[1] - d.pos[1], dz = fromLife[2] - d.pos[2];
    d.extra = [Math.min(1, Math.max(0, dx / 8 + 0.5)), Math.min(1, Math.max(0, dy / 3 + 0.5)), Math.min(1, Math.max(0, dz / 2 + 0.5)), Math.min(1, hgt * 0.85 + r.next() * 0.15)];
  });
  const chart = { origin: [off[0] - 0.55, off[1] + 0.05, 0], A: [1, 0, 0], B: [0, 1, 0], Nrm: [0, 0, 1], size: 3.0 };
  const mosaic = { origin: MOSAIC, A: [1, 0, 0], B: [0, 1, 0], N: [0, 0, 1], pitch: 0.058, fill: 0.72 };
  const S = buildShed(gl, all, r, {
    chart,
    sweep: (u, v, rr) => {
      const fu = (u * 3.0 - 0.3) / 1.0; // head region is u < ~0.3
      const face = Math.exp(-(((u - 0.1) / 0.1) ** 2 + ((v - 0.47) / 0.14) ** 2));
      return C.shed[0] + (1 - Math.min(1, u * 1.15)) * 4.6 + rr.gauss() * 0.2 + face * 0.9 + (fu < 0 ? 0 : 0);
    },
    lifeColor: (i, j, mc, rr) => paletteAt(PAL.LIFE, Math.min(0.95, Math.max(0.0, (i / 64) * 1.05 - 0.02 + rr.gauss() * 0.03))),
    mosaic, merges: C.merges, contract: C.contract, bead: { pos: BEAD_END, r: BEAD_R }, sortDir: [0, 0, -1], flight: 2.2, detach: 0.4, mergeDur: 0.55, lift: 0.5, dustChance: 0.6,
  });

  // chest glow: the last warmth, dimming with each slowing heartbeat
  const chest = new DabSet();
  for (let i = 0; i < 30; i++) chest.add({ pos: [off[0] + 0.12 + r.gauss() * 0.05, off[1] + 0.82 + r.gauss() * 0.05, off[2] + 0.1], size: 0.06 + r.next() * 0.08, layer: brushLayer(BRUSH.DOT, 0), seed: r.next(), color: [1, 0.55, 0.25], mat: MAT.GLOW, anim: [0, 0, 0, 0] });
  chest.build(gl);

  // silk wisps (smoke)
  const wisps = [];
  for (let k = 0; k < 6; k++) {
    const y0 = off[1] + 0.75 + k * 0.08, z0 = (r.next() - 0.5) * 0.4, ph = r.next() * 6, drop = 0.4 + r.next() * 0.6, len = 1.4 + r.next() * 1.2;
    const curve = (s) => [off[0] + 0.05 + s * len, y0 - s * drop - s * s * 0.2 + Math.sin(s * 3 + ph) * 0.06 * s, z0 + Math.sin(s * 2 + ph) * 0.12 * s];
    const rib = ribbonFromCurve({ centre: curve, width: (s) => 0.03 + 0.07 * s, twist: (s) => ph + s * 3, samples: 160, length: len });
    rib.build(gl);
    wisps.push(rib);
  }

  // the AI's gold contour of the face
  const contour = new LineBatch();
  contour.polyline(profileContour(1.12, 1.86, 90, off), { width: 1.3, intensity: 1.0, hi: 0.5 });
  contour.build(gl);

  // the quadtree grid around the figure: levels drawn one after another
  const grids = [];
  for (let L = 1; L <= 4; L++) {
    const g = new LineBatch();
    const n = 1 << L;
    for (let k = 1; k < n; k++) {
      if (L > 1 && k % 2 === 0) continue; // only the new lines of this level
      const f = k / n;
      const x = chart.origin[0] + f * chart.size, y = chart.origin[1] + f * chart.size;
      g.line([x, chart.origin[1], 0.02], [x, chart.origin[1] + chart.size, 0.02], { width: 0.8, intensity: 0.55 - L * 0.07 });
      g.line([chart.origin[0], y, 0.02], [chart.origin[0] + chart.size, y, 0.02], { width: 0.8, intensity: 0.55 - L * 0.07 });
    }
    if (L === 1) {
      const o = chart.origin, sz = chart.size;
      g.polyline([[o[0], o[1], 0.02], [o[0] + sz, o[1], 0.02], [o[0] + sz, o[1] + sz, 0.02], [o[0], o[1] + sz, 0.02], [o[0], o[1], 0.02]], { width: 0.9, intensity: 0.6 });
    }
    g.build(gl);
    grids.push({ g, t0: C.gridDraw[0] + (L - 1) * 0.5 });
  }
  // diamond dots at grid crossings of the mosaic (ref 2)
  const mgrid = new LineBatch();
  const mdots = new DiscSet();
  {
    const P = mosaic.pitch * 8;
    for (let k = -4; k <= 4; k++) {
      const x = MOSAIC[0] + k * P, y = MOSAIC[1] + k * P;
      mgrid.line([x, MOSAIC[1] - 4 * P, -0.12], [x, MOSAIC[1] + 4 * P, -0.12], { width: 0.7, intensity: 0.4 });
      mgrid.line([MOSAIC[0] - 4 * P, y, -0.12], [MOSAIC[0] + 4 * P, y, -0.12], { width: 0.7, intensity: 0.4 });
      for (let j = -4; j <= 4; j++) mdots.add({ pos: [x, MOSAIC[1] + j * P, -0.11], r: 0.012, type: DISC.DOT, seed: r.next() * 9 });
    }
  }
  mgrid.build(gl);
  mdots.build(gl);

  // ------------------------------------------------ movement IV: the bead, the thread, the curtain
  const bead = new DiscSet();
  bead.add({ pos: BEAD_END, r: BEAD_R, type: DISC.BEAD, seed: 1, t0: C.contract[1] - 0.25, fade: 0.35 });
  bead.build(gl);
  const thread = new LineBatch();
  thread.polyline(Array.from({ length: 41 }, (_, i) => [BEAD_END[0], BEAD_END[1] + 10 - i * 0.5, BEAD_END[2] - 0.02]), { width: 1.1, intensity: 0.9, hi: 0.2 });
  thread.build(gl);
  const curtainL = new LineBatch();
  const curtainD = new DiscSet();
  const curtainDist = [];
  for (let i = 0; i < 150; i++) {
    const z = -2.5 - Math.pow(r.next(), 0.7) * 60;
    const x = BEAD_END[0] + r.gauss() * (6 + -z * 0.55);
    if (Math.abs(x - BEAD_END[0]) < 0.35 && z > -3) continue;
    const dist = Math.hypot(x - BEAD_END[0], z);
    curtainL.polyline(Array.from({ length: 13 }, (_, k) => [x, BEAD_END[1] - 20 + k * 3.4, z]), { width: 0.9, intensity: 0.32, u0: dist / 70, u1: dist / 70 });
    const nb = 2 + r.int(0, 3);
    for (let k = 0; k < nb; k++) {
      curtainD.add({ pos: [x, BEAD_END[1] - 8 + r.next() * 16, z], r: 0.05 + r.next() * 0.08, type: r.next() < 0.6 ? DISC.BEAD : r.next() < 0.5 ? DISC.PEARL : DISC.COIN, seed: r.next() * 9,
        t0: C.curtain[0] + dist * 0.05, fade: 1.2 });
    }
    curtainDist.push(dist);
  }
  curtainL.build(gl);
  curtainD.build(gl);
  // the return: circle, cross, the first division
  const circle = new LineBatch();
  circle.circle(BEAD_END, 0.5, { width: 1.25, intensity: 1.0, hi: 0.3, segments: 180 });
  circle.build(gl);
  const cross = new LineBatch();
  cross.line([BEAD_END[0] - 0.5, BEAD_END[1], 0], [BEAD_END[0] + 0.5, BEAD_END[1], 0], { width: 1.0, intensity: 0.9 });
  cross.build(gl);
  const cells = new DiscSet();
  for (const sx of [-1, 1]) cells.add({ pos: [BEAD_END[0] + sx * 0.03, BEAD_END[1], 0], r: 0.1, from: BEAD_END, r0: 0.11, type: DISC.CELL, p1: 1, seed: r.next() * 9, t0: C.split, fade: 0.08, moveT: C.split, moveDur: 1.2 });
  cells.build(gl);
  // title
  const title = new LineBatch();
  strokeText(title, 'HELD', [BEAD_END[0], BEAD_END[1] + 0.02, 0], 0.26, { width: 1.5, spacing: 0.62 });
  title.build(gl);

  // ------------------------------------------------ items
  function items(t) {
    const out = [];
    if (t < 88.5) return out;
    const M = (tag, f) => ({ kind: 'matter', tag, ...f });
    const Lk = (tag, f) => ({ kind: 'line', tag, draw: f });
    const pl = pulse(t);
    const U = S.uniforms;
    if (t < C.fadeOut[1] + 0.1) {
      if (t < C.shed[1] + 1.5) {
        out.push(M('figure', { center: [off[0] + 0.3, off[1] + 1.0, 0], draw: (f, R) => R.dabs.draw(S.fig, ANIM_FIGURE, f, U({ p0: [C.figureRise[0], C.figureRise[1] - 1.4, 0, 0], crack: 0.3, torn: 0.3, jitter: 0.35, facet: 0.12, mosScale: 40, cellMix: 0 })) }));
        const chestA = ss(t, 92, 95) * (1 - ss(t, C.lastBeat, C.lastBeat + 1.2));
        const dim = 1 - 0.8 * ss(t, C.heartSlow[0], C.lastBeat);
        if (chestA > 0.001) out.push(M('figure', { center: [off[0] + 0.12, off[1] + 0.82, 0.12], bias: -0.05, draw: (f, R) => R.dabs.draw(chest, ANIM_GLOWP, f, { p0: [chestA, (0.25 + 0.9 * pl) * dim, 0, 0], glowAmt: 0 }) }));
        const wa = ss(t, 91, 95) * (1 - ss(t, C.shed[0], C.shed[0] + 3));
        if (wa > 0.001) out.push(M('figure', { center: [off[0] + 1, off[1] + 0.6, 0.1], bias: -0.1, draw: (f, R) => wisps.forEach((w, k) => R.silk.draw(w, f, { colA: [0.45, 0.47, 0.52], colB: [1.1, 1.05, 0.95], fibres: 10, alpha: 0.5 * wa, flutter: [0.02, 5, 0.8, k] })) }));
        // contour traced by the AI while the heart slows; it stays until the face is shed
        out.push(Lk('contour', (f, R) => R.lines.draw(contour, { model: ID, occlude: 0, reveal: prog(t, 95.5, 100.5), revealHead: 1.6, alpha: 1 - ss(t, 109.6, 110.8) })));
        for (const g of grids) if (t > g.t0) out.push(Lk('grid', (f, R) => R.lines.draw(g.g, { model: ID, reveal: prog(t, g.t0, g.t0 + 0.8), revealHead: 1, alpha: 0.9 * (1 - ss(t, 110, 112)) })));
      }
      if (t > C.shed[0] - 0.5) {
        out.push(M('squares', { center: [MOSAIC[0] - 1, MOSAIC[1], 0.1], bias: -0.05, draw: (f, R) => R.dabs.draw(S.sq, ANIM_SHED_SQUARE, f, U({ crack: 0.5, torn: 0, jitter: 0.25, glowAmt: 0.3 })) }));
        out.push(M('dust', { center: [MOSAIC[0] - 1, MOSAIC[1], 0.2], bias: -0.1, draw: (f, R) => R.dabs.draw(S.dust, ANIM_SHED_DUST, f, U({ jitter: 0.4, torn: 0 })) }));
      }
      if (t > C.mosaicSettle[0] && t < C.contract[1] + 0.5) {
        const ga = ss(t, C.mosaicSettle[0], C.mosaicSettle[0] + 2) * (1 - ss(t, C.merges[3], C.merges[5]));
        out.push(Lk('mgrid', (f, R) => R.lines.draw(mgrid, { model: ID, alpha: ga })));
        out.push(M('mgrid', { center: MOSAIC, bias: 0.2, draw: (f, R) => R.discs.draw(mdots, f, { alpha: ga }) }));
      }
      // bead, thread, curtain
      if (t > C.contract[1] - 0.3) {
        const splitting = ss(t, C.split, C.split + 0.3);
        out.push(M('bead', { center: BEAD_END, bias: -0.2, draw: (f, R) => R.discs.draw(bead, f, { core: 0.6 - 0.3 * ss(t, 124, 128), alpha: 1 - splitting }) }));
        out.push(Lk('bead', (f, R) => R.lines.draw(thread, { model: ID, reveal: prog(t, C.threaded, C.threaded + 1.6), revealHead: 1.5 })));
      }
      if (t > C.curtain[0] - 0.5) {
        const wave = (t - C.curtain[0]) / 3.5;
        const ca = ss(t, C.curtain[0], C.curtain[0] + 1.5) * (1 - 0.72 * ss(t, 126.8, 129.2));
        out.push(Lk('curtain', (f, R) => R.lines.draw(curtainL, { model: ID, alpha: 0.8 * ca })));
        out.push(M('curtain', { center: [BEAD_END[0], BEAD_END[1], -20], bias: 5, draw: (f, R) => R.discs.draw(curtainD, f, { core: 0.25, alpha: 0.8 * ca }) }));
      }
      if (t > C.returnCircle[0]) out.push(Lk('return', (f, R) => R.lines.draw(circle, { model: ID, reveal: prog(t, C.returnCircle[0], C.returnCircle[1]), revealHead: 1 })));
      if (t > C.returnCross[0]) out.push(Lk('return', (f, R) => R.lines.draw(cross, { model: ID, reveal: prog(t, C.returnCross[0], C.returnCross[1]), revealHead: 1 })));
      if (t > C.split - 0.05) out.push(M('return', { center: BEAD_END, bias: -0.25, draw: (f, R) => R.discs.draw(cells, f, { cellWarm: 1 }) }));
    }
    if (t > C.title[0] - 0.1) {
      const a = 1 - ss(t, C.title[1] - 0.8, C.title[1] + 0.4);
      out.push(Lk('title', (f, R) => R.lines.draw(title, { model: ID, occlude: 0, reveal: prog(t, C.title[0], C.title[0] + 2.2), revealHead: 1.4, alpha: a })));
    }
    return out;
  }
  return { items };
}
