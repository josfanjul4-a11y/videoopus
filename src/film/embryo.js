// The embryo (movement I, ref 3): a curled human embryo of about eight
// weeks, big head, C-shaped body, limb buds, made of warm fibrous light.
import { sd, sampleSurface } from '../sculpt.js';
import { BRUSH, brushLayer } from '../brushes.js';
import { MAT } from '../dabs.js';
import { paletteAt, PAL } from '../mosaic.js';
import { fbm3 } from '../rng.js';

const { ellipsoid: E, capsule: Cap, sphere: S, smin, smax } = sd;

// the back: a C-curve from the nape down to the tail, which curls under
const SPINE = [
  [-0.085, 0.07, 0.0, 0.1],
  [-0.15, -0.02, 0.0, 0.108],
  [-0.165, -0.12, 0.005, 0.108],
  [-0.135, -0.215, 0.01, 0.1],
  [-0.065, -0.28, 0.015, 0.088],
  [0.02, -0.3, 0.02, 0.07],
  [0.09, -0.275, 0.025, 0.052],
  [0.13, -0.225, 0.025, 0.036],
  [0.135, -0.18, 0.02, 0.024],
];

export function embryoSDF(p) {
  // the head: large, bent forward so the face looks down toward the chest
  let d = E(p, [0.045, 0.125, 0], [0.185, 0.17, 0.155]);
  d = smin(d, E(p, [0.13, 0.03, 0], [0.085, 0.085, 0.105]), 0.05);   // face and jaw, low
  d = smin(d, S(p, [0.19, 0.055, 0.0], 0.034), 0.025);               // nose bud
  d = smax(d, -S(p, [0.155, 0.11, 0.105], 0.042), 0.02);            // eye hollow
  // the curled body
  for (let i = 1; i < SPINE.length; i++) {
    const a = SPINE[i - 1], b = SPINE[i];
    d = smin(d, sd.cone(p, [a[0], a[1], a[2]], [b[0], b[1], b[2]], a[3], b[3]), 0.05);
  }
  // belly fills the inside of the curl a little
  d = smin(d, E(p, [-0.05, -0.14, 0.01], [0.1, 0.12, 0.1]), 0.06);
  // arm bud under the chin, with a hand plate
  d = smin(d, Cap(p, [-0.03, -0.06, 0.08], [0.07, -0.11, 0.12], 0.032), 0.035);
  d = smin(d, E(p, [0.09, -0.115, 0.13], [0.042, 0.03, 0.016]), 0.02);
  // leg bud near the rump, with a foot plate
  d = smin(d, Cap(p, [-0.06, -0.22, 0.08], [0.04, -0.2, 0.13], 0.034), 0.035);
  d = smin(d, E(p, [0.06, -0.195, 0.14], [0.038, 0.028, 0.016]), 0.02);
  return d;
}

// "thickness" proxy: how deep the body is here (thin parts glow redder)
function thickness(p) {
  let best = 1e9, rad = 0.18;
  const head = Math.hypot(p[0] - 0.045, p[1] - 0.125, p[2]) - 0.17;
  if (head < best) { best = head; rad = 0.18; }
  for (const [x, y, z, r] of SPINE) {
    const dd = Math.hypot(p[0] - x, p[1] - y, p[2] - z) - r;
    if (dd < best) { best = dd; rad = r; }
  }
  const limb = Math.min(Math.hypot(p[0] - 0.03, p[1] + 0.09, p[2] - 0.1), Math.hypot(p[0] - 0.0, p[1] + 0.21, p[2] - 0.1));
  if (limb < 0.07) rad = Math.min(rad, 0.04);
  return rad;
}

// dab descriptors; birth order from the centre outward (condensing light)
export function embryoDabs(r, count) {
  const pts = sampleSurface(embryoSDF, [-0.3, -0.42, -0.25], [0.28, 0.33, 0.25], count, r);
  const out = [];
  for (const { p, n } of pts) {
    const th = thickness(p);
    const deep = Math.min(1, Math.max(0, (th - 0.035) / 0.17));   // 0 thin .. 1 thick
    const vein = fbm3(p[0] * 9, p[1] * 9, p[2] * 9, 3, 3);
    const u = 0.78 - deep * 0.5 + vein * 0.12 + (r.next() - 0.5) * 0.06;
    const col = paletteAt(PAL.EMBRYO, u);
    // strokes follow the silhouette as seen from the front (cross(n, view)),
    // with a little swirl, so round forms stay round
    const va = [0.1, 0.05, 1];
    let t = [n[1] * va[2] - n[2] * va[1], n[2] * va[0] - n[0] * va[2], n[0] * va[1] - n[1] * va[0]];
    const tl = Math.hypot(...t);
    t = tl > 0.15 ? t.map((x) => x / tl) : [Math.cos(vein * 6), Math.sin(vein * 6), 0];
    const dist = Math.hypot(p[0] + 0.02, p[1] + 0.05, p[2]);
    out.push({
      pos: [p[0] + n[0] * 0.002, p[1] + n[1] * 0.002, p[2] + n[2] * 0.002],
      size: 0.016 + 0.022 * Math.pow(r.next(), 1.4) * (0.6 + 0.4 * deep),
      rot: r.gauss() * 0.25, aspect: 0.25 + r.next() * 0.3,
      layer: brushLayer(r.next() < 0.45 ? BRUSH.STROKE : BRUSH.SMEAR, r.int(0, 2)), seed: r.next(),
      color: col, mat: MAT.GLOW, normal: n, tangent: t,
      // anim: [appear time offset (by distance from the centre), emissive base, -, -]
      anim: [dist, 0.1 + 0.55 * deep * deep, 0, 0],
    });
  }
  // the eye: a dark lens under the hollow
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    out.push({ pos: [0.155 + Math.cos(a) * 0.014, 0.11 + Math.sin(a) * 0.012, 0.118], size: 0.013, layer: brushLayer(BRUSH.DOT, 0), seed: r.next(), color: [0.18, 0.04, 0.03], mat: MAT.PAINT, normal: [0.4, 0.2, 0.9], anim: [0.2, 0.0, 0, 0] });
  }
  return out;
}
