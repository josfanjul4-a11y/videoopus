// Procedural generators shared by the movements. All deterministic (seeded).
import { BRUSH, brushLayer } from './brushes.js';
import { MAT } from './dabs.js';
import { DISC } from './discs.js';
import { LIN } from './palette.js';

const norm = (v) => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};

// Numerical tangent of a curve.
export function tangentOf(curve, s, eps = 1e-3) {
  const a = curve(Math.max(0, s - eps)), b = curve(Math.min(1, s + eps));
  return norm([b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
}

// Flow-aligned masses of paint around a curve (the life-ribbon's paint).
// o: { curve, s0, s1, count, thick(s) (half-height), depth(s), upBias, sizeMin, sizeMax, goldFrac, anim(s, i) -> [4], extra(s) -> [4] }
export function paintAlongCurve(set, r, o) {
  const s0 = o.s0 ?? 0, s1 = o.s1 ?? 1;
  for (let i = 0; i < o.count; i++) {
    const s = s0 + (s1 - s0) * r.next();
    const c = o.curve(s);
    const t = tangentOf(o.curve, s);
    const thick = o.thick(s), depth = o.depth ? o.depth(s) : thick * 0.6;
    const upBias = o.upBias ?? 0.58;
    const up = r.next() < upBias;
    const side = (up ? 1 : -1) * Math.abs(r.gauss()) * thick * (up ? 1 : 0.7);
    const z = r.gauss() * depth;
    // a vertical offset in the plane perpendicular to the tangent
    const nrm = norm([-t[1], t[0], 0]);
    const pos = [c[0] + nrm[0] * side, c[1] + nrm[1] * side, c[2] + z];
    const edge = Math.min(1, Math.abs(side) / (thick + 0.02));
    const size = ((o.sizeMin ?? 0.06) + ((o.sizeMax ?? 0.2) - (o.sizeMin ?? 0.06)) * Math.pow(r.next(), 1.6)) * (1 - 0.55 * edge);
    const kind = r.weighted(o.brushW ?? [3, 3, 2, 2, 1]);
    const layer = [BRUSH.BLOB2, BRUSH.SMEAR, BRUSH.CRACKLE, BRUSH.BLOB, BRUSH.STROKE][kind];
    const lift = side * 0.9 * (0.5 + r.gauss() * 0.4);
    set.add({
      pos, size, rot: r.gauss() * 0.25, aspect: 0.35 + r.next() * 0.35,
      layer: brushLayer(layer, r.int(0, 2)), seed: r.next(), color: o.color ?? LIN.gold,
      mat: r.next() < (o.goldFrac ?? 0.05) ? MAT.GOLD : MAT.PAINT,
      normal: [r.gauss() * 0.2, side * 2.0 / (thick + 0.05) * 0.5 + r.gauss() * 0.2, 0.8 + z * 1.2],
      tangent: [t[0], t[1] + lift, 0],
      anim: o.anim ? o.anim(s, i, side) : [0, 0, 0, 0],
      extra: o.extra ? o.extra(s, side) : [s, 0, 0, 0],
    });
  }
}

// Splash tongues thrown up from a curve, breaking into flakes at their tips.
export function splashTongues(set, r, o) {
  for (let k = 0; k < o.count; k++) {
    const s = (o.s0 ?? 0) + ((o.s1 ?? 1) - (o.s0 ?? 0)) * r.next();
    const c = o.curve(s);
    const t = tangentOf(o.curve, s);
    const ang = Math.atan2(t[1], t[0]) + 0.4 + r.next() * 0.9;
    const len = (o.len ?? 0.8) * (0.5 + r.next());
    const n = 40 + r.int(0, o.per ?? 80);
    for (let i = 0; i < n; i++) {
      const u = Math.pow(r.next(), 0.8);
      const a = ang + u * 0.8 * (r.next() - 0.3);
      const pos = [c[0] + Math.cos(a) * len * u * 0.8 + t[0] * u * 0.3, c[1] + (o.lift ?? 0.15) + Math.sin(a) * len * u, c[2] + r.gauss() * 0.2];
      set.add({
        pos, size: (0.04 + 0.06 * r.next()) * (1 - u * 0.75) * (o.scale ?? 1), rot: r.gauss() * 0.4, aspect: 0.4 + r.next() * 0.4,
        layer: brushLayer(u > 0.7 ? BRUSH.FLECK : r.pick([BRUSH.BLOB2, BRUSH.CRACKLE, BRUSH.SMEAR]), r.int(0, 2)), seed: r.next(),
        color: o.color ?? LIN.gold, mat: r.next() < 0.1 ? MAT.GOLD : MAT.PAINT, normal: [0, 0.3, 1], tangent: [Math.cos(a), Math.sin(a), 0],
        anim: o.anim ? o.anim(s, i, u) : [0, 0, 0, 0], extra: [s, u, 0, 0],
      });
    }
  }
}

// Drips hanging under a curve: thin streaks, columns of chips, slabs.
export function dripsBelow(set, r, o) {
  for (let i = 0; i < o.count; i++) {
    const s = (o.s0 ?? 0) + ((o.s1 ?? 1) - (o.s0 ?? 0)) * r.next();
    const c = o.curve(s);
    const env = o.env ? o.env(s) : 1;
    const top = c[1] - (o.gap ?? 0.12) - 0.25 * env * r.next();
    const len = (0.08 + Math.pow(r.next(), 2.6) * (o.maxLen ?? 1.6)) * env;
    const k = r.next();
    const x = c[0] + r.gauss() * 0.05, z = c[2] + r.gauss() * (o.depth ?? 0.25);
    const anim = o.anim ? o.anim(s, len) : [0, 0, 0, 0];
    if (k < (o.streak ?? 0.74)) {
      set.add({ pos: [x, top - len * 0.5, z], size: len * 0.5, aspect: 0.006 + Math.pow(r.next(), 2) * 0.035, layer: brushLayer(BRUSH.DRIP, r.int(0, 2)), seed: r.next(), color: o.color ?? LIN.gold, anim, extra: [s, 1, 0, 0], normal: [0, 0, 1] });
    } else if (k < (o.streak ?? 0.74) + (o.chips ?? 0.14)) {
      const n = 2 + r.int(0, 4);
      let y = top;
      const wdt = 0.015 + r.next() * 0.03;
      for (let j = 0; j < n; j++) {
        const hgt = wdt * (1.2 + r.next() * 2.5);
        set.add({ pos: [x, y - hgt, z], size: hgt, aspect: wdt / hgt, layer: brushLayer(BRUSH.RECT, r.int(0, 2)), seed: r.next(), color: o.color ?? LIN.gold, anim, extra: [s, 2, 0, 0], normal: [0, 0, 1] });
        y -= hgt * 2 + 0.01 + r.next() * 0.06;
      }
    } else {
      set.add({ pos: [x, top - len * 0.4, z], size: len * 0.4, aspect: 0.06 + r.next() * 0.1, layer: brushLayer(BRUSH.SLAB, r.int(0, 2)), seed: r.next(), color: o.color ?? LIN.gold, anim, extra: [s, 3, 0, 0], normal: [0, 0, 1] });
    }
  }
}

// Fine spray of specks and flakes around a curve.
export function spray(set, r, o) {
  for (let i = 0; i < o.count; i++) {
    const s = (o.s0 ?? 0) + ((o.s1 ?? 1) - (o.s0 ?? 0)) * r.next();
    const c = o.curve(s);
    const pos = [c[0] + r.gauss() * (o.spreadX ?? 0.1), c[1] + r.gauss() * (o.spread ?? 0.55) + (o.lift ?? 0.1), c[2] + r.gauss() * (o.depth ?? 0.6)];
    set.add({
      pos, size: (o.min ?? 0.005) + Math.pow(r.next(), 3) * (o.max ?? 0.03), layer: brushLayer(r.next() < 0.7 ? BRUSH.DOT : BRUSH.FLECK, r.int(0, 2)),
      seed: r.next(), color: r.pick(o.colors ?? [LIN.goldHi, LIN.bone, LIN.gold, LIN.amber]), mat: MAT.GOLD,
      anim: o.anim ? o.anim(s, i) : [0, 0, 0, 0], extra: [s, 0, 0, 0],
    });
  }
}

// The star of ref 1: dozens of uneven concentric hairline circles, fine rays.
export function starLines(batch, r, c, o = {}) {
  let rad = o.r0 ?? 0.08;
  const rings = o.rings ?? 22;
  const plane = o.plane ?? { a: [1, 0, 0], b: [0, 1, 0] };
  for (let i = 0; i < rings; i++) {
    const partial = r.next() < 0.3;
    batch.circle(c, rad, {
      axisA: plane.a, axisB: plane.b, width: 0.9 + r.next() * 0.5, intensity: (0.35 + r.next() * 0.65) * (o.intensity ?? 1),
      start: partial ? r.next() * 6.28 : Math.PI / 2, sweep: partial ? -(1 + r.next() * 4) : -Math.PI * 2,
      dash: r.next() < 0.18 ? [0.004 + r.next() * 0.01, 0.4, r.next()] : [0, 1, 0], hi: r.next() * 0.5,
    });
    rad += (o.step ?? 0.07) * (0.4 + r.next() * 1.6) * (1 + i * 0.04);
  }
  const rays = o.rays ?? 64;
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2 + r.gauss() * 0.03;
    const r0 = (o.rayIn ?? 0.05) + r.next() * 0.1, r1 = r0 + (o.rayLen ?? 0.8) * Math.pow(r.next(), 0.7);
    const ca = Math.cos(a), sa = Math.sin(a);
    const p0 = [c[0] + (plane.a[0] * ca + plane.b[0] * sa) * r0, c[1] + (plane.a[1] * ca + plane.b[1] * sa) * r0, c[2] + (plane.a[2] * ca + plane.b[2] * sa) * r0];
    const p1 = [c[0] + (plane.a[0] * ca + plane.b[0] * sa) * r1, c[1] + (plane.a[1] * ca + plane.b[1] * sa) * r1, c[2] + (plane.a[2] * ca + plane.b[2] * sa) * r1];
    batch.line(p0, p1, { width: 0.7 + r.next() * 0.4, intensity: 0.25 + r.next() * 0.4, intensity1: 0.0 });
  }
}

// A hanging thread with beads, coins, pearls, moons and tags.
// o: { x, z, y0, y1, n, kinds: weights [coin, pearl, moon, tag, dot], rmin, rmax, t0, sway }
export function beadThread(lines, discs, r, o) {
  const pts = [];
  const steps = Math.max(2, Math.round((o.y1 - o.y0) * 6));
  for (let k = 0; k <= steps; k++) pts.push([o.x, o.y0 + ((o.y1 - o.y0) * k) / steps, o.z]);
  lines.polyline(pts, { width: o.width ?? 1.0, intensity: o.intensity ?? 0.8, dash: o.dash ?? [0, 1, 0], hi: o.hi ?? 0.2 });
  const n = o.n ?? 6;
  for (let i = 0; i < n; i++) {
    const y = o.y0 + (o.y1 - o.y0) * (r.next() * 0.9 + 0.05);
    const kind = r.weighted(o.kinds ?? [2, 4, 1, 1, 3]);
    const type = [DISC.COIN, DISC.PEARL, DISC.MOON, DISC.TAG, DISC.DOT][kind];
    const base = type === DISC.COIN ? 1.8 : type === DISC.DOT ? 0.5 : type === DISC.MOON ? 1.3 : 1.0;
    const rr = ((o.rmin ?? 0.012) + r.next() * ((o.rmax ?? 0.04) - (o.rmin ?? 0.012))) * base;
    discs.add({ pos: [o.x, y, o.z], r: rr, type, p1: r.next() * 1.6 - 0.8, p2: r.sign(), seed: r.next() * 10, t0: o.t0 ?? -1e9, fade: o.fade ?? 0.5, sway: o.sway ?? 0, phase: r.next() * 6.28 });
  }
}

// A botanical gold tree (ref 3): tapered, curving, branching; growth order is
// kept so the line renderer can reveal it as it grows.
// o: { root, dir, len, depth, speed, bend:[x,y,z] (tropism), t0 }
export function growTree(r, o) {
  const branches = [], buds = [];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sc = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  function grow(p, dir, len, depth, t0, width) {
    const n = Math.max(5, Math.round(len * 26));
    const pts = [p.slice()], dirs = [dir.slice()];
    let d = dir.slice(), cur = p.slice();
    for (let i = 1; i <= n; i++) {
      d = norm(add(add(d, sc(o.bend ?? [0, 0, 0], 1 / n)), [r.gauss() * 0.05, r.gauss() * 0.05, r.gauss() * 0.04]));
      cur = add(cur, sc(d, len / n));
      pts.push(cur.slice());
      dirs.push(d.slice());
    }
    const t1 = t0 + len / o.speed;
    branches.push({ pts, t0, t1, w0: width, w1: Math.max(0.6, width * 0.62) });
    if (depth <= 0) {
      if (r.next() < 0.5) buds.push({ pos: cur, t: t1, size: 0.6 + r.next() * 0.6 });
      return;
    }
    const kids = depth >= 4 ? 2 + (r.next() < 0.3 ? 1 : 0) : r.int(1, 3);
    for (let k = 0; k < kids; k++) {
      const at = 0.35 + 0.6 * r.next();
      const idx = Math.max(1, Math.min(n - 1, Math.floor(at * n)));
      const pd = dirs[idx];
      const ang = (k % 2 ? 1 : -1) * (0.3 + r.next() * 0.55);
      const c = Math.cos(ang), s = Math.sin(ang);
      const nd = norm([pd[0] * c - pd[1] * s, pd[0] * s + pd[1] * c, pd[2] + r.gauss() * 0.35]);
      grow(pts[idx], nd, len * (0.58 + r.next() * 0.18), depth - 1, t0 + at * (t1 - t0), width * 0.66);
      if (r.next() < 0.22) buds.push({ pos: pts[idx], t: t0 + at * (t1 - t0), size: 0.8 + r.next() * 0.7 });
    }
  }
  grow(o.root, norm(o.dir), o.len, o.depth, o.t0 ?? 0, o.width ?? 2.6);
  let tMax = 0;
  for (const b of branches) tMax = Math.max(tMax, b.t1);
  return { branches, buds, tMax };
}
