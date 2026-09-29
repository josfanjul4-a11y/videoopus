// The single continuous camera: a time-parameterised Hermite spline through
// keyframes (finite-difference tangents in time, or zero tangents at "stop"
// keys). Keys for the long tracking shot are generated from the present, so
// the camera rides the life at its own speed.

import { C } from './cues.js';
import { presentX, lifeY, FIG, MOSAIC, BEAD_END } from './world.js';

const K = [];
const key = (t, pos, target, fov = 34, ap = 0.0, stop = false) => K.push({ t, pos, target, fov, ap, stop });

// Movement 0: the bead
key(0, [0, 0, 5.0], [0, 0, 0], 30, 0.0, true);
key(5.8, [0, 0.0, 4.85], [0, 0, 0], 30, 0.0);
key(9.5, [0, 0.05, 3.4], [0, 0.0, 0], 31, 0.004);
// Movement I: orbit around the embryo
const orbit = (az, r, h, fov = 34, ap = 0.006) => [[Math.sin(az) * r, h, Math.cos(az) * r], [0, 0.02, 0], fov, ap];
for (const [t, az, r, h] of [[12.5, -0.18, 2.75, 0.22], [16, -0.2, 2.7, 0.3], [20, -0.02, 2.6, 0.32], [24, 0.18, 2.5, 0.28], [26.5, 0.3, 2.4, 0.24], [30, 0.36, 2.05, 0.18], [33, 0.38, 1.85, 0.14]]) {
  const [p, tg, fov, ap] = orbit(az, r, h);
  key(t, p, tg, fov, ap);
}
key(35.2, [0.9, 0.2, 3.6], [0.4, 0.0, 0], 34, 0.004);
// Movement II: side-on tracking at the present
const track = (t, dist = 8.3, lead = 1.6, h = 0.3, fov = 34) => {
  const x = presentX(t);
  const cx = Math.max(3.3, x - lead);
  return [[cx, h + 0.35 * lifeY(cx), dist], [cx, 0.02 + 0.45 * lifeY(cx), 0], fov, 0.0025];
};
for (let t = 38.0; t <= 60.0; t += 1.0) {
  const [p, tg, fov, ap] = track(t, 8.3 - Math.min(1, Math.max(0, (t - 50) / 4)) * 0.9);
  key(t, p, tg, fov, ap);
}
// follow the child upward, then rise to see the whole life at once
{
  const [p, tg] = track(61.5, 7.6);
  key(61.5, [p[0] + 0.5, p[1] + 0.6, p[2]], [tg[0] + 1.2, tg[1] + 1.1, 0], 35, 0.002);
}
key(63.2, [presentX(63.2) + 0.5, 2.2, 10.5], [presentX(63.2) + 1.0, 1.4, 0], 36, 0.0);
key(66.0, [22.5, 7.5, 40], [22.5, 1.0, 0], 38, 0.0);
key(68.4, [23.2, 7.0, 38.5], [23.0, 0.9, 0], 38, 0.0);
{
  const [p, tg] = track(71.0, 7.8);
  key(70.6, [p[0] + 1.5, p[1] + 0.8, p[2] + 2.5], tg, 35, 0.0015);
}
for (let t = 72.0; t <= 88.0; t += 1.0) {
  const [p, tg, fov, ap] = track(t, 7.8 - Math.min(1, Math.max(0, (t - 78) / 10)) * 0.8, 1.6 - Math.min(1, Math.max(0, (t - 82) / 6)) * 1.2);
  key(t, p, tg, fov, ap);
}
// Movement III: to the figure's three-quarter view, then close on the face
const F = FIG;
key(91.5, [F[0] - 2.2, F[1] + 1.35, 4.3], [F[0] + 0.2, F[1] + 1.05, 0], 34, 0.002);
key(95.0, [F[0] - 1.25, F[1] + 1.45, 3.05], [F[0] + 0.3, F[1] + 1.12, 0], 34, 0.003);
key(103.2, [F[0] - 0.95, F[1] + 1.5, 2.55], [F[0] + 0.18, F[1] + 1.25, 0], 33, 0.003, true);
key(108.0, [F[0] + 0.4, F[1] + 1.3, 4.6], [F[0] + 1.3, F[1] + 1.1, 0], 34, 0.002);
// Movement IV: face the mosaic, close in as it compresses, reveal the curtain, return
const M = MOSAIC;
key(112.5, [M[0], M[1] + 0.05, 5.6], [M[0], M[1], M[2]], 34, 0.0);
key(118.8, [M[0], M[1] + 0.02, 4.9], [M[0], M[1], M[2]], 34, 0.0);
key(121.4, [M[0], M[1], 3.1], [M[0], M[1], 0], 32, 0.0);
key(123.4, [M[0], M[1] + 0.02, 2.8], [M[0], M[1], 0], 32, 0.002, true);
key(126.6, [M[0] - 1.0, M[1] + 1.2, 13.5], [M[0], M[1] - 0.2, -6], 40, 0.0);
key(129.2, [BEAD_END[0], BEAD_END[1], 5.0], BEAD_END, 30, 0.0, true);
key(136, [BEAD_END[0], BEAD_END[1], 4.95], BEAD_END, 30, 0.0, true);

K.sort((a, b) => a.t - b.t);

function tangent(i, f) {
  if (K[i].stop) return Array.isArray(K[i][f]) ? K[i][f].map(() => 0) : 0;
  const a = K[Math.max(0, i - 1)], b = K[Math.min(K.length - 1, i + 1)];
  const dt = b.t - a.t || 1;
  const v = (x, y) => (y - x) / dt;
  return Array.isArray(K[i][f]) ? K[i][f].map((_, c) => v(a[f][c], b[f][c])) : v(a[f], b[f]);
}

function hermite(p0, m0, p1, m1, h, u) {
  const u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * p0 + (u3 - 2 * u2 + u) * h * m0 + (-2 * u3 + 3 * u2) * p1 + (u3 - u2) * h * m1;
}

export function cameraAt(t) {
  let i = 0;
  while (i < K.length - 2 && t > K[i + 1].t) i++;
  const a = K[i], b = K[i + 1];
  const h = b.t - a.t;
  const u = Math.min(1, Math.max(0, (t - a.t) / h));
  const f = (field) => {
    const ma = tangent(i, field), mb = tangent(i + 1, field);
    if (Array.isArray(a[field])) return a[field].map((_, c) => hermite(a[field][c], ma[c], b[field][c], mb[c], h, u));
    return hermite(a[field], ma, b[field], mb, h, u);
  };
  const pos = f('pos'), target = f('target');
  // a breath of handheld float, very small, deterministic
  const fl = 0.004 + 0.006 * Math.min(1, t / 12);
  pos[0] += fl * Math.sin(t * 0.51 + 1.3);
  pos[1] += fl * Math.sin(t * 0.37 + 0.2);
  return { pos, target, fov: f('fov'), aperture: Math.max(0, f('ap')), t };
}

export const CAMERA_KEYS = K;
