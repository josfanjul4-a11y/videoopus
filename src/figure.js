// The old figure (movement III): a bust in profile facing −X, head raised a
// little, as if looking back along the life. Marble, smoke and gold leaf.
import { sd, sampleSurface } from './sculpt.js';
import { BRUSH, brushLayer } from './brushes.js';
import { MAT } from './dabs.js';
import { LIN } from './palette.js';
import { fbm3 } from './rng.js';

const { ellipsoid: E, capsule: C, cone: K, sphere: S, smin, smax } = sd;

// rotate p about the Z axis around pivot by angle a (inverse transform for the SDF)
function rotZ(p, piv, a) {
  const c = Math.cos(a), s = Math.sin(a);
  const x = p[0] - piv[0], y = p[1] - piv[1];
  return [piv[0] + c * x - s * y, piv[1] + s * x + c * y, p[2]];
}

export function headSDF(q) {
  let d = E(q, [0.06, 1.63, 0], [0.31, 0.33, 0.26]);
  d = smin(d, E(q, [0.17, 1.57, 0], [0.2, 0.25, 0.22]), 0.08);
  d = smin(d, E(q, [-0.14, 1.67, 0], [0.16, 0.2, 0.2]), 0.08);
  d = smin(d, E(q, [-0.1, 1.42, 0], [0.19, 0.2, 0.19]), 0.1);
  d = smin(d, E(q, [-0.06, 1.3, 0], [0.19, 0.1, 0.17]), 0.08);
  d = smin(d, E(q, [-0.236, 1.585, 0], [0.07, 0.04, 0.16]), 0.04);
  // eye sockets
  d = smax(d, -S(q, [-0.3, 1.535, 0.1], 0.05), 0.025);
  d = smax(d, -S(q, [-0.3, 1.535, -0.1], 0.05), 0.025);
  // nose: bridge to tip, and the wing
  d = smin(d, K(q, [-0.245, 1.575, 0], [-0.335, 1.445, 0], 0.03, 0.036), 0.03);
  d = smin(d, E(q, [-0.29, 1.445, 0.02], [0.045, 0.032, 0.055]), 0.02);
  // lips and chin
  d = smin(d, E(q, [-0.283, 1.368, 0], [0.042, 0.03, 0.075]), 0.02);
  d = smin(d, E(q, [-0.272, 1.326, 0], [0.036, 0.026, 0.07]), 0.02);
  d = smin(d, E(q, [-0.245, 1.245, 0], [0.066, 0.066, 0.09]), 0.04);
  // ear
  d = smin(d, E(q, [0.08, 1.5, 0.225], [0.05, 0.08, 0.035]), 0.03);
  return d;
}

export function figureSDF(p) {
  // head tilted up about the neck
  const q = rotZ(p, [0.03, 1.25, 0], 0.16);
  let d = headSDF(q);
  // neck leaning forward, into the top of the shoulders; below that the body is drapery
  d = smin(d, K(p, [0.02, 1.32, 0], [0.12, 0.9, 0], 0.098, 0.13), 0.06);
  d = smin(d, C(p, [0.1, 0.98, 0], [0.2, 0.86, 0.3], 0.08), 0.08);
  d = smin(d, C(p, [0.1, 0.98, 0], [0.2, 0.86, -0.3], 0.08), 0.08);
  d = smin(d, E(p, [0.2, 0.9, 0], [0.18, 0.12, 0.24]), 0.08);
  d = smax(d, 0.8 + 0.4 * (p[0] - 0.1) - p[1], 0.1);
  return d;
}

// Dab descriptors for the figure: strokes follow the form (cross-contours),
// colour has large-scale structure (lit bone planes, slate shadows, grey
// veins) and the gold leaf comes in clusters, as in ref 2.
export function figureDabs(r, count, offset = [0, 0, 0]) {
  const pts = sampleSurface(figureSDF, [-0.45, 0.35, -0.55], [0.55, 2.0, 0.55], count, r, (p, rr) => {
    const face = Math.exp(-(((p[0] + 0.25) / 0.14) ** 2 + ((p[1] - 1.45) / 0.22) ** 2));
    return rr.next() < 0.5 + 0.5 * Math.max(face, p[2] > -0.1 ? 1 : 0.3);
  });
  const out = [];
  for (const { p, n } of pts) {
    const face = Math.exp(-(((p[0] + 0.25) / 0.16) ** 2 + ((p[1] - 1.45) / 0.25) ** 2));
    const big = fbm3(p[0] * 1.6, p[1] * 1.6, p[2] * 1.6, 3, 11);          // large regions
    const vein = fbm3(p[0] * 4.0, p[1] * 4.0, p[2] * 4.0, 4, 5);
    const veinLine = Math.abs(Math.sin((p[0] * 1.5 + p[1] * 4.0 + vein * 5.0) * 2.2));
    const goldZone = fbm3(p[0] * 2.3 + 7, p[1] * 2.3, p[2] * 2.3, 3, 23);   // clustered gold leaf
    const gold = goldZone > 0.18 && face < 0.25 && r.next() < 0.75;
    let col = LIN.bone.map((c, i) => c * (0.92 + 0.12 * big));
    if (big < -0.12) col = col.map((c, i) => c * 0.45 + LIN.slate[i] * 0.55);
    else if (big < 0.02) col = col.map((c, i) => c * 0.75 + LIN.ash[i] * 0.25);
    if (veinLine < 0.08) col = col.map((c, i) => c * 0.35 + LIN.slate[i] * 0.4);
    // cross-contour strokes: horizontal around the form, with a slight lean
    const up = [0, 1, 0];
    let t = [up[1] * n[2] - up[2] * n[1], up[2] * n[0] - up[0] * n[2], up[0] * n[1] - up[1] * n[0]];
    const tl = Math.hypot(...t) || 1;
    t = t.map((x) => x / tl);
    t[1] += 0.25 * vein;
    const size = (0.02 + 0.045 * Math.pow(r.next(), 1.3)) * (1 - 0.75 * face) + 0.003;
    const kind = gold ? BRUSH.FLECK : r.weighted([4, 2, 2]) === 0 ? BRUSH.STROKE : r.next() < 0.5 ? BRUSH.SMEAR : BRUSH.BLOB2;
    out.push({
      pos: [p[0] + n[0] * 0.003 + offset[0], p[1] + n[1] * 0.003 + offset[1], p[2] + n[2] * 0.003 + offset[2]],
      size: gold ? size * 0.8 : size, rot: r.gauss() * 0.15, aspect: gold ? 0.85 : 0.3 + r.next() * 0.25,
      layer: brushLayer(kind, r.int(0, 2)), seed: r.next(), color: gold ? LIN.gold : col, mat: gold ? MAT.GOLD : MAT.MARBLE,
      normal: n, tangent: t,
    });
  }
  // the closed eye: a short dark curved stroke under the brow
  for (let k = 0; k < 7; k++) {
    const u = k / 6;
    const e = rotZ([-0.305 + u * 0.05, 1.525 - Math.sin(u * 3.14) * 0.008, 0.075], [0.03, 1.25, 0], -0.16);
    out.push({ pos: [e[0] + offset[0], e[1] + offset[1], e[2] + 0.02 + offset[2]], size: 0.009, rot: 0, aspect: 0.35, layer: brushLayer(BRUSH.STROKE, k % 3), seed: r.next(),
      color: [0.03, 0.035, 0.05], mat: MAT.PAINT, normal: [-0.5, 0, 0.85], tangent: [1, -0.2, 0] });
  }
  return out;
}

// Smoke and drapery streaming from the back of the figure toward +X and down
// (ref 2: the body dissolves into smoke to the right).
export function figureSmoke(r, count, offset = [0, 0, 0]) {
  const out = [];
  // strands: each strand is a chain of long thin strokes along a flowing path
  const strands = Math.max(1, Math.round(count / 26));
  for (let k = 0; k < strands; k++) {
    const y0 = 0.5 + r.next() * 1.15, z0 = r.gauss() * 0.15;
    const bright = r.next() < 0.25;
    const ph = r.next() * 6.28, amp = 0.05 + r.next() * 0.15, drop = 0.4 + r.next() * 0.9;
    for (let i = 0; i < 26; i++) {
      const u = (i + r.next()) / 26;
      const x = 0.12 + u * (1.6 + r.next() * 1.2);
      const y = y0 - u * u * drop + Math.sin(u * 5 + ph) * amp * u;
      const z = z0 + r.gauss() * 0.05 + u * r.gauss() * 0.3;
      const dy = -2 * u * drop + Math.cos(u * 5 + ph) * amp * 5 * u;
      const gold = r.next() < 0.06;
      const col = gold ? LIN.gold : bright ? LIN.bone : r.next() < 0.5 ? LIN.slate : LIN.ash;
      out.push({
        pos: [x + offset[0], y + offset[1], z + offset[2]], size: gold ? 0.012 + r.next() * 0.015 : 0.06 + u * 0.12, rot: r.gauss() * 0.05,
        aspect: gold ? 0.8 : 0.06 + r.next() * 0.1,
        layer: brushLayer(gold ? BRUSH.FLECK : bright ? BRUSH.STROKE : BRUSH.SMOKE, r.int(0, 2)), seed: r.next(),
        color: col.map((c) => c * (bright ? 1.0 : 0.6) * (1 - 0.5 * u)), mat: gold ? MAT.GOLD : MAT.SMOKE,
        tangent: [1, dy, 0], normal: [0, 0, 1], extra: [u, 0, 0, 0],
      });
    }
  }
  return out;
}

// The face's profile as a polyline (the AI's gold contour): for each height,
// the front-most point of the head in the z = 0 slice.
export function profileContour(y0 = 1.12, y1 = 1.86, steps = 90, offset = [0, 0, 0]) {
  const pts = [];
  for (let k = 0; k <= steps; k++) {
    const y = y1 - ((y1 - y0) * k) / steps;
    // march from the front (-x) toward the head until inside
    let x = -0.6;
    let found = false;
    for (let i = 0; i < 400; i++) {
      const d = figureSDF([x, y, 0]);
      if (d < 0.0015) { found = true; break; }
      x += Math.max(0.0015, d * 0.8);
      if (x > 0.2) break;
    }
    if (found) pts.push([x - 0.004 + offset[0], y + offset[1], 0.06 + offset[2]]);
  }
  return pts;
}
