// SDF sculptures sampled into painterly dabs (technique T4).
//
// Forms (the embryo, the old figure) are signed distance functions built from
// smooth-unioned primitives. At load time, seeded random points are pulled
// onto the surface by Newton steps along the gradient. Each accepted point
// becomes a dab: position, normal, a tangent along a surface flow, and a size
// that shrinks where detail matters (the face). Nothing is raymarched at
// runtime; the form exists only as paint.

export const sd = {
  sphere: (p, c, r) => Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]) - r,
  ellipsoid: (p, c, rad) => {
    const x = (p[0] - c[0]) / rad[0], y = (p[1] - c[1]) / rad[1], z = (p[2] - c[2]) / rad[2];
    const k0 = Math.hypot(x, y, z);
    const k1 = Math.hypot(x / rad[0], y / rad[1], z / rad[2]);
    return k1 > 1e-9 ? (k0 * (k0 - 1)) / k1 : -Math.min(rad[0], rad[1], rad[2]);
  },
  capsule: (p, a, b, r) => {
    const pa = [p[0] - a[0], p[1] - a[1], p[2] - a[2]], ba = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const h = Math.max(0, Math.min(1, (pa[0] * ba[0] + pa[1] * ba[1] + pa[2] * ba[2]) / (ba[0] * ba[0] + ba[1] * ba[1] + ba[2] * ba[2])));
    return Math.hypot(pa[0] - ba[0] * h, pa[1] - ba[1] * h, pa[2] - ba[2] * h) - r;
  },
  // capsule with radius varying from ra to rb
  cone: (p, a, b, ra, rb) => {
    const pa = [p[0] - a[0], p[1] - a[1], p[2] - a[2]], ba = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const h = Math.max(0, Math.min(1, (pa[0] * ba[0] + pa[1] * ba[1] + pa[2] * ba[2]) / (ba[0] * ba[0] + ba[1] * ba[1] + ba[2] * ba[2])));
    return Math.hypot(pa[0] - ba[0] * h, pa[1] - ba[1] * h, pa[2] - ba[2] * h) - (ra + (rb - ra) * h);
  },
  smin: (a, b, k) => {
    const h = Math.max(k - Math.abs(a - b), 0) / k;
    return Math.min(a, b) - h * h * k * 0.25;
  },
  smax: (a, b, k) => -sd.smin(-a, -b, k),
};

export function gradient(f, p, e = 1e-3) {
  const g = [
    f([p[0] + e, p[1], p[2]]) - f([p[0] - e, p[1], p[2]]),
    f([p[0], p[1] + e, p[2]]) - f([p[0], p[1] - e, p[2]]),
    f([p[0], p[1], p[2] + e]) - f([p[0], p[1], p[2] - e]),
  ];
  const l = Math.hypot(g[0], g[1], g[2]) || 1;
  return [g[0] / l, g[1] / l, g[2] / l];
}

// Sample count surface points of f inside the box [min, max].
// accept(p) optionally rejects points (for density control).
export function sampleSurface(f, min, max, count, r, accept = null, maxTries = count * 60) {
  const out = [];
  let tries = 0;
  while (out.length < count && tries < maxTries) {
    tries++;
    let p = [min[0] + (max[0] - min[0]) * r.next(), min[1] + (max[1] - min[1]) * r.next(), min[2] + (max[2] - min[2]) * r.next()];
    let d = f(p);
    if (Math.abs(d) > 0.25) continue;
    for (let k = 0; k < 8 && Math.abs(d) > 2e-4; k++) {
      const g = gradient(f, p);
      p = [p[0] - g[0] * d, p[1] - g[1] * d, p[2] - g[2] * d];
      d = f(p);
    }
    if (Math.abs(d) > 2e-3) continue;
    if (accept && !accept(p, r)) continue;
    out.push({ p, n: gradient(f, p) });
  }
  return out;
}
