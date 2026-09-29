// Movement II: The Long Line (ref 1). Time is space: the present runs along
// the ribbon; ahead of it the life exists only as gold drawing (the AI already
// holds all of it); at the present, paint erupts; behind it, paint drips.
import { LineBatch } from '../lines.js';
import { DabSet, MAT } from '../dabs.js';
import { DiscSet, DISC } from '../discs.js';
import { BRUSH, brushLayer } from '../brushes.js';
import { ribbonFromCurve } from '../silk.js';
import { starLines, beadThread, tangentOf } from '../gen.js';
import { paletteAt, PAL } from '../mosaic.js';
import { LIN } from '../palette.js';
import { rng } from '../rng.js';
import { identity } from '../math.js';
import { C, prog, ss } from './cues.js';
import {
  LIFE_LEN, presentX, timeOfX, lifeAt, lifeY, MEET_X, CHILD_X, LOSS_X, AGE_X, partnerAt, PARTNER_X0, childAt,
} from './world.js';

const ID = identity();

// paint erupting from the ribbon at the moment the present reaches it
export const ANIM_ERUPT = `
void animate(inout Dab d) {
  // aAnim: arrival time, offset from the ribbon centre (xyz)
  float a = uTime - aAnim.x;
  if (a < 0.0) { d.alpha = 0.0; return; }
  vec3 off = aAnim.yzw;
  float e = 1.0 - exp(-a * 5.5) * cos(a * 7.0);
  d.pos = d.pos - off + off * e;
  d.size *= 0.25 + 0.75 * smoothstep(0.0, 0.45, a);
  d.alpha *= uAlpha * smoothstep(0.0, 0.12, a);
  // a flash of warmth when fresh, cooling as it dries
  d.emissive = 0.9 * exp(-a * 1.6) * uP0.x;
  // the partner's end: paint breaks into rectangles and falls (uP1: x threshold, break time)
  if (uP1.y > 0.0 && d.pos.x > uP1.x) {
    float tb = uP1.y + (d.pos.x - uP1.x) * 0.9 + fract(aShape.w * 13.1) * 0.6;
    float f = uTime - tb;
    if (f > 0.0) {
      d.pos.y -= 0.5 * 1.6 * f * f + 0.2 * f;
      d.pos.x += 0.15 * f * (fract(aShape.w * 7.3) - 0.5);
      d.rot += f * (fract(aShape.w * 3.7) - 0.5) * 6.0;
      d.aspect *= 0.6 + 0.4 * abs(cos(f * 4.0 + aShape.w * 10.0));
      d.alpha *= 1.0 - smoothstep(1.2, 3.0, f);
      d.shape = 40.0;
      d.color = mix(d.color, vec3(0.45, 0.46, 0.5), smoothstep(0.0, 1.5, f));
    }
  }
}`;

// drips grow downward from where the paint landed
export const ANIM_DRIP = `
void animate(inout Dab d) {
  // aAnim: arrival time, full half-length, growth time constant
  float a = uTime - aAnim.x;
  if (a < 0.0) { d.alpha = 0.0; return; }
  float g = 1.0 - exp(-a / max(aAnim.z, 0.1));
  float half_ = aAnim.y * max(g, 0.02);
  d.size = half_;
  d.pos.y -= half_;
  d.alpha *= uAlpha * smoothstep(0.0, 0.3, a);
}`;

// spray: specks thrown out at arrival, drifting down
export const ANIM_SPRAY = `
void animate(inout Dab d) {
  float a = uTime - aAnim.x;
  if (a < 0.0) { d.alpha = 0.0; return; }
  vec3 v = aAnim.yzw;
  float k = 2.2;
  d.pos += v * (1.0 - exp(-k * a)) / k + vec3(0.0, -0.03 * a, 0.0);
  d.alpha *= uAlpha * smoothstep(0.0, 0.08, a) * (1.0 - 0.6 * smoothstep(1.0, 6.0, a));
}`;

export function buildLife(engine) {
  const gl = engine.gl;
  const r = rng(2002);
  const curve = (s) => lifeAt(s * LIFE_LEN);
  const env = (x) => {
    // thickness of the life: grows through childhood, fullest in love, thins in age
    const a = Math.min(1, x / 5);
    const b = 1 - 0.55 * ss(x, AGE_X - 2, LIFE_LEN);
    return (0.35 + 0.65 * a) * b;
  };

  // ------------------------------------------------ star (the birth, ref 1's left)
  const star = new LineBatch();
  starLines(star, r, [0, 0, 0], { rings: 26, step: 0.05, rays: 96, rayLen: 1.2, intensity: 0.9 });
  star.build(gl);
  const starDabs = new DabSet();
  for (let i = 0; i < 1100; i++) {
    const a = r.next() * 6.283, rad = 0.12 + Math.pow(r.next(), 0.7) * 1.05;
    starDabs.add({ pos: [Math.cos(a) * rad, Math.sin(a) * rad, -0.3 + r.gauss() * 0.1], size: 0.025 + r.next() * 0.05, rot: a + 1.57, aspect: 0.3 + r.next() * 0.4,
      layer: brushLayer(r.pick([BRUSH.CRACKLE, BRUSH.SMEAR, BRUSH.FLECK]), r.int(0, 2)), seed: r.next(), color: r.pick([LIN.gold, LIN.bone, LIN.ash, LIN.goldHi, LIN.amber]),
      mat: r.next() < 0.3 ? MAT.GOLD : MAT.PAINT, normal: [Math.cos(a), Math.sin(a), 1], anim: [C.starIgnite + rad * 1.2, 0.8, 0, 0] });
  }
  for (let i = 0; i < 160; i++) {
    const rad = Math.pow(r.next(), 2) * 0.2, a = r.next() * 6.283;
    starDabs.add({ pos: [Math.cos(a) * rad, Math.sin(a) * rad, 0.02], size: 0.04 + r.next() * 0.08, layer: brushLayer(BRUSH.DOT, r.int(0, 2)), seed: r.next(), color: [1, 0.85, 0.58], mat: MAT.GLOW, anim: [C.starIgnite - 0.3, 0.4, 0, 0] });
  }
  starDabs.build(gl, [0, 0, -1]);

  // ------------------------------------------------ the life-ribbon (silk)
  const silk = ribbonFromCurve({ centre: curve, width: (s) => 0.06 + 0.2 * env(s * LIFE_LEN) * Math.min(1, s * 12), twist: (s) => s * 26, samples: 1600, length: LIFE_LEN });
  silk.build(gl);
  const strands = [];
  for (let k = 0; k < 3; k++) {
    const ph = r.next() * 6, amp = 0.05 + 0.05 * k;
    const c2 = (s) => {
      const c = curve(s), x = s * LIFE_LEN;
      return [c[0], c[1] + amp * Math.sin(x * 2.2 + ph), c[2] + amp * Math.cos(x * 1.7 + ph)];
    };
    const rb = ribbonFromCurve({ centre: c2, width: (s) => 0.025 + 0.05 * env(s * LIFE_LEN), twist: (s) => s * (40 + 11 * k), samples: 1400, length: LIFE_LEN });
    rb.build(gl);
    strands.push(rb);
  }

  // ------------------------------------------------ paint along the life
  const paint = new DabSet();
  const addPaint = (x, set = paint, opts = {}) => {
    const c = lifeAt(x), t = tangentOf(curve, x / LIFE_LEN);
    const e = env(x) * (opts.thick ?? 1);
    const up = r.next() < 0.6;
    const side = (up ? 1 : -0.7) * Math.abs(r.gauss()) * 0.6 * e;
    const z = r.gauss() * 0.34 * e;
    const nrm = [-t[1], t[0], 0];
    const off = [nrm[0] * side + r.gauss() * 0.04, nrm[1] * side, z];
    const edge = Math.min(1, Math.abs(side) / (0.6 * e + 0.02));
    const size = (0.05 + 0.13 * Math.pow(r.next(), 1.6)) * (1 - 0.5 * edge) * (0.75 + 0.25 * e);
    const kind = r.weighted([3, 3, 2, 2, 1]);
    set.add({
      pos: [c[0] + off[0], c[1] + off[1], c[2] + off[2]], size, rot: r.gauss() * 0.25, aspect: 0.35 + r.next() * 0.35,
      layer: brushLayer([BRUSH.BLOB2, BRUSH.SMEAR, BRUSH.CRACKLE, BRUSH.BLOB, BRUSH.STROKE][kind], r.int(0, 2)), seed: r.next(), color: LIN.gold,
      mat: r.next() < 0.05 ? MAT.GOLD : MAT.PAINT, normal: [r.gauss() * 0.2, side * 1.6 / (e + 0.05) + r.gauss() * 0.2, 0.8 + z * 1.2],
      tangent: [t[0], t[1] + side * 0.8, 0], anim: [(opts.time ?? timeOfX)(x) + r.next() * 0.25, off[0], off[1], off[2]],
    });
  };
  for (let i = 0; i < 52000; i++) {
    // density follows the life: rich in childhood and love, sparse in age
    let x = r.next() * LIFE_LEN;
    if (x > AGE_X && r.next() < 0.45) x = r.next() * AGE_X;
    addPaint(x);
  }
  // the love bloom: a burst of crimson where the two lives meet
  for (let i = 0; i < 2600; i++) addPaint(MEET_X + r.gauss() * 0.9, paint, { thick: 1.5 });
  paint.build(gl, [0, 0, -1]);

  // drips, chips and slabs hanging under the paint
  const drips = new DabSet();
  for (let i = 0; i < 1500; i++) {
    const x = r.next() * LIFE_LEN;
    const c = lifeAt(x), e = env(x);
    const top = c[1] - 0.12 - 0.3 * e * r.next();
    const age = x > AGE_X ? 1.6 : 1;
    const len = (0.06 + Math.pow(r.next(), 2.6) * 1.2 * age) * (0.5 + e);
    const ta = timeOfX(x) + 0.5 + r.next() * 1.5;
    const z = c[2] + r.gauss() * 0.28 * e;
    const k = r.next();
    if (k < 0.72) {
      drips.add({ pos: [x, top, z], size: len, aspect: 0.006 + Math.pow(r.next(), 2) * 0.03, layer: brushLayer(BRUSH.DRIP, r.int(0, 2)), seed: r.next(), color: LIN.gold, anim: [ta, len, 2 + r.next() * 5, 0], normal: [0, 0, 1] });
    } else if (k < 0.88) {
      const n = 2 + r.int(0, 4);
      let y = top;
      const w = 0.012 + r.next() * 0.026;
      for (let j = 0; j < n; j++) {
        const h = w * (1.2 + r.next() * 2.5);
        drips.add({ pos: [x, y, z], size: h, aspect: w / h, layer: brushLayer(BRUSH.RECT, r.int(0, 2)), seed: r.next(), color: LIN.gold, anim: [ta + j * 0.4, h, 0.3, 0], normal: [0, 0, 1] });
        y -= h * 2 + 0.01 + r.next() * 0.06;
      }
    } else {
      drips.add({ pos: [x, top, z], size: len * 0.8, aspect: 0.06 + r.next() * 0.1, layer: brushLayer(BRUSH.SLAB, r.int(0, 2)), seed: r.next(), color: LIN.gold, anim: [ta, len * 0.8, 1.5, 0], normal: [0, 0, 1] });
    }
  }
  // tall grey slabs of old age, above and below (ref 1's right side)
  for (let i = 0; i < 70; i++) {
    const x = AGE_X + 1 + r.next() * (LIFE_LEN - AGE_X - 1);
    const c = lifeAt(x);
    const h = 0.25 + r.next() * 0.8;
    const above = r.next() < 0.55;
    const top = above ? c[1] + 0.5 + r.next() * 0.8 + h * 2 : c[1] - 0.4;
    drips.add({ pos: [x, top, c[2] - 0.3 + r.gauss() * 0.4], size: h, aspect: 0.07 + r.next() * 0.12, layer: brushLayer(BRUSH.SLAB, r.int(0, 2)), seed: r.next(), color: r.pick([LIN.bone, LIN.ash, [0.55, 0.56, 0.58]]),
      anim: [timeOfX(x) - 0.5, h, 0.6, 0], normal: [0, 0, 1], extra: [1, 0, 0, 0] });
  }
  drips.build(gl, [0, 0, -1]);

  // spray: specks thrown out as the present passes
  const spray = new DabSet();
  for (let i = 0; i < 9000; i++) {
    const x = r.next() * LIFE_LEN, c = lifeAt(x), e = env(x);
    spray.add({ pos: [c[0], c[1], c[2]], size: 0.004 + Math.pow(r.next(), 3) * 0.022, layer: brushLayer(r.next() < 0.7 ? BRUSH.DOT : BRUSH.FLECK, r.int(0, 2)), seed: r.next(),
      color: r.pick([LIN.goldHi, LIN.bone, LIN.gold, LIN.amber]), mat: MAT.GOLD,
      anim: [timeOfX(x) + r.next() * 0.3, r.gauss() * 0.5, (r.gauss() * 0.9 + 0.5) * e + 0.2, r.gauss() * 0.6] });
  }
  spray.build(gl, [0, 0, -1]);

  // ------------------------------------------------ the partner
  const partnerTime = (x) => (x >= MEET_X ? timeOfX(x) : C.loveMeet - 4.5 + ((x - PARTNER_X0) / (MEET_X - PARTNER_X0)) * 4.5);
  const pcurve = (s) => partnerAt(PARTNER_X0 + s * (LOSS_X - PARTNER_X0));
  const psilk = ribbonFromCurve({ centre: pcurve, width: (s) => 0.05 + 0.1 * Math.sin(Math.min(1, s * 4) * Math.PI / 2), twist: (s) => s * 14, samples: 900, length: LOSS_X - PARTNER_X0 });
  psilk.build(gl);
  const ppaint = new DabSet();
  for (let i = 0; i < 16000; i++) {
    const x = PARTNER_X0 + r.next() * (LOSS_X - PARTNER_X0);
    const c = partnerAt(x);
    const s0 = (x - PARTNER_X0) / (LOSS_X - PARTNER_X0);
    const t = tangentOf(pcurve, s0);
    const side = r.gauss() * 0.22, z = r.gauss() * 0.18;
    const off = [-t[1] * side, t[0] * side, z];
    ppaint.add({
      pos: [c[0] + off[0], c[1] + off[1], c[2] + off[2]], size: 0.04 + 0.1 * Math.pow(r.next(), 1.7), rot: r.gauss() * 0.25, aspect: 0.3 + r.next() * 0.35,
      layer: brushLayer(r.pick([BRUSH.BLOB2, BRUSH.SMEAR, BRUSH.STROKE, BRUSH.CRACKLE]), r.int(0, 2)), seed: r.next(), color: paletteAt(PAL.PARTNER, s0 * 0.7 + r.next() * 0.25),
      mat: MAT.PAINT, normal: [0, side * 3, 1], tangent: [t[0], t[1], 0], anim: [partnerTime(x) + r.next() * 0.25, off[0], off[1], off[2]],
    });
  }
  ppaint.build(gl, [0, 0, -1]);

  // ------------------------------------------------ the child
  const cstar = new LineBatch();
  starLines(cstar, r, [0, 0, 0], { rings: 9, step: 0.035, r0: 0.03, rays: 24, rayLen: 0.25, intensity: 1 });
  cstar.build(gl);
  const cglow = new DabSet();
  for (let i = 0; i < 40; i++) cglow.add({ pos: [r.gauss() * 0.03, r.gauss() * 0.03, 0], size: 0.03 + r.next() * 0.05, layer: brushLayer(BRUSH.DOT, 0), seed: r.next(), color: [1, 0.85, 0.6], mat: MAT.GLOW, anim: [0, 0, 0, 0] });
  cglow.build(gl);
  const ccurve = (s) => childAt(s * 1.6);
  const csilk = ribbonFromCurve({ centre: ccurve, width: (s) => 0.03 + 0.05 * s, twist: (s) => s * 9, samples: 300, length: 10 });
  csilk.build(gl);
  const childT = (u) => C.childSpark + (u / 1.6) * 5.5;
  const cpaint = new DabSet();
  for (let i = 0; i < 2600; i++) {
    const u = r.next() * 1.6, c = childAt(u);
    const off = [r.gauss() * 0.05, r.gauss() * 0.12, r.gauss() * 0.1];
    cpaint.add({ pos: [c[0] + off[0], c[1] + off[1], c[2] + off[2]], size: 0.03 + 0.06 * Math.pow(r.next(), 1.5), rot: r.gauss() * 0.3, aspect: 0.35 + r.next() * 0.3,
      layer: brushLayer(r.pick([BRUSH.BLOB2, BRUSH.SMEAR, BRUSH.CRACKLE]), r.int(0, 2)), seed: r.next(), color: paletteAt(PAL.CHILD, r.next() * 0.6), mat: MAT.PAINT,
      normal: [0, 0.3, 1], tangent: [1, 0.9, 0], anim: [childT(u) + r.next() * 0.2, off[0], off[1], off[2]] });
  }
  cpaint.build(gl, [0, 0, -1]);

  // ------------------------------------------------ the future, drawn in gold
  // u runs backward (1 at birth, 0 at the end) so reveal = 1 - present hides the past
  const future = new LineBatch();
  const futurePts = (f, x0, x1, n) => Array.from({ length: n + 1 }, (_, i) => f(x0 + ((x1 - x0) * i) / n));
  const offY = (f, dy) => (x) => {
    const p = f(x);
    return [p[0], p[1] + dy, p[2]];
  };
  for (const dy of [-0.17, 0.17]) future.polyline(futurePts(offY(lifeAt, dy), 0, LIFE_LEN, 900), { width: 0.9, intensity: 0.75, dash: [0.0025, 0.55, 0], u0: 1, u1: 0 });
  // ruler ticks: one per year of the life (the AI counts)
  for (let k = 1; k < 80; k++) {
    const x = (k / 80) * LIFE_LEN, c = lifeAt(x), u = 1 - x / LIFE_LEN;
    future.line([c[0], c[1] - 0.24, c[2]], [c[0], c[1] - (k % 10 === 0 ? 0.42 : 0.3), c[2]], { width: 0.9, intensity: k % 10 === 0 ? 0.9 : 0.5, u0: u, u1: u });
  }
  // markers of what will happen: the partner's end, our end
  const mark = (p, rad, u) => future.circle(p, rad, { width: 1.1, intensity: 0.9, u0: u, u1: u, segments: 64 });
  const pe = partnerAt(LOSS_X);
  mark(pe, 0.12, 1 - LOSS_X / LIFE_LEN);
  const le = lifeAt(LIFE_LEN);
  mark(le, 0.22, 0.0001);
  mark(le, 0.14, 0.0001);
  future.build(gl);
  // the partner's future (only until its end)
  const pfuture = new LineBatch();
  pfuture.polyline(futurePts(partnerAt, MEET_X, LOSS_X, 300), { width: 0.9, intensity: 0.7, dash: [0.006, 0.5, 0], u0: 1, u1: 0 });
  pfuture.build(gl);
  // the child's future continues beyond the film
  const cfuture = new LineBatch();
  cfuture.polyline(Array.from({ length: 201 }, (_, i) => childAt(1.6 + i * 0.03)), { width: 0.9, intensity: 0.8, dash: [0.008, 0.5, 0], intensity1: 0 });
  cfuture.build(gl);
  // the future bead waiting at the end
  const endBead = new DiscSet();
  endBead.add({ pos: le, r: 0.05, type: DISC.BEAD, seed: 2 });
  endBead.build(gl);

  // ------------------------------------------------ midpoint: three great arcs
  const arcs = [];
  const arc = (a, b, lift) => {
    const L = new LineBatch();
    const n = 200;
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u + Math.sin(u * Math.PI) * lift, z = a[2] + (b[2] - a[2]) * u - Math.sin(u * Math.PI) * lift * 0.3;
      pts.push([x, y, z]);
    }
    L.polyline(pts, { width: 1.4, intensity: 1, hi: 0.5 });
    L.build(gl);
    return L;
  };
  arcs.push({ L: arc([0, 0, 0], childAt(0.9), 3.2), t0: C.arcsDraw[0] });
  arcs.push({ L: arc(partnerAt(MEET_X), partnerAt(LOSS_X), 2.2), t0: C.arcsDraw[0] + 0.9 });
  arcs.push({ L: arc(lifeAt(LIFE_LEN), [0, 0, 0], 7.5), t0: C.arcsDraw[0] + 1.8 });

  // ------------------------------------------------ year threads with beads
  const years = new LineBatch();
  const ydiscs = new DiscSet();
  for (let x = 2.2; x < LIFE_LEN + 3; x += 1.35 + r.next() * 0.9) {
    const z = r.next() < 0.3 ? 0.9 + r.next() * 1.2 : -0.6 - r.next() * 3.2;
    beadThread(years, ydiscs, r, { x: x + r.gauss() * 0.2, z, y0: -4.5, y1: 5.5, n: 5 + r.int(0, 4), rmin: 0.014, rmax: 0.045, kinds: [2, 4, 1, 2, 3], intensity: 0.7 });
  }
  years.build(gl);
  // moons
  for (const x of [5.5, 12.4, 19.8, 27.2, 36.5, 43.8]) ydiscs.add({ pos: [x, 1.2 + r.next() * 0.9, -0.8 - r.next()], r: 0.1 + r.next() * 0.09, type: DISC.MOON, p1: r.next() * 1.4 - 0.7, p2: r.sign(), seed: r.next() * 9 });
  ydiscs.build(gl);

  // ------------------------------------------------ items
  function items(t) {
    const out = [];
    if (t < 35.8) return out;
    const X = presentX(t);
    const M = (tag, f) => ({ kind: 'matter', tag, ...f });
    const Lk = (tag, f) => ({ kind: 'line', tag, draw: f });
    const endFade = 1 - ss(t, 104, 110);
    // star
    if (t < 75) {
      const rv = prog(t, C.starIgnite, C.starIgnite + 1.6);
      out.push(Lk('star', (f, R) => R.lines.draw(star, { model: ID, reveal: rv, revealHead: 1.5, alpha: 1 - 0.6 * ss(t, 55, 70) })));
      out.push(M('star', { center: [0, 0, -0.2], draw: (f, R) => R.dabs.draw(starDabs, ANIM_FADEIN, f, { jitter: 0.6, torn: 0.3, alpha: 1 - 0.5 * ss(t, 60, 72) }) }));
    }
    // thread through the star (continues the prologue's thread)
    // silk
    const head = X / LIFE_LEN;
    if (t >= C.ribbonLaunch - 0.2) {
      out.push(M('silk', { center: [Math.max(0, X - 3), 0, 0.1], bias: -0.05, draw: (f, R) => {
        R.silk.draw(silk, f, { colA: [0.95, 0.8, 0.6], colB: [1.8, 1.6, 1.25], fibres: 18, alpha: 0.95 * endFade, reveal: [0, head + 0.0005, 0.004, 0.0001], flutter: [0.02, 4, 1.2, 0] });
        strands.forEach((s, k) => R.silk.draw(s, f, { colA: [0.9, 0.8, 0.65], colB: [1.6, 1.45, 1.2], fibres: 8, alpha: 0.65 * endFade, reveal: [0, head, 0.003, 0.0001], flutter: [0.015, 6, 1.5, k] }));
      } }));
    }
    // paint, drips, spray
    const field = { mosScale: 16, cellMix: 1, field: [1, 0, 1, 0], fieldN: [0.9, 0.05, 0.16, PAL.LIFE], facet: 0.5, torn: 0.7, jitter: 1,
      remap: [[0, 3, MEET_X, CHILD_X, LOSS_X, AGE_X, 43, LIFE_LEN + 2], [0.02, 0.1, 0.3, 0.42, 0.57, 0.69, 0.86, 0.95]], p0: [1, 0, 0, 0], glowAmt: 0.6 };
    out.push(M('paint', { center: [X - 2, 0, 0], draw: (f, R) => R.dabs.draw(paint, ANIM_ERUPT, f, { ...field, alpha: endFade }) }));
    out.push(M('drips', { center: [X - 2, -1.2, 0], bias: 0.3, draw: (f, R) => R.dabs.draw(drips, ANIM_DRIP, f, { ...field, cellMix: 0.9, torn: 0.3, crack: 0.8, alpha: endFade }) }));
    out.push(M('spray', { center: [X - 2, 0, 0.5], bias: -0.3, draw: (f, R) => R.dabs.draw(spray, ANIM_SPRAY, f, { jitter: 0.5, torn: 0, alpha: endFade }) }));
    // partner
    if (t > C.loveMeet - 5) {
      const grief = 1 - 0.55 * ss(t, C.partnerFray, C.partnerFray + 6);
      out.push(M('partner', { center: [Math.min(X, LOSS_X) - 2, 0.3, 0], draw: (f, R) => {
        const ph = Math.min(1, (Math.min(X, LOSS_X) - PARTNER_X0) / (LOSS_X - PARTNER_X0));
        const pHead = t < C.loveMeet ? prog(t, C.loveMeet - 4.5, C.loveMeet) * ((MEET_X - PARTNER_X0) / (LOSS_X - PARTNER_X0)) : ph;
        const tail = ss(t, C.partnerFray + 0.5, C.partnerFray + 4) * 0.15;
        R.silk.draw(psilk, f, { colA: [0.55, 0.45, 0.75], colB: [1.2, 1.1, 1.5], fibres: 12, alpha: 0.9 * grief * endFade, reveal: [0, Math.max(0.0005, pHead - tail * 0), 0.01, 0.0001], flutter: [0.02, 5, 1.1, 2] });
      } }));
      out.push(M('partner', { center: [Math.min(X, LOSS_X) - 2, 0.3, 0.05], draw: (f, R) => R.dabs.draw(ppaint, ANIM_ERUPT, f, { mosScale: 18, cellMix: 0.55, field: [1, 0, 0.03, 0.1], fieldN: [1.2, 0.06, 0.2, PAL.PARTNER], jitter: 0.9, torn: 0.6, p0: [0.8, 0, 0, 0], p1: [LOSS_X - 1.6, C.partnerFray, 0, 0], alpha: grief * endFade, glowAmt: 0.5 }) }));
      if (t < C.partnerFray + 1) out.push(Lk('future', (f, R) => R.lines.draw(pfuture, { model: ID, reveal: 1 - (Math.max(X, MEET_X) - MEET_X) / (LOSS_X - MEET_X), alpha: 0.9 * ss(t, C.loveMeet - 2, C.loveMeet) })));
    }
    // child
    if (t > C.childSpark - 0.2) {
      const u = Math.min(1.6, ((t - C.childSpark) / 5.5) * 1.6);
      const cp = childAt(u);
      const cm = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, cp[0], cp[1], cp[2], 1];
      const ca = ss(t, C.childSpark - 0.2, C.childSpark + 0.3) * (1 - ss(t, 76, 80));
      out.push(Lk('child', (f, R) => R.lines.draw(cstar, { model: new Float32Array(cm), reveal: prog(t, C.childSpark, C.childSpark + 0.8), revealHead: 1.5, alpha: ca })));
      out.push(M('child', { center: cp, bias: -0.1, draw: (f, R) => R.dabs.draw(cglow, ANIM_GLOWN, f, { model: new Float32Array(cm), alpha: ca, p0: [1.4, 0, 0, 0] }) }));
      out.push(M('child', { center: cp, draw: (f, R) => {
        R.silk.draw(csilk, f, { colA: [1, 0.8, 0.5], colB: [1.8, 1.5, 1.1], fibres: 8, alpha: 0.8 * ca, reveal: [0, u / 1.6, 0.02, 0.0001], flutter: [0.01, 6, 1.5, 3] });
      } }));
      out.push(M('child', { center: cp, draw: (f, R) => R.dabs.draw(cpaint, ANIM_ERUPT, f, { mosScale: 20, cellMix: 0.4, field: [1, 0, 0.05, 0.05], fieldN: [1, 0.05, 0.2, PAL.CHILD], jitter: 0.8, torn: 0.6, p0: [1, 0, 0, 0], alpha: ca }) }));
      out.push(Lk('future', (f, R) => R.lines.draw(cfuture, { model: ID, alpha: 0.85 * ss(t, C.childSpark + 1, C.childSpark + 3) * (1 - ss(t, 78, 82)) })));
    }
    // the future drawing
    out.push(Lk('future', (f, R) => R.lines.draw(future, { model: ID, reveal: 1 - X / LIFE_LEN, alpha: 0.75 * ss(t, C.ribbonLaunch, C.ribbonLaunch + 2) * endFade * (1 - 0.3 * ss(t, 66, 70)) })));
    if (t < 92) out.push(M('future', { center: lifeAt(LIFE_LEN), draw: (f, R) => R.discs.draw(endBead, f, { alpha: 0.9 * ss(t, 38, 40) * (1 - ss(t, 88, 91)), core: 0.2 }) }));
    // midpoint arcs
    for (const a of arcs) {
      if (t < a.t0 || t > 76) continue;
      out.push(Lk('arcs', (f, R) => R.lines.draw(a.L, { model: ID, reveal: prog(t, a.t0, a.t0 + 1.6), revealHead: 2, alpha: 1 - ss(t, 70.5, 74) })));
    }
    // years
    out.push(Lk('years', (f, R) => R.lines.draw(years, { model: ID, alpha: 0.75 * ss(t, 37, 40) * (1 - ss(t, 100, 108)) })));
    out.push(M('years', { center: [X, 0, -1.5], bias: 0.2, draw: (f, R) => R.discs.draw(ydiscs, f, { alpha: ss(t, 37, 40) * (1 - ss(t, 100, 108)) }) }));
    return out;
  }
  return { items };
}

const ANIM_FADEIN = `
void animate(inout Dab d) {
  float a = uTime - aAnim.x;
  d.alpha *= uAlpha * smoothstep(0.0, max(aAnim.y, 0.05), a);
  if (aColor.a * 255.0 > 1.5 && aColor.a * 255.0 < 2.5) d.emissive = 2.0;
}`;
const ANIM_GLOWN = `
void animate(inout Dab d) {
  d.alpha *= uAlpha;
  d.emissive = uP0.x;
}`;
